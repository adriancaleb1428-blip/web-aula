import { uploadFile } from './backend'

/** Sube un archivo informando el avance (0–100). Devuelve un mensaje de error o null si todo salió bien. */
export function uploadWithProgress(bucket: string, path: string, file: File, onProgress: (percent: number) => void): Promise<string | null> {
  return uploadFile(bucket, path, file, onProgress)
}
