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

const models = {
  User,
  Barber,
  Client,
  Product,
  Appointment,
  Sale,
  CashRegister,
  Revenue,
  Expense,
};

const syncDatabase = async () => {
  try {
    await User.sync({ alter: true });
    console.log('✅ User table sync');

    await Barber.sync({ alter: true });
    console.log('✅ Barber table sync');

    await Client.sync({ alter: true });
    console.log('✅ Client table sync');

    await Product.sync({ alter: true });
    console.log('✅ Product table sync');

    await Expense.sync({ alter: true });
    console.log('✅ Expense table sync');

    await CashRegister.sync({ alter: true });
    console.log('✅ CashRegister table sync');

    await Appointment.sync({ alter: true });
    console.log('✅ Appointment table sync');

    await Revenue.sync({ alter: true });
    console.log('✅ Revenue table sync');

    await Sale.sync({ alter: true });
    console.log('✅ Sale table sync');

    console.log('📦 Banco de dados sincronizado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao sincronizar banco de dados:', error);
    throw error;
  }
};

module.exports = {
  ...models,
  sequelize,
  syncDatabase,
};