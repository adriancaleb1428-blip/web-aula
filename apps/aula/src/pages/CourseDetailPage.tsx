import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, Award, BookOpen, CalendarDays, Eye, FileText, Pencil, Plus, Sparkles, Trash2, Upload } from 'lucide-react'
import { backend } from '../lib/backend'
import { asHttpsUrl } from '../lib/config'
import { modalityNames } from '../lib/types'
import type { Course, CourseLesson, CourseModule, Material } from '../lib/types'
import { EmptyState, Modal } from '../components/ui'
import { useAula } from '../context/AulaContext'
import { useCourseManager } from '../hooks/useCourseManager'
import { useFlash } from '../hooks/useFlash'

/** Detalle de un curso: semanas, lecciones y materiales (el personal además los administra). */
export function CourseDetailPage({ course }: { course: Course }) {
  const { canManageContent, materials, setMaterials, setMaterialsError, refreshMaterials, courseRefresh, bumpCourses, pushToast, setPreview, downloadFile, navigate } = useAula()
  const mgr = useCourseManager()
  const [courseModules, setCourseModules] = useState<CourseModule[]>([])
  const [courseLessons, setCourseLessons] = useState<CourseLesson[]>([])
  const [outlineLoadedFor, setOutlineLoadedFor] = useState<string | null>(null)
  const [weekTitle, setWeekTitle] = useState('')
  const [weekDescription, setWeekDescription] = useState('')
  const [, setWeekMessage] = useFlash(pushToast)
  const [weekSaving, setWeekSaving] = useState(false)
  const [weekEdit, setWeekEdit] = useState<{ id: string; title: string; description: string } | null>(null)
  const [materialEdit, setMaterialEdit] = useState<{ id: string; course_id: string; title: string; description: string; module_id: string } | null>(null)

  useEffect(() => {
    if (!backend || !course) { setCourseModules([]); setCourseLessons([]); setOutlineLoadedFor(''); return }
    let alive = true
    setOutlineLoadedFor(null)
    const loadOutline = async () => {
      let moduleQuery = backend!.from('modules').select('id, course_id, title, description, position, published').eq('course_id', course.id).order('position')
      if (!canManageContent) moduleQuery = moduleQuery.eq('published', true)
      const { data: modules } = await moduleQuery
      const visibleModules = (modules || []) as CourseModule[]
      const { data: lessons } = visibleModules.length ? await backend!.from('lessons').select('id, module_id, title, body, position, published').in('module_id', visibleModules.map(item => item.id)).eq('published', true).order('position') : { data: [] }
      if (alive) { setCourseModules(visibleModules); setCourseLessons((lessons || []) as CourseLesson[]); setOutlineLoadedFor(course.id) }
    }
    void loadOutline()
    return () => { alive = false }
  }, [course.id, courseRefresh, canManageContent])

  async function createCourseWeek(event: FormEvent) {
    event.preventDefault()
    if (!backend || !course || !weekTitle.trim()) return
    setWeekSaving(true); setWeekMessage('')
    const position = courseModules.reduce((max, item) => Math.max(max, item.position), -1) + 1
    const { error } = await backend.from('modules').insert({ course_id: course.id, title: weekTitle.trim().slice(0, 120), description: weekDescription.trim().slice(0, 500) || null, position, published: true })
    setWeekSaving(false)
    if (error) { setWeekMessage(`No se pudo crear la semana: ${error.message}`); return }
    setWeekTitle(''); setWeekDescription(''); setWeekMessage('Semana publicada.'); bumpCourses()
  }
  async function saveWeekEdit(event: FormEvent) {
    event.preventDefault(); if (!backend || !weekEdit || !weekEdit.title.trim()) return
    const { error } = await backend.from('modules').update({ title: weekEdit.title.trim().slice(0, 120), description: weekEdit.description.trim().slice(0, 500) || null }).eq('id', weekEdit.id)
    if (error) { setWeekMessage(`No se pudo actualizar la semana: ${error.message}`); return }
    setWeekEdit(null); setWeekMessage('Semana actualizada.'); bumpCourses()
  }
  async function deleteWeek(module: CourseModule) {
    if (!backend || !window.confirm(`¿Eliminar “${module.title}”? Sus materiales pasarán a “Material general del curso”.`)) return
    const { error } = await backend.from('modules').delete().eq('id', module.id)
    if (error) { setWeekMessage(`No se pudo eliminar la semana: ${error.message}`); return }
    setWeekMessage('Semana eliminada.'); bumpCourses(); void refreshMaterials()
  }


  async function saveMaterialEdit(event: FormEvent) {
    event.preventDefault(); if (!backend || !materialEdit || !materialEdit.title.trim()) return
    const { error } = await backend.from('materials').update({ title: materialEdit.title.trim().slice(0, 160), description: materialEdit.description.trim().slice(0, 500) || null, module_id: materialEdit.module_id || null }).eq('id', materialEdit.id)
    if (error) { setMaterialsError(`No se pudo actualizar el material: ${error.message}`); return }
    setMaterialEdit(null); pushToast('Material actualizado.')
    await refreshMaterials()
  }
  async function deleteMaterial(material: Material) {
    if (!backend || !window.confirm(`¿Eliminar el material “${material.title}”?`)) return
    const { error: storageError } = await backend.storage.from('course-materials').remove([material.storage_path])
    if (storageError) { setMaterialsError(`No se pudo eliminar el archivo: ${storageError.message}`); return }
    const { error } = await backend.from('materials').delete().eq('id', material.id)
    if (error) { setMaterialsError(`No se pudo eliminar el material: ${error.message}`); return }
    setMaterials(current => current.filter(item => item.id !== material.id))
  }

  const materialRow =   (material: Material) => <div className="material-row" key={material.id}>
    <span className="material-file-icon"><FileText size={16}/></span>
    <span className="material-info"><strong>{material.title}</strong><small>{material.description || 'Material de aprendizaje'}</small></span>
    <div className="material-row-actions">
      <button className="material-action" onClick={() => setPreview({ bucket: 'course-materials', path: material.storage_path, title: material.title, mimeType: material.mime_type })}><Eye size={14}/> Ver</button>
      <button className="material-action" onClick={() => void downloadFile('course-materials', material.storage_path, material.title, setMaterialsError)}><ArrowDown size={14}/> Descargar</button>
      {canManageContent && <><button className="icon-button" aria-label={`Editar ${material.title}`} title="Editar" onClick={() => setMaterialEdit({ id: material.id, course_id: material.course_id, title: material.title, description: material.description || '', module_id: material.module_id || '' })}><Pencil size={15}/></button><button className="icon-button delete-action" aria-label={`Eliminar ${material.title}`} title="Eliminar" onClick={() => void deleteMaterial(material)}><Trash2 size={15}/></button></>}
    </div>
  </div>

  return <>
        <section className="section-card feature-page course-detail-page">
          <button className="back-link-button" onClick={() => navigate('Mis cursos')}><ArrowLeft size={15}/> Mis cursos</button>
          <div className="course-detail-top"><div><span className="section-overline">CAPACITACIÓN · {course.code}</span><h2>{course.name}</h2><p>{course.description || 'Explora el contenido y los recursos de esta capacitación.'}</p></div>
            {canManageContent && <div className="course-detail-actions"><button className="outline-button" onClick={() => mgr.openEdit(course)}><Pencil size={15}/> Editar curso</button><button className="create-course-button" onClick={() => mgr.openUpload(course.id)}><Upload size={15}/> Subir material</button></div>}</div>
          <div className="course-detail-meta"><span><BookOpen size={16}/> {modalityNames[course.modality] || 'Capacitación'}</span>{course.category && <span><Sparkles size={16}/> {course.category}</span>}{(course.starts_on || course.ends_on) && <span><CalendarDays size={16}/> {[course.starts_on, course.ends_on].filter(Boolean).map(date => new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(date!))).join(' – ')}</span>}<span><Award size={16}/> Certificación según requisitos del curso</span></div>
          {canManageContent && <form className="week-create-form" onSubmit={createCourseWeek}><div><span className="section-overline">CONTENIDO DEL CURSO</span><h3>Organiza el aprendizaje por semanas</h3></div><div className="week-create-fields"><input aria-label="Nombre de la semana" placeholder="Ej. Semana 1: Plan de negocio" maxLength={120} value={weekTitle} onChange={event => setWeekTitle(event.target.value)} required/><input aria-label="Descripción de la semana" placeholder="Descripción opcional" maxLength={500} value={weekDescription} onChange={event => setWeekDescription(event.target.value)}/><button className="create-course-button" disabled={weekSaving}>{weekSaving ? 'Guardando…' : <><Plus size={15}/> Agregar semana</>}</button></div></form>}
          
          {outlineLoadedFor !== course.id ? <div className="outline-loading">Cargando el contenido del curso…</div> : <div className="course-outline">
            {courseModules.map((module, index) => { const lessons = courseLessons.filter(lesson => lesson.module_id === module.id); const moduleMaterials = materials.filter(material => material.module_id === module.id); return <details className="course-week" key={module.id} open={index === 0}>
              <summary><span className="week-icon"><BookOpen size={19}/></span><span className="week-title"><strong>{module.title}</strong><small>{module.description || `Contenido de la semana ${index + 1}`}</small></span><span className="week-progress">{lessons.length + moduleMaterials.length} recurso{lessons.length + moduleMaterials.length === 1 ? '' : 's'}</span>
                {canManageContent && <span className="week-tools" onClick={event => event.preventDefault()}><button className="icon-button" title="Subir material a esta semana" aria-label="Subir material a esta semana" onClick={() => mgr.openUpload(course.id, module.id)}><Upload size={15}/></button><button className="icon-button" title="Editar semana" aria-label="Editar semana" onClick={() => setWeekEdit({ id: module.id, title: module.title, description: module.description || '' })}><Pencil size={15}/></button><button className="icon-button delete-action" title="Eliminar semana" aria-label="Eliminar semana" onClick={() => void deleteWeek(module)}><Trash2 size={15}/></button></span>}
                <ArrowDown className="week-chevron" size={17}/></summary>
              <div className="week-items">{lessons.map(lesson => <div className="lesson-row" key={lesson.id}><span className="lesson-icon"><FileText size={17}/></span><span><strong>{lesson.title}</strong><small>{lesson.body || 'Contenido de aprendizaje'}</small></span>{asHttpsUrl(lesson.body || '') && <a href={asHttpsUrl(lesson.body || '')!} target="_blank" rel="noopener noreferrer">Abrir <ArrowRight size={13}/></a>}</div>)}{moduleMaterials.map(materialRow)}{!lessons.length && !moduleMaterials.length && <p className="materials-empty">Aún no hay contenidos en esta semana.</p>}</div>
            </details> })}
            {(() => { const general = materials.filter(material => material.course_id === course.id && !courseModules.some(module => module.id === material.module_id)); return (general.length > 0 || !courseModules.length) && <section className="course-week fallback-week"><div className="fallback-week-title"><span className="week-icon"><FileText size={19}/></span><span><strong>Material general del curso</strong><small>Recursos disponibles para toda la capacitación</small></span></div><div className="week-items">{general.map(materialRow)}{!general.length && <EmptyState title="El curso se está preparando" text="Cuando el facilitador publique las semanas y materiales, aparecerán aquí." icon={BookOpen}/>}</div></section> })()}
          </div>}
        </section>

    {materialEdit && <Modal overline="BIBLIOTECA DEL CURSO" title="Editar material" onClose={() => setMaterialEdit(null)}><form className="course-form" onSubmit={saveMaterialEdit}>
      <div className="form-field full-field"><label>Título</label><input maxLength={160} value={materialEdit.title} onChange={e => setMaterialEdit({ ...materialEdit, title: e.target.value })} required/></div>
      <div className="form-field full-field"><label>Descripción</label><textarea rows={2} maxLength={500} value={materialEdit.description} onChange={e => setMaterialEdit({ ...materialEdit, description: e.target.value })}/></div>
      <div className="form-field full-field"><label>Semana</label><select value={materialEdit.module_id} onChange={e => setMaterialEdit({ ...materialEdit, module_id: e.target.value })}><option value="">Material general del curso</option>{courseModules.map(module => <option key={module.id} value={module.id}>{module.title}</option>)}</select></div>
      <div className="modal-actions"><button type="button" className="modal-cancel" onClick={() => setMaterialEdit(null)}>Cancelar</button><button className="modal-save">Guardar cambios</button></div>
    </form></Modal>}

    {weekEdit && <Modal overline="CONTENIDO DEL CURSO" title="Editar semana" onClose={() => setWeekEdit(null)}><form className="course-form" onSubmit={saveWeekEdit}>
      <div className="form-field full-field"><label>Nombre de la semana</label><input maxLength={120} value={weekEdit.title} onChange={e => setWeekEdit({ ...weekEdit, title: e.target.value })} required/></div>
      <div className="form-field full-field"><label>Descripción</label><textarea rows={2} maxLength={500} value={weekEdit.description} onChange={e => setWeekEdit({ ...weekEdit, description: e.target.value })}/></div>
      <div className="modal-actions"><button type="button" className="modal-cancel" onClick={() => setWeekEdit(null)}>Cancelar</button><button className="modal-save">Guardar cambios</button></div>
    </form></Modal>}
    {mgr.modals}
  </>
}
