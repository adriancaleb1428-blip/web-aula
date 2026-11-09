// server.js — Servidor principal PROTEQLIFE API
require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const morgan       = require('morgan');
const path         = require('path');

const app = express();

// ── SEGURIDAD ─────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false // Desactivar para desarrollo; activar en producción
}));

// Rate limiting — máx 100 requests por 15 min por IP
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas solicitudes. Intenta en 15 minutos.' }
}));

// Rate limiting más estricto para autenticación
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de login. Intenta en 15 minutos.' }
}));

// ── CORS ──────────────────────────────────────
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3001'
  ],
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS']
}));

// ── MIDDLEWARES ───────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// Archivos estáticos (videos, PDFs subidos)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── RUTAS API ─────────────────────────────────
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/cursos',  require('./routes/cursos'));
app.use('/api/aula',    require('./routes/aula'));
app.use('/api/compras', require('./routes/compras'));
app.use('/api/admin',   require('./routes/admin'));

// Validar certificado (pública)
app.get('/api/certificados/:codigo', async (req, res) => {
  try {
    const db = require('./db/connection');
    const [rows] = await db.query(`
      SELECT cert.codigo, cert.emitido_at,
             u.nombre, u.apellido, u.dni,
             c.nombre AS curso_nombre, c.duracion
      FROM certificados cert
      JOIN usuarios u ON cert.usuario_id = u.id
      JOIN cursos c ON cert.curso_id = c.id
      WHERE cert.codigo = ?
    `, [req.params.codigo]);

    if (!rows.length) return res.status(404).json({ error: 'Certificado no encontrado.' });
    res.json({ certificado: rows[0], valido: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al validar.' });
  }
});

// ── HEALTH CHECK ──────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', version: '1.0.0', timestamp: new Date().toISOString() });
});

// ── ERROR HANDLER GLOBAL ──────────────────────
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

// ── ARRANQUE ──────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   PROTEQLIFE API — Puerto ${PORT}       ║
  ║   http://localhost:${PORT}/api/health  ║
  ╚══════════════════════════════════════╝
  `);
});

module.exports = app;
