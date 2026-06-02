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
  preferredDay2: string;
  preferredTime2: string;
}): Promise<number> {
  const result = await pool.query(
    `INSERT INTO appointment_requests 
     (phone, name, service, preferred_day, preferred_time, preferred_day_2, preferred_time_2, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendiente') RETURNING id`,
    [data.phone, data.name, data.service,
     data.preferredDay, data.preferredTime,
     data.preferredDay2, data.preferredTime2]
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
  id: number, day: string, time: string
): Promise<void> {
  await pool.query(
    `UPDATE appointment_requests 
     SET status = 'confirmado', confirmed_day = $1, confirmed_time = $2 
     WHERE id = $3`,
    [day, time, id]
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
            ar.preferred_day_2, ar.preferred_time_2
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