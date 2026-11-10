import { useEffect, useState } from 'react'
import { backend } from '../lib/backend'
import type { AdminUser, Role } from '../lib/types'
import { useFlash } from './useFlash'

/** Lista de cuentas (solo administradores) a través de la función admin-usuarios. */
export function useAdminUsers(role: Role, pushToast: (message: string) => void) {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [adminUsersReady, setAdminUsersReady] = useState(false)
  const [, setAdminMessage] = useFlash(pushToast)
  const [adminBusy, setAdminBusy] = useState(false)

  async function refreshAdminUsers() {
    if (!backend || role !== 'administrador') return
    const { data, error } = await backend.functions.invoke('admin-usuarios', { body: { accion: 'listar' } })
    if (error) setAdminMessage('No se pudieron cargar los usuarios. Actualiza la página.')
    else setAdminUsers((data?.usuarios || []) as AdminUser[])
  }

  useEffect(() => {
    if (role !== 'administrador' || !backend) { setAdminUsersReady(true); return }
    let alive = true
    setAdminUsersReady(false)
    setAdminBusy(true); setAdminMessage('')
    backend.functions.invoke('admin-usuarios', { body: { accion: 'listar' } }).then(({ data, error }) => {
      if (!alive) return
      if (error) setAdminMessage('No se pudieron cargar los usuarios. Actualiza la página.')
      else setAdminUsers((data?.usuarios || []) as AdminUser[])
      setAdminBusy(false)
      setAdminUsersReady(true)
    })
    return () => { alive = false }
  }, [role])

  return { adminUsers, setAdminUsers, adminUsersReady, setAdminMessage, adminBusy, setAdminBusy, refreshAdminUsers }
}
