// Tienda de cursos: catálogo público y compra. Al pagar se crea (o se reutiliza) la cuenta del alumno y se
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

type CatalogCourse = {
  slug: string; title: string; description: string; emoji: string; category: string; duration: string; modality: string; level: string
  price: number; listPrice: number | null; objective: string; syllabus: string[]; audience: string[]
}

/** Carga (o actualiza) el catálogo de venta desde data/catalog.json. Necesita al menos un administrador. */
export async function loadCatalog() {
  const items: CatalogCourse[] = JSON.parse(readFileSync(path.join(ROOT, 'data', 'catalog.json'), 'utf8'))
  const admin = (await query("select id from profiles where role = 'admin' order by created_at limit 1")).rows[0]
  if (!admin) throw new Error('Crea primero un administrador para cargar el catálogo.')
  for (const course of items) {
    await query(
      `insert into courses (name, code, slug, description, category, modality, status, created_by, price, list_price, emoji, duration, level, objective, syllabus, audience, for_sale)
       values ($1,$2,$3,$4,$5,$6,'published',$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::jsonb,true)
       on conflict (slug) do update set name = excluded.name, description = excluded.description, category = excluded.category, modality = excluded.modality,
         price = excluded.price, list_price = excluded.list_price, emoji = excluded.emoji, duration = excluded.duration, level = excluded.level,
         objective = excluded.objective, syllabus = excluded.syllabus, audience = excluded.audience, for_sale = true`,
      [course.title, course.slug.toUpperCase(), course.slug, course.description, course.category, course.modality, admin.id, course.price, course.listPrice, course.emoji, course.duration, course.level, course.objective, JSON.stringify(course.syllabus), JSON.stringify(course.audience)],
    )
  }
  return items.length
}

const publicColumns = 'id, slug, code, name as title, description, category, modality, emoji, duration, level, price, list_price as "listPrice", objective, syllabus, audience'
export const shop = Router()

shop.get('/courses', async (_request, response) => {
  const { rows } = await query(`select ${publicColumns} from courses where for_sale and status = 'published' order by category, name`)
  response.setHeader('Cache-Control', 'public, max-age=60')
  response.json({ courses: rows })
})

shop.get('/courses/:slug', async (request, response) => {
  const { rows } = await query(`select ${publicColumns} from courses where for_sale and status = 'published' and slug = $1`, [String(request.params.slug)])
  if (!rows[0]) { response.status(404).json({ error: 'Curso no encontrado.' }); return }
  response.json({ course: rows[0] })
})

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

shop.post('/checkout', async (request, response) => {
  const body = request.body || {}
  const fullName = String(body.full_name || '').trim().slice(0, 120)
  const email = String(body.email || '').trim().toLowerCase().slice(0, 200)
  const phone = String(body.phone || '').trim().slice(0, 40) || null
  const password = String(body.password || '')
  const slugs: string[] = [...new Set<string>((Array.isArray(body.items) ? body.items : []).map((item: unknown) => String(item)))].slice(0, 20)
  if (!rateLimit(`checkout:${request.ip}`, 10, 15 * 60_000)) { response.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' }); return }
  if (fullName.length < 3) { response.status(400).json({ error: 'Escribe tu nombre completo.' }); return }
  if (!emailPattern.test(email)) { response.status(400).json({ error: 'Escribe un correo válido.' }); return }
  if (!slugs.length) { response.status(400).json({ error: 'Tu carrito está vacío.' }); return }
  if (!allowSimulated) { response.status(503).json({ error: 'El pago en línea aún no está habilitado. Contáctanos para inscribirte.' }); return }

  // Los precios salen siempre de la base de datos, nunca del navegador.
  const courses = (await query(`select id, slug, name, price from courses where for_sale and status = 'published' and slug = any($1)`, [slugs])).rows
  if (courses.length !== slugs.length) { response.status(400).json({ error: 'Alguno de los cursos ya no está disponible.' }); return }

  const client = await pool.connect()
  try {
    await client.query('begin')
    let userId: string
    const existing = (await client.query('select u.id, u.password_hash, p.role from users u join profiles p on p.id = u.id where lower(u.email) = $1', [email])).rows[0]
    if (existing) {
      // Una cuenta existente solo se usa si el comprador demuestra que es suya.
      if (existing.role !== 'student' || !password || !(await verifyPassword(password, existing.password_hash))) {
        await client.query('rollback')
        response.status(409).json({ error: 'Ya existe una cuenta con ese correo. Escribe su contraseña para continuar con la compra.', code: 'account_exists' })
        return
      }
      userId = existing.id
    } else {
      const weak = passwordProblem(password)
      if (weak) { await client.query('rollback'); response.status(400).json({ error: weak, code: 'weak_password' }); return }
      userId = (await client.query('insert into users (email, password_hash) values ($1, $2) returning id', [email, await hashPassword(password)])).rows[0].id
      await client.query(`insert into profiles (id, full_name, role, phone) values ($1, $2, 'student', $3)`, [userId, fullName, phone])
    }

    const total = courses.reduce((sum, course) => sum + Number(course.price), 0)
    const order = (await client.query(
      `insert into orders (user_id, full_name, email, phone, total, status, payment_method, paid_at) values ($1,$2,$3,$4,$5,'paid','simulated', now()) returning id`,
      [userId, fullName, email, phone, total],
    )).rows[0]
    for (const course of courses) {
      await client.query('insert into order_items (order_id, course_id, price) values ($1,$2,$3)', [order.id, course.id, course.price])
      await client.query(
        `insert into enrollments (course_id, student_id) select $1, $2 where not exists (select 1 from enrollments where course_id = $1 and student_id = $2)`,
        [course.id, userId],
      )
    }
    await client.query('commit')
    response.status(201).json({
      order_id: order.id, total, simulated: true, access_token: signToken(userId),
      courses: courses.map(course => ({ slug: course.slug, code: String(course.slug).toUpperCase(), name: course.name })),
    })
  } catch (error) {
    await client.query('rollback').catch(() => {})
    throw error
  } finally { client.release() }
})
