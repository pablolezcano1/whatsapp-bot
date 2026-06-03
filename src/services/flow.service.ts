import { getOrCreateConversation, updateConversation } from '../db/queries';
import { processMessage } from '../flows/podologia.flow';
import { config } from '../config';

function isOwner(phone: string): boolean {
  return phone.trim().toLowerCase() === config.ownerWhatsapp.trim().toLowerCase();
}

export async function handleIncomingMessage(phone: string, message: string): Promise<void> {
  const conversation = await getOrCreateConversation(phone);
  const msg = message.trim().toLowerCase();

  // Si es el dueño, va DIRECTO al processMessage sin tocar el estado
  if (isOwner(phone)) {
    console.log(`👑 Dueño detectado, procesando como dueño`);
    await processMessage(conversation, message, phone);
    return;
  }

  // Solo para clientes — palabras clave globales
  if (msg === 'menú' || msg === 'menu') {
    await updateConversation(phone, 'inicio', {});
    const fresh = { ...conversation, state: 'inicio', context: {} };
    await processMessage(fresh, message, phone);
    return;
  }

  if (msg === 'cancelar') {
    await updateConversation(phone, 'cancelar_turno', conversation.context);
    const withCancel = { ...conversation, state: 'cancelar_turno' };
    await processMessage(withCancel, message, phone);
    return;
  }

  await processMessage(conversation, message, phone);
}