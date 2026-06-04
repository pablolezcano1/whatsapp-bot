import { 
  getOrCreateConversationForBusiness,
  updateConversation,
  getBusinessByBotNumber,
  Business
} from '../db/queries';
import { processMessage } from '../flows/podologia.flow';
import { sendMessage } from './whatsapp.service';

export async function handleIncomingMessage(
  phone: string,
  message: string,
  botNumber: string  // número Twilio que recibió el mensaje
): Promise<void> {

  // 1. Identificar el negocio por el número del bot
  const business = await getBusinessByBotNumber(botNumber);

  if (!business) {
    console.error(`❌ No se encontró negocio para el número: ${botNumber}`);
    return;
  }

  console.log(`🏢 Negocio identificado: ${business.name}`);

  // 2. ¿El que escribe es el dueño de ESTE negocio?
  const isOwner = phone.trim().toLowerCase() === business.owner_phone.trim().toLowerCase();

  if (isOwner) {
    console.log(`👑 Dueño del negocio "${business.name}" detectado`);
  } else {
    console.log(`👤 Cliente detectado para "${business.name}"`);
  }

  // 3. Obtener o crear conversación vinculada a este negocio
  const conversation = await getOrCreateConversationForBusiness(phone, business.id);
  const msg = message.trim().toLowerCase();

  // 4. Palabras clave globales (solo para clientes)
  if (!isOwner) {
    if (msg === 'menú' || msg === 'menu') {
      await updateConversation(phone, 'inicio', {});
      const fresh = { ...conversation, state: 'inicio', context: {} };
      await processMessage(fresh, message, phone, business, false);
      return;
    }

    if (msg === 'cancelar') {
      await updateConversation(phone, 'cancelar_turno', conversation.context);
      const withCancel = { ...conversation, state: 'cancelar_turno' };
      await processMessage(withCancel, message, phone, business, false);
      return;
    }
  }

  // 5. Procesar el mensaje con el contexto del negocio
  await processMessage(conversation, message, phone, business, isOwner);
}