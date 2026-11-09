// PostgreSQL embebido para desarrollo: binarios reales de Postgres, sin instalar nada ni usar Docker.
// En producción se define DATABASE_URL y este archivo no se usa.
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import EmbeddedPostgres from 'embedded-postgres'
import { DEV_PG_DIR, DEV_PG_PORT } from './config.js'

let server: EmbeddedPostgres | null = null

export async function startDevDatabase() {
  const fresh = !existsSync(path.join(DEV_PG_DIR, 'PG_VERSION'))
  mkdirSync(path.dirname(DEV_PG_DIR), { recursive: true })
  server = new EmbeddedPostgres({ databaseDir: DEV_PG_DIR, user: 'postgres', password: 'postgres', port: DEV_PG_PORT, persistent: true, initdbFlags: ['--encoding=UTF8', '--locale=C'], onLog: () => {}, onError: message => console.error('[postgres]', String(message).trim()) })
  if (fresh) await server.initialise()
  await server.start()
  if (fresh) await server.createDatabase('aula')
  console.log(`[db] PostgreSQL de desarrollo en el puerto ${DEV_PG_PORT} (datos en ${DEV_PG_DIR})`)
}

export async function stopDevDatabase() {
  if (server) { await server.stop(); server = null }
}
