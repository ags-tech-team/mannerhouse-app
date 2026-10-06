const { Client, MonthlyPayment, Revenue, CashRegister, Barber, Plan } = require('../models');
const { Op } = require('sequelize');
const dateHelper = require('../utils/dateHelper');

// 🔥 HELPER: carrega planos do banco
const getPlanos = async () => {
  const plans = await Plan.findAll({ order: [['displayOrder', 'ASC']] });
  const map = {};
  plans.forEach(p => {
    map[p.id] = { name: p.name, price: p.price, days: p.days };
  });
  return map;
};

const getMonthlyClients = async (req, res) => {
  try {
    const { month } = req.query;
    const currentMonth = month || new Date().toISOString().slice(0, 7);

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

const createMonthlyClient = async (req, res) => {
  try {
    const { name, phone, monthlyFee, barberId, paymentMethod, notes, planType } = req.body;

    if (barberId) {
      const barber = await Barber.findByPk(barberId);
      if (!barber) return res.status(404).json({ error: 'Barbeiro não encontrado' });
    }

    // 🔥 Planos dinâmicos do banco
    const PLANOS = await getPlanos();

    if (planType && !PLANOS[planType]) {
      return res.status(400).json({ error: 'Plano inválido' });
    }

    const feeFinal = monthlyFee || (planType ? PLANOS[planType].price : 0);

    let client = await Client.findOne({ where: { phone: phone.trim() } });

    if (client) {
      await MonthlyPayment.destroy({ where: { clientId: client.id } });

      await client.update({
        isMonthly: true,
        monthlyFee: feeFinal || client.monthlyFee || 0,
        planType: planType || client.planType || null,
        barberId: barberId || client.barberId,
        isActive: true,
      });

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
      monthlyFee: feeFinal,
      planType: planType || null,
      barberId: barberId || null,
      isActive: true,
    });

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

const updateMonthlyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isMonthly, monthlyFee, barberId, planType } = req.body;

    const client = await Client.findByPk(id);
    if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

    if (barberId) {
      const barber = await Barber.findByPk(barberId);
      if (!barber) return res.status(404).json({ error: 'Barbeiro não encontrado' });
    }

    // 🔥 Planos dinâmicos
    const PLANOS = await getPlanos();

    if (planType && planType !== null && !PLANOS[planType]) {
      return res.status(400).json({ error: 'Plano inválido' });
    }

    let feeFinal = monthlyFee;
    if (planType && PLANOS[planType] && monthlyFee === undefined) {
      feeFinal = PLANOS[planType].price;
    }

    const updateData = {
      isMonthly: isMonthly !== undefined ? isMonthly : client.isMonthly,
      barberId: barberId !== undefined ? barberId : client.barberId,
    };

    if (planType !== undefined) updateData.planType = planType;
    if (feeFinal !== undefined) updateData.monthlyFee = feeFinal;

    await client.update(updateData);

    const updatedClient = await Client.findByPk(id, {
      include: [
        { model: Barber, as: 'barber', attributes: ['id', 'name', 'serviceCommissionRate'] }
      ]
    });

    res.json(updatedClient);
  } catch (error) {
    console.error('❌ Erro ao atualizar status mensal:', error);
    res.status(500).json({ error: 'Erro ao atualizar status mensal' });
  }
};

const confirmMonthlyPayment = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { month, amount, notes } = req.body;

    const client = await Client.findByPk(clientId, {
      include: [
        { model: Barber, as: 'barber', attributes: ['id', 'name', 'serviceCommissionRate'] }
      ]
    });

    if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

    if (!client.barberId || !client.barber) {
      return res.status(400).json({
        error: '⚠️ Cliente não está vinculado a um barbeiro! Defina um barbeiro para este cliente.'
      });
    }

    const existing = await MonthlyPayment.findOne({
      where: { clientId, month, paid: true }
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
          include: [{ model: Barber, as: 'barber', attributes: ['id', 'name'] }]
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
      where: { month: currentMonth, paid: true },
      include: [
        {
          model: Client,
          as: 'client',
          attributes: ['id', 'name', 'phone', 'barberId'],
          include: [{ model: Barber, as: 'barber', attributes: ['id', 'name'] }],
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
      include: [{ model: Barber, as: 'barber', attributes: ['id', 'name'] }],
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

const removePayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await MonthlyPayment.findByPk(id);
    if (!payment) return res.status(404).json({ error: 'Pagamento não encontrado' });

    const today = new Date().toISOString().split('T')[0];
    const revenue = await Revenue.findOne({
      where: { date: today, total: payment.amount, servicesCount: 1 }
    });

    const cashRegister = await CashRegister.findOne({
      where: { date: today, isOpen: true }
    });

    if (cashRegister) {
      const services = cashRegister.services || [];
      const updatedServices = services.filter(s => s.id !== payment.id);
      const totalRevenue = updatedServices.reduce((sum, s) => sum + (s.price || 0), 0);
      const totalCommissions = updatedServices.reduce((sum, s) => sum + (s.commission || 0), 0);

      await cashRegister.update({
        services: updatedServices,
        totalRevenue, totalCommissions,
        servicesCount: updatedServices.length
      });
    }

    if (revenue) await revenue.destroy();
    await payment.destroy();

    res.json({ message: 'Pagamento excluído com sucesso!', paymentId: id });
  } catch (error) {
    console.error('❌ Erro ao deletar pagamento:', error);
    res.status(500).json({ error: 'Erro ao deletar pagamento' });
  }
};

const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, notes } = req.body;

    const payment = await MonthlyPayment.findByPk(id);
    if (!payment) return res.status(404).json({ error: 'Pagamento não encontrado' });

    const updateData = {};
    if (amount !== undefined) {
      const parsed = parseFloat(amount);
      if (isNaN(parsed) || parsed < 0) return res.status(400).json({ error: 'Valor inválido' });
      updateData.amount = parsed;
    }
    if (notes !== undefined) updateData.notes = notes;

    await payment.update(updateData);

    res.json(payment);
  } catch (error) {
    console.error('❌ Erro ao atualizar pagamento:', error);
    res.status(500).json({ error: 'Erro ao atualizar pagamento' });
  }
};

module.exports = {
  getMonthlyClients,
  updateMonthlyStatus,
  confirmMonthlyPayment,
  getPaymentHistory,
  getMonthlyPayments,
  createMonthlyClient,
  removePayment,
  updatePayment,
};