const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

// POST /api/auth/login
// Body: { phone: '+5591999999999' }
router.post('/login', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Número de celular obrigatório' });

  try {
    const result = await db.query(
      'SELECT id, phone, name, is_admin FROM users WHERE phone = $1',
      [phone.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Número não cadastrado. Fale com o administrador do grupo.',
      });
    }

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, phone: user.phone, name: user.name, is_admin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/auth/me  (valida token e retorna dados do usuário)
router.get('/me', require('../middleware/auth'), async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
