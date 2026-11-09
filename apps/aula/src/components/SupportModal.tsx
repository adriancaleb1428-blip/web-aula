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
// The support-request Edge Function stores it and emails the support inbox.
export function SupportModal({ onClose, defaultName = '', defaultEmail = '', defaultPhone = '' }: { onClose: () => void; defaultName?: string; defaultEmail?: string; defaultPhone?: string }) {
  const [form, setForm] = useState({ full_name: defaultName, email: defaultEmail, phone: defaultPhone, topic: defaultEmail ? 'cursos' : 'acceso', message: '', website: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!backend) { setError('El aula no está conectada. Escríbenos por WhatsApp.'); return }
    setBusy(true); setError('')
    const { data, error: invokeError } = await backend.functions.invoke('support-request', { body: form })
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
    <div className="support-sent"><CircleCheck size={42}/><p>Recibimos tu consulta. Te responderemos a <strong>{form.email}</strong> lo antes posible.</p><small>Si es urgente, también puedes escribirnos por WhatsApp.</small></div>
    <div className="modal-actions"><a className="modal-cancel support-whatsapp" href={whatsappUrl()} target="_blank" rel="noopener noreferrer"><img src={whatsappLogo} alt="" width={20} height={20}/> WhatsApp</a><button className="modal-save" onClick={onClose}>Listo</button></div>
  </Modal>

  return <Modal overline="SOPORTE" title="¿Necesitas ayuda?" intro="Cuéntanos qué pasa y te responderemos por correo. Para algo urgente, escríbenos por WhatsApp." onClose={onClose}>
    <form className="support-form" onSubmit={submit}>
      <div className="form-field"><label htmlFor="support-name">Nombre</label><input id="support-name" autoComplete="name" maxLength={120} value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required/></div>
      <div className="form-field"><label htmlFor="support-email">Correo</label><input id="support-email" type="email" inputMode="email" autoComplete="email" maxLength={254} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required/></div>
      <div className="form-field"><label htmlFor="support-phone">Teléfono <span className="optional">(opcional)</span></label><input id="support-phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={40} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/></div>
      <div className="form-field"><label htmlFor="support-topic">Tema</label><select id="support-topic" value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })}>{topics.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div className="form-field full-field"><label htmlFor="support-message">Mensaje</label><textarea id="support-message" rows={5} minLength={10} maxLength={2000} placeholder="Describe tu consulta: qué intentabas hacer y qué mensaje viste." value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required/><small className="char-count">{form.message.length}/2000</small></div>
      <input className="support-trap" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })}/>
      {error && <div className="form-alert error-alert modal-error full-field" role="alert">{error}</div>}
      <div className="modal-actions full-field"><a className="modal-cancel support-whatsapp" href={whatsappUrl()} target="_blank" rel="noopener noreferrer"><img src={whatsappLogo} alt="" width={20} height={20}/> WhatsApp</a><button className="modal-save" disabled={busy}>{busy ? 'Enviando…' : <>Enviar solicitud <Send size={15}/></>}</button></div>
    </form>
  </Modal>
}
