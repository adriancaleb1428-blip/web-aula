export type Role = 'administrador' | 'facilitador' | 'participante'
export type Profile = { nombre_completo: string | null; rol: Role; puede_crear_cursos?: boolean; foto_url?: string | null; telefono?: string | null; empresa?: string | null; cargo?: string | null; biografia?: string | null; creado_en?: string }
export type Course = { id: string; nombre: string; codigo: string; descripcion: string | null; portada_url: string | null; estado: string; creado_por: string; categoria: string | null; periodo_academico: string | null; modalidad: string; inicia_el: string | null; termina_el: string | null }
export type Material = { id: string; curso_id: string; modulo_id?: string | null; titulo: string; descripcion: string | null; ruta_archivo: string; tipo_mime: string | null; creado_en: string }
export type CourseModule = { id: string; curso_id: string; titulo: string; descripcion: string | null; posicion: number; publicado: boolean }
export type CourseLesson = { id: string; modulo_id: string; titulo: string; contenido: string | null; posicion: number; publicado: boolean }
export type Meeting = { id: string; curso_id: string; titulo: string; descripcion: string | null; inicia_en: string; termina_en: string; sala: string; enlace_reunion?: string | null; estado: string }
export type AdminUser = { id: string; correo: string; nombre_completo: string; rol: Role; telefono?: string | null; empresa?: string | null; cargo?: string | null; ultimo_acceso_en?: string | null; creado_en: string }
export type Recording = { id: string; curso_id: string; titulo: string; descripcion: string | null; ruta_archivo: string; tipo_mime: string | null; creado_en: string }
export type Certificate = { id: string; curso_id: string; titulo: string; numero_certificado: string | null; ruta_archivo: string; emitido_en: string }
export type StudentProfile = { id: string; nombre_completo: string | null }
export type NotificationItem = { id: string; usuario_id: string; tipo: string; titulo: string; detalle: string | null; recurso_tipo: string | null; recurso_id: string | null; leido_en: string | null; creado_en: string }

export const roleNames: Record<Role, string> = { administrador: 'Administrador', facilitador: 'Facilitador', participante: 'Participante' }
export const modalityNames: Record<string, string> = { virtual: 'Virtual', presencial: 'Presencial', hibrido: 'Híbrido' }
export const PROFILE_FIELDS = 'nombre_completo, rol, puede_crear_cursos, foto_url, telefono, empresa, cargo, biografia, creado_en'
export type { Session } from './api/client'
