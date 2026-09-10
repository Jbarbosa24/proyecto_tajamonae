/**
 * Utilidades para el manejo de fechas en la zona horaria de Colombia (UTC-5)
 * Evita problemas de desfase horario entre el servidor (UTC) y la operación real.
 */

export const TIMEZONE = 'America/Bogota'

/**
 * Retorna la fecha actual en formato YYYY-MM-DD (Bogotá)
 */
export function getBogotaDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { 
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

/**
 * Retorna la hora actual en formato HH:MM:SS (Bogotá)
 */
export function getBogotaTime(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', { 
    timeZone: TIMEZONE, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit', 
    hour12: false 
  }).format(date)
}

/**
 * Retorna un objeto Date ajustado o un ISO string que represente el momento en Bogotá
 */
export function getBogotaISO(date: Date = new Date()): string {
    // Para columnas timestamptz de Supabase, lo ideal es enviar el ISO real con el offset
    // o simplemente dejar que la base de datos lo maneje si enviamos 'now()'.
    // Pero si queremos ser explícitos desde el cliente/server-action:
    return date.toLocaleString('sv-SE', { timeZone: TIMEZONE }).replace(' ', 'T')
}

/**
 * Obtiene el primer y último día del mes actual en Bogotá
 */
export function getBogotaMonthRange() {
  const now = new Date()
  const year = Number(new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, year: 'numeric' }).format(now))
  const month = Number(new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, month: 'numeric' }).format(now)) - 1
  
  const firstDay = getBogotaDate(new Date(year, month, 1))
  const lastDay = getBogotaDate(new Date(year, month + 1, 0))
  
  return { firstDay, lastDay }
}
