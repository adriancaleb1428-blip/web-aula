import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { ArrowLeft, Check, CheckCheck, MessageSquarePlus, MessagesSquare, Send } from 'lucide-react'
import { backend } from '../lib/backend'
import { EmptyState, Modal } from './ui'

export type Thread = { id: string; curso_id: string; curso_nombre: string; otro_id: string; otro_nombre: string; otro_rol: 'participante' | 'facilitador'; ultimo_mensaje_en: string; ultimo_contenido: string | null; ultimo_remitente: string | null; sin_leer: number }
type Contact = { curso_id: string; curso_nombre: string; usuario_id: string; nombre_completo: string; rol: 'participante' | 'facilitador' }
type Message = { id: string; conversacion_id: string; remitente_id: string; contenido: string; creado_en: string; leido_en: string | null }

const limaTime = (iso: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', ...options }).format(new Date(iso))
function shortWhen(iso: string) {
  const sameDay = limaTime(iso, { dateStyle: 'short' }) === limaTime(new Date().toISOString(), { dateStyle: 'short' })
  return sameDay ? limaTime(iso, { timeStyle: 'short' }) : limaTime(iso, { day: 'numeric', month: 'short' })
}
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || '?'
const roleLabel = { facilitador: 'Facilitador', participante: 'Participante' }

// Private threads between a participant and the facilitators of their courses.
// El acceso lo aplica el servidor sobre curso_conversaciones / mensajes; esta vista solo
// muestra lo que devuelve la base de datos.
export function Messages({ userId, openThreadId, onThreadOpened, onUnreadChange, onError }: { userId: string; openThreadId: string | null; onThreadOpened: () => void; onUnreadChange: () => void; onError: (message: string) => void }) {
  const [threads, setThreads] = useState<Thread[]>([])
  const [ready, setReady] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [picker, setPicker] = useState<Contact[] | null>(null)
  const listEnd = useRef<HTMLDivElement>(null)
  const activeRef = useRef<string | null>(null)
  activeRef.current = activeId

  const loadThreads = useCallback(async () => {
    if (!backend) return
    const { data, error } = await backend.rpc('mis_conversaciones')
    if (error) { onError(`No se pudieron cargar tus mensajes: ${error.message}`); return }
    setThreads((data || []) as Thread[]); setReady(true)
  }, [onError])

  const markRead = useCallback(async (threadId: string) => {
    if (!backend) return
    const now = new Date().toISOString()
    await backend.from('mensajes').update({ leido_en: now }).eq('conversacion_id', threadId).neq('remitente_id', userId).is('leido_en', null)
    await backend.from('notificaciones').update({ leido_en: now }).eq('usuario_id', userId).eq('recurso_id', threadId).is('leido_en', null)
    setThreads(current => current.map(item => item.id === threadId ? { ...item, sin_leer: 0 } : item))
    onUnreadChange()
  }, [userId, onUnreadChange])

  const openThread = useCallback(async (threadId: string) => {
    if (!backend) return
    setActiveId(threadId); setMessages([]); setDraft('')
    const { data, error } = await backend.from('mensajes').select('id, conversacion_id, remitente_id, contenido, creado_en, leido_en').eq('conversacion_id', threadId).order('creado_en').limit(500)
    if (error) { onError(`No se pudo abrir la conversación: ${error.message}`); return }
    setMessages((data || []) as Message[])
    void markRead(threadId)
  }, [markRead, onError])

  useEffect(() => { void loadThreads() }, [loadThreads])
  useEffect(() => { if (openThreadId) { void openThread(openThreadId); onThreadOpened() } }, [openThreadId, openThread, onThreadOpened])
  useEffect(() => { listEnd.current?.scrollIntoView({ block: 'end' }) }, [messages.length, activeId])

  // New messages and read receipts arrive live; el servidor solo entrega filas de las conversaciones del usuario.
  useEffect(() => {
    if (!backend) return
    const channel = backend.channel(`threads:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes' }, payload => {
        const message = payload.new as Message
        if (message.conversacion_id === activeRef.current) {
          setMessages(current => current.some(item => item.id === message.id) ? current : [...current, message])
          if (message.remitente_id !== userId) void markRead(message.conversacion_id)
        }
        void loadThreads()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mensajes' }, payload => {
        const message = payload.new as Message
        setMessages(current => current.map(item => item.id === message.id ? { ...item, leido_en: message.leido_en } : item))
      })
      .subscribe()
    return () => { void backend?.removeChannel(channel) }
  }, [userId, loadThreads, markRead])

  async function send(event?: FormEvent) {
    event?.preventDefault()
    const body = draft.trim()
    if (!backend || !activeId || !body || sending) return
    setSending(true)
    const { data, error } = await backend.from('mensajes').insert({ conversacion_id: activeId, remitente_id: userId, contenido: body.slice(0, 4000) }).select('id, conversacion_id, remitente_id, contenido, creado_en, leido_en').single()
    setSending(false)
    if (error) { onError(error.code === '54000' ? 'Estás enviando mensajes muy rápido. Espera un momento.' : `No se pudo enviar el mensaje: ${error.message}`); return }
    setDraft('')
    setMessages(current => current.some(item => item.id === data.id) ? current : [...current, data as Message])
    void loadThreads()
  }
  function onKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send() }
  }

  async function openPicker() {
    if (!backend) return
    const { data, error } = await backend.rpc('contactos_mensajes')
    if (error) { onError(`No se pudieron cargar tus contactos: ${error.message}`); return }
    setPicker((data || []) as Contact[])
  }
  async function startWith(contact: Contact) {
    if (!backend) return
    const { data, error } = await backend.rpc('iniciar_conversacion', { p_curso: contact.curso_id, p_otro: contact.usuario_id })
    if (error || !data) { onError(`No se pudo iniciar la conversación: ${error?.message || 'inténtalo de nuevo.'}`); return }
    setPicker(null)
    await loadThreads()
    void openThread(data as string)
  }

  const active = threads.find(item => item.id === activeId) || null
  const grouped = useMemo(() => {
    const groups = new Map<string, Contact[]>()
    for (const contact of picker || []) groups.set(contact.curso_nombre, [...(groups.get(contact.curso_nombre) || []), contact])
    return [...groups.entries()]
  }, [picker])

  return <section className={`section-card messages-page ${active ? 'has-active' : ''}`}>
    <aside className="thread-list" aria-label="Conversaciones">
      <div className="thread-list-head"><div><span className="section-overline">TUS CONVERSACIONES</span><h2>Mensajes</h2></div><button className="create-course-button" onClick={() => void openPicker()}><MessageSquarePlus size={16}/> Nuevo</button></div>
      {!ready ? <p className="section-intro">Cargando…</p> : threads.length ? <ul>{threads.map(thread => <li key={thread.id}>
        <button className={`thread-item ${thread.id === activeId ? 'is-active' : ''} ${thread.sin_leer ? 'is-unread' : ''}`} onClick={() => void openThread(thread.id)}>
          <span className="thread-avatar">{initials(thread.otro_nombre)}</span>
          <span className="thread-copy"><span className="thread-top"><strong>{thread.otro_nombre}</strong><time dateTime={thread.ultimo_mensaje_en}>{shortWhen(thread.ultimo_mensaje_en)}</time></span><small className="thread-course">{roleLabel[thread.otro_rol]} · {thread.curso_nombre}</small><span className="thread-preview">{thread.ultimo_contenido ? `${thread.ultimo_remitente === userId ? 'Tú: ' : ''}${thread.ultimo_contenido}` : 'Sin mensajes todavía'}</span></span>
          {thread.sin_leer > 0 && <span className="thread-badge" aria-label={`${thread.sin_leer} sin leer`}>{thread.sin_leer > 9 ? '9+' : thread.sin_leer}</span>}
        </button></li>)}</ul>
        : <EmptyState title="Aún no tienes conversaciones" text="Toca «Nuevo» para escribir a tu facilitador o a tus participantes sobre el curso." icon={MessagesSquare}/>}
    </aside>

    <div className="thread-view">
      {active ? <>
        <header className="thread-head"><button className="icon-button thread-back" aria-label="Volver a la lista" onClick={() => setActiveId(null)}><ArrowLeft size={18}/></button><span className="thread-avatar">{initials(active.otro_nombre)}</span><div><strong>{active.otro_nombre}</strong><small>{roleLabel[active.otro_rol]} · {active.curso_nombre}</small></div></header>
        <div className="thread-messages" aria-live="polite">
          {messages.length ? messages.map((message, index) => {
            const mine = message.remitente_id === userId
            const newDay = index === 0 || limaTime(messages[index - 1].creado_en, { dateStyle: 'short' }) !== limaTime(message.creado_en, { dateStyle: 'short' })
            return <div key={message.id} className="bubble-row-wrap">
              {newDay && <div className="day-divider"><span>{limaTime(message.creado_en, { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>}
              <div className={`bubble-row ${mine ? 'mine' : ''}`}><div className="bubble"><p>{message.contenido}</p><span className="bubble-meta">{limaTime(message.creado_en, { timeStyle: 'short' })}{mine && <span className={`bubble-check ${message.leido_en ? 'is-seen' : ''}`} title={message.leido_en ? `Visto ${limaTime(message.leido_en, { dateStyle: 'short', timeStyle: 'short' })}` : 'Enviado'}>{message.leido_en ? <CheckCheck size={14}/> : <Check size={14}/>}</span>}</span></div></div>
            </div>
          }) : <p className="thread-empty">Escribe el primer mensaje. {active.otro_rol === 'facilitador' ? 'Tu facilitador' : 'El participante'} recibirá un aviso en el aula.</p>}
          <div ref={listEnd}/>
        </div>
        <form className="thread-composer" onSubmit={send}><textarea rows={1} maxLength={4000} placeholder="Escribe un mensaje…" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={onKey} aria-label="Mensaje"/><button className="modal-save" disabled={!draft.trim() || sending} aria-label="Enviar"><Send size={16}/></button></form>
      </> : <div className="thread-placeholder"><MessagesSquare size={34}/><strong>Elige una conversación</strong><p>Resuelve dudas del curso directamente con tu facilitador.</p></div>}
    </div>

    {picker && <Modal overline="NUEVO MENSAJE" title="¿A quién quieres escribir?" intro="Puedes escribir a las personas de tus cursos activos." onClose={() => setPicker(null)}>
      {grouped.length ? <div className="contact-groups">{grouped.map(([course, contacts]) => <section key={course}><h3>{course}</h3>{contacts.map(contact => <button key={`${contact.curso_id}-${contact.usuario_id}`} className="contact-item" onClick={() => void startWith(contact)}><span className="thread-avatar">{initials(contact.nombre_completo)}</span><span><strong>{contact.nombre_completo}</strong><small>{roleLabel[contact.rol]}</small></span></button>)}</section>)}</div>
        : <EmptyState title="Sin contactos disponibles" text="Cuando estés matriculado en un curso con facilitador asignado (o tengas participantes en tus cursos), aparecerán aquí." icon={MessagesSquare}/>}
    </Modal>}
  </section>
}
