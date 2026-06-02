-- Base de datos: whatsapp_bot

CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(30) NOT NULL UNIQUE,
  state VARCHAR(50) NOT NULL DEFAULT 'inicio',
  context JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointment_requests (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(30) NOT NULL,
  name VARCHAR(100),
  service VARCHAR(100),
  preferred_day VARCHAR(50),
  preferred_time VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pendiente', -- pendiente | confirmado | cancelado
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índice para búsqueda rápida por teléfono
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(phone);
CREATE INDEX IF NOT EXISTS idx_appointments_phone ON appointment_requests(phone);