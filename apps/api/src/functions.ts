// Operaciones que no son un simple CRUD: administración de cuentas, solicitudes de ayuda y mensajería.
import { rmSync } from 'node:fs'
import { hashPassword, passwordProblem } from './auth.js'
import type { User } from './auth.js'
import { pool, query } from './db.js'
import { filePath } from './storage.js'

type Body = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
type Out = { status: number; body: Body }
const ok = (body: Body, status = 200): Out => ({ status, body })
const problem = (message: string, status = 400): Out => ({ status, body: { error: message } })

const emailPattern = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const roles = ['admin', 'teacher', 'student']

async function adminUsers(user: User, body: Body): Promise<Out> {
  if (user.role !== 'admin') return problem('Solo un administrador puede gestionar usuarios.', 403)
  const action = body.action
  if (action === 'list') {
    const { rows } = await query(`select u.id, u.email, p.full_name, p.role, p.can_create_courses, p.phone, p.company, p.job_title, u.last_sign_in_at, u.created_at
      from users u join profiles p on p.id = u.id order by p.role, p.full_name`)
    return ok({ users: rows })
  }
  const email = String(body.email || '').trim().toLowerCase()
  const fullName = String(body.full_name || '').trim()
  const role = String(body.role || '')
  const password = String(body.password || '')
  const nameOk = fullName.length >= 2 && fullName.length <= 120

  if (action === 'create') {
    if (!emailPattern.test(email) || email.length > 254 || !nameOk || !roles.includes(role)) return problem('Completa nombre, correo válido y rol válido.')
    const weak = passwordProblem(password); if (weak) return problem(weak)
    const client = await pool.connect()
    try {
      await client.query('begin')
      const created = await client.query('insert into users (email, password_hash) values ($1, $2) returning id', [email, await hashPassword(password)])
      const id = created.rows[0].id
      await client.query('insert into profiles (id, full_name, role, can_create_courses) values ($1, $2, $3, $4)', [id, fullName, role, role === 'teacher'])
      await client.query('commit')
      return ok({ user: { id, email, full_name: fullName, role } }, 201)
    } catch (error) {
      await client.query('rollback')
      if ((error as { code?: string }).code === '23505') return problem('Ese correo ya pertenece a otra cuenta.')
      throw error
    } finally { client.release() }
  }

  const userId = String(body.user_id || '')
  if (!uuidPattern.test(userId)) return problem('Selecciona un usuario válido.')
  if (action === 'role' || action === 'update') {
    const nextRole = String(body.role || '')
    if (!roles.includes(nextRole)) return problem('Selecciona un usuario y un rol válido.')
    if (userId === user.id && nextRole !== 'admin') return problem('No puedes quitarte tu propio acceso de administrador.')
    if (action === 'role') {
      await query('update profiles set role = $2, can_create_courses = $3 where id = $1', [userId, nextRole, nextRole === 'teacher'])
      return ok({ success: true })
    }
    if (!emailPattern.test(email) || email.length > 254 || !nameOk) return problem('Revisa el nombre, el correo y el rol.')
    if (password) { const weak = passwordProblem(password); if (weak) return problem(weak) }
    const client = await pool.connect()
    try {
      await client.query('begin')
      await client.query('update users set email = $2 where id = $1', [userId, email])
      if (password) await client.query('update users set password_hash = $2 where id = $1', [userId, await hashPassword(password)])
      await client.query('update profiles set full_name = $2, role = $3, can_create_courses = $4 where id = $1', [userId, fullName, nextRole, nextRole === 'teacher'])
      await client.query('commit')
      return ok({ user: { id: userId, email, full_name: fullName, role: nextRole } })
    } catch (error) {
      await client.query('rollback')
      if ((error as { code?: string }).code === '23505') return problem('Ese correo ya pertenece a otra cuenta.')
      throw error
    } finally { client.release() }
  }
  if (action === 'delete') {
    if (userId === user.id) return problem('No puedes eliminar tu propia cuenta.')
    const client = await pool.connect()
    let avatar: string | null = null
    try {
      await client.query('begin')
      // Lo que creó esa persona pasa a quien la elimina.
      for (const [table, column] of [['courses', 'created_by'], ['materials', 'uploaded_by'], ['meetings', 'organizer_id'], ['course_recordings', 'uploaded_by'], ['course_certificates', 'issued_by']])
        await client.query(`update ${table} set ${column} = $2 where ${column} = $1`, [userId, user.id])
      avatar = (await client.query('select avatar_url from profiles where id = $1', [userId])).rows[0]?.avatar_url ?? null
      await client.query('delete from users where id = $1', [userId])
      await client.query('commit')
    } catch (error) { await client.query('rollback'); throw error } finally { client.release() }
    if (avatar) { try { rmSync(filePath('avatars', avatar), { force: true }) } catch { /* ya no existe */ } }
    return ok({ success: true })
  }
  return problem('Acción no reconocida.')
}

const topics = new Set(['acceso', 'cursos', 'reuniones', 'certificados', 'otro'])
async function supportRequest(user: User | null, body: Body, ip: string, limited: boolean): Promise<Out> {
  if (body.website) return ok({ ok: true }) // campo trampa para bots
  const fullName = String(body.full_name || '').trim()
  const email = String(body.email || '').trim()
  const message = String(body.message || '').trim()
  if (fullName.length < 2 || !emailPattern.test(email) || email.length > 254 || message.length < 10) return problem('Revisa tu nombre, tu correo y el mensaje (mínimo 10 caracteres).')
  if (limited) return problem('Ya recibimos varias solicitudes. Espera unos minutos antes de enviar otra.', 429)
  await query('insert into support_requests (user_id, full_name, email, phone, topic, message) values ($1, $2, $3, $4, $5, $6)',
    [user?.id ?? null, fullName.slice(0, 120), email, String(body.phone || '').trim().slice(0, 40) || null, topics.has(body.topic) ? body.topic : 'otro', message.slice(0, 2000)])
  void ip
  return ok({ ok: true }, 201)
}

export async function runFunction(name: string, user: User | null, body: Body, ip: string, limited: boolean): Promise<Out> {
  if (name === 'support-request') return supportRequest(user, body, ip, limited)
  if (!user) return problem('Inicia sesión para continuar.', 401)
  if (name === 'admin-users') return adminUsers(user, body)
  if (name === 'send-academic-notifications') return ok({ ok: true, skipped: 'Los correos están desactivados.' })
  return problem('Función no disponible.', 404)
}

// ── Mensajería ───────────────────────────────────────────────────────
async function contacts(user: User) {
  if (user.role === 'student') {
    return (await query(`select c.id as course_id, c.name as course_name, p.id as user_id, coalesce(p.full_name, 'Facilitador') as full_name, 'teacher' as role
      from enrollments e join courses c on c.id = e.course_id join course_instructors ci on ci.course_id = c.id join profiles p on p.id = ci.instructor_id
      where e.student_id = $1 and e.status = 'active' and c.status = 'published' order by c.name, p.full_name`, [user.id])).rows
  }
  return (await query(`select c.id as course_id, c.name as course_name, p.id as user_id, coalesce(p.full_name, 'Participante') as full_name, 'student' as role
    from courses c join enrollments e on e.course_id = c.id and e.status = 'active' join profiles p on p.id = e.student_id
    where c.id in (select course_id from course_instructors where instructor_id = $1 union select id from courses where created_by = $1)
    order by c.name, p.full_name`, [user.id])).rows
}

export async function runRpc(name: string, user: User, args: Body): Promise<{ data: unknown; error: { code: string; message: string } | null }> {
  const denied = { data: null, error: { code: '42501', message: 'No tienes permiso para esta acción.' } }
  if (user.role === 'admin') return denied
  if (name === 'message_contacts') return { data: await contacts(user), error: null }
  if (name === 'my_conversations') {
    const { rows } = await query(`select t.id, t.course_id, c.name as course_name, o.id as other_id, coalesce(o.full_name, 'Usuario') as other_name,
        case when o.role = 'teacher' then 'teacher' else 'student' end as other_role,
        coalesce(l.created_at, t.created_at) as last_message_at, l.body as last_body, l.sender_id as last_sender,
        (select count(*)::int from thread_messages m where m.conversation_id = t.id and m.sender_id <> $1 and m.read_at is null) as unread
      from course_threads t
      join courses c on c.id = t.course_id
      join profiles o on o.id = case when t.student_id = $1 then t.teacher_id else t.student_id end
      left join lateral (select body, sender_id, created_at from thread_messages where conversation_id = t.id order by created_at desc limit 1) l on true
      where t.student_id = $1 or t.teacher_id = $1
      order by coalesce(l.created_at, t.created_at) desc`, [user.id])
    return { data: rows, error: null }
  }
  if (name === 'start_conversation') {
    const course = String(args.p_course || ''), other = String(args.p_other || '')
    if (!(await contacts(user)).some(contact => contact.course_id === course && contact.user_id === other)) return denied
    const student = user.role === 'student' ? user.id : other, teacher = user.role === 'student' ? other : user.id
    const { rows } = await query(`insert into course_threads (course_id, student_id, teacher_id) values ($1, $2, $3)
      on conflict (course_id, student_id, teacher_id) do update set course_id = excluded.course_id returning id`, [course, student, teacher])
    return { data: rows[0].id, error: null }
  }
  return { data: null, error: { code: '42883', message: `La función ${name} no existe.` } }
}
