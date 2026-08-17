'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 🔥 ADICIONAR NOVOS VALORES AO ENUM
    await queryInterface.sequelize.query(`
      ALTER TYPE enum_appointments_service ADD VALUE 'progressiva' IF NOT EXISTS;
      ALTER TYPE enum_appointments_service ADD VALUE 'hidratacao' IF NOT EXISTS;
      ALTER TYPE enum_appointments_service ADD VALUE 'alisamento' IF NOT EXISTS;
      ALTER TYPE enum_appointments_service ADD VALUE 'pigmentacao' IF NOT EXISTS;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // PostgreSQL não permite remover valores de ENUM facilmente
    // Então não fazemos nada no down
  }
};