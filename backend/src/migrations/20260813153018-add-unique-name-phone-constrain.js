'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 🔥 ADICIONAR CONSTRAINT ÚNICA (nome + telefone)
    await queryInterface.addConstraint('clients', {
      fields: ['name', 'phone'],
      type: 'unique',
      name: 'unique_name_phone',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // 🔥 REMOVER CONSTRAINT
    await queryInterface.removeConstraint('clients', 'unique_name_phone');
  }
};