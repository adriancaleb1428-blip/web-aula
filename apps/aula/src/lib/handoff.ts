// Entrada desde la web de ventas: `/#token=…&curso=CODIGO` (tras la compra) o `/?curso=CODIGO` (enlace a un curso).
// El token viaja en el fragmento (no se envía a ningún servidor) y se borra de la barra de direcciones al leerlo.
const TOKEN_KEY = 'aula-token'
const COURSE_KEY = 'aula-open-course'

export function consumeHandoff() {
  try {
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''))
    const query = new URLSearchParams(location.search)
    const token = hash.get('token')
    const course = hash.get('curso') || query.get('curso')
    if (token) localStorage.setItem(TOKEN_KEY, token)
    if (course) sessionStorage.setItem(COURSE_KEY, course.slice(0, 120))
    if (token || course) history.replaceState(null, '', location.pathname)
  } catch { /* sin almacenamiento: se entra con el formulario normal */ }
}

export function pendingCourse() {
  try { return sessionStorage.getItem(COURSE_KEY) } catch { return null }
}
export function clearPendingCourse() {
  try { sessionStorage.removeItem(COURSE_KEY) } catch { /* nada */ }
}
