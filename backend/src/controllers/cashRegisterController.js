const { CashRegister, User, Revenue } = require('../models');
const { Op } = require('sequelize');

const getToday = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const cashRegister = await CashRegister.findOne({
      where: {
        date: today,
        userId: req.userId,
      },
    });
    
    if (!cashRegister) {
      return res.json({
        id: null,
        date: today,
        isOpen: false,
        initialCash: 0,
        services: [],
        totalRevenue: 0,
        totalCommissions: 0,
        servicesCount: 0,
      });
    }
    
    res.json(cashRegister);
  } catch (error) {
    console.error('Erro ao buscar caixa do dia:', error);
    res.status(500).json({ error: 'Erro ao buscar caixa do dia' });
  }
};

const openCashRegister = async (req, res) => {
  try {
    const { initialCash } = req.body;
    const today = new Date().toISOString().split('T')[0];
    
    const existing = await CashRegister.findOne({
      where: {
        date: today,
        userId: req.userId,
        isOpen: true,
      },
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Já existe um caixa aberto hoje' });
    }
    
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
    
    res.status(201).json(cashRegister);
  } catch (error) {
    console.error('Erro ao abrir caixa:', error);
    res.status(500).json({ error: 'Erro ao abrir caixa' });
  }
};

const closeCashRegister = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const cashRegister = await CashRegister.findOne({
      where: {
        date: today,
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
    console.error('Erro ao fechar caixa:', error);
    res.status(500).json({ error: 'Erro ao fechar caixa' });
  }
};

const addService = async (req, res) => {
  try {
    const { client, barberId, service, price, paymentMethod } = req.body;
    const today = new Date().toISOString().split('T')[0];
    
    console.log('📦 Adicionando serviço:');
    console.log('  client:', client);
    console.log('  barberId:', barberId);
    console.log('  service:', service);
    console.log('  price:', price);
    
    // 🔥 BUSCAR O BARBEIRO PELO ID ENVIADO DO FRONTEND
    let barber = null;
    let barberName = 'Barbeiro';
    
    if (barberId) {
      barber = await Barber.findByPk(barberId);
      if (barber) {
        barberName = barber.name;
        console.log('✅ Barbeiro encontrado pelo ID:', barberName);
      }
    }
    
    // 🔥 FALLBACK: Se não encontrou pelo ID, buscar pelo userId
    if (!barber) {
      console.log('⚠️ Barbeiro não encontrado pelo ID, buscando por userId...');
      barber = await Barber.findOne({
        where: { userId: req.userId }
      });
      if (barber) {
        barberName = barber.name;
        console.log('✅ Barbeiro encontrado por userId:', barberName);
      }
    }
    
    // 🔥 SE AINDA NÃO ENCONTROU, criar um fallback
    if (!barber) {
      console.log('⚠️ Nenhum barbeiro encontrado, usando fallback');
      barberName = 'Barbeiro';
    }
    
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
    
    // 🔥 CALCULAR COMISSÃO COM A TAXA DO BARBEIRO
    const commissionRate = barber ? barber.serviceCommissionRate : 0.20;
    const commission = price * commissionRate;
    
    console.log('💰 Comissão calculada:', commission, '(taxa:', commissionRate * 100, '%)');
    
    // 🔥 CRIAR O SERVIÇO COM O NOME DO BARBEIRO
    const newService = {
      id: Date.now().toString(),
      client,
      barberId: barber ? barber.id : barberId,
      barberName: barberName, // 🔥 SALVAR O NOME DO BARBEIRO
      service,
      price,
      commission,
      paymentMethod,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
    
    console.log('📦 Novo serviço:', newService);
    
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
    console.error('Erro ao remover serviço:', error);
    res.status(500).json({ error: 'Erro ao remover serviço' });
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
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
};

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
    
    // Calcular totais a partir da lista de serviços
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
    console.error('Erro ao atualizar serviços:', error);
    res.status(500).json({ error: 'Erro ao atualizar serviços' });
  }
};

module.exports = {
  getToday,
  openCashRegister,
  closeCashRegister,
  addService,
  removeService,
  getHistory,
  updateServices,
};