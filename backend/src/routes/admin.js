const express = require('express');
const ExcelJS = require('exceljs');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// Bloqueia não-admins
router.use((req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Acesso negado' });
  next();
});

// ─── USUÁRIOS ────────────────────────────────────────────────

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, phone, name, is_admin, created_at,
              (SELECT COUNT(*) FROM user_stickers us
               WHERE us.user_id = users.id AND us.owned_count > 0) AS figurinhas_em_maos,
              (SELECT COALESCE(SUM(us.owned_count - 1), 0) FROM user_stickers us
               WHERE us.user_id = users.id AND us.owned_count > 1) AS total_repetidas
       FROM users ORDER BY name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/admin/users
// Body: { phone, name, is_admin? }
router.post('/users', async (req, res) => {
  const { phone, name, is_admin } = req.body;
  if (!phone || !name) return res.status(400).json({ error: 'phone e name são obrigatórios' });

  try {
    const result = await db.query(
      `INSERT INTO users (phone, name, is_admin)
       VALUES ($1, $2, $3) RETURNING id, phone, name, is_admin, created_at`,
      [phone.trim(), name.trim(), is_admin || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Número já cadastrado' });
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ─── REPETIDAS ───────────────────────────────────────────────

// GET /api/admin/repetidas
// Retorna todas as figurinhas repetidas de todos os usuários
router.get('/repetidas', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id AS user_id, u.name, u.phone,
              sc.team_code, sc.team_name, sc.number,
              us.owned_count,
              (us.owned_count - 1) AS repetidas
       FROM user_stickers us
       JOIN users u ON us.user_id = u.id
       JOIN stickers_catalog sc ON us.sticker_code = sc.code
       WHERE us.owned_count > 1
       ORDER BY u.name, sc.team_code, sc.number`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ─── EXPORTAR EXCEL ──────────────────────────────────────────

// GET /api/admin/export
router.get('/export', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.name, u.phone,
              sc.team_code, sc.team_name, sc.number,
              us.owned_count,
              (us.owned_count - 1) AS repetidas
       FROM user_stickers us
       JOIN users u ON us.user_id = u.id
       JOIN stickers_catalog sc ON us.sticker_code = sc.code
       WHERE us.owned_count > 1
       ORDER BY u.name, sc.team_code, sc.number`
    );

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Figurinhas WC2026';
    wb.created = new Date();

    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F2744' } };
    const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };

    // ── Aba 1: Visão Geral ──
    const wsGeral = wb.addWorksheet('Todas as Repetidas');
    wsGeral.columns = [
      { header: 'Usuário',       key: 'name',       width: 22 },
      { header: 'Celular',       key: 'phone',      width: 18 },
      { header: 'Seleção',       key: 'team_name',  width: 20 },
      { header: 'Código',        key: 'code',       width: 10 },
      { header: 'Nº',            key: 'number',     width: 7  },
      { header: 'Em Mãos',       key: 'owned',      width: 10 },
      { header: 'p/ Troca',      key: 'repetidas',  width: 10 },
    ];
    wsGeral.getRow(1).eachCell(cell => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { horizontal: 'center' };
    });

    result.rows.forEach(r => {
      wsGeral.addRow({
        name: r.name,
        phone: r.phone,
        team_name: r.team_name,
        code: `${r.team_code} ${r.number}`,
        number: r.number,
        owned: r.owned_count,
        repetidas: r.repetidas,
      });
    });

    // ── Aba por usuário ──
    const users = [...new Set(result.rows.map(r => r.name))];
    const userColors = [
      'FFD4A017', 'FF1A5276', 'FF1E8449', 'FF7D3C98',
      'FF2E86C1', 'FFB7950B', 'FF117A65', 'FF922B21',
    ];

    users.forEach((userName, idx) => {
      const sheetName = userName.substring(0, 31);
      const ws = wb.addWorksheet(sheetName);
      ws.columns = [
        { header: 'Seleção',        key: 'team_name', width: 22 },
        { header: 'Código',         key: 'code',      width: 10 },
        { header: 'Figurinhas p/ troca', key: 'repetidas', width: 20 },
      ];
      const color = userColors[idx % userColors.length];
      ws.getRow(1).eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
        cell.font = headerFont;
        cell.alignment = { horizontal: 'center' };
      });
      result.rows
        .filter(r => r.name === userName)
        .forEach(r => {
          ws.addRow({
            team_name: r.team_name,
            code: `${r.team_code} ${r.number}`,
            repetidas: r.repetidas,
          });
        });
    });

    const filename = `repetidas-wc2026-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao gerar Excel' });
  }
});

module.exports = router;
