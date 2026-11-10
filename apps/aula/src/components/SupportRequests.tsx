import { useEffect, useState } from 'react'
import { CheckCheck, LifeBuoy, Mail, RotateCcw, Trash2 } from 'lucide-react'
import { backend } from '../lib/backend'
import { EmptyState, SectionHeader } from './ui'

type SupportRequest = { id: string; nombre_completo: string; correo: string; telefono: string | null; asunto: string; mensaje: string; estado: 'abierta' | 'resuelta'; correo_enviado: boolean; creado_en: string }

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
    const load = () => backend!.from('solicitudes_soporte').select('id, nombre_completo, correo, telefono, asunto, mensaje, estado, correo_enviado, creado_en').order('creado_en', { ascending: false }).limit(100).then(({ data }) => { if (alive) { setRequests((data || []) as SupportRequest[]); setReady(true) } })
    void load()
    const timer = window.setInterval(load, 60000)
    return () => { alive = false; window.clearInterval(timer) }
  }, [])

  async function setStatus(request: SupportRequest, estado: SupportRequest['estado']) {
    if (!backend) return
    const { error } = await backend.from('solicitudes_soporte').update({ estado }).eq('id', request.id)
    if (error) { onMessage(`No se pudo actualizar la solicitud: ${error.message}`); return }
    setRequests(current => current.map(item => item.id === request.id ? { ...item, estado } : item))
    onMessage(estado === 'resuelta' ? 'Solicitud marcada como atendida.' : 'Solicitud reabierta.')
  }
  async function remove(request: SupportRequest) {
    if (!backend || !window.confirm(`¿Eliminar la solicitud de ${request.nombre_completo}?`)) return
    const { error } = await backend.from('solicitudes_soporte').delete().eq('id', request.id)
    if (error) { onMessage(`No se pudo eliminar la solicitud: ${error.message}`); return }
    setRequests(current => current.filter(item => item.id !== request.id))
  }

  const open = requests.filter(item => item.estado === 'abierta').length
  const visible = requests.filter(item => showResolved || item.estado === 'abierta')
  return <section className="section-card admin-panel support-inbox">
    <SectionHeader icon={LifeBuoy} overline={`${open} PENDIENTE${open === 1 ? '' : 'S'}`} title="Solicitudes de ayuda"><label className="support-toggle"><input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)}/> Ver atendidas</label></SectionHeader>
    {!ready ? <p className="section-intro">Cargando solicitudes…</p> : visible.length ? <div className="support-list">{visible.map(request => <article className={`support-item ${request.estado === 'resuelta' ? 'is-resolved' : ''}`} key={request.id}>
      <div className="support-item-head"><strong>{request.nombre_completo}</strong><span className="support-topic">{topicNames[request.asunto] || request.asunto}</span></div>
      <p>{request.mensaje}</p>
      <div className="support-item-meta"><a href={`mailto:${request.correo}?subject=${encodeURIComponent('Re: tu solicitud de ayuda en Aula Consulting')}`}><Mail size={13}/> {request.correo}</a>{request.telefono && <span>{request.telefono}</span>}<time dateTime={request.creado_en}>{when(request.creado_en)}</time></div>
      <div className="support-item-actions">{request.estado === 'abierta' ? <button className="outline-button" onClick={() => void setStatus(request, 'resuelta')}><CheckCheck size={15}/> Marcar atendida</button> : <button className="outline-button" onClick={() => void setStatus(request, 'abierta')}><RotateCcw size={15}/> Reabrir</button>}<button className="icon-button delete-action" aria-label={`Eliminar solicitud de ${request.nombre_completo}`} onClick={() => void remove(request)}><Trash2 size={16}/></button></div>
    </article>)}</div> : <EmptyState title={showResolved ? 'Sin solicitudes' : 'Nada pendiente'} text="Aquí aparecerán las consultas que envíen los participantes desde «¿Necesitas ayuda?»." icon={LifeBuoy}/>}
  </section>
}
