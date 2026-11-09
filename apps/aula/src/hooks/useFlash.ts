import { useEffect, useState } from 'react'

/** Mensaje de resultado que se muestra una vez como aviso flotante (salvo que un modal siga abierto y lo muestre él). */
export function useFlash(push: (message: string) => void, held = false) {
  const [message, setMessage] = useState('')
  useEffect(() => { if (message && !held) { push(message); setMessage('') } }, [message, held, push])
  return [message, setMessage] as const
}
