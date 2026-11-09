import { Modal } from './ui'

export type InfoTopic = 'privacy' | 'terms'

// Plain-language summaries of how the training classroom handles accounts
// and content. Review them with PROTEQLIFE's legal advisor before relying on
// them as the formal policy.
const content: Record<InfoTopic, { title: string; sections: { heading: string; body: string }[] }> = {
  privacy: {
    title: 'Política de privacidad',
    sections: [
      { heading: 'Qué datos usamos', body: 'Tu nombre, correo, rol en el aula y, si los completas, teléfono, empresa, cargo y foto de perfil. También registramos tus matrículas, certificados y avisos.' },
      { heading: 'Para qué los usamos', body: 'Para darte acceso a tus capacitaciones, enviarte avisos de nuevos materiales y clases, emitir certificados y atender tus consultas de soporte.' },
      { heading: 'Quién puede verlos', body: 'Solo el equipo administrador de PROTEQLIFE y los facilitadores de los cursos en los que participas. No vendemos ni compartimos tus datos con fines comerciales.' },
      { heading: 'Seguridad', body: 'Las contraseñas se guardan cifradas, la conexión usa HTTPS y la sesión se cierra tras 30 minutos sin actividad. Los archivos del curso son privados y solo los ven los participantes matriculados.' },
      { heading: 'Tus derechos', body: 'Puedes pedir la actualización o eliminación de tus datos escribiendo al equipo de soporte por WhatsApp o a analista.procesos@proteqlife.com.pe.' },
    ],
  },
  terms: {
    title: 'Términos de uso',
    sections: [
      { heading: 'Acceso', body: 'Las cuentas son personales e intransferibles y las entrega PROTEQLIFE a empresas, equipos y emprendedores inscritos en sus programas de capacitación.' },
      { heading: 'Uso de los materiales', body: 'Los materiales, grabaciones y presentaciones son para tu formación. No está permitido redistribuirlos ni publicarlos sin autorización de PROTEQLIFE.' },
      { heading: 'Clases en vivo', body: 'Los enlaces de las sesiones son exclusivos para participantes. Mantén una conducta respetuosa con facilitadores y compañeros.' },
      { heading: 'Certificados', body: 'Se emiten cuando cumples los requisitos de cada programa. PROTEQLIFE puede verificar su autenticidad mediante el número de certificado.' },
      { heading: 'Cambios', body: 'Podemos actualizar estos términos. Te avisaremos dentro del aula cuando haya cambios importantes.' },
    ],
  },
}

export function InfoModal({ topic, onClose }: { topic: InfoTopic; onClose: () => void }) {
  const page = content[topic]
  return <Modal overline="AULA CONSULTING · PROTEQLIFE" title={page.title} onClose={onClose}>
    <div className="info-modal">{page.sections.map(section => <section key={section.heading}><h3>{section.heading}</h3><p>{section.body}</p></section>)}</div>
    <div className="modal-actions"><button className="modal-save" onClick={onClose}>Entendido</button></div>
  </Modal>
}
