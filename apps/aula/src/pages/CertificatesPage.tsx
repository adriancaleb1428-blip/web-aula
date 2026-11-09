import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowDown, Award, Eye, Trash2 } from 'lucide-react'
import { backend } from '../lib/backend'
import { MAX_CERTIFICATE_BYTES, certificateMimeTypes, safeFileName, validateUpload } from '../lib/config'
import type { Certificate, StudentProfile } from '../lib/types'
import { EmptyState, FileDrop, SectionHeader } from '../components/ui'
import { useAula } from '../context/AulaContext'
import { useFlash } from '../hooks/useFlash'

/** Certificados: los participantes los consultan; el personal los emite. */
export function CertificatesPage() {
  const { session, role, canManageContent, courses, courseName, certificates, setCertificates, setPreview, downloadFile, bumpCourses, pushToast } = useAula()
  const [studentProfiles, setStudentProfiles] = useState<StudentProfile[]>([])
  const [certificateFile, setCertificateFile] = useState<File | null>(null)
  const [certificateStudent, setCertificateStudent] = useState('')
  const [certificateCourse, setCertificateCourse] = useState('')
  const [certificateTitle, setCertificateTitle] = useState('')
  const [certificateNumber, setCertificateNumber] = useState('')
  const [certificateBusy, setCertificateBusy] = useState(false)
  const [, setCertificateMessage] = useFlash(pushToast)

  useEffect(() => {
    if (!backend || role === 'student') return
    backend.from('profiles').select('id, full_name').eq('role', 'student').then(({ data }) => setStudentProfiles((data || []) as StudentProfile[]))
  }, [role])

  async function issueCertificate(event: FormEvent) {
    event.preventDefault(); if (!backend || !certificateCourse || !certificateStudent) return
    if (!certificateFile) { setCertificateMessage('Elige el PDF del certificado.'); return }
    const certificateError = validateUpload(certificateFile, certificateMimeTypes, MAX_CERTIFICATE_BYTES, 'certificados')
    if (certificateError) { setCertificateMessage(certificateError); return }
    setCertificateBusy(true)
    const path = `${certificateCourse}/${certificateStudent}/${crypto.randomUUID()}-${safeFileName(certificateFile.name)}`
    const { error: storageError } = await backend.storage.from('course-certificates').upload(path, certificateFile, { contentType: 'application/pdf' })
    if (storageError) { setCertificateBusy(false); setCertificateMessage(`No se pudo subir el PDF: ${storageError.message}`); return }
    const { error } = await backend.from('course_certificates').insert({ course_id: certificateCourse, student_id: certificateStudent, title: (certificateTitle.trim() || certificateFile.name).slice(0, 160), certificate_number: certificateNumber.trim() || null, storage_path: path, issued_by: session.user.id })
    setCertificateBusy(false)
    if (error) { await backend.storage.from('course-certificates').remove([path]); setCertificateMessage(`No se pudo registrar el certificado: ${error.message}`); return }
    setCertificateMessage('Certificado publicado.'); setCertificateFile(null); setCertificateTitle(''); setCertificateNumber(''); bumpCourses()
  }
  async function deleteCertificate(certificate: Certificate) {
    if (!backend || !window.confirm(`¿Eliminar el certificado “${certificate.title}”?`)) return
    const { error: storageError } = await backend.storage.from('course-certificates').remove([certificate.storage_path])
    if (storageError) { setCertificateMessage(`No se pudo eliminar el PDF: ${storageError.message}`); return }
    const { error } = await backend.from('course_certificates').delete().eq('id', certificate.id)
    if (error) { setCertificateMessage(`No se pudo eliminar el certificado: ${error.message}`); return }
    setCertificates(current => current.filter(item => item.id !== certificate.id)); setCertificateMessage('Certificado eliminado.')
  }


  return <>
        <section className="section-card feature-page">
          <SectionHeader icon={Award} overline="CONSTANCIAS Y CERTIFICADOS" title="Certificaciones"/>
          
          {certificates.length ? <div className="certificate-grid">{certificates.map(item => <article className="certificate-tile" key={item.id}><span className="certificate-seal"><Award size={22}/></span><div><strong>{item.title}</strong><small>{courseName(item.course_id)}{item.certificate_number ? ` · N.º ${item.certificate_number}` : ''}</small><small>Emitido el {new Intl.DateTimeFormat('es-PE', { dateStyle: 'long' }).format(new Date(item.issued_at))}</small></div><div className="certificate-actions"><button className="material-action" onClick={() => setPreview({ bucket: 'course-certificates', path: item.storage_path, title: item.title, mimeType: 'application/pdf' })}><Eye size={14}/> Ver</button><button className="material-action" onClick={() => void downloadFile('course-certificates', item.storage_path, item.title, setCertificateMessage)}><ArrowDown size={14}/> Descargar</button>{canManageContent && <button className="icon-button delete-action" aria-label="Eliminar certificado" onClick={() => void deleteCertificate(item)}><Trash2 size={16}/></button>}</div></article>)}</div> : <EmptyState title="Aún no tienes certificados" text="Cuando se publique uno, podrás verlo y descargarlo aquí." icon={Award}/>}
          {canManageContent && <form className="upload-inline-form" onSubmit={issueCertificate}><h3>Emitir certificado a un participante</h3><div className="upload-grid"><div className="form-field"><label>Curso</label><select value={certificateCourse} onChange={e => { setCertificateCourse(e.target.value); setCertificateStudent('') }} required><option value="">Selecciona curso</option>{courses.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select></div><div className="form-field"><label>Participante</label><select value={certificateStudent} onChange={e => setCertificateStudent(e.target.value)} required><option value="">Selecciona participante</option>{studentProfiles.map(u => <option value={u.id} key={u.id}>{u.full_name || u.id}</option>)}</select></div><div className="form-field"><label>Título</label><input maxLength={160} value={certificateTitle} onChange={e => setCertificateTitle(e.target.value)} placeholder="Ej. Certificado de participación"/></div><div className="form-field"><label>Número</label><input maxLength={60} value={certificateNumber} onChange={e => setCertificateNumber(e.target.value)}/></div><div className="form-field full-field"><label>Archivo PDF</label><FileDrop accept="application/pdf,.pdf" hint="Solo PDF, hasta 20 MB." file={certificateFile} onFile={setCertificateFile}/></div></div><button className="modal-save" disabled={certificateBusy}>{certificateBusy ? 'Publicando…' : 'Publicar certificado'}</button></form>}
        </section>
  </>
}
