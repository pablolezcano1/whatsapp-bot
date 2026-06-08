import cron from 'node-cron';
import { getUpcomingAppointments, markReminderSent } from '../db/queries';
import { sendMessage } from './whatsapp.service';

function buildReminderMessage(appointment: {
  name: string;
  service: string;
  confirmed_day: string;
  confirmed_time: string;
  business_name: string;
}): string {
  return (
    `👋 Hola *${appointment.name}*!\n\n` +
    `Te recordamos que mañana tenés turno en *${appointment.business_name}*:\n\n` +
    `💆 Servicio: ${appointment.service}\n` +
    `📅 ${appointment.confirmed_day} a las ${appointment.confirmed_time}\n\n` +
    `Si no podés asistir, escribí *cancelar* para cancelar tu turno.\n` +
    `¡Te esperamos! 🦶`
  );
}

async function sendReminders(): Promise<void> {
  console.log('⏰ Cron de recordatorios ejecutándose...');

  try {
    const appointments = await getUpcomingAppointments();

    if (appointments.length === 0) {
      console.log('📭 No hay turnos para recordar en las próximas 24hs.');
      return;
    }

    console.log(`📬 Enviando ${appointments.length} recordatorio(s)...`);

    for (const appt of appointments) {
      try {
        const message = buildReminderMessage(appt);
        await sendMessage(appt.phone, message, appt.bot_number);
        await markReminderSent(appt.id);
        console.log(`✅ Recordatorio enviado a ${appt.name} (${appt.phone})`);
      } catch (error) {
        console.error(`❌ Error enviando recordatorio a ${appt.phone}:`, error);
        // Continúa con el siguiente aunque uno falle
      }
    }

  } catch (error) {
    console.error('❌ Error en el cron de recordatorios:', error);
  }
}

// Corre cada hora en punto
// Formato cron: minuto hora día mes díaSemana
export function startReminderCron(): void {
  cron.schedule('0 * * * *', sendReminders, {
    timezone: 'America/Argentina/Buenos_Aires'
  });
  console.log('⏰ Cron de recordatorios iniciado (cada hora)');
}