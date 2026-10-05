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
    barberId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'barbers',
        key: 'id',
      },
      field: 'barber_id',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
    },
    // 🔥 NOVO: cliente bloqueado
    isBlocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_blocked',
    },
  }, {
    tableName: 'clients',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['name', 'phone'],
        name: 'unique_name_phone'
      }
    ]
  });

  Client.associate = function(models) {
    Client.belongsTo(models.Barber, { foreignKey: 'barberId', as: 'barber' });
  };

  return Client;
};