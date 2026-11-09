// Datos de ejemplo del modo demo. Todo es ficticio; se regenera con «Restablecer demo».
import { afterSeed, fileKey, makePdf, putFile } from './files'

export type Row = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
export type Tables = Record<string, Row[]>

export const DEMO_PASSWORD = 'Aula-Demo-2026'
export const DEMO_ACCOUNTS = [
  { role: 'Administrador', email: 'admin@aula.demo', hint: 'Gestiona usuarios, cursos y matrículas' },
  { role: 'Facilitador', email: 'carlos.mendoza@aula.demo', hint: 'Sube materiales, reuniones y grabaciones' },
  { role: 'Participante', email: 'ana.torres@aula.demo', hint: 'Ve sus cursos, avisos y certificados' },
] as const

const hours = (now: number, offset: number) => new Date(Math.ceil(now / 3600000) * 3600000 + offset * 3600000).toISOString()
const days = (now: number, offset: number) => new Date(now + offset * 86400000).toISOString()
const date = (now: number, offset: number) => days(now, offset).slice(0, 10)

export function buildSeed(now = Date.now()): Tables {
  const u = { admin: 'u-admin', t1: 'u-teacher-1', t2: 'u-teacher-2', s1: 'u-student-1', s2: 'u-student-2', s3: 'u-student-3', s4: 'u-student-4' }
  const people = [
    { id: u.admin, email: 'admin@aula.demo', full_name: 'Camila Rojas', role: 'admin', company: 'PROTEQLIFE', job_title: 'Coordinación académica', phone: '+51 999 111 000' },
    { id: u.t1, email: 'carlos.mendoza@aula.demo', full_name: 'Carlos Mendoza', role: 'teacher', company: 'PROTEQLIFE', job_title: 'Facilitador de Seguridad y Calidad', phone: '+51 999 222 001' },
    { id: u.t2, email: 'lucia.paredes@aula.demo', full_name: 'Lucía Paredes', role: 'teacher', company: 'PROTEQLIFE', job_title: 'Facilitadora de Liderazgo', phone: '+51 999 222 002' },
    { id: u.s1, email: 'ana.torres@aula.demo', full_name: 'Ana Torres', role: 'student', company: 'Minera Andes SAC', job_title: 'Supervisora de seguridad', phone: '+51 999 333 001' },
    { id: u.s2, email: 'jorge.salas@aula.demo', full_name: 'Jorge Salas', role: 'student', company: 'Constructora Norte', job_title: 'Jefe de obra', phone: '+51 999 333 002' },
    { id: u.s3, email: 'marta.quispe@aula.demo', full_name: 'Marta Quispe', role: 'student', company: 'Textiles del Sur', job_title: 'Analista de calidad', phone: '+51 999 333 003' },
    { id: u.s4, email: 'diego.vega@aula.demo', full_name: 'Diego Vega', role: 'student', company: 'Emprendedor independiente', job_title: 'Fundador', phone: null },
  ]
  const created = days(now, -30)

  const courses = [
    { id: 'c-sst', name: 'Seguridad y Salud en el Trabajo', code: 'SST-101', description: 'Identificación de peligros, evaluación de riesgos (IPERC) y cultura de prevención para equipos de operación.', category: 'Seguridad Integral', academic_period: '2026-II', modality: 'online', starts_on: date(now, -14), ends_on: date(now, 45) },
    { id: 'c-cal', name: 'Sistema de Gestión de Calidad ISO 9001', code: 'CAL-201', description: 'Interpretación de la norma, mapa de procesos, auditoría interna y mejora continua.', category: 'Sistema Integrado de Gestión', academic_period: '2026-II', modality: 'hybrid', starts_on: date(now, -7), ends_on: date(now, 60) },
    { id: 'c-lid', name: 'Liderazgo para Equipos de Alto Desempeño', code: 'LID-301', description: 'Comunicación asertiva, delegación, feedback y gestión de conflictos para líderes y emprendedores.', category: 'Desarrollo Empresarial y Liderazgo', academic_period: '2026-II', modality: 'in_person', starts_on: date(now, 3), ends_on: date(now, 70) },
  ].map(course => ({ ...course, cover_url: null, status: 'published', created_by: u.admin, created_at: created, updated_at: created }))

  const weekTitles: Record<string, string[]> = {
    'c-sst': ['Fundamentos de la prevención', 'Identificación de peligros', 'Evaluación y control de riesgos', 'Plan de respuesta ante emergencias'],
    'c-cal': ['Contexto de la organización', 'Liderazgo y planificación', 'Operación y control de procesos', 'Auditoría y mejora continua'],
    'c-lid': ['Autoconocimiento del líder', 'Comunicación asertiva', 'Delegación y seguimiento', 'Feedback y conflictos'],
  }
  const modules = courses.flatMap(course => weekTitles[course.id].map((title, index) => ({
    id: `m-${course.id.slice(2)}-${index + 1}`, course_id: course.id, title: `Semana ${index + 1}: ${title}`, description: index === 0 ? 'Material introductorio y objetivos del programa.' : null, position: index, published: true, created_at: created,
  })))
  const lessons = modules.filter(module => module.position < 2).flatMap(module => [1, 2].map(n => ({
    id: `l-${module.id}-${n}`, module_id: module.id, title: `Lección ${n}`, body: 'Contenido de la lección: ejemplo para la simulación.', position: n - 1, published: true, created_at: created,
  })))

  const materials = [
    { id: 'mat-1', course_id: 'c-sst', module_id: 'm-sst-1', title: 'Guía de inducción en SST', description: 'Lectura previa a la primera sesión.', file: 'guia-induccion-sst.pdf', mime_type: 'application/pdf' },
    { id: 'mat-2', course_id: 'c-sst', module_id: 'm-sst-2', title: 'Matriz IPERC (instrucciones)', description: 'Pasos para completar la matriz.', file: 'instrucciones-iperc.txt', mime_type: 'text/plain' },
    { id: 'mat-3', course_id: 'c-cal', module_id: 'm-cal-1', title: 'Resumen de requisitos ISO 9001', description: null, file: 'resumen-iso-9001.pdf', mime_type: 'application/pdf' },
    { id: 'mat-4', course_id: 'c-lid', module_id: null, title: 'Autoevaluación de liderazgo', description: 'Cuestionario para llenar antes del inicio.', file: 'autoevaluacion-liderazgo.txt', mime_type: 'text/plain' },
  ].map(({ file, ...material }) => ({ ...material, storage_path: `${material.course_id}/${material.id}-${file}`, uploaded_by: u.t1, is_published: true, created_at: days(now, -10) }))

  const meetings = [
    { id: 'meet-1', course_id: 'c-sst', title: 'Sesión 3: Matriz IPERC en la práctica', description: 'Trabajaremos un caso real de planta.', starts_at: hours(now, 24), ends_at: hours(now, 25.5), meeting_url: 'https://meet.google.com/demo-sst-iperc' },
    { id: 'meet-2', course_id: 'c-cal', title: 'Taller: mapa de procesos', description: null, starts_at: hours(now, 72), ends_at: hours(now, 74), meeting_url: 'https://meet.google.com/demo-cal-procesos' },
    { id: 'meet-3', course_id: 'c-lid', title: 'Bienvenida al programa de liderazgo', description: 'Presentación de objetivos y dinámica.', starts_at: hours(now, -26), ends_at: hours(now, -24), meeting_url: 'https://meet.google.com/demo-lid-bienvenida' },
  ].map(meeting => ({ ...meeting, timezone: 'America/Lima', organizer_id: u.t1, room_name: 'Google Meet', status: 'scheduled', created_at: days(now, -5) }))

  const certificates = [{ id: 'cert-1', course_id: 'c-sst', student_id: u.s1, title: 'Certificado de aprobación · Seguridad y Salud en el Trabajo', certificate_number: 'PQL-2026-0001', storage_path: `c-sst/${u.s1}/cert-1-certificado-sst.pdf`, issued_by: u.admin, issued_at: days(now, -2) }]

  const notifications = [
    { user_id: u.s1, kind: 'meeting', title: 'Nueva reunión: Sesión 3: Matriz IPERC en la práctica', body: 'Seguridad y Salud en el Trabajo', resource_type: 'meeting', resource_id: 'meet-1', read_at: null, created_at: days(now, -1) },
    { user_id: u.s1, kind: 'material', title: 'Nuevo material: Guía de inducción en SST', body: 'Seguridad y Salud en el Trabajo', resource_type: 'material', resource_id: 'mat-1', read_at: days(now, -9), created_at: days(now, -10) },
    { user_id: u.s1, kind: 'message', title: 'Nuevo mensaje de Carlos Mendoza', body: 'Claro, te comparto el formato…', resource_type: 'conversation', resource_id: 'th-1', read_at: null, created_at: days(now, -0.1) },
    { user_id: u.t1, kind: 'message', title: 'Nuevo mensaje de Ana Torres', body: 'Profesor, ¿puedo usar la matriz de mi planta?', resource_type: 'conversation', resource_id: 'th-1', read_at: days(now, -0.2), created_at: days(now, -0.3) },
  ].map((item, index) => ({ id: `n-${index + 1}`, ...item }))

  return {
    auth_users: people.map(({ id, email }) => ({ id, email, password: DEMO_PASSWORD, created_at: created, last_sign_in_at: null })),
    profiles: people.map(({ id, full_name, role, company, job_title, phone }) => ({ id, full_name, role, company, job_title, phone, bio: null, avatar_url: null, can_create_courses: role === 'teacher', timezone: 'America/Lima', created_at: created, updated_at: created })),
    courses, modules, lessons, materials, meetings,
    course_instructors: [['c-sst', u.t1], ['c-cal', u.t1], ['c-cal', u.t2], ['c-lid', u.t2]].map(([course_id, instructor_id]) => ({ course_id, instructor_id, can_manage: true, can_create_courses: false, created_at: created })),
    enrollments: [['c-sst', u.s1], ['c-cal', u.s1], ['c-sst', u.s2], ['c-lid', u.s2], ['c-cal', u.s3], ['c-lid', u.s3], ['c-sst', u.s4]].map(([course_id, student_id], index) => ({ id: `e-${index + 1}`, course_id, student_id, status: 'active', enrolled_at: created })),
    course_recordings: [], course_certificates: certificates, notifications,
    support_requests: [{ id: 'sr-1', user_id: null, full_name: 'Visitante Demo', email: 'visitante@ejemplo.com', phone: null, topic: 'acceso', message: 'No recuerdo mi contraseña de acceso al aula, ¿pueden ayudarme?', status: 'open', email_sent: false, created_at: days(now, -1) }],
    course_threads: [{ id: 'th-1', course_id: 'c-sst', student_id: u.s1, teacher_id: u.t1, created_at: days(now, -1) }],
    thread_messages: [
      { id: 'tm-1', conversation_id: 'th-1', sender_id: u.s1, body: 'Profesor, ¿puedo usar la matriz de mi planta para el ejercicio?', created_at: days(now, -0.3), read_at: days(now, -0.2) },
      { id: 'tm-2', conversation_id: 'th-1', sender_id: u.t1, body: 'Claro, te comparto el formato en el material de la semana 2.', created_at: days(now, -0.1), read_at: null },
    ],
    rate_limits: [],
  }
}

/** Archivos de ejemplo (PDF y texto) que acompañan a los materiales y certificados sembrados. */
export function seedFiles(tables: Tables) {
  const jobs: Promise<unknown>[] = []
  for (const material of tables.materials) {
    const blob = material.mime_type === 'application/pdf'
      ? makePdf(material.title, ['Documento de ejemplo del modo demo.', 'Reemplázalo subiendo tus propios materiales.', 'Aula Consulting · PROTEQLIFE'])
      : new Blob([`${material.title}\n\nTexto de ejemplo del modo demo.\n1. Revisa el objetivo.\n2. Completa el ejercicio.\n3. Comparte tus dudas por Mensajes.\n`], { type: 'text/plain' })
    jobs.push(putFile(fileKey('course-materials', material.storage_path), blob))
  }
  for (const certificate of tables.course_certificates) {
    jobs.push(putFile(fileKey('course-certificates', certificate.storage_path), makePdf('Certificado de aprobacion', ['Se certifica que Ana Torres aprobo el curso', 'Seguridad y Salud en el Trabajo (SST-101).', `Numero: ${certificate.certificate_number}`, 'Documento de ejemplo del modo demo.'])))
  }
  afterSeed(Promise.all(jobs))
}
