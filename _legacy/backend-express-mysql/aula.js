// routes/aula.js — Dashboard, progreso y mis cursos
const router = require('express').Router();
const db     = require('../db/connection');
const { authMiddleware } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// ── GET /api/aula/mis-cursos ──────────────────
router.get('/mis-cursos', async (req, res) => {
  try {
    const [cursos] = await db.query(`
      SELECT c.id, c.nombre, c.slug, c.emoji, c.bg_color, c.duracion, c.modalidad,
             ac.created_at AS fecha_acceso,
             (
               SELECT COUNT(*) FROM lecciones l
               JOIN modulos m ON l.modulo_id = m.id
               WHERE m.curso_id = c.id
             ) AS total_lecciones,
             (
               SELECT COUNT(*) FROM progreso p
               JOIN lecciones l ON p.leccion_id = l.id
               JOIN modulos m ON l.modulo_id = m.id
               WHERE m.curso_id = c.id AND p.usuario_id = ? AND p.completado = 1
             ) AS lecciones_completadas
      FROM acceso_cursos ac
      JOIN cursos c ON ac.curso_id = c.id
      WHERE ac.usuario_id = ? AND ac.activo = 1
      ORDER BY ac.created_at DESC
    `, [req.user.id, req.user.id]);

    // Calcular progreso
    const cursosConProgreso = cursos.map(c => ({
      ...c,
      progreso: c.total_lecciones > 0
        ? Math.round((c.lecciones_completadas / c.total_lecciones) * 100)
        : 0,
      completado: c.total_lecciones > 0 && c.lecciones_completadas === c.total_lecciones
    }));

    res.json({ cursos: cursosConProgreso });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener tus cursos.' });
  }
});

// ── GET /api/aula/progreso/:cursoId ───────────
router.get('/progreso/:cursoId', async (req, res) => {
  try {
    const [lecciones] = await db.query(`
      SELECT l.id, l.titulo, l.tipo, l.duracion,
             COALESCE(p.completado, 0) AS completado,
             COALESCE(p.tiempo_visto, 0) AS tiempo_visto
      FROM lecciones l
      JOIN modulos m ON l.modulo_id = m.id
      LEFT JOIN progreso p ON p.leccion_id = l.id AND p.usuario_id = ?
      WHERE m.curso_id = ?
      ORDER BY m.orden, l.orden
    `, [req.user.id, req.params.cursoId]);

    const completadas = lecciones.filter(l => l.completado).length;
    const progresoPct = lecciones.length > 0
      ? Math.round((completadas / lecciones.length) * 100)
      : 0;

    res.json({ lecciones, progreso: progresoPct, completadas, total: lecciones.length });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener progreso.' });
  }
});

// ── POST /api/aula/progreso — Marcar lección completada
router.post('/progreso', async (req, res) => {
  try {
    const { leccion_id, completado, tiempo_visto } = req.body;

    await db.query(`
      INSERT INTO progreso (usuario_id, leccion_id, completado, tiempo_visto)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE completado = ?, tiempo_visto = ?, updated_at = NOW()
    `, [req.user.id, leccion_id, completado||0, tiempo_visto||0,
        completado||0, tiempo_visto||0]);

    // Verificar si el curso se completó para emitir certificado
    const [leccionInfo] = await db.query(`
      SELECT m.curso_id FROM lecciones l JOIN modulos m ON l.modulo_id = m.id WHERE l.id = ?
    `, [leccion_id]);

    if (leccionInfo.length && completado) {
      const cursoId = leccionInfo[0].curso_id;

      const [[totales]] = await db.query(`
        SELECT COUNT(*) AS total FROM lecciones l
        JOIN modulos m ON l.modulo_id = m.id WHERE m.curso_id = ?
      `, [cursoId]);

      const [[completas]] = await db.query(`
        SELECT COUNT(*) AS total FROM progreso p
        JOIN lecciones l ON p.leccion_id = l.id
        JOIN modulos m ON l.modulo_id = m.id
        WHERE m.curso_id = ? AND p.usuario_id = ? AND p.completado = 1
      `, [cursoId, req.user.id]);

      if (totales.total > 0 && totales.total === completas.total) {
        // Emitir certificado si no existe
        const [certExiste] = await db.query(
          'SELECT id FROM certificados WHERE usuario_id = ? AND curso_id = ?',
          [req.user.id, cursoId]
        );

        if (!certExiste.length) {
          const codigo = `PQL-${new Date().getFullYear()}-${String(cursoId).padStart(3,'0')}-${String(req.user.id).padStart(5,'0')}`;
          await db.query(
            'INSERT INTO certificados (usuario_id, curso_id, codigo) VALUES (?,?,?)',
            [req.user.id, cursoId, codigo]
          );
          return res.json({ message: 'Lección completada.', certificado_emitido: true, codigo });
        }
      }
    }

    res.json({ message: 'Progreso actualizado.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar progreso.' });
  }
});

// ── GET /api/aula/certificados ────────────────
router.get('/certificados', async (req, res) => {
  try {
    const [certs] = await db.query(`
      SELECT cert.codigo, cert.emitido_at, c.nombre, c.slug, c.emoji
      FROM certificados cert
      JOIN cursos c ON cert.curso_id = c.id
      WHERE cert.usuario_id = ?
      ORDER BY cert.emitido_at DESC
    `, [req.user.id]);

    res.json({ certificados: certs });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener certificados.' });
  }
});

// ── GET /api/aula/proximas-clases ─────────────
router.get('/proximas-clases', async (req, res) => {
  // En producción esto vendría de una tabla de horarios
  const clases = [
    { curso: 'Ley 29783 — SST', fecha: 'Hoy', hora: '7:00 PM', plataforma: 'Zoom', link: 'https://zoom.us/j/ejemplo' },
    { curso: 'ISO 9001:2015', fecha: 'Jue', hora: '6:00 PM', plataforma: 'Zoom', link: 'https://zoom.us/j/ejemplo' },
    { curso: 'IPERC Avanzado', fecha: 'Sáb', hora: '9:00 AM', plataforma: 'Zoom', link: 'https://zoom.us/j/ejemplo' }
  ];
  res.json({ clases });
});

module.exports = router;
