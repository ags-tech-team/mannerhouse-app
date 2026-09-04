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
    
    const today = dateHelper.getTodayLocal();
    const results = [];
    
    // 1️⃣ Buscar revenues confirmados
    const revenueWhere = { status: 'confirmed' };
    if (startDate && endDate) {
      revenueWhere.date = { [Op.between]: [startDate, endDate] };
    }
    const revenues = await Revenue.findAll({
      where: revenueWhere,
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
    });
    
    revenues.forEach(r => {
      results.push({
        id: r.id,
        date: r.date,
        time: r.createdAt ? new Date(r.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '00:00',
        clientName: r.clientName || 'Cliente',
        barberName: r.barberName || 'Desconhecido',
        service: r.service || 'Serviço',
        serviceDescription: r.serviceDescription || '',
        price: r.total || 0,
        commission: r.commissions || 0,
        status: 'completed',
        notes: r.notes || '',
        createdAt: r.createdAt,
        source: 'revenue'
      });
    });
    
    // 2️⃣ Buscar serviços do caixa ABERTO (se existir)
    const cashRegister = await CashRegister.findOne({
      where: {
        date: today,
        userId: req.userId,
        isOpen: true,
      }
    });
    
    if (cashRegister && cashRegister.services && cashRegister.services.length > 0) {
      const cashServices = cashRegister.services.filter(s => {
        if (startDate && endDate) {
          const serviceDate = s.date || cashRegister.date;
          return serviceDate >= startDate && serviceDate <= endDate;
        }
        return true;
      });
      
      cashServices.forEach(s => {
        // 🔥 EXTRAIR VALORES CORRETAMENTE (USANDO OS CAMPOS QUE O SCRIPT MOSTROU)
        const price = parseFloat(s.price) || parseFloat(s.valor) || 0;
        const commission = parseFloat(s.commission) || parseFloat(s.comissao) || 0;
        const client = s.client || s.cliente || 'Cliente';
        const barber = s.barberName || s.barbeiro || 'Desconhecido';
        const service = s.service || s.servico || 'Serviço';
        
        results.push({
          id: s.id || `cash-${Date.now()}-${Math.random()}`,
          date: s.date || cashRegister.date,
          time: s.time || '00:00',
          clientName: client,
          barberName: barber,
          service: service,
          serviceDescription: s.serviceDescription || '',
          price: price,
          commission: commission,
          status: 'completed',
          notes: s.observacao || s.notes || '',
          createdAt: s.createdAt || new Date().toISOString(),
          source: 'cash'
        });
      });
    }
    
    // 3️⃣ Buscar agendamentos concluídos (para complementar)
    const appointmentWhere = { status: 'completed' };
    if (startDate && endDate) {
      appointmentWhere.date = { [Op.between]: [startDate, endDate] };
    }
    const appointments = await Appointment.findAll({
      where: appointmentWhere,
      include: [
        { model: Client, as: 'client', attributes: ['name'] },
        { model: Barber, as: 'barber', attributes: ['name'] }
      ],
      order: [['date', 'DESC'], ['time', 'DESC']]
    });
    
    appointments.forEach(app => {
      const alreadyExists = results.some(r => r.id === app.id);
      if (!alreadyExists) {
        results.push({
          id: app.id,
          date: app.date,
          time: app.time || '00:00',
          clientName: app.client?.name || 'Cliente',
          barberName: app.barber?.name || 'Desconhecido',
          service: app.service || 'Serviço',
          serviceDescription: app.serviceDescription || '',
          price: app.price || 0,
          commission: app.commission || 0,
          status: 'completed',
          notes: app.notes || '',
          createdAt: app.createdAt,
          source: 'appointment'
        });
      }
    });
    
    // Ordenar por data (mais recente primeiro)
    results.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return (b.time || '').localeCompare(a.time || '');
    });
    
    console.log(`📦 ${results.length} serviços encontrados (revenues: ${revenues.length}, caixa: ${cashRegister?.services?.length || 0}, appointments: ${appointments.length})`);
    console.log('📊 Primeiro serviço do caixa (exemplo):', results.find(r => r.source === 'cash'));
    
    // Formatar datas para o frontend (DD/MM/YYYY)
    const formatted = results.map(s => {
      const dateStr = s.date; // YYYY-MM-DD
      const [year, month, day] = dateStr.split('-').map(Number);
      const formattedDate = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
      
      return {
        ...s,
        date: formattedDate,
        client: { name: s.clientName, phone: '' },
        barber: { name: s.barberName },
      };
    });
    
    res.json(formatted);
  } catch (error) {
    console.error('❌ Erro ao buscar histórico de serviços:', error);
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