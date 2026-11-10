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
        if (role === 'participante') {
          const { data, error } = await backend!.from('matriculas').select('curso_id').eq('participante_id', session.user.id).eq('estado', 'activa')
          if (error) { if (alive) setLoadError(error.message); return }
          ids = (data || []).map((row: { curso_id: string }) => row.curso_id)
        }
        let query = backend!.from('cursos').select('id, nombre, codigo, descripcion, portada_url, estado, creado_por, categoria, periodo_academico, modalidad, inicia_el, termina_el', { count: 'exact' }).eq('estado', 'publicado').order('nombre')
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
    const { data, error } = await backend.from('materiales').select('id, curso_id, modulo_id, titulo, descripcion, ruta_archivo, tipo_mime, creado_en').in('curso_id', courseIds.split(',')).eq('publicado', true).order('creado_en')
    if (error) { setMaterialsError('No pudimos cargar los materiales. Intenta actualizar la página.'); return }
    setMaterialsError(''); setMaterials((data || []) as Material[])
  }
  async function refreshMeetings() {
    if (!backend || !courseIds) { setMeetings([]); return }
    const { data } = await backend.from('reuniones').select('id, curso_id, titulo, descripcion, inicia_en, termina_en, sala, enlace_reunion, estado').in('curso_id', courseIds.split(',')).eq('estado', 'programada').order('inicia_en')
    setMeetings((data || []) as Meeting[])
  }

  useEffect(() => {
    if (!backend || !courseIds) { setMaterials([]); setMaterialsLoadedFor(courseIds); return }
    let alive = true
    setMaterialsLoadedFor(null); setMaterialsError('')
    backend.from('materiales').select('id, curso_id, modulo_id, titulo, descripcion, ruta_archivo, tipo_mime, creado_en').in('curso_id', courseIds.split(',')).eq('publicado', true).order('creado_en').then(({ data, error }) => {
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
    backend.from('reuniones').select('id, curso_id, titulo, descripcion, inicia_en, termina_en, sala, enlace_reunion, estado').in('curso_id', courseIds.split(',')).eq('estado', 'programada').order('inicia_en').then(({ data }) => { if (alive) { setMeetings((data || []) as Meeting[]); setMeetingsLoadedFor(courseIds) } })
    return () => { alive = false }
  }, [courseIds, courseRefresh])


  useEffect(() => {
    if (!backend || !courseIds) { setRecordings([]); setCertificates([]); setRecordingsLoadedFor(courseIds); setCertificatesLoadedFor(courseIds); return }
    let alive = true
    setRecordingsLoadedFor(null); setCertificatesLoadedFor(null)
    backend.from('curso_grabaciones').select('id, curso_id, titulo, descripcion, ruta_archivo, tipo_mime, creado_en').in('curso_id', courseIds.split(',')).eq('publicado', true).order('creado_en', { ascending: false }).then(({ data }) => { if (alive) { setRecordings((data || []) as Recording[]); setRecordingsLoadedFor(courseIds) } })
    backend.from('curso_certificados').select('id, curso_id, titulo, numero_certificado, ruta_archivo, emitido_en').in('curso_id', courseIds.split(',')).order('emitido_en', { ascending: false }).then(({ data }) => { if (alive) { setCertificates((data || []) as Certificate[]); setCertificatesLoadedFor(courseIds) } })
    return () => { alive = false }
  }, [courseIds, courseRefresh])

  useEffect(() => {
    if (!backend) return
    let alive = true
    const refreshNotifications = async () => {
      let query = backend!.from('notificaciones').select('id, usuario_id, tipo, titulo, contenido, recurso_tipo, recurso_id, leido_en, creado_en').order('creado_en', { ascending: false }).limit(role === 'administrador' ? 200 : 50)
      if (role !== 'administrador') query = query.eq('usuario_id', session.user.id)
      const { data } = await query
      if (alive) { setNotifications((data || []) as NotificationItem[]); setNotificationsReady(true) }
    }
    void refreshNotifications()
    const changes = { event: '*', schema: 'public', table: 'notificaciones', ...(role === 'administrador' ? {} : { filter: `usuario_id=eq.${session.user.id}` }) } as const
    const channel = backend.channel(`notifications:${role === 'administrador' ? 'administrador' : session.user.id}`).on('postgres_changes', changes, () => void refreshNotifications()).subscribe()
    return () => { alive = false; void backend!.removeChannel(channel) }
  }, [session.user.id, role])

  const ready = coursesReady && materialsLoadedFor === courseIds && meetingsLoadedFor === courseIds && recordingsLoadedFor === courseIds && certificatesLoadedFor === courseIds && notificationsReady
  return { courses, setCourses, coursesReady, courseCount, setCourseCount, loadError, courseIds, materials, setMaterials, setMaterialsError, refreshMaterials, meetings, setMeetings, refreshMeetings, notifications, setNotifications, recordings, setRecordings, certificates, setCertificates, ready }
}
