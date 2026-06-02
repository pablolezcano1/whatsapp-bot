import express from 'express';
import webhookRouter from './routes/webhook';

const app = express();

// Twilio envía datos como form-urlencoded
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Health check para Railway
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Ruta principal del webhook
app.use('/webhook', webhookRouter);

export default app;