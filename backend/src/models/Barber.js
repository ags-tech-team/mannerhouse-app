const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const Barber = sequelize.define('Barber', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      field: 'user_id',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    serviceCommissionRate: {
      type: DataTypes.FLOAT,
      defaultValue: 0.50,
      validate: {
        min: 0,
        max: 1,
      },
      field: 'service_commission_rate',
    },
    productCommissionRate: {
      type: DataTypes.FLOAT,
      defaultValue: 0.50,
      validate: {
        min: 0,
        max: 1,
      },
      field: 'product_commission_rate',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
    },
    // 🔥 CAMPO DE HORÁRIOS
    schedule: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: true,
      field: 'schedule',
    },
  }, {
    tableName: 'barbers',
    underscored: true,
    hooks: {
      beforeCreate: async (barber) => {
        if (barber.password) {
          barber.password = await bcrypt.hash(barber.password, 10);
        }
      },
      beforeUpdate: async (barber) => {
        if (barber.changed('password')) {
          barber.password = await bcrypt.hash(barber.password, 10);
        }
      },
    },
  });

  Barber.prototype.comparePassword = async function(password) {
    return await bcrypt.compare(password, this.password);
  };

  return Barber;
};