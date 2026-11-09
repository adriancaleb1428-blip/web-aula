import { ArrowRight, Award, BookOpen, GraduationCap, Sparkles, Video } from 'lucide-react'
import { EmptyState } from '../components/ui'
import { CourseCatalog, StatCard } from '../components/CourseCatalog'
import { useAula } from '../context/AulaContext'
import { useCourseManager } from '../hooks/useCourseManager'

export function HomePage() {
  const { role, courses, materials, meetings, certificates, courseCount, navigate, openCourse } = useAula()
  const mgr = useCourseManager()
  return <>
          <section className="welcome-banner"><div className="welcome-art"><span className="art-orbit orbit-one"/><span className="art-orbit orbit-two"/><span className="art-sun"/><BookOpen size={54} strokeWidth={1.1}/><span className="art-sparkle">✦</span></div><div className="banner-copy"><span className="banner-label"><Sparkles size={13}/> TU SIGUIENTE GRAN IDEA EMPIEZA AQUÍ</span><h2>Capacítate hoy,<br/>avanza <em>con confianza.</em></h2><p>Programas prácticos para empresas, equipos y emprendedores.</p><button onClick={() => navigate('Mis cursos')}>Explorar mis cursos <ArrowRight size={16}/></button></div></section>
          <section className="stats-grid stats-grid-learning" aria-label="Resumen de capacitación"><StatCard icon={BookOpen} label="Mis cursos" value={courseCount} tint="mint" detail="Capacitaciones disponibles" onClick={() => navigate('Mis cursos')}/><StatCard icon={Video} label="Reuniones" value={meetings.filter(item => new Date(item.ends_at).getTime() > Date.now()).length} tint="lavender" detail="Clases programadas" onClick={() => navigate('Reuniones')}/><StatCard icon={Award} label="Certificaciones" value={certificates.length} tint="sand" detail="Tus logros de formación" onClick={() => navigate('Certificaciones')}/></section>
          <div className="lower-grid"><CourseCatalog overline="SIGUE APRENDIENDO" title="Mis cursos" courses={courses} materials={materials} limit={4} role={role} onOpenCourse={openCourse} onEditCourse={mgr.openEdit} onDeleteCourse={mgr.remove} onViewAll={() => navigate('Mis cursos')}/><aside className="section-card activity-card"><div className="section-header activity-head"><div><span className="section-overline">TUS LOGROS</span><h2>Certificaciones</h2></div><Award size={19}/></div>{certificates.length ? <div className="home-certificate"><strong>{certificates.length} certificado{certificates.length === 1 ? '' : 's'} disponible{certificates.length === 1 ? '' : 's'}</strong><span>{certificates[0].title}</span><button className="material-action" onClick={() => navigate('Certificaciones')}>Ver certificado <ArrowRight size={14}/></button></div> : <EmptyState title="Tu aprendizaje, reconocido" text="Al completar una capacitación, aquí podrás consultar tu certificado." icon={GraduationCap}/>}<button className="activity-link" onClick={() => navigate('Certificaciones')}>Ver certificaciones <ArrowRight size={15}/></button></aside></div>
    {mgr.modals}
  </>
}
