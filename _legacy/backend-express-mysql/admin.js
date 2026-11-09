// routes/admin.js — Panel de administración
const router = require('express').Router();
const db     = require('../db/connection');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.use(authMiddleware, adminMiddleware);

// ── GET /api/admin/dashboard ──────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const [[usuarios]]  = await db.query('SELECT COUNT(*) AS total FROM usuarios WHERE rol = "usuario"');
    const [[cursos]]    = await db.query('SELECT COUNT(*) AS total FROM cursos WHERE activo = 1');
    const [[compras]]   = await db.query('SELECT COUNT(*) AS total, SUM(total) AS ingresos FROM compras WHERE estado = "completado"');
    const [[certs]]     = await db.query('SELECT COUNT(*) AS total FROM certificados');

    const [ultimas_compras] = await db.query(`
      SELECT u.nombre, u.apellido, u.email, comp.total, comp.created_at
      FROM compras comp JOIN usuarios u ON comp.usuario_id = u.id
      WHERE comp.estado = 'completado'
      ORDER BY comp.created_at DESC LIMIT 10
    `);

    const [cursos_populares] = await db.query(`
      SELECT c.nombre, COUNT(ac.id) AS inscritos
      FROM cursos c LEFT JOIN acceso_cursos ac ON ac.curso_id = c.id
      WHERE c.activo = 1
      GROUP BY c.id ORDER BY inscritos DESC LIMIT 5
    `);

    res.json({
      stats: {
        usuarios: usuarios.total,
        cursos: cursos.total,
        compras: compras.total,
        ingresos: compras.ingresos || 0,
        certificados: certs.total
      },
      ultimas_compras,
      cursos_populares
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener estadísticas.' });
  }
});

// ── GET /api/admin/usuarios ───────────────────
router.get('/usuarios', async (req, res) => {
  try {
    const { buscar, pagina = 1 } = req.query;
    const limit  = 20;
    const offset = (pagina - 1) * limit;

    let sql    = 'SELECT id, nombre, apellido, email, dni, telefono, rol, activo, created_at FROM usuarios WHERE 1=1';
    const params = [];

    if (buscar) {
      sql += ' AND (nombre LIKE ? OR apellido LIKE ? OR email LIKE ?)';
      params.push(`%${buscar}%`, `%${buscar}%`, `%${buscar}%`);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [usuarios]    = await db.query(sql, params);
    const [[{total}]]   = await db.query('SELECT COUNT(*) AS total FROM usuarios');

    res.json({ usuarios, total, paginas: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuarios.' });
  }
});

// ── GET /api/admin/usuarios/:id/cursos ─────────
router.get('/usuarios/:id/cursos', async (req, res) => {
  try {
    const [cursos] = await db.query(`
      SELECT c.nombre, c.slug, ac.created_at AS fecha_acceso,
             cert.codigo AS certificado
      FROM acceso_cursos ac
      JOIN cursos c ON ac.curso_id = c.id
      LEFT JOIN certificados cert ON cert.usuario_id = ac.usuario_id AND cert.curso_id = c.id
      WHERE ac.usuario_id = ? AND ac.activo = 1
    `, [req.params.id]);

    res.json({ cursos });
  } catch (err) {
    res.status(500).json({ error: 'Error.' });
  }
});

// ── POST /api/admin/usuarios/:id/dar-acceso ────
router.post('/usuarios/:id/dar-acceso', async (req, res) => {
  try {
    const { curso_id } = req.body;
    await db.query(
      'INSERT INTO acceso_cursos (usuario_id, curso_id) VALUES (?,?) ON DUPLICATE KEY UPDATE activo=1',
      [req.params.id, curso_id]
    );
    res.json({ message: 'Acceso otorgado.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al dar acceso.' });
  }
});

// ── PUT /api/admin/usuarios/:id/estado ─────────
router.put('/usuarios/:id/estado', async (req, res) => {
  try {
    await db.query('UPDATE usuarios SET activo = ? WHERE id = ?', [req.body.activo, req.params.id]);
    res.json({ message: 'Estado actualizado.' });
  } catch (err) {
    res.status(500).json({ error: 'Error.' });
  }
});

// ── POST /api/admin/cursos/:cursoId/modulos ────
router.post('/cursos/:cursoId/modulos', async (req, res) => {
  try {
    const { titulo, orden } = req.body;
    const [result] = await db.query(
      'INSERT INTO modulos (curso_id, titulo, orden) VALUES (?,?,?)',
      [req.params.cursoId, titulo, orden || 0]
    );
    res.status(201).json({ message: 'Módulo creado.', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear módulo.' });
  }
});

// ── POST /api/admin/modulos/:moduloId/lecciones ─
router.post('/modulos/:moduloId/lecciones', async (req, res) => {
  try {
    const { titulo, tipo, contenido, duracion, orden, gratis } = req.body;
    const [result] = await db.query(
      'INSERT INTO lecciones (modulo_id, titulo, tipo, contenido, duracion, orden, gratis) VALUES (?,?,?,?,?,?,?)',
      [req.params.moduloId, titulo, tipo||'video', contenido||'', duracion||0, orden||0, gratis||0]
    );
    res.status(201).json({ message: 'Lección creada.', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear lección.' });
  }
});

// ── GET /api/admin/ventas ─────────────────────
router.get('/ventas', async (req, res) => {
  try {
    const [ventas] = await db.query(`
      SELECT comp.id, comp.total, comp.estado, comp.metodo_pago, comp.referencia_pago,
             comp.created_at, u.nombre, u.apellido, u.email,
             GROUP_CONCAT(c.nombre SEPARATOR '||') AS cursos
      FROM compras comp
      JOIN usuarios u ON comp.usuario_id = u.id
      JOIN compra_items ci ON ci.compra_id = comp.id
      JOIN cursos c ON ci.curso_id = c.id
      GROUP BY comp.id
      ORDER BY comp.created_at DESC
      LIMIT 50
    `);
    res.json({ ventas: ventas.map(v => ({ ...v, cursos: v.cursos?.split('||') || [] })) });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener ventas.' });
  }
});

module.exports = router;
