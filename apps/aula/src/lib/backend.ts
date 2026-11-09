import { apiClient } from './api/client'

// Punto único de conexión con los datos: el servidor propio (apps/api con PostgreSQL).
// Su dirección se define en VITE_API_URL (por defecto «/api»).
export const backend = apiClient
export { uploadFile } from './api/client'
