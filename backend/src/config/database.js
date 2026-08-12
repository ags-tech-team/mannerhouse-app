const { Sequelize } = require('sequelize');

// 🔥 DETECTAR AMBIENTE
const isProduction = process.env.NODE_ENV === 'production';
const isRailway = !!process.env.DATABASE_URL;

// 🔥 ESCOLHER O BANCO
let sequelize;

if (isRailway) {
  // 🔥 USAR POSTGRESQL (RAILWAY)
  console.log('📊 Conectando ao PostgreSQL (Railway)...');
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
    },
  });
} else {
  // 🔥 USAR SQLITE (LOCAL)
  console.log('📊 Conectando ao SQLite (Local)...');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
    },
  });
}

module.exports = sequelize;