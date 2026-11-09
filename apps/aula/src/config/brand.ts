// Identidad y contacto del aula. Para reutilizar el proyecto con otro cliente, cambia solo este archivo
// (y los logos de src/assets). El número de WhatsApp también puede definirse con VITE_WHATSAPP_NUMBER.
export const BRAND = {
  appName: 'Aula Consulting',
  organization: 'PROTEQLIFE',
  whatsapp: '51950950304',
  supportEmail: 'soporte@aula.demo',
  timezone: 'America/Lima',
} as const

export const COPYRIGHT = () => `© ${new Date().getFullYear()} ${BRAND.appName} · ${BRAND.organization}`
