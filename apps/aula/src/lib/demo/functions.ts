// Emulación de las Edge Functions y de las funciones RPC de Postgres del aula.
import { currentProfile, dbDelete, dbInsert, dbUpdate, deleteAccount, managedCourseIds, newId, profileOf, save, sessionUserId, table } from './db'
import type { Row } from './db'
import { deleteFile, fileKey, getFile, putFile } from './files'

type Body = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
export type FnResult = { data: Body | null; error: null }
const ok = (data: Body): FnResult => ({ data, error: null })
const problem = (message: string): FnResult => ({ data: { error: message }, error: null })

const emailPattern = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i
const roles = ['admin', 'teacher', 'student']
function passwordProblem(password: string) {
  if (password.length < 12 || password.length > 72) return 'La contraseña debe tener entre 12 y 72 caracteres.'
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) return 'La contraseña debe incluir mayúsculas, minúsculas y números.'
  return ''
}

// ── admin-users ──────────────────────────────────────────────────────
function adminUsers(body: Body): FnResult {
  const me = currentProfile()
  if (me?.role !== 'admin') return problem('Solo un administrador puede gestionar usuarios.')
  const action = body.action
  if (action === 'list') {
    return ok({ users: table('auth_users').map(user => {
      const profile = profileOf(user.id) || {}
      return { id: user.id, email: user.email, full_name: profile.full_name || '', role: profile.role || 'student', can_create_courses: Boolean(profile.can_create_courses), phone: profile.phone ?? null, company: profile.company ?? null, job_title: profile.job_title ?? null, last_sign_in_at: user.last_sign_in_at, created_at: user.created_at }
    }) })
  }
  const email = String(body.email || '').trim().toLowerCase()
  const fullName = String(body.full_name || '').trim()
  const role = String(body.role || '')
  const password = String(body.password || '')
  if (action === 'create') {
    if (!emailPattern.test(email) || fullName.length < 2 || fullName.length > 120 || !roles.includes(role)) return problem('Completa nombre, correo válido y rol válido.')
    const weak = passwordProblem(password); if (weak) return problem(weak)
    if (table('auth_users').some(user => user.email === email)) return problem('Ese correo ya pertenece a otra cuenta.')
    const id = newId(), createdAt = new Date().toISOString()
    table('auth_users').push({ id, email, password, created_at: createdAt, last_sign_in_at: null })
    table('profiles').push({ id, full_name: fullName, role, can_create_courses: role === 'teacher', avatar_url: null, phone: null, company: null, job_title: null, bio: null, timezone: 'America/Lima', created_at: createdAt, updated_at: createdAt })
    save()
    return ok({ user: { id, email, full_name: fullName, role } })
  }
  const userId = String(body.user_id || '')
  const profile = profileOf(userId)
  if (!profile) return problem('Selecciona un usuario válido.')
  if (action === 'role' || action === 'update') {
    if (!roles.includes(action === 'role' ? String(body.role) : role)) return problem('Selecciona un usuario y un rol válido.')
    const nextRole = action === 'role' ? String(body.role) : role
    if (userId === me.id && nextRole !== 'admin') return problem('No puedes quitarte tu propio acceso de administrador.')
    if (action === 'role') { dbUpdate('profiles', profile, { role: nextRole, can_create_courses: nextRole === 'teacher' }); return ok({ success: true }) }
    if (!emailPattern.test(email) || fullName.length < 2 || fullName.length > 120) return problem('Revisa el nombre, el correo y el rol.')
    if (password) { const weak = passwordProblem(password); if (weak) return problem(weak) }
    const account = table('auth_users').find(user => user.id === userId)
    if (table('auth_users').some(user => user.email === email && user.id !== userId)) return problem('Ese correo ya pertenece a otra cuenta.')
    if (account) { account.email = email; if (password) account.password = password }
    dbUpdate('profiles', profile, { full_name: fullName, role: nextRole, can_create_courses: nextRole === 'teacher' })
    return ok({ user: { id: userId, email, full_name: fullName, role: nextRole } })
  }
  if (action === 'delete') {
    if (userId === me.id) return problem('No puedes eliminar tu propia cuenta.')
    deleteAccount(userId, me.id)
    return ok({ success: true })
  }
  return problem('Acción no reconocida.')
}

// ── support-request (pública, con trampa anti-bots) ──────────────────
function supportRequest(body: Body): FnResult {
  if (body.website) return ok({ ok: true })
  const fullName = String(body.full_name || '').trim(), email = String(body.email || '').trim(), message = String(body.message || '').trim()
  if (fullName.length < 2 || !emailPattern.test(email) || message.length < 10) return problem('Revisa tu nombre, tu correo y el mensaje (mínimo 10 caracteres).')
  const recent = table('support_requests').filter(row => row.email === email && Date.now() - new Date(row.created_at).getTime() < 15 * 60000)
  if (recent.length >= 3) return problem('Ya recibimos varias solicitudes tuyas. Espera unos minutos antes de enviar otra.')
  dbInsert('support_requests', { user_id: sessionUserId(), full_name: fullName.slice(0, 120), email: email.slice(0, 254), phone: String(body.phone || '').trim().slice(0, 40) || null, topic: String(body.topic || 'otro'), message: message.slice(0, 2000) })
  return ok({ ok: true })
}

// ── r2-recordings: las grabaciones viven en el almacén local ─────────
async function recordings(body: Body): Promise<FnResult> {
  const me = currentProfile()
  if (!me || me.role === 'student') return problem('No tienes permiso para gestionar grabaciones.')
  if (body.action === 'play') {
    const row = table('course_recordings').find(item => item.id === body.recording_id)
    const blob = row && await getFile(fileKey('course-recordings', row.storage_path))
    return blob ? ok({ url: URL.createObjectURL(blob) }) : problem('Archivo no disponible.')
  }
  if (body.action === 'delete') {
    const row = table('course_recordings').find(item => item.id === body.recording_id)
    if (row) dbDelete('course_recordings', row)
    return ok({ ok: true })
  }
  if (body.action === 'purge_course') return ok({ ok: true }) // el borrado en cascada del curso ya elimina los archivos
  return problem('Acción no reconocida.')
}
export const storeRecording = (path: string, file: File) => putFile(fileKey('course-recordings', path), file)

export async function invokeFunction(name: string, body: Body = {}): Promise<FnResult> {
  await Promise.resolve()
  if (name === 'admin-users') return adminUsers(body)
  if (name === 'support-request') return supportRequest(body)
  if (name === 'r2-recordings') return recordings(body)
  if (name === 'send-academic-notifications') return ok({ ok: true, skipped: 'Los correos están desactivados en el modo demo.' })
  return problem('Función no disponible en el modo demo.')
}

// ── RPC de mensajería ────────────────────────────────────────────────
type Contact = { course_id: string; course_name: string; user_id: string; full_name: string; role: 'student' | 'teacher' }
function contacts(me: Row): Contact[] {
  const name = (id: string) => table('courses').find(course => course.id === id)?.name || 'Curso'
  if (me.role === 'student') {
    const mine = table('enrollments').filter(row => row.student_id === me.id && row.status === 'active').map(row => row.course_id)
    return table('course_instructors').filter(row => mine.includes(row.course_id)).map(row => ({ course_id: row.course_id, course_name: name(row.course_id), user_id: row.instructor_id, full_name: profileOf(row.instructor_id)?.full_name || 'Facilitador', role: 'teacher' as const }))
  }
  const managed = managedCourseIds(me.id)
  return table('enrollments').filter(row => managed.has(row.course_id) && row.status === 'active').map(row => ({ course_id: row.course_id, course_name: name(row.course_id), user_id: row.student_id, full_name: profileOf(row.student_id)?.full_name || 'Participante', role: 'student' as const }))
}

export function rpc(name: string, args: Body = {}) {
  const me = currentProfile()
  if (!me || me.role === 'admin') return { data: null, error: { code: '42501', message: 'No tienes permiso para esta acción.' } }
  if (name === 'message_contacts') return { data: contacts(me), error: null }
  if (name === 'my_conversations') {
    const mine = table('course_threads').filter(row => row.student_id === me.id || row.teacher_id === me.id)
    const data = mine.map(thread => {
      const other = profileOf(thread.student_id === me.id ? thread.teacher_id : thread.student_id)
      const messages = table('thread_messages').filter(row => row.conversation_id === thread.id).sort((a, b) => a.created_at.localeCompare(b.created_at))
      const last = messages[messages.length - 1]
      return { id: thread.id, course_id: thread.course_id, course_name: table('courses').find(course => course.id === thread.course_id)?.name || 'Curso', other_id: other?.id, other_name: other?.full_name || 'Usuario', other_role: other?.role === 'teacher' ? 'teacher' : 'student', last_message_at: last?.created_at || thread.created_at, last_body: last?.body ?? null, last_sender: last?.sender_id ?? null, unread: messages.filter(row => row.sender_id !== me.id && !row.read_at).length }
    }).sort((a, b) => b.last_message_at.localeCompare(a.last_message_at))
    return { data, error: null }
  }
  if (name === 'start_conversation') {
    const allowed = contacts(me).some(contact => contact.course_id === args.p_course && contact.user_id === args.p_other)
    if (!allowed) return { data: null, error: { code: '42501', message: 'No puedes escribir a esa persona.' } }
    const studentId = me.role === 'student' ? me.id : args.p_other, teacherId = me.role === 'student' ? args.p_other : me.id
    const existing = table('course_threads').find(row => row.course_id === args.p_course && row.student_id === studentId && row.teacher_id === teacherId)
    return { data: existing?.id || dbInsert('course_threads', { course_id: args.p_course, student_id: studentId, teacher_id: teacherId }).row?.id, error: null }
  }
  return { data: null, error: { code: '42883', message: `Función ${name} no disponible en el modo demo.` } }
}
export { deleteFile }
