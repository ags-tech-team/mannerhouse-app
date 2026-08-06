const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Expense = sequelize.define('Expense', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM('agua', 'luz', 'internet', 'aluguel', 'salario', 'produtos', 'manutencao', 'outros'),
    allowNull: false,
  },
  value: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: 0,
    },
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  paymentMethod: {
    type: DataTypes.ENUM('dinheiro', 'cartao', 'pix', 'debito'),
    allowNull: false,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  receipt: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

module.exports = Expense;