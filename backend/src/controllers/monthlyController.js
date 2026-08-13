const { Client, MonthlyPayment, Revenue } = require('../models');
const { Op } = require('sequelize');

// 🔥 LISTAR TODOS OS CLIENTES MENSALISTAS
const getMonthlyClients = async (req, res) => {
  try {
    const clients = await Client.findAll({
      where: { isMonthly: true, isActive: true },
      include: [
        {
          model: MonthlyPayment,
          as: 'MonthlyPayments',
          order: [['month', 'DESC']],
          limit: 12,
        }
      ],
      order: [['name', 'ASC']],
    });
    res.json(clients);
  } catch (error) {
    console.error('❌ Erro ao buscar mensalistas:', error);
    res.status(500).json({ error: 'Erro ao buscar mensalistas' });
  }
};

const createMonthlyClient = async (req, res) => {
  try {
    const { name, phone, monthlyFee, paymentMethod, notes } = req.body; // 🔥 REMOVER email
    
    console.log('📝 Criando mensalista:', { name, phone, monthlyFee, paymentMethod });
    
    // Verificar se telefone já existe
    const existing = await Client.findOne({ where: { phone } });
    if (existing) {
      return res.status(400).json({ error: 'Telefone já cadastrado' });
    }
    
    // 🔥 CRIAR CLIENTE SEM EMAIL
    const client = await Client.create({
      name,
      phone,  // 🔥 SEM EMAIL
      isMonthly: true,
      monthlyFee: monthlyFee || 0,
      isActive: true,
    });
    
    console.log('✅ Cliente criado:', client.toJSON());
    
    // Registrar pagamento inicial
    const currentMonth = new Date().toISOString().slice(0, 7);
    const payment = await MonthlyPayment.create({
      clientId: client.id,
      month: currentMonth,
      amount: monthlyFee || 0,
      paid: true,
      paidAt: new Date(),
      notes: notes || `Pagamento inicial - ${paymentMethod || 'pix'}`,
    });
    
    console.log('✅ Pagamento registrado:', payment.toJSON());
    
    // Criar faturamento
    await Revenue.create({
      cashRegisterId: null,
      date: new Date().toISOString().split('T')[0],
      total: payment.amount,
      commissions: 0,
      servicesCount: 1,
      initialCash: 0,
      finalCash: payment.amount,
    });
    
    res.status(201).json({
      client,
      payment,
      message: 'Mensalista criado com sucesso! Pagamento inicial registrado.'
    });
  } catch (error) {
    console.error('❌ Erro ao criar mensalista:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar mensalista' });
  }
};


// 🔥 ATUALIZAR CLIENTE PARA MENSALISTA
const updateMonthlyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isMonthly, monthlyFee } = req.body;
    
    const client = await Client.findByPk(id);
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    await client.update({ isMonthly, monthlyFee });
    res.json(client);
  } catch (error) {
    console.error('❌ Erro ao atualizar status mensal:', error);
    res.status(500).json({ error: 'Erro ao atualizar status mensal' });
  }
};

// 🔥 CONFIRMAR PAGAMENTO DA MENSALIDADE
const confirmMonthlyPayment = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { month, amount, notes } = req.body;
    
    const client = await Client.findByPk(clientId);
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    // Verificar se já existe pagamento para este mês
    const existing = await MonthlyPayment.findOne({
      where: {
        clientId,
        month,
        paid: true,
      }
    });
    
    if (existing) {
      return res.status(400).json({ error: `Pagamento de ${month} já foi confirmado` });
    }
    
    // Criar registro de pagamento
    const payment = await MonthlyPayment.create({
      clientId,
      month,
      amount: amount || client.monthlyFee || 0,
      paid: true,
      paidAt: new Date(),
      notes: notes || `Pagamento mensalidade - ${month}`,
    });
    
    // 🔥 CRIAR FATURAMENTO
    await Revenue.create({
      cashRegisterId: null,
      date: new Date().toISOString().split('T')[0],
      total: payment.amount,
      commissions: 0, // Mensalidade não tem comissão
      servicesCount: 1,
      initialCash: 0,
      finalCash: payment.amount,
    });
    
    res.json(payment);
  } catch (error) {
    console.error('❌ Erro ao confirmar pagamento:', error);
    res.status(500).json({ error: 'Erro ao confirmar pagamento' });
  }
};

// 🔥 BUSCAR HISTÓRICO DE PAGAMENTOS DE UM CLIENTE
const getPaymentHistory = async (req, res) => {
  try {
    const { clientId } = req.params;
    
    const payments = await MonthlyPayment.findAll({
      where: { clientId },
      order: [['month', 'DESC']],
    });
    
    res.json(payments);
  } catch (error) {
    console.error('❌ Erro ao buscar histórico:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
};

// 🔥 VERIFICAR PAGAMENTOS DO MÊS
const getMonthlyPayments = async (req, res) => {
  try {
    const { month } = req.query;
    const currentMonth = month || new Date().toISOString().slice(0, 7);
    
    const payments = await MonthlyPayment.findAll({
      where: {
        month: currentMonth,
        paid: true,
      },
      include: [
        { model: Client, attributes: ['id', 'name', 'phone'] }
      ],
    });
    
    // Buscar clientes mensalistas que ainda não pagaram este mês
    const paidClientIds = payments.map(p => p.clientId);
    const pendingClients = await Client.findAll({
      where: {
        isMonthly: true,
        isActive: true,
        id: { [Op.notIn]: paidClientIds },
      },
      attributes: ['id', 'name', 'phone', 'monthlyFee'],
    });
    
    res.json({
      payments,
      pending: pendingClients,
      totalPaid: payments.reduce((sum, p) => sum + p.amount, 0),
      totalPending: pendingClients.reduce((sum, c) => sum + (c.monthlyFee || 0), 0),
    });
  } catch (error) {
    console.error('❌ Erro ao buscar pagamentos do mês:', error);
    res.status(500).json({ error: 'Erro ao buscar pagamentos do mês' });
  }
};

module.exports = {
  getMonthlyClients,
  updateMonthlyStatus,
  confirmMonthlyPayment,
  getPaymentHistory,
  getMonthlyPayments,
  createMonthlyClient
};