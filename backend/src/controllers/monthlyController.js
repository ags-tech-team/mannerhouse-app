const { Client, MonthlyPayment, Revenue, CashRegister } = require('../models');
const { Op } = require('sequelize');
const { findOrCreateClient } = require('../services/clientService');

// LISTAR TODOS OS CLIENTES MENSALISTAS
const getMonthlyClients = async (req, res) => {
  try {
    const clients = await Client.findAll({
      where: { isMonthly: true, isActive: true },
      include: [
        {
          model: MonthlyPayment,
          as: 'MonthlyPayments', // 🔥 CORRIGIDO: 'payments' -> 'MonthlyPayments'
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
    
    let client = await Client.findOne({
      where: { phone: phone.trim() }
    });
    
    if (client) {
      await MonthlyPayment.destroy({
        where: { clientId: client.id }
      });
      
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

// ATUALIZAR CLIENTE PARA MENSALISTA
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

// CONFIRMAR PAGAMENTO
const confirmMonthlyPayment = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { month, amount, notes } = req.body;
    
    const client = await Client.findByPk(clientId);
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    const today = new Date().toISOString().split('T')[0];
    const cashRegister = await CashRegister.findOne({
      where: {
        date: today,
        isOpen: true,
      }
    });
    
    if (!cashRegister) {
      return res.status(400).json({ 
        error: '⚠️ Caixa fechado! Abra o caixa antes de confirmar o pagamento.' 
      });
    }
    
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
    
    const payment = await MonthlyPayment.create({
      clientId,
      month,
      amount: amount || client.monthlyFee || 0,
      paid: true,
      paidAt: new Date(),
      notes: notes || `Pagamento mensalidade - ${month}`,
    });
    
    console.log('✅ Pagamento criado:', payment.toJSON());
    
    const revenue = await Revenue.create({
      cashRegisterId: cashRegister.id,
      barberId: null,
      date: today,
      total: payment.amount,
      commissions: 0,
      servicesCount: 1,
      initialCash: cashRegister.initialCash || 0,
      finalCash: payment.amount,
    });
    
    console.log('✅ Faturamento criado:', revenue.toJSON());
    
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

// BUSCAR HISTÓRICO DE PAGAMENTOS
const getPaymentHistory = async (req, res) => {
  try {
    const { clientId } = req.params;
    
    const payments = await MonthlyPayment.findAll({
      where: { clientId },
      include: [
        { 
          model: Client,
          as: 'client',
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

// BUSCAR PAGAMENTOS DO MÊS
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
          as: 'client',
          attributes: ['id', 'name', 'phone'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
    });
    
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

// 🔥 DELETAR PAGAMENTO (CORRIGIDO)
const removePayment = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payment = await MonthlyPayment.findByPk(id);
    if (!payment) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }
    
    // 🔥 BUSCAR O REVENUE ASSOCIADO
    const today = new Date().toISOString().split('T')[0];
    const revenue = await Revenue.findOne({
      where: {
        date: today,
        total: payment.amount,
        commissions: 0,
        servicesCount: 1,
      }
    });
    
    // 🔥 REMOVER DO CAIXA
    const cashRegister = await CashRegister.findOne({
      where: {
        date: today,
        isOpen: true,
      }
    });
    
    if (cashRegister) {
      const services = cashRegister.services || [];
      const updatedServices = services.filter(s => s.id !== payment.id);
      
      const totalRevenue = updatedServices.reduce((sum, s) => sum + (s.price || 0), 0);
      const totalCommissions = updatedServices.reduce((sum, s) => sum + (s.commission || 0), 0);
      
      await cashRegister.update({
        services: updatedServices,
        totalRevenue: totalRevenue,
        totalCommissions: totalCommissions,
        servicesCount: updatedServices.length
      });
      
      console.log(`🗑️ Pagamento ${id} removido do caixa`);
    }
    
    // 🔥 DELETAR REVENUE
    if (revenue) {
      await revenue.destroy();
      console.log(`🗑️ Revenue ${revenue.id} removido`);
    }
    
    // 🔥 DELETAR PAGAMENTO
    await payment.destroy();
    console.log(`🗑️ Pagamento ${id} removido`);
    
    res.json({ 
      message: 'Pagamento excluído com sucesso! O faturamento foi atualizado.',
      paymentId: id
    });
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
