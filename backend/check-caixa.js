const { CashRegister } = require('./src/models');
const sequelize = require('./src/config/database');

const check = async () => {
  try {
    await sequelize.authenticate();
    
    // Buscar todos os caixas
    const registers = await CashRegister.findAll();
    console.log('\n📊 TODOS OS CAIXAS:');
    console.log('=' .repeat(60));
    registers.forEach(r => {
      console.log(`ID: ${r.id}`);
      console.log(`  userId: ${r.userId}`);
      console.log(`  date: ${r.date}`);
      console.log(`  isOpen: ${r.isOpen}`);
      console.log(`  initialCash: ${r.initialCash}`);
      console.log(`  totalRevenue: ${r.totalRevenue}`);
      console.log(`  servicesCount: ${r.servicesCount}`);
      console.log(`  services: ${JSON.stringify(r.services, null, 2)}`);
      console.log('-'.repeat(40));
    });
    
    // Buscar caixa específico
    const cashRegister = await CashRegister.findOne({
      where: {
        id: '8c64769a-4601-43e5-b8d8-01a63b022be1'
      }
    });
    
    if (cashRegister) {
      console.log('\n🔍 CAIXA ESPECÍFICO:');
      console.log('=' .repeat(60));
      console.log(`ID: ${cashRegister.id}`);
      console.log(`userId: ${cashRegister.userId}`);
      console.log(`isOpen: ${cashRegister.isOpen}`);
      console.log(`services: ${JSON.stringify(cashRegister.services, null, 2)}`);
      console.log(`totalRevenue: ${cashRegister.totalRevenue}`);
      console.log(`servicesCount: ${cashRegister.servicesCount}`);
    } else {
      console.log('\n❌ Caixa não encontrado!');
    }
    
    await sequelize.close();
  } catch (error) {
    console.error('Erro:', error);
  }
};

check();