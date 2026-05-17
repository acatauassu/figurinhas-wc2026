require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./index');

const TEAMS = [
  { code: 'ALG', name: 'Argélia' },
  { code: 'ARG', name: 'Argentina' },
  { code: 'AUS', name: 'Austrália' },
  { code: 'AUT', name: 'Áustria' },
  { code: 'BEL', name: 'Bélgica' },
  { code: 'BRA', name: 'Brasil' },
  { code: 'CAN', name: 'Canadá' },
  { code: 'CIV', name: 'Costa do Marfim' },
  { code: 'COL', name: 'Colômbia' },
  { code: 'CPV', name: 'Cabo Verde' },
  { code: 'CRO', name: 'Croácia' },
  { code: 'CUW', name: 'Curaçao' },
  { code: 'EGY', name: 'Egito' },
  { code: 'ESP', name: 'Espanha' },
  { code: 'FRA', name: 'França' },
  { code: 'GER', name: 'Alemanha' },
  { code: 'GHA', name: 'Gana' },
  { code: 'HAI', name: 'Haiti' },
  { code: 'IRN', name: 'Irã' },
  { code: 'JOR', name: 'Jordânia' },
  { code: 'JPN', name: 'Japão' },
  { code: 'KOR', name: 'Coreia do Sul' },
  { code: 'KSA', name: 'Arábia Saudita' },
  { code: 'MAR', name: 'Marrocos' },
  { code: 'MEX', name: 'México' },
  { code: 'NED', name: 'Holanda' },
  { code: 'NOR', name: 'Noruega' },
  { code: 'NZL', name: 'Nova Zelândia' },
  { code: 'PAN', name: 'Panamá' },
  { code: 'PAR', name: 'Paraguai' },
  { code: 'POR', name: 'Portugal' },
  { code: 'QAT', name: 'Catar' },
  { code: 'RSA', name: 'África do Sul' },
  { code: 'SCO', name: 'Escócia' },
  { code: 'SEN', name: 'Senegal' },
  { code: 'SUI', name: 'Suíça' },
];

// Figurinhas do admin identificadas nas fotos
const ADMIN_OWNED_RAW = [
  'FRA-12',
  'PAR-6','IRN-10','CUW-6','NZL-19','PAR-2','CPV-2','JOR-16','AUT-8',
  'MAR-4','RSA-14','JPN-6','JOR-17','BRA-3','JOR-6','AUT-10','PAN-16',
  'NZL-14','CUW-10','IRN-18','SEN-4','MAR-8','RSA-18','JPN-14','GER-16',
  'BRA-7','JOR-20','CPV-5','BRA-9','MAR-10','KSA-8','GER-15','IRN-9',
  'PAR-10','JPN-5','SEN-5','COL-9','PAR-4','ALG-14','NOR-2','SUI-2',
  'SEN-16','JOR-20','RSA-19','SCO-7','MEX-10','BRA-16','NED-17',
  'JOR-16','SCO-20','SEN-14','MEX-6','BRA-20','KOR-4','NOR-16','CAN-5',
  'JPN-19','NOR-11','JOR-11','SEN-9','SCO-16','BRA-2','NZL-18',
  'FRA-12','SCO-2','HAI-18','AUT-11','GHA-15','KSA-17','EGY-17','QAT-18',
  'KOR-14','JOR-5','SCO-2','AUT-2','POR-7','PAN-17','ESP-2',
  'CAN-16','CUW-9','AUS-18','CIV-19','SCO-6','PAN-15','ALG-17','RSA-7',
  'EGY-19','BEL-4','MEX-17','AUT-15','FRA-12','EGY-14','NOR-20','PAR-3','PAN-4',
  'ALG-8','NED-14','IRN-11','KSA-20','CIV-5','GER-5','SCO-11','COL-8',
  'QAT-5','IRN-16','MAR-5','ARG-14','GER-9','SCO-16','AUS-17','SEN-8',
  'MAR-2','GHA-17','QAT-15','POR-3','ESP-8','CRO-12','CPV-14','MEX-4',
  'HAI-15','AUS-4','QAT-15','HAI-2','ALG-11','ARG-14','QAT-11','CAN-11','IRN-11',
  'BRA-5','BRA-18','QAT-20','CAN-7','CIV-9','HAI-9','JOR-2',
  'SUI-1','RSA-1','EGY-1','GER-1','IRN-1','SUI-1',
];

async function seed() {
  const client = await db.connect();
  try {
    console.log('🗄️  Criando schema...');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);

    console.log('📋 Inserindo catálogo de figurinhas (720)...');
    for (const team of TEAMS) {
      for (let n = 1; n <= 20; n++) {
        const code = `${team.code}-${n}`;
        await client.query(
          `INSERT INTO stickers_catalog (code, team_code, team_name, number)
           VALUES ($1, $2, $3, $4) ON CONFLICT (code) DO NOTHING`,
          [code, team.code, team.name, n]
        );
      }
    }
    console.log('✅ Catálogo inserido');

    // Admin
    const adminPhone = process.env.ADMIN_PHONE;
    if (!adminPhone) {
      console.warn('⚠️  ADMIN_PHONE não definido no .env — pulando criação do admin');
    } else {
      console.log(`👤 Criando admin (${adminPhone})...`);
      const res = await client.query(
        `INSERT INTO users (phone, name, is_admin)
         VALUES ($1, 'Admin', TRUE)
         ON CONFLICT (phone) DO UPDATE SET is_admin = TRUE
         RETURNING id`,
        [adminPhone]
      );
      const adminId = res.rows[0].id;

      // Contar figurinhas do admin
      const owned = {};
      ADMIN_OWNED_RAW.forEach(k => { owned[k] = (owned[k] || 0) + 1; });

      console.log('📦 Carregando figurinhas do admin...');
      for (const [code, count] of Object.entries(owned)) {
        await client.query(
          `INSERT INTO user_stickers (user_id, sticker_code, owned_count)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, sticker_code) DO UPDATE SET owned_count = $3`,
          [adminId, code, count]
        );
      }
      console.log(`✅ ${Object.keys(owned).length} figurinhas do admin carregadas`);
    }

    console.log('\n🎉 Seed concluído com sucesso!');
  } catch (err) {
    console.error('❌ Erro no seed:', err.message);
    throw err;
  } finally {
    client.release();
    process.exit(0);
  }
}

seed();
