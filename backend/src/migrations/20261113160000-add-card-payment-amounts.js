module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn('sales', 'charged_total', { type: Sequelize.FLOAT }, { transaction });
      await queryInterface.addColumn('monthly_payments', 'base_amount', { type: Sequelize.FLOAT }, { transaction });
      await queryInterface.addColumn('monthly_payments', 'payment_method', { type: Sequelize.STRING }, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn('monthly_payments', 'payment_method', { transaction });
      await queryInterface.removeColumn('monthly_payments', 'base_amount', { transaction });
      await queryInterface.removeColumn('sales', 'charged_total', { transaction });
    });
  },
};
