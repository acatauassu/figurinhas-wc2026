require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const db   = require('./index');

const TEAMS = [
  { code:'ALG', name:'Argélia'         },
  { code:'ARG', name:'Argentina'       },
  { code:'AUS', name:'Austrália'       },
  { code:'AUT', name:'Áustria'         },
  { code:'BEL', name:'Bélgica'         },
  { code:'BIH', name:'Bósnia-Herzeg.'  },
  { code:'BRA', name:'Brasil'          },
  { code:'CAN', name:'Canadá'          },
  { code:'CIV', name:'Costa do Marfim' },
  { code:'COD', name:'Congo DR'        },
  { code:'COL', name:'Colômbia'        },
  { code:'CPV', name:'Cabo Verde'      },
  { code:'CRO', name:'Croácia'         },
  { code:'CUW', name:'Curaçao'         },
  { code:'CZE', name:'Tchéquia'        },
  { code:'ECU', name:'Equador'         },
  { code:'EGY', name:'Egito'           },
  { code:'ENG', name:'Inglaterra'      },
  { code:'ESP', name:'Espanha'         },
  { code:'FRA', name:'França'          },
  { code:'GER', name:'Alemanha'        },
  { code:'GHA', name:'Gana'            },
  { code:'HAI', name:'Haiti'           },
  { code:'IRN', name:'Irã'             },
  { code:'IRQ', name:'Iraque'          },
  { code:'JOR', name:'Jordânia'        },
  { code:'JPN', name:'Japão'           },
  { code:'KOR', name:'Coreia do Sul'   },
  { code:'KSA', name:'Arábia Saudita'  },
  { code:'MAR', name:'Marrocos'        },
  { code:'MEX', name:'México'          },
  { code:'NED', name:'Holanda'         },
  { code:'NOR', name:'Noruega'         },
  { code:'NZL', name:'Nova Zelândia'   },
  { code:'PAN', name:'Panamá'          },
  { code:'PAR', name:'Paraguai'        },
  { code:'POR', name:'Portugal'        },
  { code:'QAT', name:'Catar'           },
  { code:'RSA', name:'África do Sul'   },
  { code:'SCO', name:'Escócia'         },
  { code:'SEN', name:'Senegal'         },
  { code:'SUI', name:'Suíça'           },
  { code:'SWE', name:'Suécia'          },
  { code:'TUN', name:'Tunísia'         },
  { code:'TUR', name:'Turquia'         },
  { code:'URU', name:'Uruguai'         },
  { code:'USA', name:'EUA'             },
  { code:'UZB', name:'Uzbequistão'     },
];

async function seed() {
  const client = await db.connect();
  try {
    console.log('🗄️  Criando schema...');
    const schema = fs.readFileSync(path.join(__dirname,'schema.sql'),'utf8');
    await client.query(schema);

    console.log(`📋 Inserindo catálogo (${TEAMS.length} times × 20 = ${TEAMS.length*20} figurinhas)...`);
    for (const team of TEAMS)
      for (let n = 1; n <= 20; n++)
        await client.query(
          `INSERT INTO stickers_catalog (code,team_code,team_name,number) VALUES ($1,$2,$3,$4) ON CONFLICT (code) DO NOTHING`,
          [`${team.code}-${n}`, team.code, team.name, n]
        );
    console.log('✅ Catálogo OK');

    const adminPhone = process.env.ADMIN_PHONE;
    if (adminPhone) {
      const res = await client.query(
        `INSERT INTO users (phone,name,is_admin) VALUES ($1,'Admin',TRUE)
         ON CONFLICT (phone) DO UPDATE SET is_admin=TRUE RETURNING id`,
        [adminPhone]
      );
      console.log(`👤 Admin OK (id=${res.rows[0].id})`);
    } else {
      console.warn('⚠️  ADMIN_PHONE não definido — pulando admin');
    }

    console.log('\n🎉 Seed concluído!');
  } catch (err) {
    console.error('❌ Erro:', err.message);
    throw err;
  } finally {
    client.release();
    process.exit(0);
  }
}

seed();
