import { asHttpsUrl } from './config'
import type { Meeting } from './types'

// Meetings are entered and shown in Lima time (UTC-5, no daylight saving).
export function limaInputToIso(value: string) { return new Date(`${value}:00-05:00`).toISOString() }
export function isoToLimaInput(iso: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso)).map(part => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}
export const limaTime = (iso: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-PE', { ...options, timeZone: 'America/Lima' }).format(new Date(iso))

// Only HTTPS destinations are rendered as links, whatever is stored in the row.
// Upcoming and live classes first (soonest on top), finished ones below (latest first).
export function orderedMeetings(list: Meeting[]) {
  const now = Date.now(), ends = (m: Meeting) => new Date(m.ends_at).getTime(), starts = (m: Meeting) => new Date(m.starts_at).getTime()
  return [...list.filter(m => ends(m) > now).sort((a, b) => starts(a) - starts(b)), ...list.filter(m => ends(m) <= now).sort((a, b) => starts(b) - starts(a))]
}
// Turns database errors into messages a person can act on.
export function friendlyDbError(error: { code?: string; message: string }) {
  if (error.code === '23505') return 'ya existe un registro igual. Revisa los datos e inténtalo de nuevo.'
  if (error.code === '23514') return 'algún dato no es válido (revisa fechas y enlaces).'
  if (error.code === '42501') return 'no tienes permiso para esta acción.'
  return error.message
}
export function meetingHref(meeting: Meeting) {
  return asHttpsUrl(meeting.meeting_url || (meeting.room_name.startsWith('https://') ? meeting.room_name : `https://meet.google.com/${encodeURIComponent(meeting.room_name)}`))
}
