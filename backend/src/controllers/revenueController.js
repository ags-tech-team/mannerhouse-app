const { Revenue, CashRegister, Expense, Appointment, Sale, Barber, Product, MonthlyPayment, Client } = require('../models');
const { Op } = require('sequelize');

const getFinancialDashboard = async (req, res) => {
  try {
    const { month, period, startDate: queryStart, endDate: queryEnd } = req.query;
    const hoje = new Date();
    let ano = hoje.getFullYear();
    let mes = hoje.getMonth() + 1;
    let startDate, endDate, monthString;
    
    console.log('📊 Parâmetros recebidos:', { month, period, queryStart, queryEnd }); // 🔥 DEBUG
    
    // 🔥 SE FOR PERÍODO "week", USAR AS DATAS ENVIADAS OU CALCULAR
    if (period === 'week') {
      if (queryStart && queryEnd) {
        // 🔥 USAR DATAS ENVIADAS PELO FRONTEND
        startDate = queryStart;
        endDate = queryEnd;
        console.log('📅 Usando datas enviadas:', startDate, 'até', endDate);
      } else {
        // 🔥 CALCULAR A SEMANA ATUAL
        const today = new Date();
        const dayOfWeek = today.getDay();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        startDate = startOfWeek.toISOString().split('T')[0];
        endDate = endOfWeek.toISOString().split('T')[0];
        console.log('📅 Calculando semana atual:', startDate, 'até', endDate);
      }
      monthString = startDate.substring(0, 7);
    } 
    // 🔥 SE FOR PERÍODO "month" OU NÃO ESPECIFICADO
    else {
      mes = month ? parseInt(month) : hoje.getMonth() + 1;
      ano = hoje.getFullYear();
      startDate = `${ano}-${String(mes).padStart(2, '0')}-01`;
      endDate = `${ano}-${String(mes).padStart(2, '0')}-${new Date(ano, mes, 0).getDate()}`;
      monthString = `${ano}-${String(mes).padStart(2, '0')}`;
      console.log('📊 Gerando dashboard MENSAL:', { startDate, endDate });
    }
    
    // 🔥 BUSCAR REVENUES (SERVIÇOS)
    const revenues = await Revenue.findAll({
      where: {
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      include: [
        { 
          model: CashRegister, 
          as: 'cashRegister',
          required: false 
        },
        { 
          model: Barber, 
          as: 'barber',
          attributes: ['id', 'name'] 
        }
      ]
    });
    
    // 🔥 BUSCAR VENDAS DE PRODUTOS
    const sales = await Sale.findAll({
      where: {
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      include: [
        { 
          model: Barber, 
          as: 'barber',
          attributes: ['id', 'name'] 
        },
        { 
          model: Product, 
          as: 'product',
          attributes: ['id', 'name', 'hasCommission'] 
        }
      ]
    });
    
    // 🔥 BUSCAR PAGAMENTOS DE MENSALIDADES
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
    
    // 🔥 CALCULAR RECEITAS
    const serviceRevenues = revenues.filter(r => r.barberId !== null);
    const totalServiceRevenue = serviceRevenues.reduce((sum, r) => sum + r.total, 0);
    const totalProductRevenue = sales.reduce((sum, s) => sum + (s.salePrice * s.quantity), 0);
    const totalMonthlyRevenue = monthlyPayments.reduce((sum, mp) => sum + mp.amount, 0);
    const totalRevenue = totalServiceRevenue + totalProductRevenue + totalMonthlyRevenue;
    
    // 🔥 CALCULAR COMISSÕES
    const totalServiceCommissions = serviceRevenues.reduce((sum, r) => sum + r.commissions, 0);
    const totalProductCommissions = sales.reduce((sum, s) => sum + s.commission, 0);
    const totalMonthlyCommissions = monthlyPayments.reduce((sum, mp) => {
      const rate = mp.client?.barber?.serviceCommissionRate || 0.5;
      return sum + (mp.amount * rate);
    }, 0);
    const totalCommissions = totalServiceCommissions + totalProductCommissions + totalMonthlyCommissions;
    
    // 🔥 COMISSÕES POR BARBEIRO
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
    
    // 🔥 BUSCAR DESPESAS
    const expenses = await Expense.findAll({
      where: {
        date: {
          [Op.between]: [startDate, endDate]
        }
      }
    });
    
    const totalExpenses = expenses.reduce((sum, e) => sum + e.value, 0);
    const expensesByCategory = expenses.reduce((acc, e) => {
      const category = e.category || 'outros';
      acc[category] = (acc[category] || 0) + e.value;
      return acc;
    }, {});
    
    const netProfit = totalRevenue - totalExpenses - totalCommissions;
    
    // 🔥 MONTAR RESULTADO
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

// 🔥 O RESTO DO CÓDIGO IGUAL...
const getSummary = async (req, res) => {
  try {
    const { period, startDate: queryStart, endDate: queryEnd } = req.query;
    let startDate, endDate;
    const hoje = new Date();
    
    if (period === 'today') {
      startDate = hoje.toISOString().split('T')[0];
      endDate = hoje.toISOString().split('T')[0];
    } else if (period === 'week') {
      if (queryStart && queryEnd) {
        startDate = queryStart;
        endDate = queryEnd;
      } else {
        const dayOfWeek = hoje.getDay();
        const startOfWeek = new Date(hoje);
        startOfWeek.setDate(hoje.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        startDate = startOfWeek.toISOString().split('T')[0];
        endDate = endOfWeek.toISOString().split('T')[0];
      }
    } else if (period === 'month') {
      const monthStart = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      startDate = monthStart.toISOString().split('T')[0];
      endDate = hoje.toISOString().split('T')[0];
    } else {
      const monthStart = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      startDate = monthStart.toISOString().split('T')[0];
      endDate = hoje.toISOString().split('T')[0];
    }
    
    const monthString = startDate.substring(0, 7);
    
    const revenues = await Revenue.findAll({
      where: {
        date: {
          [Op.between]: [startDate, endDate]
        }
      }
    });
    
    const sales = await Sale.findAll({
      where: {
        date: {
          [Op.between]: [startDate, endDate]
        }
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
        { 
          model: CashRegister, 
          as: 'cashRegister',
          required: false 
        }
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
        { 
          model: CashRegister, 
          as: 'cashRegister',
          required: false 
        }
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
    
    console.log('📥 Parâmetros recebidos:', { startDate, endDate });
    
    const where = {};
    where.barberId = { [Op.ne]: null };
    
    if (startDate && endDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dateRegex.test(startDate) && dateRegex.test(endDate)) {
        where.date = {
          [Op.between]: [startDate, endDate]
        };
      }
    }
    
    const revenues = await Revenue.findAll({
      where,
      include: [
        { 
          model: Barber, 
          as: 'barber',
          attributes: ['id', 'name'] 
        }
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
    });
    
    // 🔥 FORMATAR COM O client_name
    const formattedRevenues = revenues.map(r => {
      const data = r.toJSON();
      const clientName = r.clientName || 'Cliente'; // 🔥 USA O client_name DO REVENUE
      
      return {
        ...data,
        clientName: clientName,
        client: { name: clientName, phone: '' }
      };
    });
    
    console.log(`📦 ${formattedRevenues.length} serviços encontrados`);
    res.json(formattedRevenues);
  } catch (error) {
    console.error('❌ Erro ao buscar serviços faturados:', error);
    res.status(500).json({ error: 'Erro ao buscar faturamento' });
  }
};

const deleteRevenue = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🗑️ Tentando excluir revenue:', id);
    
    const revenue = await Revenue.findByPk(id);
    if (!revenue) {
      console.log('❌ Revenue não encontrado');
      return res.status(404).json({ error: 'Revenue não encontrado' });
    }
    
    await revenue.destroy();
    console.log('✅ Revenue excluído com sucesso:', id);
    
    res.json({ message: 'Revenue excluído com sucesso!', id });
  } catch (error) {
    console.error('❌ Erro ao excluir revenue:', error);
    res.status(500).json({ error: 'Erro ao excluir revenue' });
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