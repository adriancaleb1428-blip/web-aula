import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, BookOpen, CirclePlay, Clock, Pencil, Plus, Trash2, Upload, Video } from 'lucide-react'
import { backend } from '../lib/backend'
import { MAX_RECORDING_BYTES, asHttpsUrl, recordingMimeTypes, validateUpload } from '../lib/config'
import { uploadRecording as uploadRecordingFile } from '../lib/recordings'
import { friendlyDbError, isoToLimaInput, limaInputToIso, limaTime, meetingHref, orderedMeetings } from '../lib/format'
import type { Meeting, Recording } from '../lib/types'
import { EmptyState, FileDrop, Modal, ProgressBar, SectionHeader } from '../components/ui'
import { useAula } from '../context/AulaContext'
import { useFlash } from '../hooks/useFlash'

const emptyMeeting = { course_id: '', title: '', description: '', starts_at: '', ends_at: '', meeting_url: '' }

/** Clases en vivo programadas y grabaciones de las sesiones. */
export function MeetingsPage() {
  const { session, canManageContent, courses, courseName, meetings, setMeetings, refreshMeetings, recordings, setRecordings, sendAcademicNotification, bumpCourses, pushToast } = useAula()
  const [meetingModalOpen, setMeetingModalOpen] = useState(false)
  const [editingMeetingId, setEditingMeetingId] = useState('')
  const [meetingSaving, setMeetingSaving] = useState(false)
  const [meetingMessage, setMeetingMessage] = useFlash(pushToast, meetingModalOpen)
  const [meetingForm, setMeetingForm] = useState(emptyMeeting)
  const [recordingModalOpen, setRecordingModalOpen] = useState(false)
  const [recordingCourseId, setRecordingCourseId] = useState('')
  const [recordingFile, setRecordingFile] = useState<File | null>(null)
  const [recordingTitle, setRecordingTitle] = useState('')
  const [recordingDescription, setRecordingDescription] = useState('')
  const [recordingProgress, setRecordingProgress] = useState<number | null>(null)
  const [recordingMessage, setRecordingMessage] = useState('')
  const [recordingEdit, setRecordingEdit] = useState<{ id: string; title: string; description: string } | null>(null)
  const [recordingUrls, setRecordingUrls] = useState<Record<string, string>>({})

  function openMeetingModal(meeting?: Meeting) {
    setMeetingMessage('')
    if (meeting) { setEditingMeetingId(meeting.id); setMeetingForm({ course_id: meeting.course_id, title: meeting.title, description: meeting.description || '', starts_at: isoToLimaInput(meeting.starts_at), ends_at: isoToLimaInput(meeting.ends_at), meeting_url: meeting.meeting_url || '' }) }
    else { setEditingMeetingId(''); setMeetingForm({ ...emptyMeeting, course_id: courses[0]?.id || '' }) }
    setMeetingModalOpen(true)
  }
  async function saveMeeting(event: FormEvent) {
    event.preventDefault(); if (!backend) return
    const meetingUrl = asHttpsUrl(meetingForm.meeting_url)
    const startsAt = new Date(`${meetingForm.starts_at}:00-05:00`)
    const endsAt = new Date(`${meetingForm.ends_at}:00-05:00`)
    if (!meetingForm.course_id || meetingForm.title.trim().length < 3 || meetingForm.title.trim().length > 160) { setMeetingMessage('No se pudo guardar: indica un curso y un título de entre 3 y 160 caracteres.'); return }
    if (!meetingUrl) { setMeetingMessage('No se pudo guardar: usa un enlace HTTPS válido para la reunión.'); return }
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) { setMeetingMessage('No se pudo guardar: la hora de finalización debe ser posterior al inicio.'); return }
    setMeetingSaving(true); setMeetingMessage('')
    const fields = { course_id: meetingForm.course_id, title: meetingForm.title.trim(), description: meetingForm.description.trim().slice(0, 2000) || null, starts_at: limaInputToIso(meetingForm.starts_at), ends_at: limaInputToIso(meetingForm.ends_at), meeting_url: meetingUrl }
    if (editingMeetingId) {
      const { error } = await backend.from('meetings').update(fields).eq('id', editingMeetingId)
      setMeetingSaving(false)
      if (error) { setMeetingMessage(`No se pudo guardar: ${friendlyDbError(error)}`); return }
      setMeetingModalOpen(false); setMeetingMessage('Reunión actualizada.')
    } else {
      const { data: createdMeeting, error } = await backend.from('meetings').insert({ ...fields, room_name: 'Google Meet', organizer_id: session.user.id, status: 'scheduled' }).select('id').single()
      setMeetingSaving(false)
      if (error) { setMeetingMessage(`No se pudo programar: ${friendlyDbError(error)}`); return }
      if (createdMeeting) void sendAcademicNotification('meeting', createdMeeting.id)
      setMeetingModalOpen(false); setMeetingMessage('Reunión programada.')
    }
    await refreshMeetings()
  }
  async function deleteMeeting(meeting: Meeting) {
    if (!backend || !window.confirm(`¿Eliminar la reunión “${meeting.title}”?`)) return
    const { error } = await backend.from('meetings').delete().eq('id', meeting.id)
    if (error) { setMeetingMessage(`No se pudo eliminar la reunión: ${error.message}`); return }
    setMeetings(current => current.filter(item => item.id !== meeting.id)); setMeetingMessage('Reunión eliminada.')
  }

  // Recordings
  function openRecordingModal() { setRecordingCourseId(courses[0]?.id || ''); setRecordingFile(null); setRecordingTitle(''); setRecordingDescription(''); setRecordingProgress(null); setRecordingMessage(''); setRecordingModalOpen(true) }
  async function uploadRecording(event: FormEvent) {
    event.preventDefault(); if (!backend || !recordingCourseId) return
    if (!recordingFile) { setRecordingMessage('Elige el video de la clase.'); return }
    const validationError = validateUpload(recordingFile, recordingMimeTypes, MAX_RECORDING_BYTES, 'grabaciones')
    if (validationError) { setRecordingMessage(validationError); return }
    setRecordingProgress(0); setRecordingMessage('')
    const uploaded = await uploadRecordingFile(recordingCourseId, recordingFile, setRecordingProgress)
    if (uploaded.error) { setRecordingProgress(null); setRecordingMessage(`No se pudo subir: ${uploaded.error}`); return }
    const path = uploaded.path
    const { data: createdRecording, error } = await backend.from('course_recordings').insert({ course_id: recordingCourseId, title: (recordingTitle.trim() || recordingFile.name).slice(0, 160), description: recordingDescription.trim().slice(0, 500) || null, storage_path: path, mime_type: recordingFile.type, uploaded_by: session.user.id }).select('id').single()
    setRecordingProgress(null)
    if (error) { setRecordingMessage(`El video se subió, pero no se registró: ${error.message}`); return }
    if (createdRecording) void sendAcademicNotification('recording', createdRecording.id)
    setRecordingModalOpen(false); setMeetingMessage('Grabación publicada para los participantes.'); bumpCourses()
  }
  async function saveRecordingEdit(event: FormEvent) {
    event.preventDefault(); if (!backend || !recordingEdit || !recordingEdit.title.trim()) return
    const { error } = await backend.from('course_recordings').update({ title: recordingEdit.title.trim().slice(0, 160), description: recordingEdit.description.trim().slice(0, 500) || null }).eq('id', recordingEdit.id)
    if (error) { setMeetingMessage(`No se pudo actualizar la grabación: ${error.message}`); return }
    setRecordingEdit(null); setMeetingMessage('Grabación actualizada.'); bumpCourses()
  }
  async function showRecording(recording: Recording) {
    if (!backend) return
    const { data, error } = await backend.storage.from('course-recordings').createSignedUrl(recording.storage_path, 3600)
    if (error || !data?.signedUrl) { setMeetingMessage(`No se pudo abrir la grabación: ${error?.message || 'archivo no disponible'}`); return }
    setRecordingUrls(current => ({ ...current, [recording.id]: data.signedUrl }))
  }
  async function deleteRecording(recording: Recording) {
    if (!backend || !window.confirm(`¿Eliminar la grabación “${recording.title}”?`)) return
    const { error: storageError } = await backend.storage.from('course-recordings').remove([recording.storage_path])
    if (storageError) { setMeetingMessage(`No se pudo eliminar el video: ${storageError.message}`); return }
    const { error } = await backend.from('course_recordings').delete().eq('id', recording.id)
    if (error) { setMeetingMessage(`No se pudo eliminar la grabación: ${error.message}`); return }
    setRecordings(current => current.filter(item => item.id !== recording.id)); setMeetingMessage('Grabación eliminada.')
  }


  return <>
        <div className="page-stack">
          
          <section className="section-card feature-page">
            <SectionHeader icon={Video} overline="SESIONES EN VIVO" title="Clases programadas">{canManageContent && <button className="create-course-button" onClick={() => openMeetingModal()}><Plus size={15}/> Programar reunión</button>}</SectionHeader>
            <p className="section-intro">{canManageContent ? 'Programa clases con Google Meet u otra plataforma. Los participantes verán la fecha, la hora de Lima y el botón para unirse hasta que la sesión termine.' : 'Aquí encontrarás tus próximas clases en vivo. El botón para unirte estará disponible hasta que termine cada sesión.'}</p>
            {meetings.length ? <div className="meeting-list">{orderedMeetings(meetings).map(meeting => { const expired = new Date(meeting.ends_at).getTime() <= Date.now(); const href = meetingHref(meeting); return <article className={`meeting-card ${expired ? 'is-expired' : ''}`} key={meeting.id}>
              <div className="meeting-date"><strong>{limaTime(meeting.starts_at, { day: '2-digit', month: 'short' })}</strong><small>{limaTime(meeting.starts_at, { hour: '2-digit', minute: '2-digit' })}</small></div>
              <div className="meeting-copy"><strong>{meeting.title}</strong><small><BookOpen size={12}/> {courseName(meeting.course_id)} <i/> <Clock size={12}/> {limaTime(meeting.starts_at, { hour: '2-digit', minute: '2-digit' })} – {limaTime(meeting.ends_at, { hour: '2-digit', minute: '2-digit' })}</small><p>{expired ? 'Esta clase ya finalizó.' : (meeting.description || 'Sesión de capacitación en vivo.')}</p></div>
              <div className="meeting-actions">{expired ? <span className="meeting-expired">Finalizada</span> : href ? <a className="modal-save meeting-link" href={href} target="_blank" rel="noopener noreferrer">Entrar a clase <ArrowRight size={14}/></a> : <span className="meeting-expired">Enlace no válido</span>}
                {canManageContent && <><button className="icon-button" aria-label="Editar reunión" title="Editar reunión" onClick={() => openMeetingModal(meeting)}><Pencil size={16}/></button><button className="icon-button delete-action" aria-label="Eliminar reunión" title={expired ? 'Eliminar reunión finalizada' : 'Cancelar reunión'} onClick={() => void deleteMeeting(meeting)}><Trash2 size={16}/></button></>}</div>
            </article> })}</div> : <EmptyState title="No hay reuniones programadas" text={canManageContent ? 'Programa la primera clase para que aparezca en este calendario.' : 'Las sesiones aparecerán aquí cuando el equipo de capacitación las publique.'} icon={Video}/>}
          </section>
          <section className="section-card feature-page">
            <span id="grabaciones" className="scroll-anchor"/><SectionHeader icon={CirclePlay} overline="CLASES GRABADAS" title="Grabaciones de clases">{canManageContent && <button className="create-course-button" onClick={openRecordingModal}><Upload size={15}/> Publicar grabación</button>}</SectionHeader>
            <p className="section-intro">Vuelve a ver las sesiones cuando lo necesites. Las grabaciones solo están disponibles para los participantes del curso.</p>
            {recordings.length ? <div className="recording-grid">{recordings.map(item => <article className="recording-tile" key={item.id}>
              <div className="recording-media">{recordingUrls[item.id] ? <video controls autoPlay playsInline preload="metadata" src={recordingUrls[item.id]}/> : <button className="recording-play" onClick={() => void showRecording(item)} aria-label={`Reproducir ${item.title}`}><CirclePlay size={42} strokeWidth={1.4}/><span>Reproducir</span></button>}</div>
              <div className="recording-body"><strong>{item.title}</strong><small>{courseName(item.course_id)} · {new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(item.created_at))}</small>{item.description && <p>{item.description}</p>}</div>
              {canManageContent && <div className="recording-tools"><button className="icon-button" aria-label="Editar grabación" title="Editar" onClick={() => setRecordingEdit({ id: item.id, title: item.title, description: item.description || '' })}><Pencil size={15}/></button><button className="icon-button delete-action" aria-label="Eliminar grabación" title="Eliminar" onClick={() => void deleteRecording(item)}><Trash2 size={15}/></button></div>}
            </article>)}</div> : <EmptyState title="Aún no hay grabaciones" text="Las grabaciones aparecerán aquí cuando se publiquen." icon={CirclePlay}/>}
          </section>
        </div>

    {meetingModalOpen && <Modal overline="CAPACITACIÓN EN VIVO" title={editingMeetingId ? 'Editar reunión' : 'Programar reunión'} intro="Indica la fecha, el horario (hora de Lima) y el enlace de Google Meet u otra plataforma." onClose={() => setMeetingModalOpen(false)}><form className="course-form" onSubmit={saveMeeting}>
      <div className="form-field full-field"><label>Curso</label><select value={meetingForm.course_id} onChange={event => setMeetingForm({ ...meetingForm, course_id: event.target.value })} required><option value="">Selecciona un curso</option>{courses.map(course => <option value={course.id} key={course.id}>{course.name}</option>)}</select></div>
      <div className="form-field full-field"><label>Título de la clase</label><input maxLength={160} value={meetingForm.title} onChange={event => setMeetingForm({ ...meetingForm, title: event.target.value })} placeholder="Ej. Sesión 1: Introducción" required/></div>
      <div className="form-field"><label>Inicio</label><input type="datetime-local" value={meetingForm.starts_at} onChange={event => setMeetingForm({ ...meetingForm, starts_at: event.target.value })} required/></div>
      <div className="form-field"><label>Fin</label><input type="datetime-local" value={meetingForm.ends_at} onChange={event => setMeetingForm({ ...meetingForm, ends_at: event.target.value })} required/></div>
      <div className="form-field full-field"><label>Enlace de reunión</label><input type="url" value={meetingForm.meeting_url} onChange={event => setMeetingForm({ ...meetingForm, meeting_url: event.target.value })} placeholder="https://meet.google.com/..." required/></div>
      <div className="form-field full-field"><label>Descripción</label><textarea rows={2} maxLength={2000} value={meetingForm.description} onChange={event => setMeetingForm({ ...meetingForm, description: event.target.value })} placeholder="Información para los participantes"/></div>
      {meetingMessage.startsWith('No se') && <div className="form-alert error-alert modal-error">{meetingMessage}</div>}
      <div className="modal-actions"><button className="modal-cancel" type="button" onClick={() => setMeetingModalOpen(false)}>Cancelar</button><button className="modal-save" type="submit" disabled={meetingSaving}>{meetingSaving ? 'Guardando…' : editingMeetingId ? 'Guardar cambios' : 'Programar clase'}<ArrowRight size={16}/></button></div>
    </form></Modal>}

    {recordingModalOpen && <Modal overline="CLASES GRABADAS" title="Publicar grabación" intro="Sube el video de la clase para que los participantes del curso puedan verlo cuando quieran." onClose={() => { if (recordingProgress === null) setRecordingModalOpen(false) }} wide><form className="course-form" onSubmit={uploadRecording}>
      <div className="form-field full-field"><FileDrop large accept="video/mp4,video/webm,video/quicktime" hint="MP4, WebM o MOV · sin límite de tamaño" file={recordingFile} onFile={file => { setRecordingFile(file); if (file && !recordingTitle) setRecordingTitle(file.name.replace(/\.[^.]+$/, '').slice(0, 160)) }}/></div>
      <div className="form-field"><label>Curso</label><select value={recordingCourseId} onChange={e => setRecordingCourseId(e.target.value)} required><option value="">Selecciona un curso</option>{courses.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select></div>
      <div className="form-field"><label>Título</label><input maxLength={160} value={recordingTitle} onChange={e => setRecordingTitle(e.target.value)} placeholder="Ej. Sesión 2: Finanzas para emprender" required/></div>
      <div className="form-field full-field"><label>Descripción</label><textarea rows={2} maxLength={500} value={recordingDescription} onChange={e => setRecordingDescription(e.target.value)} placeholder="Temas que se trataron en la sesión"/></div>
      {recordingProgress !== null && <div className="full-field"><ProgressBar value={recordingProgress} label="Subiendo video"/></div>}
      {recordingMessage && <div className="form-alert error-alert modal-error">{recordingMessage}</div>}
      <div className="modal-actions"><button type="button" className="modal-cancel" disabled={recordingProgress !== null} onClick={() => setRecordingModalOpen(false)}>Cancelar</button><button className="modal-save" disabled={recordingProgress !== null}>{recordingProgress !== null ? 'Subiendo…' : 'Publicar grabación'} <ArrowRight size={15}/></button></div>
    </form></Modal>}

    {recordingEdit && <Modal overline="CLASES GRABADAS" title="Editar grabación" onClose={() => setRecordingEdit(null)}><form className="course-form" onSubmit={saveRecordingEdit}>
      <div className="form-field full-field"><label>Título</label><input maxLength={160} value={recordingEdit.title} onChange={e => setRecordingEdit({ ...recordingEdit, title: e.target.value })} required/></div>
      <div className="form-field full-field"><label>Descripción</label><textarea rows={2} maxLength={500} value={recordingEdit.description} onChange={e => setRecordingEdit({ ...recordingEdit, description: e.target.value })}/></div>
      <div className="modal-actions"><button type="button" className="modal-cancel" onClick={() => setRecordingEdit(null)}>Cancelar</button><button className="modal-save">Guardar cambios</button></div>
    </form></Modal>}
  </>
}
