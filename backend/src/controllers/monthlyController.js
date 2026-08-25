const { Client, MonthlyPayment, Revenue, CashRegister } = require('../models');
const { Op } = require('sequelize');
const { findOrCreateClient } = require('../services/clientService');

// 🔥 LISTAR TODOS OS CLIENTES MENSALISTAS
const getMonthlyClients = async (req, res) => {
  try {
    const clients = await Client.findAll({
      where: { isMonthly: true, isActive: true },
      include: [
        {
          model: MonthlyPayment,
          as: 'payments',  // 🔥 ADICIONAR O 'as'
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
    const { name, phone, monthlyFee, paymentMethod, notes } = req.body;
    
    console.log('📝 Criando mensalista:', { name, phone, monthlyFee });
    
    // 🔥 VERIFICAR SE O CLIENTE JÁ EXISTE
    let client = await Client.findOne({
      where: { phone: phone.trim() }
    });
    
    if (client) {
      // 🔥 REMOVER PAGAMENTOS ANTIGOS
      await MonthlyPayment.destroy({
        where: { clientId: client.id }
      });
      
      // Atualizar cliente
      await client.update({
        isMonthly: true,
        monthlyFee: monthlyFee || client.monthlyFee || 0,
        isActive: true,
      });
      
      console.log('✅ Cliente reativado e pagamentos antigos removidos');
      
      return res.status(200).json({
        client,
        created: false,
        message: `Cliente reativado como mensalista! Aguardando primeiro pagamento.`,
      });
    }
    
    // 🔥 CRIAR NOVO CLIENTE (SEM PAGAMENTO)
    client = await Client.create({
      name: name.trim(),
      phone: phone.trim(),
      isMonthly: true,
      monthlyFee: monthlyFee || 0,
      isActive: true,
    });
    
    console.log('✅ Mensalista criado sem pagamento:', client.id);
    
    res.status(201).json({
      client,
      created: true,
      message: 'Mensalista criado com sucesso! Aguardando primeiro pagamento.',
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

const confirmMonthlyPayment = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { month, amount, notes } = req.body;
    
    const client = await Client.findByPk(clientId);
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    // 🔥 BUSCAR CAIXA ABERTO DO DIA
    const today = new Date().toISOString().split('T')[0];
    const cashRegister = await CashRegister.findOne({
      where: {
        date: today,
        isOpen: true,
      }
    });
    
    // 🔥 VERIFICAR SE O CAIXA ESTÁ ABERTO - ANTES DE CONTINUAR
    if (!cashRegister) {
      return res.status(400).json({ 
        error: '⚠️ Caixa fechado! Abra o caixa antes de confirmar o pagamento.' 
      });
    }
    
    // Verificar se já existe pagamento
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
    
    console.log('✅ Pagamento criado:', payment.toJSON());
    
    // Criar faturamento vinculado ao caixa
    const revenue = await Revenue.create({
      cashRegisterId: cashRegister.id,
      date: today,
      total: payment.amount,
      commissions: 0,
      servicesCount: 1,
      initialCash: cashRegister.initialCash,
      finalCash: payment.amount,
    });
    
    console.log('✅ Faturamento criado:', revenue.toJSON());
    
    // Atualizar caixa com o valor
    const newTotal = (cashRegister.totalRevenue || 0) + payment.amount;
    await cashRegister.update({
      totalRevenue: newTotal,
      finalCash: newTotal,
      servicesCount: (cashRegister.servicesCount || 0) + 1,
    });
    
    res.json({
      payment,
      revenue,
      message: 'Pagamento confirmado e adicionado ao caixa!'
    });
  } catch (error) {
    console.error('❌ Erro ao confirmar pagamento:', error);
    res.status(500).json({ error: error.message || 'Erro ao confirmar pagamento' });
  }
};


const getPaymentHistory = async (req, res) => {
  try {
    const { clientId } = req.params;
    
    const payments = await MonthlyPayment.findAll({
      where: { clientId },
      include: [
        { 
          model: Client,
          as: 'client',  // 🔥 ADICIONAR O 'as'
          attributes: ['id', 'name', 'phone']
        }
      ],
      order: [['month', 'DESC']],
    });
    
    res.json(payments);
  } catch (error) {
    console.error('❌ Erro ao buscar histórico:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
};

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
        { 
          model: Client,
          as: 'client',  // 🔥 ADICIONAR O 'as'
          attributes: ['id', 'name', 'phone'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
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

const removePayment = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payment = await MonthlyPayment.findByPk(id);
    if (!payment) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }
    
    await payment.destroy();
    res.json({ message: 'Pagamento excluído com sucesso!' });
  } catch (error) {
    console.error('❌ Erro ao deletar pagamento:', error);
    res.status(500).json({ error: 'Erro ao deletar pagamento' });
  }
};

module.exports = {
  getMonthlyClients,
  updateMonthlyStatus,
  confirmMonthlyPayment,
  getPaymentHistory,
  getMonthlyPayments,
  createMonthlyClient,
  removePayment
};