// Base de datos simulada: tablas en memoria persistidas en localStorage.
// Reproduce lo que en producción hacen Postgres (permisos, triggers, cascadas) para que
// la app se comporte igual con o sin servidor.
import { clearFiles, deleteFile, fileKey } from './files'
import { buildSeed, seedFiles } from './seed'
import type { Row, Tables } from './seed'

export type { Row }
export type DbEvent = 'INSERT' | 'UPDATE' | 'DELETE'
export type Listener = (event: DbEvent, table: string, row: Row, old: Row | null) => void

const DB_KEY = 'aula-demo-db-v1'
const SESSION_KEY = 'aula-demo-session'

export const newId = () => (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`)
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value))

function readStored(): Tables | null {
  try { const raw = localStorage.getItem(DB_KEY); return raw ? (JSON.parse(raw) as Tables) : null } catch { return null }
}
function create(): Tables { const tables = buildSeed(); seedFiles(tables); return tables }

let state: Tables = readStored() || create()
const listeners = new Set<Listener>()

function persist() { try { localStorage.setItem(DB_KEY, JSON.stringify(state)) } catch { /* cuota llena: la sesión sigue en memoria */ } }
persist()

export const table = (name: string): Row[] => (state[name] ||= [])
export function onChange(listener: Listener) { listeners.add(listener); return () => { listeners.delete(listener) } }
function emit(event: DbEvent, name: string, row: Row, old: Row | null = null) { for (const listener of [...listeners]) listener(event, name, clone(row), old ? clone(old) : null) }

// Otra pestaña (otro usuario) escribió: se refresca el estado y se avisa de lo nuevo en mensajes y avisos.
window.addEventListener('storage', event => {
  if (event.key !== DB_KEY || !event.newValue) return
  const before = state
  try { state = JSON.parse(event.newValue) as Tables } catch { return }
  for (const name of ['thread_messages', 'notifications']) {
    const known = new Map((before[name] || []).map(row => [row.id, row]))
    for (const row of state[name] || []) {
      const old = known.get(row.id)
      if (!old) emit('INSERT', name, row)
      else if (JSON.stringify(old) !== JSON.stringify(row)) emit('UPDATE', name, row, old)
    }
  }
})

export async function resetDemo() {
  await clearFiles()
  state = create()
  persist()
  sessionStorage.removeItem(SESSION_KEY)
  window.location.reload()
}

// ── Sesión ───────────────────────────────────────────────────────────
export const sessionUserId = (): string | null => sessionStorage.getItem(SESSION_KEY)
export const setSessionUser = (id: string | null) => { if (id) sessionStorage.setItem(SESSION_KEY, id); else sessionStorage.removeItem(SESSION_KEY) }
export const profileOf = (id: string | null | undefined) => table('profiles').find(row => row.id === id) || null
export const currentProfile = () => profileOf(sessionUserId())

// ── Reglas de acceso (equivalente a RLS) ─────────────────────────────
const isAdmin = (id: string | null) => profileOf(id)?.role === 'admin'
export const managedCourseIds = (id: string | null) => new Set([
  ...table('course_instructors').filter(row => row.instructor_id === id).map(row => row.course_id),
  ...table('courses').filter(row => row.created_by === id).map(row => row.id),
])
const threadsOf = (id: string | null) => new Set(table('course_threads').filter(row => row.student_id === id || row.teacher_id === id).map(row => row.id))

/** Filas que el usuario actual puede ver en cada tabla. */
export function visibleRows(name: string, userId: string | null): Row[] {
  const rows = table(name)
  if (!userId) return []
  if (isAdmin(userId)) return name === 'thread_messages' || name === 'course_threads' ? [] : rows
  const role = profileOf(userId)?.role
  switch (name) {
    case 'notifications': return rows.filter(row => row.user_id === userId)
    case 'course_certificates': return role === 'student' ? rows.filter(row => row.student_id === userId) : rows.filter(row => managedCourseIds(userId).has(row.course_id))
    case 'enrollments': return role === 'student' ? rows.filter(row => row.student_id === userId) : rows.filter(row => managedCourseIds(userId).has(row.course_id))
    case 'courses': { if (role !== 'teacher') return rows; const ids = managedCourseIds(userId); return rows.filter(row => ids.has(row.id)) }
    case 'support_requests': case 'auth_users': case 'rate_limits': return []
    case 'course_threads': return rows.filter(row => row.student_id === userId || row.teacher_id === userId)
    case 'thread_messages': { const ids = threadsOf(userId); return rows.filter(row => ids.has(row.conversation_id)) }
    default: return rows
  }
}

/** Mismas reglas para los eventos en vivo. */
export function canSee(name: string, row: Row, userId: string | null) {
  if (!userId) return false
  if (name === 'notifications') return isAdmin(userId) || row.user_id === userId
  if (name === 'thread_messages') return threadsOf(userId).has(row.conversation_id)
  return true
}

// ── Valores por defecto y restricciones ──────────────────────────────
const nowIso = () => new Date().toISOString()
function withDefaults(name: string, row: Row): Row {
  const base: Row = { id: newId() }
  if (name !== 'course_instructors') base.created_at = nowIso()
  const extra: Record<string, Row> = {
    courses: { status: 'draft', modality: 'hybrid', updated_at: nowIso() },
    meetings: { status: 'scheduled', timezone: 'America/Lima', room_name: `room-${newId()}` },
    course_recordings: { is_published: true },
    course_certificates: { issued_at: nowIso() },
    enrollments: { status: 'active', enrolled_at: nowIso() },
    notifications: { read_at: null },
    thread_messages: { read_at: null },
    support_requests: { status: 'open', email_sent: false },
    modules: { published: false, position: 0 },
    materials: { is_published: false },
  }
  return { ...base, ...(extra[name] || {}), ...row }
}

export type DbError = { code: string; message: string }
const fail = (code: string, message: string): DbError => ({ code, message })

function checkInsert(name: string, row: Row): DbError | null {
  if (name === 'courses' && table('courses').some(item => item.code === row.code)) return fail('23505', 'duplicate key value violates unique constraint "courses_code_key"')
  if (name === 'meetings' && new Date(row.ends_at) <= new Date(row.starts_at)) return fail('23514', 'meetings_check')
  if (name === 'thread_messages' && !row.body?.trim()) return fail('23514', 'thread_messages_body_check')
  return null
}
function checkUpdate(name: string, row: Row, patch: Row): DbError | null {
  if (name === 'courses' && patch.code && table('courses').some(item => item.code === patch.code && item.id !== row.id)) return fail('23505', 'duplicate key value violates unique constraint "courses_code_key"')
  return null
}

// ── Triggers: avisos automáticos ─────────────────────────────────────
function notify(userId: string, kind: string, title: string, body: string | null, resourceType: string, resourceId: string) {
  const row = withDefaults('notifications', { user_id: userId, kind, title, body, resource_type: resourceType, resource_id: resourceId })
  table('notifications').push(row); emit('INSERT', 'notifications', row)
}
const courseName = (id: string) => table('courses').find(row => row.id === id)?.name || 'Capacitación'
const activeStudents = (courseId: string) => table('enrollments').filter(row => row.course_id === courseId && row.status === 'active').map(row => row.student_id as string)

function afterInsert(name: string, row: Row) {
  if (name === 'materials' && row.is_published) for (const id of activeStudents(row.course_id)) notify(id, 'material', `Nuevo material: ${row.title}`, courseName(row.course_id), 'material', row.id)
  if (name === 'meetings') for (const id of activeStudents(row.course_id)) notify(id, 'meeting', `Nueva reunión: ${row.title}`, courseName(row.course_id), 'meeting', row.id)
  if (name === 'course_recordings') for (const id of activeStudents(row.course_id)) notify(id, 'recording', `Nueva grabación: ${row.title}`, courseName(row.course_id), 'recording', row.id)
  if (name === 'enrollments' && row.status === 'active') notify(row.student_id, 'course', `Te matricularon en ${courseName(row.course_id)}`, null, 'course', row.course_id)
  if (name === 'course_certificates') notify(row.student_id, 'certificate', `Nuevo certificado: ${row.title}`, courseName(row.course_id), 'course', row.course_id)
  if (name === 'thread_messages') {
    const thread = table('course_threads').find(item => item.id === row.conversation_id)
    if (!thread) return
    const to = row.sender_id === thread.student_id ? thread.teacher_id : thread.student_id
    notify(to, 'message', `Nuevo mensaje de ${profileOf(row.sender_id)?.full_name || 'un participante'}`, String(row.body).slice(0, 120), 'conversation', thread.id)
  }
}

// ── Cascadas al borrar ───────────────────────────────────────────────
const cascades: Record<string, [string, string][]> = {
  courses: [['modules', 'course_id'], ['materials', 'course_id'], ['meetings', 'course_id'], ['course_recordings', 'course_id'], ['course_certificates', 'course_id'], ['enrollments', 'course_id'], ['course_instructors', 'course_id'], ['course_threads', 'course_id']],
  modules: [['lessons', 'module_id']],
  course_threads: [['thread_messages', 'conversation_id']],
  profiles: [['enrollments', 'student_id'], ['course_instructors', 'instructor_id'], ['course_certificates', 'student_id'], ['notifications', 'user_id'], ['course_threads', 'student_id'], ['course_threads', 'teacher_id']],
}
const resourceTables: Record<string, string> = { materials: 'material', meetings: 'meeting', course_recordings: 'recording' }

function removeRow(name: string, row: Row) {
  const rows = table(name)
  const index = rows.findIndex(item => item.id === row.id && (name !== 'course_instructors' || (item.course_id === row.course_id && item.instructor_id === row.instructor_id)))
  if (index < 0) return
  rows.splice(index, 1)
  if (name === 'materials') void deleteFile(fileKey('course-materials', row.storage_path))
  if (name === 'course_recordings') void deleteFile(fileKey('course-recordings', row.storage_path))
  if (name === 'course_certificates') void deleteFile(fileKey('course-certificates', row.storage_path))
  const kind = resourceTables[name]
  if (kind) for (const notice of table('notifications').filter(item => item.resource_type === kind && item.resource_id === row.id)) removeRow('notifications', notice)
  if (name === 'modules') for (const material of table('materials').filter(item => item.module_id === row.id)) material.module_id = null // on delete set null
  emit('DELETE', name, row)
  for (const [child, column] of cascades[name] || []) for (const item of table(child).filter(entry => entry[column] === row.id)) removeRow(child, item)
}

// ── Operaciones que usa el cliente ───────────────────────────────────
export function dbInsert(name: string, payload: Row): { row?: Row; error?: DbError } {
  const row = withDefaults(name, payload)
  const error = checkInsert(name, row)
  if (error) return { error }
  table(name).push(row); afterInsert(name, row); emit('INSERT', name, row); persist()
  return { row: clone(row) }
}
export function dbUpdate(name: string, row: Row, patch: Row): { row?: Row; error?: DbError } {
  const error = checkUpdate(name, row, patch)
  if (error) return { error }
  const old = clone(row)
  Object.assign(row, patch)
  if (name === 'courses') row.updated_at = nowIso()
  emit('UPDATE', name, row, old); persist()
  return { row: clone(row) }
}
export function dbDelete(name: string, row: Row) { removeRow(name, row); persist() }

/** Reasigna lo creado por el usuario y lo elimina (equivale a admin_reassign_user_content + deleteUser). */
export function deleteAccount(userId: string, newOwner: string) {
  for (const name of ['courses', 'materials', 'course_recordings', 'course_certificates']) for (const row of table(name)) {
    for (const column of ['created_by', 'uploaded_by', 'issued_by']) if (row[column] === userId) row[column] = newOwner
  }
  for (const row of table('meetings')) if (row.organizer_id === userId) row.organizer_id = newOwner
  const profile = profileOf(userId)
  if (profile?.avatar_url) void deleteFile(fileKey('avatars', profile.avatar_url))
  for (const thread of table('course_threads').filter(item => item.student_id === userId || item.teacher_id === userId)) removeRow('course_threads', thread)
  if (profile) removeRow('profiles', profile)
  const authIndex = table('auth_users').findIndex(row => row.id === userId)
  if (authIndex >= 0) table('auth_users').splice(authIndex, 1)
  persist()
}
export const save = persist
