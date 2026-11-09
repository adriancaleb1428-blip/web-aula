import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, Pencil, Search, Trash2, UserPlus, Users } from 'lucide-react'
import { backend } from '../lib/backend'
import { PROFILE_FIELDS, roleNames } from '../lib/types'
import type { AdminUser, Profile, Role } from '../lib/types'
import { Modal, PasswordInput, SectionHeader } from '../components/ui'
import { Avatar } from '../components/ProfilePage'
import { SupportRequests } from '../components/SupportRequests'
import { useAula } from '../context/AulaContext'

/** Administración: usuarios, matrículas, facilitadores y solicitudes de ayuda. */
export function AdminPage() {
  const { session, courses, adminUsers, setAdminUsers, setAdminMessage, adminBusy, setAdminBusy, refreshAdminUsers, onProfileChange, pushToast } = useAula()
  const [userForm, setUserForm] = useState({ full_name: '', email: '', password: '', role: 'student' as Role })
  const [userEdit, setUserEdit] = useState<{ id: string; full_name: string; email: string; role: Role; password: string } | null>(null)
  const [userEditMessage, setUserEditMessage] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [enrollmentForm, setEnrollmentForm] = useState({ student_id: '', course_id: '' })
  const [instructorForm, setInstructorForm] = useState({ instructor_id: '', course_id: '' })
  const filteredUsers = adminUsers.filter(user => `${user.full_name} ${user.email} ${user.company || ''}`.toLowerCase().includes(userSearch.toLowerCase()))

  async function createUser(event: FormEvent) {
    event.preventDefault(); if (!backend) return
    setAdminBusy(true); setAdminMessage('')
    const { data, error } = await backend.functions.invoke('admin-users', { body: { action: 'create', ...userForm } })
    setAdminBusy(false)
    if (error || data?.error) { setAdminMessage(`No se pudo crear: ${data?.error || 'revisa los datos e inténtalo de nuevo.'}`); return }
    setAdminMessage(`Usuario ${userForm.email} creado como ${roleNames[userForm.role]}.`); setUserForm({ full_name: '', email: '', password: '', role: 'student' })
    await refreshAdminUsers()
  }
  async function changeUserRole(id: string, nextRole: Role) {
    if (!backend) return
    const { data, error } = await backend.functions.invoke('admin-users', { body: { action: 'role', user_id: id, role: nextRole } })
    if (error || data?.error) { setAdminMessage(`No se pudo actualizar el rol: ${data?.error || 'inténtalo de nuevo.'}`); return }
    setAdminUsers(users => users.map(user => user.id === id ? { ...user, role: nextRole } : user)); setAdminMessage('Rol actualizado.')
    if (id === session.user.id) { const { data: currentProfile } = await backend.from('profiles').select(PROFILE_FIELDS).eq('id', id).single(); if (currentProfile) onProfileChange(currentProfile as Profile) }
  }
  async function saveUserEdit(event: FormEvent) {
    event.preventDefault(); if (!backend || !userEdit) return
    setAdminBusy(true); setUserEditMessage('')
    const { data, error } = await backend.functions.invoke('admin-users', { body: { action: 'update', user_id: userEdit.id, full_name: userEdit.full_name, email: userEdit.email, role: userEdit.role, password: userEdit.password || undefined } })
    setAdminBusy(false)
    if (error || data?.error) { setUserEditMessage(data?.error || 'No se pudo actualizar el usuario.'); return }
    setUserEdit(null); setAdminMessage('Usuario actualizado.')
    await refreshAdminUsers()
  }
  async function deleteUser(user: AdminUser) {
    if (!backend || !window.confirm(`¿Eliminar la cuenta de ${user.full_name || user.email}? Perderá el acceso al aula. Los cursos, materiales y reuniones que haya creado pasarán a tu cuenta.`)) return
    setAdminBusy(true)
    const { data, error } = await backend.functions.invoke('admin-users', { body: { action: 'delete', user_id: user.id } })
    setAdminBusy(false)
    if (error || data?.error) { setAdminMessage(`No se pudo eliminar: ${data?.error || 'inténtalo de nuevo.'}`); return }
    setAdminUsers(current => current.filter(item => item.id !== user.id)); setAdminMessage('Usuario eliminado.')
  }
  async function enrollStudent(event: FormEvent) {
    event.preventDefault(); if (!backend || !enrollmentForm.student_id || !enrollmentForm.course_id) return
    const { error } = await backend.from('enrollments').upsert({ student_id: enrollmentForm.student_id, course_id: enrollmentForm.course_id, status: 'active' }, { onConflict: 'student_id,course_id' })
    if (error) { setAdminMessage(`No se pudo matricular: ${error.message}`); return }
    const student = adminUsers.find(user => user.id === enrollmentForm.student_id), course = courses.find(item => item.id === enrollmentForm.course_id)
    setAdminMessage(`${student?.full_name || student?.email || 'El participante'} quedó matriculado en ${course?.name || 'el curso'}.`); setEnrollmentForm({ student_id: '', course_id: '' })
  }
  async function assignInstructor(event: FormEvent) {
    event.preventDefault(); if (!backend || !instructorForm.instructor_id || !instructorForm.course_id) return
    const { error } = await backend.from('course_instructors').upsert({ course_id: instructorForm.course_id, instructor_id: instructorForm.instructor_id, can_manage: true, can_create_courses: false }, { onConflict: 'course_id,instructor_id' })
    if (error) { setAdminMessage(`No se pudo asignar al facilitador: ${error.message}`); return }
    const teacher = adminUsers.find(user => user.id === instructorForm.instructor_id), course = courses.find(item => item.id === instructorForm.course_id)
    setAdminMessage(`${teacher?.full_name || teacher?.email || 'El facilitador'} ya puede gestionar las clases y materiales de ${course?.name || 'el curso'}.`); setInstructorForm({ instructor_id: '', course_id: '' })
  }


  return <>
        <div className="page-stack">
          <SupportRequests onMessage={pushToast}/>
          
          <section className="section-card feature-page">
            <SectionHeader icon={UserPlus} overline="ACCESOS Y PERFILES" title="Crear usuario"/>
            <form className="admin-user-form" onSubmit={createUser}><div className="form-field"><label>Nombre</label><input maxLength={120} value={userForm.full_name} onChange={e => setUserForm({ ...userForm, full_name: e.target.value })} required/></div><div className="form-field"><label>Correo</label><input type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} required/></div><div className="form-field"><label>Contraseña inicial</label><PasswordInput value={userForm.password} onChange={password => setUserForm({ ...userForm, password })} required/></div><div className="form-field"><label>Rol</label><select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value as Role })}><option value="student">{roleNames.student}</option><option value="teacher">{roleNames.teacher}</option><option value="admin">{roleNames.admin}</option></select></div><button className="modal-save" disabled={adminBusy}>Crear usuario <ArrowRight size={15}/></button></form>
          </section>
          <section className="section-card feature-page">
            <SectionHeader icon={Users} overline={`${adminUsers.length} CUENTAS`} title="Usuarios registrados"><label className="course-search"><Search size={16}/><input placeholder="Buscar usuario" value={userSearch} onChange={e => setUserSearch(e.target.value)}/></label></SectionHeader>
            {adminBusy && <p className="admin-loading">Actualizando usuarios…</p>}
            <div className="admin-users-list">{filteredUsers.map(user => <div className="admin-user-row" key={user.id}>
              <Avatar src="" name={user.full_name || user.email}/>
              <span className="admin-user-copy"><strong>{user.full_name || user.email}{user.id === session.user.id && <em> (tú)</em>}</strong><small>{user.email}</small>{(user.company || user.phone) && <small>{[user.company, user.job_title, user.phone].filter(Boolean).join(' · ')}</small>}</span>
              <select aria-label={`Rol de ${user.full_name || user.email}`} value={user.role} onChange={e => void changeUserRole(user.id, e.target.value as Role)}><option value="student">{roleNames.student}</option><option value="teacher">{roleNames.teacher}</option><option value="admin">{roleNames.admin}</option></select>
              <div className="admin-user-tools"><button className="icon-button" aria-label={`Editar ${user.full_name || user.email}`} title="Editar usuario" onClick={() => { setUserEditMessage(''); setUserEdit({ id: user.id, full_name: user.full_name, email: user.email, role: user.role, password: '' }) }}><Pencil size={16}/></button>{user.id !== session.user.id && <button className="icon-button delete-action" aria-label={`Eliminar ${user.full_name || user.email}`} title="Eliminar usuario" onClick={() => void deleteUser(user)}><Trash2 size={16}/></button>}</div>
            </div>)}{!filteredUsers.length && <p className="materials-empty">No hay usuarios que coincidan con la búsqueda.</p>}</div>
          </section>
          <section className="section-card feature-page admin-forms-grid">
            <form className="admin-enrollment-form" onSubmit={enrollStudent}><h3>Matricular participante</h3><div className="form-field"><label>Participante</label><select value={enrollmentForm.student_id} onChange={e => setEnrollmentForm({ ...enrollmentForm, student_id: e.target.value })} required><option value="">Selecciona participante</option>{adminUsers.filter(u => u.role === 'student').map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}</select></div><div className="form-field"><label>Curso</label><select value={enrollmentForm.course_id} onChange={e => setEnrollmentForm({ ...enrollmentForm, course_id: e.target.value })} required><option value="">Selecciona curso</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><button className="modal-save">Matricular <ArrowRight size={15}/></button></form>
            <form className="admin-enrollment-form" onSubmit={assignInstructor}><h3>Asignar facilitador a curso</h3><div className="form-field"><label>Facilitador</label><select value={instructorForm.instructor_id} onChange={e => setInstructorForm({ ...instructorForm, instructor_id: e.target.value })} required><option value="">Selecciona facilitador</option>{adminUsers.filter(u => u.role === 'teacher').map(u => <option key={u.id} value={u.id}>{u.full_name || u.email} · {u.email}</option>)}</select></div><div className="form-field"><label>Curso</label><select value={instructorForm.course_id} onChange={e => setInstructorForm({ ...instructorForm, course_id: e.target.value })} required><option value="">Selecciona curso</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><button className="modal-save">Asignar facilitador <ArrowRight size={15}/></button></form>
          </section>
        </div>

    {userEdit && <Modal overline="ACCESOS Y PERFILES" title="Editar usuario" intro="Deja la contraseña en blanco para mantener la actual." onClose={() => setUserEdit(null)}><form className="course-form" onSubmit={saveUserEdit}>
      <div className="form-field"><label>Nombre</label><input maxLength={120} value={userEdit.full_name} onChange={e => setUserEdit({ ...userEdit, full_name: e.target.value })} required/></div>
      <div className="form-field"><label>Correo</label><input type="email" value={userEdit.email} onChange={e => setUserEdit({ ...userEdit, email: e.target.value })} required/></div>
      <div className="form-field"><label>Rol</label><select value={userEdit.role} disabled={userEdit.id === session.user.id} onChange={e => setUserEdit({ ...userEdit, role: e.target.value as Role })}><option value="student">{roleNames.student}</option><option value="teacher">{roleNames.teacher}</option><option value="admin">{roleNames.admin}</option></select></div>
      <div className="form-field"><label>Nueva contraseña (opcional)</label><PasswordInput value={userEdit.password} onChange={password => setUserEdit({ ...userEdit, password })}/></div>
      {userEditMessage && <div className="form-alert error-alert modal-error">{userEditMessage}</div>}
      <div className="modal-actions"><button type="button" className="modal-cancel" onClick={() => setUserEdit(null)}>Cancelar</button><button className="modal-save" disabled={adminBusy}>{adminBusy ? 'Guardando…' : 'Guardar cambios'}</button></div>
    </form></Modal>}
  </>
}
