// Motor de consultas: recibe una descripción JSON (tabla, filtros, orden, datos) y la ejecuta como SQL
// parametrizado. Solo existen las tablas y columnas declaradas aquí/en la base, y cada tabla tiene su regla
// de lectura y escritura según el rol del usuario.
import { pool } from './db.js'
import type { User } from './auth.js'

type Ctx = { user: User; values: unknown[] }
const bind = (ctx: Ctx, value: unknown) => { ctx.values.push(value); return `$${ctx.values.length}` }
const yo = (ctx: Ctx) => bind(ctx, ctx.user.id)

// Cursos que el usuario administra (facilitador asignado o creador) y cursos en los que está matriculado.
const administrados = (ctx: Ctx) => `(select curso_id from curso_facilitadores where facilitador_id = ${yo(ctx)} union select id from cursos where creado_por = ${yo(ctx)})`
const matriculado = (ctx: Ctx) => `(select curso_id from matriculas where participante_id = ${yo(ctx)} and estado = 'activa')`

/** Visibilidad de filas de un recurso ligado a un curso: administrador todo, facilitador sus cursos, participante sus matrículas. */
function alcanceCurso(ctx: Ctx, columna: string, reglaParticipante = 'true') {
  if (ctx.user.rol === 'administrador') return 'true'
  if (ctx.user.rol === 'facilitador') return `${columna} in ${administrados(ctx)}`
  return `(${columna} in ${matriculado(ctx)} and ${reglaParticipante})`
}
const soloPersonal = (ctx: Ctx, columna: string) => ctx.user.rol === 'participante' ? 'false' : alcanceCurso(ctx, columna)
const soloAdmin = (ctx: Ctx) => ctx.user.rol === 'administrador' ? 'true' : 'false'

type Def = {
  read: (ctx: Ctx, a: string) => string
  /** Filas que se pueden modificar / borrar (por defecto, ninguna). */
  update?: (ctx: Ctx, a: string) => string
  remove?: (ctx: Ctx, a: string) => string
  /** Columnas que un usuario puede escribir. */
  columns?: string[]
  /** Columnas que se pueden modificar (por defecto, las mismas de `columns`). */
  updatable?: string[]
  /** Columna que el servidor fija con el usuario actual al insertar. */
  owner?: string
  canInsert?: (user: User, row: Record<string, unknown>) => Promise<boolean> | boolean
  conflict?: string[]
}

const administraCurso = async (user: User, cursoId: unknown) => {
  if (user.rol === 'administrador') return true
  if (user.rol !== 'facilitador' || typeof cursoId !== 'string') return false
  const { rows } = await pool.query('select 1 from curso_facilitadores where curso_id = $1 and facilitador_id = $2 union select 1 from cursos where id = $1 and creado_por = $2', [cursoId, user.id])
  return rows.length > 0
}
const personalDelCurso = (user: User, row: Record<string, unknown>) => administraCurso(user, row.curso_id)
const enMiConversacion = async (user: User, row: Record<string, unknown>) => {
  if (typeof row.conversacion_id !== 'string') return false
  const { rows } = await pool.query('select 1 from curso_conversaciones where id = $1 and (participante_id = $2 or facilitador_id = $2)', [row.conversacion_id, user.id])
  return rows.length > 0
}
const misConversaciones = (c: Ctx) => `(select id from curso_conversaciones where participante_id = ${yo(c)} or facilitador_id = ${yo(c)})`

const tables: Record<string, Def> = {
  perfiles: {
    read: (c, a) => c.user.rol === 'administrador' ? 'true' : c.user.rol === 'facilitador' ? `(${a}.id = ${yo(c)} or ${a}.rol = 'participante')` : `${a}.id = ${yo(c)}`,
    update: (c, a) => `${a}.id = ${yo(c)}`,
    columns: ['nombre_completo', 'telefono', 'empresa', 'cargo', 'biografia', 'foto_url'],
  },
  cursos: {
    read: (c, a) => c.user.rol === 'administrador' ? 'true' : c.user.rol === 'facilitador' ? `${a}.id in ${administrados(c)}` : `(${a}.id in ${matriculado(c)} and ${a}.estado = 'publicado')`,
    update: (c, a) => c.user.rol === 'administrador' ? 'true' : c.user.rol === 'facilitador' ? `${a}.id in ${administrados(c)}` : 'false',
    remove: soloAdminAlias,
    columns: ['nombre', 'codigo', 'descripcion', 'categoria', 'periodo_academico', 'modalidad', 'inicia_el', 'termina_el', 'estado', 'portada_url'],
    owner: 'creado_por',
    canInsert: user => user.rol === 'administrador' || (user.rol === 'facilitador' && user.puedeCrearCursos),
  },
  curso_facilitadores: {
    read: (c, a) => c.user.rol === 'administrador' ? 'true' : c.user.rol === 'facilitador' ? `(${a}.facilitador_id = ${yo(c)} or ${a}.curso_id in ${administrados(c)})` : `${a}.curso_id in ${matriculado(c)}`,
    update: soloAdmin, remove: soloAdmin, columns: ['curso_id', 'facilitador_id', 'puede_gestionar', 'puede_crear_cursos'],
    canInsert: user => user.rol === 'administrador', conflict: ['curso_id', 'facilitador_id'],
  },
  matriculas: {
    read: (c, a) => c.user.rol === 'participante' ? `${a}.participante_id = ${yo(c)}` : alcanceCurso(c, `${a}.curso_id`),
    update: soloAdmin, remove: soloAdmin, columns: ['curso_id', 'participante_id', 'estado'],
    canInsert: user => user.rol === 'administrador', conflict: ['curso_id', 'participante_id'],
  },
  modulos: {
    read: (c, a) => alcanceCurso(c, `${a}.curso_id`, `${a}.publicado`),
    update: (c, a) => soloPersonal(c, `${a}.curso_id`), remove: (c, a) => soloPersonal(c, `${a}.curso_id`),
    columns: ['curso_id', 'titulo', 'descripcion', 'posicion', 'publicado'], canInsert: personalDelCurso,
  },
  lecciones: {
    read: (c, a) => c.user.rol === 'administrador' ? 'true' : `exists (select 1 from modulos m where m.id = ${a}.modulo_id and ${alcanceCurso(c, 'm.curso_id', `m.publicado and ${a}.publicado`)})`,
  },
  materiales: {
    read: (c, a) => alcanceCurso(c, `${a}.curso_id`, `${a}.publicado`),
    update: (c, a) => soloPersonal(c, `${a}.curso_id`), remove: (c, a) => soloPersonal(c, `${a}.curso_id`),
    columns: ['curso_id', 'modulo_id', 'titulo', 'descripcion', 'ruta_archivo', 'tipo_mime', 'publicado'], owner: 'subido_por', canInsert: personalDelCurso,
  },
  reuniones: {
    read: (c, a) => alcanceCurso(c, `${a}.curso_id`),
    update: (c, a) => soloPersonal(c, `${a}.curso_id`), remove: (c, a) => soloPersonal(c, `${a}.curso_id`),
    columns: ['curso_id', 'titulo', 'descripcion', 'inicia_en', 'termina_en', 'enlace_reunion', 'sala', 'estado', 'zona_horaria'], owner: 'organizador_id', canInsert: personalDelCurso,
  },
  curso_grabaciones: {
    read: (c, a) => alcanceCurso(c, `${a}.curso_id`, `${a}.publicado`),
    update: (c, a) => soloPersonal(c, `${a}.curso_id`), remove: (c, a) => soloPersonal(c, `${a}.curso_id`),
    columns: ['curso_id', 'titulo', 'descripcion', 'ruta_archivo', 'tipo_mime', 'publicado'], owner: 'subido_por', canInsert: personalDelCurso,
  },
  curso_certificados: {
    read: (c, a) => c.user.rol === 'participante' ? `${a}.participante_id = ${yo(c)}` : alcanceCurso(c, `${a}.curso_id`),
    update: (c, a) => soloPersonal(c, `${a}.curso_id`), remove: (c, a) => soloPersonal(c, `${a}.curso_id`),
    columns: ['curso_id', 'participante_id', 'titulo', 'numero_certificado', 'ruta_archivo', 'tipo_mime'], owner: 'emitido_por', canInsert: personalDelCurso,
  },
  notificaciones: {
    read: (c, a) => c.user.rol === 'administrador' ? 'true' : `${a}.usuario_id = ${yo(c)}`,
    update: (c, a) => `${a}.usuario_id = ${yo(c)}`, remove: soloAdminAlias, columns: ['leido_en'],
  },
  solicitudes_soporte: { read: soloAdminAlias, update: soloAdminAlias, remove: soloAdminAlias, columns: ['estado'] },
  curso_conversaciones: { read: (c, a) => `(${a}.participante_id = ${yo(c)} or ${a}.facilitador_id = ${yo(c)})` },
  mensajes: {
    read: (c, a) => `${a}.conversacion_id in ${misConversaciones(c)}`,
    update: (c, a) => `${a}.conversacion_id in ${misConversaciones(c)}`,
    columns: ['conversacion_id', 'contenido'], updatable: ['leido_en'], owner: 'remitente_id', canInsert: enMiConversacion,
  },
}
function soloAdminAlias(ctx: Ctx) { return soloAdmin(ctx) }

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
      if (user.rol !== 'administrador' && 'curso_id' in row && !(await administraCurso(user, row.curso_id))) return failure('42501', 'No tienes permiso para esta acción.')
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
