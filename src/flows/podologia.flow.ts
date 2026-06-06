import { sendMessage, notifyOwner } from '../services/whatsapp.service';
import { isValidDate, isValidTime, parseDateTime, formatDateTimeReadable, parseNaturalDate } from '../utils/datetime.utils';
import {
  updateConversation, saveAppointmentRequest,
  getOwnerPendingAction, confirmAppointment,
  rejectAppointment, saveOwnerPendingAction,
  clearOwnerPendingAction, getAppointmentById,
  getLastConfirmedAppointment, cancelAppointment,
  Conversation, Business
} from '../db/queries';

interface FlowContext {
  name?: string;
  service?: string;
  preferredDay?: string;
  preferredTime?: string;
  preferredDatetime1?: string;
  appointmentId?: number;
  counterOfferDay?: string;
  counterOfferTime?: string;
  counterOfferDatetime?: string;
}

const SERVICIOS = `🦶 *Nuestros servicios:*

1️⃣ Podología general
2️⃣ Onicomicosis (hongos)
3️⃣ Uña encarnada
4️⃣ Callicidas y durezas
5️⃣ Estética de pies

_Los precios se informan al confirmar el turno._`;

const HORARIOS = `🕐 *Horarios de atención:*

📅 Lunes a Viernes: 9:00 a 18:00
📅 Sábados: 9:00 a 13:00
📵 Domingos y feriados: cerrado

📍 *Dirección:* [Tu dirección aquí]`;

const MENU_PRINCIPAL = `👋 ¡Hola! Bienvenido/a a *[Nombre del negocio]* 🦶

¿En qué te puedo ayudar?

1️⃣ Ver servicios y precios
2️⃣ Horarios y ubicación
3️⃣ Solicitar un turno
4️⃣ Hablar con la profesional

Respondé con el número de tu opción.`;

export async function processMessage(
  conversation: Conversation,
  incomingMessage: string,
  phone: string,
  business: Business,
  isOwnerFlag: boolean
): Promise<void> {
  const msg = incomingMessage.trim().toLowerCase();
  const context = conversation.context as FlowContext;
  const { state } = conversation;

  // ── FLUJO DEL DUEÑO ───────────────────────────────────────────
  if (isOwnerFlag) {
    console.log(`👑 Mensaje del dueño recibido: "${incomingMessage}"`);
    await handleOwnerMessage(msg, incomingMessage, phone, business);
    return;
  }

  // ── FLUJO DEL CLIENTE ─────────────────────────────────────────
  switch (state) {

    case 'inicio':
      await sendMessage(phone, MENU_PRINCIPAL, business.bot_number);
      await updateConversation(phone, 'menu_principal', {});
      break;

    case 'menu_principal':
      if (msg === '1') {
        await sendMessage(phone, SERVICIOS, business.bot_number);
        await sendMessage(phone, 'Escribí *menú* para volver al inicio o *3* para pedir turno.', business.bot_number);
      } else if (msg === '2') {
        await sendMessage(phone, HORARIOS, business.bot_number);
      } else if (msg === '3') {
        await sendMessage(phone, '📝 ¡Perfecto! Vamos con tu turno.\n\n¿Cuál es tu *nombre completo*?', business.bot_number);
        await updateConversation(phone, 'turno_nombre', {});
      } else if (msg === '4') {
        await sendMessage(phone, '👩‍⚕️ En breve la profesional se comunica con vos.', business.bot_number);
        await notifyOwner(business, `📲 ${phone} quiere hablar directamente con vos.`);
      } else {
        await sendMessage(phone, 'Por favor elegí una opción del 1 al 4.', business.bot_number);
      }
      break;

    case 'turno_nombre': {
      const newCtx: FlowContext = { name: incomingMessage.trim() };
      await updateConversation(phone, 'turno_servicio', newCtx);
      await sendMessage(phone,
        `¡Gracias, ${incomingMessage.trim()}! 😊\n\n${SERVICIOS}\n\n¿Qué servicio necesitás? Respondé con el número.`,
        business.bot_number
      );
      break;
    }

    case 'turno_servicio': {
      const servicios: Record<string, string> = {
        '1': 'Podología general', '2': 'Onicomicosis (hongos)',
        '3': 'Uña encarnada', '4': 'Callicidas y durezas', '5': 'Estética de pies',
      };
      const servicio = servicios[msg];
      if (!servicio) {
        await sendMessage(phone, 'Por favor elegí una opción del 1 al 5.', business.bot_number);
        return;
      }
      await updateConversation(phone, 'turno_dia1', { ...context, service: servicio });
      await sendMessage(phone,
        `Perfecto, anotamos *${servicio}*. 📋\n\n` +
        `📅 ¿Qué día preferís?\n\n` +
        `Escribilo así: *Lunes 8 de Junio*`,
        business.bot_number
      );
      break;
    }

    case 'turno_dia1': {
      const parsedDate = parseNaturalDate(incomingMessage.trim());
      if (!parsedDate) {
        await sendMessage(phone,
          `⚠️ No entendí la fecha.\n\n` +
          `Escribila así: *Lunes 8 de Junio*\n` +
          `O por ejemplo: *Jueves 4 de Junio*`,
          business.bot_number
        );
        return;
      }
      await updateConversation(phone, 'turno_hora1', {
        ...context,
        preferredDay: incomingMessage.trim(),
        preferredDatetime1: parsedDate.toISOString(),
      });
      await sendMessage(phone,
        `📅 Perfecto, anotamos *${incomingMessage.trim()}*.\n\n` +
        `⏰ ¿A qué hora? Usá el formato *HH:MM*\nEjemplo: *09:00*, *14:30*`,
        business.bot_number
      );
      break;
    }

    case 'turno_hora1': {
      if (!isValidTime(incomingMessage.trim())) {
        await sendMessage(phone,
          `⚠️ Formato incorrecto.\n\nUsá *HH:MM*\nEjemplo: *09:00*, *14:30*`,
          business.bot_number
        );
        return;
      }

      const dt1 = new Date(context.preferredDatetime1!);
      dt1.setHours(
        parseInt(incomingMessage.trim().split(':')[0]),
        parseInt(incomingMessage.trim().split(':')[1])
      );

      const finalCtx: FlowContext = {
        ...context,
        preferredTime: incomingMessage.trim(),
        preferredDatetime1: dt1.toISOString(),
      };

      const appointmentId = await saveAppointmentRequest({
        phone,
        name: finalCtx.name || 'Sin nombre',
        service: finalCtx.service || 'Sin especificar',
        preferredDay: finalCtx.preferredDay || '',
        preferredTime: finalCtx.preferredTime || '',
        preferredDatetime1: dt1,
      });

      await saveOwnerPendingAction(appointmentId);

      await notifyOwner(business,
        `*Nueva solicitud de turno #${appointmentId}*\n\n` +
        `👤 Cliente: ${finalCtx.name}\n` +
        `💆 Servicio: ${finalCtx.service}\n` +
        `📅 ${formatDateTimeReadable(dt1)}\n\n` +
        `Respondé:\n*1* → Confirmar turno\n*3 DD/MM/YYYY HH:MM* → Ofrecer otro horario`
      );

      await sendMessage(phone,
        `✅ ¡Solicitud registrada!\n\n` +
        `📋 *Resumen:*\n` +
        `• Servicio: ${finalCtx.service}\n` +
        `• Fecha: ${formatDateTimeReadable(dt1)}\n\n` +
        `⏳ En breve te confirmamos el turno. ¡Gracias!`,
        business.bot_number
      );

      await updateConversation(phone, 'esperando_confirmacion', { appointmentId });
      break;
    }

    case 'esperando_confirmacion':
      await sendMessage(phone,
        '⏳ Tu solicitud ya está en proceso. En breve te confirmamos. ¡Gracias por tu paciencia!',
        business.bot_number
      );
      break;

    case 'cancelar_turno': {
      const turno = await getLastConfirmedAppointment(phone);

      if (!turno) {
        await sendMessage(phone,
          'No encontramos ningún turno confirmado para cancelar.\n\nEscribí *menú* para volver al inicio.',
          business.bot_number
        );
        await updateConversation(phone, 'menu_principal', {});
        return;
      }

      if (msg === 'cancelar') {
        await sendMessage(phone,
          `⚠️ ¿Confirmás la cancelación de tu turno?\n\n` +
          `📅 ${turno.confirmed_day} a las ${turno.confirmed_time}\n` +
          `💆 Servicio: ${turno.service}\n\n` +
          `Respondé *sí* para cancelar o *no* para mantenerlo.`,
          business.bot_number
        );
        await updateConversation(phone, 'cancelar_turno', { appointmentId: turno.id });
        return;
      }

      if (msg === 'sí' || msg === 'si') {
        await cancelAppointment(context.appointmentId!);
        await notifyOwner(business,
          `❌ Turno cancelado:\n👤 ${turno.name}\n📅 ${turno.confirmed_day} ${turno.confirmed_time}\n💆 ${turno.service}`
        );
        await sendMessage(phone,
          `✅ Tu turno fue cancelado.\n\nSi querés sacar uno nuevo escribí *menú*. ¡Hasta pronto! 👋`,
          business.bot_number
        );
        await updateConversation(phone, 'menu_principal', {});
      } else if (msg === 'no') {
        await sendMessage(phone, '👍 Perfecto, tu turno sigue confirmado. ¡Te esperamos!', business.bot_number);
        await updateConversation(phone, 'menu_principal', {});
      } else {
        await sendMessage(phone, 'Respondé *sí* para cancelar el turno o *no* para mantenerlo.', business.bot_number);
      }
      break;
    }

    case 'cliente_respondiendo_contraoferta': {
      const appt = await getAppointmentById(context.appointmentId!);
      if (!appt) return;

      if (msg === 'sí' || msg === 'si') {
        const confirmedDt = context.counterOfferDatetime
          ? new Date(context.counterOfferDatetime)
          : undefined;
        await confirmAppointment(context.appointmentId!, context.counterOfferDay!, context.counterOfferTime!, confirmedDt);
        await clearOwnerPendingAction(context.appointmentId!);
        await sendMessage(phone,
          `✅ *¡Turno confirmado!*\n\n` +
          `📅 ${context.counterOfferDay} a las ${context.counterOfferTime}\n` +
          `💆 Servicio: ${appt.service}\n\n¡Te esperamos! 🦶`,
          business.bot_number
        );
        await notifyOwner(business,
          `✅ ${appt.name} aceptó el turno:\n📅 ${context.counterOfferDay} ${context.counterOfferTime}`
        );
        await updateConversation(phone, 'menu_principal', {});
      } else if (msg === 'no') {
        await sendMessage(phone, `Entendemos. Escribí *menú* para solicitar un nuevo turno.`, business.bot_number);
        await updateConversation(phone, 'menu_principal', {});
      } else {
        await sendMessage(phone, 'Respondé *sí* para aceptar o *no* para rechazar el horario propuesto.', business.bot_number);
      }
      break;
    }

    case 'derivado_humano':
      break;

    default:
      await sendMessage(phone, MENU_PRINCIPAL, business.bot_number);
      await updateConversation(phone, 'menu_principal', {});
  }
}

// ── MANEJO DE MENSAJES DEL DUEÑO ──────────────────────────────────
async function handleOwnerMessage(
  msg: string,
  rawMsg: string,
  phone: string,
  business: Business
): Promise<void> {

  const pending = await getOwnerPendingAction();

  if (!pending) {
    await sendMessage(phone, '📭 No hay solicitudes de turno pendientes en este momento.', business.bot_number);
    return;
  }

  const apptId: number = pending.appointment_id;
  const clientPhone: string = pending.client_phone;

  if (msg === '1') {
    const dt1 = pending.preferred_datetime_1
      ? new Date(pending.preferred_datetime_1)
      : undefined;
    await confirmAppointment(apptId, pending.preferred_day, pending.preferred_time, dt1);
    await clearOwnerPendingAction(apptId);
    await sendMessage(clientPhone,
      `✅ *¡Tu turno fue confirmado!*\n\n` +
      `👤 ${pending.name}\n` +
      `💆 Servicio: ${pending.service}\n` +
      `📅 ${pending.preferred_day} a las ${pending.preferred_time}\n\n` +
      `¡Te esperamos! 🦶`,
      business.bot_number
    );
    await sendMessage(phone, `✅ Confirmado. Le avisé a ${pending.name}.`, business.bot_number);

  } else if (msg.startsWith('3')) {
    const parts = rawMsg.trim().split(' ');
    if (parts.length < 3 || !isValidDate(parts[1]) || !isValidTime(parts[2])) {
      await sendMessage(phone,
        `Para ofrecer otro horario escribí:\n*3 DD/MM/YYYY HH:MM*\n\nEjemplo: _3 17/06/2026 14:00_`,
        business.bot_number
      );
      return;
    }

    const offerDate = parts[1];
    const offerTime = parts[2];
    const offerDatetime = parseDateTime(offerDate, offerTime);

    await rejectAppointment(apptId);
    await updateConversation(clientPhone, 'cliente_respondiendo_contraoferta', {
      appointmentId: apptId,
      counterOfferDay: offerDate,
      counterOfferTime: offerTime,
      counterOfferDatetime: offerDatetime.toISOString(),
    });

    await sendMessage(clientPhone,
      `Hola ${pending.name} 👋\n\n` +
      `Lamentablemente no tenemos disponibilidad en el horario que pediste.\n\n` +
      `Te ofrecemos:\n📅 *${formatDateTimeReadable(offerDatetime)}*\n\n` +
      `¿Lo aceptás? Respondé *sí* o *no*.`,
      business.bot_number
    );
    await sendMessage(phone,
      `✅ Le envié la contraoferta a ${pending.name}. Esperando su respuesta.`,
      business.bot_number
    );

  } else {
    // Mensaje no reconocido — recordarle al dueño qué puede hacer
    await sendMessage(phone,
      `📋 Solicitud pendiente de *${pending.name}*:\n\n` +
      `💆 ${pending.service}\n` +
      `📅 ${pending.preferred_day} a las ${pending.preferred_time}\n\n` +
      `Respondé:\n*1* → Confirmar turno\n*3 DD/MM/YYYY HH:MM* → Ofrecer otro horario`,
      business.bot_number
    );
  }
}