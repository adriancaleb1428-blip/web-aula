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
  const [userForm, setUserForm] = useState({ nombre_completo: '', correo: '', contrasena: '', rol: 'participante' as Role })
  const [userEdit, setUserEdit] = useState<{ id: string; nombre_completo: string; correo: string; rol: Role; contrasena: string } | null>(null)
  const [userEditMessage, setUserEditMessage] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [enrollmentForm, setEnrollmentForm] = useState({ participante_id: '', curso_id: '' })
  const [instructorForm, setInstructorForm] = useState({ facilitador_id: '', curso_id: '' })
  const filteredUsers = adminUsers.filter(user => `${user.nombre_completo} ${user.correo} ${user.empresa || ''}`.toLowerCase().includes(userSearch.toLowerCase()))

  async function createUser(event: FormEvent) {
    event.preventDefault(); if (!backend) return
    setAdminBusy(true); setAdminMessage('')
    const { data, error } = await backend.functions.invoke('admin-usuarios', { body: { accion: 'crear', ...userForm } })
    setAdminBusy(false)
    if (error || data?.error) { setAdminMessage(`No se pudo crear: ${data?.error || 'revisa los datos e inténtalo de nuevo.'}`); return }
    setAdminMessage(`Usuario ${userForm.correo} creado como ${roleNames[userForm.rol]}.`); setUserForm({ nombre_completo: '', correo: '', contrasena: '', rol: 'participante' })
    await refreshAdminUsers()
  }
  async function changeUserRole(id: string, nextRole: Role) {
    if (!backend) return
    const { data, error } = await backend.functions.invoke('admin-usuarios', { body: { accion: 'rol', usuario_id: id, rol: nextRole } })
    if (error || data?.error) { setAdminMessage(`No se pudo actualizar el rol: ${data?.error || 'inténtalo de nuevo.'}`); return }
    setAdminUsers(users => users.map(user => user.id === id ? { ...user, rol: nextRole } : user)); setAdminMessage('Rol actualizado.')
    if (id === session.user.id) { const { data: currentProfile } = await backend.from('perfiles').select(PROFILE_FIELDS).eq('id', id).single(); if (currentProfile) onProfileChange(currentProfile as Profile) }
  }
  async function saveUserEdit(event: FormEvent) {
    event.preventDefault(); if (!backend || !userEdit) return
    setAdminBusy(true); setUserEditMessage('')
    const { data, error } = await backend.functions.invoke('admin-usuarios', { body: { accion: 'actualizar', usuario_id: userEdit.id, nombre_completo: userEdit.nombre_completo, correo: userEdit.correo, rol: userEdit.rol, contrasena: userEdit.contrasena || undefined } })
    setAdminBusy(false)
    if (error || data?.error) { setUserEditMessage(data?.error || 'No se pudo actualizar el usuario.'); return }
    setUserEdit(null); setAdminMessage('Usuario actualizado.')
    await refreshAdminUsers()
  }
  async function deleteUser(user: AdminUser) {
    if (!backend || !window.confirm(`¿Eliminar la cuenta de ${user.nombre_completo || user.correo}? Perderá el acceso al aula. Los cursos, materiales y reuniones que haya creado pasarán a tu cuenta.`)) return
    setAdminBusy(true)
    const { data, error } = await backend.functions.invoke('admin-usuarios', { body: { accion: 'eliminar', usuario_id: user.id } })
    setAdminBusy(false)
    if (error || data?.error) { setAdminMessage(`No se pudo eliminar: ${data?.error || 'inténtalo de nuevo.'}`); return }
    setAdminUsers(current => current.filter(item => item.id !== user.id)); setAdminMessage('Usuario eliminado.')
  }
  async function enrollStudent(event: FormEvent) {
    event.preventDefault(); if (!backend || !enrollmentForm.participante_id || !enrollmentForm.curso_id) return
    const { error } = await backend.from('matriculas').upsert({ participante_id: enrollmentForm.participante_id, curso_id: enrollmentForm.curso_id, estado: 'activa' }, { onConflict: 'participante_id,curso_id' })
    if (error) { setAdminMessage(`No se pudo matricular: ${error.message}`); return }
    const student = adminUsers.find(user => user.id === enrollmentForm.participante_id), course = courses.find(item => item.id === enrollmentForm.curso_id)
    setAdminMessage(`${student?.nombre_completo || student?.correo || 'El participante'} quedó matriculado en ${course?.nombre || 'el curso'}.`); setEnrollmentForm({ participante_id: '', curso_id: '' })
  }
  async function assignInstructor(event: FormEvent) {
    event.preventDefault(); if (!backend || !instructorForm.facilitador_id || !instructorForm.curso_id) return
    const { error } = await backend.from('curso_facilitadores').upsert({ curso_id: instructorForm.curso_id, facilitador_id: instructorForm.facilitador_id, puede_gestionar: true, puede_crear_cursos: false }, { onConflict: 'curso_id,facilitador_id' })
    if (error) { setAdminMessage(`No se pudo asignar al facilitador: ${error.message}`); return }
    const teacher = adminUsers.find(user => user.id === instructorForm.facilitador_id), course = courses.find(item => item.id === instructorForm.curso_id)
    setAdminMessage(`${teacher?.nombre_completo || teacher?.correo || 'El facilitador'} ya puede gestionar las clases y materiales de ${course?.nombre || 'el curso'}.`); setInstructorForm({ facilitador_id: '', curso_id: '' })
  }


  return <>
        <div className="page-stack">
          <SupportRequests onMessage={pushToast}/>
          
          <section className="section-card feature-page">
            <SectionHeader icon={UserPlus} overline="ACCESOS Y PERFILES" title="Crear usuario"/>
            <form className="admin-user-form" onSubmit={createUser}><div className="form-field"><label>Nombre</label><input maxLength={120} value={userForm.nombre_completo} onChange={e => setUserForm({ ...userForm, nombre_completo: e.target.value })} required/></div><div className="form-field"><label>Correo</label><input type="email" value={userForm.correo} onChange={e => setUserForm({ ...userForm, correo: e.target.value })} required/></div><div className="form-field"><label>Contraseña inicial</label><PasswordInput value={userForm.contrasena} onChange={password => setUserForm({ ...userForm, contrasena: password })} required/></div><div className="form-field"><label>Rol</label><select value={userForm.rol} onChange={e => setUserForm({ ...userForm, rol: e.target.value as Role })}><option value="student">{roleNames.participante}</option><option value="teacher">{roleNames.facilitador}</option><option value="admin">{roleNames.administrador}</option></select></div><button className="modal-save" disabled={adminBusy}>Crear usuario <ArrowRight size={15}/></button></form>
          </section>
          <section className="section-card feature-page">
            <SectionHeader icon={Users} overline={`${adminUsers.length} CUENTAS`} title="Usuarios registrados"><label className="course-search"><Search size={16}/><input placeholder="Buscar usuario" value={userSearch} onChange={e => setUserSearch(e.target.value)}/></label></SectionHeader>
            {adminBusy && <p className="admin-loading">Actualizando usuarios…</p>}
            <div className="admin-users-list">{filteredUsers.map(user => <div className="admin-user-row" key={user.id}>
              <Avatar src="" name={user.nombre_completo || user.correo}/>
              <span className="admin-user-copy"><strong>{user.nombre_completo || user.correo}{user.id === session.user.id && <em> (tú)</em>}</strong><small>{user.correo}</small>{(user.empresa || user.telefono) && <small>{[user.empresa, user.cargo, user.telefono].filter(Boolean).join(' · ')}</small>}</span>
              <select aria-label={`Rol de ${user.nombre_completo || user.correo}`} value={user.rol} onChange={e => void changeUserRole(user.id, e.target.value as Role)}><option value="student">{roleNames.participante}</option><option value="teacher">{roleNames.facilitador}</option><option value="admin">{roleNames.administrador}</option></select>
              <div className="admin-user-tools"><button className="icon-button" aria-label={`Editar ${user.nombre_completo || user.correo}`} title="Editar usuario" onClick={() => { setUserEditMessage(''); setUserEdit({ id: user.id, nombre_completo: user.nombre_completo, correo: user.correo, rol: user.rol, contrasena: '' }) }}><Pencil size={16}/></button>{user.id !== session.user.id && <button className="icon-button delete-action" aria-label={`Eliminar ${user.nombre_completo || user.correo}`} title="Eliminar usuario" onClick={() => void deleteUser(user)}><Trash2 size={16}/></button>}</div>
            </div>)}{!filteredUsers.length && <p className="materials-empty">No hay usuarios que coincidan con la búsqueda.</p>}</div>
          </section>
          <section className="section-card feature-page admin-forms-grid">
            <form className="admin-enrollment-form" onSubmit={enrollStudent}><h3>Matricular participante</h3><div className="form-field"><label>Participante</label><select value={enrollmentForm.participante_id} onChange={e => setEnrollmentForm({ ...enrollmentForm, participante_id: e.target.value })} required><option value="">Selecciona participante</option>{adminUsers.filter(u => u.rol === 'participante').map(u => <option key={u.id} value={u.id}>{u.nombre_completo || u.correo}</option>)}</select></div><div className="form-field"><label>Curso</label><select value={enrollmentForm.curso_id} onChange={e => setEnrollmentForm({ ...enrollmentForm, curso_id: e.target.value })} required><option value="">Selecciona curso</option>{courses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div><button className="modal-save">Matricular <ArrowRight size={15}/></button></form>
            <form className="admin-enrollment-form" onSubmit={assignInstructor}><h3>Asignar facilitador a curso</h3><div className="form-field"><label>Facilitador</label><select value={instructorForm.facilitador_id} onChange={e => setInstructorForm({ ...instructorForm, facilitador_id: e.target.value })} required><option value="">Selecciona facilitador</option>{adminUsers.filter(u => u.rol === 'facilitador').map(u => <option key={u.id} value={u.id}>{u.nombre_completo || u.correo} · {u.correo}</option>)}</select></div><div className="form-field"><label>Curso</label><select value={instructorForm.curso_id} onChange={e => setInstructorForm({ ...instructorForm, curso_id: e.target.value })} required><option value="">Selecciona curso</option>{courses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div><button className="modal-save">Asignar facilitador <ArrowRight size={15}/></button></form>
          </section>
        </div>

    {userEdit && <Modal overline="ACCESOS Y PERFILES" title="Editar usuario" intro="Deja la contraseña en blanco para mantener la actual." onClose={() => setUserEdit(null)}><form className="course-form" onSubmit={saveUserEdit}>
      <div className="form-field"><label>Nombre</label><input maxLength={120} value={userEdit.nombre_completo} onChange={e => setUserEdit({ ...userEdit, nombre_completo: e.target.value })} required/></div>
      <div className="form-field"><label>Correo</label><input type="email" value={userEdit.correo} onChange={e => setUserEdit({ ...userEdit, correo: e.target.value })} required/></div>
      <div className="form-field"><label>Rol</label><select value={userEdit.rol} disabled={userEdit.id === session.user.id} onChange={e => setUserEdit({ ...userEdit, rol: e.target.value as Role })}><option value="student">{roleNames.participante}</option><option value="teacher">{roleNames.facilitador}</option><option value="admin">{roleNames.administrador}</option></select></div>
      <div className="form-field"><label>Nueva contraseña (opcional)</label><PasswordInput value={userEdit.contrasena} onChange={password => setUserEdit({ ...userEdit, contrasena: password })}/></div>
      {userEditMessage && <div className="form-alert error-alert modal-error">{userEditMessage}</div>}
      <div className="modal-actions"><button type="button" className="modal-cancel" onClick={() => setUserEdit(null)}>Cancelar</button><button className="modal-save" disabled={adminBusy}>{adminBusy ? 'Guardando…' : 'Guardar cambios'}</button></div>
    </form></Modal>}
  </>
}
