import { useEffect, useState } from 'react'
import { CheckCheck, LifeBuoy, Mail, RotateCcw, Trash2 } from 'lucide-react'
import { backend } from '../lib/backend'
import { EmptyState, SectionHeader } from './ui'

type SupportRequest = { id: string; full_name: string; email: string; phone: string | null; topic: string; message: string; status: 'open' | 'resolved'; email_sent: boolean; created_at: string }

const topicNames: Record<string, string> = { acceso: 'Acceso o contraseña', cursos: 'Cursos y materiales', reuniones: 'Reuniones y grabaciones', certificados: 'Certificados', otro: 'Otro tema' }
const when = (iso: string) => new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))

// Admin inbox of help requests; copies also arrive by email when Resend is configured.
export function SupportRequests({ onMessage }: { onMessage: (message: string) => void }) {
  const [requests, setRequests] = useState<SupportRequest[]>([])
  const [ready, setReady] = useState(false)
  const [showResolved, setShowResolved] = useState(false)

  useEffect(() => {
    if (!backend) return
    let alive = true
    const load = () => backend!.from('support_requests').select('id, full_name, email, phone, topic, message, status, email_sent, created_at').order('created_at', { ascending: false }).limit(100).then(({ data }) => { if (alive) { setRequests((data || []) as SupportRequest[]); setReady(true) } })
    void load()
    const timer = window.setInterval(load, 60000)
    return () => { alive = false; window.clearInterval(timer) }
  }, [])

  async function setStatus(request: SupportRequest, status: SupportRequest['status']) {
    if (!backend) return
    const { error } = await backend.from('support_requests').update({ status }).eq('id', request.id)
    if (error) { onMessage(`No se pudo actualizar la solicitud: ${error.message}`); return }
    setRequests(current => current.map(item => item.id === request.id ? { ...item, status } : item))
    onMessage(status === 'resolved' ? 'Solicitud marcada como atendida.' : 'Solicitud reabierta.')
  }
  async function remove(request: SupportRequest) {
    if (!backend || !window.confirm(`¿Eliminar la solicitud de ${request.full_name}?`)) return
    const { error } = await backend.from('support_requests').delete().eq('id', request.id)
    if (error) { onMessage(`No se pudo eliminar la solicitud: ${error.message}`); return }
    setRequests(current => current.filter(item => item.id !== request.id))
  }

  const open = requests.filter(item => item.status === 'open').length
  const visible = requests.filter(item => showResolved || item.status === 'open')
  return <section className="section-card admin-panel support-inbox">
    <SectionHeader icon={LifeBuoy} overline={`${open} PENDIENTE${open === 1 ? '' : 'S'}`} title="Solicitudes de ayuda"><label className="support-toggle"><input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)}/> Ver atendidas</label></SectionHeader>
    {!ready ? <p className="section-intro">Cargando solicitudes…</p> : visible.length ? <div className="support-list">{visible.map(request => <article className={`support-item ${request.status === 'resolved' ? 'is-resolved' : ''}`} key={request.id}>
      <div className="support-item-head"><strong>{request.full_name}</strong><span className="support-topic">{topicNames[request.topic] || request.topic}</span></div>
      <p>{request.message}</p>
      <div className="support-item-meta"><a href={`mailto:${request.email}?subject=${encodeURIComponent('Re: tu solicitud de ayuda en Aula Consulting')}`}><Mail size={13}/> {request.email}</a>{request.phone && <span>{request.phone}</span>}<time dateTime={request.created_at}>{when(request.created_at)}</time></div>
      <div className="support-item-actions">{request.status === 'open' ? <button className="outline-button" onClick={() => void setStatus(request, 'resolved')}><CheckCheck size={15}/> Marcar atendida</button> : <button className="outline-button" onClick={() => void setStatus(request, 'open')}><RotateCcw size={15}/> Reabrir</button>}<button className="icon-button delete-action" aria-label={`Eliminar solicitud de ${request.full_name}`} onClick={() => void remove(request)}><Trash2 size={16}/></button></div>
    </article>)}</div> : <EmptyState title={showResolved ? 'Sin solicitudes' : 'Nada pendiente'} text="Aquí aparecerán las consultas que envíen los participantes desde «¿Necesitas ayuda?»." icon={LifeBuoy}/>}
  </section>
}
