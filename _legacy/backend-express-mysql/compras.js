// routes/compras.js — Carrito y procesamiento de pagos
const router = require('express').Router();
const db     = require('../db/connection');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// ── POST /api/compras/checkout ────────────────
// Recibe array de curso_ids, procesa el pago con Culqi/Stripe
router.post('/checkout', async (req, res) => {
  const { curso_ids, token_pago, metodo } = req.body;

  if (!curso_ids?.length) {
    return res.status(400).json({ error: 'El carrito está vacío.' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Verificar cursos y calcular total
    const placeholders = curso_ids.map(() => '?').join(',');
    const [cursos] = await conn.query(
      `SELECT id, nombre, precio FROM cursos WHERE id IN (${placeholders}) AND activo = 1`,
      curso_ids
    );

    if (cursos.length !== curso_ids.length) {
      await conn.rollback();
      return res.status(400).json({ error: 'Algunos cursos no están disponibles.' });
    }

    // Verificar que no tenga ya esos cursos
    const [yaComprados] = await conn.query(
      `SELECT curso_id FROM acceso_cursos WHERE usuario_id = ? AND curso_id IN (${placeholders}) AND activo = 1`,
      [req.user.id, ...curso_ids]
    );

    if (yaComprados.length) {
      await conn.rollback();
      return res.status(400).json({
        error: 'Ya tienes acceso a uno o más cursos del carrito.',
        cursos_ya_comprados: yaComprados.map(r => r.curso_id)
      });
    }

    const total = cursos.reduce((sum, c) => sum + parseFloat(c.precio), 0);

    // ── Procesar pago con Culqi ───────────────
    // En producción: llamar a la API de Culqi/Stripe/MercadoPago
    // const pago = await procesarCulqi(token_pago, total);
    // Para demo, simulamos pago exitoso:
    const referencia_pago = `PQ-${Date.now()}`;
    const estado_pago = 'completado';

    // Registrar compra
    const [compra] = await conn.query(
      'INSERT INTO compras (usuario_id, total, estado, metodo_pago, referencia_pago) VALUES (?,?,?,?,?)',
      [req.user.id, total, estado_pago, metodo||'culqi', referencia_pago]
    );

    // Registrar items
    for (const curso of cursos) {
      await conn.query(
        'INSERT INTO compra_items (compra_id, curso_id, precio) VALUES (?,?,?)',
        [compra.insertId, curso.id, curso.precio]
      );
      // Dar acceso al usuario
      await conn.query(
        'INSERT INTO acceso_cursos (usuario_id, curso_id, compra_id) VALUES (?,?,?) ON DUPLICATE KEY UPDATE activo=1',
        [req.user.id, curso.id, compra.insertId]
      );
    }

    await conn.commit();

    res.json({
      message: '¡Pago procesado exitosamente! Ya tienes acceso a tus cursos.',
      compra_id: compra.insertId,
      referencia: referencia_pago,
      cursos_desbloqueados: cursos.map(c => c.nombre)
    });
  } catch (err) {
    await conn.rollback();
    console.error('Error checkout:', err);
    res.status(500).json({ error: 'Error al procesar el pago. Intenta de nuevo.' });
  } finally {
    conn.release();
  }
});

// ── GET /api/compras/historial ────────────────
router.get('/historial', async (req, res) => {
  try {
    const [compras] = await db.query(`
      SELECT comp.id, comp.total, comp.estado, comp.metodo_pago,
             comp.referencia_pago, comp.created_at,
             GROUP_CONCAT(c.nombre SEPARATOR '||') AS cursos_nombres
      FROM compras comp
      JOIN compra_items ci ON ci.compra_id = comp.id
      JOIN cursos c ON ci.curso_id = c.id
      WHERE comp.usuario_id = ?
      GROUP BY comp.id
      ORDER BY comp.created_at DESC
    `, [req.user.id]);

    const historial = compras.map(c => ({
      ...c,
      cursos: c.cursos_nombres?.split('||') || []
    }));

    res.json({ historial });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener historial.' });
  }
});

// ── GET /api/compras/tiene-acceso/:cursoId ─────
router.get('/tiene-acceso/:cursoId', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id FROM acceso_cursos WHERE usuario_id = ? AND curso_id = ? AND activo = 1',
      [req.user.id, req.params.cursoId]
    );
    res.json({ tiene_acceso: rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: 'Error al verificar acceso.' });
  }
});

module.exports = router;
