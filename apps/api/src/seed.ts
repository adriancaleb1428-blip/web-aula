// Datos iniciales. Sin DATABASE_URL (desarrollo) crea tres cuentas de prueba, una por rol, y el catálogo de venta.
// Con DATABASE_URL (producción) solo crea el administrador indicado en ADMIN_EMAIL / ADMIN_PASSWORD y el catálogo.
import { hashPassword, passwordProblem } from './auth.js'
import { DATABASE_URL } from './config.js'
import { pool } from './db.js'
import { loadCatalog } from './shop.js'

type Account = { email: string; password: string; name: string; role: 'admin' | 'teacher' | 'student'; title: string }

const env = process.env
export const TEST_ACCOUNTS: Account[] = [
  { email: env.TEST_ADMIN_EMAIL || 'admin@proteqlife.test', password: env.TEST_ADMIN_PASSWORD || 'Admin-Aula-2026', name: 'Administrador PROTEQLIFE', role: 'admin', title: 'Coordinación académica' },
  { email: env.TEST_TEACHER_EMAIL || 'facilitador@proteqlife.test', password: env.TEST_TEACHER_PASSWORD || 'Facilitador-2026', name: 'Facilitador de Prueba', role: 'teacher', title: 'Facilitador' },
  { email: env.TEST_STUDENT_EMAIL || 'participante@proteqlife.test', password: env.TEST_STUDENT_PASSWORD || 'Participante-2026', name: 'Participante de Prueba', role: 'student', title: 'Participante' },
]

function accounts(): Account[] {
  if (!DATABASE_URL) return TEST_ACCOUNTS
  const email = env.ADMIN_EMAIL, password = env.ADMIN_PASSWORD || ''
  if (!email) throw new Error('Define ADMIN_EMAIL y ADMIN_PASSWORD para crear el administrador inicial.')
  const weak = passwordProblem(password)
  if (weak) throw new Error(`ADMIN_PASSWORD no es válida: ${weak}`)
  return [{ email, password, name: env.ADMIN_NAME || 'Administrador', role: 'admin', title: 'Administración' }]
}

export async function seedInitial() {
  const list = accounts()
  const client = await pool.connect()
  const ids: Record<string, string> = {}
  try {
    await client.query('begin')
    for (const account of list) {
      const { rows } = await client.query('insert into users (email, password_hash) values ($1, $2) returning id', [account.email.toLowerCase(), await hashPassword(account.password)])
      ids[account.role] = rows[0].id
      await client.query('insert into profiles (id, full_name, role, can_create_courses, company, job_title) values ($1,$2,$3,$4,$5,$6)', [rows[0].id, account.name, account.role, account.role === 'teacher', 'PROTEQLIFE', account.title])
    }
    await client.query('commit')
  } catch (error) { await client.query('rollback'); throw error } finally { client.release() }

  console.log(`[seed] ${await loadCatalog()} cursos del catálogo de venta cargados`)
  // Cuentas de prueba: el facilitador gestiona 3 cursos y el participante ya está matriculado en uno.
  if (ids.teacher) {
    await pool.query(`insert into course_instructors (course_id, instructor_id, can_manage) select id, $1, true from courses where slug in ('iperc','ats','epps')`, [ids.teacher])
  }
  if (ids.student) {
    await pool.query(`insert into enrollments (course_id, student_id) select id, $1 from courses where slug = 'iperc'`, [ids.student])
  }
  console.log(`[seed] cuentas creadas: ${list.map(account => account.email).join(', ')}`)
}
