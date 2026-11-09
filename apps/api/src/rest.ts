// Motor de consultas: recibe una descripción JSON (tabla, filtros, orden, datos) y la ejecuta como SQL
// parametrizado. Solo existen las tablas y columnas declaradas aquí/en la base, y cada tabla tiene su regla
// de lectura y escritura según el rol del usuario.
import { pool } from './db.js'
import type { User } from './auth.js'

type Ctx = { user: User; values: unknown[] }
const bind = (ctx: Ctx, value: unknown) => { ctx.values.push(value); return `$${ctx.values.length}` }
const me = (ctx: Ctx) => bind(ctx, ctx.user.id)

// Cursos que el usuario administra (instructor asignado o creador) y cursos en los que está matriculado.
const managed = (ctx: Ctx) => `(select course_id from course_instructors where instructor_id = ${me(ctx)} union select id from courses where created_by = ${me(ctx)})`
const enrolled = (ctx: Ctx) => `(select course_id from enrollments where student_id = ${me(ctx)} and status = 'active')`

/** Visibilidad de filas de un recurso ligado a un curso: admin todo, facilitador sus cursos, participante sus matrículas. */
function courseScope(ctx: Ctx, column: string, studentRule = 'true') {
  if (ctx.user.role === 'admin') return 'true'
  if (ctx.user.role === 'teacher') return `${column} in ${managed(ctx)}`
  return `(${column} in ${enrolled(ctx)} and ${studentRule})`
}
const staffScope = (ctx: Ctx, column: string) => ctx.user.role === 'student' ? 'false' : courseScope(ctx, column)
const adminOnly = (ctx: Ctx) => ctx.user.role === 'admin' ? 'true' : 'false'

type Def = {
  read: (ctx: Ctx, a: string) => string
  /** Filas que se pueden modificar / borrar (por defecto, ninguna). */
  update?: (ctx: Ctx, a: string) => string
  remove?: (ctx: Ctx, a: string) => string
  /** Columnas que un usuario puede escribir. */
  columns?: string[]
  /** Columnas que se pueden modificar (por defecto, las mismas de `columns`). */
  updatable?: string[]
  /** Columnas que el servidor fija con el usuario actual al insertar. */
  owner?: string
  canInsert?: (user: User, row: Record<string, unknown>) => Promise<boolean> | boolean
  conflict?: string[]
}

const managesCourse = async (user: User, courseId: unknown) => {
  if (user.role === 'admin') return true
  if (user.role !== 'teacher' || typeof courseId !== 'string') return false
  const { rows } = await pool.query('select 1 from course_instructors where course_id = $1 and instructor_id = $2 union select 1 from courses where id = $1 and created_by = $2', [courseId, user.id])
  return rows.length > 0
}
const courseStaff = (user: User, row: Record<string, unknown>) => managesCourse(user, row.course_id)
const inMyThread = async (user: User, row: Record<string, unknown>) => {
  if (typeof row.conversation_id !== 'string') return false
  const { rows } = await pool.query('select 1 from course_threads where id = $1 and (student_id = $2 or teacher_id = $2)', [row.conversation_id, user.id])
  return rows.length > 0
}

const tables: Record<string, Def> = {
  profiles: {
    read: (c, a) => c.user.role === 'admin' ? 'true' : c.user.role === 'teacher' ? `(${a}.id = ${me(c)} or ${a}.role = 'student')` : `${a}.id = ${me(c)}`,
    update: (c, a) => `${a}.id = ${me(c)}`,
    columns: ['full_name', 'phone', 'company', 'job_title', 'bio', 'avatar_url'],
  },
  courses: {
    read: (c, a) => c.user.role === 'admin' ? 'true' : c.user.role === 'teacher' ? `${a}.id in ${managed(c)}` : `(${a}.id in ${enrolled(c)} and ${a}.status = 'published')`,
    update: (c, a) => c.user.role === 'admin' ? 'true' : c.user.role === 'teacher' ? `${a}.id in ${managed(c)}` : 'false',
    remove: adminOnlyAlias,
    columns: ['name', 'code', 'description', 'category', 'academic_period', 'modality', 'starts_on', 'ends_on', 'status', 'cover_url'],
    owner: 'created_by',
    canInsert: user => user.role === 'admin' || (user.role === 'teacher' && user.canCreateCourses),
  },
  course_instructors: {
    read: (c, a) => c.user.role === 'admin' ? 'true' : c.user.role === 'teacher' ? `(${a}.instructor_id = ${me(c)} or ${a}.course_id in ${managed(c)})` : `${a}.course_id in ${enrolled(c)}`,
    update: adminOnly, remove: adminOnly, columns: ['course_id', 'instructor_id', 'can_manage', 'can_create_courses'],
    canInsert: user => user.role === 'admin', conflict: ['course_id', 'instructor_id'],
  },
  enrollments: {
    read: (c, a) => c.user.role === 'student' ? `${a}.student_id = ${me(c)}` : courseScope(c, `${a}.course_id`),
    update: adminOnly, remove: adminOnly, columns: ['course_id', 'student_id', 'status'],
    canInsert: user => user.role === 'admin', conflict: ['course_id', 'student_id'],
  },
  modules: {
    read: (c, a) => courseScope(c, `${a}.course_id`, `${a}.published`),
    update: (c, a) => staffScope(c, `${a}.course_id`), remove: (c, a) => staffScope(c, `${a}.course_id`),
    columns: ['course_id', 'title', 'description', 'position', 'published'], canInsert: courseStaff,
  },
  lessons: {
    read: (c, a) => c.user.role === 'admin' ? 'true' : `exists (select 1 from modules m where m.id = ${a}.module_id and ${courseScope(c, 'm.course_id', `m.published and ${a}.published`)})`,
  },
  materials: {
    read: (c, a) => courseScope(c, `${a}.course_id`, `${a}.is_published`),
    update: (c, a) => staffScope(c, `${a}.course_id`), remove: (c, a) => staffScope(c, `${a}.course_id`),
    columns: ['course_id', 'module_id', 'title', 'description', 'storage_path', 'mime_type', 'is_published'], owner: 'uploaded_by', canInsert: courseStaff,
  },
  meetings: {
    read: (c, a) => courseScope(c, `${a}.course_id`),
    update: (c, a) => staffScope(c, `${a}.course_id`), remove: (c, a) => staffScope(c, `${a}.course_id`),
    columns: ['course_id', 'title', 'description', 'starts_at', 'ends_at', 'meeting_url', 'room_name', 'status', 'timezone'], owner: 'organizer_id', canInsert: courseStaff,
  },
  course_recordings: {
    read: (c, a) => courseScope(c, `${a}.course_id`, `${a}.is_published`),
    update: (c, a) => staffScope(c, `${a}.course_id`), remove: (c, a) => staffScope(c, `${a}.course_id`),
    columns: ['course_id', 'title', 'description', 'storage_path', 'mime_type', 'is_published'], owner: 'uploaded_by', canInsert: courseStaff,
  },
  course_certificates: {
    read: (c, a) => c.user.role === 'student' ? `${a}.student_id = ${me(c)}` : courseScope(c, `${a}.course_id`),
    update: (c, a) => staffScope(c, `${a}.course_id`), remove: (c, a) => staffScope(c, `${a}.course_id`),
    columns: ['course_id', 'student_id', 'title', 'certificate_number', 'storage_path', 'mime_type'], owner: 'issued_by', canInsert: courseStaff,
  },
  notifications: {
    read: (c, a) => c.user.role === 'admin' ? 'true' : `${a}.user_id = ${me(c)}`,
    update: (c, a) => `${a}.user_id = ${me(c)}`, remove: adminOnlyAlias, columns: ['read_at'],
  },
  support_requests: { read: adminOnlyAlias, update: adminOnlyAlias, remove: adminOnlyAlias, columns: ['status'] },
  course_threads: { read: (c, a) => `(${a}.student_id = ${me(c)} or ${a}.teacher_id = ${me(c)})` },
  thread_messages: {
    read: (c, a) => `${a}.conversation_id in (select id from course_threads where student_id = ${me(c)} or teacher_id = ${me(c)})`,
    update: (c, a) => `${a}.conversation_id in (select id from course_threads where student_id = ${me(c)} or teacher_id = ${me(c)})`,
    columns: ['conversation_id', 'body'], updatable: ['read_at'], owner: 'sender_id', canInsert: inMyThread,
  },
}
function adminOnlyAlias(ctx: Ctx) { return adminOnly(ctx) }

type ColumnInfo = Record<string, string> // columna → tipo
const schema: Record<string, ColumnInfo> = {}
export async function loadSchema() {
  const { rows } = await pool.query(`select table_name, column_name, udt_name from information_schema.columns where table_schema = 'public'`)
  for (const row of rows) (schema[row.table_name] ||= {})[row.column_name] = row.udt_name
}

export type QueryRequest = {
  op: 'select' | 'insert' | 'update' | 'upsert' | 'delete'
  filters?: { op: 'eq' | 'neq' | 'in' | 'is'; column: string; value: unknown }[]
  order?: { column: string; ascending: boolean } | null
  limit?: number | null
  payload?: Record<string, unknown> | Record<string, unknown>[] | null
  returning?: boolean
  shape?: 'many' | 'single' | 'maybe'
  count?: boolean
  onConflict?: string[]
}
type Result = { data: unknown; error: { code: string; message: string } | null; count?: number | null }
const failure = (code: string, message: string): Result => ({ data: null, error: { code, message } })
const IDENT = /^[a-z_][a-z0-9_]*$/

export async function runQuery(user: User, tableName: string, request: QueryRequest): Promise<Result> {
  const def = tables[tableName]
  const columns = schema[tableName]
  if (!def || !columns || !IDENT.test(tableName)) return failure('42P01', `La tabla ${tableName} no existe.`)
  const ctx: Ctx = { user, values: [] }
  const a = 'a'
  const clauses: string[] = []

  for (const filter of request.filters || []) {
    if (!(filter.column in columns) || !IDENT.test(filter.column)) return failure('42703', `La columna ${filter.column} no existe.`)
    const col = `${a}.${filter.column}`
    if (filter.op === 'is') clauses.push(filter.value === null ? `${col} is null` : `${col} is not distinct from ${bind(ctx, filter.value)}`)
    else if (filter.op === 'in') clauses.push(Array.isArray(filter.value) && filter.value.length ? `${col} = any(${bind(ctx, filter.value)}::${columns[filter.column]}[])` : 'false')
    else if (filter.op === 'eq') clauses.push(`${col} = ${bind(ctx, filter.value)}`)
    else if (filter.op === 'neq') clauses.push(`${col} is distinct from ${bind(ctx, filter.value)}`)
    else return failure('42601', 'Operador no permitido.')
  }
  const filterSql = clauses.length ? clauses.join(' and ') : 'true'
  const shape = request.shape || 'many'
  const shapeRows = (rows: unknown[], count: number | null = null): Result => {
    if (shape === 'many') return { data: rows, error: null, count }
    if (shape === 'maybe') return { data: rows[0] ?? null, error: null, count }
    return rows.length === 1 ? { data: rows[0], error: null, count } : failure('PGRST116', 'JSON object requested, multiple (or no) rows returned')
  }

  try {
    if (request.op === 'select') {
      const readSql = def.read(ctx, a)
      let sql = `select ${a}.* from ${tableName} ${a} where (${readSql}) and ${filterSql}`
      const sort = request.order
      if (sort) {
        if (!(sort.column in columns) || !IDENT.test(sort.column)) return failure('42703', 'Columna de orden no válida.')
        sql += ` order by ${a}.${sort.column} ${sort.ascending ? 'asc' : 'desc'}`
      }
      if (request.limit) sql += ` limit ${Math.min(Math.max(1, Math.floor(Number(request.limit))), 1000)}`
      const { rows } = await pool.query(sql, ctx.values)
      let count: number | null = null
      if (request.count) count = Number((await pool.query(`select count(*) from ${tableName} ${a} where (${readSql}) and ${filterSql}`, ctx.values)).rows[0].count)
      return shapeRows(rows, count)
    }

    const writing = request.op === 'insert' || request.op === 'upsert'
    const allowed = new Set([...(writing ? (def.columns || []) : (def.updatable || def.columns || [])), ...(writing && def.owner ? [def.owner] : [])])
    const rowsIn = Array.isArray(request.payload) ? request.payload : request.payload ? [request.payload] : []
    const bad = rowsIn.flatMap(row => Object.keys(row)).find(key => !allowed.has(key))
    if (request.op !== 'delete' && bad) return failure('42501', `No puedes escribir la columna ${bad}.`)

    if (request.op === 'insert' || request.op === 'upsert') {
      if (!def.canInsert) return failure('42501', 'No tienes permiso para esta acción.')
      const client = await pool.connect()
      const done: unknown[] = []
      try {
        await client.query('begin')
        for (const raw of rowsIn) {
          const row: Record<string, unknown> = { ...raw }
          if (def.owner) row[def.owner] = user.id
          if (!(await def.canInsert(user, row))) { await client.query('rollback'); return failure('42501', 'No tienes permiso para esta acción.') }
          const keys = Object.keys(row).filter(key => key in columns && IDENT.test(key))
          const params = keys.map(key => row[key])
          const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ')
          let sql = `insert into ${tableName} (${keys.join(', ')}) values (${placeholders})`
          if (request.op === 'upsert') {
            const target = request.onConflict?.length ? request.onConflict : def.conflict
            if (!target || target.some(column => !(column in columns) || !IDENT.test(column))) { await client.query('rollback'); return failure('42601', 'Falta el criterio de conflicto.') }
            const updates = keys.filter(key => !target.includes(key))
            sql += ` on conflict (${target.join(', ')}) ${updates.length ? `do update set ${updates.map(key => `${key} = excluded.${key}`).join(', ')}` : 'do nothing'}`
          }
          const { rows } = await client.query(`${sql} returning *`, params)
          done.push(...rows)
        }
        await client.query('commit')
      } catch (error) { await client.query('rollback').catch(() => {}); throw error } finally { client.release() }
      return request.returning ? shapeRows(done) : { data: null, error: null }
    }

    if (request.op === 'update') {
      if (!def.update) return failure('42501', 'No tienes permiso para esta acción.')
      const row = (rowsIn[0] || {}) as Record<string, unknown>
      const keys = Object.keys(row).filter(key => key in columns && IDENT.test(key))
      if (!keys.length) return failure('42601', 'No hay nada que actualizar.')
      if (user.role !== 'admin' && 'course_id' in row && !(await managesCourse(user, row.course_id))) return failure('42501', 'No tienes permiso para esta acción.')
      const sets = keys.map(key => `${key} = ${bind(ctx, row[key])}`).join(', ')
      const { rows } = await pool.query(`update ${tableName} ${a} set ${sets} where (${def.update(ctx, a)}) and ${filterSql} returning ${a}.*`, ctx.values)
      return request.returning ? shapeRows(rows) : { data: null, error: null }
    }

    if (!def.remove) return failure('42501', 'No tienes permiso para esta acción.')
    const { rows } = await pool.query(`delete from ${tableName} ${a} where (${def.remove(ctx, a)}) and ${filterSql} returning ${a}.*`, ctx.values)
    return request.returning ? shapeRows(rows) : { data: null, error: null }
  } catch (error) {
    const pgError = error as { code?: string; message?: string }
    return failure(pgError.code || 'XX000', pgError.message || 'Error de base de datos.')
  }
}

/** ¿Puede este usuario ver la fila? Sirve para filtrar eventos en vivo y archivos. */
export async function canRead(user: User, tableName: string, id: string) {
  const def = tables[tableName]
  if (!def) return false
  const ctx: Ctx = { user, values: [id] }
  const { rows } = await pool.query(`select 1 from ${tableName} a where a.id = $1 and (${def.read(ctx, 'a')})`, ctx.values)
  return rows.length > 0
}
