import cors from 'cors'
import express from 'express'
import type { NextFunction, Request, Response } from 'express'
import { login, rateLimit, requireAuth, userFromToken, verifyPassword } from './auth.js'
import type { AuthedRequest } from './auth.js'
import { CORS_ORIGINS, DATABASE_URL, PORT } from './config.js'
import { migrate, pool, query } from './db.js'
import { startDevDatabase, stopDevDatabase } from './devdb.js'
import { events, listenForChanges } from './events.js'
import { runFunction, runRpc } from './functions.js'
import { loadSchema, runQuery } from './rest.js'
import type { QueryRequest } from './rest.js'
import { seedInitial } from './seed.js'
import { shop } from './shop.js'
import { storage } from './storage.js'
import { hashPassword, passwordProblem } from './auth.js'

async function main() {
  if (!DATABASE_URL) await startDevDatabase()
  await migrate()
  await loadSchema()
  if (!DATABASE_URL && Number((await query('select count(*) from usuarios')).rows[0].count) === 0) await seedInitial()
  const stopListening = await listenForChanges()

  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1)
  app.use(cors({ origin: CORS_ORIGINS, credentials: false }))
  app.use(express.json({ limit: '1mb' }))
  app.use((_request, response, next) => { response.setHeader('X-Content-Type-Options', 'nosniff'); next() })

  const api = express.Router()
  api.get('/health', async (_request, response) => { await query('select 1'); response.json({ ok: true }) })

  api.post('/auth/login', async (request, response) => {
    const correo = String(request.body?.correo || ''), contrasena = String(request.body?.contrasena || '')
    if (!rateLimit(`login:${request.ip}:${correo.toLowerCase()}`, 10, 15 * 60_000)) { response.status(429).json({ error: 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.' }); return }
    const result = await login(correo, contrasena)
    if (!result) { response.status(400).json({ error: 'Correo o contraseña incorrectos.' }); return }
    response.json({ access_token: result.token, usuario: result.user })
  })
  api.get('/auth/session', requireAuth, (request, response) => {
    const user = (request as AuthedRequest).user
    response.json({ usuario: { id: user.id, correo: user.correo, nombre_completo: user.nombreCompleto || '' } })
  })
  api.post('/auth/password', requireAuth, async (request, response) => {
    const user = (request as AuthedRequest).user, contrasena = String(request.body?.contrasena || '')
    const weak = passwordProblem(contrasena)
    if (weak) { response.status(400).json({ error: weak }); return }
    const current = (await query('select contrasena_hash from usuarios where id = $1', [user.id])).rows[0]
    if (current && await verifyPassword(contrasena, current.contrasena_hash)) { response.status(400).json({ error: 'Elige una contraseña distinta a la actual.' }); return }
    await query('update usuarios set contrasena_hash = $2 where id = $1', [user.id, await hashPassword(contrasena)])
    response.json({ ok: true })
  })

  api.post('/rest/:table', requireAuth, async (request, response) => {
    response.json(await runQuery((request as AuthedRequest).user, String(request.params.table), (request.body || {}) as QueryRequest))
  })
  api.post('/rpc/:name', requireAuth, async (request, response) => {
    response.json(await runRpc(String(request.params.name), (request as AuthedRequest).user, request.body || {}))
  })
  // Funciones de la aplicación; solo «solicitud-soporte» es pública (el formulario está en la pantalla de ingreso).
  api.post('/fn/:name', async (request, response) => {
    const name = String(request.params.name)
    const header = request.headers.authorization
    const user = await userFromToken(header?.startsWith('Bearer ') ? header.slice(7) : undefined)
    const limited = name === 'solicitud-soporte' && !rateLimit(`support:${request.ip}`, 5, 15 * 60_000)
    const result = await runFunction(name, user, request.body || {}, request.ip || '', limited)
    response.status(result.status).json(result.body)
  })
  api.use('/shop', shop)
  api.use('/storage', express.json({ limit: '100kb' }), storage)
  api.use('/events', events)
  api.use((_request, response) => { response.status(404).json({ error: 'Ruta no encontrada.' }) })
  app.use('/api', api)

  app.use((error: Error, _request: Request, response: Response, _next: NextFunction) => {
    console.error('[api] error no controlado:', error)
    if (!response.headersSent) response.status(500).json({ error: 'Ocurrió un error en el servidor.' })
  })

  const server = app.listen(PORT, () => console.log(`[api] http://localhost:${PORT}/api (salud: /api/health)`))
  const shutdown = async () => {
    console.log('[api] cerrando…')
    server.close(); await stopListening().catch(() => {}); await pool.end().catch(() => {}); await stopDevDatabase().catch(() => {})
    process.exit(0)
  }
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown)
}

main().catch(async error => { console.error(error); await stopDevDatabase().catch(() => {}); process.exit(1) })
