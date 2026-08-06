const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

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
      model: 'Users',
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
  // 🔥 NOVO: Comissão para serviços (em %)
  serviceCommissionRate: {
    type: DataTypes.FLOAT,
    defaultValue: 0.50, // 50%
    validate: {
      min: 0,
      max: 1,
    },
    field: 'service_commission_rate',
  },
  // 🔥 NOVO: Comissão para produtos (em %)
  productCommissionRate: {
    type: DataTypes.FLOAT,
    defaultValue: 0.50, // 50% do lucro
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
}, {
  tableName: 'barbers',
  underscored: true,
  hooks: {
    beforeCreate: async (barber) => {
      if (barber.password) {
        const bcrypt = require('bcryptjs');
        barber.password = await bcrypt.hash(barber.password, 10);
      }
    },
    beforeUpdate: async (barber) => {
      if (barber.changed('password')) {
        const bcrypt = require('bcryptjs');
        barber.password = await bcrypt.hash(barber.password, 10);
      }
    },
  },
});

Barber.prototype.comparePassword = async function(password) {
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(password, this.password);
};

Barber.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Barber, { foreignKey: 'userId' });

module.exports = Barber;