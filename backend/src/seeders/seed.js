const { sequelize, User, Barber, Client, Product, Appointment, CashRegister, Revenue, Expense, Sale, MonthlyPayment } = require('../models');
const bcrypt = require('bcryptjs');

const seedDatabase = async () => {
  try {
    console.log('🔄 Iniciando seed do banco de dados...');

    // 🔥 DELETAR TODOS OS DADOS (em ordem correta para evitar violação de chave estrangeira)
    console.log('🗑️ Removendo dados existentes...');
    await Appointment.destroy({ where: {}, force: true });
    await Sale.destroy({ where: {}, force: true });
    await MonthlyPayment.destroy({ where: {}, force: true });
    await CashRegister.destroy({ where: {}, force: true });
    await Revenue.destroy({ where: {}, force: true });
    await Expense.destroy({ where: {}, force: true });
    await Product.destroy({ where: {}, force: true });
    await Barber.destroy({ where: {}, force: true });
    await Client.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    console.log('✅ Dados removidos com sucesso!');

    // 🔥 CRIAR USUÁRIO ADMIN
    const adminPassword = await bcrypt.hash('adminManner2026', 10);
    const admin = await User.create({
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Administrador Manner',
      email: 'mannerhausbarber@gmail.com',
      password: adminPassword,
      role: 'admin',
      isActive: true,
    });
    console.log('✅ Admin criado:', admin.email);

    // 🔥 CRIAR USUÁRIO BARBEIRO
    const barberUserPassword = await bcrypt.hash('userManner2026', 10);
    const barberUser = await User.create({
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Barbearia Manner',
      email: 'barbearia@mannerhouse.com',
      password: barberUserPassword,
      role: 'barber',
      isActive: true,
    });
    console.log('✅ Usuário barbeiro criado:', barberUser.email);

    // 🔥 CRIAR BARBEIRO (associado ao usuário barbeiro)
    const barber = await Barber.create({
      id: '33333333-3333-3333-3333-333333333333',
      userId: barberUser.id,
      name: 'Barbeiro Manner',
      email: 'barbearia@mannerhouse.com',
      phone: '(48) 99999-9999',
      username: 'mannerbarber',
      password: barberUserPassword,
      serviceCommissionRate: 0.50,
      productCommissionRate: 0.50,
      isActive: true,
    });
    console.log('✅ Barbeiro criado:', barber.name);

    // 🔥 CRIAR ALGUNS CLIENTES EXEMPLO
    const client1 = await Client.create({
      id: '44444444-4444-4444-4444-444444444444',
      name: 'Cliente Exemplo 1',
      phone: '(48) 98888-8888',
      isMonthly: false,
      monthlyFee: 0,
      isActive: true,
    });
    console.log('✅ Cliente exemplo 1 criado');

    const client2 = await Client.create({
      id: '55555555-5555-5555-5555-555555555555',
      name: 'Cliente Exemplo 2',
      phone: '(48) 97777-7777',
      isMonthly: true,
      monthlyFee: 150.00,
      isActive: true,
    });
    console.log('✅ Cliente exemplo 2 criado (mensalista)');

    // 🔥 CRIAR ALGUNS PRODUTOS EXEMPLO
    await Product.create({
      id: '66666666-6666-6666-6666-666666666666',
      name: 'Shampoo Profissional',
      description: 'Shampoo para cabelos masculinos',
      price: 45.00,
      costPrice: 22.50,
      stock: 10,
      category: 'higiene',
      isActive: true,
    });
    console.log('✅ Produto exemplo criado');

    console.log('\n✅ ===== SEED CONCLUÍDO COM SUCESSO! =====');
    console.log('📋 Credenciais:');
    console.log('   👤 Admin: mannerhausbarber@gmail.com / adminManner2026');
    console.log('   👤 Barbeiro: barbearia@mannerhouse.com / userManner2026');
    console.log('===========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao executar seed:', error);
    process.exit(1);
  }
};

seedDatabase();