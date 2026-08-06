const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const CashRegister = require('./CashRegister');

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
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  total: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: 0,
    },
  },
  commissions: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    validate: {
      min: 0,
    },
  },
  servicesCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
    },
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
}, {
  tableName: 'revenues',
  underscored: true,
});

Revenue.belongsTo(CashRegister, { foreignKey: 'cashRegisterId' });
CashRegister.hasMany(Revenue, { foreignKey: 'cashRegisterId' });

module.exports = Revenue;