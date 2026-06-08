import app from './app';
import { config } from './config';
import { pool } from './db';
import { startReminderCron } from './services/reminder.service';

async function main() {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Conectado a PostgreSQL');
  } catch (error) {
    console.error('❌ No se pudo conectar a PostgreSQL:', error);
    process.exit(1);
  }

  startReminderCron();

  app.listen(config.port, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${config.port}`);
    console.log(`📡 Webhook disponible en http://localhost:${config.port}/webhook`);
  });
}

main();