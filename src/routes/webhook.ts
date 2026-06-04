import { Router, Request, Response } from 'express';
import { handleIncomingMessage } from '../services/flow.service';

const router = Router();

// Tipos de mensaje que Twilio puede enviarnos
const TIPOS_NO_SOPORTADOS = ['audio', 'image', 'video', 'document', 'sticker', 'location'];

router.post('/', async (req: Request, res: Response) => {
  try {
    const from: string = req.body.From; // número del cliente/dueño
    const to: string = req.body.To;  // número Twilio del negocio ← NUEVO
    const body: string = req.body.Body || '';
    const mediaType: string = req.body.MediaContentType0 || '';
    const numMedia: number = parseInt(req.body.NumMedia || '0');

    if (!from) {
      res.status(400).send('Faltan datos');
      return;
    }

    // Responde 200 a Twilio inmediatamente
    res.status(200).send('OK');

    console.log(`📨 Mensaje de ${from}: "${body}" | Media: ${numMedia}`);

    // Si mandó un archivo multimedia sin texto
    if (numMedia > 0 && !body) {
      const { sendMessage } = await import('../services/whatsapp.service');
      await sendMessage(from,
        '¡Hola! Por el momento solo puedo leer mensajes de texto 😊\n\n' +
        'Escribí *menú* para ver las opciones disponibles.', to
      );
      return;
    }

    // Si no hay texto (caso raro)
    if (!body.trim()) return;

    await handleIncomingMessage(from, body, to);

  } catch (error) {
    console.error('Error en webhook:', error);
  }
});

export default router;