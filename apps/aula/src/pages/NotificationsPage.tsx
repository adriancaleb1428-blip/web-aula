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
    if (role !== 'administrador') void markNotificationRead(notification)
    if (notification.recurso_tipo === 'conversacion' && notification.recurso_id && role !== 'administrador') { setOpenThreadId(notification.recurso_id); navigate('Mensajes'); return }
    if (notification.recurso_tipo === 'curso') {
      const course = courses.find(item => item.id === notification.recurso_id)
      if (course) { openCourse(course); return }
      navigate('Mis cursos'); return
    }
    if (notification.recurso_tipo === 'material' && backend && notification.recurso_id) {
      const known = materials.find(item => item.id === notification.recurso_id)
      const courseId = known?.curso_id || (await backend.from('materiales').select('curso_id').eq('id', notification.recurso_id).maybeSingle()).data?.curso_id
      const course = courses.find(item => item.id === courseId)
      if (course) { openCourse(course); return }
      pushToast('Ese material ya no está disponible.'); navigate('Mis cursos'); return
    }
    navigate('Reuniones')
    if (notification.recurso_tipo === 'grabacion') window.setTimeout(() => document.getElementById('grabaciones')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350)
  }

  async function markNotificationRead(notification: NotificationItem) {
    if (!backend || notification.leido_en) return
    const readAt = new Date().toISOString()
    setNotifications(current => current.map(item => item.id === notification.id ? { ...item, leido_en: readAt } : item))
    const { error } = await backend.from('notificaciones').update({ leido_en: readAt }).eq('id', notification.id).eq('usuario_id', session.user.id)
    if (error) setNotifications(current => current.map(item => item.id === notification.id ? { ...item, leido_en: null } : item))
  }
  async function markAllNotificationsRead() {
    if (!backend) return
    const readAt = new Date().toISOString()
    setNotifications(current => current.map(item => item.leido_en ? item : { ...item, leido_en: readAt }))
    const { error } = await backend.from('notificaciones').update({ leido_en: readAt }).eq('usuario_id', session.user.id).is('leido_en', null)
    if (error) void backend.from('notificaciones').select('id, usuario_id, tipo, titulo, contenido, recurso_tipo, recurso_id, leido_en, creado_en').eq('usuario_id', session.user.id).order('creado_en', { ascending: false }).limit(50).then(({ data }) => setNotifications((data || []) as NotificationItem[]))
  }
  async function deleteNotification(notification: NotificationItem) {
    if (!backend || role !== 'administrador' || !window.confirm(`¿Eliminar el aviso “${notification.titulo}” del historial?`)) return
    const { error } = await backend.from('notificaciones').delete().eq('id', notification.id)
    if (error) { pushToast(`No se pudo eliminar el aviso: ${error.message}`); return }
    setNotifications(current => current.filter(item => item.id !== notification.id))
  }

  return <>
        <section className="section-card feature-page notifications-page">
          <SectionHeader icon={Bell} overline={role === 'administrador' ? 'HISTORIAL GENERAL DEL AULA' : 'ACTUALIZACIONES DE TUS CURSOS'} title={role === 'administrador' ? 'Historial de notificaciones' : 'Notificaciones'}>{role !== 'administrador' && unreadNotifications > 0 && <button className="outline-button mark-all-button" onClick={() => void markAllNotificationsRead()}><CheckCheck size={16}/> Marcar todo como leído</button>}</SectionHeader>
          {role === 'administrador' && <p className="section-intro">Consulta los últimos 200 avisos publicados y si cada participante ya los vio (✓✓ azul). Toca un aviso para abrir su contenido.</p>}
          {notifications.length ? <div className="notification-list">{notifications.map(item => {
            const recipient = adminUsers.find(user => user.id === item.usuario_id)
            const seen = item.leido_en ? `Visto el ${limaTime(item.leido_en, { dateStyle: 'medium', timeStyle: 'short' })}` : 'Aún no lo ha visto'
            return <article className={`notification-card ${item.leido_en ? 'is-read' : 'is-unread'}`} key={item.id}>
              <button className="notification-open" onClick={() => void openNotification(item)} aria-label={`Abrir: ${item.titulo}`}>
                <span className="notification-icon">{item.tipo === 'mensaje' ? <MessagesSquare size={19}/> : item.tipo === 'curso_asignado' || item.tipo === 'participante_matriculado' ? <Users size={19}/> : item.tipo.startsWith('grabacion') ? <CirclePlay size={19}/> : item.tipo.toLowerCase().includes('reunion') || item.tipo.toLowerCase().includes('reunion') ? <Video size={19}/> : <FileText size={19}/>}</span>
                <span className="notification-copy"><strong>{item.titulo}</strong>{role === 'administrador' && <small className="notification-recipient">Destinatario: {recipient?.nombre_completo || recipient?.correo || 'Usuario del aula'}</small>}{item.detalle && <span className="notification-body">{item.detalle}</span>}<time dateTime={item.creado_en}>{limaTime(item.creado_en, { dateStyle: 'medium', timeStyle: 'short' })}</time></span>
              </button>
              <div className="notification-side">
                <span className={`notification-seen ${item.leido_en ? 'is-seen' : ''}`} title={seen}>{item.leido_en ? <CheckCheck size={16}/> : <Check size={16}/>}<span>{item.leido_en ? 'Visto' : role === 'administrador' ? 'No visto' : 'Nuevo'}</span></span>
                {role === 'administrador' && <button className="icon-button delete-action" aria-label={`Eliminar aviso ${item.titulo}`} title="Eliminar del historial" onClick={() => void deleteNotification(item)}><Trash2 size={16}/></button>}
              </div>
            </article>
          })}</div> : <EmptyState title="Todo al día" text={role === 'administrador' ? 'Aún no se han generado avisos para el historial.' : 'Aquí aparecerán los nuevos materiales y las clases programadas para tus cursos.'} icon={Bell}/>}
        </section>
  </>
}
