'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 🔥 PASSO 1: Alterar a coluna de ENUM para STRING
    await queryInterface.changeColumn('appointments', 'service', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'outro',
    });

    // 🔥 PASSO 2: Remover o ENUM (opcional, mas recomendado)
    // Primeiro, descobrir o nome do ENUM
    const result = await queryInterface.sequelize.query(
      `SELECT typname FROM pg_type WHERE typname LIKE 'enum_appointments_service%'`
    );
    
    if (result && result[0] && result[0].length > 0) {
      const enumName = result[0][0].typname;
      await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${enumName}" CASCADE`);
      console.log(`✅ ENUM ${enumName} removido com sucesso!`);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // 🔥 VOLTAR PARA ENUM (rollback)
    await queryInterface.changeColumn('appointments', 'service', {
      type: Sequelize.ENUM('corte', 'barba', 'corte_barba', 'sobrancelha', 'outro'),
      allowNull: false,
    });
  }
};