import { getOrCreateConversation, updateConversation } from '../db/queries';
import { processMessage } from '../flows/podologia.flow';

export async function handleIncomingMessage(phone: string, message: string): Promise<void> {
  const conversation = await getOrCreateConversation(phone);

  // Palabra clave global para reiniciar (solo clientes, no el dueño)
  const msg = message.trim().toLowerCase();
  if ((msg === 'menú' || msg === 'menu')) {
    await updateConversation(phone, 'inicio', {});
    const fresh = { ...conversation, state: 'inicio', context: {} };
    await processMessage(fresh, message, phone);
    return;
  }

  await processMessage(conversation, message, phone);
}