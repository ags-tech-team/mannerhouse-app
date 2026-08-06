const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const CashRegister = sequelize.define('CashRegister', {
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
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  isOpen: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_open',
  },
  openingTime: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'opening_time',
  },
  closingTime: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'closing_time',
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
  services: {
    type: DataTypes.JSON, // 🔥 PODE SER O PROBLEMA
    defaultValue: [],
    get() {
      // 🔥 FORÇAR RETORNAR COMO ARRAY
      const raw = this.getDataValue('services');
      if (!raw) return [];
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw);
        } catch {
          return [];
        }
      }
      return raw;
    },
    set(value) {
      // 🔥 FORÇAR SALVAR COMO JSON STRING
      if (Array.isArray(value)) {
        this.setDataValue('services', JSON.stringify(value));
      } else {
        this.setDataValue('services', value);
      }
    }
  },
  totalRevenue: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    field: 'total_revenue',
  },
  totalCommissions: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    field: 'total_commissions',
  },
  servicesCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'services_count',
  },
}, {
  tableName: 'cash_registers',
  underscored: true,
});

CashRegister.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(CashRegister, { foreignKey: 'userId' });

module.exports = CashRegister;