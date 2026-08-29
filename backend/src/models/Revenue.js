module.exports = (sequelize, DataTypes) => {
  const Revenue = sequelize.define('Revenue', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    cashRegisterId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'cash_register_id',
    },
    barberId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'barber_id',
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    total: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    commissions: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    servicesCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'services_count',
    },
    initialCash: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      field: 'initial_cash',
    },
    finalCash: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      field: 'final_cash',
    },
    // 🔥 ADICIONAR ESTE CAMPO
    clientName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'client_name',
    },
  }, {
    tableName: 'revenues',
    underscored: true,
    timestamps: true,
  });

  Revenue.associate = function(models) {
    Revenue.belongsTo(models.CashRegister, { foreignKey: 'cashRegisterId', as: 'cashRegister' });
    Revenue.belongsTo(models.Barber, { foreignKey: 'barberId', as: 'barber' });
  };

  return Revenue;
};