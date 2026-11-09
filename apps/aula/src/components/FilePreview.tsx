import { useEffect, useState } from 'react'
import { ArrowDown, ExternalLink, FileText, LoaderCircle } from 'lucide-react'
import { backend } from '../lib/backend'
import { Modal } from './ui'

export type PreviewFile = { bucket: string; path: string; title: string; mimeType: string | null }

const officeTypes = new Set(['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'])

function previewKind(file: PreviewFile) {
  const type = file.mimeType || ''
  const extension = file.path.split('.').pop()?.toLowerCase() || ''
  if (type === 'application/pdf' || extension === 'pdf') return 'pdf'
  if (type.startsWith('image/')) return 'image'
  if (type.startsWith('video/')) return 'video'
  if (type === 'text/plain' || extension === 'txt') return 'text'
  if (officeTypes.has(type) || ['doc', 'docx', 'ppt', 'pptx'].includes(extension)) return 'office'
  return 'other'
}

export async function downloadPrivateFile(bucket: string, path: string, filename: string) {
  if (!backend) return 'El almacenamiento no está disponible.'
  const { data, error } = await backend.storage.from(bucket).download(path)
  if (error || !data) return `No se pudo descargar el archivo: ${error?.message || 'no disponible'}`
  const extension = path.includes('.') ? `.${path.split('.').pop()}` : ''
  const url = URL.createObjectURL(data)
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = extension && !filename.toLowerCase().endsWith(extension.toLowerCase()) ? `${filename}${extension}` : filename
  document.body.append(anchor); anchor.click(); anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  return ''
}

// Office files are rendered by Microsoft's viewer, which needs a reachable URL:
// it receives a signed link that expires after 10 minutes.
export function FilePreview({ file, onClose }: { file: PreviewFile; onClose: () => void }) {
  const kind = previewKind(file)
  const [signedUrl, setSignedUrl] = useState('')
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!backend) return
    let alive = true
    backend.storage.from(file.bucket).createSignedUrl(file.path, 600).then(async ({ data, error: signError }) => {
      if (!alive) return
      if (signError || !data?.signedUrl) { setError('No se pudo abrir el archivo. Intenta descargarlo.'); return }
      setSignedUrl(data.signedUrl)
      if (kind === 'text') {
        const response = await fetch(data.signedUrl)
        if (alive) setText((await response.text()).slice(0, 200000))
      }
    })
    return () => { alive = false }
  }, [file.bucket, file.path, kind])

  async function download() {
    setDownloading(true)
    const message = await downloadPrivateFile(file.bucket, file.path, file.title)
    setDownloading(false)
    if (message) setError(message)
  }

  return <Modal overline="VISTA PREVIA" title={file.title} onClose={onClose} wide>
    <div className="preview-toolbar"><span>{kind === 'office' ? 'Vista previa generada por el visor de Microsoft Office.' : 'Revisa el archivo sin descargarlo.'}</span><span className="preview-actions">{kind === 'pdf' && signedUrl && <a className="outline-button" href={signedUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/> Abrir</a>}<button className="modal-save" onClick={() => void download()} disabled={downloading}>{downloading ? 'Descargando…' : 'Descargar'} <ArrowDown size={14}/></button></span></div>
    <div className="preview-frame">
      {error ? <p className="preview-message">{error}</p>
        : !signedUrl ? <p className="preview-message"><LoaderCircle className="spin" size={20}/> Preparando la vista previa…</p>
        : kind === 'pdf' ? <iframe title={file.title} src={`${signedUrl}#toolbar=1`}/>
        : kind === 'image' ? <img src={signedUrl} alt={file.title}/>
        : kind === 'video' ? <video controls playsInline preload="metadata" src={signedUrl}/>
        : kind === 'text' ? <pre>{text}</pre>
        : kind === 'office' ? <iframe title={file.title} src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`}/>
        : <p className="preview-message"><FileText size={20}/> Este formato no tiene vista previa. Descárgalo para abrirlo.</p>}
    </div>
  </Modal>
}
