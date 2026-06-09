import { pool } from './index';

export interface Conversation {
  id: number;
  phone: string;
  state: string;
  context: Record<string, any>;
}

export async function getOrCreateConversation(phone: string): Promise<Conversation> {
  const existing = await pool.query(
    'SELECT * FROM conversations WHERE phone = $1', [phone]
  );
  if (existing.rows.length > 0) return existing.rows[0];

  const created = await pool.query(
    'INSERT INTO conversations (phone, state, context) VALUES ($1, $2, $3) RETURNING *',
    [phone, 'inicio', {}]
  );
  return created.rows[0];
}

export async function updateConversation(
  phone: string, state: string, context: Record<string, any>
): Promise<void> {
  await pool.query(
    `UPDATE conversations SET state = $1, context = $2, updated_at = NOW() WHERE phone = $3`,
    [state, JSON.stringify(context), phone]
  );
}

export async function saveAppointmentRequest(data: {
  phone: string;
  name: string;
  service: string;
  preferredDay: string;
  preferredTime: string;
  preferredDatetime1?: Date;
  businessId: number; 
}): Promise<number> {
  const result = await pool.query(
    `INSERT INTO appointment_requests 
      (phone, name, service, preferred_day, preferred_time,
      preferred_datetime_1, business_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendiente') RETURNING id`,
    [data.phone, data.name, data.service,
     data.preferredDay, data.preferredTime,
     data.preferredDatetime1 || null,
     data.businessId]
  );
  return result.rows[0].id;
}

export async function getAppointmentById(id: number) {
  const result = await pool.query(
    'SELECT * FROM appointment_requests WHERE id = $1', [id]
  );
  return result.rows[0] || null;
}

export async function confirmAppointment(
  id: number, day: string, time: string, confirmedDatetime?: Date
): Promise<void> {
  await pool.query(
    `UPDATE appointment_requests 
     SET status = 'confirmado', confirmed_day = $1, confirmed_time = $2,
         confirmed_datetime = $3
     WHERE id = $4`,
    [day, time, confirmedDatetime || null, id]
  );
}

export async function rejectAppointment(id: number): Promise<void> {
  await pool.query(
    `UPDATE appointment_requests SET status = 'negociando' WHERE id = $1`, [id]
  );
}

export async function saveOwnerPendingAction(appointmentId: number): Promise<void> {
  // Limpia acciones anteriores del mismo turno
  await pool.query(
    'DELETE FROM owner_pending_actions WHERE appointment_id = $1', [appointmentId]
  );
  await pool.query(
    'INSERT INTO owner_pending_actions (appointment_id) VALUES ($1)', [appointmentId]
  );
}

export async function getOwnerPendingAction() {
  const result = await pool.query(
    `SELECT opa.*, ar.phone as client_phone, ar.name, ar.service,
            ar.preferred_day, ar.preferred_time,
            ar.preferred_day_2, ar.preferred_time_2,
            ar.preferred_datetime_1, ar.preferred_datetime_2
     FROM owner_pending_actions opa
     JOIN appointment_requests ar ON opa.appointment_id = ar.id
     ORDER BY opa.created_at DESC LIMIT 1`
  );
  return result.rows[0] || null;
}

export async function clearOwnerPendingAction(appointmentId: number): Promise<void> {
  await pool.query(
    'DELETE FROM owner_pending_actions WHERE appointment_id = $1', [appointmentId]
  );
}

// Busca el último turno confirmado de un cliente
export async function getLastConfirmedAppointment(phone: string) {
  const result = await pool.query(
    `SELECT * FROM appointment_requests 
     WHERE phone = $1 AND status = 'confirmado'
     ORDER BY created_at DESC LIMIT 1`,
    [phone]
  );
  return result.rows[0] || null;
}

// Cancela un turno por ID
export async function cancelAppointment(id: number): Promise<void> {
  await pool.query(
    `UPDATE appointment_requests SET status = 'cancelado' WHERE id = $1`,
    [id]
  );
}

export interface Business {
  id: number;
  name: string;
  bot_number: string;
  owner_phone: string;
  flow_type: string;
  active: boolean;
}

// Busca el negocio por el número de Twilio que recibió el mensaje
export async function getBusinessByBotNumber(botNumber: string): Promise<Business | null> {
  const result = await pool.query(
    'SELECT * FROM businesses WHERE bot_number = $1 AND active = true',
    [botNumber]
  );
  return result.rows[0] || null;
}

// Obtiene o crea conversación vinculada a un negocio
export async function getOrCreateConversationForBusiness(
  phone: string,
  businessId: number
): Promise<Conversation> {
  const existing = await pool.query(
    'SELECT * FROM conversations WHERE phone = $1 AND business_id = $2',
    [phone, businessId]
  );
  if (existing.rows.length > 0) return existing.rows[0];

  const created = await pool.query(
    'INSERT INTO conversations (phone, state, context, business_id) VALUES ($1, $2, $3, $4) RETURNING *',
    [phone, 'inicio', {}, businessId]
  );
  return created.rows[0];
}

// Busca turnos confirmados que sean en las próximas 23 a 25 horas
// Se corre cada hora — la ventana de 2hs evita duplicados si el cron se corre dos veces seguidas
export async function getUpcomingAppointments() {
  const result = await pool.query(
    `SELECT 
       ar.id,
       ar.phone,
       ar.name,
       ar.service,
       ar.confirmed_day,
       ar.confirmed_time,
       ar.confirmed_datetime,
       ar.reminder_sent,
       b.bot_number,
       b.name as business_name
     FROM appointment_requests ar
     JOIN businesses b ON ar.business_id = b.id
     WHERE ar.status = 'confirmado'
       AND ar.reminder_sent = false
       AND ar.confirmed_datetime IS NOT NULL
       AND ar.confirmed_datetime BETWEEN 
           NOW() + INTERVAL '23 hours' 
           AND NOW() + INTERVAL '25 hours'`
  );
  return result.rows;
}

export async function markReminderSent(id: number): Promise<void> {
  await pool.query(
    `UPDATE appointment_requests SET reminder_sent = true WHERE id = $1`,
    [id]
  );
}