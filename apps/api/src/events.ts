// Eventos en vivo (Server-Sent Events). PostgreSQL avisa con LISTEN/NOTIFY cuando cambian los avisos o los
// mensajes (ver publicar_cambio en el esquema) y el servidor reenvía solo lo que cada usuario puede ver.
import { Router } from 'express'
import type { Request, Response } from 'express'
import pg from 'pg'
import { requireAuth } from './auth.js'
import type { AuthedRequest, User } from './auth.js'
import { connectionString, pool } from './db.js'
import { canRead } from './rest.js'

type Client = { user: User; response: Response }
const clients = new Set<Client>()
const TABLES = new Set(['notificaciones', 'mensajes'])

export const events = Router()
events.get('/', requireAuth, (request: Request, response: Response) => {
  const client: Client = { user: (request as AuthedRequest).user, response }
  response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' })
  response.write(': conectado\n\n')
  clients.add(client)
  request.on('close', () => { clients.delete(client) })
})
setInterval(() => { for (const client of clients) client.response.write(': latido\n\n') }, 25_000).unref()

export async function listenForChanges() {
  const listener = new pg.Client({ connectionString })
  const connect = async () => {
    try {
      await listener.connect()
      await listener.query('listen aula_eventos')
    } catch (error) { console.error('[eventos] no se pudo escuchar la base de datos:', (error as Error).message) }
  }
  listener.on('notification', async message => {
    try {
      const change = JSON.parse(message.payload || '{}') as { table: string; event: string; id: string }
      if (!TABLES.has(change.table) || !clients.size) return
      const { rows } = await pool.query(`select * from ${change.table} where id = $1`, [change.id])
      if (!rows[0]) return
      const payload = `data: ${JSON.stringify({ table: change.table, event: change.event, row: rows[0] })}\n\n`
      for (const client of clients) if (await canRead(client.user, change.table, change.id)) client.response.write(payload)
    } catch (error) { console.error('[eventos] error al reenviar un cambio:', (error as Error).message) }
  })
  listener.on('error', error => console.error('[eventos] conexión perdida:', error.message))
  await connect()
  return () => listener.end()
}
