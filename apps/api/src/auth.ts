import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { NextFunction, Request, Response } from 'express'
import { JWT_SECRET, TOKEN_TTL_SECONDS } from './config.js'
import { query } from './db.js'

export type Rol = 'administrador' | 'facilitador' | 'participante'
export type User = { id: string; correo: string; rol: Rol; puedeCrearCursos: boolean; nombreCompleto: string | null }
export type AuthedRequest = Request & { user: User }

export const hashPassword = (password: string) => bcrypt.hash(password, 11)
export const signToken = (userId: string) => jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: TOKEN_TTL_SECONDS })
/** Enlace temporal para archivos: el navegador (img, iframe, video) no puede enviar cabeceras. */
export const signFileToken = (bucket: string, path: string) => jwt.sign({ f: `${bucket}/${path}` }, JWT_SECRET, { expiresIn: 3600 })
export const verifyFileToken = (token: string, bucket: string, path: string) => {
  try { return (jwt.verify(token, JWT_SECRET) as { f?: string }).f === `${bucket}/${path}` } catch { return false }
}

export async function userFromToken(token: string | undefined): Promise<User | null> {
  if (!token) return null
  let id: string
  try { id = String((jwt.verify(token, JWT_SECRET) as { sub?: string }).sub) } catch { return null }
  const { rows } = await query('select u.id, u.correo, p.rol, p.puede_crear_cursos, p.nombre_completo from usuarios u join perfiles p on p.id = u.id where u.id = $1', [id])
  const row = rows[0]
  return row ? { id: row.id, correo: row.correo, rol: row.rol, puedeCrearCursos: row.puede_crear_cursos, nombreCompleto: row.nombre_completo } : null
}

const bearer = (request: Request) => request.headers.authorization?.startsWith('Bearer ') ? request.headers.authorization.slice(7) : undefined

/** Exige sesión. El token va en la cabecera Authorization (o en ?t= para eventos en vivo). */
export async function requireAuth(request: Request, response: Response, next: NextFunction) {
  try {
    const user = await userFromToken(bearer(request) || (typeof request.query.t === 'string' ? request.query.t : undefined))
    if (!user) { response.status(401).json({ error: 'Inicia sesión para continuar.' }); return }
    ;(request as AuthedRequest).user = user
    next()
  } catch (error) { next(error) }
}

// Límite sencillo en memoria por clave (IP + correo) para frenar fuerza bruta.
const attempts = new Map<string, { count: number; resetAt: number }>()
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const entry = attempts.get(key)
  if (!entry || entry.resetAt < now) { attempts.set(key, { count: 1, resetAt: now + windowMs }); return true }
  entry.count++
  return entry.count <= limit
}
setInterval(() => { const now = Date.now(); for (const [key, entry] of attempts) if (entry.resetAt < now) attempts.delete(key) }, 60_000).unref()

export async function login(correo: string, contrasena: string) {
  const { rows } = await query('select id, correo, contrasena_hash from usuarios where lower(correo) = lower($1)', [correo.trim()])
  const row = rows[0]
  // Se compara siempre contra un hash para no revelar si el correo existe por el tiempo de respuesta.
  const ok = await bcrypt.compare(contrasena, row?.contrasena_hash || '$2b$11$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidu')
  if (!row || !ok) return null
  await query('update usuarios set ultimo_acceso_en = now() where id = $1', [row.id])
  return { token: signToken(row.id), user: { id: row.id, correo: row.correo } }
}

export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash)

export function passwordProblem(password: string) {
  if (password.length < 12 || Buffer.byteLength(password) > 72) return 'La contraseña debe tener entre 12 y 72 caracteres.'
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) return 'La contraseña debe incluir mayúsculas, minúsculas y números.'
  return ''
}
