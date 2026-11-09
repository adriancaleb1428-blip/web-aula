// Almacén de archivos del modo demo: guarda Blobs en IndexedDB del navegador.
// Sustituye al almacenamiento del servidor en modo demo.

const DB_NAME = 'aula-demo-files'
const STORE = 'blobs'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const request = work(tx.objectStore(STORE))
    tx.oncomplete = () => { db.close(); resolve(request ? (request.result as T) : undefined) }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

let pending: Promise<unknown> = Promise.resolve()
/** Espera a que terminen las escrituras iniciales (siembra de archivos demo). */
export const filesReady = () => pending
export function afterSeed(task: Promise<unknown>) { pending = Promise.all([pending, task]) }

export const fileKey = (bucket: string, path: string) => `${bucket}/${path}`
export const putFile = (key: string, blob: Blob) => run('readwrite', store => { store.put(blob, key) })
export async function getFile(key: string): Promise<Blob | null> { await pending; return (await run<Blob | undefined>('readonly', store => store.get(key))) || null }
export const deleteFile = (key: string) => run('readwrite', store => { store.delete(key) })
export const clearFiles = () => run('readwrite', store => { store.clear() })

/** PDF mínimo válido (una página, texto Helvetica) para los certificados y guías de ejemplo. */
export function makePdf(title: string, lines: string[]): Blob {
  const clean = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, '').replace(/[\\()]/g, '\\$&')
  const content = ['BT', '/F1 22 Tf', '72 740 Td', `(${clean(title)}) Tj`, '/F1 12 Tf', ...lines.flatMap(line => ['0 -26 Td', `(${clean(line)}) Tj`]), 'ET'].join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n` })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}`
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new Blob([pdf], { type: 'application/pdf' })
}
