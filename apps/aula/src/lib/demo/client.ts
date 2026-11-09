// Cliente de demostración que funciona sin servidor. Implementa solo lo que usa la app:
// auth, from().select/insert/update/upsert/delete, rpc, functions.invoke, storage y canales en vivo.
import { canSee, dbDelete, dbInsert, dbUpdate, onChange, profileOf, save, sessionUserId, setSessionUser, table, visibleRows } from './db'
import type { DbError, Row } from './db'
import { deleteFile, fileKey, getFile, putFile } from './files'
import { invokeFunction, rpc } from './functions'

type Result = { data: any; error: DbError | null; count?: number | null } // eslint-disable-line @typescript-eslint/no-explicit-any
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value))

class Query implements PromiseLike<Result> {
  private filters: ((row: Row) => boolean)[] = []
  private payload: Row | Row[] | null = null
  private returning = false
  private sorting: { column: string; ascending: boolean } | null = null
  private max = Infinity
  private shape: 'many' | 'single' | 'maybe' = 'many'
  private wantCount = false
  private conflict: string[] = []
  constructor(private name: string, private op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select', payload: Row | Row[] | null = null, options: { onConflict?: string } = {}) {
    this.payload = payload
    this.conflict = options.onConflict ? options.onConflict.split(',').map(part => part.trim()) : []
  }

  select(_columns?: string, options?: { count?: string }) { this.returning = true; if (options?.count) this.wantCount = true; return this }
  eq(column: string, value: unknown) { this.filters.push(row => row[column] === value); return this }
  neq(column: string, value: unknown) { this.filters.push(row => row[column] !== value); return this }
  in(column: string, values: unknown[]) { this.filters.push(row => values.includes(row[column])); return this }
  is(column: string, value: unknown) { this.filters.push(row => (value === null ? row[column] == null : row[column] === value)); return this }
  order(column: string, options?: { ascending?: boolean }) { this.sorting = { column, ascending: options?.ascending !== false }; return this }
  limit(count: number) { this.max = count; return this }
  single() { this.shape = 'single'; return this }
  maybeSingle() { this.shape = 'maybe'; return this }
  then<A = Result, B = never>(onFulfilled?: ((value: Result) => A | PromiseLike<A>) | null, onRejected?: ((reason: unknown) => B | PromiseLike<B>) | null) {
    return Promise.resolve().then(() => this.run()).then(onFulfilled, onRejected)
  }

  private matches() {
    const userId = sessionUserId()
    return visibleRows(this.name, userId).filter(row => this.filters.every(filter => filter(row)))
  }
  private finish(rows: Row[], count: number | null = null): Result {
    if (this.shape === 'many') return { data: clone(rows), error: null, count }
    if (this.shape === 'maybe') return { data: rows[0] ? clone(rows[0]) : null, error: null, count }
    if (rows.length !== 1) return { data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }, count }
    return { data: clone(rows[0]), error: null, count }
  }

  private run(): Result {
    if (!sessionUserId()) return { data: null, error: { code: '42501', message: 'Debes iniciar sesión.' } }
    if (this.op === 'select') {
      let rows = this.matches()
      const total = this.wantCount ? rows.length : null
      const sort = this.sorting
      if (sort) rows = [...rows].sort((a, b) => (a[sort.column] > b[sort.column] ? 1 : a[sort.column] < b[sort.column] ? -1 : 0) * (sort.ascending ? 1 : -1))
      return this.finish(rows.slice(0, this.max), total)
    }
    if (this.op === 'insert' || this.op === 'upsert') {
      const done: Row[] = []
      for (const item of Array.isArray(this.payload) ? this.payload : [this.payload || {}]) {
        const existing = this.op === 'upsert' && this.conflict.length ? table(this.name).find(row => this.conflict.every(column => row[column] === item[column])) : undefined
        const result = existing ? dbUpdate(this.name, existing, item) : dbInsert(this.name, item)
        if (result.error) return { data: null, error: result.error }
        if (result.row) done.push(result.row)
      }
      return this.returning ? this.finish(done) : { data: null, error: null }
    }
    const targets = this.matches()
    if (this.op === 'update') {
      const done: Row[] = []
      for (const row of targets) {
        const result = dbUpdate(this.name, row, this.payload as Row)
        if (result.error) return { data: null, error: result.error }
        if (result.row) done.push(result.row)
      }
      return this.returning ? this.finish(done) : { data: null, error: null }
    }
    for (const row of targets) dbDelete(this.name, row)
    return this.returning ? this.finish(targets) : { data: null, error: null }
  }
}

// ── Canales en vivo (postgres_changes) ───────────────────────────────
type Subscription = { opts: { event: string; table: string; filter?: string }; callback: (payload: { new: Row; old: Row | null; eventType: string }) => void }
class Channel {
  private subs: Subscription[] = []
  private off: (() => void) | null = null
  on(_type: string, opts: Subscription['opts'], callback: Subscription['callback']) { this.subs.push({ opts, callback }); return this }
  subscribe() {
    this.off = onChange((event, name, row, old) => {
      const userId = sessionUserId()
      for (const sub of this.subs) {
        if (sub.opts.table !== name || (sub.opts.event !== '*' && sub.opts.event !== event) || !canSee(name, row, userId)) continue
        if (sub.opts.filter) { const [column, value] = sub.opts.filter.split('=eq.'); if (String(row[column]) !== value) continue }
        window.setTimeout(() => sub.callback({ new: row, old, eventType: event }), 0)
      }
    })
    return this
  }
  unsubscribe() { this.off?.(); this.off = null }
}

// ── Autenticación ────────────────────────────────────────────────────
type AuthCallback = (event: string, session: unknown) => void
const authListeners = new Set<AuthCallback>()
function sessionFor(id: string | null) {
  const account = table('auth_users').find(user => user.id === id)
  if (!account) return null
  const profile = profileOf(id)
  return { access_token: `demo-${id}`, refresh_token: 'demo', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: account.id, email: account.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: { full_name: profile?.full_name || '' }, created_at: account.created_at } }
}
const auth = {
  async getSession() { return { data: { session: sessionFor(sessionUserId()) }, error: null } },
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    await new Promise(resolve => window.setTimeout(resolve, 350))
    const account = table('auth_users').find(user => user.email === email.trim().toLowerCase() && user.password === password)
    if (!account) return { data: { session: null, user: null }, error: { status: 400, message: 'Invalid login credentials' } }
    account.last_sign_in_at = new Date().toISOString(); save(); setSessionUser(account.id)
    const session = sessionFor(account.id)
    authListeners.forEach(callback => callback('SIGNED_IN', session))
    return { data: { session, user: session?.user }, error: null }
  },
  async signOut() { setSessionUser(null); authListeners.forEach(callback => callback('SIGNED_OUT', null)); return { error: null } },
  async updateUser({ password }: { password?: string }) {
    const account = table('auth_users').find(user => user.id === sessionUserId())
    if (!account) return { data: { user: null }, error: { message: 'No hay sesión activa.' } }
    if (password) account.password = password
    save()
    return { data: { user: sessionFor(account.id)?.user }, error: null }
  },
  onAuthStateChange(callback: AuthCallback) {
    authListeners.add(callback)
    return { data: { subscription: { unsubscribe: () => { authListeners.delete(callback) } } } }
  },
}

// ── Almacenamiento de archivos ───────────────────────────────────────
const storage = {
  from: (bucket: string) => ({
    async upload(path: string, file: Blob) { await putFile(fileKey(bucket, path), file); return { data: { path }, error: null } },
    async download(path: string) { const blob = await getFile(fileKey(bucket, path)); return blob ? { data: blob, error: null } : { data: null, error: { message: 'Archivo no encontrado' } } },
    async createSignedUrl(path: string) { const blob = await getFile(fileKey(bucket, path)); return blob ? { data: { signedUrl: URL.createObjectURL(blob) }, error: null } : { data: null, error: { message: 'Archivo no encontrado' } } },
    async remove(paths: string[]) { await Promise.all(paths.map(path => deleteFile(fileKey(bucket, path)))); return { data: [], error: null } },
  }),
}

export const demoClient = {
  auth, storage,
  from: (name: string) => ({
    select: (columns?: string, options?: { count?: string }) => new Query(name).select(columns, options),
    insert: (payload: Row | Row[]) => new Query(name, 'insert', payload),
    update: (payload: Row) => new Query(name, 'update', payload),
    upsert: (payload: Row | Row[], options?: { onConflict?: string }) => new Query(name, 'upsert', payload, options),
    delete: () => new Query(name, 'delete'),
  }),
  rpc: async (name: string, args?: Record<string, unknown>) => { await Promise.resolve(); return rpc(name, args) },
  functions: { invoke: (name: string, options?: { body?: Record<string, unknown> }) => invokeFunction(name, options?.body) },
  channel: () => new Channel(),
  removeChannel: async (channel: Channel) => { channel.unsubscribe(); return 'ok' },
}
