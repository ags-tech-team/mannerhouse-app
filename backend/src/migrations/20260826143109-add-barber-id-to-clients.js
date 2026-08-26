'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('clients', 'barber_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'barbers',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('clients', 'barber_id');
  }
};