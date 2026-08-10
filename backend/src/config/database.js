const { Sequelize } = require('sequelize');

// 🔥 Usar PostgreSQL se tiver DATABASE_URL, senão SQLite (local)
const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'sqlite:./database.sqlite',
  {
    dialect: process.env.DATABASE_URL ? 'postgres' : 'sqlite',
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
    },
  }
);

module.exports = sequelize;