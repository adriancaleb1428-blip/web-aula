// routes/auth.js — Registro, login, recuperación de contraseña
const router    = require('express').Router();
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const crypto    = require('crypto');
const { body, validationResult } = require('express-validator');
const db        = require('../db/connection');
const { authMiddleware } = require('../middleware/auth');

// ── REGISTRO ──────────────────────────────────
router.post('/registro', [
  body('nombre').trim().notEmpty().withMessage('El nombre es requerido'),
  body('apellido').trim().notEmpty().withMessage('El apellido es requerido'),
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/[A-Z]/).withMessage('Debe tener al menos una mayúscula')
    .matches(/[0-9]/).withMessage('Debe tener al menos un número'),
  body('dni').optional().trim(),
  body('telefono').optional().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { nombre, apellido, email, password, dni, telefono } = req.body;

  try {
    // Verificar email único
    const [existe] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existe.length) {
      return res.status(400).json({ error: 'Este correo ya está registrado.' });
    }

    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.query(
      'INSERT INTO usuarios (nombre, apellido, email, password, dni, telefono) VALUES (?,?,?,?,?,?)',
      [nombre, apellido, email, hash, dni || null, telefono || null]
    );

    const token = jwt.sign(
      { id: result.insertId, rol: 'usuario' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || '7d' }
    );

    res.status(201).json({
      message: '¡Cuenta creada exitosamente!',
      token,
      usuario: { id: result.insertId, nombre, apellido, email, rol: 'usuario' }
    });
  } catch (err) {
    console.error('Error registro:', err);
    res.status(500).json({ error: 'Error al crear la cuenta. Intenta de nuevo.' });
  }
});

// ── LOGIN ─────────────────────────────────────
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('La contraseña es requerida')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const [rows] = await db.query(
      'SELECT id, nombre, apellido, email, password, rol, activo FROM usuarios WHERE email = ?',
      [email]
    );

    if (!rows.length || !(await bcrypt.compare(password, rows[0].password))) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    if (!rows[0].activo) {
      return res.status(401).json({ error: 'Tu cuenta está desactivada. Contacta soporte.' });
    }

    const { password: _, ...usuario } = rows[0];
    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || '7d' }
    );

    res.json({ message: 'Sesión iniciada correctamente.', token, usuario });
  } catch (err) {
    console.error('Error login:', err);
    res.status(500).json({ error: 'Error en el servidor.' });
  }
});

// ── PERFIL ACTUAL ─────────────────────────────
router.get('/me', authMiddleware, (req, res) => {
  res.json({ usuario: req.user });
});

// ── SOLICITAR RECUPERACIÓN ────────────────────
router.post('/recuperar-password', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  const { email } = req.body;
  try {
    const [rows] = await db.query('SELECT id, nombre FROM usuarios WHERE email = ?', [email]);

    // Siempre responder igual (seguridad)
    if (!rows.length) {
      return res.json({ message: 'Si el correo existe, recibirás instrucciones en breve.' });
    }

    const token  = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 3600000); // 1 hora

    await db.query(
      'UPDATE usuarios SET token_reset = ?, token_exp = ? WHERE id = ?',
      [token, expiry, rows[0].id]
    );

    // TODO: enviar email con nodemailer
    // El link sería: https://proteqlife.com/reset-password?token=${token}
    console.log(`🔑 Token de reset para ${email}: ${token}`);

    res.json({ message: 'Si el correo existe, recibirás instrucciones en breve.' });
  } catch (err) {
    res.status(500).json({ error: 'Error en el servidor.' });
  }
});

// ── RESET PASSWORD ────────────────────────────
router.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 8 })
], async (req, res) => {
  const { token, password } = req.body;
  try {
    const [rows] = await db.query(
      'SELECT id FROM usuarios WHERE token_reset = ? AND token_exp > NOW()',
      [token]
    );

    if (!rows.length) {
      return res.status(400).json({ error: 'Token inválido o expirado.' });
    }

    const hash = await bcrypt.hash(password, 12);
    await db.query(
      'UPDATE usuarios SET password = ?, token_reset = NULL, token_exp = NULL WHERE id = ?',
      [hash, rows[0].id]
    );

    res.json({ message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' });
  } catch (err) {
    res.status(500).json({ error: 'Error en el servidor.' });
  }
});

module.exports = router;
