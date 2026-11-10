import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Session } from '../lib/types'
import { Briefcase, Building2, Camera, KeyRound, Mail, Phone, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import { backend } from '../lib/backend'
import { MAX_AVATAR_BYTES, avatarMimeTypes, strongPasswordPattern, validateUpload } from '../lib/config'
import { PROFILE_FIELDS, roleNames } from '../lib/types'
import type { Profile } from '../lib/types'
import { SectionHeader } from './ui'

export function Avatar({ src, name, size = 'md' }: { src: string; name: string; size?: 'md' | 'lg' }) {
  return src ? <img className={`avatar avatar-${size}`} src={src} alt=""/> : <span className={`avatar avatar-${size}`}>{(name.trim()[0] || 'A').toUpperCase()}</span>
}

export function ProfilePage({ session, profile, avatarSrc, onProfileChange }: { session: Session; profile: Profile; avatarSrc: string; onProfileChange: (profile: Profile) => void }) {
  const [form, setForm] = useState({ nombre_completo: profile.nombre_completo || '', telefono: profile.telefono || '', empresa: profile.empresa || '', cargo: profile.cargo || '', biografia: profile.biografia || '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [passwords, setPasswords] = useState({ next: '', confirm: '' })
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const userId = session.user.id
  const displayName = profile.nombre_completo || session.user.correo || 'Usuario'

  async function reloadProfile() {
    if (!backend) return
    const { data } = await backend.from('perfiles').select(PROFILE_FIELDS).eq('id', userId).single()
    if (data) onProfileChange(data as Profile)
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault(); if (!backend) return
    const fullName = form.nombre_completo.trim()
    if (fullName.length < 2) { setMessage('Escribe tu nombre completo.'); return }
    if (form.telefono.trim() && !/^[0-9+() -]{6,25}$/.test(form.telefono.trim())) { setMessage('El teléfono solo puede tener números, espacios, +, ( y ).'); return }
    setSaving(true); setMessage('')
    const { error } = await backend.from('perfiles').update({
      nombre_completo: fullName, telefono: form.telefono.trim() || null, empresa: form.empresa.trim() || null,
      cargo: form.cargo.trim() || null, biografia: form.biografia.trim() || null,
    }).eq('id', userId)
    setSaving(false)
    if (error) { setMessage('No se pudo guardar tu perfil. Inténtalo de nuevo.'); return }
    setMessage('Perfil actualizado.')
    await reloadProfile()
  }

  async function changeAvatar(file: File | null) {
    if (!backend || !file) return
    const problem = validateUpload(file, avatarMimeTypes, MAX_AVATAR_BYTES, 'la foto de perfil (JPG, PNG o WebP)')
    if (problem) { setMessage(problem); return }
    setAvatarBusy(true); setMessage('')
    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const path = `${userId}/avatar-${Date.now()}.${extension}`
    const { error: uploadError } = await backend.storage.from('avatars').upload(path, file, { contentType: file.type, upsert: false })
    if (uploadError) { setAvatarBusy(false); setMessage('No se pudo subir la foto.'); return }
    const previous = profile.foto_url
    const { error } = await backend.from('perfiles').update({ foto_url: path }).eq('id', userId)
    if (error) { await backend.storage.from('avatars').remove([path]); setAvatarBusy(false); setMessage('No se pudo guardar la foto.'); return }
    if (previous) await backend.storage.from('avatars').remove([previous])
    setAvatarBusy(false); setMessage('Foto actualizada.')
    await reloadProfile()
  }

  async function removeAvatar() {
    if (!backend || !profile.foto_url || !window.confirm('¿Quitar tu foto de perfil?')) return
    setAvatarBusy(true)
    const previous = profile.foto_url
    const { error } = await backend.from('perfiles').update({ foto_url: null }).eq('id', userId)
    if (!error) await backend.storage.from('avatars').remove([previous])
    setAvatarBusy(false); setMessage(error ? 'No se pudo quitar la foto.' : 'Foto eliminada.')
    await reloadProfile()
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault(); if (!backend) return
    if (!new RegExp(`^${strongPasswordPattern}$`).test(passwords.next)) { setPasswordMessage('Usa entre 12 y 72 caracteres con mayúsculas, minúsculas y números.'); return }
    if (passwords.next !== passwords.confirm) { setPasswordMessage('Las contraseñas no coinciden.'); return }
    setPasswordBusy(true); setPasswordMessage('')
    const { error } = await backend.auth.updateUser({ contrasena: passwords.next })
    setPasswordBusy(false)
    if (error) { setPasswordMessage(error.message.toLowerCase().includes('reauth') ? 'Por seguridad, cierra sesión y vuelve a ingresar antes de cambiar la contraseña.' : 'No se pudo cambiar la contraseña. Prueba con otra diferente.'); return }
    setPasswords({ next: '', confirm: '' }); setPasswordMessage('Contraseña actualizada.')
  }

  return <div className="profile-layout">
    <section className="section-card profile-card">
      <div className="profile-hero">
        <div className="profile-photo"><Avatar src={avatarSrc} name={displayName} size="lg"/>
          <label className={`profile-photo-button ${avatarBusy ? 'is-busy' : ''}`} title="Cambiar foto"><Camera size={16}/><input type="file" accept="image/jpeg,image/png,image/webp" disabled={avatarBusy} onChange={event => { void changeAvatar(event.target.files?.[0] || null); event.target.value = '' }}/></label>
        </div>
        <div className="profile-hero-copy">
          <span className="section-overline">CUENTA DE USUARIO</span>
          <h2>{displayName}</h2>
          <p><Mail size={14}/> {session.user.correo}</p>
          <div className="profile-badges"><span className="role-badge"><ShieldCheck size={13}/> {roleNames[profile.rol]}</span>{profile.creado_en && <span className="role-badge muted">Miembro desde {new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' }).format(new Date(profile.creado_en))}</span>}</div>
          {profile.foto_url && <button className="text-link danger" onClick={() => void removeAvatar()} disabled={avatarBusy}><Trash2 size={13}/> Quitar foto</button>}
        </div>
      </div>
      <form className="course-form profile-form" onSubmit={saveProfile}>
        <div className="form-field"><label htmlFor="profile-name"><UserRound size={13}/> Nombre completo</label><input id="profile-name" maxLength={120} value={form.nombre_completo} onChange={e => setForm({ ...form, nombre_completo: e.target.value })} required/></div>
        <div className="form-field"><label htmlFor="profile-phone"><Phone size={13}/> Teléfono / WhatsApp</label><input id="profile-phone" inputMode="tel" maxLength={25} placeholder="+51 999 999 999" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })}/></div>
        <div className="form-field"><label htmlFor="profile-company"><Building2 size={13}/> Empresa o emprendimiento</label><input id="profile-company" maxLength={120} placeholder="Nombre de tu empresa" value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })}/></div>
        <div className="form-field"><label htmlFor="profile-job"><Briefcase size={13}/> Cargo</label><input id="profile-job" maxLength={120} placeholder="Ej. Jefe de operaciones" value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })}/></div>
        <div className="form-field full-field"><label htmlFor="profile-bio">Sobre mí</label><textarea id="profile-bio" rows={3} maxLength={600} placeholder="Cuéntanos sobre tu experiencia y lo que quieres lograr." value={form.biografia} onChange={e => setForm({ ...form, biografia: e.target.value })}/><small className="field-hint">{form.biografia.length}/600</small></div>
        {message && <div className={`form-alert full-field ${message.startsWith('No') || message.startsWith('El') || message.startsWith('Escribe') ? 'error-alert' : ''}`} role="status">{message}</div>}
        <div className="modal-actions"><button className="modal-save" disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</button></div>
      </form>
    </section>
    <section className="section-card profile-card">
      <SectionHeader icon={KeyRound} overline="SEGURIDAD" title="Cambiar contraseña"/>
      <p className="section-intro">Usa al menos 12 caracteres con mayúsculas, minúsculas y números. Tu sesión se cierra automáticamente tras 30 minutos sin actividad.</p>
      <form className="course-form" onSubmit={changePassword}>
        <div className="form-field"><label htmlFor="new-password">Nueva contraseña</label><input id="new-password" type="password" autoComplete="new-password" minLength={12} maxLength={72} value={passwords.next} onChange={e => setPasswords({ ...passwords, next: e.target.value })} required/></div>
        <div className="form-field"><label htmlFor="confirm-password">Confirmar contraseña</label><input id="confirm-password" type="password" autoComplete="new-password" minLength={12} maxLength={72} value={passwords.confirm} onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} required/></div>
        {passwordMessage && <div className={`form-alert full-field ${passwordMessage === 'Contraseña actualizada.' ? '' : 'error-alert'}`} role="status">{passwordMessage}</div>}
        <div className="modal-actions"><button className="modal-save" disabled={passwordBusy}>{passwordBusy ? 'Actualizando…' : 'Actualizar contraseña'}</button></div>
      </form>
    </section>
  </div>
}
