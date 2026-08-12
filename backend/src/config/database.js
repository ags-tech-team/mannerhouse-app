const { Sequelize } = require('sequelize');
const path = require('path');

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
  },
  production: {
    dialect: 'postgres',
    use_env_variable: 'DATABASE_URL',
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
    },
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
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
  },
};

// 🔥 INSTÂNCIA DO SEQUELIZE PARA O APP
const getSequelizeInstance = () => {
  const env = process.env.NODE_ENV || 'development';
  
  // Se estiver em produção e tiver DATABASE_URL, usa PostgreSQL
  if (env === 'production' && process.env.DATABASE_URL) {
    console.log('📊 Conectando ao PostgreSQL (Railway)...');
    return new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: false,
      define: {
        timestamps: true,
        underscored: true,
      },
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
    });
  }
  
  // Caso contrário, usa SQLite (local)
  console.log('📊 Conectando ao SQLite (Local)...');
  return new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../../database.sqlite'),
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
    },
  });
};

const sequelize = getSequelizeInstance();

module.exports = {
  sequelize,
  config,
  // 🔥 EXPORTAR O SEQUELIZE E O CONFIG PARA O CLI
  development: config.development,
  production: config.production,
  test: config.test,
};