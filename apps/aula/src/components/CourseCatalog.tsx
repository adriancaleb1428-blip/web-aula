import { ArrowRight, BookOpen, FileText, GraduationCap, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react'
import type { Course, Material, Role } from '../lib/types'
import { EmptyState } from './ui'

export function CourseCatalog({ overline, title, courses, materials, limit, search, setSearch, role, canCreate, onCreate, canUpload, onUpload, onOpenCourse, onEditCourse, onDeleteCourse, onViewAll }: { overline: string; title: string; courses: Course[]; materials: Material[]; limit?: number; search?: string; setSearch?: (value: string) => void; role: Role; canCreate?: boolean; onCreate?: () => void; canUpload?: boolean; onUpload?: () => void; onOpenCourse: (course: Course) => void; onEditCourse: (course: Course) => void; onDeleteCourse: (course: Course) => void; onViewAll?: () => void }) {
  const visible = limit ? courses.slice(0, limit) : courses
  const canEdit = role === 'administrador' || role === 'facilitador'
  return <section className="section-card courses-card">
    <div className="section-header"><div><span className="section-overline">{overline}</span><h2>{title}</h2></div><div className="course-actions">{canCreate && <button className="create-course-button" onClick={onCreate}><Plus size={15}/> Crear curso</button>}{canUpload && <button className="outline-button upload-material-button" onClick={onUpload}><Upload size={15}/> Subir material</button>}{setSearch && <label className="course-search"><Search size={16}/><input aria-label="Buscar cursos" placeholder="Buscar cursos" value={search} onChange={e => setSearch(e.target.value)}/></label>}</div></div>
    {visible.length ? <div className={`course-grid ${limit ? 'is-compact' : ''}`}>{visible.map(course => {
      const count = materials.filter(material => material.curso_id === course.id).length
      return <article className="course-card" key={course.id}>
        <button className="course-card-main" onClick={() => onOpenCourse(course)}>
          <span className="course-card-top"><span className="course-cover"><BookOpen size={20}/></span><span className="course-code">{course.codigo}</span></span>
          <span className="course-card-body"><strong>{course.nombre}</strong><small>{course.descripcion || 'Capacitación y recursos de aprendizaje.'}</small></span>
          <span className="course-card-footer"><span><FileText size={13}/> {count} {count === 1 ? 'material' : 'materiales'}</span><span className="course-card-cta">Entrar al curso <ArrowRight size={14}/></span></span>
        </button>
        {canEdit && <div className="course-card-tools"><button className="icon-button" aria-label={`Editar curso ${course.nombre}`} title="Editar curso" onClick={() => onEditCourse(course)}><Pencil size={15}/></button>{role === 'administrador' && <button className="icon-button delete-action" aria-label={`Eliminar curso ${course.nombre}`} title="Eliminar curso" onClick={() => onDeleteCourse(course)}><Trash2 size={15}/></button>}</div>}
      </article>
    })}</div> : <EmptyState title={search ? 'No encontramos ese curso' : 'Tu espacio está listo para empezar'} text={search ? 'Prueba con otro nombre o código.' : role === 'participante' ? 'Cuando te matriculen en una capacitación, aparecerá aquí para que puedas empezar.' : 'Todavía no hay cursos publicados. Cuando crees uno, aparecerá aquí.'} icon={search ? Search : GraduationCap}/>}
    {onViewAll && courses.length > 0 && <button className="view-all" onClick={onViewAll}>Ver todos mis cursos <ArrowRight size={15}/></button>}
  </section>
}

export function StatCard({ icon: Icon, label, value, detail, tint, onClick }: { icon: typeof BookOpen; label: string; value: string | number; detail: string; tint: string; onClick: () => void }) {
  return <button className="stat-card stat-button" onClick={onClick}><div className={`stat-icon ${tint}`}><Icon size={19}/></div><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><span className="stat-detail">{detail}</span><ArrowRight className="stat-arrow" size={16}/></button>
}
