'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 🔥 1. ADICIONAR COLUNA barber_id
    await queryInterface.addColumn('revenues', 'barber_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'barbers',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // 🔥 2. CRIAR ÍNDICE PARA MELHOR PERFORMANCE
    await queryInterface.addIndex('revenues', ['barber_id'], {
      name: 'revenues_barber_id_idx',
    });

    // 🔥 3. ATUALIZAR REGISTROS EXISTENTES (opcional, pode ser feito depois)
    // Esta parte é opcional - você pode rodar manualmente depois
  },

  down: async (queryInterface, Sequelize) => {
    // 🔥 REMOVER ÍNDICE
    await queryInterface.removeIndex('revenues', 'revenues_barber_id_idx');
    
    // 🔥 REMOVER COLUNA
    await queryInterface.removeColumn('revenues', 'barber_id');
  }
};
