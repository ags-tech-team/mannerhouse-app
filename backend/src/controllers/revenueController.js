const { Revenue, CashRegister, Expense, Appointment, Sale, Barber, Product, MonthlyPayment, Client } = require('../models');
const { Op } = require('sequelize');
const dateHelper = require('../utils/dateHelper');

const getFinancialDashboard = async (req, res) => {
  try {
    const { month, period, startDate: queryStart, endDate: queryEnd } = req.query;
    
    // 🔥 CORRIGIDO: USAR DATEHELPER
    const hoje = dateHelper.getTodayLocal();
    const hojeDate = new Date(hoje + 'T00:00:00');
    let ano = hojeDate.getFullYear();
    let mes = hojeDate.getMonth() + 1;
    let startDate, endDate, monthString;
    
    console.log('📊 Parâmetros recebidos:', { month, period, queryStart, queryEnd });
    
    if (period === 'week') {
      if (queryStart && queryEnd) {
        startDate = queryStart;
        endDate = queryEnd;
        console.log('📅 Usando datas enviadas:', startDate, 'até', endDate);
      } else {
        const startOfWeek = dateHelper.subtractDays(hoje, 7);
        startDate = startOfWeek;
        endDate = hoje;
        console.log('📅 Calculando semana atual:', startDate, 'até', endDate);
      }
      monthString = startDate.substring(0, 7);
    } else {
      mes = month ? parseInt(month) : hojeDate.getMonth() + 1;
      ano = hojeDate.getFullYear();
      startDate = `${ano}-${String(mes).padStart(2, '0')}-01`;
      const lastDay = new Date(ano, mes, 0).getDate();
      endDate = `${ano}-${String(mes).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      monthString = `${ano}-${String(mes).padStart(2, '0')}`;
      console.log('📊 Gerando dashboard MENSAL:', { startDate, endDate });
    }
    
    const revenues = await Revenue.findAll({
      where: {
        date: { [Op.between]: [startDate, endDate] },
        status: 'confirmed'
      },
      include: [
        { model: CashRegister, as: 'cashRegister', required: false },
        { model: Barber, as: 'barber', attributes: ['id', 'name'] }
      ]
    });
    
    const sales = await Sale.findAll({
      where: {
        date: { [Op.between]: [startDate, endDate] }
      },
      include: [
        { model: Barber, as: 'barber', attributes: ['id', 'name'] },
        { model: Product, as: 'product', attributes: ['id', 'name', 'hasCommission'] }
      ]
    });
    
    const monthlyPayments = await MonthlyPayment.findAll({
      where: {
        month: monthString,
        paid: true,
      },
      include: [
        {
          model: Client,
          as: 'client',
          include: [
            {
              model: Barber,
              as: 'barber',
              attributes: ['id', 'name', 'serviceCommissionRate']
            }
          ]
        }
      ]
    });
    
    console.log(`📦 Encontrados: ${revenues.length} revenues, ${sales.length} vendas, ${monthlyPayments.length} mensalidades`);
    
    const serviceRevenues = revenues.filter(r => r.barberId !== null);
    const totalServiceRevenue = serviceRevenues.reduce((sum, r) => sum + r.total, 0);
    const totalProductRevenue = sales.reduce((sum, s) => sum + (s.salePrice * s.quantity), 0);
    const totalMonthlyRevenue = monthlyPayments.reduce((sum, mp) => sum + mp.amount, 0);
    const totalRevenue = totalServiceRevenue + totalProductRevenue + totalMonthlyRevenue;
    
    const totalServiceCommissions = serviceRevenues.reduce((sum, r) => sum + r.commissions, 0);
    const totalProductCommissions = sales.reduce((sum, s) => sum + s.commission, 0);
    const totalMonthlyCommissions = monthlyPayments.reduce((sum, mp) => {
      const rate = mp.client?.barber?.serviceCommissionRate || 0.5;
      return sum + (mp.amount * rate);
    }, 0);
    const totalCommissions = totalServiceCommissions + totalProductCommissions + totalMonthlyCommissions;
    
    const commissionsByBarber = {};

    serviceRevenues.forEach(r => {
      const barberId = r.barberId;
      const barberName = r.barber?.name || 'Sem Barbeiro';
      
      if (!commissionsByBarber[barberId]) {
        commissionsByBarber[barberId] = { 
          name: barberName, 
          serviceCommission: 0, 
          productCommission: 0,
          monthlyCommission: 0
        };
      }
      commissionsByBarber[barberId].serviceCommission += r.commissions || 0;
    });

    sales.forEach(s => {
      const barberId = s.barberId || 'sem-barbeiro';
      const barberName = s.barber?.name || 'Sem Barbeiro';
      
      if (!commissionsByBarber[barberId]) {
        commissionsByBarber[barberId] = { 
          name: barberName, 
          serviceCommission: 0, 
          productCommission: 0,
          monthlyCommission: 0
        };
      }
      commissionsByBarber[barberId].productCommission += s.commission || 0;
    });

    monthlyPayments.forEach(mp => {
      const barberId = mp.client?.barberId || 'sem-barbeiro';
      const barberName = mp.client?.barber?.name || 'Sem Barbeiro';
      const rate = mp.client?.barber?.serviceCommissionRate || 0.5;
      const commission = mp.amount * rate;
      
      if (!commissionsByBarber[barberId]) {
        commissionsByBarber[barberId] = { 
          name: barberName, 
          serviceCommission: 0, 
          productCommission: 0,
          monthlyCommission: 0
        };
      }
      commissionsByBarber[barberId].monthlyCommission += commission;
    });
    
    const expenses = await Expense.findAll({
      where: {
        date: { [Op.between]: [startDate, endDate] }
      }
    });
    
    const totalExpenses = expenses.reduce((sum, e) => sum + e.value, 0);
    const expensesByCategory = expenses.reduce((acc, e) => {
      const category = e.category || 'outros';
      acc[category] = (acc[category] || 0) + e.value;
      return acc;
    }, {});
    
    const netProfit = totalRevenue - totalExpenses - totalCommissions;
    
    const result = {
      period: {
        type: period || 'month',
        startDate,
        endDate,
        month: mes,
        year: ano,
        monthString,
      },
      summary: {
        totalRevenue,
        totalExpenses,
        totalCommissions,
        netProfit,
        revenueFromServices: totalServiceRevenue,
        revenueFromProducts: totalProductRevenue,
        revenueFromMonthly: totalMonthlyRevenue,
      },
      commissions: {
        total: totalCommissions,
        service: Object.values(commissionsByBarber).reduce((sum, b) => sum + b.serviceCommission, 0),
        product: Object.values(commissionsByBarber).reduce((sum, b) => sum + b.productCommission, 0),
        monthly: Object.values(commissionsByBarber).reduce((sum, b) => sum + b.monthlyCommission, 0),
        byBarber: Object.values(commissionsByBarber)
          .filter(b => b.serviceCommission > 0 || b.productCommission > 0 || b.monthlyCommission > 0)
          .map(b => ({
            name: b.name,
            serviceCommission: b.serviceCommission,
            productCommission: b.productCommission,
            monthlyCommission: b.monthlyCommission,
            total: b.serviceCommission + b.productCommission + b.monthlyCommission
          }))
      },
      expenses: {
        total: totalExpenses,
        byCategory: expensesByCategory,
        list: expenses
      },
      revenues: {
        services: serviceRevenues.map(r => ({
          id: r.id,
          date: r.date,
          barber: r.barber?.name || 'Desconhecido',
          total: r.total,
          commission: r.commissions,
          servicesCount: r.servicesCount
        })),
        products: sales.map(s => ({
          id: s.id,
          date: s.date,
          barber: s.barber?.name || 'Desconhecido',
          product: s.product?.name || 'Produto',
          quantity: s.quantity,
          total: s.salePrice * s.quantity,
          commission: s.commission,
          hasCommission: s.product?.hasCommission !== false
        })),
        monthly: monthlyPayments.map(mp => ({
          id: mp.id,
          client: mp.client?.name || 'Desconhecido',
          barber: mp.client?.barber?.name || 'Sem Barbeiro',
          amount: mp.amount,
          commission: mp.amount * (mp.client?.barber?.serviceCommissionRate || 0.5),
          commissionRate: (mp.client?.barber?.serviceCommissionRate || 0.5) * 100,
          month: mp.month,
          paidAt: mp.paidAt
        }))
      }
    };
    
    res.json(result);
  } catch (error) {
    console.error('❌ Erro ao gerar dashboard financeiro:', error);
    res.status(500).json({ error: 'Erro ao gerar dashboard financeiro' });
  }
};

const getSummary = async (req, res) => {
  try {
    const { period, startDate: queryStart, endDate: queryEnd } = req.query;
    let startDate, endDate;
    
    const hoje = dateHelper.getTodayLocal();
    
    if (period === 'today') {
      startDate = hoje;
      endDate = hoje;
    } else if (period === 'week') {
      if (queryStart && queryEnd) {
        startDate = queryStart;
        endDate = queryEnd;
      } else {
        startDate = dateHelper.subtractDays(hoje, 7);
        endDate = hoje;
      }
    } else if (period === 'month') {
      startDate = hoje.substring(0, 7) + '-01';
      endDate = hoje;
    } else {
      startDate = hoje.substring(0, 7) + '-01';
      endDate = hoje;
    }
    
    const monthString = startDate.substring(0, 7);
    
    const revenues = await Revenue.findAll({
      where: {
        date: { [Op.between]: [startDate, endDate] }
      }
    });
    
    const sales = await Sale.findAll({
      where: {
        date: { [Op.between]: [startDate, endDate] }
      }
    });
    
    const monthlyPayments = await MonthlyPayment.findAll({
      where: {
        month: monthString,
        paid: true,
      }
    });
    
    const totalRevenue = revenues.reduce((sum, r) => sum + r.total, 0) +
                         sales.reduce((sum, s) => sum + (s.salePrice * s.quantity), 0) +
                         monthlyPayments.reduce((sum, mp) => sum + mp.amount, 0);
    
    const totalCommissions = revenues.reduce((sum, r) => sum + r.commissions, 0) +
                             sales.reduce((sum, s) => sum + s.commission, 0) +
                             monthlyPayments.reduce((sum, mp) => {
                               const rate = 0.5;
                               return sum + (mp.amount * rate);
                             }, 0);
    
    res.json({
      totalRevenue,
      totalCommissions,
      totalServices: revenues.length,
      totalProducts: sales.length,
      totalMonthly: monthlyPayments.length,
    });
  } catch (error) {
    console.error('Erro ao buscar resumo:', error);
    res.status(500).json({ error: 'Erro ao buscar resumo' });
  }
};

const getAll = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};
    
    if (startDate && endDate) {
      where.date = {
        [Op.between]: [startDate, endDate],
      };
    }
    
    const revenues = await Revenue.findAll({
      where,
      include: [
        { model: CashRegister, as: 'cashRegister', required: false }
      ],
      order: [['date', 'DESC']],
    });
    
    res.json(revenues);
  } catch (error) {
    console.error('Erro ao buscar faturamentos:', error);
    res.status(500).json({ error: 'Erro ao buscar faturamentos' });
  }
};

const getByDate = async (req, res) => {
  try {
    const { date } = req.params;
    
    const revenue = await Revenue.findOne({
      where: { date },
      include: [
        { model: CashRegister, as: 'cashRegister', required: false }
      ],
    });
    
    if (!revenue) {
      return res.status(404).json({ error: 'Faturamento não encontrado' });
    }
    
    res.json(revenue);
  } catch (error) {
    console.error('Erro ao buscar faturamento:', error);
    res.status(500).json({ error: 'Erro ao buscar faturamento' });
  }
};

const getServices = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    console.log('📥 Buscando histórico de serviços concluídos:', { startDate, endDate });
    
    const where = {
      status: 'completed'
    };
    
    if (startDate && endDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dateRegex.test(startDate) && dateRegex.test(endDate)) {
        where.date = {
          [Op.between]: [startDate, endDate]
        };
      }
    }
    
    const appointments = await Appointment.findAll({
      where,
      include: [
        { model: Client, as: 'client', attributes: ['id', 'name', 'phone'], required: false },
        { model: Barber, as: 'barber', attributes: ['id', 'name', 'email', 'phone'], required: false }
      ],
      order: [['date', 'DESC'], ['time', 'DESC']]
    });
    
    console.log(`📦 ${appointments.length} serviços concluídos encontrados`);
    
    const formatted = appointments.map(app => {
      const appData = app.toJSON();
      
      return {
        id: appData.id,
        date: appData.date,
        time: appData.time,
        client: appData.client || { name: 'Cliente removido', phone: '' },
        barber: appData.barber || { name: 'Barbeiro removido' },
        service: appData.service || 'Serviço',
        serviceDescription: appData.serviceDescription || 'Serviço concluído',
        price: appData.price || 0,
        commission: appData.commission || 0,
        status: appData.status,
        notes: appData.notes || '',
        createdAt: appData.createdAt,
        updatedAt: appData.updatedAt,
        clientName: appData.client?.name || 'Cliente removido',
        total: appData.price || 0,
        commissions: appData.commission || 0,
      };
    });
    
    res.json(formatted);
  } catch (error) {
    console.error('❌ Erro ao buscar serviços concluídos:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
};

const deleteRevenue = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🗑️ Tentando excluir serviço do histórico:', id);
    
    const appointment = await Appointment.findByPk(id);
    if (!appointment) {
      console.log('❌ Serviço não encontrado');
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }
    
    if (appointment.status !== 'completed') {
      return res.status(400).json({ error: 'Apenas serviços concluídos podem ser removidos do histórico' });
    }
    
    await appointment.update({ 
      status: 'pending',
      notes: `Serviço removido do histórico em ${new Date().toLocaleString('pt-BR')}`
    });
    
    console.log('✅ Serviço removido do histórico:', id);
    
    res.json({ 
      message: 'Serviço removido do histórico com sucesso!', 
      id,
      newStatus: 'pending'
    });
  } catch (error) {
    console.error('❌ Erro ao remover serviço:', error);
    res.status(500).json({ error: 'Erro ao remover serviço' });
  }
};

module.exports = {
  getFinancialDashboard,
  getSummary,
  getAll,
  getByDate,
  getServices,
  deleteRevenue
};