const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

// 🔥 CONFIGURAR TIMEZONE GLOBAL NOS MODELOS
const modelOptions = {
  timestamps: true,
  underscored: true,
  timezone: 'America/Sao_Paulo',
};

// Carregar modelos com as opções configuradas
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

// 🔥 ===== DEFINIÇÃO DE ASSOCIAÇÕES =====

// Barber -> User
Barber.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasOne(Barber, { foreignKey: 'userId', as: 'barber' });

// Client -> Barber
Client.belongsTo(Barber, { foreignKey: 'barberId', as: 'barber' });
Barber.hasMany(Client, { foreignKey: 'barberId', as: 'clients' });

// Appointment -> Barber e Client
Appointment.belongsTo(Barber, { foreignKey: 'barberId', as: 'barber' });
Appointment.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });
Barber.hasMany(Appointment, { foreignKey: 'barberId', as: 'appointments' });
Client.hasMany(Appointment, { foreignKey: 'clientId', as: 'appointments' });

// Sale -> Barber, Client, Product
Sale.belongsTo(Barber, { foreignKey: 'barberId', as: 'barber' });
Sale.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });
Sale.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Barber.hasMany(Sale, { foreignKey: 'barberId', as: 'sales' });
Client.hasMany(Sale, { foreignKey: 'clientId', as: 'sales' });
Product.hasMany(Sale, { foreignKey: 'productId', as: 'sales' });

// CashRegister -> User e Barber (NOVO)
CashRegister.belongsTo(User, { foreignKey: 'userId', as: 'user' });
CashRegister.belongsTo(Barber, { foreignKey: 'barberId', as: 'barber' }); // 🔥 ADICIONADO
User.hasMany(CashRegister, { foreignKey: 'userId', as: 'cashRegisters' });
Barber.hasMany(CashRegister, { foreignKey: 'barberId', as: 'cashRegisters' }); // 🔥 ADICIONADO

// Revenue -> CashRegister e Barber
Revenue.belongsTo(CashRegister, { foreignKey: 'cashRegisterId', as: 'cashRegister' });
Revenue.belongsTo(Barber, { foreignKey: 'barberId', as: 'barber' });
CashRegister.hasMany(Revenue, { foreignKey: 'cashRegisterId', as: 'revenues' });
Barber.hasMany(Revenue, { foreignKey: 'barberId', as: 'revenues' });

// MonthlyPayment -> Client
MonthlyPayment.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });
Client.hasMany(MonthlyPayment, { foreignKey: 'clientId', as: 'MonthlyPayments' });

// 🔥 EXPOSER MODELOS INDIVIDUALMENTE
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

// 🔥 FUNÇÃO PARA SYNC (SE NECESSÁRIO)
const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('📊 Conexão com banco estabelecida');
    console.log('🕐 Timezone configurado para: America/Sao_Paulo');
    
    try {
      const [results] = await sequelize.query('SELECT NOW() as current_time');
      console.log('🕐 Hora do banco:', results[0]?.current_time || 'N/A');
    } catch (error) {
      console.warn('⚠️ Não foi possível testar timezone do banco:', error.message);
    }
    
    console.log('📦 Banco de dados pronto (migrations gerenciam a estrutura)');
  } catch (error) {
    console.error('❌ Erro ao conectar banco:', error);
    throw error;
  }
};

// 🔥 EXPORTAR TUDO
module.exports = {
  ...models,
  sequelize,
  syncDatabase,
};