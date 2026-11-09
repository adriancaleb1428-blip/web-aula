import { Bell, Check, CheckCheck, CirclePlay, FileText, MessagesSquare, Trash2, Users, Video } from 'lucide-react'
import { backend } from '../lib/backend'
import { limaTime } from '../lib/format'
import type { NotificationItem } from '../lib/types'
import { EmptyState, SectionHeader } from '../components/ui'
import { useAula } from '../context/AulaContext'

/** Avisos del usuario (o historial general para administración). */
export function NotificationsPage() {
  const { session, role, courses, materials, notifications, setNotifications, unreadNotifications, adminUsers, navigate, openCourse, setOpenThreadId, pushToast } = useAula()

  async function openNotification(notification: NotificationItem) {
    if (role !== 'admin') void markNotificationRead(notification)
    if (notification.resource_type === 'conversation' && notification.resource_id && role !== 'admin') { setOpenThreadId(notification.resource_id); navigate('Mensajes'); return }
    if (notification.resource_type === 'course') {
      const course = courses.find(item => item.id === notification.resource_id)
      if (course) { openCourse(course); return }
      navigate('Mis cursos'); return
    }
    if (notification.resource_type === 'material' && backend && notification.resource_id) {
      const known = materials.find(item => item.id === notification.resource_id)
      const courseId = known?.course_id || (await backend.from('materials').select('course_id').eq('id', notification.resource_id).maybeSingle()).data?.course_id
      const course = courses.find(item => item.id === courseId)
      if (course) { openCourse(course); return }
      pushToast('Ese material ya no está disponible.'); navigate('Mis cursos'); return
    }
    navigate('Reuniones')
    if (notification.resource_type === 'recording') window.setTimeout(() => document.getElementById('grabaciones')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350)
  }

  async function markNotificationRead(notification: NotificationItem) {
    if (!backend || notification.read_at) return
    const readAt = new Date().toISOString()
    setNotifications(current => current.map(item => item.id === notification.id ? { ...item, read_at: readAt } : item))
    const { error } = await backend.from('notifications').update({ read_at: readAt }).eq('id', notification.id).eq('user_id', session.user.id)
    if (error) setNotifications(current => current.map(item => item.id === notification.id ? { ...item, read_at: null } : item))
  }
  async function markAllNotificationsRead() {
    if (!backend) return
    const readAt = new Date().toISOString()
    setNotifications(current => current.map(item => item.read_at ? item : { ...item, read_at: readAt }))
    const { error } = await backend.from('notifications').update({ read_at: readAt }).eq('user_id', session.user.id).is('read_at', null)
    if (error) void backend.from('notifications').select('id, user_id, kind, title, body, resource_type, resource_id, read_at, created_at').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(50).then(({ data }) => setNotifications((data || []) as NotificationItem[]))
  }
  async function deleteNotification(notification: NotificationItem) {
    if (!backend || role !== 'admin' || !window.confirm(`¿Eliminar el aviso “${notification.title}” del historial?`)) return
    const { error } = await backend.from('notifications').delete().eq('id', notification.id)
    if (error) { pushToast(`No se pudo eliminar el aviso: ${error.message}`); return }
    setNotifications(current => current.filter(item => item.id !== notification.id))
  }

  return <>
        <section className="section-card feature-page notifications-page">
          <SectionHeader icon={Bell} overline={role === 'admin' ? 'HISTORIAL GENERAL DEL AULA' : 'ACTUALIZACIONES DE TUS CURSOS'} title={role === 'admin' ? 'Historial de notificaciones' : 'Notificaciones'}>{role !== 'admin' && unreadNotifications > 0 && <button className="outline-button mark-all-button" onClick={() => void markAllNotificationsRead()}><CheckCheck size={16}/> Marcar todo como leído</button>}</SectionHeader>
          {role === 'admin' && <p className="section-intro">Consulta los últimos 200 avisos publicados y si cada participante ya los vio (✓✓ azul). Toca un aviso para abrir su contenido.</p>}
          {notifications.length ? <div className="notification-list">{notifications.map(item => {
            const recipient = adminUsers.find(user => user.id === item.user_id)
            const seen = item.read_at ? `Visto el ${limaTime(item.read_at, { dateStyle: 'medium', timeStyle: 'short' })}` : 'Aún no lo ha visto'
            return <article className={`notification-card ${item.read_at ? 'is-read' : 'is-unread'}`} key={item.id}>
              <button className="notification-open" onClick={() => void openNotification(item)} aria-label={`Abrir: ${item.title}`}>
                <span className="notification-icon">{item.kind === 'message' ? <MessagesSquare size={19}/> : item.kind === 'course_assigned' || item.kind === 'student_enrolled' ? <Users size={19}/> : item.kind.startsWith('recording') ? <CirclePlay size={19}/> : item.kind.toLowerCase().includes('meeting') || item.kind.toLowerCase().includes('reunion') ? <Video size={19}/> : <FileText size={19}/>}</span>
                <span className="notification-copy"><strong>{item.title}</strong>{role === 'admin' && <small className="notification-recipient">Destinatario: {recipient?.full_name || recipient?.email || 'Usuario del aula'}</small>}{item.body && <span className="notification-body">{item.body}</span>}<time dateTime={item.created_at}>{limaTime(item.created_at, { dateStyle: 'medium', timeStyle: 'short' })}</time></span>
              </button>
              <div className="notification-side">
                <span className={`notification-seen ${item.read_at ? 'is-seen' : ''}`} title={seen}>{item.read_at ? <CheckCheck size={16}/> : <Check size={16}/>}<span>{item.read_at ? 'Visto' : role === 'admin' ? 'No visto' : 'Nuevo'}</span></span>
                {role === 'admin' && <button className="icon-button delete-action" aria-label={`Eliminar aviso ${item.title}`} title="Eliminar del historial" onClick={() => void deleteNotification(item)}><Trash2 size={16}/></button>}
              </div>
            </article>
          })}</div> : <EmptyState title="Todo al día" text={role === 'admin' ? 'Aún no se han generado avisos para el historial.' : 'Aquí aparecerán los nuevos materiales y las clases programadas para tus cursos.'} icon={Bell}/>}
        </section>
  </>
}
