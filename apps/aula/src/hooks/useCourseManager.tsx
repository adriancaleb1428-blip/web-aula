import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight } from 'lucide-react'
import { backend } from '../lib/backend'
import { MAX_MATERIAL_BYTES, materialMimeTypes, safeFileName, validateUpload } from '../lib/config'
import { uploadWithProgress } from '../lib/upload'
import type { Course, CourseModule } from '../lib/types'
import { FileDrop, Modal, ProgressBar } from '../components/ui'
import { useAula } from '../context/AulaContext'
import { useFlash } from './useFlash'

const courseSchema = z.object({
  name: z.string().trim().min(3, 'Escribe al menos 3 caracteres.').max(120, 'Máximo 120 caracteres.'),
  code: z.string().trim().min(2, 'Escribe un código.').max(16, 'Máximo 16 caracteres.').regex(/^[A-Z0-9-]+$/, 'Usa mayúsculas, números y guiones.'),
  description: z.string().trim().max(2000, 'Máximo 2000 caracteres.'),
  category: z.string().trim().max(80, 'Máximo 80 caracteres.'),
  academic_period: z.string().trim().max(40, 'Máximo 40 caracteres.'),
  modality: z.enum(['online', 'in_person', 'hybrid']),
  starts_on: z.string(),
  ends_on: z.string(),
}).refine(v => !v.starts_on || !v.ends_on || v.ends_on >= v.starts_on, { path: ['ends_on'], message: 'La fecha final debe ser igual o posterior a la inicial.' })
type CourseInput = z.infer<typeof courseSchema>
const emptyCourse: CourseInput = { name: '', code: '', description: '', category: '', academic_period: '', modality: 'hybrid', starts_on: '', ends_on: '' }

/** Crear, editar y eliminar cursos y subir materiales. Devuelve las acciones y los modales que debe pintar la página. */
export function useCourseManager() {
  const { session, role, courses, selectedCourseId, navigate, setCourses, setCourseCount, setMaterials, refreshMaterials, sendAcademicNotification, bumpCourses, pushToast } = useAula()
  const [courseModalOpen, setCourseModalOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [courseSaving, setCourseSaving] = useState(false)
  const [courseMessage, setCourseMessage] = useFlash(pushToast, courseModalOpen)
  const courseForm = useForm<CourseInput>({ resolver: zodResolver(courseSchema), defaultValues: emptyCourse })
  const [uploadCourseId, setUploadCourseId] = useState('')
  const [uploadModuleId, setUploadModuleId] = useState('')
  const [uploadModules, setUploadModules] = useState<CourseModule[]>([])
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadMessage, setUploadMessage] = useState('')
  const [uploadModalOpen, setUploadModalOpen] = useState(false)

  useEffect(() => {
    const courseId = uploadCourseId
    if (!backend || !courseId || role === 'student') { setUploadModules([]); return }
    let alive = true
    backend.from('modules').select('id, course_id, title, description, position, published').eq('course_id', courseId).order('position').then(({ data }) => {
      if (alive) setUploadModules((data || []) as CourseModule[])
    })
    return () => { alive = false }
  }, [uploadCourseId, role])

  function openCreateCourse() { setEditingCourse(null); courseForm.reset(emptyCourse); setCourseMessage(''); setCourseModalOpen(true) }
  function openEditCourse(course: Course) {
    setEditingCourse(course); setCourseMessage('')
    courseForm.reset({ name: course.name, code: course.code, description: course.description || '', category: course.category || '', academic_period: course.academic_period || '', modality: (['online', 'in_person', 'hybrid'].includes(course.modality) ? course.modality : 'hybrid') as CourseInput['modality'], starts_on: course.starts_on || '', ends_on: course.ends_on || '' })
    setCourseModalOpen(true)
  }
  async function saveCourse(values: CourseInput) {
    if (!backend) return
    setCourseSaving(true); setCourseMessage('')
    const fields = { name: values.name, code: values.code, description: values.description || null, category: values.category || null, academic_period: values.academic_period || null, modality: values.modality, starts_on: values.starts_on || null, ends_on: values.ends_on || null }
    const { error } = editingCourse
      ? await backend.from('courses').update(fields).eq('id', editingCourse.id)
      : await backend.from('courses').insert({ ...fields, status: 'published', created_by: session.user.id })
    setCourseSaving(false)
    if (error) { setCourseMessage(error.code === '23505' ? 'No se pudo guardar: ese código ya está asignado a otro curso.' : `No se pudo guardar el curso: ${error.message}`); return }
    setCourseModalOpen(false); setCourseMessage(editingCourse ? 'Curso actualizado.' : 'Curso creado y publicado.'); if (!editingCourse) navigate('Mis cursos'); setEditingCourse(null); bumpCourses()
  }
  async function deleteCourse(course: Course) {
    if (!backend || !window.confirm(`¿Eliminar el curso “${course.name}” y sus materiales, reuniones y grabaciones? Esta acción no se puede deshacer.`)) return
    const [materialRows, recordingRows, certificateRows] = await Promise.all([
      backend.from('materials').select('storage_path').eq('course_id', course.id),
      backend.from('course_recordings').select('storage_path').eq('course_id', course.id),
      backend.from('course_certificates').select('storage_path').eq('course_id', course.id),
    ])
    const removeFiles = async (bucket: string, rows: { storage_path: string }[] | null) => rows?.length ? backend!.storage.from(bucket).remove(rows.map(row => row.storage_path)) : { error: null }
    const removals = await Promise.all([removeFiles('course-materials', materialRows.data), removeFiles('course-recordings', recordingRows.data), removeFiles('course-certificates', certificateRows.data)])
    const failedRemoval = removals.find(result => result.error)
    if (failedRemoval?.error) { setCourseMessage(`No se pudo borrar todo el contenido del curso: ${failedRemoval.error.message}`); return }
    const { error } = await backend.from('courses').delete().eq('id', course.id)
    if (error) { setCourseMessage(`No se pudo eliminar el curso: ${error.message}`); return }
    setCourses(current => current.filter(item => item.id !== course.id)); setCourseCount(count => Math.max(0, count - 1)); setMaterials(current => current.filter(item => item.course_id !== course.id)); setCourseMessage('Curso eliminado junto con sus archivos.'); if (selectedCourseId === course.id) navigate('Mis cursos'); bumpCourses()
  }


  function openUpload(courseId = courses[0]?.id || '', moduleId = '') { setUploadCourseId(courseId); setUploadModuleId(moduleId); setUploadMessage(''); setUploadFile(null); setUploadTitle(''); setUploadDescription(''); setUploadProgress(null); setUploadModalOpen(true) }
  async function uploadMaterial(event: FormEvent) {
    event.preventDefault(); if (!backend || !uploadCourseId) return
    if (!uploadFile) { setUploadMessage('Elige un archivo para publicar.'); return }
    const validationError = validateUpload(uploadFile, materialMimeTypes, MAX_MATERIAL_BYTES, 'materiales')
    if (validationError) { setUploadMessage(validationError); return }
    setUploadProgress(0); setUploadMessage('')
    const storagePath = `${uploadCourseId}/${crypto.randomUUID()}-${safeFileName(uploadFile.name)}`
    const uploadError = await uploadWithProgress('course-materials', storagePath, uploadFile, setUploadProgress)
    if (uploadError) { setUploadProgress(null); setUploadMessage(`No se pudo subir el archivo: ${uploadError}`); return }
    const { data: createdMaterial, error: rowError } = await backend.from('materials').insert({ course_id: uploadCourseId, module_id: uploadModuleId || null, title: (uploadTitle.trim() || uploadFile.name).slice(0, 160), description: uploadDescription.trim().slice(0, 500) || null, storage_path: storagePath, mime_type: uploadFile.type || null, uploaded_by: session.user.id, is_published: true }).select('id').single()
    setUploadProgress(null)
    if (rowError) { await backend.storage.from('course-materials').remove([storagePath]); setUploadMessage(`No se pudo registrar el archivo: ${rowError.message}`); return }
    if (createdMaterial) void sendAcademicNotification('material', createdMaterial.id)
    setUploadModalOpen(false); setCourseMessage('Material publicado.')
    await refreshMaterials()
  }

  const modals = <>
    {courseModalOpen && <Modal overline={editingCourse ? 'ACTUALIZA LA INFORMACIÓN' : 'NUEVA CAPACITACIÓN'} title={editingCourse ? 'Editar curso' : 'Crear curso'} intro={editingCourse ? 'Corrige los datos del curso. Los materiales y matrículas se mantienen.' : 'Completa la información básica. El curso se publicará al guardarlo.'} onClose={() => setCourseModalOpen(false)}><form className="course-form" onSubmit={courseForm.handleSubmit(saveCourse)}>
      <div className="form-field"><label htmlFor="course-name">Nombre del curso <b>*</b></label><input id="course-name" placeholder="Ej. Liderazgo y gestión de equipos" {...courseForm.register('name')}/>{courseForm.formState.errors.name && <small className="field-error">{courseForm.formState.errors.name.message}</small>}</div>
      <div className="form-field"><label htmlFor="course-code">Código <b>*</b></label><input id="course-code" placeholder="LID-101" {...courseForm.register('code', { setValueAs: (v: string) => v.toUpperCase().replace(/\s+/g, '-') })}/>{courseForm.formState.errors.code && <small className="field-error">{courseForm.formState.errors.code.message}</small>}</div>
      <div className="form-field full-field"><label htmlFor="course-description">Descripción</label><textarea id="course-description" rows={3} placeholder="¿Qué lograrán los participantes en este programa?" {...courseForm.register('description')}/>{courseForm.formState.errors.description && <small className="field-error">{courseForm.formState.errors.description.message}</small>}</div>
      <div className="form-field"><label htmlFor="course-category">Categoría</label><input id="course-category" placeholder="Emprendimiento" {...courseForm.register('category')}/></div>
      <div className="form-field"><label htmlFor="course-period">Edición o cohorte</label><input id="course-period" placeholder="2026 - Grupo 1" {...courseForm.register('academic_period')}/></div>
      <div className="form-field"><label htmlFor="course-modality">Modalidad</label><select id="course-modality" {...courseForm.register('modality')}><option value="hybrid">Híbrido</option><option value="online">Virtual</option><option value="in_person">Presencial</option></select></div>
      <div className="form-field"><label htmlFor="course-start">Fecha de inicio</label><input id="course-start" type="date" {...courseForm.register('starts_on')}/></div>
      <div className="form-field"><label htmlFor="course-end">Fecha de finalización</label><input id="course-end" type="date" {...courseForm.register('ends_on')}/>{courseForm.formState.errors.ends_on && <small className="field-error">{courseForm.formState.errors.ends_on.message}</small>}</div>
      {courseMessage.startsWith('No se') && <div className="form-alert error-alert modal-error" role="alert">{courseMessage}</div>}<div className="modal-actions"><button className="modal-cancel" type="button" onClick={() => setCourseModalOpen(false)}>Cancelar</button><button className="modal-save" type="submit" disabled={courseSaving}>{courseSaving ? 'Guardando…' : editingCourse ? 'Guardar cambios' : 'Publicar curso'}<ArrowRight size={16}/></button></div>
    </form></Modal>}

    {uploadModalOpen && <Modal overline="BIBLIOTECA DEL CURSO" title="Subir material" intro="El material publicado aparecerá dentro del curso para los participantes." onClose={() => { if (uploadProgress === null) setUploadModalOpen(false) }}><form className="course-form" onSubmit={uploadMaterial}>
      <div className="form-field full-field"><label>Curso</label><select value={uploadCourseId} onChange={e => { setUploadCourseId(e.target.value); setUploadModuleId('') }} required><option value="">Selecciona un curso</option>{courses.map(course => <option key={course.id} value={course.id}>{course.name}</option>)}</select></div>
      <div className="form-field full-field"><label>Semana</label><select value={uploadModuleId} onChange={e => setUploadModuleId(e.target.value)}><option value="">Material general del curso</option>{uploadModules.map(module => <option key={module.id} value={module.id}>{module.title}</option>)}</select></div>
      <div className="form-field full-field"><label>Archivo</label><FileDrop accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.txt" hint="PDF, Word, PowerPoint, imágenes o texto. Hasta 50 MB." file={uploadFile} onFile={setUploadFile}/></div>
      <div className="form-field"><label>Título</label><input maxLength={160} value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} placeholder="Ej. Manual del participante"/></div>
      <div className="form-field"><label>Descripción</label><input maxLength={500} value={uploadDescription} onChange={e => setUploadDescription(e.target.value)} placeholder="Material de apoyo"/></div>
      {uploadProgress !== null && <div className="full-field"><ProgressBar value={uploadProgress} label="Subiendo material"/></div>}
      {uploadMessage && <div className="form-alert error-alert modal-error">{uploadMessage}</div>}
      <div className="modal-actions"><button type="button" className="modal-cancel" disabled={uploadProgress !== null} onClick={() => setUploadModalOpen(false)}>Cancelar</button><button className="modal-save" disabled={uploadProgress !== null}>{uploadProgress !== null ? 'Subiendo…' : 'Publicar material'} <ArrowRight size={15}/></button></div>
    </form></Modal>}
  </>
  return { openCreate: openCreateCourse, openEdit: openEditCourse, remove: deleteCourse, openUpload, modals }
}
