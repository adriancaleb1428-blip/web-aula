import { useState } from 'react'
import type { FormEvent } from 'react'
import { CircleCheck, Send } from 'lucide-react'
import { backend } from '../lib/backend'
import { whatsappUrl } from '../lib/config'
import { Modal } from './ui'
import whatsappLogo from '../assets/whatsapp.png'

const topics = [
  ['acceso', 'Acceso o contraseña'],
  ['cursos', 'Cursos y materiales'],
  ['reuniones', 'Reuniones y grabaciones'],
  ['certificados', 'Certificados'],
  ['otro', 'Otro tema'],
] as const

// Help request form shared by the login page, the sidebar and the footer.
// La función solicitud-soporte del servidor lo guarda and emails the support inbox.
export function SupportModal({ onClose, defaultName = '', defaultEmail = '', defaultPhone = '' }: { onClose: () => void; defaultName?: string; defaultEmail?: string; defaultPhone?: string }) {
  const [form, setForm] = useState({ nombre_completo: defaultName, correo: defaultEmail, telefono: defaultPhone, asunto: defaultEmail ? 'cursos' : 'acceso', mensaje: '', website: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!backend) { setError('El aula no está conectada. Escríbenos por WhatsApp.'); return }
    setBusy(true); setError('')
    const { data, error: invokeError } = await backend.functions.invoke('solicitud-soporte', { body: form })
    setBusy(false)
    if (invokeError || data?.error) {
      let message = data?.error as string | undefined
      if (!message && invokeError && 'context' in invokeError) { try { message = (await (invokeError.context as Response).json()).error } catch { /* keep default */ } }
      setError(message || 'No pudimos enviar tu solicitud. Inténtalo de nuevo o escríbenos por WhatsApp.')
      return
    }
    setSent(true)
  }

  if (sent) return <Modal overline="SOPORTE" title="Solicitud enviada" onClose={onClose}>
    <div className="support-sent"><CircleCheck size={42}/><p>Recibimos tu consulta. Te responderemos a <strong>{form.correo}</strong> lo antes posible.</p><small>Si es urgente, también puedes escribirnos por WhatsApp.</small></div>
    <div className="modal-actions"><a className="modal-cancel support-whatsapp" href={whatsappUrl()} target="_blank" rel="noopener noreferrer"><img src={whatsappLogo} alt="" width={20} height={20}/> WhatsApp</a><button className="modal-save" onClick={onClose}>Listo</button></div>
  </Modal>

  return <Modal overline="SOPORTE" title="¿Necesitas ayuda?" intro="Cuéntanos qué pasa y te responderemos por correo. Para algo urgente, escríbenos por WhatsApp." onClose={onClose}>
    <form className="support-form" onSubmit={submit}>
      <div className="form-field"><label htmlFor="support-name">Nombre</label><input id="support-name" autoComplete="name" maxLength={120} value={form.nombre_completo} onChange={e => setForm({ ...form, nombre_completo: e.target.value })} required/></div>
      <div className="form-field"><label htmlFor="support-email">Correo</label><input id="support-email" type="email" inputMode="email" autoComplete="email" maxLength={254} value={form.correo} onChange={e => setForm({ ...form, correo: e.target.value })} required/></div>
      <div className="form-field"><label htmlFor="support-phone">Teléfono <span className="optional">(opcional)</span></label><input id="support-phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={40} value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })}/></div>
      <div className="form-field"><label htmlFor="support-topic">Tema</label><select id="support-topic" value={form.asunto} onChange={e => setForm({ ...form, asunto: e.target.value })}>{topics.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div className="form-field full-field"><label htmlFor="support-message">Mensaje</label><textarea id="support-message" rows={5} minLength={10} maxLength={2000} placeholder="Describe tu consulta: qué intentabas hacer y qué mensaje viste." value={form.mensaje} onChange={e => setForm({ ...form, mensaje: e.target.value })} required/><small className="char-count">{form.mensaje.length}/2000</small></div>
      <input className="support-trap" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })}/>
      {error && <div className="form-alert error-alert modal-error full-field" role="alert">{error}</div>}
      <div className="modal-actions full-field"><a className="modal-cancel support-whatsapp" href={whatsappUrl()} target="_blank" rel="noopener noreferrer"><img src={whatsappLogo} alt="" width={20} height={20}/> WhatsApp</a><button className="modal-save" disabled={busy}>{busy ? 'Enviando…' : <>Enviar solicitud <Send size={15}/></>}</button></div>
    </form>
  </Modal>
}
