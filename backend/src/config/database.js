const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
  },
});

module.exports = sequelize;