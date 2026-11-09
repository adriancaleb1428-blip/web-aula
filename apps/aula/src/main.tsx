import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css?brand=aula-consulting'
import './styles-v2.css'

// GitHub Pages cannot send X-Frame-Options or frame-ancestors, so refuse to
// render inside another site's frame (clickjacking).
const framed = (() => { try { return window.top !== window.self } catch { return true } })()

// Older builds cached the user's role in localStorage; roles are always read
// from the database now.
try { Object.keys(localStorage).filter(key => key.startsWith('aula-profile:')).forEach(key => localStorage.removeItem(key)) } catch { /* storage unavailable */ }

const root = document.getElementById('root')!
if (framed) root.textContent = 'Por seguridad, Aula Consulting no puede mostrarse dentro de otro sitio.'
else createRoot(root).render(<React.StrictMode><App /></React.StrictMode>)
