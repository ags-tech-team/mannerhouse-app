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
    // 🔥 NOVO CAMPO: Vinculação com barbeiro
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

  // 🔥 ASSOCIAÇÃO
  Client.associate = function(models) {
    Client.belongsTo(models.Barber, { foreignKey: 'barberId', as: 'barber' });
  };

  return Client;
};