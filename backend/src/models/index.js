const sequelize = require('../config/database');

const User = require('./User');
const Barber = require('./Barber');
const Client = require('./Client');
const Product = require('./Product');
const Appointment = require('./Appointment');
const CashRegister = require('./CashRegister');
const Revenue = require('./Revenue');
const Expense = require('./Expense');
const Sale = require('./Sale');

const syncDatabase = async () => {
  try {
    // 🔥 NÃO USAR alter: true ou force: true
    // Apenas verifica se as tabelas existem, sem alterar
    await sequelize.sync({ alter: false });
    console.log('📦 Banco de dados verificado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao verificar banco de dados:', error);
    throw error;
  }
};

module.exports = {
  User,
  Barber,
  Client,
  Product,
  Appointment,
  CashRegister,
  Revenue,
  Expense,
  Sale,
  sequelize,
  syncDatabase,
};