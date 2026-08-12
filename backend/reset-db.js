const { sequelize } = require('./src/models');
const { User, Barber } = require('./src/models');

const reset = async () => {
  try {
    // Desabilitar foreign keys
    await sequelize.query('PRAGMA foreign_keys = OFF;');
    
    // Dropar tabelas
    await sequelize.query('DROP TABLE IF EXISTS revenues;');
    await sequelize.query('DROP TABLE IF EXISTS appointments;');
    await sequelize.query('DROP TABLE IF EXISTS cash_registers;');
    await sequelize.query('DROP TABLE IF EXISTS sales;');
    await sequelize.query('DROP TABLE IF EXISTS barbers;');
    await sequelize.query('DROP TABLE IF EXISTS clients;');
    await sequelize.query('DROP TABLE IF EXISTS products;');
    await sequelize.query('DROP TABLE IF EXISTS expenses;');
    await sequelize.query('DROP TABLE IF EXISTS users;');
    
    await sequelize.query('PRAGMA foreign_keys = ON;');
    
    // Recriar tabelas
    await sequelize.sync();
    
    // Criar usuários
    const admin = await User.create({
      name: 'Administrador',
      email: 'admin@mannerhouse.com',
      password: 'admin123',
      role: 'admin',
      isActive: true,
    });
    console.log('✅ Admin:', admin.email);
    
    const user = await User.create({
      name: 'Barbearia Manner',
      email: 'barbearia@mannerhouse.com',
      password: 'manner123',
      role: 'barber',
      isActive: true,
    });
    
    await Barber.create({
      userId: user.id,
      name: 'Barbearia Manner',
      email: user.email,
      phone: '(11) 99999-9999',
      username: 'barbearia',
      password: 'manner123',
      commissionRate: 0.20,
      serviceCommissionRate: 0.50,
      productCommissionRate: 0.50,
      isActive: true,
    });
    
    console.log('✅ Banco resetado com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
};

reset();