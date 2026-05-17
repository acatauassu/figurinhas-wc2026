-- Usuários do sistema
CREATE TABLE IF NOT EXISTS users (
  id        SERIAL PRIMARY KEY,
  phone     VARCHAR(20) UNIQUE NOT NULL,
  name      VARCHAR(100) NOT NULL,
  is_admin  BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Catálogo completo do álbum (720 figurinhas: 36 times × 20)
CREATE TABLE IF NOT EXISTS stickers_catalog (
  code       VARCHAR(10) PRIMARY KEY,  -- ex: 'FRA-12'
  team_code  VARCHAR(5)  NOT NULL,     -- ex: 'FRA'
  team_name  VARCHAR(50) NOT NULL,     -- ex: 'França'
  number     INTEGER     NOT NULL
);

-- Figurinhas de cada usuário
CREATE TABLE IF NOT EXISTS user_stickers (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
  sticker_code  VARCHAR(10) REFERENCES stickers_catalog(code),
  owned_count   INTEGER DEFAULT 0,
  UNIQUE(user_id, sticker_code)
);

CREATE INDEX IF NOT EXISTS idx_user_stickers_user ON user_stickers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stickers_code ON user_stickers(sticker_code);
