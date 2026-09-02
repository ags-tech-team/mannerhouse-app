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
      references: {
        model: 'cash_registers',
        key: 'id',
      },
      field: 'cash_register_id',
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
    clientId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'clients',
        key: 'id',
      },
      field: 'client_id',
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
    },
    clientName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'client_name',
    },
    barberName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'barber_name',
    },
    service: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    serviceDescription: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'service_description',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed'),
      defaultValue: 'pending',
      allowNull: false,
    },
  }, {
    tableName: 'revenues',
    underscored: true,
    timestamps: true,
  });

  Revenue.associate = function(models) {
    Revenue.belongsTo(models.CashRegister, { 
      foreignKey: 'cashRegisterId', 
      as: 'cashRegister' 
    });
    Revenue.belongsTo(models.Barber, { 
      foreignKey: 'barberId', 
      as: 'barber' 
    });
    Revenue.belongsTo(models.Client, {
      foreignKey: 'clientId', 
      as: 'client' 
    });
  };

  return Revenue;
};