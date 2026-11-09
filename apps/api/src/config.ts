import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const env = process.env

export const PORT = Number(env.PORT || 3001)
/** Si no se define, en desarrollo se arranca un PostgreSQL embebido (ver devdb.ts). */
export const DATABASE_URL = env.DATABASE_URL || ''
export const DEV_PG_PORT = Number(env.DEV_PG_PORT || 5433)
export const DEV_PG_DIR = env.DEV_PG_DIR || path.join(ROOT, '.data', 'postgres')
export const STORAGE_DIR = env.STORAGE_DIR || path.join(ROOT, '.data', 'storage')
/** Orígenes autorizados (separados por comas). En desarrollo el proxy de Vite hace innecesario CORS. */
export const CORS_ORIGINS = (env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5500,http://127.0.0.1:5500').split(',').map(value => value.trim()).filter(Boolean)
export const MAX_UPLOAD_BYTES = Number(env.MAX_UPLOAD_MB || 2048) * 1024 * 1024

// El secreto de los tokens: variable de entorno en producción; en desarrollo se genera y se guarda una vez.
function jwtSecret() {
  if (env.JWT_SECRET) return env.JWT_SECRET
  if (env.NODE_ENV === 'production') throw new Error('Define JWT_SECRET en producción.')
  const file = path.join(ROOT, '.data', 'jwt-secret')
  mkdirSync(path.dirname(file), { recursive: true })
  if (!existsSync(file)) writeFileSync(file, randomBytes(48).toString('hex'))
  return readFileSync(file, 'utf8').trim()
}
export const JWT_SECRET = jwtSecret()
export const TOKEN_TTL_SECONDS = 60 * 60 * 12
