'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 🔥 REMOVER "IF NOT EXISTS"
    await queryInterface.sequelize.query(`
      ALTER TYPE enum_appointments_service ADD VALUE 'progressiva';
      ALTER TYPE enum_appointments_service ADD VALUE 'hidratacao';
      ALTER TYPE enum_appointments_service ADD VALUE 'alisamento';
      ALTER TYPE enum_appointments_service ADD VALUE 'pigmentacao';
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // PostgreSQL não permite remover valores de ENUM facilmente
    // Não fazemos nada no down
  }
};