import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from './lib/types'
import { ArrowDown, ArrowRight, Award, Bell, BookOpen, CircleHelp, LayoutDashboard, LogOut, Menu, MessageCircle, MessagesSquare, MoreHorizontal, Settings2, Users, Video } from 'lucide-react'
import { backend } from './lib/backend'
import { EMAIL_NOTICES_ENABLED } from './lib/config'
import { clearPendingCourse, pendingCourse } from './lib/handoff'
import { setIdleLogoutFlag, useIdleLogout } from './lib/idle'
import { roleNames } from './lib/types'
import type { Course, Profile } from './lib/types'
import { BootScreen, Modal, ToastStack, useToasts } from './components/ui'
import { FilePreview, downloadPrivateFile } from './components/FilePreview'
import type { PreviewFile } from './components/FilePreview'
import { InfoModal } from './components/InfoModal'
import type { InfoTopic } from './components/InfoModal'
import { SupportModal } from './components/SupportModal'
import { Messages } from './components/Messages'
import { Avatar, ProfilePage } from './components/ProfilePage'
import { Brand } from './components/Brand'
import { COPYRIGHT } from './config/brand'
import logoOnLight from './assets/aula-logo-horizontal-dark.png'
import { AulaContext } from './context/AulaContext'
import type { Aula, Page } from './context/AulaContext'
import { useClassroomData } from './hooks/useClassroomData'
import { useAdminUsers } from './hooks/useAdminUsers'
import { useFlash } from './hooks/useFlash'
import { HomePage } from './pages/HomePage'
import { CoursesPage } from './pages/CoursesPage'
import { CourseDetailPage } from './pages/CourseDetailPage'
import { MeetingsPage } from './pages/MeetingsPage'
import { CertificatesPage } from './pages/CertificatesPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { AdminPage } from './pages/AdminPage'

type NavItem = { label: Page; icon: typeof LayoutDashboard }
const links: NavItem[] = [
  { label: 'Inicio', icon: LayoutDashboard }, { label: 'Mis cursos', icon: BookOpen },
  { label: 'Reuniones', icon: Video }, { label: 'Mensajes', icon: MessagesSquare }, { label: 'Certificaciones', icon: Award }, { label: 'Notificaciones', icon: Bell },
]


/** Estructura de la sesión iniciada: menú lateral, datos compartidos y la página activa. */
export function Dashboard({ session, profile, profileError, onProfileChange }: { session: Session; profile: Profile; profileError?: string; onProfileChange: (profile: Profile) => void }) {
  const [active, setActive] = useState<Page>('Inicio')
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(() => window.matchMedia('(max-width: 850px)').matches)
  // Shrinking the window to phone/tablet width closes the drawer menu so it does not cover the page.
  useEffect(() => {
    const query = window.matchMedia('(max-width: 850px)')
    const onChange = (event: MediaQueryListEvent) => { if (event.matches) setCollapsed(true) }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  const [initialDataReady, setInitialDataReady] = useState(false)
  const [courseRefresh, setCourseRefresh] = useState(0)
  const [preview, setPreview] = useState<PreviewFile | null>(null)
  const [infoTopic, setInfoTopic] = useState<InfoTopic | null>(null)
  const [supportOpen, setSupportOpen] = useState(false)
  const [openThreadId, setOpenThreadId] = useState<string | null>(null)
  const [messageUnread, setMessageUnread] = useState(0)
  const [avatarSrc, setAvatarSrc] = useState('')
  const displayName = profile.nombre_completo?.trim() || session.user.correo?.split('@')[0] || 'Participante'
  const firstName = displayName.split(/\s+/)[0]
  const role = profile.rol
  const canManageContent = role === 'administrador' || role === 'facilitador'
  const canCreateCourse = role === 'administrador'
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts()
  const [, setEmailNotice] = useFlash(pushToast)
  const bumpCourses = useCallback(() => setCourseRefresh(n => n + 1), [])
  const data = useClassroomData(session, role, courseRefresh, pushToast)
  const admin = useAdminUsers(role, pushToast)
  const unreadNotifications = data.notifications.filter(item => !item.leido_en).length
  // Unread private messages for the menu badge (admins do not take part in threads).
  const refreshMessageUnread = useCallback(async () => {
    if (!backend || role === 'administrador') return
    const { data } = await backend.rpc('mis_conversaciones')
    setMessageUnread(((data || []) as { sin_leer: number }[]).reduce((sum, item) => sum + (item.sin_leer || 0), 0))
  }, [role])
  useEffect(() => {
    if (!backend || role === 'administrador') return
    void refreshMessageUnread()
    const channel = backend.channel(`message-badge:${session.user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'mensajes' }, () => void refreshMessageUnread()).subscribe()
    return () => { void backend?.removeChannel(channel) }
  }, [role, session.user.id, refreshMessageUnread])
  const clearOpenThread = useCallback(() => setOpenThreadId(null), [])
  const idle = useIdleLogout(() => { setIdleLogoutFlag(true); void backend?.auth.signOut() })
  useEffect(() => { if (role !== 'administrador' && active === 'Administración') setActive('Inicio') }, [role, active])

  // Close the profile menu on any click outside it or with Escape.
  useEffect(() => {
    if (!menuOpen) return
    const onPointer = (event: PointerEvent) => { if (!profileMenuRef.current?.contains(event.target as Node)) setMenuOpen(false) }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointerdown', onPointer); document.removeEventListener('keydown', onKey) }
  }, [menuOpen])

  useEffect(() => {
    if (!backend || !profile.foto_url) { setAvatarSrc(''); return }
    let alive = true
    backend.storage.from('avatars').createSignedUrl(profile.foto_url, 3600).then(({ data }) => { if (alive) setAvatarSrc(data?.signedUrl || '') })
    return () => { alive = false }
  }, [profile.foto_url])


  const selectedCourse: Course | undefined = active === 'Curso' ? data.courses.find(course => course.id === selectedCourseId) : undefined
  function navigate(page: Page) {
    setActive(page); setMenuOpen(false)
    if (window.matchMedia('(max-width: 850px)').matches) setCollapsed(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function openCourse(course: Course) { setSelectedCourseId(course.id); navigate('Curso') }
  async function sendAcademicNotification(resourceType: 'material' | 'reunion' | 'grabacion', resourceId: string) {
    if (!backend || !EMAIL_NOTICES_ENABLED) return
    const { error } = await backend.functions.invoke('enviar-avisos-academicos', { body: { recurso_tipo: resourceType, recurso_id: resourceId } })
    if (error) setEmailNotice('El aviso quedó publicado en el aula, pero no se pudo enviar por correo. Revisa la configuración del servicio de correo.')
  }
  async function downloadFile(bucket: string, path: string, title: string, onError: (message: string) => void) {
    const message = await downloadPrivateFile(bucket, path, title)
    if (message) onError(message)
  }


  const sidebarLinks: NavItem[] = [...links.filter(link => role !== 'administrador' || link.label !== 'Mensajes'), ...(role === 'administrador' ? [{ label: 'Administración' as Page, icon: Settings2 as typeof BookOpen }] : [])]
  const pageDetails: Record<Page, { kicker: string; title: string; description: string }> = {
    Inicio: { kicker: 'TU ESPACIO DE CAPACITACIÓN', title: `Hola, ${firstName}`, description: 'Cada día es una oportunidad para fortalecer tu negocio y tu equipo.' },
    'Mis cursos': { kicker: 'FORMACIÓN', title: 'Mis cursos', description: 'Elige un curso para ver sus semanas, materiales y recursos.' },
    Reuniones: { kicker: 'CAPACITACIÓN EN VIVO', title: 'Reuniones', description: 'Tus clases en vivo y las grabaciones de cada sesión.' },
    Certificaciones: { kicker: 'TUS LOGROS', title: 'Certificaciones', description: 'Consulta y descarga los certificados de tus programas.' },
    Administración: { kicker: 'GESTIÓN DE CAPACITACIONES', title: 'Administración', description: 'Gestiona usuarios, matrículas y facilitadores del aula.' },
    Perfil: { kicker: 'TU CUENTA', title: 'Mi perfil', description: 'Actualiza tus datos, tu foto y tu contraseña.' },
    Notificaciones: { kicker: 'AVISOS DE TU AULA', title: 'Notificaciones', description: 'Materiales, clases, mensajes y novedades de tus cursos.' },
    Mensajes: { kicker: 'COMUNICACIÓN DEL CURSO', title: 'Mensajes', description: role === 'participante' ? 'Escribe a tu facilitador cuando tengas dudas del curso.' : 'Responde las consultas de los participantes de tus cursos.' },
    Curso: { kicker: 'CAPACITACIÓN', title: selectedCourse?.nombre || 'Curso', description: 'Contenido y recursos del programa.' },
  }
  const page = pageDetails[active]
  const dashboardReady = data.ready && admin.adminUsersReady
  useEffect(() => { if (dashboardReady) setInitialDataReady(true) }, [dashboardReady])
  useEffect(() => {
    if (!data.coursesReady) return
    const wanted = pendingCourse()
    if (!wanted) return
    clearPendingCourse()
    const course = data.courses.find(item => item.codigo.toLowerCase() === wanted.toLowerCase() || item.id === wanted)
    if (course) openCourse(course)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.coursesReady])
  useEffect(() => { if (active === 'Curso' && data.coursesReady && !selectedCourse) setActive('Mis cursos') }, [active, data.coursesReady, selectedCourse])
  if (!initialDataReady) return <BootScreen title="Preparando tu aula" detail="Organizando tus cursos, clases y avisos…"/>

  const courseName = (id: string) => data.courses.find(course => course.id === id)?.nombre || 'Capacitación'
  const aula: Aula = { ...data, ...admin, session, profile, role, canManageContent, canCreateCourse, onProfileChange, courseName, unreadNotifications, selectedCourseId, bumpCourses, courseRefresh, navigate, openCourse, setOpenThreadId, setPreview, pushToast, sendAcademicNotification, downloadFile }

  return <AulaContext.Provider value={aula}><div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
    {!collapsed && <button className="mobile-nav-backdrop" aria-label="Cerrar menú" onClick={() => setCollapsed(true)}/>}
    <aside className="sidebar"><div className="sidebar-brand"><Brand light/><button className="icon-button collapse-control" aria-label="Contraer menú" onClick={() => setCollapsed(v => !v)}><ArrowDown size={16}/></button></div>
      <div className="workspace-label">ESPACIO DE CAPACITACIÓN</div><nav aria-label="Navegación principal">{sidebarLinks.map(({ label, icon: Icon }) => <button key={label} className={`nav-link ${active === label || (label === 'Mis cursos' && active === 'Curso') ? 'activa' : ''}`} onClick={() => navigate(label)} title={collapsed ? label : undefined}><Icon size={18}/><span>{label}</span>{label === 'Notificaciones' && unreadNotifications > 0 && <span className="nav-count">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>}{label === 'Mensajes' && messageUnread > 0 && <span className="nav-count">{messageUnread > 9 ? '9+' : messageUnread}</span>}</button>)}</nav>
      <div className="sidebar-spacer"/>
      <button type="button" className="sidebar-help" onClick={() => setSupportOpen(true)}><span className="help-icon"><CircleHelp size={17}/></span><div><strong>¿Necesitas ayuda?</strong><small>Envíanos tu consulta</small></div><ArrowRight size={15}/></button>
      <div className="profile-menu-wrap" ref={profileMenuRef}>
        <button type="button" className="profile-switch" aria-expanded={menuOpen} aria-haspopup="menu" onClick={() => setMenuOpen(v => !v)}><Avatar src={avatarSrc} name={displayName}/><span className="profile-copy"><strong>{displayName}</strong><small>{roleNames[role]}</small></span><MoreHorizontal size={18}/></button>
        {menuOpen && <div className="profile-menu" role="menu"><button role="menuitem" onClick={() => navigate('Perfil')}><Users size={16}/> Mi perfil</button><button role="menuitem" onClick={() => void backend?.auth.signOut()}><LogOut size={16}/> Cerrar sesión</button></div>}
      </div>
    </aside>
    <main className="main-area">
      <div className="page-content"><button className="mobile-menu icon-button" aria-label={collapsed ? 'Abrir menú' : 'Cerrar menú'} aria-expanded={!collapsed} onClick={() => setCollapsed(v => !v)}><Menu size={21}/></button>
        <header className="mobile-bar"><button className="mobile-bar-logo" onClick={() => navigate('Inicio')} aria-label="Ir al inicio"><img src={logoOnLight} alt="Aula Consulting"/></button><button className="icon-button mobile-bell" aria-label={unreadNotifications ? `Notificaciones: ${unreadNotifications} sin leer` : 'Notificaciones'} onClick={() => navigate('Notificaciones')}><Bell size={20}/>{unreadNotifications > 0 && <i>{unreadNotifications > 9 ? '9+' : unreadNotifications}</i>}</button></header>
        {active !== 'Curso' && <div className="page-heading"><div><div className="date-label"><span className="live-dot"/> {page.kicker}</div><h1>{page.title}<span className="wave">✦</span></h1><p className="heading-subtitle">{page.description}</p></div>{active === 'Inicio' && <button className="outline-button heading-courses-link" onClick={() => navigate('Mis cursos')}><BookOpen size={16}/> Ver mis cursos</button>}</div>}
        {profileError && <div className="form-alert error-alert" role="status">No se pudo actualizar tu perfil. Si tus permisos cambiaron, vuelve a iniciar sesión.</div>}{data.loadError && <div className="form-alert error-alert" role="status">No pudimos cargar tus cursos. Revisa tu conexión e intenta de nuevo.</div>}

        {active === 'Inicio' && <HomePage/>}
        {active === 'Mis cursos' && <CoursesPage/>}
        {active === 'Curso' && selectedCourse && <CourseDetailPage key={selectedCourse.id} course={selectedCourse}/>}
        {active === 'Mensajes' && role !== 'administrador' && <Messages userId={session.user.id} openThreadId={openThreadId} onThreadOpened={clearOpenThread} onUnreadChange={refreshMessageUnread} onError={pushToast}/>}
        {active === 'Notificaciones' && <NotificationsPage/>}
        {active === 'Reuniones' && <MeetingsPage/>}
        {active === 'Certificaciones' && <CertificatesPage/>}
        {active === 'Administración' && role === 'administrador' && <AdminPage/>}
        {active === 'Perfil' && <ProfilePage session={session} profile={profile} avatarSrc={avatarSrc} onProfileChange={onProfileChange}/>}

        <footer className="page-footer"><span>{COPYRIGHT()}</span><span><button onClick={() => setInfoTopic('privacy')}>Privacidad</button><button onClick={() => setInfoTopic('terms')}>Términos</button><button onClick={() => setSupportOpen(true)}><MessageCircle size={14}/> Soporte</button></span></footer>
      </div>
    </main>
    <ToastStack toasts={toasts} onDismiss={dismissToast}/>
    {preview && <FilePreview file={preview} onClose={() => setPreview(null)}/>}
    {infoTopic && <InfoModal topic={infoTopic} onClose={() => setInfoTopic(null)}/>}
    {supportOpen && <SupportModal onClose={() => setSupportOpen(false)} defaultName={profile.nombre_completo || ''} defaultEmail={session.user.correo || ''} defaultPhone={profile.telefono || ''}/>}
    {idle.secondsLeft !== null && <Modal overline="SEGURIDAD DE TU CUENTA" title="¿Sigues ahí?" onClose={idle.stayActive}><p className="idle-warning">Por seguridad, tu sesión se cerrará en <strong>{Math.floor(idle.secondsLeft / 60)}:{String(idle.secondsLeft % 60).padStart(2, '0')}</strong> por inactividad.</p><div className="modal-actions"><button className="modal-cancel" onClick={() => { setIdleLogoutFlag(false); void backend?.auth.signOut() }}>Cerrar sesión</button><button className="modal-save" onClick={idle.stayActive}>Seguir conectado</button></div></Modal>}
  </div>
  </AulaContext.Provider>
}
