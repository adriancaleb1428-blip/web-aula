import { isDemoMode, uploadFile } from './backend'
import { fileKey, putFile } from './demo/files'

// Modo demo: guarda el archivo en el navegador y simula el avance de la subida.
async function saveLocally(bucket: string, path: string, file: File, onProgress: (percent: number) => void): Promise<string | null> {
  for (const percent of [15, 40, 70, 90]) { onProgress(percent); await new Promise(resolve => window.setTimeout(resolve, 80)) }
  try { await putFile(fileKey(bucket, path), file) } catch { return 'No se pudo guardar el archivo en el navegador (almacenamiento lleno).' }
  onProgress(100)
  return null
}

/** Sube un archivo informando el avance (0–100). Devuelve un mensaje de error o null si todo salió bien. */
export function uploadWithProgress(bucket: string, path: string, file: File, onProgress: (percent: number) => void): Promise<string | null> {
  return isDemoMode ? saveLocally(bucket, path, file, onProgress) : uploadFile(bucket, path, file, onProgress)
}
