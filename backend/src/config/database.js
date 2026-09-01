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
    // 🔥 ADICIONAR TIMEZONE
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
    // 🔥 ADICIONAR TIMEZONE NA PRODUÇÃO
    timezone: 'America/Sao_Paulo',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
      // 🔥 IMPORTANTE: Desabilitar UTC
      useUTC: false,
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
  
  // Se estiver em produção e tiver DATABASE_URL, usa PostgreSQL
  if (env === 'production' && process.env.DATABASE_URL) {
    console.log('📊 Conectando ao PostgreSQL (Railway)...');
    return new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: false,
      // 🔥 TIMEZONE CONFIGURADO
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
        // 🔥 CRUCIAL: Desabilitar UTC para usar timezone local
        useUTC: false,
        // 🔥 FORÇAR O TIMEZONE DO POSTGRES
        typeCast: true,
      },
      // 🔥 HOOKS PARA GARANTIR TIMEZONE
      hooks: {
        beforeConnect: (config) => {
          console.log('🔧 Configurando timezone para America/Sao_Paulo');
        }
      }
    });
  }
  
  // Caso contrário, usa SQLite (local)
  console.log('📊 Conectando ao SQLite (Local)...');
  return new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../../database.sqlite'),
    logging: false,
    // 🔥 TIMEZONE NO SQLITE
    timezone: 'America/Sao_Paulo',
    define: {
      timestamps: true,
      underscored: true,
    },
  });
};

const sequelize = getSequelizeInstance();

// 🔥 FUNÇÃO PARA TESTAR TIMEZONE
const testTimezone = async () => {
  try {
    const [results] = await sequelize.query('SELECT NOW() as current_time');
    console.log('🕐 Timezone do banco:', results[0]?.current_time || 'N/A');
    
    // Testar conversão de data
    const testDate = new Date('2026-09-01T12:00:00');
    console.log('📅 Teste de conversão:');
    console.log('  Data original:', testDate.toISOString());
    console.log('  Data local:', testDate.toLocaleString('pt-BR'));
    console.log('  Data no banco:', testDate.toISOString().split('T')[0]);
  } catch (error) {
    console.warn('⚠️ Não foi possível testar timezone:', error.message);
  }
};

// 🔥 EXPORTAR TUDO
module.exports = {
  sequelize,
  config,
  testTimezone,
  // 🔥 EXPORTAR O CONFIG PARA O CLI
  development: config.development,
  production: config.production,
  test: config.test,
};
