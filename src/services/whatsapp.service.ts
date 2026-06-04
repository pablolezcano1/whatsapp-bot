import twilio from 'twilio';
import { config } from '../config';
import { Business } from '../db/queries';

const client = twilio(config.twilio.accountSid, config.twilio.authToken);

export async function sendMessage(to: string, body: string, from: string): Promise<void> {
  try {
    await client.messages.create({ from, to, body });
  } catch (error) {
    console.error(`Error enviando mensaje a ${to}:`, error);
    throw error;
  }
}

export async function notifyOwner(business: Business, message: string): Promise<void> {
  await sendMessage(business.owner_phone, `🔔 ${message}`, business.bot_number);
}