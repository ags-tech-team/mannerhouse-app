module.exports = (sequelize, DataTypes) => {
  const Appointment = sequelize.define('Appointment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    barberId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'barbers',
        key: 'id',
      },
      field: 'barber_id',
    },
    clientId: {
      type: DataTypes.UUID,
      allowNull: false,
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
    time: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    service: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'outro',
    },
    serviceDescription: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'service_description',
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    commission: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'completed', 'cancelled'),
      defaultValue: 'pending',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'appointments',
    underscored: true,
    timestamps: true,
  });

  // 🔥 ADICIONAR AS ASSOCIAÇÕES AQUI
  Appointment.associate = function(models) {
    Appointment.belongsTo(models.Barber, { 
      foreignKey: 'barberId', 
      as: 'barber' 
    });
    Appointment.belongsTo(models.Client, { 
      foreignKey: 'clientId', 
      as: 'client' 
    });
  };

  return Appointment;
};