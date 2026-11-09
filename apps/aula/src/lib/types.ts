export type Role = 'admin' | 'teacher' | 'student'
export type Profile = { full_name: string | null; role: Role; can_create_courses?: boolean; avatar_url?: string | null; phone?: string | null; company?: string | null; job_title?: string | null; bio?: string | null; created_at?: string }
export type Course = { id: string; name: string; code: string; description: string | null; cover_url: string | null; status: string; created_by: string; category: string | null; academic_period: string | null; modality: string; starts_on: string | null; ends_on: string | null }
export type Material = { id: string; course_id: string; module_id?: string | null; title: string; description: string | null; storage_path: string; mime_type: string | null; created_at: string }
export type CourseModule = { id: string; course_id: string; title: string; description: string | null; position: number; published: boolean }
export type CourseLesson = { id: string; module_id: string; title: string; body: string | null; position: number; published: boolean }
export type Meeting = { id: string; course_id: string; title: string; description: string | null; starts_at: string; ends_at: string; room_name: string; meeting_url?: string | null; status: string }
export type AdminUser = { id: string; email: string; full_name: string; role: Role; phone?: string | null; company?: string | null; job_title?: string | null; last_sign_in_at?: string | null; created_at: string }
export type Recording = { id: string; course_id: string; title: string; description: string | null; storage_path: string; mime_type: string | null; created_at: string }
export type Certificate = { id: string; course_id: string; title: string; certificate_number: string | null; storage_path: string; issued_at: string }
export type StudentProfile = { id: string; full_name: string | null }
export type NotificationItem = { id: string; user_id: string; kind: string; title: string; body: string | null; resource_type: string | null; resource_id: string | null; read_at: string | null; created_at: string }

export const roleNames: Record<Role, string> = { admin: 'Administrador', teacher: 'Facilitador', student: 'Participante' }
export const modalityNames: Record<string, string> = { online: 'Virtual', in_person: 'Presencial', hybrid: 'Híbrido' }
export const PROFILE_FIELDS = 'full_name, role, can_create_courses, avatar_url, phone, company, job_title, bio, created_at'
export type { Session } from './api/client'
