import { BRAND } from '../config/brand'

// Contact, upload and session settings shared across the classroom.

export const WHATSAPP_NUMBER = String(import.meta.env.VITE_WHATSAPP_NUMBER || BRAND.whatsapp).replace(/\D/g, '')
export function whatsappUrl(message = 'Hola, necesito ayuda con Aula Consulting.') {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

// Sessions close after 30 minutes without interaction; a warning appears for
// the last two minutes.
export const IDLE_LIMIT_MS = 30 * 60 * 1000
export const IDLE_WARNING_MS = 2 * 60 * 1000

export const MAX_MATERIAL_BYTES = 50 * 1024 * 1024
export const MAX_CERTIFICATE_BYTES = 20 * 1024 * 1024
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024
// Recordings have no limit of their own; the API enforces MAX_UPLOAD_MB.
export const MAX_RECORDING_BYTES = Number.POSITIVE_INFINITY

export const materialMimeTypes = new Set(['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'image/png', 'image/jpeg', 'text/plain'])
export const recordingMimeTypes = new Set(['video/mp4', 'video/webm', 'video/quicktime'])
export const certificateMimeTypes = new Set(['application/pdf'])
export const avatarMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
export const strongPasswordPattern = '(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{12,72}'

// Skips look-alike characters (0/O, 1/l/I) so the password can be read aloud or typed from a screen.
export function generatePassword(length = 16) {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '!@#$%*?-']
  const pick = (chars: string) => chars[crypto.getRandomValues(new Uint32Array(1))[0] % chars.length]
  const all = sets.join('')
  const chars = [...sets.map(pick), ...Array.from({ length: length - sets.length }, () => pick(all))]
  for (let i = chars.length - 1; i > 0; i--) { const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1); [chars[i], chars[j]] = [chars[j], chars[i]] }
  return chars.join('')
}

export function validateUpload(file: File, allowedTypes: Set<string>, maxBytes: number, label: string) {
  if (!allowedTypes.has(file.type)) return `El archivo debe ser de un tipo permitido para ${label}.`
  if (file.size <= 0) return `El archivo para ${label} está vacío.`
  if (file.size > maxBytes) return `El archivo para ${label} debe pesar como máximo ${Math.floor(maxBytes / 1024 / 1024)} MB.`
  return ''
}

export function asHttpsUrl(value: string) {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' ? url.href : null
  } catch { return null }
}

export function safeFileName(name: string) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]/g, '-').slice(-100)
}

export function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

// Correos de avisos: desactivados por ahora. Cambiar a true cuando Resend esté configurado.
export const EMAIL_NOTICES_ENABLED = false
