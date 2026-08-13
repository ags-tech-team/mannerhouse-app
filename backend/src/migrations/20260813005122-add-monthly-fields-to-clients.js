'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 🔥 ADICIONAR COLUNAS NA TABELA clients
    await queryInterface.addColumn('clients', 'is_monthly', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    });

    await queryInterface.addColumn('clients', 'monthly_fee', {
      type: Sequelize.FLOAT,
      defaultValue: 0,
      allowNull: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    // 🔥 REMOVER COLUNAS (rollback)
    await queryInterface.removeColumn('clients', 'is_monthly');
    await queryInterface.removeColumn('clients', 'monthly_fee');
  }
};