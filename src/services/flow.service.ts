import { getOrCreateConversation, updateConversation } from '../db/queries';
import { processMessage } from '../flows/podologia.flow';

export async function handleIncomingMessage(phone: string, message: string): Promise<void> {
  const conversation = await getOrCreateConversation(phone);
  const msg = message.trim().toLowerCase();

  // Palabras clave globales — funcionan desde cualquier estado
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