import { useEffect, useState } from 'react'
import type { Session } from '../lib/types'
import { backend } from '../lib/backend'
import type { Certificate, Course, Material, Meeting, NotificationItem, Recording, Role } from '../lib/types'
import { useFlash } from './useFlash'

/** Carga cursos, materiales, reuniones, grabaciones, certificados y avisos del usuario. */
export function useClassroomData(session: Session, role: Role, courseRefresh: number, pushToast: (message: string) => void) {
  const [courses, setCourses] = useState<Course[]>([])
  const [coursesReady, setCoursesReady] = useState(false)
  const [courseCount, setCourseCount] = useState(0)
  const [loadError, setLoadError] = useState('')
  const [materials, setMaterials] = useState<Material[]>([])
  const [materialsLoadedFor, setMaterialsLoadedFor] = useState<string | null>(null)
  const [, setMaterialsError] = useFlash(pushToast)
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [meetingsLoadedFor, setMeetingsLoadedFor] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [notificationsReady, setNotificationsReady] = useState(false)
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [recordingsLoadedFor, setRecordingsLoadedFor] = useState<string | null>(null)
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [certificatesLoadedFor, setCertificatesLoadedFor] = useState<string | null>(null)

  useEffect(() => {
    if (!backend) return
    let alive = true
    setCoursesReady(false)
    async function loadCourses() {
      try {
        let ids: string[] | null = null
        if (role === 'student') {
          const { data, error } = await backend!.from('enrollments').select('course_id').eq('student_id', session.user.id).eq('status', 'active')
          if (error) { if (alive) setLoadError(error.message); return }
          ids = (data || []).map((row: { course_id: string }) => row.course_id)
        }
        let query = backend!.from('courses').select('id, name, code, description, cover_url, status, created_by, category, academic_period, modality, starts_on, ends_on', { count: 'exact' }).eq('status', 'published').order('name')
        if (ids) query = query.in('id', ids)
        const { data, count, error } = await query
        if (!alive) return
        if (error) setLoadError(error.message); else { setCourses((data || []) as Course[]); setCourseCount(count || 0) }
      } finally { if (alive) setCoursesReady(true) }
    }
    void loadCourses()
    return () => { alive = false }
  }, [session.user.id, role, courseRefresh])

  const courseIds = courses.map(course => course.id).join(',')

  async function refreshMaterials() {
    if (!backend || !courseIds) { setMaterials([]); return }
    const { data, error } = await backend.from('materials').select('id, course_id, module_id, title, description, storage_path, mime_type, created_at').in('course_id', courseIds.split(',')).eq('is_published', true).order('created_at')
    if (error) { setMaterialsError('No pudimos cargar los materiales. Intenta actualizar la página.'); return }
    setMaterialsError(''); setMaterials((data || []) as Material[])
  }
  async function refreshMeetings() {
    if (!backend || !courseIds) { setMeetings([]); return }
    const { data } = await backend.from('meetings').select('id, course_id, title, description, starts_at, ends_at, room_name, meeting_url, status').in('course_id', courseIds.split(',')).eq('status', 'scheduled').order('starts_at')
    setMeetings((data || []) as Meeting[])
  }

  useEffect(() => {
    if (!backend || !courseIds) { setMaterials([]); setMaterialsLoadedFor(courseIds); return }
    let alive = true
    setMaterialsLoadedFor(null); setMaterialsError('')
    backend.from('materials').select('id, course_id, module_id, title, description, storage_path, mime_type, created_at').in('course_id', courseIds.split(',')).eq('is_published', true).order('created_at').then(({ data, error }) => {
      if (!alive) return
      if (error) { setMaterialsError('No pudimos cargar los materiales. Intenta actualizar la página.'); setMaterials([]) }
      else setMaterials((data || []) as Material[])
      setMaterialsLoadedFor(courseIds)
    })
    return () => { alive = false }
  }, [courseIds])

  useEffect(() => {
    if (!backend || !courseIds) { setMeetings([]); setMeetingsLoadedFor(courseIds); return }
    let alive = true
    setMeetingsLoadedFor(null)
    backend.from('meetings').select('id, course_id, title, description, starts_at, ends_at, room_name, meeting_url, status').in('course_id', courseIds.split(',')).eq('status', 'scheduled').order('starts_at').then(({ data }) => { if (alive) { setMeetings((data || []) as Meeting[]); setMeetingsLoadedFor(courseIds) } })
    return () => { alive = false }
  }, [courseIds, courseRefresh])


  useEffect(() => {
    if (!backend || !courseIds) { setRecordings([]); setCertificates([]); setRecordingsLoadedFor(courseIds); setCertificatesLoadedFor(courseIds); return }
    let alive = true
    setRecordingsLoadedFor(null); setCertificatesLoadedFor(null)
    backend.from('course_recordings').select('id, course_id, title, description, storage_path, mime_type, created_at').in('course_id', courseIds.split(',')).eq('is_published', true).order('created_at', { ascending: false }).then(({ data }) => { if (alive) { setRecordings((data || []) as Recording[]); setRecordingsLoadedFor(courseIds) } })
    backend.from('course_certificates').select('id, course_id, title, certificate_number, storage_path, issued_at').in('course_id', courseIds.split(',')).order('issued_at', { ascending: false }).then(({ data }) => { if (alive) { setCertificates((data || []) as Certificate[]); setCertificatesLoadedFor(courseIds) } })
    return () => { alive = false }
  }, [courseIds, courseRefresh])

  useEffect(() => {
    if (!backend) return
    let alive = true
    const refreshNotifications = async () => {
      let query = backend!.from('notifications').select('id, user_id, kind, title, body, resource_type, resource_id, read_at, created_at').order('created_at', { ascending: false }).limit(role === 'admin' ? 200 : 50)
      if (role !== 'admin') query = query.eq('user_id', session.user.id)
      const { data } = await query
      if (alive) { setNotifications((data || []) as NotificationItem[]); setNotificationsReady(true) }
    }
    void refreshNotifications()
    const changes = { event: '*', schema: 'public', table: 'notifications', ...(role === 'admin' ? {} : { filter: `user_id=eq.${session.user.id}` }) } as const
    const channel = backend.channel(`notifications:${role === 'admin' ? 'admin' : session.user.id}`).on('postgres_changes', changes, () => void refreshNotifications()).subscribe()
    return () => { alive = false; void backend!.removeChannel(channel) }
  }, [session.user.id, role])

  const ready = coursesReady && materialsLoadedFor === courseIds && meetingsLoadedFor === courseIds && recordingsLoadedFor === courseIds && certificatesLoadedFor === courseIds && notificationsReady
  return { courses, setCourses, coursesReady, courseCount, setCourseCount, loadError, courseIds, materials, setMaterials, setMaterialsError, refreshMaterials, meetings, setMeetings, refreshMeetings, notifications, setNotifications, recordings, setRecordings, certificates, setCertificates, ready }
}
