import twilio from 'twilio';
import { config } from '../config';
import { Business } from '../db/queries';

const client = twilio(config.twilio.accountSid, config.twilio.authToken);

// Envía un mensaje de WhatsApp al número indicado
export async function sendMessage(to: string, body: string): Promise<void> {
  try {
    await client.messages.create({
      from: config.twilio.whatsappNumber,
      to,
      body,
    });
  } catch (error) {
    console.error(`Error enviando mensaje a ${to}:`, error);
    throw error;
  }
}

// Notifica al dueño del negocio específico
export async function notifyOwner(business: Business, message: string): Promise<void> {
  await sendMessage(business.owner_phone, `🔔 ${message}`);
}