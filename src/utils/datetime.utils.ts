const MESES: Record<string, number> = {
  'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
  'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
  'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
};

// Parsea "Lunes 8 de Junio" → Date | null
// Solo importa el número y el mes, el día de semana se ignora
export function parseNaturalDate(input: string): Date | null {
  const normalized = input.trim().toLowerCase();

  // Busca un número (día) y un nombre de mes en el string
  const regexDia = /\b(\d{1,2})\b/;
  const regexMes = new RegExp(`\\b(${Object.keys(MESES).join('|')})\\b`);

  const diaMatch = normalized.match(regexDia);
  const mesMatch = normalized.match(regexMes);

  if (!diaMatch || !mesMatch) return null;

  const dia = parseInt(diaMatch[1]);
  const mes = MESES[mesMatch[1]];
  const year = 2026;

  const date = new Date(year, mes - 1, dia);

  // Verifica que la fecha sea real (ej: 31 de febrero no existe)
  if (date.getMonth() !== mes - 1 || date.getDate() !== dia) return null;

  // Verifica que no sea en el pasado
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) return null;

  return date;
}

// Valida formato HH:MM (24hs) — sigue igual
export function isValidTime(input: string): boolean {
  const regex = /^\d{2}:\d{2}$/;
  if (!regex.test(input)) return false;
  const [hours, minutes] = input.split(':').map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

// Mantener para uso interno del flujo del dueño (contraoferta)
export function isValidDate(input: string): boolean {
  const regex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!regex.test(input)) return false;
  const [day, month, year] = input.split('/').map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date >= today
  );
}

// Convierte "17/06/2026" + "14:30" a Date (uso interno)
export function parseDateTime(date: string, time: string): Date {
  const [day, month, year] = date.split('/').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const iso = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}T${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:00-03:00`;
  return new Date(iso);
}

// Convierte Date a string legible
export function formatDateTimeReadable(dt: Date): string {
  const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  const diaSemana = dias[dt.getDay()];
  const dia = String(dt.getDate()).padStart(2, '0');
  const mes = String(dt.getMonth() + 1).padStart(2, '0');
  const year = dt.getFullYear();
  const horas = String(dt.getHours()).padStart(2, '0');
  const minutos = String(dt.getMinutes()).padStart(2, '0');
  return `${diaSemana} ${dia}/${mes}/${year} a las ${horas}:${minutos}`;
}

// Convierte Date a "DD/MM/YYYY" para guardar en confirmed_day
export function formatDateShort(dt: Date): string {
  const dia = String(dt.getDate()).padStart(2, '0');
  const mes = String(dt.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${dt.getFullYear()}`;
}