import app from './app';
import { config } from './config';
import { pool } from './db';

async function main() {
  // Verificar conexión a la base de datos
  try {
    await pool.query('SELECT 1');
    console.log('✅ Conectado a PostgreSQL');
  } catch (error) {
    console.error('❌ No se pudo conectar a PostgreSQL:', error);
    process.exit(1);
  }

  app.listen(config.port, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${config.port}`);
    console.log(`📡 Webhook disponible en http://localhost:${config.port}/webhook`);
  });
}

main();