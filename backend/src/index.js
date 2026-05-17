require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/stickers', require('./routes/stickers'));
app.use('/api/admin',    require('./routes/admin'));

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

// Serve frontend em produção
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
