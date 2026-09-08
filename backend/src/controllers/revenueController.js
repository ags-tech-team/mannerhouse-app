const { Revenue, CashRegister, Expense, Appointment, Sale, Barber, Product, MonthlyPayment, Client } = require('../models');
const { Op } = require('sequelize');
const dateHelper = require('../utils/dateHelper');

const getFinancialDashboard = async (req, res) => {
  try {
    const { month, period, startDate: queryStart, endDate: queryEnd } = req.query;
    
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
        // 🔥 Cálculo da semana: segunda a domingo
        const hojeObj = new Date(hoje + 'T00:00:00');
        let dayOfWeek = hojeObj.getDay(); // 0=domingo
        const diffToMonday = (dayOfWeek === 0) ? -6 : 1 - dayOfWeek;
        const monday = new Date(hojeObj);
        monday.setDate(hojeObj.getDate() + diffToMonday);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const formatDate = (date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        startDate = formatDate(monday);
        endDate = formatDate(sunday);
        console.log(`📅 Calculando semana (segunda a domingo): ${startDate} até ${endDate}`);
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
    
    // 🔥 Revenues (serviços)
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
    
    // 🔥 Sales (produtos)
    const sales = await Sale.findAll({
      where: {
        date: { [Op.between]: [startDate, endDate] }
      },
      include: [
        { model: Barber, as: 'barber', attributes: ['id', 'name'] },
        { model: Product, as: 'product', attributes: ['id', 'name', 'hasCommission'] }
      ]
    });
    
    // 🔥 CORREÇÃO: Mensalidades – filtrar por data de pagamento (paidAt)
    const monthlyPayments = await MonthlyPayment.findAll({
      where: {
        paid: true,
        paidAt: {
          [Op.between]: [new Date(startDate + 'T00:00:00'), new Date(endDate + 'T23:59:59.999')]
        }
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
    
    console.log(`📦 Encontrados: ${revenues.length} revenues, ${sales.length} vendas, ${monthlyPayments.length} mensalidades pagas no período`);
    
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
    
    // 🔥 Inicializar com todos os barbeiros ativos (zerados)
    const activeBarbers = await Barber.findAll({ where: { isActive: true } });
    const commissionsByBarber = {};
    activeBarbers.forEach(barber => {
      commissionsByBarber[barber.id] = {
        name: barber.name,
        serviceCommission: 0,
        productCommission: 0,
        monthlyCommission: 0,
      };
    });
    
    // 🔥 Adicionar comissões de serviços (revenues)
    serviceRevenues.forEach(r => {
      const barberId = r.barberId;
      if (barberId && commissionsByBarber[barberId]) {
        commissionsByBarber[barberId].serviceCommission += r.commissions || 0;
      }
    });
    
    // 🔥 Adicionar comissões de produtos (sales)
    sales.forEach(s => {
      const barberId = s.barberId || 'sem-barbeiro';
      if (barberId !== 'sem-barbeiro' && commissionsByBarber[barberId]) {
        commissionsByBarber[barberId].productCommission += s.commission || 0;
      }
    });
    
    // 🔥 Adicionar comissões de mensalidades (monthlyPayments)
    monthlyPayments.forEach(mp => {
      const barberId = mp.client?.barberId || 'sem-barbeiro';
      if (barberId !== 'sem-barbeiro' && commissionsByBarber[barberId]) {
        const rate = mp.client?.barber?.serviceCommissionRate || 0.5;
        commissionsByBarber[barberId].monthlyCommission += mp.amount * rate;
      }
    });
    
    // 🔥 Montar a lista de barbeiros (SEM FILTRO – todos os ativos)
    const byBarber = Object.values(commissionsByBarber).map(b => ({
      name: b.name,
      serviceCommission: b.serviceCommission,
      productCommission: b.productCommission,
      monthlyCommission: b.monthlyCommission,
      total: b.serviceCommission + b.productCommission + b.monthlyCommission
    }));
    
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
        byBarber: byBarber, // ← SEM FILTRO (todos os ativos aparecem)
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
        // 🔥 Cálculo da semana: segunda a domingo
        const hojeObj = new Date(hoje + 'T00:00:00');
        let dayOfWeek = hojeObj.getDay();
        const diffToMonday = (dayOfWeek === 0) ? -6 : 1 - dayOfWeek;
        const monday = new Date(hojeObj);
        monday.setDate(hojeObj.getDate() + diffToMonday);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const formatDate = (date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        startDate = formatDate(monday);
        endDate = formatDate(sunday);
        console.log(`📅 Resumo semana (segunda a domingo): ${startDate} até ${endDate}`);
      }
    } else if (period === 'month') {
      startDate = hoje.substring(0, 7) + '-01';
      endDate = hoje;
    } else {
      startDate = hoje.substring(0, 7) + '-01';
      endDate = hoje;
    }
    
    // 🔥 CORREÇÃO: Filtrar mensalidades por data de pagamento (paidAt)
    const revenues = await Revenue.findAll({
      where: {
        date: { [Op.between]: [startDate, endDate] },
        status: 'confirmed'
      }
    });
    
    const sales = await Sale.findAll({
      where: {
        date: { [Op.between]: [startDate, endDate] }
      }
    });
    
    const monthlyPayments = await MonthlyPayment.findAll({
      where: {
        paid: true,
        paidAt: {
          [Op.between]: [new Date(startDate + 'T00:00:00'), new Date(endDate + 'T23:59:59.999')]
        }
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
    const { startDate, endDate, month } = req.query;
    let start, end;

    // 🔥 Calcular intervalo
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [year, mes] = month.split('-').map(Number);
      start = `${year}-${String(mes).padStart(2, '0')}-01`;
      const lastDay = new Date(year, mes, 0).getDate();
      end = `${year}-${String(mes).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    } else if (startDate && endDate) {
      start = startDate;
      end = endDate;
    } else {
      const hoje = dateHelper.getTodayLocal();
      const [year, mes] = hoje.split('-').map(Number);
      start = `${year}-${String(mes).padStart(2, '0')}-01`;
      const lastDay = new Date(year, mes, 0).getDate();
      end = `${year}-${String(mes).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }

    console.log('📥 Buscando histórico (apenas revenues):', { start, end });

    // 🔥 Buscar apenas revenues confirmados
    const revenues = await Revenue.findAll({
      where: {
        date: { [Op.between]: [start, end] },
        status: 'confirmed'
      },
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
    });

    console.log(`📦 ${revenues.length} revenues encontrados`);

    // Formatar para o frontend
    const formatted = revenues.map(r => {
      const [year, month, day] = r.date.split('-').map(Number);
      const formattedDate = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
      return {
        id: r.id,
        date: formattedDate,
        time: r.createdAt ? new Date(r.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '00:00',
        client: { name: r.clientName || 'Cliente', phone: '' },
        barber: { name: r.barberName || 'Desconhecido' },
        service: r.service || 'Serviço',
        serviceDescription: r.serviceDescription || '',
        price: r.total || 0,
        commission: r.commissions || 0,
        status: 'completed',
        notes: r.notes || '',
        createdAt: r.createdAt,
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('❌ Erro ao buscar histórico (revenues):', error);
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