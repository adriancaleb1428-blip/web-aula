import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { ArrowLeft, Check, CheckCheck, MessageSquarePlus, MessagesSquare, Send } from 'lucide-react'
import { backend } from '../lib/backend'
import { EmptyState, Modal } from './ui'

export type Thread = { id: string; course_id: string; course_name: string; other_id: string; other_name: string; other_role: 'student' | 'teacher'; last_message_at: string; last_body: string | null; last_sender: string | null; unread: number }
type Contact = { course_id: string; course_name: string; user_id: string; full_name: string; role: 'student' | 'teacher' }
type Message = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string; read_at: string | null }

const limaTime = (iso: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', ...options }).format(new Date(iso))
function shortWhen(iso: string) {
  const sameDay = limaTime(iso, { dateStyle: 'short' }) === limaTime(new Date().toISOString(), { dateStyle: 'short' })
  return sameDay ? limaTime(iso, { timeStyle: 'short' }) : limaTime(iso, { day: 'numeric', month: 'short' })
}
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || '?'
const roleLabel = { teacher: 'Facilitador', student: 'Participante' }

// Private threads between a participant and the facilitators of their courses.
// Access is enforced by RLS on course_threads / thread_messages; this view only
// lists what the database returns.
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
    const { data, error } = await backend.rpc('my_conversations')
    if (error) { onError(`No se pudieron cargar tus mensajes: ${error.message}`); return }
    setThreads((data || []) as Thread[]); setReady(true)
  }, [onError])

  const markRead = useCallback(async (threadId: string) => {
    if (!backend) return
    const now = new Date().toISOString()
    await backend.from('thread_messages').update({ read_at: now }).eq('conversation_id', threadId).neq('sender_id', userId).is('read_at', null)
    await backend.from('notifications').update({ read_at: now }).eq('user_id', userId).eq('resource_id', threadId).is('read_at', null)
    setThreads(current => current.map(item => item.id === threadId ? { ...item, unread: 0 } : item))
    onUnreadChange()
  }, [userId, onUnreadChange])

  const openThread = useCallback(async (threadId: string) => {
    if (!backend) return
    setActiveId(threadId); setMessages([]); setDraft('')
    const { data, error } = await backend.from('thread_messages').select('id, conversation_id, sender_id, body, created_at, read_at').eq('conversation_id', threadId).order('created_at').limit(500)
    if (error) { onError(`No se pudo abrir la conversación: ${error.message}`); return }
    setMessages((data || []) as Message[])
    void markRead(threadId)
  }, [markRead, onError])

  useEffect(() => { void loadThreads() }, [loadThreads])
  useEffect(() => { if (openThreadId) { void openThread(openThreadId); onThreadOpened() } }, [openThreadId, openThread, onThreadOpened])
  useEffect(() => { listEnd.current?.scrollIntoView({ block: 'end' }) }, [messages.length, activeId])

  // New messages and read receipts arrive live; RLS only delivers rows of the user's threads.
  useEffect(() => {
    if (!backend) return
    const channel = backend.channel(`threads:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'thread_messages' }, payload => {
        const message = payload.new as Message
        if (message.conversation_id === activeRef.current) {
          setMessages(current => current.some(item => item.id === message.id) ? current : [...current, message])
          if (message.sender_id !== userId) void markRead(message.conversation_id)
        }
        void loadThreads()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'thread_messages' }, payload => {
        const message = payload.new as Message
        setMessages(current => current.map(item => item.id === message.id ? { ...item, read_at: message.read_at } : item))
      })
      .subscribe()
    return () => { void backend?.removeChannel(channel) }
  }, [userId, loadThreads, markRead])

  async function send(event?: FormEvent) {
    event?.preventDefault()
    const body = draft.trim()
    if (!backend || !activeId || !body || sending) return
    setSending(true)
    const { data, error } = await backend.from('thread_messages').insert({ conversation_id: activeId, sender_id: userId, body: body.slice(0, 4000) }).select('id, conversation_id, sender_id, body, created_at, read_at').single()
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
    const { data, error } = await backend.rpc('message_contacts')
    if (error) { onError(`No se pudieron cargar tus contactos: ${error.message}`); return }
    setPicker((data || []) as Contact[])
  }
  async function startWith(contact: Contact) {
    if (!backend) return
    const { data, error } = await backend.rpc('start_conversation', { p_course: contact.course_id, p_other: contact.user_id })
    if (error || !data) { onError(`No se pudo iniciar la conversación: ${error?.message || 'inténtalo de nuevo.'}`); return }
    setPicker(null)
    await loadThreads()
    void openThread(data as string)
  }

  const active = threads.find(item => item.id === activeId) || null
  const grouped = useMemo(() => {
    const groups = new Map<string, Contact[]>()
    for (const contact of picker || []) groups.set(contact.course_name, [...(groups.get(contact.course_name) || []), contact])
    return [...groups.entries()]
  }, [picker])

  return <section className={`section-card messages-page ${active ? 'has-active' : ''}`}>
    <aside className="thread-list" aria-label="Conversaciones">
      <div className="thread-list-head"><div><span className="section-overline">TUS CONVERSACIONES</span><h2>Mensajes</h2></div><button className="create-course-button" onClick={() => void openPicker()}><MessageSquarePlus size={16}/> Nuevo</button></div>
      {!ready ? <p className="section-intro">Cargando…</p> : threads.length ? <ul>{threads.map(thread => <li key={thread.id}>
        <button className={`thread-item ${thread.id === activeId ? 'is-active' : ''} ${thread.unread ? 'is-unread' : ''}`} onClick={() => void openThread(thread.id)}>
          <span className="thread-avatar">{initials(thread.other_name)}</span>
          <span className="thread-copy"><span className="thread-top"><strong>{thread.other_name}</strong><time dateTime={thread.last_message_at}>{shortWhen(thread.last_message_at)}</time></span><small className="thread-course">{roleLabel[thread.other_role]} · {thread.course_name}</small><span className="thread-preview">{thread.last_body ? `${thread.last_sender === userId ? 'Tú: ' : ''}${thread.last_body}` : 'Sin mensajes todavía'}</span></span>
          {thread.unread > 0 && <span className="thread-badge" aria-label={`${thread.unread} sin leer`}>{thread.unread > 9 ? '9+' : thread.unread}</span>}
        </button></li>)}</ul>
        : <EmptyState title="Aún no tienes conversaciones" text="Toca «Nuevo» para escribir a tu facilitador o a tus participantes sobre el curso." icon={MessagesSquare}/>}
    </aside>

    <div className="thread-view">
      {active ? <>
        <header className="thread-head"><button className="icon-button thread-back" aria-label="Volver a la lista" onClick={() => setActiveId(null)}><ArrowLeft size={18}/></button><span className="thread-avatar">{initials(active.other_name)}</span><div><strong>{active.other_name}</strong><small>{roleLabel[active.other_role]} · {active.course_name}</small></div></header>
        <div className="thread-messages" aria-live="polite">
          {messages.length ? messages.map((message, index) => {
            const mine = message.sender_id === userId
            const newDay = index === 0 || limaTime(messages[index - 1].created_at, { dateStyle: 'short' }) !== limaTime(message.created_at, { dateStyle: 'short' })
            return <div key={message.id} className="bubble-row-wrap">
              {newDay && <div className="day-divider"><span>{limaTime(message.created_at, { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>}
              <div className={`bubble-row ${mine ? 'mine' : ''}`}><div className="bubble"><p>{message.body}</p><span className="bubble-meta">{limaTime(message.created_at, { timeStyle: 'short' })}{mine && <span className={`bubble-check ${message.read_at ? 'is-seen' : ''}`} title={message.read_at ? `Visto ${limaTime(message.read_at, { dateStyle: 'short', timeStyle: 'short' })}` : 'Enviado'}>{message.read_at ? <CheckCheck size={14}/> : <Check size={14}/>}</span>}</span></div></div>
            </div>
          }) : <p className="thread-empty">Escribe el primer mensaje. {active.other_role === 'teacher' ? 'Tu facilitador' : 'El participante'} recibirá un aviso en el aula.</p>}
          <div ref={listEnd}/>
        </div>
        <form className="thread-composer" onSubmit={send}><textarea rows={1} maxLength={4000} placeholder="Escribe un mensaje…" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={onKey} aria-label="Mensaje"/><button className="modal-save" disabled={!draft.trim() || sending} aria-label="Enviar"><Send size={16}/></button></form>
      </> : <div className="thread-placeholder"><MessagesSquare size={34}/><strong>Elige una conversación</strong><p>Resuelve dudas del curso directamente con tu facilitador.</p></div>}
    </div>

    {picker && <Modal overline="NUEVO MENSAJE" title="¿A quién quieres escribir?" intro="Puedes escribir a las personas de tus cursos activos." onClose={() => setPicker(null)}>
      {grouped.length ? <div className="contact-groups">{grouped.map(([course, contacts]) => <section key={course}><h3>{course}</h3>{contacts.map(contact => <button key={`${contact.course_id}-${contact.user_id}`} className="contact-item" onClick={() => void startWith(contact)}><span className="thread-avatar">{initials(contact.full_name)}</span><span><strong>{contact.full_name}</strong><small>{roleLabel[contact.role]}</small></span></button>)}</section>)}</div>
        : <EmptyState title="Sin contactos disponibles" text="Cuando estés matriculado en un curso con facilitador asignado (o tengas participantes en tus cursos), aparecerán aquí." icon={MessagesSquare}/>}
    </Modal>}
  </section>
}
