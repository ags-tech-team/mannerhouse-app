const { CashRegister, User, Revenue, Barber } = require('../models');
const { Op } = require('sequelize');

const getToday = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    console.log('🔍 Buscando caixa do dia:', { userId: req.userId, date: today });
    
    const cashRegister = await CashRegister.findOne({
      where: {
        date: today,
        userId: req.userId,
      },
      order: [['createdAt', 'DESC']],
    });
    
    if (!cashRegister) {
      return res.json({
        id: null,
        date: today,
        isOpen: false,
        openingTime: null,
        closingTime: null,
        initialCash: 0,
        finalCash: null,
        services: [],
        totalRevenue: 0,
        totalCommissions: 0,
        servicesCount: 0,
      });
    }
    
    res.json(cashRegister);
  } catch (error) {
    console.error('❌ Erro ao buscar caixa do dia:', error);
    res.status(500).json({ error: 'Erro ao buscar caixa do dia' });
  }
};

const openCashRegister = async (req, res) => {
  try {
    const { initialCash } = req.body;
    const today = new Date().toISOString().split('T')[0];
    
    console.log('🔓 ===== ABRINDO CAIXA =====');
    console.log('📌 userId:', req.userId);
    console.log('📌 date:', today);
    console.log('📌 initialCash:', initialCash);
    
    // Verificar se já existe caixa aberto hoje
    const existingOpen = await CashRegister.findOne({
      where: {
        date: today,
        userId: req.userId,
        isOpen: true,
      },
    });
    
    if (existingOpen) {
      console.log('⚠️ Já existe um caixa aberto hoje');
      return res.status(400).json({ error: 'Já existe um caixa aberto hoje' });
    }
    
    // Verificar se já existe um caixa fechado hoje (para reabrir)
    const existingClosed = await CashRegister.findOne({
      where: {
        date: today,
        userId: req.userId,
        isOpen: false,
      },
      order: [['createdAt', 'DESC']],
    });
    
    if (existingClosed) {
      console.log('🔄 Caixa fechado encontrado. Reabrindo...');
      
      await existingClosed.update({
        isOpen: true,
        openingTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        initialCash: parseFloat(initialCash) || 0,
        finalCash: null,
        services: [],
        totalRevenue: 0,
        totalCommissions: 0,
        servicesCount: 0,
        closingTime: null,
      });
      
      console.log('✅ Caixa reaberto com sucesso');
      return res.json(existingClosed);
    }
    
    // Criar novo caixa
    const cashRegister = await CashRegister.create({
      userId: req.userId,
      date: today,
      isOpen: true,
      openingTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      initialCash: parseFloat(initialCash) || 0,
      services: [],
      totalRevenue: 0,
      totalCommissions: 0,
      servicesCount: 0,
    });
    
    console.log('✅ CAIXA CRIADO COM SUCESSO');
    res.status(201).json(cashRegister);
  } catch (error) {
    console.error('❌ Erro ao abrir caixa:', error);
    res.status(500).json({ error: 'Erro ao abrir caixa' });
  }
};

const closeCashRegister = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const cashRegister = await CashRegister.findOne({
      where: {
        date: today,
        userId: req.userId,
        isOpen: true,
      },
    });
    
    if (!cashRegister) {
      return res.status(404).json({ error: 'Nenhum caixa aberto encontrado' });
    }
    
    const services = cashRegister.services || [];
    const totalRevenue = services.reduce((sum, s) => sum + (s.price || 0), 0);
    const totalCommissions = services.reduce((sum, s) => sum + (s.commission || 0), 0);
    const servicesCount = services.length;
    const finalCash = cashRegister.initialCash + totalRevenue;
    
    await cashRegister.update({
      isOpen: false,
      closingTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      finalCash,
      totalRevenue,
      totalCommissions,
      servicesCount,
    });
    
    // Criar registro de faturamento
    await Revenue.create({
      cashRegisterId: cashRegister.id,
      date: today,
      total: totalRevenue,
      commissions: totalCommissions,
      servicesCount,
      initialCash: cashRegister.initialCash,
      finalCash,
    });
    
    res.json(cashRegister);
  } catch (error) {
    console.error('❌ Erro ao fechar caixa:', error);
    res.status(500).json({ error: 'Erro ao fechar caixa' });
  }
};

// 🔥 FUNÇÃO addService - PARA ADICIONAR SERVIÇO AO CAIXA
const addService = async (req, res) => {
  try {
    const { 
      client, 
      barberId, 
      service, 
      serviceId, 
      price, 
      paymentMethod,
      date,
      time,
      phone
    } = req.body;
    
    const today = date || new Date().toISOString().split('T')[0];
    
    console.log('📦 Adicionando serviço ao caixa:');
    console.log('  client:', client);
    console.log('  barberId:', barberId);
    console.log('  service:', service);
    console.log('  price:', price);
    
    // Buscar o barbeiro
    let barber = null;
    let barberName = 'Barbeiro';
    
    if (barberId) {
      barber = await Barber.findByPk(barberId);
      if (barber) {
        barberName = barber.name;
      }
    }
    
    // Buscar o caixa
    const cashRegister = await CashRegister.findOne({
      where: {
        date: today,
        userId: req.userId,
        isOpen: true,
      },
    });
    
    if (!cashRegister) {
      return res.status(404).json({ error: 'Nenhum caixa aberto encontrado' });
    }
    
    // Calcular comissão
    const commissionRate = barber ? barber.serviceCommissionRate : 0.20;
    const commission = price * commissionRate;
    
    // Criar o serviço
    const newService = {
      id: Date.now().toString(),
      client,
      barberId: barber ? barber.id : barberId,
      barberName: barberName,
      service: service || 'Serviço',
      serviceId: serviceId || '',
      price: price || 0,
      commission,
      paymentMethod: paymentMethod || 'dinheiro',
      time: time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      date: today,
      phone: phone || '',
    };
    
    const services = [...(cashRegister.services || []), newService];
    
    await cashRegister.update({
      services,
      totalRevenue: (cashRegister.totalRevenue || 0) + price,
      totalCommissions: (cashRegister.totalCommissions || 0) + commission,
      servicesCount: services.length,
    });
    
    res.status(201).json(newService);
  } catch (error) {
    console.error('❌ Erro ao adicionar serviço:', error);
    res.status(500).json({ error: 'Erro ao adicionar serviço' });
  }
};

// 🔥 FUNÇÃO removeService - PARA REMOVER SERVIÇO DO CAIXA
const removeService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const today = new Date().toISOString().split('T')[0];
    
    const cashRegister = await CashRegister.findOne({
      where: {
        date: today,
        userId: req.userId,
        isOpen: true,
      },
    });
    
    if (!cashRegister) {
      return res.status(404).json({ error: 'Nenhum caixa aberto encontrado' });
    }
    
    const services = (cashRegister.services || []).filter(s => s.id !== serviceId);
    
    await cashRegister.update({ services });
    res.status(204).send();
  } catch (error) {
    console.error('❌ Erro ao remover serviço:', error);
    res.status(500).json({ error: 'Erro ao remover serviço' });
  }
};

// 🔥 FUNÇÃO updateServices - PARA ATUALIZAR LISTA COMPLETA DE SERVIÇOS
const updateServices = async (req, res) => {
  try {
    const { services } = req.body;
    const today = new Date().toISOString().split('T')[0];
    
    const cashRegister = await CashRegister.findOne({
      where: {
        date: today,
        userId: req.userId,
        isOpen: true,
      },
    });
    
    if (!cashRegister) {
      return res.status(404).json({ error: 'Nenhum caixa aberto encontrado' });
    }
    
    // Calcular totais
    const totalRevenue = services.reduce((sum, s) => sum + (s.valor || 0), 0);
    const totalCommissions = services.reduce((sum, s) => sum + (s.comissao || 0), 0);
    const servicesCount = services.length;
    
    await cashRegister.update({
      services,
      totalRevenue,
      totalCommissions,
      servicesCount,
    });
    
    res.json(cashRegister);
  } catch (error) {
    console.error('❌ Erro ao atualizar serviços:', error);
    res.status(500).json({ error: 'Erro ao atualizar serviços' });
  }
};

const getHistory = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {
      userId: req.userId,
    };
    
    if (startDate && endDate) {
      where.date = {
        [Op.between]: [startDate, endDate],
      };
    }
    
    const registers = await CashRegister.findAll({
      where,
      order: [['date', 'DESC']],
    });
    
    res.json(registers);
  } catch (error) {
    console.error('❌ Erro ao buscar histórico:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
};

module.exports = {
  getToday,
  openCashRegister,
  closeCashRegister,
  addService,
  removeService,
  updateServices,
  getHistory,
};