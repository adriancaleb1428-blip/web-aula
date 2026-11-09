import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { BookOpen, Check, CircleAlert, CircleCheck, Copy, Eye, EyeOff, KeyRound, RotateCw, Upload, X } from 'lucide-react'
import verticalLogo from '../assets/aula-logo-vertical-dark.png'
import { formatBytes, generatePassword, strongPasswordPattern } from '../lib/config'

type Icon = typeof BookOpen

export function Modal({ overline, title, intro, onClose, children, wide = false }: { overline: string; title: string; intro?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') closeRef.current() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className={`course-modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-heading"><div><span className="section-overline">{overline}</span><h2>{title}</h2></div><button type="button" className="icon-button" aria-label="Cerrar" onClick={onClose}><X size={19}/></button></div>
      {intro && <p className="modal-intro">{intro}</p>}
      {children}
    </section>
  </div>
}

// Shared heading for every page card so titles, icons and actions line up.
export function SectionHeader({ icon: IconComponent, overline, title, children }: { icon: Icon; overline: string; title: string; children?: ReactNode }) {
  return <header className="feature-header">
    <span className="feature-header-icon"><IconComponent size={21}/></span>
    <div className="feature-header-copy"><span className="section-overline">{overline}</span><h2>{title}</h2></div>
    {children && <div className="feature-header-actions">{children}</div>}
  </header>
}

export function EmptyState({ title, text, icon: IconComponent }: { title: string; text: string; icon: Icon }) {
  return <div className="empty-state"><span className="empty-icon"><IconComponent size={21}/></span><strong>{title}</strong><p>{text}</p></div>
}

export function BootScreen({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  const [slow, setSlow] = useState(false)
  useEffect(() => { const timer = window.setTimeout(() => setSlow(true), 15000); return () => window.clearTimeout(timer) }, [])
  return <div className="boot" role="status" aria-live="polite">
    <img className="boot-logo" src={verticalLogo} alt="Aula Consulting"/>
    <div className="boot-copy"><strong>{title}</strong><span>{slow && !action ? 'Está tardando más de lo normal. Revisa tu conexión a internet.' : detail}</span>
      {action || (slow && <button className="boot-retry" onClick={() => window.location.reload()}><RotateCw size={15}/> Reintentar</button>)}
    </div>
    {!action && <i className="boot-progress"/>}
  </div>
}

export function FileDrop({ accept, hint, file, onFile, large = false }: { accept: string; hint: string; file: File | null; onFile: (file: File | null) => void; large?: boolean }) {
  const [dragging, setDragging] = useState(false)
  return <label className={`file-drop ${large ? 'file-drop-large' : ''} ${dragging ? 'is-dragging' : ''} ${file ? 'has-file' : ''}`}
    onDragOver={event => { event.preventDefault(); setDragging(true) }}
    onDragLeave={() => setDragging(false)}
    onDrop={event => { event.preventDefault(); setDragging(false); onFile(event.dataTransfer.files?.[0] || null) }}>
    <input type="file" accept={accept} onChange={event => onFile(event.target.files?.[0] || null)}/>
    <span className="file-drop-icon"><Upload size={large ? 26 : 20}/></span>
    {file ? <span className="file-drop-copy"><strong>{file.name}</strong><small>{formatBytes(file.size)} · Haz clic para cambiar el archivo</small></span>
      : <span className="file-drop-copy"><strong>Arrastra el archivo aquí o haz clic para elegirlo</strong><small>{hint}</small></span>}
  </label>
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  return <div className="upload-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label={label}>
    <div className="upload-progress-track"><span style={{ width: `${value}%` }}/></div>
    <small>{label} · {value}%</small>
  </div>
}

export type Toast = { id: number; text: string; tone: 'success' | 'error' }

// Failures in this app start with "No …" or say "… pero no se registró"; raw
// database texts ("violates", "duplicate") are treated as errors too.
const toastTone = (text: string): Toast['tone'] => /^\s*no\b|no se pud|no se registr|error|violates|duplicate|denied/i.test(text) ? 'error' : 'success'

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)
  const dismiss = useCallback((id: number) => setToasts(current => current.filter(item => item.id !== id)), [])
  const push = useCallback((text: string) => { if (text) setToasts(current => [{ id: ++nextId.current, text, tone: toastTone(text) }, ...current].slice(0, 5)) }, [])
  return { toasts, push, dismiss }
}

function ToastBubble({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused) return
    const timer = window.setTimeout(() => onDismiss(toast.id), toast.tone === 'error' ? 9000 : 5000)
    return () => window.clearTimeout(timer)
  }, [paused, toast, onDismiss])
  const Icon = toast.tone === 'error' ? CircleAlert : CircleCheck
  return <div className={`toast toast-${toast.tone}${paused ? ' is-paused' : ''}`} role={toast.tone === 'error' ? 'alert' : 'status'} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
    <Icon size={18}/><p>{toast.text}</p><button aria-label="Cerrar aviso" onClick={() => onDismiss(toast.id)}><X size={15}/></button><i style={{ animationDuration: toast.tone === 'error' ? '9s' : '5s' }}/>
  </div>
}

export function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return <div className="toast-stack" aria-live="polite">{toasts.map(toast => <ToastBubble key={toast.id} toast={toast} onDismiss={onDismiss}/>)}</div>
}

export function PasswordInput({ value, onChange, required = false }: { value: string; onChange: (value: string) => void; required?: boolean }) {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)
  async function copy() { try { await navigator.clipboard.writeText(value); setCopied(true) } catch { setVisible(true) } }
  return <div className="password-tools">
    <input type={visible ? 'text' : 'password'} autoComplete="new-password" spellCheck={false} minLength={12} maxLength={72} pattern={strongPasswordPattern} title="Entre 12 y 72 caracteres, con mayúsculas, minúsculas y números." value={value} onChange={e => { onChange(e.target.value); setCopied(false) }} required={required}/>
    <button type="button" className="password-icon" aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} title={visible ? 'Ocultar' : 'Mostrar'} onClick={() => setVisible(v => !v)}>{visible ? <EyeOff size={15}/> : <Eye size={15}/>}</button>
    {value && <button type="button" className="password-icon" aria-label="Copiar contraseña" title={copied ? 'Copiada' : 'Copiar'} onClick={() => void copy()}>{copied ? <Check size={15}/> : <Copy size={15}/>}</button>}
    <button type="button" className="password-generate" onClick={() => { onChange(generatePassword()); setVisible(true); setCopied(false) }}><KeyRound size={14}/> Generar</button>
  </div>
}
