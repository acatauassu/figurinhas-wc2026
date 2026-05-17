const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// GET /api/stickers
// Retorna todas as figurinhas do catálogo com owned_count do usuário logado
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT sc.code, sc.team_code, sc.team_name, sc.number,
              COALESCE(us.owned_count, 0) AS owned_count
       FROM stickers_catalog sc
       LEFT JOIN user_stickers us
         ON sc.code = us.sticker_code AND us.user_id = $1
       ORDER BY sc.team_code, sc.number`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PUT /api/stickers/:code
// Body: { owned_count: 2 }
router.put('/:code', async (req, res) => {
  const { code } = req.params;
  const { owned_count } = req.body;

  if (owned_count === undefined || owned_count < 0) {
    return res.status(400).json({ error: 'owned_count inválido' });
  }

  try {
    await db.query(
      `INSERT INTO user_stickers (user_id, sticker_code, owned_count)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, sticker_code)
       DO UPDATE SET owned_count = EXCLUDED.owned_count`,
      [req.user.id, code, owned_count]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/stickers/bulk
// Body: { stickers: [{ code, owned_count }] }
// Usado para carregar lote de figurinhas de uma vez (novos envelopes)
router.post('/bulk', async (req, res) => {
  const { stickers } = req.body;
  if (!Array.isArray(stickers)) {
    return res.status(400).json({ error: 'stickers deve ser um array' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    for (const s of stickers) {
      await client.query(
        `INSERT INTO user_stickers (user_id, sticker_code, owned_count)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, sticker_code)
         DO UPDATE SET owned_count = user_stickers.owned_count + EXCLUDED.owned_count`,
        [req.user.id, s.code, s.owned_count]
      );
    }
    await client.query('COMMIT');
    res.json({ success: true, updated: stickers.length });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  } finally {
    client.release();
  }
});

module.exports = router;
