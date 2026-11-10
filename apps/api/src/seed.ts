// Datos iniciales. Sin DATABASE_URL (desarrollo) crea tres cuentas de prueba, una por rol, y el catálogo de venta.
// Con DATABASE_URL (producción) solo crea el administrador indicado en ADMIN_EMAIL / ADMIN_PASSWORD y el catálogo.
import { hashPassword, passwordProblem } from './auth.js'
import type { Rol } from './auth.js'
import { DATABASE_URL } from './config.js'
import { pool } from './db.js'
import { loadCatalog } from './shop.js'

type Cuenta = { correo: string; contrasena: string; nombre: string; rol: Rol; cargo: string }

const env = process.env
export const CUENTAS_DE_PRUEBA: Cuenta[] = [
  { correo: env.TEST_ADMIN_EMAIL || 'admin@proteqlife.test', contrasena: env.TEST_ADMIN_PASSWORD || 'Admin-Aula-2026', nombre: 'Administrador PROTEQLIFE', rol: 'administrador', cargo: 'Coordinación académica' },
  { correo: env.TEST_TEACHER_EMAIL || 'facilitador@proteqlife.test', contrasena: env.TEST_TEACHER_PASSWORD || 'Facilitador-2026', nombre: 'Facilitador de Prueba', rol: 'facilitador', cargo: 'Facilitador' },
  { correo: env.TEST_STUDENT_EMAIL || 'participante@proteqlife.test', contrasena: env.TEST_STUDENT_PASSWORD || 'Participante-2026', nombre: 'Participante de Prueba', rol: 'participante', cargo: 'Participante' },
]

function cuentas(): Cuenta[] {
  if (!DATABASE_URL) return CUENTAS_DE_PRUEBA
  const correo = env.ADMIN_EMAIL, contrasena = env.ADMIN_PASSWORD || ''
  if (!correo) throw new Error('Define ADMIN_EMAIL y ADMIN_PASSWORD para crear el administrador inicial.')
  const debil = passwordProblem(contrasena)
  if (debil) throw new Error(`ADMIN_PASSWORD no es válida: ${debil}`)
  return [{ correo, contrasena, nombre: env.ADMIN_NAME || 'Administrador', rol: 'administrador', cargo: 'Administración' }]
}

export async function seedInitial() {
  const lista = cuentas()
  const client = await pool.connect()
  const ids: Record<string, string> = {}
  try {
    await client.query('begin')
    for (const cuenta of lista) {
      const { rows } = await client.query('insert into usuarios (correo, contrasena_hash) values ($1, $2) returning id', [cuenta.correo.toLowerCase(), await hashPassword(cuenta.contrasena)])
      ids[cuenta.rol] = rows[0].id
      await client.query('insert into perfiles (id, nombre_completo, rol, puede_crear_cursos, empresa, cargo) values ($1,$2,$3,$4,$5,$6)', [rows[0].id, cuenta.nombre, cuenta.rol, cuenta.rol === 'facilitador', 'PROTEQLIFE', cuenta.cargo])
    }
    await client.query('commit')
  } catch (error) { await client.query('rollback'); throw error } finally { client.release() }

  console.log(`[seed] ${await loadCatalog()} cursos del catálogo de venta cargados`)
  // Cuentas de prueba: el facilitador gestiona 3 cursos y el participante ya está matriculado en uno.
  if (ids.facilitador) {
    await pool.query(`insert into curso_facilitadores (curso_id, facilitador_id, puede_gestionar) select id, $1, true from cursos where slug in ('iperc','ats','epps')`, [ids.facilitador])
  }
  if (ids.participante) {
    await pool.query(`insert into matriculas (curso_id, participante_id) select id, $1 from cursos where slug = 'iperc'`, [ids.participante])
  }
  console.log(`[seed] cuentas creadas: ${lista.map(cuenta => cuenta.correo).join(', ')}`)
}
