// Tienda de cursos: catálogo público y compra. Al pagar se crea (o se reutiliza) la cuenta del participante y se
// le matricula en los cursos elegidos; el aula muestra entonces esos cursos en «Mis cursos».
//
// Pagos: todavía no hay pasarela. Con PAYMENTS_MODE=simulated (por defecto en desarrollo) el pedido se da por
// pagado al instante, sin pedir datos de tarjeta. En producción hay que conectar una pasarela real en
// `confirmPayment` o definir ALLOW_SIMULATED_PAYMENTS=true de forma consciente.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { Router } from 'express'
import { hashPassword, passwordProblem, rateLimit, signToken, verifyPassword } from './auth.js'
import { ROOT } from './config.js'
import { pool, query } from './db.js'

const simulated = process.env.PAYMENTS_MODE ? process.env.PAYMENTS_MODE === 'simulated' : process.env.NODE_ENV !== 'production'
const allowSimulated = simulated || process.env.ALLOW_SIMULATED_PAYMENTS === 'true'

type CursoCatalogo = {
  slug: string; titulo: string; descripcion: string; emoji: string; categoria: string; duracion: string; modalidad: string; nivel: string
  precio: number; precioLista: number | null; objetivo: string; temario: string[]; dirigidoA: string[]
}

/** Carga (o actualiza) el catálogo de venta desde data/catalogo.json. Necesita al menos un administrador. */
export async function loadCatalog() {
  const cursos: CursoCatalogo[] = JSON.parse(readFileSync(path.join(ROOT, 'data', 'catalogo.json'), 'utf8'))
  const admin = (await query("select id from perfiles where rol = 'administrador' order by creado_en limit 1")).rows[0]
  if (!admin) throw new Error('Crea primero un administrador para cargar el catálogo.')
  for (const curso of cursos) {
    await query(
      `insert into cursos (nombre, codigo, slug, descripcion, categoria, modalidad, estado, creado_por, precio, precio_lista, emoji, duracion, nivel, objetivo, temario, dirigido_a, en_venta)
       values ($1,$2,$3,$4,$5,$6,'publicado',$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::jsonb,true)
       on conflict (slug) do update set nombre = excluded.nombre, descripcion = excluded.descripcion, categoria = excluded.categoria, modalidad = excluded.modalidad,
         precio = excluded.precio, precio_lista = excluded.precio_lista, emoji = excluded.emoji, duracion = excluded.duracion, nivel = excluded.nivel,
         objetivo = excluded.objetivo, temario = excluded.temario, dirigido_a = excluded.dirigido_a, en_venta = true`,
      [curso.titulo, curso.slug.toUpperCase(), curso.slug, curso.descripcion, curso.categoria, curso.modalidad, admin.id, curso.precio, curso.precioLista, curso.emoji, curso.duracion, curso.nivel, curso.objetivo, JSON.stringify(curso.temario), JSON.stringify(curso.dirigidoA)],
    )
  }
  return cursos.length
}

const columnasPublicas = 'id, slug, codigo, nombre as titulo, descripcion, categoria, modalidad, emoji, duracion, nivel, precio, precio_lista as "precioLista", objetivo, temario, dirigido_a as "dirigidoA"'
export const shop = Router()

shop.get('/cursos', async (_request, response) => {
  const { rows } = await query(`select ${columnasPublicas} from cursos where en_venta and estado = 'publicado' order by categoria, nombre`)
  response.setHeader('Cache-Control', 'public, max-age=60')
  response.json({ cursos: rows })
})

shop.get('/cursos/:slug', async (request, response) => {
  const { rows } = await query(`select ${columnasPublicas} from cursos where en_venta and estado = 'publicado' and slug = $1`, [String(request.params.slug)])
  if (!rows[0]) { response.status(404).json({ error: 'Curso no encontrado.' }); return }
  response.json({ curso: rows[0] })
})

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

shop.post('/pagar', async (request, response) => {
  const body = request.body || {}
  const nombreCompleto = String(body.nombre_completo || '').trim().slice(0, 120)
  const correo = String(body.correo || '').trim().toLowerCase().slice(0, 200)
  const telefono = String(body.telefono || '').trim().slice(0, 40) || null
  const contrasena = String(body.contrasena || '')
  const slugs: string[] = [...new Set<string>((Array.isArray(body.items) ? body.items : []).map((item: unknown) => String(item)))].slice(0, 20)
  if (!rateLimit(`pagar:${request.ip}`, 10, 15 * 60_000)) { response.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' }); return }
  if (nombreCompleto.length < 3) { response.status(400).json({ error: 'Escribe tu nombre completo.' }); return }
  if (!emailPattern.test(correo)) { response.status(400).json({ error: 'Escribe un correo válido.' }); return }
  if (!slugs.length) { response.status(400).json({ error: 'Tu carrito está vacío.' }); return }
  if (!allowSimulated) { response.status(503).json({ error: 'El pago en línea aún no está habilitado. Contáctanos para inscribirte.' }); return }

  // Los precios salen siempre de la base de datos, nunca del navegador.
  const cursos = (await query(`select id, slug, nombre, precio from cursos where en_venta and estado = 'publicado' and slug = any($1)`, [slugs])).rows
  if (cursos.length !== slugs.length) { response.status(400).json({ error: 'Alguno de los cursos ya no está disponible.' }); return }

  const client = await pool.connect()
  try {
    await client.query('begin')
    let usuarioId: string
    const existente = (await client.query('select u.id, u.contrasena_hash, p.rol from usuarios u join perfiles p on p.id = u.id where lower(u.correo) = $1', [correo])).rows[0]
    if (existente) {
      // Una cuenta existente solo se usa si el comprador demuestra que es suya.
      if (existente.rol !== 'participante' || !contrasena || !(await verifyPassword(contrasena, existente.contrasena_hash))) {
        await client.query('rollback')
        response.status(409).json({ error: 'Ya existe una cuenta con ese correo. Escribe su contraseña para continuar con la compra.', code: 'cuenta_existente' })
        return
      }
      usuarioId = existente.id
    } else {
      const debil = passwordProblem(contrasena)
      if (debil) { await client.query('rollback'); response.status(400).json({ error: debil, code: 'contrasena_debil' }); return }
      usuarioId = (await client.query('insert into usuarios (correo, contrasena_hash) values ($1, $2) returning id', [correo, await hashPassword(contrasena)])).rows[0].id
      await client.query(`insert into perfiles (id, nombre_completo, rol, telefono) values ($1, $2, 'participante', $3)`, [usuarioId, nombreCompleto, telefono])
    }

    const total = cursos.reduce((suma, curso) => suma + Number(curso.precio), 0)
    const pedido = (await client.query(
      `insert into pedidos (usuario_id, nombre_completo, correo, telefono, total, estado, metodo_pago, pagado_en) values ($1,$2,$3,$4,$5,'pagado','simulado', now()) returning id`,
      [usuarioId, nombreCompleto, correo, telefono, total],
    )).rows[0]
    for (const curso of cursos) {
      await client.query('insert into pedido_items (pedido_id, curso_id, precio) values ($1,$2,$3)', [pedido.id, curso.id, curso.precio])
      await client.query(
        `insert into matriculas (curso_id, participante_id) select $1, $2 where not exists (select 1 from matriculas where curso_id = $1 and participante_id = $2)`,
        [curso.id, usuarioId],
      )
    }
    await client.query('commit')
    response.status(201).json({
      pedido_id: pedido.id, total, simulado: true, access_token: signToken(usuarioId),
      cursos: cursos.map(curso => ({ slug: curso.slug, codigo: String(curso.slug).toUpperCase(), nombre: curso.nombre })),
    })
  } catch (error) {
    await client.query('rollback').catch(() => {})
    throw error
  } finally { client.release() }
})
