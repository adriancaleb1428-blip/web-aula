import { useEffect, useRef, useState } from 'react'
import { IDLE_LIMIT_MS, IDLE_WARNING_MS } from './config'

const ACTIVITY_KEY = 'aula-last-activity'
const LOGOUT_FLAG = 'aula-idle-logout'
let memoryLastActivity = 0

function readLastActivity() {
  try { return Number(localStorage.getItem(ACTIVITY_KEY)) || memoryLastActivity } catch { return memoryLastActivity }
}

export function markActivityNow() {
  memoryLastActivity = Date.now()
  try { localStorage.setItem(ACTIVITY_KEY, String(memoryLastActivity)) } catch { /* storage unavailable */ }
}

export function setIdleLogoutFlag(value: boolean) {
  try { if (value) sessionStorage.setItem(LOGOUT_FLAG, '1'); else sessionStorage.removeItem(LOGOUT_FLAG) } catch { /* storage unavailable */ }
}

export function readIdleLogoutFlag() {
  try { return sessionStorage.getItem(LOGOUT_FLAG) === '1' } catch { return false }
}

// Calls onTimeout after IDLE_LIMIT_MS without pointer, keyboard or scroll
// activity. Activity is shared between tabs, so an idle tab does not sign out
// a tab the user is working in. Returns the seconds left during the warning.
export function useIdleLogout(onTimeout: () => void) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const timeoutRef = useRef(onTimeout)
  timeoutRef.current = onTimeout

  useEffect(() => {
    const previous = readLastActivity()
    if (previous && Date.now() - previous > IDLE_LIMIT_MS) { timeoutRef.current(); return }
    markActivityNow()
    let lastWrite = Date.now()
    const markActive = () => {
      if (Date.now() - lastWrite < 5000) return
      lastWrite = Date.now()
      markActivityNow()
    }
    const events = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'wheel', 'touchstart'] as const
    events.forEach(name => window.addEventListener(name, markActive, { passive: true }))
    const timer = window.setInterval(() => {
      const idle = Date.now() - (readLastActivity() || Date.now())
      if (idle >= IDLE_LIMIT_MS) { window.clearInterval(timer); timeoutRef.current(); return }
      setSecondsLeft(idle >= IDLE_LIMIT_MS - IDLE_WARNING_MS ? Math.ceil((IDLE_LIMIT_MS - idle) / 1000) : null)
    }, 1000)
    return () => { events.forEach(name => window.removeEventListener(name, markActive)); window.clearInterval(timer) }
  }, [])

  return { secondsLeft, stayActive: () => { markActivityNow(); setSecondsLeft(null) } }
}
