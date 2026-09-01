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
      // 🔥 GARANTIR QUE A DATA SEJA ARMAZENADA COMO STRING LITERAL
      get() {
        const rawValue = this.getDataValue('date');
        if (!rawValue) return null;
        // Garantir que seja YYYY-MM-DD
        if (typeof rawValue === 'string') return rawValue;
        if (rawValue instanceof Date) {
          const year = rawValue.getFullYear();
          const month = String(rawValue.getMonth() + 1).padStart(2, '0');
          const day = String(rawValue.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
        return rawValue;
      },
      set(value) {
        // 🔥 GARANTIR QUE A DATA SEJA ARMAZENADA COMO STRING LITERAL
        if (value) {
          // Se for um objeto Date, converter para YYYY-MM-DD
          if (value instanceof Date) {
            const year = value.getFullYear();
            const month = String(value.getMonth() + 1).padStart(2, '0');
            const day = String(value.getDate()).padStart(2, '0');
            this.setDataValue('date', `${year}-${month}-${day}`);
            return;
          }
          // Se já for string, garantir formato YYYY-MM-DD
          if (typeof value === 'string') {
            // Verificar se está no formato correto
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
              this.setDataValue('date', value);
              return;
            }
            // Tentar converter
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              this.setDataValue('date', `${year}-${month}-${day}`);
              return;
            }
          }
        }
        this.setDataValue('date', value);
      }
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
    // 🔥 CONFIGURAÇÃO DE TIMEZONE PARA O MODELO
    timezone: 'America/Sao_Paulo',
    // 🔥 HOOKS PARA GARANTIR TIMEZONE
    hooks: {
      beforeValidate: (appointment) => {
        // 🔥 GARANTIR QUE A DATA ESTEJA NO FORMATO CORRETO
        if (appointment.date && typeof appointment.date === 'string') {
          // Já está no formato YYYY-MM-DD
          // Não fazer nada
        }
      },
      beforeSave: (appointment) => {
        // 🔥 SE A DATA FOR UM OBJETO DATE, CONVERTER
        if (appointment.date && typeof appointment.date === 'object') {
          const date = appointment.date;
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          appointment.date = `${year}-${month}-${day}`;
        }
      }
    }
  });

  // 🔥 ASSOCIAÇÕES
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