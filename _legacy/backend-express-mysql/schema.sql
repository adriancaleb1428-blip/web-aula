-- =============================================
-- PROTEQLIFE LMS — Base de Datos
-- Ejecutar en MySQL: mysql -u root -p < schema.sql
-- =============================================

CREATE DATABASE IF NOT EXISTS proteqlife_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE proteqlife_db;

-- ── USUARIOS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  apellido    VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  dni         VARCHAR(20),
  telefono    VARCHAR(20),
  rol         ENUM('usuario','admin') DEFAULT 'usuario',
  activo      TINYINT(1) DEFAULT 1,
  token_reset VARCHAR(255) NULL,
  token_exp   DATETIME NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── CATEGORÍAS ───────────────────────────────
CREATE TABLE IF NOT EXISTS categorias (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  color       VARCHAR(20) DEFAULT '#1565C0',
  icono       VARCHAR(10) DEFAULT '📚',
  activo      TINYINT(1) DEFAULT 1
);

INSERT INTO categorias (nombre, slug, descripcion, color, icono) VALUES
('Seguridad Integral',                    'seguridad-integral',  'Cursos SST, Ley 29783 y prevención de riesgos', '#1565C0', '🛡️'),
('Sistema Integrado de Gestión',          'sistema-gestion',     'Calidad ISO 9001 y Gestión Ambiental',          '#FF6B35', '📊'),
('Centro de Desarrollo Empresarial & Liderazgo', 'desarrollo-empresarial', 'IA, Marketing, Emprendimiento y Talento Humano', '#F59E0B', '🎯');

-- ── CURSOS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS cursos (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  categoria_id INT NOT NULL,
  nombre       VARCHAR(255) NOT NULL,
  slug         VARCHAR(255) NOT NULL UNIQUE,
  descripcion  TEXT,
  descripcion_corta VARCHAR(300),
  emoji        VARCHAR(10) DEFAULT '📚',
  bg_color     VARCHAR(20) DEFAULT '#E3F2FD',
  duracion     VARCHAR(50),
  modalidad    ENUM('vivo','grabado','presencial','mixto') DEFAULT 'grabado',
  nivel        ENUM('basico','intermedio','avanzado') DEFAULT 'basico',
  precio       DECIMAL(8,2) NOT NULL DEFAULT 0,
  precio_original DECIMAL(8,2),
  rating       DECIMAL(3,1) DEFAULT 4.5,
  sesiones     INT DEFAULT 1,
  cupos        INT DEFAULT 20,
  certificado  TINYINT(1) DEFAULT 1,
  activo       TINYINT(1) DEFAULT 1,
  destacado    TINYINT(1) DEFAULT 0,
  nuevo        TINYINT(1) DEFAULT 0,
  orden        INT DEFAULT 0,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

-- ── MÓDULOS DEL CURSO ────────────────────────
CREATE TABLE IF NOT EXISTS modulos (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  curso_id  INT NOT NULL,
  titulo    VARCHAR(200) NOT NULL,
  orden     INT DEFAULT 0,
  FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE
);

-- ── LECCIONES ────────────────────────────────
CREATE TABLE IF NOT EXISTS lecciones (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  modulo_id   INT NOT NULL,
  titulo      VARCHAR(200) NOT NULL,
  tipo        ENUM('video','pdf','texto','zoom') DEFAULT 'video',
  contenido   TEXT,       -- URL del video, PDF o texto
  duracion    INT DEFAULT 0, -- minutos
  orden       INT DEFAULT 0,
  gratis      TINYINT(1) DEFAULT 0, -- vista previa gratuita
  FOREIGN KEY (modulo_id) REFERENCES modulos(id) ON DELETE CASCADE
);

-- ── TEMARIO (puntos del curso) ───────────────
CREATE TABLE IF NOT EXISTS temario (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  curso_id INT NOT NULL,
  tema     VARCHAR(300) NOT NULL,
  orden    INT DEFAULT 0,
  FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE
);

-- ── A QUIÉN VA DIRIGIDO ──────────────────────
CREATE TABLE IF NOT EXISTS dirigido_a (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  curso_id INT NOT NULL,
  item     VARCHAR(300) NOT NULL,
  orden    INT DEFAULT 0,
  FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE
);

-- ── COMPRAS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS compras (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id      INT NOT NULL,
  total           DECIMAL(8,2) NOT NULL,
  estado          ENUM('pendiente','completado','fallido','reembolsado') DEFAULT 'pendiente',
  metodo_pago     ENUM('culqi','mercadopago','stripe','transferencia','yape') DEFAULT 'culqi',
  referencia_pago VARCHAR(255),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- ── DETALLE DE COMPRAS ───────────────────────
CREATE TABLE IF NOT EXISTS compra_items (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  compra_id INT NOT NULL,
  curso_id  INT NOT NULL,
  precio    DECIMAL(8,2) NOT NULL,
  FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE CASCADE,
  FOREIGN KEY (curso_id)  REFERENCES cursos(id)
);

-- ── ACCESO A CURSOS ──────────────────────────
CREATE TABLE IF NOT EXISTS acceso_cursos (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  curso_id   INT NOT NULL,
  compra_id  INT,
  activo     TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_acceso (usuario_id, curso_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (curso_id)   REFERENCES cursos(id),
  FOREIGN KEY (compra_id)  REFERENCES compras(id)
);

-- ── PROGRESO DEL USUARIO ─────────────────────
CREATE TABLE IF NOT EXISTS progreso (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT NOT NULL,
  leccion_id  INT NOT NULL,
  completado  TINYINT(1) DEFAULT 0,
  tiempo_visto INT DEFAULT 0, -- segundos
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_progreso (usuario_id, leccion_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (leccion_id) REFERENCES lecciones(id)
);

-- ── CERTIFICADOS EMITIDOS ────────────────────
CREATE TABLE IF NOT EXISTS certificados (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  curso_id   INT NOT NULL,
  codigo     VARCHAR(50) NOT NULL UNIQUE,
  emitido_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (curso_id)   REFERENCES cursos(id)
);

-- ── DATOS INICIALES: CURSOS SSO ──────────────
INSERT INTO cursos (categoria_id, nombre, slug, descripcion_corta, descripcion, emoji, bg_color, duracion, modalidad, nivel, precio, precio_original, rating, sesiones, nuevo) VALUES
(1, 'Introducción a la Ley 29783 de Seguridad y Salud en el Trabajo', 'ley-29783',
 'Marco legal peruano en SST, obligaciones del empleador y derechos del trabajador.',
 'Conocerás el marco legal aplicable a la seguridad y salud en el trabajo en Perú, tus derechos, obligaciones y cómo aplicar la Ley 29783 en tu organización.',
 '⚖️','#DBEAFE','8 horas','vivo','basico', 50.00, 80.00, 4.8, 1, 0),

(1, 'Gestión de Accidentes de Trabajo', 'gestion-accidentes',
 'Procedimientos de notificación, investigación y registro de accidentes laborales.',
 'Aprende los procedimientos correctos para notificar, investigar y registrar accidentes laborales conforme a la normativa peruana.',
 '🚨','#E0F2FE','8 horas','grabado','basico', 60.00, 90.00, 4.8, 4, 0),

(1, 'Gestión de Incidentes e Incidentes Peligrosos', 'gestion-incidentes',
 'Clasificación, registro y análisis de incidentes para prevención de accidentes.',
 'Metodología para clasificar, registrar y analizar incidentes peligrosos con el fin de prevenir accidentes futuros en el entorno laboral.',
 '⚠️','#E0F2FE','6 horas','grabado','basico', 55.00, 80.00, 4.7, 3, 0),

(1, 'Identificación de Peligros y Evaluación de Riesgos (IPERC)', 'iperc',
 'Metodología IPERC, matrices de riesgo y medidas de control en el trabajo.',
 'Aprende a identificar los peligros presentes en el entorno laboral, evaluar los riesgos asociados y aplicar medidas de control adecuadas conforme a la normativa peruana.',
 '🔍','#DBEAFE','10 horas','vivo','basico', 70.00, 100.00, 4.9, 1, 1),

(1, 'Comité o Supervisor de Seguridad y Salud en el Trabajo', 'comite-supervisor-sst',
 'Funciones, responsabilidades y gestión del Comité de SST.',
 'Conoce las funciones, responsabilidades legales y procedimientos del Comité o Supervisor de SST en las organizaciones peruanas.',
 '👥','#E8F5E9','6 horas','vivo','basico', 65.00, NULL, 4.6, 1, 0),

(1, 'Análisis de Trabajo Seguro (ATS)', 'ats',
 'Elaboración de ATS, identificación de riesgos por tarea y medidas preventivas.',
 'Aprende a elaborar el Análisis de Trabajo Seguro (ATS) para identificar los riesgos de cada tarea y establecer medidas preventivas antes de iniciar trabajos.',
 '📋','#DBEAFE','6 horas','vivo','basico', 50.00, 75.00, 4.7, 1, 0),

(1, 'Herramientas para la Investigación de Accidentes', 'investigacion-accidentes',
 'Árbol de causas, metodología 5 Por Qué y análisis de causas raíz.',
 'Domina las principales herramientas de investigación de accidentes: Árbol de causas, 5 Por Qué, Diagrama de Ishikawa y análisis de causas raíz.',
 '🔎','#E0F2FE','8 horas','grabado','intermedio', 65.00, 90.00, 4.9, 4, 0),

(1, 'Entrega, Conservación y Reposición de EPPs', 'epps',
 'Gestión del equipo de protección personal, registros y responsabilidades legales.',
 'Aprende a gestionar correctamente la entrega, conservación y reposición de los Equipos de Protección Personal (EPP) en tu organización.',
 '🦺','#DBEAFE','4 horas','vivo','basico', 40.00, 60.00, 4.5, 1, 0),

(1, 'Ergonomía', 'ergonomia',
 'Principios ergonómicos, evaluación postural y prevención de trastornos musculoesqueléticos.',
 'Comprende los principios ergonómicos, aprende a evaluar la postura de trabajo y aplica medidas para prevenir trastornos musculoesqueléticos en el trabajo.',
 '🪑','#E8F5E9','6 horas','vivo','basico', 55.00, 80.00, 4.6, 1, 0),

(1, 'Primeros Auxilios', 'primeros-auxilios',
 'RCP, atención de heridas, quemaduras y emergencias médicas en el entorno laboral.',
 'Curso práctico para aprender a responder ante emergencias médicas en el trabajo. Incluye RCP básico, atención de heridas, quemaduras y simulaciones.',
 '🚑','#FFF3EE','8 horas','presencial','basico', 55.00, NULL, 4.8, 1, 0),

(1, 'Prevención del Burnout', 'prevencion-burnout',
 'Identificación, prevención y manejo del síndrome de agotamiento laboral.',
 'Aprende a identificar las señales del Burnout, implementa estrategias de prevención y gestiona el agotamiento laboral en tu organización.',
 '😓','#FDE8E8','6 horas','grabado','basico', 50.00, 75.00, 4.9, 3, 1),

(1, 'Manejo Defensivo', 'manejo-defensivo',
 'Técnicas de conducción segura y prevención de accidentes de tránsito.',
 'Domina las técnicas de conducción segura, gestión del riesgo vial y prevención de accidentes de tránsito en el entorno laboral.',
 '🚗','#FFF3EE','8 horas','presencial','basico', 65.00, 90.00, 4.7, 1, 0);

-- ── DATOS INICIALES: CURSOS CALIDAD ──────────
INSERT INTO cursos (categoria_id, nombre, slug, descripcion_corta, descripcion, emoji, bg_color, duracion, modalidad, nivel, precio, precio_original, rating, sesiones, nuevo) VALUES
(2, 'Técnica de las 5S', 'tecnica-5s',
 'Metodología japonesa para organización, orden y limpieza en el trabajo.',
 'Aprende la metodología 5S (Seiri, Seiton, Seiso, Seiketsu, Shitsuke) y cómo implementarla para mejorar la productividad y seguridad en tu organización.',
 '✅','#FFF3EE','6 horas','vivo','basico', 60.00, 90.00, 4.7, 1, 0),

(2, 'ISO 9001:2015 — Sistema de Gestión de la Calidad', 'iso-9001',
 'Requisitos y estructura de la norma ISO 9001:2015 para implementar un SGC.',
 'Conoce los requisitos de la norma ISO 9001:2015 e identifica cómo implementar un Sistema de Gestión de la Calidad en tu organización.',
 '📊','#FFF3EE','8 horas','grabado','intermedio', 75.00, 110.00, 4.8, 4, 0),

(2, 'Auditorías Internas de Calidad', 'auditorias-internas',
 'Planificación, ejecución e informe de auditorías internas del SGC.',
 'Aprende a planificar, ejecutar e informar auditorías internas del Sistema de Gestión de la Calidad conforme a la norma ISO 19011.',
 '🔍','#FFF3EE','8 horas','grabado','intermedio', 70.00, 100.00, 4.7, 4, 0),

(2, 'Gestión de Medio Ambiente — ISO 14001', 'iso-14001',
 'Fundamentos del Sistema de Gestión Ambiental y requisitos ISO 14001.',
 'Comprende los requisitos de la norma ISO 14001:2015 e implementa un Sistema de Gestión Ambiental efectivo en tu organización.',
 '🌿','#E8F5E9','8 horas','grabado','intermedio', 75.00, 110.00, 4.6, 4, 1),

(2, 'Indicadores KPI de Calidad', 'kpi-calidad',
 'Diseño, implementación y seguimiento de indicadores clave de desempeño.',
 'Aprende a diseñar, implementar y hacer seguimiento a los indicadores KPI de calidad para medir y mejorar el desempeño de tu organización.',
 '📈','#FFF3EE','6 horas','vivo','basico', 60.00, 85.00, 4.5, 1, 0);

-- ── DATOS INICIALES: CURSOS LIDERAZGO ────────
INSERT INTO cursos (categoria_id, nombre, slug, descripcion_corta, descripcion, emoji, bg_color, duracion, modalidad, nivel, precio, precio_original, rating, sesiones, nuevo) VALUES
(3, 'Fundamentos de Inteligencia Artificial para empresas', 'ia-fundamentos',
 'Qué es la IA, cómo funciona y cómo aplicarla en tu negocio.',
 'Entiende qué es la Inteligencia Artificial, cómo funciona y cómo aplicarla estratégicamente en tu negocio para automatizar procesos y ser más competitivo.',
 '🤖','#EDE9FE','8 horas','grabado','basico', 80.00, 120.00, 4.9, 4, 1),

(3, 'Marketing Digital y Ventas', 'marketing-digital',
 'Estrategias digitales, redes sociales y ventas online para empresas.',
 'Aprende las estrategias de marketing digital más efectivas: SEO, redes sociales, Google Ads y técnicas de ventas para hacer crecer tu negocio.',
 '📱','#FFF3EE','8 horas','grabado','basico', 75.00, 110.00, 4.7, 4, 0),

(3, 'Creación de StartUp y Emprendimiento', 'startup-emprendimiento',
 'Valida tu idea, crea tu modelo de negocio y lanza tu startup.',
 'Aprende a validar tu idea de negocio, elaborar un Business Model Canvas, crear tu MVP y lanzar tu startup con estrategias probadas.',
 '🚀','#ECFDF5','10 horas','grabado','basico', 99.00, 150.00, 4.9, 5, 1),

(3, 'Talento Humano y Desarrollo de Equipos', 'talento-humano',
 'Habilidades blandas, liderazgo y formación de equipos de alto rendimiento.',
 'Desarrolla habilidades de liderazgo, comunicación efectiva e inteligencia emocional para liderar equipos de alto rendimiento.',
 '👥','#FFFBEB','8 horas','vivo','basico', 65.00, 100.00, 4.8, 1, 0);

-- ── TEMARIO EJEMPLO para Ley 29783 ───────────
INSERT INTO temario (curso_id, tema, orden) VALUES
(1,'Antecedentes y contexto de la seguridad laboral en Perú',1),
(1,'Marco legal: Ley 29783 y D.S. 005-2012-TR',2),
(1,'Principios de la seguridad y salud en el trabajo',3),
(1,'Derechos y obligaciones del trabajador',4),
(1,'Obligaciones del empleador',5),
(1,'Rol del supervisor de SST',6),
(1,'Comité de Seguridad y Salud en el Trabajo',7),
(1,'Sanciones e infracciones laborales',8),
(1,'Documentación mínima requerida por ley',9),
(1,'Casos prácticos y aplicación en MYPES',10);

INSERT INTO dirigido_a (curso_id, item, orden) VALUES
(1,'Trabajadores de todos los sectores',1),
(1,'Supervisores y jefes de área',2),
(1,'Personal de Recursos Humanos',3),
(1,'Jefes de Seguridad y Salud Ocupacional',4),
(1,'Empresarios y emprendedores',5);

-- ── USUARIO ADMIN POR DEFECTO ─────────────────
-- Contraseña: Admin123! (cambiar en producción)
INSERT INTO usuarios (nombre, apellido, email, password, rol) VALUES
('Admin', 'PROTEQLIFE', 'admin@proteqlife.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Índices para rendimiento
CREATE INDEX idx_cursos_categoria ON cursos(categoria_id);
CREATE INDEX idx_cursos_slug ON cursos(slug);
CREATE INDEX idx_acceso_usuario ON acceso_cursos(usuario_id);
CREATE INDEX idx_progreso_usuario ON progreso(usuario_id);
CREATE INDEX idx_compras_usuario ON compras(usuario_id);