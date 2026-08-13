module.exports = (sequelize, DataTypes) => {
  const Client = sequelize.define('Client', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // 🔥 REMOVER O CAMPO email
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isMonthly: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_monthly',
    },
    monthlyFee: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      validate: {
        min: 0,
      },
      field: 'monthly_fee',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
    },
  }, {
    tableName: 'clients',
    underscored: true,
    timestamps: true,
  });

  return Client;
};