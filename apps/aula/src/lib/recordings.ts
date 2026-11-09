import { uploadWithProgress } from './upload'

/** Sube el video de una clase al almacenamiento del curso. Devuelve la ruta guardada o un mensaje de error. */
export async function uploadRecording(courseId: string, file: File, onProgress: (percent: number) => void): Promise<{ path: string; error: '' } | { path: ''; error: string }> {
  const name = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '-').slice(-80)
  const path = `${courseId}/${crypto.randomUUID()}-${name}`
  const error = await uploadWithProgress('course-recordings', path, file, onProgress)
  return error ? { path: '', error } : { path, error: '' }
}
