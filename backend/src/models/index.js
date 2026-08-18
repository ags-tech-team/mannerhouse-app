const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

// 🔥 CARREGAR MODELOS (todos no formato de função)
const User = require('./User')(sequelize, DataTypes);
const Barber = require('./Barber')(sequelize, DataTypes);
const Client = require('./Client')(sequelize, DataTypes);
const Product = require('./Product')(sequelize, DataTypes);
const Appointment = require('./Appointment')(sequelize, DataTypes);
const CashRegister = require('./CashRegister')(sequelize, DataTypes);
const Revenue = require('./Revenue')(sequelize, DataTypes);
const Expense = require('./Expense')(sequelize, DataTypes);
const Sale = require('./Sale')(sequelize, DataTypes);
const MonthlyPayment = require('./MonthlyPayment')(sequelize, DataTypes);

// 🔥 DEFINIÇÃO DE ASSOCIAÇÕES (TUDO AQUI!)
// Barber
Barber.belongsTo(User, { foreignKey: 'userId' });
User.hasOne(Barber, { foreignKey: 'userId' });

// Appointment
Appointment.belongsTo(Barber, { foreignKey: 'barberId' });
Appointment.belongsTo(Client, { foreignKey: 'clientId' });
Barber.hasMany(Appointment, { foreignKey: 'barberId' });
Client.hasMany(Appointment, { foreignKey: 'clientId' });

// CashRegister
CashRegister.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(CashRegister, { foreignKey: 'userId' });

// Revenue
Revenue.belongsTo(Barber, { foreignKey: 'barberId', as: 'barber' });
Revenue.belongsTo(CashRegister, { foreignKey: 'cashRegisterId' });
CashRegister.hasMany(Revenue, { foreignKey: 'cashRegisterId' });

// Sale
Sale.belongsTo(Barber, { foreignKey: 'barberId' });
Sale.belongsTo(Client, { foreignKey: 'clientId' });
Sale.belongsTo(Product, { foreignKey: 'productId' });
Barber.hasMany(Sale, { foreignKey: 'barberId' });
Client.hasMany(Sale, { foreignKey: 'clientId' });
Product.hasMany(Sale, { foreignKey: 'productId' });

// MonthlyPayment
MonthlyPayment.belongsTo(Client, { foreignKey: 'clientId' });
Client.hasMany(MonthlyPayment, { foreignKey: 'clientId' });

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
  MonthlyPayment,
};

const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('📊 Conexão com banco estabelecida');
    console.log('📦 Banco de dados pronto (migrations gerenciam a estrutura)');
  } catch (error) {
    console.error('❌ Erro ao conectar banco:', error);
    throw error;
  }
};

module.exports = {
  ...models,
  sequelize,
  syncDatabase,
};