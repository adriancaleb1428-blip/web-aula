// Cliente del servidor propio (apps/api, PostgreSQL). Expone una interfaz de consultas encadenadas:
// auth, from().select/insert/update/upsert/delete, rpc, functions.invoke, storage y canales en vivo.
type Row = Record<string, unknown>

const API = String(import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
const TOKEN_KEY = 'aula-token'

export type Session = { access_token: string; user: { id: string; correo?: string; nombre_completo?: string } }
type DbError = { code?: string; message: string }
type Result = { data: any; error: DbError | null; count?: number | null } // eslint-disable-line @typescript-eslint/no-explicit-any

const readToken = () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } }
const writeToken = (token: string | null) => { try { if (token) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY) } catch { /* sin almacenamiento */ } }
const authHeader = (): Record<string, string> => { const token = readToken(); return token ? { Authorization: `Bearer ${token}` } : {} }

async function post(path: string, body: unknown, withAuth = true): Promise<{ status: number; json: any }> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const response = await fetch(`${API}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(withAuth ? authHeader() : {}) }, body: JSON.stringify(body ?? {}) })
  let json: unknown = null
  try { json = await response.json() } catch { /* sin cuerpo */ }
  if (response.status === 401 && withAuth && readToken()) { writeToken(null); authListeners.forEach(callback => callback('SIGNED_OUT', null)) }
  return { status: response.status, json }
}
const networkError: DbError = { message: 'No se pudo conectar con el servidor. Comprueba tu conexión.' }

// ── Consultas ────────────────────────────────────────────────────────
class Query implements PromiseLike<Result> {
  private filters: { op: string; column: string; value: unknown }[] = []
  private sorting: { column: string; ascending: boolean } | null = null
  private max: number | null = null
  private shape: 'many' | 'single' | 'maybe' = 'many'
  private returning = false
  private wantCount = false
  private conflict: string[] = []
  constructor(private table: string, private op: 'select' | 'insert' | 'update' | 'upsert' | 'delete', private payload: Row | Row[] | null = null, options: { onConflict?: string } = {}) {
    this.conflict = options.onConflict ? options.onConflict.split(',').map(part => part.trim()) : []
  }
  select(_columns?: string, options?: { count?: string }) { this.returning = true; if (options?.count) this.wantCount = true; return this }
  eq(column: string, value: unknown) { this.filters.push({ op: 'eq', column, value }); return this }
  neq(column: string, value: unknown) { this.filters.push({ op: 'neq', column, value }); return this }
  in(column: string, value: unknown[]) { this.filters.push({ op: 'in', column, value }); return this }
  is(column: string, value: unknown) { this.filters.push({ op: 'is', column, value }); return this }
  order(column: string, options?: { ascending?: boolean }) { this.sorting = { column, ascending: options?.ascending !== false }; return this }
  limit(count: number) { this.max = count; return this }
  single() { this.shape = 'single'; return this }
  maybeSingle() { this.shape = 'maybe'; return this }
  then<A = Result, B = never>(onFulfilled?: ((value: Result) => A | PromiseLike<A>) | null, onRejected?: ((reason: unknown) => B | PromiseLike<B>) | null) {
    return this.run().then(onFulfilled, onRejected)
  }
  private async run(): Promise<Result> {
    try {
      const { json } = await post(`/rest/${this.table}`, { op: this.op, filters: this.filters, order: this.sorting, limit: this.max, payload: this.payload, returning: this.returning, shape: this.shape, count: this.wantCount, onConflict: this.conflict })
      if (json && 'error' in json && 'data' in json) return json as Result
      return { data: null, error: { message: json?.error || 'Respuesta inesperada del servidor.' } }
    } catch { return { data: null, error: networkError } }
  }
}

// ── Eventos en vivo (SSE sobre fetch, con la sesión en la cabecera) ───
type Sub = { opts: { event: string; table: string; schema?: string; filter?: string }; callback: (payload: { new: Row; old: Row | null; eventType: string }) => void }
const subscribers = new Set<Sub>()
let stream: AbortController | null = null

async function openStream() {
  if (stream || !subscribers.size || !readToken()) return
  const controller = new AbortController(); stream = controller
  let delay = 1000
  while (!controller.signal.aborted) {
    try {
      const response = await fetch(`${API}/events`, { headers: { ...authHeader(), Accept: 'text/event-stream' }, signal: controller.signal })
      if (response.status === 401) break
      if (!response.ok || !response.body) throw new Error('stream')
      delay = 1000
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
      let buffer = ''
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += value
        let index
        while ((index = buffer.indexOf('\n\n')) >= 0) {
          const chunk = buffer.slice(0, index); buffer = buffer.slice(index + 2)
          const line = chunk.split('\n').find(item => item.startsWith('data: '))
          if (line) dispatch(JSON.parse(line.slice(6)))
        }
      }
    } catch { if (controller.signal.aborted) return }
    await new Promise(resolve => window.setTimeout(resolve, delay)); delay = Math.min(delay * 2, 15000)
  }
  if (stream === controller) stream = null
}
function dispatch(change: { table: string; event: string; row: Row }) {
  for (const sub of subscribers) {
    if (sub.opts.table !== change.table || (sub.opts.event !== '*' && sub.opts.event !== change.event)) continue
    if (sub.opts.filter) { const [column, value] = sub.opts.filter.split('=eq.'); if (String(change.row[column]) !== value) continue }
    sub.callback({ new: change.row, old: null, eventType: change.event })
  }
}
function closeStreamIfIdle() { if (!subscribers.size && stream) { stream.abort(); stream = null } }

class Channel {
  private subs: Sub[] = []
  on(_type: string, opts: Sub['opts'], callback: Sub['callback']) { this.subs.push({ opts, callback }); return this }
  subscribe() { for (const sub of this.subs) subscribers.add(sub); void openStream(); return this }
  unsubscribe() { for (const sub of this.subs) subscribers.delete(sub); closeStreamIfIdle() }
}

// ── Autenticación ────────────────────────────────────────────────────
type AuthCallback = (event: string, session: Session | null) => void
const authListeners = new Set<AuthCallback>()
async function currentSession(): Promise<Session | null> {
  const token = readToken()
  if (!token) return null
  try {
    const response = await fetch(`${API}/auth/session`, { headers: authHeader() })
    if (!response.ok) { if (response.status === 401) writeToken(null); return null }
    return { access_token: token, user: (await response.json()).usuario }
  } catch { return null }
}
const auth = {
  async getSession(): Promise<{ data: { session: Session | null }; error: { message: string } | null }> { return { data: { session: await currentSession() }, error: null } },
  async signInWithPassword({ correo, contrasena }: { correo: string; contrasena: string }) {
    try {
      const { status, json } = await post('/auth/login', { correo, contrasena }, false)
      if (status !== 200) return { data: { session: null, user: null }, error: { status, message: json?.error || 'Invalid login credentials' } }
      writeToken(json.access_token)
      const session = await currentSession()
      authListeners.forEach(callback => callback('SIGNED_IN', session))
      return { data: { session, user: session?.user ?? null }, error: null }
    } catch { return { data: { session: null, user: null }, error: { status: 0, message: networkError.message } } }
  },
  async signOut() { writeToken(null); stream?.abort(); stream = null; authListeners.forEach(callback => callback('SIGNED_OUT', null)); return { error: null } },
  async updateUser({ contrasena }: { contrasena?: string }) {
    try {
      const { status, json } = await post('/auth/password', { contrasena })
      return status === 200 ? { data: { user: null }, error: null } : { data: { user: null }, error: { message: json?.error || 'No se pudo cambiar la contraseña.' } }
    } catch { return { data: { user: null }, error: networkError } }
  },
  onAuthStateChange(callback: AuthCallback) {
    authListeners.add(callback)
    return { data: { subscription: { unsubscribe: () => { authListeners.delete(callback) } } } }
  },
}

// ── Archivos ─────────────────────────────────────────────────────────
const storage = {
  from: (bucket: string) => ({
    async upload(path: string, file: Blob, _options?: unknown) {
      try {
        const response = await fetch(`${API}/storage/upload?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`, { method: 'POST', headers: { ...authHeader(), 'Content-Type': (file as File).type || 'application/octet-stream' }, body: file })
        if (response.ok) return { data: { path }, error: null }
        return { data: null, error: { message: (await response.json().catch(() => null))?.error || 'No se pudo subir el archivo.' } }
      } catch { return { data: null, error: networkError } }
    },
    async createSignedUrl(path: string, _expiresIn?: number) {
      try {
        const { status, json } = await post('/storage/sign', { bucket, path })
        return status === 200 ? { data: { signedUrl: `${API}${json.signedUrl}` }, error: null } : { data: null, error: { message: json?.error || 'Archivo no encontrado' } }
      } catch { return { data: null, error: networkError } }
    },
    async download(path: string) {
      const signed = await this.createSignedUrl(path)
      if (!signed.data) return { data: null, error: signed.error }
      try {
        const response = await fetch(signed.data.signedUrl)
        return response.ok ? { data: await response.blob(), error: null } : { data: null, error: { message: 'Archivo no encontrado' } }
      } catch { return { data: null, error: networkError } }
    },
    async remove(paths: string[]) {
      try {
        const { status, json } = await post('/storage/remove', { bucket, paths })
        return status === 200 ? { data: [], error: null } : { data: null, error: { message: json?.error || 'No se pudo eliminar el archivo.' } }
      } catch { return { data: null, error: networkError } }
    },
  }),
}

/** Sube con avance (fetch no informa del progreso; XMLHttpRequest sí). Devuelve un mensaje de error o null. */
export function uploadFile(bucket: string, path: string, file: File, onProgress: (percent: number) => void): Promise<string | null> {
  return new Promise(resolve => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API}/storage/upload?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`)
    for (const [name, value] of Object.entries(authHeader())) xhr.setRequestHeader(name, value)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100)) }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) { onProgress(100); resolve(null); return }
      let message = xhr.status === 413 ? 'El archivo supera el tamaño permitido.' : 'No se pudo subir el archivo.'
      try { message = JSON.parse(xhr.responseText).error || message } catch { /* mensaje por defecto */ }
      resolve(message)
    }
    xhr.onerror = () => resolve('Se perdió la conexión durante la subida. Inténtalo de nuevo.')
    xhr.send(file)
  })
}

export const apiClient = {
  auth, storage,
  from: (table: string) => ({
    select: (columns?: string, options?: { count?: string }) => new Query(table, 'select').select(columns, options),
    insert: (payload: Row | Row[]) => new Query(table, 'insert', payload),
    update: (payload: Row) => new Query(table, 'update', payload),
    upsert: (payload: Row | Row[], options?: { onConflict?: string }) => new Query(table, 'upsert', payload, options),
    delete: () => new Query(table, 'delete'),
  }),
  async rpc(name: string, args?: Record<string, unknown>) {
    try { const { json } = await post(`/rpc/${name}`, args); return json as Result } catch { return { data: null, error: networkError } }
  },
  functions: {
    // Los errores de negocio llegan en `data.error`.
    async invoke(name: string, options?: { body?: Record<string, unknown> }) {
      try { const { json } = await post(`/fn/${name}`, options?.body, name !== 'solicitud-soporte' || Boolean(readToken())); return { data: json, error: null } } catch { return { data: null, error: networkError } }
    },
  },
  channel: (_name?: string) => new Channel(),
  removeChannel: async (channel: Channel) => { channel.unsubscribe(); return 'ok' },
}
