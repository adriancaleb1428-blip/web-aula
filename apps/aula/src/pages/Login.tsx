import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react'
import { backend } from '../lib/backend'
import { markActivityNow, readIdleLogoutFlag, setIdleLogoutFlag } from '../lib/idle'
import { SupportModal } from '../components/SupportModal'
import { Brand } from '../components/Brand'
import { COPYRIGHT } from '../config/brand'

export function Login({ error, clearError }: { error: string; clearError: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  const [notice, setNotice] = useState(() => readIdleLogoutFlag() ? 'Tu sesión se cerró tras 30 minutos sin actividad. Ingresa nuevamente para continuar.' : '')

  async function submit(e: FormEvent) { e.preventDefault(); await signIn(email, password) }
  async function signIn(emailValue: string, passwordValue: string) {
    clearError(); setNotice('')
    if (!backend) return
    setBusy(true)
    setIdleLogoutFlag(false)
    markActivityNow()
    const { error: signInError } = await backend.auth.signInWithPassword({ email: emailValue, password: passwordValue })
    // Same message for unknown accounts and wrong passwords (no user enumeration).
    if (signInError) setNotice(signInError.status === 429 ? 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.' : 'Correo o contraseña incorrectos.')
    setBusy(false)
  }

  return <main className="login-page">
    <section className="login-visual" aria-label="Capacitación y entrenamiento para empresas y emprendedores">
      <div className="visual-grain"/><div className="visual-top"><Brand light/><span className="institution-tag"><span/> PROTEQLIFE · CONSULTING</span></div>
      <div className="visual-content"><span className="eyebrow light-eyebrow"><Sparkles size={14}/> CAPACITACIÓN Y ENTRENAMIENTO</span><h1>Aprende,<br/><em>emprende</em> y crece.</h1><p>Formación práctica para empresas,<br/>equipos y emprendedores.</p><div className="visual-rule"/><div className="visual-footer"><div className="avatar-stack"><i>AC</i><i>+</i></div><span>Empresas y emprendedores que<br/>se capacitan y crecen juntos.</span></div></div>
      <div className="visual-bottom"><span>ENTRENAMIENTO QUE IMPULSA TU NEGOCIO</span><span>PROTEQLIFE</span></div>
    </section>
    <section className="login-panel"><div className="login-mobile-brand"><Brand/></div><div className="login-card-wrap">
      <div className="welcome-kicker"><span className="kicker-line"/> TU AULA, A TU RITMO</div>
      <h2>Qué bueno tenerte aquí.</h2>
      <p className="login-subtitle">Ingresa a tu espacio de capacitación.</p>
      <form className="login-form" onSubmit={submit}>
        <label htmlFor="email">Correo electrónico</label><div className="input-shell"><Mail size={17}/><input id="email" type="email" autoComplete="email" placeholder="nombre@empresa.com" value={email} onChange={e => setEmail(e.target.value)} required/></div>
        <div className="label-row"><label htmlFor="password">Contraseña</label><span className="access-note">Acceso entregado por PROTEQLIFE</span></div><div className="input-shell"><LockKeyhole size={17}/><input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Ingresa tu contraseña" value={password} onChange={e => setPassword(e.target.value)} required/><button className="icon-button reveal" type="button" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShowPassword(v => !v)}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div>
        {(error || notice) && <div className={error || notice.startsWith('Correo') || notice.startsWith('Demasiados') ? 'form-alert error-alert' : 'form-alert'} role="status">{error || notice}</div>}
        <button className="login-submit" type="submit" disabled={busy}>{busy ? 'Un momento…' : 'INICIAR SESIÓN'}<ArrowRight size={17}/></button>
      </form>
      <div className="secure-note"><ShieldCheck size={15}/><span>Conexión protegida · Acceso seguro</span></div>
    </div><div className="login-panel-footer"><span>{COPYRIGHT()}</span><button type="button" className="login-help" onClick={() => setSupportOpen(true)}><MessageCircle size={13}/> ¿Necesitas ayuda?</button></div></section>
    {supportOpen && <SupportModal onClose={() => setSupportOpen(false)}/>}
  </main>
}
