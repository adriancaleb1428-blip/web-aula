// Almacenamiento de archivos en disco (STORAGE_DIR). En producción puede montarse un volumen persistente
// o sustituirse este módulo por S3/R2 sin tocar el resto del servidor.
import { createWriteStream, existsSync, mkdirSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'
import { Router } from 'express'
import type { Request, Response } from 'express'
import { requireAuth, signFileToken, verifyFileToken } from './auth.js'
import type { AuthedRequest, User } from './auth.js'
import { MAX_UPLOAD_BYTES, STORAGE_DIR } from './config.js'
import { pool } from './db.js'
import { canRead } from './rest.js'

const MB = 1024 * 1024
const limits: Record<string, number> = { 'course-materials': 50 * MB, 'course-certificates': 20 * MB, avatars: 2 * MB, 'course-recordings': MAX_UPLOAD_BYTES }
const tableFor: Record<string, string> = { 'course-materials': 'materials', 'course-recordings': 'course_recordings', 'course-certificates': 'course_certificates' }
const types: Record<string, string> = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', txt: 'text/plain; charset=utf-8', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' }
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Ruta absoluta dentro de STORAGE_DIR; lanza si el nombre intenta salir de ahí. */
export function filePath(bucket: string, name: string) {
  if (!(bucket in limits) || name.includes('\0') || name.includes('\\') || name.split('/').some(part => part === '..' || part === '')) throw new Error('Ruta de archivo no válida.')
  const full = path.resolve(STORAGE_DIR, bucket, name)
  if (!full.startsWith(path.resolve(STORAGE_DIR, bucket) + path.sep)) throw new Error('Ruta de archivo no válida.')
  return full
}

async function allowed(user: User, bucket: string, name: string, mode: 'read' | 'write') {
  const first = name.split('/')[0]
  if (bucket === 'avatars') return user.role === 'admin' || first === user.id
  if (mode === 'write') {
    if (user.role === 'student' || !uuidPattern.test(first)) return false
    if (user.role === 'admin') return true
    const { rows } = await pool.query('select 1 from course_instructors where course_id = $1 and instructor_id = $2 union select 1 from courses where id = $1 and created_by = $2', [first, user.id])
    return rows.length > 0
  }
  const { rows } = await pool.query(`select id from ${tableFor[bucket]} where storage_path = $1`, [name])
  for (const row of rows) if (await canRead(user, tableFor[bucket], row.id)) return true
  return false
}

export const storage = Router()
const bad = (response: Response, status: number, error: string) => { response.status(status).json({ error }) }

// Subida: el cuerpo es el archivo tal cual (así el navegador puede mostrar el avance).
storage.post('/upload', requireAuth, async (request: Request, response: Response) => {
  const user = (request as AuthedRequest).user
  const bucket = String(request.query.bucket || ''), name = String(request.query.path || '')
  let target: string
  try { target = filePath(bucket, name) } catch { return bad(response, 400, 'Ruta de archivo no válida.') }
  if (!(await allowed(user, bucket, name, 'write'))) return bad(response, 403, 'No tienes permiso para subir aquí.')
  const length = Number(request.headers['content-length'] || 0)
  if (length > limits[bucket]) return bad(response, 413, 'El archivo supera el tamaño permitido.')
  mkdirSync(path.dirname(target), { recursive: true })
  const out = createWriteStream(target, { flags: 'wx' })
  let received = 0, aborted = false
  const abort = (status: number, message: string) => { if (aborted) return; aborted = true; out.destroy(); rmSync(target, { force: true }); if (!response.headersSent) bad(response, status, message) }
  request.on('data', chunk => { received += chunk.length; if (received > limits[bucket]) { request.destroy(); abort(413, 'El archivo supera el tamaño permitido.') } })
  request.on('aborted', () => abort(499, 'Subida cancelada.'))
  out.on('error', error => abort((error as { code?: string }).code === 'EEXIST' ? 409 : 500, 'No se pudo guardar el archivo.'))
  out.on('finish', () => { if (!aborted) response.status(201).json({ path: name }) })
  request.pipe(out)
})

// Enlace temporal firmado (1 h) para ver o descargar un archivo al que el usuario tiene acceso.
storage.post('/sign', requireAuth, async (request: Request, response: Response) => {
  const user = (request as AuthedRequest).user
  const bucket = String(request.body?.bucket || ''), name = String(request.body?.path || '')
  try { filePath(bucket, name) } catch { return bad(response, 400, 'Ruta de archivo no válida.') }
  if (!(await allowed(user, bucket, name, 'read')) || !existsSync(filePath(bucket, name))) return bad(response, 404, 'Archivo no encontrado.')
  response.json({ signedUrl: `/storage/object?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(name)}&token=${signFileToken(bucket, name)}` })
})

storage.get('/object', (request: Request, response: Response) => {
  const bucket = String(request.query.bucket || ''), name = String(request.query.path || ''), token = String(request.query.token || '')
  if (!verifyFileToken(token, bucket, name)) return bad(response, 403, 'El enlace expiró. Vuelve a abrir el archivo.')
  let full: string
  try { full = filePath(bucket, name) } catch { return bad(response, 400, 'Ruta de archivo no válida.') }
  if (!existsSync(full) || !statSync(full).isFile()) return bad(response, 404, 'Archivo no encontrado.')
  const extension = name.split('.').pop()?.toLowerCase() || ''
  response.setHeader('Content-Type', types[extension] || 'application/octet-stream')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('Cache-Control', 'private, max-age=600')
  response.sendFile(full, { dotfiles: 'allow' })
})

storage.post('/remove', requireAuth, async (request: Request, response: Response) => {
  const user = (request as AuthedRequest).user
  const bucket = String(request.body?.bucket || ''), names: unknown[] = Array.isArray(request.body?.paths) ? request.body.paths : []
  for (const name of names) {
    try {
      if (typeof name !== 'string') continue
      const full = filePath(bucket, name)
      if (!(await allowed(user, bucket, name, 'write'))) return bad(response, 403, 'No tienes permiso para eliminar ese archivo.')
      rmSync(full, { force: true })
    } catch { return bad(response, 400, 'Ruta de archivo no válida.') }
  }
  response.json({ ok: true })
})
