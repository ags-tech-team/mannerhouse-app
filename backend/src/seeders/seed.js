const bcrypt = require('bcryptjs');
const { User, Barber, Client, Product } = require('../models');
const sequelize = require('../config/database');

const seed = async () => {
  try {
    await sequelize.sync({ force: true });
    
    
    const admin = await User.create({
      name: 'Administrador',
      email: 'admin@mannerhouse.com',
      password: 'admin123',
      role: 'admin',
      isActive: true,
    });
    
    const barber1 = await Barber.create({
      userId: admin.id,
      name: 'Carlos Santos',
      email: 'carlos@mannerhouse.com',
      phone: '(11) 99999-9999',
      username: 'carlos.santos',
      password: 'barber123',
      commissionRate: 0.20,
      isActive: true,
    });
    
    await Client.create({
      name: 'João Silva',
      email: 'joao@email.com',
      phone: '(11) 98888-8888',
      isActive: true,
    });
    
    await Client.create({
      name: 'Pedro Oliveira',
      email: 'pedro@email.com',
      phone: '(11) 97777-7777',
      isActive: true,
    });
    
    await Product.create({
      name: 'Shampoo Profissional',
      description: 'Shampoo para cabelos masculinos',
      price: 45.90,
      stock: 10,
      category: 'higiene',
      isActive: true,
    });
    
    await Product.create({
      name: 'Pomada Modeladora',
      description: 'Pomada para penteados',
      price: 35.90,
      stock: 15,
      category: 'cabelo',
      isActive: true,
    });
    
    await Product.create({
      name: 'Óleo de Barba',
      description: 'Óleo hidratante para barba',
      price: 29.90,
      stock: 8,
      category: 'barba',
      isActive: true,
    });
    
    console.log('✅ Seed executado com sucesso!');
    console.log('📝 Admin:', admin.email, '| Senha: admin123');
    console.log('📝 Barbeiro:', barber1.email, '| Senha: barber123');
    
  } catch (error) {
    console.error('❌ Erro ao executar seed:', error);
  } finally {
    await sequelize.close();
  }
};

seed();