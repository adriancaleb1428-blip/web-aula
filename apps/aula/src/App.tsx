import { useEffect, useRef, useState } from 'react'
import type { Session } from './lib/types'
import { backend } from './lib/backend'
import { PROFILE_FIELDS } from './lib/types'
import type { Profile } from './lib/types'
import { BootScreen } from './components/ui'
import { Login } from './pages/Login'
import { Dashboard } from './Dashboard'
import { consumeHandoff } from './lib/handoff'

consumeHandoff()

export function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [error, setError] = useState('')
  // Token refreshes are normal when a tab regains focus. Keep track of the
  // authenticated user so a refresh never clears the current classroom.
  const sessionUserId = useRef<string | null>(null)

  useEffect(() => {
    if (!backend) { setLoading(false); return }
    let alive = true
    backend.auth.getSession().then(({ data, error: authError }) => {
      if (!alive) return
      if (authError) setError(authError.message)
      setSession(data.session)
      sessionUserId.current = data.session?.user.id ?? null
      setProfile(null)
      setLoading(false)
    })
    const { data: { subscription } } = backend.auth.onAuthStateChange((event, next) => {
      if (event === 'INITIAL_SESSION') return

      // Token refresh / user update events: the user is
      // still the same, so replacing the profile would unmount Dashboard and
      // discard modal/form state.
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setSession(next)
        return
      }

      const nextUserId = next?.user.id ?? null
      const userChanged = sessionUserId.current !== nextUserId
      sessionUserId.current = nextUserId
      setSession(next)
      if (!next || userChanged) setProfile(null)
      setError('')
    })
    return () => { alive = false; subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    const userId = session?.user.id
    if (!userId || !backend) return
    let alive = true
    setProfileLoading(true)
    setError('')
    backend.from('profiles').select(PROFILE_FIELDS).eq('id', userId).single().then(({ data, error: profileError }) => {
      if (!alive) return
      if (profileError) setError('No pudimos validar tu perfil. Comprueba tu conexión e inténtalo de nuevo.')
      else if (data) setProfile(data as Profile)
      setProfileLoading(false)
    })
    return () => { alive = false }
  }, [session?.user.id])

  if (loading || (session && (profileLoading || !profile) && !error)) return <BootScreen title="Preparando tu aula" detail="Verificando tu acceso y cargando tu espacio…"/>
  if (session && !profile && error) return <BootScreen title="No pudimos validar tu acceso" detail={error} action={<button className="boot-retry" onClick={() => void backend?.auth.signOut()}>Volver al inicio de sesión</button>}/>
  if (!session || !profile) return <Login error={error} clearError={() => setError('')} />
  return <Dashboard session={session} profile={profile} profileError={error} onProfileChange={setProfile} />
}
