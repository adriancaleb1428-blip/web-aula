import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import pg from 'pg'
import { DATABASE_URL, DEV_PG_PORT, ROOT } from './config.js'

// Las columnas date/timestamp se devuelven como texto ISO tal cual (el navegador las interpreta).
pg.types.setTypeParser(1082, value => value)

export const connectionString = DATABASE_URL || `postgres://postgres:postgres@127.0.0.1:${DEV_PG_PORT}/aula`
export const pool = new pg.Pool({ connectionString, max: 10 })
pool.on('error', error => console.error('[pg] error en una conexión inactiva:', error.message))

export type Queryable = Pick<pg.Pool, 'query'>
export const query = <T extends pg.QueryResultRow = any>(text: string, values: unknown[] = []) => pool.query<T>(text, values) // eslint-disable-line @typescript-eslint/no-explicit-any

/** Aplica en orden los archivos sql/*.sql que todavía no se hayan ejecutado. */
export async function migrate() {
  await pool.query('create table if not exists migraciones (nombre text primary key, aplicada_en timestamptz not null default now())')
  const dir = path.join(ROOT, 'sql')
  const applied = new Set((await pool.query('select nombre from migraciones')).rows.map(row => row.nombre))
  const files = readdirSync(dir).filter(file => file.endsWith('.sql')).sort()
  let count = 0
  for (const file of files) {
    if (applied.has(file)) continue
    const client = await pool.connect()
    try {
      await client.query('begin')
      await client.query(readFileSync(path.join(dir, file), 'utf8'))
      await client.query('insert into migraciones (nombre) values ($1)', [file])
      await client.query('commit')
      count++
      console.log(`[db] migración aplicada: ${file}`)
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally { client.release() }
  }
  return count
}

export async function resetSchema() {
  await pool.query('drop schema public cascade; create schema public;')
}
