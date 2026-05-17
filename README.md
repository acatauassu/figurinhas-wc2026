# ⚽ Figurinhas WC2026

Gerenciador de figurinhas do álbum Panini FIFA World Cup 2026.

## Estrutura

```
figurinhas-wc2026/
├── backend/          # Node.js + Express + PostgreSQL
├── frontend/         # React + Vite
├── render.yaml       # Deploy automático no Render.com
└── README.md
```

---

## 🚀 Deploy no Render.com

### 1. Suba o código no GitHub

```bash
git init
git add .
git commit -m "primeiro commit"
git remote add origin https://github.com/SEU_USUARIO/figurinhas-wc2026.git
git push -u origin main
```

### 2. Criar os serviços no Render

1. Acesse [render.com](https://render.com) e conecte sua conta GitHub
2. Clique em **New > Blueprint** e selecione este repositório
3. O `render.yaml` criará automaticamente:
   - **figurinhas-backend** (Web Service Node.js)
   - **figurinhas-frontend** (Static Site React)
   - **figurinhas-db** (PostgreSQL gratuito)

### 3. Configurar variáveis de ambiente

No dashboard do Render, no serviço **figurinhas-backend**, adicione:
- `ADMIN_PHONE` → seu número no formato `+5591999999999`

### 4. Rodar o seed (popular o banco)

No dashboard do Render, vá em **figurinhas-backend > Shell** e execute:

```bash
npm run seed
```

Isso irá:
- Criar as 720 figurinhas no catálogo (36 times × 20)
- Criar seu usuário admin
- Carregar suas figurinhas das fotos

---

## 💻 Rodar localmente

### Backend

```bash
cd backend
cp .env.example .env
# edite o .env com seus dados
npm install
npm run seed    # só na primeira vez
npm run dev
```

### Frontend

```bash
cd frontend
cp .env.example .env
# edite VITE_API_URL=http://localhost:3001
npm install
npm run dev
```

---

## 📱 Como usar

### Login
- Acesse a URL do frontend
- Digite seu número no formato `+5591999999999`
- Se estiver cadastrado, entra direto (sem senha)

### Usuário comum
- Vê suas figurinhas em mãos
- Usa ➕/➖ para ajustar quantidades quando receber novos envelopes
- Figurinhas com ×2+ são automaticamente marcadas como repetidas

### Admin
- Cadastra/remove usuários pelo número
- Vê as repetidas de todos os membros do grupo
- Exporta planilha Excel para enviar no WhatsApp

---

## 🔄 Fluxo de novos envelopes

Quando comprar novos envelopes:
1. Fotografe o verso das figurinhas
2. Mande para o Claude nesta conversa
3. Claude identifica os códigos e informa quais adicionar
4. Você usa ➕ no app para registrar

---

## 🛠️ Tecnologias

| Camada      | Tecnologia        |
|-------------|-------------------|
| Frontend    | React 18 + Vite   |
| Backend     | Node.js + Express |
| Banco       | PostgreSQL        |
| Auth        | JWT (7 dias)      |
| Export      | ExcelJS           |
| Deploy      | Render.com        |
| Código      | GitHub            |
