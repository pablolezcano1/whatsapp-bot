// Valida formato DD/MM/YYYY
export function isValidDate(input: string): boolean {
  const regex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!regex.test(input)) return false;

  const [day, month, year] = input.split('/').map(Number);
  const date = new Date(year, month - 1, day);

  // Verifica que la fecha sea real y no sea pasada
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date >= today
  );
}

// Valida formato HH:MM (24hs)
export function isValidTime(input: string): boolean {
  const regex = /^\d{2}:\d{2}$/;
  if (!regex.test(input)) return false;

  const [hours, minutes] = input.split(':').map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

// Convierte "17/06/2025" + "14:30" a objeto Date
export function parseDateTime(date: string, time: string): Date {
  const [day, month, year] = date.split('/').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

// Formatea Date a string legible: "martes 17/06/2025 a las 14:30"
export function formatDateTimeReadable(dt: Date): string {
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const diaSemana = dias[dt.getDay()];
  const dia = String(dt.getDate()).padStart(2, '0');
  const mes = String(dt.getMonth() + 1).padStart(2, '0');
  const year = dt.getFullYear();
  const horas = String(dt.getHours()).padStart(2, '0');
  const minutos = String(dt.getMinutes()).padStart(2, '0');
  return `${diaSemana} ${dia}/${mes}/${year} a las ${horas}:${minutos}`;
}