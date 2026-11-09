import { createContext, useContext } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { Session } from '../lib/types'
import type { PreviewFile } from '../components/FilePreview'
import type { AdminUser, Certificate, Course, Material, Meeting, NotificationItem, Profile, Recording, Role } from '../lib/types'

export type Page = 'Inicio' | 'Mis cursos' | 'Reuniones' | 'Mensajes' | 'Certificaciones' | 'Notificaciones' | 'Administración' | 'Perfil' | 'Curso'
type Setter<T> = Dispatch<SetStateAction<T>>

/** Estado compartido de la sesión activa del aula: quién es el usuario y los datos que cargó. */
export type Aula = {
  session: Session; profile: Profile; role: Role; canManageContent: boolean; canCreateCourse: boolean
  onProfileChange: (profile: Profile) => void
  courses: Course[]; setCourses: Setter<Course[]>; setCourseCount: Setter<number>; courseCount: number; courseName: (id: string) => string
  materials: Material[]; setMaterials: Setter<Material[]>; setMaterialsError: (message: string) => void; refreshMaterials: () => Promise<void>
  meetings: Meeting[]; setMeetings: Setter<Meeting[]>; refreshMeetings: () => Promise<void>
  recordings: Recording[]; setRecordings: Setter<Recording[]>
  certificates: Certificate[]; setCertificates: Setter<Certificate[]>
  notifications: NotificationItem[]; setNotifications: Setter<NotificationItem[]>; unreadNotifications: number
  adminUsers: AdminUser[]; setAdminUsers: Setter<AdminUser[]>; setAdminMessage: (message: string) => void; adminBusy: boolean; setAdminBusy: (busy: boolean) => void; refreshAdminUsers: () => Promise<void>
  selectedCourseId: string; bumpCourses: () => void; courseRefresh: number
  navigate: (page: Page) => void; openCourse: (course: Course) => void; setOpenThreadId: (id: string | null) => void
  setPreview: (file: PreviewFile | null) => void; pushToast: (message: string) => void
  sendAcademicNotification: (resourceType: 'material' | 'meeting' | 'recording', resourceId: string) => Promise<void>
  downloadFile: (bucket: string, path: string, title: string, onError: (message: string) => void) => Promise<void>
}

export const AulaContext = createContext<Aula | null>(null)
export function useAula() {
  const value = useContext(AulaContext)
  if (!value) throw new Error('useAula debe usarse dentro del Dashboard.')
  return value
}
