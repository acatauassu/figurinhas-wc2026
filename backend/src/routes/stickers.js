const express = require('express');
const db      = require('../db');
const auth    = require('../middleware/auth');

const router = express.Router();
router.use(auth);

/* Normaliza "CAN16" → "CAN-16", "can 16" → "CAN-16" */
function normalize(raw) {
  if (!raw) return null;
  const s = String(raw).replace(/[\s\-,]/g, '').toUpperCase();
  const m = s.match(/^([A-Z]{2,3})(\d{1,2})$/);
  return m ? `${m[1]}-${m[2]}` : null;
}

/* GET /api/stickers — figurinhas do usuário com owned_count > 0 */
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT sc.code, sc.team_code, sc.team_name, sc.number,
              us.owned_count
       FROM user_stickers us
       JOIN stickers_catalog sc ON sc.code = us.sticker_code
       WHERE us.user_id = $1 AND us.owned_count > 0
       ORDER BY sc.team_code, sc.number`,
      [req.user.id]
    );
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno' }); }
});

/* POST /api/stickers/add
   Body: { codes: ["CAN16","BRA7"] }  OU  { code: "CAN16" }
   Incrementa owned_count; retorna { results, errors }
*/
router.post('/add', async (req, res) => {
  const rawList = req.body.codes
    ? req.body.codes
    : req.body.code
      ? [req.body.code]
      : [];

  if (!rawList.length) return res.status(400).json({ error: 'Nenhum código enviado' });

  const results = [], errors = [];

  for (const raw of rawList) {
    const code = normalize(raw);
    if (!code) { errors.push({ code: raw, error: 'Formato inválido' }); continue; }

    const cat = await db.query(
      'SELECT code, team_code, team_name, number FROM stickers_catalog WHERE code = $1',
      [code]
    );
    if (!cat.rows.length) { errors.push({ code: raw, error: `${code} não está no catálogo` }); continue; }

    const upd = await db.query(
      `INSERT INTO user_stickers (user_id, sticker_code, owned_count)
       VALUES ($1,$2,1)
       ON CONFLICT (user_id, sticker_code)
       DO UPDATE SET owned_count = user_stickers.owned_count + 1
       RETURNING owned_count`,
      [req.user.id, code]
    );
    results.push({
      code,
      team_code:  cat.rows[0].team_code,
      team_name:  cat.rows[0].team_name,
      number:     cat.rows[0].number,
      owned_count: upd.rows[0].owned_count,
    });
  }

  res.json({ results, errors });
});

/* POST /api/stickers/remove
   Body: { code: "CAN16" }  — decrementa 1
*/
router.post('/remove', async (req, res) => {
  const code = normalize(req.body.code);
  if (!code) return res.status(400).json({ error: 'Código inválido' });

  try {
    const cur = await db.query(
      'SELECT owned_count FROM user_stickers WHERE user_id=$1 AND sticker_code=$2',
      [req.user.id, code]
    );
    if (!cur.rows.length || cur.rows[0].owned_count === 0)
      return res.status(400).json({ error: 'Você não possui essa figurinha' });

    const newCount = cur.rows[0].owned_count - 1;
    if (newCount === 0) {
      await db.query('DELETE FROM user_stickers WHERE user_id=$1 AND sticker_code=$2', [req.user.id, code]);
    } else {
      await db.query(
        'UPDATE user_stickers SET owned_count=$1 WHERE user_id=$2 AND sticker_code=$3',
        [newCount, req.user.id, code]
      );
    }
    res.json({ code, owned_count: newCount });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno' }); }
});

/* POST /api/stickers/bulk — usado pelo seed */
router.post('/bulk', async (req, res) => {
  const { stickers } = req.body;
  if (!Array.isArray(stickers)) return res.status(400).json({ error: 'stickers deve ser array' });
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    for (const s of stickers) {
      await client.query(
        `INSERT INTO user_stickers (user_id, sticker_code, owned_count)
         VALUES ($1,$2,$3)
         ON CONFLICT (user_id, sticker_code)
         DO UPDATE SET owned_count = user_stickers.owned_count + EXCLUDED.owned_count`,
        [req.user.id, s.code, s.owned_count]
      );
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Erro interno' });
  } finally { client.release(); }
});

module.exports = router;
