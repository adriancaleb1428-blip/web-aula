// Datos de ejemplo (todo ficticio) para desarrollo y demostraciones. `pnpm db:reset` los vuelve a crear.
import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { hashPassword } from './auth.js'
import { pool } from './db.js'
import { loadCatalog } from './shop.js'
import { filePath } from './storage.js'

export const DEMO_PASSWORD = 'Aula-Demo-2026'

/** PDF mínimo válido de una página. */
function makePdf(title: string, lines: string[]) {
  const clean = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, '').replace(/[\\()]/g, '\\$&')
  const content = ['BT', '/F1 22 Tf', '72 740 Td', `(${clean(title)}) Tj`, '/F1 12 Tf', ...lines.flatMap(line => ['0 -26 Td', `(${clean(line)}) Tj`]), 'ET'].join('\n')
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>', `<< /Length ${content.length} >>\nstream\n${content}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n` })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(pdf)
}
function saveFile(bucket: string, name: string, data: Buffer | string) {
  const target = filePath(bucket, name)
  mkdirSync(path.dirname(target), { recursive: true })
  writeFileSync(target, data)
}

export async function seedDemo() {
  const hash = await hashPassword(DEMO_PASSWORD)
  const id = {
    admin: randomUUID(), t1: randomUUID(), t2: randomUUID(), s1: randomUUID(), s2: randomUUID(), s3: randomUUID(), s4: randomUUID(),
    sst: randomUUID(), cal: randomUUID(), lid: randomUUID(),
  }
  const client = await pool.connect()
  const hoursFromNow = (hours: number) => new Date(Math.ceil(Date.now() / 3600000) * 3600000 + hours * 3600000).toISOString()
  const daysFromToday = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)
  try {
    await client.query('begin')
    const people: [string, string, string, string, string, string][] = [
      [id.admin, 'admin@aula.demo', 'Camila Rojas', 'admin', 'PROTEQLIFE', 'Coordinación académica'],
      [id.t1, 'carlos.mendoza@aula.demo', 'Carlos Mendoza', 'teacher', 'PROTEQLIFE', 'Facilitador de Seguridad y Calidad'],
      [id.t2, 'lucia.paredes@aula.demo', 'Lucía Paredes', 'teacher', 'PROTEQLIFE', 'Facilitadora de Liderazgo'],
      [id.s1, 'ana.torres@aula.demo', 'Ana Torres', 'student', 'Minera Andes SAC', 'Supervisora de seguridad'],
      [id.s2, 'jorge.salas@aula.demo', 'Jorge Salas', 'student', 'Constructora Norte', 'Jefe de obra'],
      [id.s3, 'marta.quispe@aula.demo', 'Marta Quispe', 'student', 'Textiles del Sur', 'Analista de calidad'],
      [id.s4, 'diego.vega@aula.demo', 'Diego Vega', 'student', 'Emprendedor independiente', 'Fundador'],
    ]
    for (const [uid, email, name, role, company, title] of people) {
      await client.query('insert into users (id, email, password_hash) values ($1, $2, $3)', [uid, email, hash])
      await client.query('insert into profiles (id, full_name, role, can_create_courses, company, job_title) values ($1, $2, $3, $4, $5, $6)', [uid, name, role, role === 'teacher', company, title])
    }

    const courses: [string, string, string, string, string, string, string, number, number][] = [
      [id.sst, 'Seguridad y Salud en el Trabajo', 'SST-101', 'Identificación de peligros, evaluación de riesgos (IPERC) y cultura de prevención para equipos de operación.', 'Seguridad Integral', 'online', '2026-II', -14, 45],
      [id.cal, 'Sistema de Gestión de Calidad ISO 9001', 'CAL-201', 'Interpretación de la norma, mapa de procesos, auditoría interna y mejora continua.', 'Sistema Integrado de Gestión', 'hybrid', '2026-II', -7, 60],
      [id.lid, 'Liderazgo para Equipos de Alto Desempeño', 'LID-301', 'Comunicación asertiva, delegación, feedback y gestión de conflictos para líderes y emprendedores.', 'Desarrollo Empresarial y Liderazgo', 'in_person', '2026-II', 3, 70],
    ]
    for (const [cid, name, code, description, category, modality, period, start, end] of courses)
      await client.query(`insert into courses (id, name, code, description, category, modality, academic_period, starts_on, ends_on, status, created_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'published',$10)`, [cid, name, code, description, category, modality, period, daysFromToday(start), daysFromToday(end), id.admin])

    const weeks: Record<string, string[]> = {
      [id.sst]: ['Fundamentos de la prevención', 'Identificación de peligros', 'Evaluación y control de riesgos', 'Plan de respuesta ante emergencias'],
      [id.cal]: ['Contexto de la organización', 'Liderazgo y planificación', 'Operación y control de procesos', 'Auditoría y mejora continua'],
      [id.lid]: ['Autoconocimiento del líder', 'Comunicación asertiva', 'Delegación y seguimiento', 'Feedback y conflictos'],
    }
    const modules: Record<string, string[]> = {}
    for (const [cid, titles] of Object.entries(weeks)) {
      modules[cid] = []
      for (const [index, title] of titles.entries()) {
        const mid = randomUUID(); modules[cid].push(mid)
        await client.query('insert into modules (id, course_id, title, description, position, published) values ($1,$2,$3,$4,$5,true)', [mid, cid, `Semana ${index + 1}: ${title}`, index === 0 ? 'Material introductorio y objetivos del programa.' : null, index])
        if (index < 2) for (const n of [1, 2]) await client.query('insert into lessons (module_id, title, body, position, published) values ($1,$2,$3,$4,true)', [mid, `Lección ${n}`, 'Contenido de la lección: ejemplo para la simulación.', n - 1])
      }
    }

    for (const [cid, instructor] of [[id.sst, id.t1], [id.cal, id.t1], [id.cal, id.t2], [id.lid, id.t2]]) await client.query('insert into course_instructors (course_id, instructor_id, can_manage) values ($1,$2,true)', [cid, instructor])
    for (const [cid, student] of [[id.sst, id.s1], [id.cal, id.s1], [id.sst, id.s2], [id.lid, id.s2], [id.cal, id.s3], [id.lid, id.s3], [id.sst, id.s4]]) await client.query('insert into enrollments (course_id, student_id) values ($1,$2)', [cid, student])

    const materials: [string, string, string, string, string | null, string, string][] = [
      ['Guía de inducción en SST', 'Lectura previa a la primera sesión.', id.sst, modules[id.sst][0], 'guia-induccion-sst.pdf', 'application/pdf', 'pdf'],
      ['Matriz IPERC (instrucciones)', 'Pasos para completar la matriz.', id.sst, modules[id.sst][1], 'instrucciones-iperc.txt', 'text/plain', 'txt'],
      ['Resumen de requisitos ISO 9001', null as unknown as string, id.cal, modules[id.cal][0], 'resumen-iso-9001.pdf', 'application/pdf', 'pdf'],
      ['Autoevaluación de liderazgo', 'Cuestionario para llenar antes del inicio.', id.lid, null as unknown as string, 'autoevaluacion-liderazgo.txt', 'text/plain', 'txt'],
    ]
    for (const [title, description, cid, mid, file, mime, kind] of materials) {
      const storagePath = `${cid}/${randomUUID()}-${file}`
      await client.query('insert into materials (course_id, module_id, title, description, storage_path, mime_type, uploaded_by, is_published) values ($1,$2,$3,$4,$5,$6,$7,true)', [cid, mid, title, description, storagePath, mime, id.t1])
      saveFile('course-materials', storagePath, kind === 'pdf' ? makePdf(title, ['Documento de ejemplo.', 'Reemplázalo subiendo tus propios materiales.', 'Aula Consulting · PROTEQLIFE']) : `${title}\n\nTexto de ejemplo.\n1. Revisa el objetivo.\n2. Completa el ejercicio.\n3. Comparte tus dudas por Mensajes.\n`)
    }

    const meetings: [string, string | null, null, string, number, number, string][] = [
      ['Sesión 3: Matriz IPERC en la práctica', 'Trabajaremos un caso real de planta.', null, id.sst, 24, 25.5, 'https://meet.google.com/demo-sst-iperc'],
      ['Taller: mapa de procesos', null, null, id.cal, 72, 74, 'https://meet.google.com/demo-cal-procesos'],
      ['Bienvenida al programa de liderazgo', 'Presentación de objetivos y dinámica.', null, id.lid, -26, -24, 'https://meet.google.com/demo-lid-bienvenida'],
    ]
    for (const [title, description, , cid, start, end, url] of meetings) await client.query('insert into meetings (course_id, title, description, starts_at, ends_at, organizer_id, meeting_url) values ($1,$2,$3,$4,$5,$6,$7)', [cid, title, description, hoursFromNow(start), hoursFromNow(end), id.t1, url])

    const certificatePath = `${id.sst}/${id.s1}/${randomUUID()}-certificado-sst.pdf`
    await client.query(`insert into course_certificates (course_id, student_id, title, certificate_number, storage_path, issued_by) values ($1,$2,'Certificado de aprobación · Seguridad y Salud en el Trabajo','PQL-2026-0001',$3,$4)`, [id.sst, id.s1, certificatePath, id.admin])
    saveFile('course-certificates', certificatePath, makePdf('Certificado de aprobacion', ['Se certifica que Ana Torres aprobo el curso', 'Seguridad y Salud en el Trabajo (SST-101).', 'Numero: PQL-2026-0001', 'Documento de ejemplo.']))

    await client.query(`insert into support_requests (full_name, email, topic, message) values ('Visitante Demo','visitante@ejemplo.com','acceso','No recuerdo mi contraseña de acceso al aula, ¿pueden ayudarme?')`)

    const thread = (await client.query('insert into course_threads (course_id, student_id, teacher_id) values ($1,$2,$3) returning id', [id.sst, id.s1, id.t1])).rows[0].id
    await client.query(`insert into thread_messages (conversation_id, sender_id, body, read_at, created_at) values ($1,$2,'Profesor, ¿puedo usar la matriz de mi planta para el ejercicio?', now() - interval '6 hours', now() - interval '8 hours')`, [thread, id.s1])
    await client.query(`insert into thread_messages (conversation_id, sender_id, body, created_at) values ($1,$2,'Claro, te comparto el formato en el material de la semana 2.', now() - interval '2 hours')`, [thread, id.t1])
    // Los avisos de la carga inicial se consideran ya vistos, salvo el del mensaje nuevo y la reunión de mañana.
    await client.query(`update notifications set read_at = now() - interval '1 day' where kind in ('material', 'material_published', 'course_assigned', 'student_enrolled', 'meeting_scheduled', 'certificate') or (kind = 'meeting' and title like '%liderazgo%')`)
    await client.query('commit')
    console.log(`[seed] ${await loadCatalog()} cursos del catálogo de venta cargados`)
    console.log(`[seed] datos de ejemplo creados (contraseña de las cuentas demo: ${DEMO_PASSWORD})`)
  } catch (error) { await client.query('rollback'); throw error } finally { client.release() }
}
