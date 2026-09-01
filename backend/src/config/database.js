const { Sequelize } = require('sequelize');
const path = require('path');

// 🔥 CONFIGURAÇÃO DO TIMEZONE (DEVE SER A PRIMEIRA COISA)
process.env.TZ = 'America/Sao_Paulo';

// 🔥 CONFIGURAÇÃO PARA O SEQUELIZE CLI (MIGRATIONS)
const config = {
  development: {
    dialect: 'sqlite',
    storage: path.join(__dirname, '../../database.sqlite'),
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
    },
    timezone: 'America/Sao_Paulo',
  },
  production: {
    dialect: 'postgres',
    use_env_variable: 'DATABASE_URL',
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
    },
    timezone: 'America/Sao_Paulo',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
      // 🔥 CRUCIAL: Forçar timezone
      useUTC: false,
    },
    // 🔥 HOOKS PARA EXECUTAR APÓS CONEXÃO
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
  test: {
    dialect: 'sqlite',
    storage: path.join(__dirname, '../../database.test.sqlite'),
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
    },
    timezone: 'America/Sao_Paulo',
  },
};

const getSequelizeInstance = () => {
  const env = process.env.NODE_ENV || 'development';
  
  console.log('🔍 DEBUG:');
  console.log('  NODE_ENV:', env);
  console.log('  TIMEZONE:', process.env.TZ);
  console.log('  DATABASE_URL:', process.env.DATABASE_URL ? '✅ EXISTE' : '❌ NÃO EXISTE');
  
  let sequelize;
  
  if (env === 'production' && process.env.DATABASE_URL) {
    console.log('📊 Conectando ao PostgreSQL (Railway)...');
    
    sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: false,
      timezone: 'America/Sao_Paulo',
      define: {
        timestamps: true,
        underscored: true,
      },
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
        useUTC: false,
      },
      // 🔥 HOOKS PARA EXECUTAR APÓS CONEXÃO
      hooks: {
        afterConnect: async (connection) => {
          console.log('🔧 Configurando timezone do banco para America/Sao_Paulo...');
          try {
            // 🔥 FORÇAR TIMEZONE NA CONEXÃO
            await connection.query('SET TIMEZONE = "America/Sao_Paulo";');
            console.log('✅ Timezone do banco configurado para America/Sao_Paulo');
          } catch (err) {
            console.warn('⚠️ Não foi possível configurar timezone:', err.message);
          }
        }
      }
    });
  } else {
    console.log('📊 Conectando ao SQLite (Local)...');
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: path.join(__dirname, '../../database.sqlite'),
      logging: false,
      timezone: 'America/Sao_Paulo',
      define: {
        timestamps: true,
        underscored: true,
      },
    });
  }
  
  return sequelize;
};

const sequelize = getSequelizeInstance();

// 🔥 FUNÇÃO PARA TESTAR TIMEZONE
const testTimezone = async () => {
  try {
    // Forçar timezone antes de testar
    await sequelize.query('SET TIMEZONE = "America/Sao_Paulo";');
    
    const [results] = await sequelize.query('SHOW timezone;');
    console.log('🕐 Timezone do banco:', results[0]?.TimeZone || results[0]?.timezone || 'N/A');
    
    const [now] = await sequelize.query('SELECT NOW() as current_time;');
    console.log('🕐 Hora atual no banco:', now[0]?.current_time || 'N/A');
  } catch (error) {
    console.warn('⚠️ Não foi possível testar timezone:', error.message);
  }
};

// 🔥 EXPORTAR TUDO
module.exports = {
  sequelize,
  config,
  testTimezone,
  development: config.development,
  production: config.production,
  test: config.test,
};