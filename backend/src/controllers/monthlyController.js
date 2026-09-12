const { Client, MonthlyPayment, Revenue, CashRegister, Barber } = require('../models');
const { Op } = require('sequelize');
const dateHelper = require('../utils/dateHelper');

// ============================================================
// GET MONTHLY CLIENTS
// ============================================================
const getMonthlyClients = async (req, res) => {
  try {
    const { month } = req.query;
    const currentMonth = month || new Date().toISOString().slice(0, 7);
    
    console.log('📅 Mês solicitado:', currentMonth);
    
    const clients = await Client.findAll({
      where: { isMonthly: true, isActive: true },
      include: [
        {
          model: MonthlyPayment,
          as: 'MonthlyPayments',
          where: { month: currentMonth },
          required: false,
          order: [['month', 'DESC']],
          limit: 12,
        },
        {
          model: Barber,
          as: 'barber',
          attributes: ['id', 'name', 'serviceCommissionRate']
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

// ============================================================
// CRIAR MENSALISTA
// ============================================================
const createMonthlyClient = async (req, res) => {
  try {
    const { name, phone, monthlyFee, barberId, paymentMethod, notes } = req.body;
    
    console.log('📝 Criando mensalista:', { name, phone, monthlyFee, barberId });
    
    if (barberId) {
      const barber = await Barber.findByPk(barberId);
      if (!barber) {
        return res.status(404).json({ error: 'Barbeiro não encontrado' });
      }
    }
    
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
        barberId: barberId || client.barberId,
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
      barberId: barberId || null,
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

// ============================================================
// UPDATE MONTHLY STATUS
// ============================================================
const updateMonthlyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isMonthly, monthlyFee, barberId } = req.body;
    
    const client = await Client.findByPk(id);
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    if (barberId) {
      const barber = await Barber.findByPk(barberId);
      if (!barber) {
        return res.status(404).json({ error: 'Barbeiro não encontrado' });
      }
    }
    
    await client.update({ 
      isMonthly: isMonthly !== undefined ? isMonthly : client.isMonthly,
      monthlyFee: monthlyFee !== undefined ? monthlyFee : client.monthlyFee,
      barberId: barberId !== undefined ? barberId : client.barberId,
    });
    
    const updatedClient = await Client.findByPk(id, {
      include: [
        {
          model: Barber,
          as: 'barber',
          attributes: ['id', 'name', 'serviceCommissionRate']
        }
      ]
    });
    
    res.json(updatedClient);
  } catch (error) {
    console.error('❌ Erro ao atualizar status mensal:', error);
    res.status(500).json({ error: 'Erro ao atualizar status mensal' });
  }
};

// ============================================================
// CONFIRMAR PAGAMENTO
// ============================================================
const confirmMonthlyPayment = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { month, amount, notes } = req.body;
    
    const client = await Client.findByPk(clientId, {
      include: [
        {
          model: Barber,
          as: 'barber',
          attributes: ['id', 'name', 'serviceCommissionRate']
        }
      ]
    });
    
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    if (!client.barberId || !client.barber) {
      return res.status(400).json({ 
        error: '⚠️ Cliente não está vinculado a um barbeiro! Defina um barbeiro para este cliente.' 
      });
    }
    
    const today = dateHelper.getTodayLocal();
    
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
    
    const paymentAmount = amount || client.monthlyFee || 0;
    const commissionRate = client.barber.serviceCommissionRate || 0.5;
    const commission = paymentAmount * commissionRate;
    
    const payment = await MonthlyPayment.create({
      clientId,
      month,
      amount: paymentAmount,
      paid: true,
      paidAt: new Date(),
      notes: notes || `Pagamento mensalidade - ${month}`,
    });
    
    console.log('✅ Pagamento criado:', payment.toJSON());
    console.log(`   Comissão do barbeiro ${client.barber.name}: R$ ${commission.toFixed(2)} (${commissionRate * 100}%)`);
    
    res.json({
      payment,
      commission,
      commissionRate: commissionRate * 100,
      barberName: client.barber.name,
      message: `Pagamento confirmado! Comissão de ${commissionRate * 100}% para ${client.barber.name}: R$ ${commission.toFixed(2)}`
    });
  } catch (error) {
    console.error('❌ Erro ao confirmar pagamento:', error);
    res.status(500).json({ error: error.message || 'Erro ao confirmar pagamento' });
  }
};

// ============================================================
// GET PAYMENT HISTORY
// ============================================================
const getPaymentHistory = async (req, res) => {
  try {
    const { clientId } = req.params;
    
    const payments = await MonthlyPayment.findAll({
      where: { clientId },
      include: [
        { 
          model: Client,
          as: 'client',
          attributes: ['id', 'name', 'phone', 'barberId'],
          include: [
            {
              model: Barber,
              as: 'barber',
              attributes: ['id', 'name']
            }
          ]
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

// ============================================================
// GET MONTHLY PAYMENTS
// ============================================================
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
          attributes: ['id', 'name', 'phone', 'barberId'],
          include: [
            {
              model: Barber,
              as: 'barber',
              attributes: ['id', 'name']
            }
          ],
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
      include: [
        {
          model: Barber,
          as: 'barber',
          attributes: ['id', 'name']
        }
      ],
      attributes: ['id', 'name', 'phone', 'monthlyFee', 'barberId'],
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

// ============================================================
// DELETAR PAGAMENTO
// ============================================================
const removePayment = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payment = await MonthlyPayment.findByPk(id);
    if (!payment) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }
    
    const today = new Date().toISOString().split('T')[0];
    const revenue = await Revenue.findOne({
      where: {
        date: today,
        total: payment.amount,
        servicesCount: 1,
      }
    });
    
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
    
    if (revenue) {
      await revenue.destroy();
      console.log(`🗑️ Revenue ${revenue.id} removido`);
    }
    
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

// ============================================================
// 🔥 ATUALIZAR PAGAMENTO (NOVO)
// ============================================================
const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, notes } = req.body;

    const payment = await MonthlyPayment.findByPk(id);
    if (!payment) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    const updateData = {};

    if (amount !== undefined) {
      const parsed = parseFloat(amount);
      if (isNaN(parsed) || parsed < 0) {
        return res.status(400).json({ error: 'Valor inválido' });
      }
      updateData.amount = parsed;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    await payment.update(updateData);

    // 🔥 Sincronizar com o Revenue, se existir
    const revenue = await Revenue.findOne({
      where: {
        date: payment.paidAt ? new Date(payment.paidAt).toISOString().split('T')[0] : null,
        total: payment.amount,
        servicesCount: 1,
      }
    });

    console.log('✅ Pagamento atualizado:', payment.id);
    res.json(payment);
  } catch (error) {
    console.error('❌ Erro ao atualizar pagamento:', error);
    res.status(500).json({ error: 'Erro ao atualizar pagamento' });
  }
};

// ============================================================
// EXPORTS
// ============================================================
module.exports = {
  getMonthlyClients,
  updateMonthlyStatus,
  confirmMonthlyPayment,
  getPaymentHistory,
  getMonthlyPayments,
  createMonthlyClient,
  removePayment,
  updatePayment, // 🔥 NOVO
};