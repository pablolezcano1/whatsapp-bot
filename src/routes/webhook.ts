import { Router, Request, Response } from 'express';
import { handleIncomingMessage } from '../services/flow.service';

const router = Router();

// Twilio envía los mensajes entrantes a este endpoint via POST
router.post('/', async (req: Request, res: Response) => {
  try {
    const from: string = req.body.From;       // ej: whatsapp:+5491123456789
    const body: string = req.body.Body || ''; // texto del mensaje

    if (!from || !body) {
      res.status(400).send('Faltan datos');
      return;
    }

    console.log(`📨 Mensaje de ${from}: "${body}"`);

    // Responde 200 inmediatamente a Twilio (requerido)
    res.status(200).send('OK');

    // Procesa el mensaje de forma asíncrona
    await handleIncomingMessage(from, body);

  } catch (error) {
    console.error('Error en webhook:', error);
    // Si ya enviamos 200, no podemos cambiar el status
  }
});

export default router;