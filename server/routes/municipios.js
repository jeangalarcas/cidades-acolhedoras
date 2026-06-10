const router = require('express').Router();
const db     = require('../db');

// GET /api/municipios
router.get('/', async (req, res) => {
  try {
    const { nivel, bacia, search } = req.query;
    let query  = 'SELECT * FROM municipios WHERE 1=1';
    const params = [];

    if (nivel) {
      params.push(parseInt(nivel));
      query += ` AND risco_nivel = $${params.length}`;
    }
    if (bacia) {
      params.push(bacia);
      query += ` AND bacia_hidrografica = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND nome ILIKE $${params.length}`;
    }

    query += ' ORDER BY risco_nivel DESC, populacao DESC';
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/municipios/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM municipios WHERE id = $1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Não encontrado' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;