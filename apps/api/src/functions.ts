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
const roles = ['administrador', 'facilitador', 'participante']

async function adminUsuarios(user: User, body: Body): Promise<Out> {
  if (user.rol !== 'administrador') return problem('Solo un administrador puede gestionar usuarios.', 403)
  const accion = body.accion
  if (accion === 'listar') {
    const { rows } = await query(`select u.id, u.correo, p.nombre_completo, p.rol, p.puede_crear_cursos, p.telefono, p.empresa, p.cargo, u.ultimo_acceso_en, u.creado_en
      from usuarios u join perfiles p on p.id = u.id order by p.rol, p.nombre_completo`)
    return ok({ usuarios: rows })
  }
  const correo = String(body.correo || '').trim().toLowerCase()
  const nombreCompleto = String(body.nombre_completo || '').trim()
  const rol = String(body.rol || '')
  const contrasena = String(body.contrasena || '')
  const nombreValido = nombreCompleto.length >= 2 && nombreCompleto.length <= 120

  if (accion === 'crear') {
    if (!emailPattern.test(correo) || correo.length > 254 || !nombreValido || !roles.includes(rol)) return problem('Completa nombre, correo válido y rol válido.')
    const weak = passwordProblem(contrasena); if (weak) return problem(weak)
    const client = await pool.connect()
    try {
      await client.query('begin')
      const creado = await client.query('insert into usuarios (correo, contrasena_hash) values ($1, $2) returning id', [correo, await hashPassword(contrasena)])
      const id = creado.rows[0].id
      await client.query('insert into perfiles (id, nombre_completo, rol, puede_crear_cursos) values ($1, $2, $3, $4)', [id, nombreCompleto, rol, rol === 'facilitador'])
      await client.query('commit')
      return ok({ usuario: { id, correo, nombre_completo: nombreCompleto, rol } }, 201)
    } catch (error) {
      await client.query('rollback')
      if ((error as { code?: string }).code === '23505') return problem('Ese correo ya pertenece a otra cuenta.')
      throw error
    } finally { client.release() }
  }

  const usuarioId = String(body.usuario_id || '')
  if (!uuidPattern.test(usuarioId)) return problem('Selecciona un usuario válido.')
  if (accion === 'rol' || accion === 'actualizar') {
    const nuevoRol = String(body.rol || '')
    if (!roles.includes(nuevoRol)) return problem('Selecciona un usuario y un rol válido.')
    if (usuarioId === user.id && nuevoRol !== 'administrador') return problem('No puedes quitarte tu propio acceso de administrador.')
    if (accion === 'rol') {
      await query('update perfiles set rol = $2, puede_crear_cursos = $3 where id = $1', [usuarioId, nuevoRol, nuevoRol === 'facilitador'])
      return ok({ success: true })
    }
    if (!emailPattern.test(correo) || correo.length > 254 || !nombreValido) return problem('Revisa el nombre, el correo y el rol.')
    if (contrasena) { const weak = passwordProblem(contrasena); if (weak) return problem(weak) }
    const client = await pool.connect()
    try {
      await client.query('begin')
      await client.query('update usuarios set correo = $2 where id = $1', [usuarioId, correo])
      if (contrasena) await client.query('update usuarios set contrasena_hash = $2 where id = $1', [usuarioId, await hashPassword(contrasena)])
      await client.query('update perfiles set nombre_completo = $2, rol = $3, puede_crear_cursos = $4 where id = $1', [usuarioId, nombreCompleto, nuevoRol, nuevoRol === 'facilitador'])
      await client.query('commit')
      return ok({ usuario: { id: usuarioId, correo, nombre_completo: nombreCompleto, rol: nuevoRol } })
    } catch (error) {
      await client.query('rollback')
      if ((error as { code?: string }).code === '23505') return problem('Ese correo ya pertenece a otra cuenta.')
      throw error
    } finally { client.release() }
  }
  if (accion === 'eliminar') {
    if (usuarioId === user.id) return problem('No puedes eliminar tu propia cuenta.')
    const client = await pool.connect()
    let foto: string | null = null
    try {
      await client.query('begin')
      // Lo que creó esa persona pasa a quien la elimina.
      for (const [tabla, columna] of [['cursos', 'creado_por'], ['materiales', 'subido_por'], ['reuniones', 'organizador_id'], ['curso_grabaciones', 'subido_por'], ['curso_certificados', 'emitido_por']])
        await client.query(`update ${tabla} set ${columna} = $2 where ${columna} = $1`, [usuarioId, user.id])
      foto = (await client.query('select foto_url from perfiles where id = $1', [usuarioId])).rows[0]?.foto_url ?? null
      await client.query('delete from usuarios where id = $1', [usuarioId])
      await client.query('commit')
    } catch (error) { await client.query('rollback'); throw error } finally { client.release() }
    if (foto) { try { rmSync(filePath('avatars', foto), { force: true }) } catch { /* ya no existe */ } }
    return ok({ success: true })
  }
  return problem('Acción no reconocida.')
}

const asuntos = new Set(['acceso', 'cursos', 'reuniones', 'certificados', 'otro'])
async function solicitudSoporte(user: User | null, body: Body, ip: string, limitado: boolean): Promise<Out> {
  if (body.website) return ok({ ok: true }) // campo trampa para bots
  const nombreCompleto = String(body.nombre_completo || '').trim()
  const correo = String(body.correo || '').trim()
  const mensaje = String(body.mensaje || '').trim()
  if (nombreCompleto.length < 2 || !emailPattern.test(correo) || correo.length > 254 || mensaje.length < 10) return problem('Revisa tu nombre, tu correo y el mensaje (mínimo 10 caracteres).')
  if (limitado) return problem('Ya recibimos varias solicitudes. Espera unos minutos antes de enviar otra.', 429)
  await query('insert into solicitudes_soporte (usuario_id, nombre_completo, correo, telefono, asunto, mensaje) values ($1, $2, $3, $4, $5, $6)',
    [user?.id ?? null, nombreCompleto.slice(0, 120), correo, String(body.telefono || '').trim().slice(0, 40) || null, asuntos.has(body.asunto) ? body.asunto : 'otro', mensaje.slice(0, 2000)])
  void ip
  return ok({ ok: true }, 201)
}

export async function runFunction(name: string, user: User | null, body: Body, ip: string, limitado: boolean): Promise<Out> {
  if (name === 'solicitud-soporte') return solicitudSoporte(user, body, ip, limitado)
  if (!user) return problem('Inicia sesión para continuar.', 401)
  if (name === 'admin-usuarios') return adminUsuarios(user, body)
  if (name === 'enviar-avisos-academicos') return ok({ ok: true, skipped: 'Los correos están desactivados.' })
  return problem('Función no disponible.', 404)
}

// ── Mensajería ───────────────────────────────────────────────────────
async function contactos(user: User) {
  if (user.rol === 'participante') {
    return (await query(`select c.id as curso_id, c.nombre as curso_nombre, p.id as usuario_id, coalesce(p.nombre_completo, 'Facilitador') as nombre_completo, 'facilitador' as rol
      from matriculas m join cursos c on c.id = m.curso_id join curso_facilitadores cf on cf.curso_id = c.id join perfiles p on p.id = cf.facilitador_id
      where m.participante_id = $1 and m.estado = 'activa' and c.estado = 'publicado' order by c.nombre, p.nombre_completo`, [user.id])).rows
  }
  return (await query(`select c.id as curso_id, c.nombre as curso_nombre, p.id as usuario_id, coalesce(p.nombre_completo, 'Participante') as nombre_completo, 'participante' as rol
    from cursos c join matriculas m on m.curso_id = c.id and m.estado = 'activa' join perfiles p on p.id = m.participante_id
    where c.id in (select curso_id from curso_facilitadores where facilitador_id = $1 union select id from cursos where creado_por = $1)
    order by c.nombre, p.nombre_completo`, [user.id])).rows
}

export async function runRpc(name: string, user: User, args: Body): Promise<{ data: unknown; error: { code: string; message: string } | null }> {
  const denegado = { data: null, error: { code: '42501', message: 'No tienes permiso para esta acción.' } }
  if (user.rol === 'administrador') return denegado
  if (name === 'contactos_mensajes') return { data: await contactos(user), error: null }
  if (name === 'mis_conversaciones') {
    const { rows } = await query(`select t.id, t.curso_id, c.nombre as curso_nombre, o.id as otro_id, coalesce(o.nombre_completo, 'Usuario') as otro_nombre,
        case when o.rol = 'facilitador' then 'facilitador' else 'participante' end as otro_rol,
        coalesce(l.creado_en, t.creado_en) as ultimo_mensaje_en, l.contenido as ultimo_contenido, l.remitente_id as ultimo_remitente,
        (select count(*)::int from mensajes m where m.conversacion_id = t.id and m.remitente_id <> $1 and m.leido_en is null) as sin_leer
      from curso_conversaciones t
      join cursos c on c.id = t.curso_id
      join perfiles o on o.id = case when t.participante_id = $1 then t.facilitador_id else t.participante_id end
      left join lateral (select contenido, remitente_id, creado_en from mensajes where conversacion_id = t.id order by creado_en desc limit 1) l on true
      where t.participante_id = $1 or t.facilitador_id = $1
      order by coalesce(l.creado_en, t.creado_en) desc`, [user.id])
    return { data: rows, error: null }
  }
  if (name === 'iniciar_conversacion') {
    const curso = String(args.p_curso || ''), otro = String(args.p_otro || '')
    if (!(await contactos(user)).some(contacto => contacto.curso_id === curso && contacto.usuario_id === otro)) return denegado
    const participante = user.rol === 'participante' ? user.id : otro, facilitador = user.rol === 'participante' ? otro : user.id
    const { rows } = await query(`insert into curso_conversaciones (curso_id, participante_id, facilitador_id) values ($1, $2, $3)
      on conflict (curso_id, participante_id, facilitador_id) do update set curso_id = excluded.curso_id returning id`, [curso, participante, facilitador])
    return { data: rows[0].id, error: null }
  }
  return { data: null, error: { code: '42883', message: `La función ${name} no existe.` } }
}
