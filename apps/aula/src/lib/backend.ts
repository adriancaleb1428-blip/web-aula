import { apiClient } from './api/client'
import { demoClient } from './demo/client'

// Punto único de conexión con los datos. El resto de la app solo usa `backend`.
//  · Servidor propio (por defecto): apps/api con PostgreSQL. Dirección en VITE_API_URL (por defecto «/api»).
//  · Modo demo: VITE_BACKEND=demo. Todo corre en el navegador con datos de ejemplo (sin servidor ni SQL).
export const isDemoMode = import.meta.env.VITE_BACKEND === 'demo'
export const backend = (isDemoMode ? demoClient : apiClient) as unknown as typeof apiClient
export { uploadFile } from './api/client'
