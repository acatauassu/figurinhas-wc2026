require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/stickers', require('./routes/stickers'));
app.use('/api/admin',    require('./routes/admin'));

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Backend rodando na porta ${PORT}`);
});
