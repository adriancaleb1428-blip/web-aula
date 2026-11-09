/**
 * cursos-modal.js — Sistema de modal, carrito y pagos PROTEQLIFE v3
 * ─────────────────────────────────────────────────────────────────
 * CORRECCIONES v3:
 *  ✅ Botón carrito inyectado en la barra de nav automáticamente
 *  ✅ Panel carrito se abre al hacer click en el botón
 *  ⏳ Checkout informativo mientras se habilita una integración de pagos real
 *  🔒 No solicita datos de tarjeta ni confirma compras sin verificar el pago
 */

// ─────────────────────────────────────────────────────────
// BASE DE DATOS DE CURSOS
// ─────────────────────────────────────────────────────────
var CURSOS_DB = {

  // ── SEGURIDAD INTEGRAL ──────────────────────────────────
  'ley-29783': {
    slug:'ley-29783', emoji:'⚖️', bg:'#DBEAFE', area:'Seguridad Integral', areaColor:'#1565C0', areaLight:'#E3F2FD',
    nombre:'Introducción a la Ley 29783 de SST',
    desc:'Marco legal peruano en SST. Obligaciones del empleador, derechos del trabajador y sanciones por incumplimiento.',
    duracion:'8 horas', nivel:'Básico', certificado:'Incluido', precio:50, precioOld:80,
    tags:[{txt:'En vivo',cls:'tag-vivo'}],
    modalidades:['En vivo (Zoom)','Grabado (Aula Virtual)','Presencial (Lima)'],
    temas:['Antecedentes y contexto de la SST en Perú','Marco legal: Ley 29783 y D.S. 005-2012-TR','Principios de la seguridad y salud en el trabajo','Derechos y obligaciones del trabajador','Obligaciones del empleador y sanciones','Rol del supervisor y comité de SST','Documentación mínima requerida por ley']
  },
  'gestion-accidentes': {
    slug:'gestion-accidentes', emoji:'🚨', bg:'#E0F2FE', area:'Seguridad Integral', areaColor:'#1565C0', areaLight:'#E3F2FD',
    nombre:'Gestión de Accidentes de Trabajo',
    desc:'Procedimientos de notificación, investigación y registro de accidentes laborales conforme a la norma peruana.',
    duracion:'8 horas', nivel:'Básico', certificado:'Incluido', precio:60, precioOld:90,
    tags:[{txt:'Grabado',cls:'tag-grabado'}],
    modalidades:['Grabado (Aula Virtual)','En vivo (Zoom)','Presencial (Lima)'],
    temas:['Definición y clasificación de accidentes','Obligación de notificación al MTPE','Procedimiento de investigación','Árbol de causas y 5 Por Qué','Registro y estadísticas','Medidas correctivas y seguimiento']
  },
  'gestion-incidentes': {
    slug:'gestion-incidentes', emoji:'⚠️', bg:'#E0F2FE', area:'Seguridad Integral', areaColor:'#1565C0', areaLight:'#E3F2FD',
    nombre:'Gestión de Incidentes e Incidentes Peligrosos',
    desc:'Clasificación, registro y análisis de incidentes para la prevención de accidentes en el trabajo.',
    duracion:'6 horas', nivel:'Básico', certificado:'Incluido', precio:55, precioOld:80,
    tags:[{txt:'Grabado',cls:'tag-grabado'}],
    modalidades:['Grabado (Aula Virtual)','En vivo (Zoom)','Presencial (Lima)'],
    temas:['Diferencia: accidente vs incidente vs incidente peligroso','Clasificación según la norma peruana','Procedimiento de reporte inmediato','Análisis de causas y lecciones aprendidas','Estadísticas e indicadores']
  },
  'iperc': {
    slug:'iperc', emoji:'🔍', bg:'#DBEAFE', area:'Seguridad Integral', areaColor:'#1565C0', areaLight:'#E3F2FD',
    nombre:'IPERC — Identificación de Peligros y Evaluación de Riesgos',
    desc:'Metodología IPERC completa: matrices de riesgo y medidas de control conforme a la normativa vigente.',
    duracion:'10 horas', nivel:'Básico-Intermedio', certificado:'Incluido', precio:70, precioOld:100,
    tags:[{txt:'En vivo',cls:'tag-vivo'},{txt:'Nuevo',cls:'tag-nuevo'}],
    modalidades:['En vivo (Zoom)','Grabado (Aula Virtual)','Presencial (Lima)'],
    temas:['Conceptos: peligro, riesgo y daño','Tipos de peligros (físicos, químicos, biológicos)','Metodología IPERC paso a paso','Elaboración de la matriz de riesgos','Jerarquía de controles','IPERC continuo en campo']
  },
  'comite-supervisor-sst': {
    slug:'comite-supervisor-sst', emoji:'👥', bg:'#FFF3EE', area:'Seguridad Integral', areaColor:'#1565C0', areaLight:'#E3F2FD',
    nombre:'Comité o Supervisor de SST',
    desc:'Funciones, obligaciones y proceso de elección del Comité o Supervisor de SST.',
    duracion:'8 horas', nivel:'Básico', certificado:'Incluido', precio:65, precioOld:null,
    tags:[{txt:'Presencial',cls:'tag-presencial'}],
    modalidades:['Presencial (Lima)','En vivo (Zoom)','Grabado (Aula Virtual)'],
    temas:['¿Cuándo aplica Comité y cuándo Supervisor?','Proceso de elección de representantes','Funciones y responsabilidades','Libro de actas y reuniones','Reglamento interno']
  },
  'ats': {
    slug:'ats', emoji:'📝', bg:'#E8F5E9', area:'Seguridad Integral', areaColor:'#1565C0', areaLight:'#E3F2FD',
    nombre:'Análisis de Trabajo Seguro (ATS)',
    desc:'Elaboración de ATS, identificación de riesgos por tarea y medidas preventivas.',
    duracion:'6 horas', nivel:'Básico', certificado:'Incluido', precio:50, precioOld:75,
    tags:[{txt:'En vivo',cls:'tag-vivo'}],
    modalidades:['En vivo (Zoom)','Grabado (Aula Virtual)','Presencial (Lima)'],
    temas:['¿Qué es el ATS y cuándo se usa?','Pasos para elaborar un ATS','Identificación de pasos críticos','Peligros y riesgos por paso','Medidas de control y responsables']
  },
  'investigacion-accidentes': {
    slug:'investigacion-accidentes', emoji:'🔎', bg:'#E0F2FE', area:'Seguridad Integral', areaColor:'#1565C0', areaLight:'#E3F2FD',
    nombre:'Herramientas para la Investigación de Accidentes',
    desc:'Árbol de causas, metodología 5 Por Qué y análisis de causas raíz.',
    duracion:'8 horas', nivel:'Intermedio', certificado:'Incluido', precio:65, precioOld:90,
    tags:[{txt:'Grabado',cls:'tag-grabado'}],
    modalidades:['Grabado (Aula Virtual)','En vivo (Zoom)','Presencial (Lima)'],
    temas:['Principios de investigación','Metodología 5 Por Qué','Diagrama Ishikawa','Árbol de causas','Informe de investigación']
  },
  'epps': {
    slug:'epps', emoji:'🦺', bg:'#DBEAFE', area:'Seguridad Integral', areaColor:'#1565C0', areaLight:'#E3F2FD',
    nombre:"Entrega, Conservación y Reposición de EPP's",
    desc:'Gestión del equipo de protección personal: registros, responsabilidades y reposición.',
    duracion:'4 horas', nivel:'Básico', certificado:'Incluido', precio:40, precioOld:60,
    tags:[{txt:'En vivo',cls:'tag-vivo'}],
    modalidades:['En vivo (Zoom)','Grabado (Aula Virtual)','Presencial (Lima)'],
    temas:['Obligación legal de entrega','Tipos de EPP por riesgo','Registro de entrega y firma','Conservación y vida útil','Procedimiento de reposición']
  },
  'seguridad-comportamiento': {
    slug:'seguridad-comportamiento', emoji:'🧠', bg:'#F3E5F5', area:'Seguridad Integral', areaColor:'#1565C0', areaLight:'#E3F2FD',
    nombre:'Seguridad Basada en el Comportamiento (SBC)',
    desc:'Cultura de seguridad, observación de comportamientos y refuerzo positivo.',
    duracion:'10 horas', nivel:'Intermedio', certificado:'Incluido', precio:70, precioOld:100,
    tags:[{txt:'Grabado',cls:'tag-grabado'}],
    modalidades:['Grabado (Aula Virtual)','En vivo (Zoom)','Presencial (Lima)'],
    temas:['Fundamentos del comportamiento en SST','Triángulo de conducta segura','Proceso de observación conductual','Retroalimentación positiva','Implementación de programa SBC']
  },
  'ergonomia': {
    slug:'ergonomia', emoji:'🪑', bg:'#E8F5E9', area:'Seguridad Integral', areaColor:'#1565C0', areaLight:'#E3F2FD',
    nombre:'Ergonomía',
    desc:'Principios ergonómicos, evaluación postural y prevención de trastornos musculoesqueléticos.',
    duracion:'6 horas', nivel:'Básico', certificado:'Incluido', precio:55, precioOld:80,
    tags:[{txt:'En vivo',cls:'tag-vivo'}],
    modalidades:['En vivo (Zoom)','Grabado (Aula Virtual)','Presencial (Lima)'],
    temas:['Principios básicos de ergonomía','Evaluación postural (REBA, RULA)','Ergonomía en oficinas','Manejo manual de cargas','Plan de intervención ergonómica']
  },
  'primeros-auxilios': {
    slug:'primeros-auxilios', emoji:'🚑', bg:'#FFF3EE', area:'Seguridad Integral', areaColor:'#1565C0', areaLight:'#E3F2FD',
    nombre:'Primeros Auxilios',
    desc:'RCP, atención de heridas, quemaduras y emergencias médicas en el entorno laboral.',
    duracion:'8 horas', nivel:'Básico', certificado:'Incluido', precio:55, precioOld:null,
    tags:[{txt:'Presencial',cls:'tag-presencial'}],
    modalidades:['Presencial (Lima)','En vivo (Zoom)','Grabado (Aula Virtual)'],
    temas:['RCP básico para adultos','Uso del DEA','Manejo de heridas y hemorragias','Quemaduras y fracturas','Plan de evacuación']
  },
  'prevencion-burnout': {
    slug:'prevencion-burnout', emoji:'😓', bg:'#FDE8E8', area:'Seguridad Integral', areaColor:'#1565C0', areaLight:'#E3F2FD',
    nombre:'Prevención del Burnout',
    desc:'Identificación, prevención y manejo del síndrome de agotamiento laboral.',
    duracion:'6 horas', nivel:'Básico', certificado:'Incluido', precio:50, precioOld:75,
    tags:[{txt:'Grabado',cls:'tag-grabado'},{txt:'Nuevo',cls:'tag-nuevo'}],
    modalidades:['Grabado (Aula Virtual)','En vivo (Zoom)','Presencial (Lima)'],
    temas:['¿Qué es el Burnout?','Señales de alerta','Herramientas de evaluación (MBI)','Estrategias individuales de prevención','Plan de intervención organizacional']
  },
  'ley-27942': {
    slug:'ley-27942', emoji:'⚖️', bg:'#FCE4EC', area:'Seguridad Integral', areaColor:'#1565C0', areaLight:'#E3F2FD',
    nombre:'Ley 27942 — Prevención del Hostigamiento Sexual',
    desc:'Marco normativo, procedimientos de denuncia y obligaciones del empleador.',
    duracion:'4 horas', nivel:'Básico', certificado:'Incluido', precio:40, precioOld:60,
    tags:[{txt:'En vivo',cls:'tag-vivo'}],
    modalidades:['En vivo (Zoom)','Grabado (Aula Virtual)','Presencial (Lima)'],
    temas:['Marco legal: Ley 27942 y modificatorias','Definición y tipos de hostigamiento','Canal de denuncias','Proceso de investigación','Obligaciones del empleador']
  },
  'manejo-defensivo': {
    slug:'manejo-defensivo', emoji:'🚗', bg:'#FFF3EE', area:'Seguridad Integral', areaColor:'#1565C0', areaLight:'#E3F2FD',
    nombre:'Manejo Defensivo',
    desc:'Técnicas de conducción segura, gestión del riesgo vial y prevención de accidentes.',
    duracion:'8 horas', nivel:'Básico', certificado:'Incluido', precio:65, precioOld:90,
    tags:[{txt:'Presencial',cls:'tag-presencial'}],
    modalidades:['Presencial (Lima)','En vivo (Zoom)','Grabado (Aula Virtual)'],
    temas:['Factores de riesgo vial','Velocidad segura y distancias','Puntos ciegos','Fatiga al volante','Conducción en condiciones adversas']
  },
  'fatiga-somnolencia': {
    slug:'fatiga-somnolencia', emoji:'😴', bg:'#E0F2FE', area:'Seguridad Integral', areaColor:'#1565C0', areaLight:'#E3F2FD',
    nombre:'Fatiga y Somnolencia',
    desc:'Impacto de la fatiga en la seguridad laboral, factores de riesgo y estrategias de prevención.',
    duracion:'4 horas', nivel:'Básico', certificado:'Incluido', precio:35, precioOld:55,
    tags:[{txt:'Grabado',cls:'tag-grabado'}],
    modalidades:['Grabado (Aula Virtual)','En vivo (Zoom)','Presencial (Lima)'],
    temas:['¿Qué es la fatiga laboral?','Ciclos circadianos','Indicadores de somnolencia','Impacto en la seguridad','Estrategias de prevención']
  },
  'reuniones-sst': {
    slug:'reuniones-sst', emoji:'📅', bg:'#E8F5E9', area:'Seguridad Integral', areaColor:'#1565C0', areaLight:'#E3F2FD',
    nombre:'Reuniones Mensuales Obligatorias de SST',
    desc:'Planificación, conducción y registro de las reuniones del Comité o Supervisor de SST.',
    duracion:'4 horas', nivel:'Básico', certificado:'Incluido', precio:35, precioOld:55,
    tags:[{txt:'En vivo',cls:'tag-vivo'}],
    modalidades:['En vivo (Zoom)','Grabado (Aula Virtual)','Presencial (Lima)'],
    temas:['Obligación legal de reuniones','Agenda mínima obligatoria','Conducción efectiva','Actas y registros','Seguimiento de acuerdos']
  },
  // ── CALIDAD ─────────────────────────────────────────────
  'tecnica-5s': {
    slug:'tecnica-5s', emoji:'✅', bg:'#FFF3EE', area:'Sist. Integrado de Gestión', areaColor:'#FF6B35', areaLight:'#FFF3EE',
    nombre:'Técnica de las 5S — Organización y orden en el trabajo',
    desc:'Metodología japonesa para mejorar la organización, orden y limpieza en espacios de trabajo.',
    duracion:'6 horas', nivel:'Básico', certificado:'Incluido', precio:60, precioOld:90,
    tags:[{txt:'En vivo',cls:'tag-vivo'}],
    modalidades:['En vivo (Zoom)','Grabado (Aula Virtual)','Presencial (Lima)'],
    temas:['Origen e historia de las 5S','Seiri — Clasificar','Seiton — Ordenar','Seiso — Limpiar','Seiketsu — Estandarizar','Shitsuke — Autodisciplina','Auditoría de las 5S','Implementación práctica']
  },
  'iso-9001': {
    slug:'iso-9001', emoji:'📊', bg:'#FFF3EE', area:'Sist. Integrado de Gestión', areaColor:'#FF6B35', areaLight:'#FFF3EE',
    nombre:'ISO 9001:2015 — Sistema de Gestión de la Calidad',
    desc:'Requisitos, estructura y beneficios de la norma ISO 9001:2015 para implementar un SGC.',
    duracion:'8 horas', nivel:'Intermedio', certificado:'Incluido', precio:75, precioOld:110,
    tags:[{txt:'Grabado',cls:'tag-grabado'}],
    modalidades:['Grabado (Aula Virtual)','En vivo (Zoom)','Presencial (Lima)'],
    temas:['Historia y evolución ISO 9001','Estructura de Alto Nivel (HLS)','Contexto de la organización','Liderazgo y compromiso','Planificación de riesgos y oportunidades','Operación y control de procesos','Mejora continua y no conformidades']
  },
  'auditorias-internas': {
    slug:'auditorias-internas', emoji:'🔍', bg:'#FFF3EE', area:'Sist. Integrado de Gestión', areaColor:'#FF6B35', areaLight:'#FFF3EE',
    nombre:'Auditorías Internas de Calidad',
    desc:'Planificación, ejecución e informe de auditorías internas del SGC conforme ISO 19011.',
    duracion:'8 horas', nivel:'Intermedio', certificado:'Incluido', precio:70, precioOld:100,
    tags:[{txt:'Grabado',cls:'tag-grabado'}],
    modalidades:['Grabado (Aula Virtual)','En vivo (Zoom)','Presencial (Lima)'],
    temas:['¿Qué es una auditoría interna?','ISO 19011:2018','Programa anual de auditorías','Plan y check-list de auditoría','Técnicas de entrevista','Identificación de no conformidades','Informe de auditoría']
  },
  'iso-14001': {
    slug:'iso-14001', emoji:'🌿', bg:'#E8F5E9', area:'Sist. Integrado de Gestión', areaColor:'#FF6B35', areaLight:'#FFF3EE',
    nombre:'Gestión de Medio Ambiente — ISO 14001',
    desc:'Fundamentos del Sistema de Gestión Ambiental y requisitos de la norma ISO 14001:2015.',
    duracion:'8 horas', nivel:'Intermedio', certificado:'Incluido', precio:75, precioOld:110,
    tags:[{txt:'Grabado',cls:'tag-grabado'},{txt:'Nuevo',cls:'tag-nuevo'}],
    modalidades:['Grabado (Aula Virtual)','En vivo (Zoom)','Presencial (Lima)'],
    temas:['Legislación ambiental peruana','Estructura ISO 14001:2015','Aspectos e impactos ambientales','Objetivos y metas ambientales','Emergencias ambientales','Integración ISO 14001 + ISO 9001']
  },
  'kpi-calidad': {
    slug:'kpi-calidad', emoji:'📈', bg:'#FFF3EE', area:'Sist. Integrado de Gestión', areaColor:'#FF6B35', areaLight:'#FFF3EE',
    nombre:'Indicadores KPI de Calidad',
    desc:'Diseño, implementación y seguimiento de indicadores clave de desempeño.',
    duracion:'6 horas', nivel:'Básico', certificado:'Incluido', precio:60, precioOld:85,
    tags:[{txt:'En vivo',cls:'tag-vivo'}],
    modalidades:['En vivo (Zoom)','Grabado (Aula Virtual)','Presencial (Lima)'],
    temas:['¿Qué es un KPI?','Tipos de indicadores','Metodología SMART','Dashboard de indicadores','Análisis de tendencias','Acciones de mejora']
  },
  // ── DESARROLLO EMPRESARIAL & LIDERAZGO ─────────────────
  'ia-fundamentos': {
    slug:'ia-fundamentos', emoji:'🤖', bg:'#EDE9FE', area:'Desarrollo Empresarial & Liderazgo', areaColor:'#F59E0B', areaLight:'#FFFBEB',
    nombre:'Fundamentos de Inteligencia Artificial para empresas',
    desc:'Qué es la IA, cómo funciona y cómo aplicarla en tu negocio para ser más competitivo.',
    duracion:'8 horas', nivel:'Básico', certificado:'Incluido', precio:80, precioOld:120,
    tags:[{txt:'Grabado',cls:'tag-grabado'},{txt:'Nuevo',cls:'tag-nuevo'}],
    modalidades:['Grabado (Aula Virtual)','En vivo (Zoom)','Presencial (Lima)'],
    temas:['¿Qué es la Inteligencia Artificial?','Machine Learning y Deep Learning','IA generativa: ChatGPT, Gemini, Copilot','Automatización con herramientas IA','IA aplicada a la gestión empresarial','Consideraciones éticas y legales']
  },
  'marketing-digital': {
    slug:'marketing-digital', emoji:'📱', bg:'#FFF3EE', area:'Desarrollo Empresarial & Liderazgo', areaColor:'#F59E0B', areaLight:'#FFFBEB',
    nombre:'Marketing Digital y Ventas',
    desc:'Estrategias digitales, redes sociales, Google Ads y técnicas de ventas para tu negocio.',
    duracion:'8 horas', nivel:'Básico', certificado:'Incluido', precio:75, precioOld:110,
    tags:[{txt:'Grabado',cls:'tag-grabado'}],
    modalidades:['Grabado (Aula Virtual)','En vivo (Zoom)','Presencial (Lima)'],
    temas:['Ecosistema del marketing digital','SEO y posicionamiento','Google Ads y Meta Ads','Estrategia de contenidos','Técnicas de ventas y cierre','Métricas y analítica digital']
  },
  'startup-emprendimiento': {
    slug:'startup-emprendimiento', emoji:'🚀', bg:'#ECFDF5', area:'Desarrollo Empresarial & Liderazgo', areaColor:'#F59E0B', areaLight:'#FFFBEB',
    nombre:'Creación de StartUp y Emprendimiento',
    desc:'Valida tu idea, crea tu modelo de negocio y lanza tu startup con estrategias probadas.',
    duracion:'10 horas', nivel:'Básico', certificado:'Incluido', precio:99, precioOld:150,
    tags:[{txt:'Grabado',cls:'tag-grabado'},{txt:'Nuevo',cls:'tag-nuevo'}],
    modalidades:['Grabado (Aula Virtual)','En vivo (Zoom)','Presencial (Lima)'],
    temas:['Mentalidad emprendedora','Ideación y validación de idea','Design Thinking','Business Model Canvas','Producto Mínimo Viable (MVP)','Pitch y presentación a inversores']
  },
  'talento-humano': {
    slug:'talento-humano', emoji:'👥', bg:'#FFFBEB', area:'Desarrollo Empresarial & Liderazgo', areaColor:'#F59E0B', areaLight:'#FFFBEB',
    nombre:'Talento Humano y Equipos de Alto Rendimiento',
    desc:'Liderazgo situacional, inteligencia emocional y formación de equipos de alto rendimiento.',
    duracion:'8 horas', nivel:'Básico', certificado:'Incluido', precio:65, precioOld:100,
    tags:[{txt:'En vivo',cls:'tag-vivo'}],
    modalidades:['En vivo (Zoom)','Grabado (Aula Virtual)','Presencial (Lima)'],
    temas:['Liderazgo situacional','Inteligencia emocional','Comunicación efectiva','Formación de equipos de alto rendimiento','Gestión del conflicto','Feedback constructivo']
  },
  'habilidades-blandas': {
    slug:'habilidades-blandas', emoji:'🧠', bg:'#FFFBEB', area:'Desarrollo Empresarial & Liderazgo', areaColor:'#F59E0B', areaLight:'#FFFBEB',
    nombre:'Taller de Habilidades Blandas',
    desc:'Comunicación efectiva, inteligencia emocional, trabajo en equipo y resolución de conflictos.',
    duracion:'8 horas', nivel:'Básico', certificado:'Incluido', precio:65, precioOld:100,
    tags:[{txt:'En vivo',cls:'tag-vivo'}],
    modalidades:['En vivo (Zoom)','Grabado (Aula Virtual)','Presencial (Lima)'],
    temas:['Comunicación asertiva','Escucha activa','Inteligencia emocional en el trabajo','Resolución de conflictos','Trabajo en equipo','Gestión del tiempo']
  },
  'marco-legal': {
    slug:'marco-legal', emoji:'📜', bg:'#FFFBEB', area:'Desarrollo Empresarial & Liderazgo', areaColor:'#F59E0B', areaLight:'#FFFBEB',
    nombre:'Marco Legal para Empresas y Emprendedores en Perú',
    desc:'Tipos de empresa, contratos laborales, INDECOPI y protección al consumidor.',
    duracion:'6 horas', nivel:'Básico', certificado:'Incluido', precio:55, precioOld:80,
    tags:[{txt:'En vivo',cls:'tag-vivo'}],
    modalidades:['En vivo (Zoom)','Grabado (Aula Virtual)','Presencial (Lima)'],
    temas:['Tipos de empresa: SAC, SRL, EIRL','Proceso de formalización','Contratos laborales','INDECOPI y protección al consumidor','Propiedad intelectual básica']
  },
  'tributacion-basica': {
    slug:'tributacion-basica', emoji:'🏛️', bg:'#FFFBEB', area:'Desarrollo Empresarial & Liderazgo', areaColor:'#F59E0B', areaLight:'#FFFBEB',
    nombre:'Tributación Básica para Empresas',
    desc:'Regímenes tributarios, IGV, impuesto a la renta y planillas en Perú.',
    duracion:'6 horas', nivel:'Básico', certificado:'Incluido', precio:55, precioOld:80,
    tags:[{txt:'Grabado',cls:'tag-grabado'}],
    modalidades:['Grabado (Aula Virtual)','En vivo (Zoom)','Presencial (Lima)'],
    temas:['Regímenes tributarios: NRUS, RER, RMT, RG','IGV: obligaciones y declaraciones','Impuesto a la Renta','Planillas y beneficios sociales','SUNAT online']
  },

  'hostigamiento-sexual': {
    slug:'hostigamiento-sexual', emoji:'🤝', bg:'#FCE4EC', area:'Seguridad Integral', areaColor:'#1565C0', areaLight:'#E3F2FD',
    nombre:'Capacitación Especializada de Hostigamiento Sexual en el Trabajo',
    desc:'Protocolos internos, canales de atención y gestión completa de casos de hostigamiento sexual en la empresa.',
    duracion:'6 horas', nivel:'Básico', certificado:'Incluido',
    precio:50, precioOld:75,
    tags:[{txt:'Grabado', cls:'tag-grabado'}],
    modalidades:['Grabado — Aula Virtual','En vivo — Zoom','Presencial — Lima'],
    temas:['Marco normativo Ley 27942','Diseño del protocolo interno','Comité de Intervención: funciones','Recepción y registro de denuncias','Procedimiento de investigación','Medidas de protección a la víctima','Resolución del caso y sanciones','Campañas de sensibilización']
  },
  'ciclo-deming': {
    slug:'ciclo-deming', emoji:'🔄', bg:'#FFF3EE', area:'Sistema Integrado de Gestión', areaColor:'#FF6B35', areaLight:'#FFF3EE',
    nombre:'Ciclo de Deming (PHVA) — Mejora Continua',
    desc:'Domina el ciclo Planificar, Hacer, Verificar, Actuar como base de la mejora continua en sistemas de gestión.',
    duracion:'6 horas', nivel:'Básico', certificado:'Incluido',
    precio:50, precioOld:75,
    tags:[{txt:'Grabado', cls:'tag-grabado'}],
    modalidades:['Grabado — Aula Virtual','En vivo — Zoom','Presencial — Lima'],
    temas:['Historia del PHVA: Shewhart y Deming','Planificar: diagnóstico y objetivos','Hacer: implementación del plan','Verificar: medición y análisis','Actuar: estandarización','Aplicación en ISO 9001','Caso práctico en empresa peruana']
  },
  'cantidad-calidad': {
    slug:'cantidad-calidad', emoji:'⚖️', bg:'#FFF3EE', area:'Sistema Integrado de Gestión', areaColor:'#FF6B35', areaLight:'#FFF3EE',
    nombre:'Cantidad vs Calidad',
    desc:'Estrategias para mantener estándares de calidad sin sacrificar productividad. Costo de la no calidad y herramientas de control.',
    duracion:'4 horas', nivel:'Básico', certificado:'Incluido',
    precio:40, precioOld:60,
    tags:[{txt:'En vivo', cls:'tag-vivo'}],
    modalidades:['En vivo — Zoom','Grabado — Aula Virtual','Presencial — Lima'],
    temas:['Calidad vs productividad','Costo de la no calidad','Modelo PAF','Herramientas de control','Indicadores de calidad','Cultura de calidad']
  },
  'info-documentada': {
    slug:'info-documentada', emoji:'📁', bg:'#FFF3EE', area:'Sistema Integrado de Gestión', areaColor:'#FF6B35', areaLight:'#FFF3EE',
    nombre:'Creación, Actualización y Codificación de la Información Documentada',
    desc:'Gestión documental según ISO 9001:2015: codificación, control de versiones, aprobaciones y distribución controlada.',
    duracion:'6 horas', nivel:'Básico-Intermedio', certificado:'Incluido',
    precio:55, precioOld:80,
    tags:[{txt:'En vivo', cls:'tag-vivo'}],
    modalidades:['En vivo — Zoom','Grabado — Aula Virtual','Presencial — Lima'],
    temas:['Información documentada ISO 7.5','Documentos vs registros','Sistema de codificación','Control de versiones','Distribución controlada','Retención y disposición','Práctica: procedimiento documentado']
  },
  'auditoria-interna': {
    slug:'auditoria-interna', emoji:'🔍', bg:'#FFF3EE', area:'Sistema Integrado de Gestión', areaColor:'#FF6B35', areaLight:'#FFF3EE',
    nombre:'Ejecución de Auditorías Internas bajo ISO 19011',
    desc:'Planifica, ejecuta y reporta auditorías de sistemas de gestión como auditor interno certificado.',
    duracion:'12 horas', nivel:'Intermedio', certificado:'Incluido',
    precio:110, precioOld:150,
    tags:[{txt:'Presencial', cls:'tag-presencial'}],
    modalidades:['Presencial — Lima','En vivo — Zoom','Grabado — Aula Virtual'],
    temas:['Principios ISO 19011:2018','Tipos de auditoría','Plan de auditoría','Checklists de verificación','Recolección de evidencia','Hallazgos y no conformidades','Informe de auditoría','Seguimiento de acciones correctivas']
  },
  'anticorrupcion': {
    slug:'anticorrupcion', emoji:'🚫', bg:'#E8F5E9', area:'Sistema Integrado de Gestión', areaColor:'#FF6B35', areaLight:'#FFF3EE',
    nombre:'Anticorrupción y Sistemas de Gestión Antisoborno',
    desc:'ISO 37001 y Ley 30424: implementa controles antisoborno y construye una cultura ética en tu organización.',
    duracion:'6 horas', nivel:'Básico', certificado:'Incluido',
    precio:50, precioOld:75,
    tags:[{txt:'Grabado', cls:'tag-grabado'}],
    modalidades:['Grabado — Aula Virtual','En vivo — Zoom','Presencial — Lima'],
    temas:['Soborno y corrupción: definiciones','ISO 37001 antisoborno','Ley 30424 en Perú','Evaluación de riesgos','Controles antisoborno','Canal de denuncias','Debida diligencia','Cultura ética e integridad']
  },
  'kpis': {
    slug:'kpis', emoji:'📈', bg:'#FFF3EE', area:'Sistema Integrado de Gestión', areaColor:'#FF6B35', areaLight:'#FFF3EE',
    nombre:"Creación de Indicadores KPI's",
    desc:"Diseña, implementa y monitorea indicadores clave de desempeño. Incluye dashboard básico en Excel.",
    duracion:'8 horas', nivel:'Básico', certificado:'Incluido',
    precio:65, precioOld:90,
    tags:[{txt:'En vivo', cls:'tag-vivo'},{txt:'Nuevo', cls:'tag-nuevo'}],
    modalidades:['En vivo — Zoom','Grabado — Aula Virtual','Presencial — Lima'],
    temas:['¿Qué es un KPI?','Metodología SMART','Tipos de KPI por área','Fichas de indicador','Dashboard básico Excel','Análisis de desviaciones','Revisión por la dirección']
  },
  'ia-gestion': {
    slug:'ia-gestion', emoji:'🤖', bg:'#EDE7F6', area:'Sistema Integrado de Gestión', areaColor:'#FF6B35', areaLight:'#FFF3EE',
    nombre:'Uso de la Inteligencia Artificial en Sistema Integrado de Gestión',
    desc:'IA aplicada a calidad, SST y medio ambiente: automatiza procesos, analiza datos y mejora la toma de decisiones.',
    duracion:'8 horas', nivel:'Básico', certificado:'Incluido',
    precio:75, precioOld:100,
    tags:[{txt:'Grabado', cls:'tag-grabado'},{txt:'Nuevo', cls:'tag-nuevo'}],
    modalidades:['Grabado — Aula Virtual','En vivo — Zoom','Presencial — Lima'],
    temas:['IA en gestión empresarial','IA en control de calidad','Análisis predictivo para SST','ChatGPT para no conformidades','Automatización de auditorías','Herramientas no-code con IA','Casos en empresas peruanas']
  },
  'chatgpt-productividad': {
    slug:'chatgpt-productividad', emoji:'💬', bg:'#EDE9FE', area:'Desarrollo Empresarial & Liderazgo', areaColor:'#F59E0B', areaLight:'#FFFBEB',
    nombre:'ChatGPT y Herramientas IA para la Productividad Profesional',
    desc:'Usa ChatGPT, Gemini y Copilot con prompting avanzado para automatizar tareas y multiplicar tu productividad.',
    duracion:'6 horas', nivel:'Básico', certificado:'Incluido',
    precio:65, precioOld:100,
    tags:[{txt:'En vivo', cls:'tag-vivo'}],
    modalidades:['En vivo — Zoom','Grabado — Aula Virtual','Presencial — Lima'],
    temas:['IA generativa 2024-2025','Ingeniería de prompts avanzada','ChatGPT para redacción','Gemini con Google Workspace','Microsoft Copilot','Análisis de datos con IA','Automatización de tareas','Casos prácticos por profesión']
  },
  'automatizacion-ia': {
    slug:'automatizacion-ia', emoji:'⚙️', bg:'#EDE9FE', area:'Desarrollo Empresarial & Liderazgo', areaColor:'#F59E0B', areaLight:'#FFFBEB',
    nombre:'Automatización de Procesos con IA y Herramientas No-Code',
    desc:'Crea flujos automatizados con Make, Zapier y Notion AI sin necesidad de programar.',
    duracion:'10 horas', nivel:'Básico-Intermedio', certificado:'Incluido',
    precio:90, precioOld:130,
    tags:[{txt:'Grabado', cls:'tag-grabado'}],
    modalidades:['Grabado — Aula Virtual','En vivo — Zoom','Presencial — Lima'],
    temas:['Ecosistema no-code: Make y Zapier','Make: escenarios básicos','Zapier: automatización de apps','Notion AI para proyectos','Airtable con automatizaciones','ChatGPT API vía Make','Chatbots sin código','Caso práctico completo']
  },
  'ciberseguridad-basica': {
    slug:'ciberseguridad-basica', emoji:'🔒', bg:'#EDE9FE', area:'Desarrollo Empresarial & Liderazgo', areaColor:'#F59E0B', areaLight:'#FFFBEB',
    nombre:'Ciberseguridad Básica para Empresas y Profesionales',
    desc:'Protege tu empresa de phishing, ransomware y fraudes digitales. Contraseñas, backup y políticas de seguridad.',
    duracion:'6 horas', nivel:'Básico', certificado:'Incluido',
    precio:70, precioOld:100,
    tags:[{txt:'En vivo', cls:'tag-vivo'}],
    modalidades:['En vivo — Zoom','Grabado — Aula Virtual','Presencial — Lima'],
    temas:['Amenazas digitales principales','Phishing y ransomware','Gestión de contraseñas','Autenticación 2FA','Seguridad en Wi-Fi','Backup: regla 3-2-1','Política de seguridad digital','Respuesta ante incidentes']
  },
  'ventas-efectivas': {
    slug:'ventas-efectivas', emoji:'💰', bg:'#FFF3EE', area:'Desarrollo Empresarial & Liderazgo', areaColor:'#F59E0B', areaLight:'#FFFBEB',
    nombre:'Técnicas de Ventas Efectivas y Cierre de Negocios',
    desc:'SPIN Selling, manejo de objeciones y técnicas de cierre para incrementar tu tasa de conversión.',
    duracion:'8 horas', nivel:'Básico', certificado:'Incluido',
    precio:70, precioOld:100,
    tags:[{txt:'En vivo', cls:'tag-vivo'}],
    modalidades:['En vivo — Zoom','Grabado — Aula Virtual','Presencial — Lima'],
    temas:['Mentalidad del vendedor','Embudo de ventas','Prospección efectiva','SPIN Selling','Presentación de valor','Manejo de objeciones','10 técnicas de cierre','Fidelización postventa']
  },
  'redes-sociales': {
    slug:'redes-sociales', emoji:'📣', bg:'#FFF3EE', area:'Desarrollo Empresarial & Liderazgo', areaColor:'#F59E0B', areaLight:'#FFFBEB',
    nombre:'Redes Sociales para Empresas y Marcas Personales',
    desc:'Instagram, Facebook, LinkedIn y TikTok para negocios. Estrategia, contenidos y métricas.',
    duracion:'8 horas', nivel:'Básico', certificado:'Incluido',
    precio:65, precioOld:95,
    tags:[{txt:'Grabado', cls:'tag-grabado'}],
    modalidades:['Grabado — Aula Virtual','En vivo — Zoom','Presencial — Lima'],
    temas:['Estrategia de redes sociales','Instagram para negocios','Facebook: páginas y grupos','LinkedIn B2B y marca personal','TikTok empresarial','Calendario editorial','Canva para redes sociales','Métricas y analítica']
  },
  'atencion-cliente': {
    slug:'atencion-cliente', emoji:'😊', bg:'#FFF3EE', area:'Desarrollo Empresarial & Liderazgo', areaColor:'#F59E0B', areaLight:'#FFFBEB',
    nombre:'Atención al Cliente y Fidelización',
    desc:'Protocolos profesionales, manejo de quejas y estrategias de fidelización para retener y recomendar clientes.',
    duracion:'6 horas', nivel:'Básico', certificado:'Incluido',
    precio:55, precioOld:80,
    tags:[{txt:'En vivo', cls:'tag-vivo'}],
    modalidades:['En vivo — Zoom','Grabado — Aula Virtual','Presencial — Lima'],
    temas:['Experiencia del cliente (CX)','Customer journey mapping','Comunicación y escucha activa','Canales de atención múltiple','Manejo de quejas y reclamos','Clientes difíciles: desescalada','NPS: medición y mejora','Estrategias de fidelización']
  },
  'plan-negocios': {
    slug:'plan-negocios', emoji:'📋', bg:'#ECFDF5', area:'Desarrollo Empresarial & Liderazgo', areaColor:'#F59E0B', areaLight:'#FFFBEB',
    nombre:'Plan de Negocios y Modelo Canvas',
    desc:'Business Model Canvas completo con proyecciones financieras y pitch profesional para inversores.',
    duracion:'8 horas', nivel:'Básico', certificado:'Incluido',
    precio:65, precioOld:90,
    tags:[{txt:'Grabado', cls:'tag-grabado'}],
    modalidades:['Grabado — Aula Virtual','En vivo — Zoom','Presencial — Lima'],
    temas:['Business Model Canvas: 9 bloques','Propuesta de valor','Análisis de mercado TAM/SAM/SOM','Análisis competitivo y FODA','Modelo de ingresos y costos','Proyecciones financieras 3 años','Plan de marketing','Pitch para inversores']
  },
  'financiamiento-startup': {
    slug:'financiamiento-startup', emoji:'💼', bg:'#ECFDF5', area:'Desarrollo Empresarial & Liderazgo', areaColor:'#F59E0B', areaLight:'#FFFBEB',
    nombre:'Financiamiento y Acceso a Capital para Startups',
    desc:'Startupperú, capital ángel, crowdfunding y fondos en Perú. Aprende a preparar tu pitch para conseguir capital.',
    duracion:'6 horas', nivel:'Básico', certificado:'Incluido',
    precio:60, precioOld:85,
    tags:[{txt:'En vivo', cls:'tag-vivo'}],
    modalidades:['En vivo — Zoom','Grabado — Aula Virtual','Presencial — Lima'],
    temas:['Ecosistema emprendedor peruano','Bootstrapping','Startupperú y COFIDE','Capital semilla y convocatorias','Inversores ángeles','Venture Capital Latam','Crowdfunding','El pitch deck ganador']
  },
  'costos-empresariales': {
    slug:'costos-empresariales', emoji:'📊', bg:'#FFFBEB', area:'Desarrollo Empresarial & Liderazgo', areaColor:'#F59E0B', areaLight:'#FFFBEB',
    nombre:'Gestión de Costos y Presupuestos Empresariales',
    desc:'Estructura costos, punto de equilibrio y presupuestos anuales para mejorar la rentabilidad de tu negocio.',
    duracion:'8 horas', nivel:'Básico', certificado:'Incluido',
    precio:70, precioOld:100,
    tags:[{txt:'Grabado', cls:'tag-grabado'}],
    modalidades:['Grabado — Aula Virtual','En vivo — Zoom','Presencial — Lima'],
    temas:['Costos fijos vs variables','Costeo directo y absorción','Punto de equilibrio','Margen de contribución','Presupuesto anual','Flujo de caja','Análisis de variaciones','Indicadores: ROI, ROE, margen']
  },
  'control-interno': {
    slug:'control-interno', emoji:'🛡️', bg:'#EDE9FE', area:'Desarrollo Empresarial & Liderazgo', areaColor:'#F59E0B', areaLight:'#FFFBEB',
    nombre:'Control Interno y Gestión de Riesgos Empresariales',
    desc:'Marco COSO, controles preventivos y detección de fraudes para proteger los activos de tu organización.',
    duracion:'8 horas', nivel:'Intermedio', certificado:'Incluido',
    precio:80, precioOld:120,
    tags:[{txt:'Grabado', cls:'tag-grabado'}],
    modalidades:['Grabado — Aula Virtual','En vivo — Zoom','Presencial — Lima'],
    temas:['Marco COSO: 5 componentes','Entorno de control','Evaluación de riesgos','Controles preventivos y detectivos','Información y comunicación','Supervisión y monitoreo','Fraude: tipos y señales','Control en procesos clave']
  },
  'seguridad-empresarial': {
    slug:'seguridad-empresarial', emoji:'🔒', bg:'#EDE9FE', area:'Desarrollo Empresarial & Liderazgo', areaColor:'#F59E0B', areaLight:'#FFFBEB',
    nombre:'Seguridad Empresarial y Protección de Activos',
    desc:'Estrategias de seguridad física, digital y de la información. Protocolos de emergencia y gestión de riesgos.',
    duracion:'8 horas', nivel:'Básico', certificado:'Incluido',
    precio:85, precioOld:130,
    tags:[{txt:'En vivo', cls:'tag-vivo'}],
    modalidades:['En vivo — Zoom','Grabado — Aula Virtual','Presencial — Lima'],
    temas:['Seguridad empresarial integral','Análisis de riesgos','Seguridad física y perímetros','Sistemas CCTV','Control de acceso biométrico','Planes de emergencia','Seguridad de la información','Coordinación con autoridades']
  },
  'proteccion-datos': {
    slug:'proteccion-datos', emoji:'🔐', bg:'#EDE9FE', area:'Desarrollo Empresarial & Liderazgo', areaColor:'#F59E0B', areaLight:'#FFFBEB',
    nombre:'Protección de Datos Personales — Ley 29733',
    desc:'Registro de bancos de datos, consentimiento, derechos ARCO y prevención de sanciones de la ANPD en Perú.',
    duracion:'6 horas', nivel:'Básico', certificado:'Incluido',
    precio:50, precioOld:null,
    tags:[{txt:'Grabado', cls:'tag-grabado'}],
    modalidades:['Grabado — Aula Virtual','En vivo — Zoom','Presencial — Lima'],
    temas:['Ley 29733 y reglamento','Datos personales vs sensibles','Principios del tratamiento','Consentimiento: cómo obtenerlo','Registro de bancos ANPD','Derechos ARCO','Transferencia internacional','Sanciones y casos Perú']
  },
  'formacion-equipos': {
    slug:'formacion-equipos', emoji:'🤝', bg:'#ECFDF5', area:'Desarrollo Empresarial & Liderazgo', areaColor:'#F59E0B', areaLight:'#FFFBEB',
    nombre:'Formación de Equipos de Alto Rendimiento',
    desc:'Modelo Tuckman, roles Belbin, metodologías ágiles y liderazgo para construir equipos altamente efectivos.',
    duracion:'8 horas', nivel:'Básico', certificado:'Incluido',
    precio:90, precioOld:130,
    tags:[{txt:'Presencial', cls:'tag-presencial'}],
    modalidades:['Presencial — Lima','En vivo — Zoom','Grabado — Aula Virtual'],
    temas:['Equipos de alto rendimiento','Modelo Tuckman: 4 etapas','Roles Belbin','Confianza y cohesión','Comunicación efectiva','Gestión de conflictos','Scrum y Kanban para equipos','Delegación y empowerment']
  },
  'mentoria-profesional': {
    slug:'mentoria-profesional', emoji:'🎯', bg:'#FFFBEB', area:'Desarrollo Empresarial & Liderazgo', areaColor:'#F59E0B', areaLight:'#FFFBEB',
    nombre:'Mentoría Profesional y Coaching Laboral',
    desc:'Modelo GROW, preguntas poderosas, feedback SBI y planes de desarrollo individual para potenciar a tu equipo.',
    duracion:'10 horas', nivel:'Intermedio', certificado:'Incluido',
    precio:95, precioOld:140,
    tags:[{txt:'En vivo', cls:'tag-vivo'}],
    modalidades:['En vivo — Zoom','Presencial — Lima','Grabado — Aula Virtual'],
    temas:['Mentoría vs coaching','Competencias del mentor','Modelo GROW: 4 fases','Preguntas poderosas','Escucha activa','Feedback SBI y Hamburguesa','Plan de Desarrollo Individual','Programa de mentoría interna']
  },

};

// ─────────────────────────────────────────────────────────
// CARRITO
// ─────────────────────────────────────────────────────────
var PQL_carrito = JSON.parse(localStorage.getItem('pq_cart') || '[]');

function PQL_guardarCarrito() {
  localStorage.setItem('pq_cart', JSON.stringify(PQL_carrito));
}

function PQL_totalCarrito() {
  return PQL_carrito.reduce(function(s, i) { return s + i.precio; }, 0);
}

function PQL_actualizarBadges() {
  var cart = JSON.parse(localStorage.getItem('pq_cart') || '[]');
  var n = cart.length;
  // Update PQL float button
  document.querySelectorAll('.pql-cart-count').forEach(function(el) { el.textContent = n; });
  var fb = document.getElementById('PQL_cartFloatBtn');
  if (fb) { fb.style.display = n > 0 ? 'flex' : 'none'; var sp = fb.querySelector('.pql-float-count'); if (sp) sp.textContent = n; }
  // Also update carrito.js float button
  var cartFloat = document.getElementById('cartFloat');
  var cartCount = document.getElementById('cartFloatCount');
  if (cartFloat) cartFloat.style.display = n > 0 ? 'flex' : 'none';
  if (cartCount) cartCount.textContent = n;
}

function PQL_renderCarritoPanel() {
  var list = document.getElementById('PQL_cartItems');
  var totalEl = document.getElementById('PQL_cartTotal');
  if (!list) return;

  if (PQL_carrito.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:48px 16px;color:#9BA3AD">' +
      '<div style="font-size:48px;margin-bottom:14px">🛒</div>' +
      '<p style="font-size:14px;font-weight:600;color:#5A6472;margin-bottom:6px">Tu carrito está vacío</p>' +
      '<p style="font-size:12px">Agrega cursos para comenzar</p></div>';
  } else {
    list.innerHTML = PQL_carrito.map(function(item, idx) {
      return '<div style="display:flex;gap:12px;align-items:flex-start;padding:14px 0;border-bottom:1px solid #F5F7FA">' +
        '<div style="width:36px;height:36px;border-radius:8px;background:#F5F7FA;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">' + (item.emoji || '📚') + '</div>' +
        '<div style="flex:1;min-width:0">' +
        '<div style="font-size:13px;font-weight:600;color:#05192D;line-height:1.4;margin-bottom:3px">' +
        (item.nombre.length > 42 ? item.nombre.substring(0,42)+'...' : item.nombre) + '</div>' +
        '<div style="font-size:11px;color:#9BA3AD;margin-bottom:3px">' + (item.modalidadElegida || '') + '</div>' +
        '<div style="font-size:14px;font-weight:700;color:#1565C0">S/ ' + item.precio + '</div>' +
        '</div>' +
        '<button onclick="PQL_quitarItem(' + idx + ')" ' +
        'style="background:none;border:none;color:#9BA3AD;cursor:pointer;font-size:18px;padding:4px;flex-shrink:0;line-height:1;border-radius:4px" ' +
        'onmouseover="this.style.color=\'#E24B4A\'" onmouseout="this.style.color=\'#9BA3AD\'" title="Quitar">🗑</button>' +
        '</div>';
    }).join('');
  }

  if (totalEl) totalEl.textContent = 'S/ ' + PQL_totalCarrito();
}

function PQL_abrirCarrito() {
  PQL_renderCarritoPanel();
  var panel = document.getElementById('PQL_cartPanel');
  var overlay = document.getElementById('PQL_cartOverlay');
  if (panel)   panel.classList.add('open');
  if (overlay) overlay.classList.add('open');
}

function PQL_cerrarCarrito() {
  var panel = document.getElementById('PQL_cartPanel');
  var overlay = document.getElementById('PQL_cartOverlay');
  if (panel)   panel.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
}

function PQL_quitarItem(idx) {
  PQL_carrito.splice(idx, 1);
  PQL_guardarCarrito();
  PQL_actualizarBadges();
  PQL_renderCarritoPanel();
}

function PQL_agregarAlCarrito(slug, modalidadElegida) {
  var c = CURSOS_DB[slug];
  if (!c) return;
  var existe = PQL_carrito.find(function(i) { return i.slug === slug; });
  if (!existe) {
    PQL_carrito.push({
      slug: slug,
      nombre: c.nombre,
      precio: c.precio,
      emoji: c.emoji,
      modalidadElegida: modalidadElegida || c.modalidades[0]
    });
    PQL_guardarCarrito();
  }
  PQL_actualizarBadges();
  PQL_cerrarModal();
  setTimeout(PQL_abrirCarrito, 200);
}

// ─────────────────────────────────────────────────────────
// MODAL DE CURSO
// ─────────────────────────────────────────────────────────
var PQL_cursoActual = null;
var PQL_modalidadSeleccionada = null;


// ── PRECIOS POR MODALIDAD ─────────────────────────────────
// Grabado = precio base | En vivo = +20% | Presencial = +30%
function PQL_preciosPorModalidad(curso) {
  var base    = curso.precio    || 0;
  var baseOld = curso.precioOld || null;
  // Factores por tipo
  var factores = { 'Grabado': 1.0, 'En vivo': 1.2, 'Presencial': 1.3 };
  var result = {};
  (curso.modalidades || []).forEach(function(mod) {
    var tipo = mod.split(' ')[0]; // "En", "Grabado", "Presencial"
    if (tipo === 'En') tipo = 'En vivo'; // "En vivo (Zoom)" → clave "En vivo"
    var factor = factores[tipo] || 1.0;
    result[mod] = {
      precio:    Math.round(base    * factor),
      precioOld: baseOld ? Math.round(baseOld * factor) : null
    };
  });
  return result;
}

function PQL_actualizarPrecioModal(mod) {
  var c = PQL_cursoActual;
  if (!c) return;
  var precios = PQL_preciosPorModalidad(c);
  var p = precios[mod];
  if (!p) return;
  document.getElementById('PQL_mPrecioOld').textContent = p.precioOld ? 'S/ ' + p.precioOld : '';
  document.getElementById('PQL_mPrecio').textContent    = 'S/ ' + p.precio;
  // Guardar precio actual para el carrito
  PQL_cursoActual._precioModalidad    = p.precio;
  PQL_cursoActual._precioOldModalidad = p.precioOld;
}

function verCurso(slug) {
  var c = CURSOS_DB[slug];
  if (!c) { PQL_abrirModalBasico(slug); return; }

  PQL_cursoActual = c;
  PQL_modalidadSeleccionada = c.modalidades[0];

  var m = document.getElementById('PQL_modal');
  if (!m) return;

  document.getElementById('PQL_mEmoji').textContent   = c.emoji;
  document.getElementById('PQL_mNombre').textContent  = c.nombre;
  document.getElementById('PQL_mDesc').textContent    = c.desc;
  document.getElementById('PQL_mArea').textContent    = c.area;
  document.getElementById('PQL_mArea').style.background = c.areaLight;
  document.getElementById('PQL_mArea').style.color      = c.areaColor;

  document.getElementById('PQL_mTags').innerHTML = (c.tags || []).map(function(t) {
    return '<span class="' + t.cls + '">' + t.txt + '</span>';
  }).join(' ');

  document.getElementById('PQL_mMeta').innerHTML =
    '<span>⏱ ' + c.duracion + '</span>' +
    '<span>📊 ' + c.nivel + '</span>' +
    '<span>🎓 ' + c.certificado + '</span>';

  document.getElementById('PQL_mTemario').innerHTML = (c.temas || []).map(function(t) {
    return '<div class="pql-tema-item"><span class="pql-check">✓</span>' + t + '</div>';
  }).join('');

  var icons = {'En vivo':'📹','Grabado':'🎬','Presencial':'🏢'};
  var _precios = PQL_preciosPorModalidad(c);
  document.getElementById('PQL_mModalidades').innerHTML = (c.modalidades || []).map(function(mod, i) {
    var key  = mod.split(' ')[0] === 'En' ? 'En vivo' : mod.split(' ')[0];
    var p    = _precios[mod] || {};
    var tag  = p.precioOld
      ? '<span style="font-size:11px;color:#9BA3AD;text-decoration:line-through;margin-right:3px">S/ ' + p.precioOld + '</span><span style="font-size:13px;font-weight:700;color:#05192D">S/ ' + p.precio + '</span>'
      : '<span style="font-size:13px;font-weight:700;color:#05192D">S/ ' + p.precio + '</span>';
    return '<label class="pql-modalidad-opt' + (i === 0 ? ' selected' : '') +
      '" onclick="PQL_seleccionarModalidad(this,\'' + mod.replace(/'/g,"\\'") + '\')">' +
      '<input type="radio" name="pql_modal" ' + (i === 0 ? 'checked' : '') + ' style="display:none">' +
      '<span style="font-size:18px">' + (icons[key] || '📚') + '</span>' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:12px;font-weight:600;color:#2C3540">' + mod + '</div>' +
      '</div>' +
      '<div style="text-align:right;flex-shrink:0">' + tag + '</div>' +
      '</label>';
  }).join('');

  // Precio dinámico según modalidad seleccionada por defecto
  PQL_actualizarPrecioModal(c.modalidades[0]);

  var yaEnCarrito = PQL_carrito.find(function(i) { return i.slug === slug; });
  var addBtn = document.getElementById('PQL_mAddBtn');
  if (yaEnCarrito) {
    addBtn.innerHTML = '✓ Ya en el carrito';
    addBtn.style.background = '#059669';
  } else {
    addBtn.innerHTML = '🛒 Agregar al carrito';
    addBtn.style.background = '#16A34A';
  }

  m.style.display = 'flex';
}

function PQL_abrirModalBasico(slug) {
  var m = document.getElementById('PQL_modal');
  if (!m) return;
  PQL_cursoActual = { slug:slug, nombre:slug.replace(/-/g,' '), precio:0, modalidades:['En vivo (Zoom)'] };
  document.getElementById('PQL_mEmoji').textContent   = '📚';
  document.getElementById('PQL_mNombre').textContent  = slug.replace(/-/g,' ');
  document.getElementById('PQL_mDesc').textContent    = 'Información detallada próximamente.';
  document.getElementById('PQL_mArea').textContent    = '';
  document.getElementById('PQL_mTags').innerHTML      = '<span class="tag-nuevo">Próximamente</span>';
  document.getElementById('PQL_mMeta').innerHTML      = '';
  document.getElementById('PQL_mTemario').innerHTML   = '<div class="pql-tema-item"><span class="pql-check">✓</span>Contenido disponible próximamente</div>';
  document.getElementById('PQL_mModalidades').innerHTML = '';
  document.getElementById('PQL_mPrecioOld').textContent = '';
  document.getElementById('PQL_mPrecio').textContent    = 'Consultar';
  document.getElementById('PQL_mAddBtn').style.display  = 'none';
  m.style.display = 'flex';
}

function PQL_seleccionarModalidad(el, val) {
  PQL_modalidadSeleccionada = val;
  document.querySelectorAll('.pql-modalidad-opt').forEach(function(o) { o.classList.remove('selected'); });
  el.classList.add('selected');
  PQL_actualizarPrecioModal(val);
}

function PQL_cerrarModal() {
  var m = document.getElementById('PQL_modal');
  if (m) m.style.display = 'none';
}

function PQL_irDetalle() {
  if (PQL_cursoActual && PQL_cursoActual.slug) {
    window.location.href = 'curso-detalle.html?slug=' + PQL_cursoActual.slug;
  }
}

function PQL_modalAgregarCarrito() {
  if (!PQL_cursoActual) return;
  var c = PQL_cursoActual;
  // Usar precio de la modalidad seleccionada; caer a precio base si no aplica
  var precioNum = (c._precioModalidad != null ? c._precioModalidad : c.precio) || 0;
  var precioStr = 'S/ ' + precioNum;

  // Use the shared pq_cart system (same as curso-detalle.html)
  var cart = JSON.parse(localStorage.getItem('pq_cart') || '[]');
  var existe = cart.find(function(i) { return i.slug === c.slug; });
  if (!existe) {
    cart.push({
      slug: c.slug,
      nombre: c.nombre,
      precio: precioStr,
      precioNum: precioNum,
      emoji: c.emoji || '📚'
    });
    localStorage.setItem('pq_cart', JSON.stringify(cart));
  }

  // Update float button badge
  var floatBtn = document.getElementById('cartFloat');
  var countEl  = document.getElementById('cartFloatCount');
  if (floatBtn) floatBtn.style.display = 'flex';
  if (countEl)  countEl.textContent = cart.length;

  // Show notification if carrito.js is loaded
  if (typeof mostrarNotif === 'function') {
    mostrarNotif('✅ "' + c.nombre.substring(0, 35) + '..." agregado al carrito');
  }

  // Open cart panel if carrito.js is loaded
  PQL_cerrarModal();
  setTimeout(function() {
    if (typeof toggleCarrito === 'function') {
      renderCarritoPanel && renderCarritoPanel();
      var panel = document.getElementById('cartPanel');
      if (panel) panel.classList.add('open');
    } else if (typeof PQL_abrirCarrito === 'function') {
      PQL_abrirCarrito();
    }
  }, 300);
}

// ─────────────────────────────────────────────────────────
// CHECKOUT — Resumen + selección de método
// ─────────────────────────────────────────────────────────
function PQL_abrirCheckout() {
  if (PQL_carrito.length === 0) { alert('Tu carrito está vacío.'); return; }
  PQL_cerrarCarrito();
  var total = PQL_totalCarrito();

  var items = document.getElementById('PQL_checkoutItems');
  if (items) {
    items.innerHTML = PQL_carrito.map(function(i) {
      var nombreCorto = i.nombre.length > 40 ? i.nombre.substring(0,40)+'...' : i.nombre;
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #F5F7FA;font-size:13px">' +
        '<div><span style="font-weight:600;color:#05192D">' + nombreCorto + '</span>' +
        (i.modalidadElegida ? '<br><span style="font-size:11px;color:#9BA3AD">' + i.modalidadElegida + '</span>' : '') +
        '</div><span style="font-weight:700;color:#05192D;white-space:nowrap;margin-left:12px">S/ ' + i.precio + '</span></div>';
    }).join('');
  }

  var totalEl = document.getElementById('PQL_checkoutTotal');
  if (totalEl) totalEl.textContent = 'S/ ' + total;

  var ch = document.getElementById('PQL_checkout');
  var paymentButton = ch && ch.querySelector('.pql-pay-btn');
  var paymentMethods = paymentButton && paymentButton.parentElement;
  if (paymentMethods) {
    paymentMethods.innerHTML = '<div role="status" style="grid-column:1/-1;background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;padding:16px;color:#7C2D12;font-size:13px;line-height:1.6">' +
      '<strong>El pago en línea aún se está configurando.</strong><br>' +
      'No ingreses datos de tarjeta ni hagas un pago desde esta pantalla. La inscripción se confirmará solo cuando el pago se verifique.' +
      '<div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap">' +
      '<a href="contacto.html" style="display:inline-flex;align-items:center;padding:10px 14px;background:#05192D;color:#fff;border-radius:8px;text-decoration:none;font-weight:700">Consultar inscripción</a>' +
      '<button type="button" onclick="window.open(\'https://wa.me/51950950304?text=\'+encodeURIComponent(\'Hola PROTEQLIFE, quiero consultar mi inscripción en los cursos de mi carrito.\'),\'_blank\',\'noopener\')" style="padding:10px 14px;background:#fff;border:1px solid #D1D5DB;border-radius:8px;color:#05192D;font-weight:700;cursor:pointer">Escribir por WhatsApp</button>' +
      '</div></div>';
  }
  if (ch) ch.style.display = 'flex';
}

function PQL_cerrarCheckout() {
  var ch = document.getElementById('PQL_checkout');
  if (ch) ch.style.display = 'none';
}

// ─────────────────────────────────────────────────────────
// PAGO — Enrutador por método
// ─────────────────────────────────────────────────────────
var PQL_metodo_actual = '';

function PQL_procesarPago(metodo) {
  alert('Los pagos en línea aún se están configurando. No ingreses datos de tarjeta ni realices pagos desde esta pantalla.');
}

// ── TARJETA ──────────────────────────────────────────────
function PQL_mostrarFormTarjeta() {
  alert('El pago con tarjeta todavía no está habilitado. No ingreses datos de tarjeta.');
}

function PQL_cerrarTarjeta() {
  var modal = document.getElementById('PQL_tarjetaModal');
  if (modal) modal.style.display = 'none';
}

function PQL_fmtCard(el) {
  var v = el.value.replace(/\D/g,'').substring(0,16);
  el.value = v.replace(/(.{4})/g,'$1 ').trim();
}
function PQL_fmtExpiry(el) {
  var v = el.value.replace(/\D/g,'');
  if (v.length >= 2) v = v.substring(0,2) + '/' + v.substring(2,4);
  el.value = v;
}

function PQL_confirmarTarjeta() {
  alert('Los pagos en línea aún no se han habilitado. No ingreses datos de tarjeta.');
}

// ── QR YAPE / PLIN ──────────────────────────────────────
function PQL_mostrarQR(metodo) {
  var metodoNombre = metodo === 'plin' ? 'Plin' : 'Yape';
  alert('El pago con ' + metodoNombre + ' todavía no está conectado. No realices transferencias desde esta pantalla.');
}

function PQL_cerrarQR() {
  var modal = document.getElementById('PQL_qrModal');
  if (modal) modal.style.display = 'none';
}

function PQL_confirmarPagoQR() {
  alert('Los pagos con Yape y Plin aún no están conectados. No realices transferencias desde esta pantalla.');
}

// ── PAGO EFECTIVO ────────────────────────────────────────
function PQL_mostrarPagoEfectivo() {
  alert('PagoEfectivo todavía no está conectado. No realices pagos desde esta pantalla.');
}

function PQL_cerrarEfectivo() {
  var modal = document.getElementById('PQL_efectivoModal');
  if (modal) modal.style.display = 'none';
}

function PQL_confirmarEfectivo() {
  alert('PagoEfectivo aún no está conectado. No realices pagos desde esta pantalla.');
}

// ── CONFIRMACIÓN FINAL ───────────────────────────────────
function PQL_mostrarConfirmacion(metodo) {
  alert('No se puede confirmar una compra hasta que el pago se verifique con el proveedor de pagos.');
}

function PQL_cerrarConfirmacion() {
  var conf = document.getElementById('PQL_confirmacion');
  if (conf) conf.style.display = 'none';
}


// ─────────────────────────────────────────────────────────
// INYECTAR HTML (modales + carrito)
// ─────────────────────────────────────────────────────────
function PQL_inyectarHTML() {
  var html = `
<!-- ── OVERLAY CARRITO ── -->
<div id="PQL_cartOverlay" onclick="PQL_cerrarCarrito()"
  style="position:fixed;inset:0;background:rgba(5,25,45,0.4);z-index:3999;
  opacity:0;visibility:hidden;transition:all 0.25s;pointer-events:none"></div>

<!-- ── PANEL CARRITO ── -->
<div id="PQL_cartPanel"
  style="position:fixed;top:0;right:0;height:100vh;width:370px;max-width:96vw;
  background:#fff;z-index:4000;transform:translateX(100%);
  transition:transform 0.3s cubic-bezier(.4,0,.2,1);
  display:flex;flex-direction:column;
  box-shadow:-8px 0 40px rgba(5,25,45,0.15)">

  <!-- Header -->
  <div style="padding:18px 22px;border-bottom:1px solid #E8ECF0;
    display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
    <span style="font-family:'Syne',sans-serif;font-size:17px;font-weight:800;color:#05192D;display:flex;align-items:center;gap:8px">
      🛒 Mi carrito
      <span style="background:#1565C0;color:#fff;font-size:12px;
        border-radius:20px;padding:2px 9px;font-family:'DM Sans',sans-serif" class="pql-cart-count">0</span>
    </span>
    <button onclick="PQL_cerrarCarrito()"
      style="background:none;border:none;font-size:22px;cursor:pointer;color:#9BA3AD;line-height:1">✕</button>
  </div>

  <!-- Items -->
  <div id="PQL_cartItems" style="flex:1;overflow-y:auto;padding:16px 22px"></div>

  <!-- Footer -->
  <div style="padding:18px 22px;border-top:1px solid #E8ECF0;flex-shrink:0">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <span style="font-size:14px;color:#5A6472;font-weight:500">Total:</span>
      <span id="PQL_cartTotal"
        style="font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:#05192D">S/ 0</span>
    </div>
    <button onclick="PQL_abrirCheckout()"
      style="width:100%;padding:13px;background:#1565C0;color:#fff;border:none;
      border-radius:10px;font-family:'Syne',sans-serif;font-size:14px;font-weight:700;
      cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;
      transition:background .2s"
      onmouseover="this.style.background='#0C3254'"
      onmouseout="this.style.background='#1565C0'">
      Consultar inscripción
    </button>
  </div>
</div>

<!-- ── BOTÓN FLOTANTE CARRITO ── -->
<button id="PQL_cartFloatBtn" onclick="(typeof toggleCarrito==='function'?toggleCarrito():PQL_abrirCarrito())"
  style="display:none;position:fixed;bottom:24px;right:24px;
  background:#05192D;color:#fff;border:none;border-radius:50px;
  padding:12px 20px;font-family:'Syne',sans-serif;font-size:13px;font-weight:700;
  cursor:pointer;box-shadow:0 8px 24px rgba(5,25,45,.3);
  align-items:center;gap:8px;z-index:500;transition:all .2s"
  onmouseover="this.style.background='#1565C0';this.style.transform='translateY(-2px)'"
  onmouseout="this.style.background='#05192D';this.style.transform='translateY(0)'">
  🛒 Carrito
  <span class="pql-float-count" style="background:#2196F3;border-radius:50%;
    min-width:22px;height:22px;padding:0 4px;display:inline-flex;
    align-items:center;justify-content:center;font-size:12px">0</span>
</button>

<!-- ── MODAL DE CURSO ── -->
<div id="PQL_modal" onclick="if(event.target===this)PQL_cerrarModal()"
  style="display:none;position:fixed;inset:0;background:rgba(5,25,45,0.65);
  z-index:5000;align-items:center;justify-content:center;padding:16px;overflow-y:auto">
  <div style="background:#fff;border-radius:16px;max-width:580px;width:100%;
    max-height:92vh;overflow-y:auto;position:relative;margin:auto">
    <button onclick="PQL_cerrarModal()"
      style="position:sticky;top:12px;float:right;margin-right:14px;
      background:none;border:none;font-size:22px;cursor:pointer;
      color:#9BA3AD;z-index:1;line-height:1">✕</button>
    <div style="padding:24px 24px 0;display:flex;gap:14px;align-items:flex-start;clear:both">
      <div id="PQL_mEmoji" style="font-size:48px;line-height:1;flex-shrink:0"></div>
      <div style="flex:1;min-width:0">
        <div id="PQL_mTags" style="margin-bottom:8px;display:flex;gap:4px;flex-wrap:wrap"></div>
        <span id="PQL_mArea"
          style="font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;
          display:inline-block;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px"></span>
        <div id="PQL_mNombre"
          style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;
          color:#05192D;line-height:1.25;margin-bottom:8px"></div>
        <div id="PQL_mDesc" style="font-size:13px;color:#5A6472;line-height:1.6"></div>
      </div>
    </div>
    <div id="PQL_mMeta"
      style="display:flex;gap:16px;padding:14px 24px;border-top:1px solid #E8ECF0;
      border-bottom:1px solid #E8ECF0;margin-top:16px;flex-wrap:wrap;
      font-size:12px;color:#5A6472"></div>
    <div style="padding:20px 24px">
      <div style="margin-bottom:20px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;
          letter-spacing:1px;color:#9BA3AD;margin-bottom:10px">Elige tu modalidad</div>
        <div id="PQL_mModalidades" style="display:flex;flex-direction:column;gap:8px"></div>
      </div>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;
        letter-spacing:1px;color:#9BA3AD;margin-bottom:10px">Temario del curso</div>
      <div id="PQL_mTemario"></div>
    </div>
    <div style="padding:16px 24px;border-top:1px solid #E8ECF0;display:flex;
      align-items:center;justify-content:space-between;gap:12px;
      position:sticky;bottom:0;background:#fff;border-radius:0 0 16px 16px;flex-wrap:wrap">
      <div>
        <span id="PQL_mPrecioOld"
          style="font-size:13px;color:#9BA3AD;text-decoration:line-through;display:block"></span>
        <span id="PQL_mPrecio"
          style="font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:#05192D"></span>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="PQL_irDetalle()"
          style="padding:10px 16px;border:2px solid #1565C0;border-radius:8px;
          background:#fff;color:#1565C0;font-size:13px;font-weight:600;
          cursor:pointer;white-space:nowrap;transition:all .15s"
          onmouseover="this.style.background='#EFF6FF'"
          onmouseout="this.style.background='#fff'">Ver detalle →</button>
        <button id="PQL_mAddBtn" onclick="PQL_modalAgregarCarrito()"
          style="padding:10px 22px;border:none;border-radius:8px;background:#16A34A;
          color:#fff;font-size:13px;font-weight:700;cursor:pointer;
          white-space:nowrap;transition:background .15s">🛒 Agregar al carrito</button>
      </div>
    </div>
  </div>
</div>

<!-- ── CHECKOUT — MÉTODOS DE PAGO ── -->
<div id="PQL_checkout" onclick="if(event.target===this)PQL_cerrarCheckout()"
  style="display:none;position:fixed;inset:0;background:rgba(5,25,45,0.65);
  z-index:6000;align-items:center;justify-content:center;padding:16px">
  <div style="background:#fff;border-radius:16px;max-width:460px;width:100%;
    overflow:hidden;max-height:90vh;overflow-y:auto">
    <div style="background:#05192D;padding:18px 24px;
      display:flex;align-items:center;justify-content:space-between">
      <span style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:#fff">
        Consulta tu inscripción</span>
      <button onclick="PQL_cerrarCheckout()"
        style="background:none;border:none;color:rgba(255,255,255,.6);
        font-size:20px;cursor:pointer;line-height:1">✕</button>
    </div>
    <div style="padding:18px 24px;border-bottom:1px solid #E8ECF0">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;
        letter-spacing:1px;color:#9BA3AD;margin-bottom:12px">Resumen del pedido</div>
      <div id="PQL_checkoutItems"></div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;
      padding:14px 24px;border-bottom:1px solid #E8ECF0">
      <span style="font-size:14px;font-weight:600;color:#5A6472">Total referencial</span>
      <span id="PQL_checkoutTotal"
        style="font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:#05192D">S/ 0</span>
    </div>
    <div style="padding:20px 24px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;
        letter-spacing:1px;color:#9BA3AD;margin-bottom:14px">Estado de la inscripción</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <button onclick="PQL_procesarPago('tarjeta')" class="pql-pay-btn">
          <span style="font-size:28px">💳</span>
          <span style="font-size:13px;font-weight:700;color:#05192D">Tarjeta</span>
          <span style="font-size:11px;color:#9BA3AD">Débito / Crédito</span>
        </button>
        <button onclick="PQL_procesarPago('yape')" class="pql-pay-btn" style="border-color:#6B2D8B">
          <span style="font-size:28px">💜</span>
          <span style="font-size:13px;font-weight:700;color:#6B2D8B">Yape</span>
          <span style="font-size:11px;color:#9BA3AD">Escanea el QR</span>
        </button>
        <button onclick="PQL_procesarPago('plin')" class="pql-pay-btn" style="border-color:#00A86B">
          <span style="font-size:28px">💚</span>
          <span style="font-size:13px;font-weight:700;color:#00A86B">Plin</span>
          <span style="font-size:11px;color:#9BA3AD">Escanea el QR</span>
        </button>
        <button onclick="PQL_procesarPago('efectivo')" class="pql-pay-btn">
          <span style="font-size:28px">🏧</span>
          <span style="font-size:13px;font-weight:700;color:#05192D">PagoEfectivo</span>
          <span style="font-size:11px;color:#9BA3AD">Agentes y bancos</span>
        </button>
      </div>
    </div>
  </div>
</div>

<style>
/* ── Estilos compartidos PQL ── */
.pql-tema-item { background:#F5F7FA;border-radius:6px;padding:9px 12px;font-size:13px;color:#2C3540;margin-bottom:6px;display:flex;align-items:flex-start;gap:8px;line-height:1.5 }
.pql-check { color:#16A34A;font-weight:700;flex-shrink:0;margin-top:1px }
.pql-modalidad-opt { display:flex;align-items:center;gap:10px;padding:10px 14px;border:2px solid #E8ECF0;border-radius:10px;cursor:pointer;transition:all .15s;background:#fff }
.pql-modalidad-opt.selected { border-color:#1565C0;background:#EFF6FF }
.pql-modalidad-opt:hover { border-color:#93C5FD }
.pql-pay-btn { display:flex;flex-direction:column;align-items:center;gap:5px;padding:14px 10px;border:2px solid #E8ECF0;border-radius:10px;cursor:pointer;background:#fff;transition:all .2s }
.pql-pay-btn:hover { background:#F5F7FA;transform:translateY(-2px);box-shadow:0 4px 12px rgba(5,25,45,.08) }
#PQL_cartPanel.open { transform:translateX(0) }
#PQL_cartOverlay.open { opacity:1;visibility:visible;pointer-events:auto }
.tag-vivo      { background:#E8F5E9;color:#1B5E20;font-size:10px;font-weight:600;padding:2px 8px;border-radius:20px }
.tag-grabado   { background:#E3F2FD;color:#1565C0;font-size:10px;font-weight:600;padding:2px 8px;border-radius:20px }
.tag-presencial{ background:#FFF3EE;color:#E64A19;font-size:10px;font-weight:600;padding:2px 8px;border-radius:20px }
.tag-nuevo     { background:#FFF8E1;color:#F57F17;font-size:10px;font-weight:600;padding:2px 8px;border-radius:20px }
</style>
`;

  var div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div);
}

// ─────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  PQL_inyectarHTML();
  PQL_actualizarBadges();

  // Mantener badge actualizado
  setInterval(function() {
    PQL_actualizarBadges();
  }, 800);
});
