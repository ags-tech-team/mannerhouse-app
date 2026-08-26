const { Revenue, CashRegister, Expense, Appointment, Sale, Barber, Product, MonthlyPayment, Client } = require('../models');
const { Op } = require('sequelize');

const getFinancialDashboard = async (req, res) => {
  try {
    const { month } = req.query;
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = month ? parseInt(month) : hoje.getMonth() + 1;
    
    const startDate = `${ano}-${String(mes).padStart(2, '0')}-01`;
    const endDate = `${ano}-${String(mes).padStart(2, '0')}-${new Date(ano, mes, 0).getDate()}`;
    const monthString = `${ano}-${String(mes).padStart(2, '0')}`;
    
    console.log('📊 Gerando dashboard financeiro:', { startDate, endDate, monthString });
    
    // 🔥 1. BUSCAR REVENUES (SERVIÇOS)
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
    
    // 🔥 2. BUSCAR VENDAS DE PRODUTOS
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
    
    // 🔥 3. BUSCAR PAGAMENTOS DE MENSALIDADES
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
    
    // 🔥 4. CALCULAR TOTAIS
    // Receita de serviços (vem do Revenue)
    const totalServiceRevenue = revenues.reduce((sum, r) => sum + r.total, 0);
    const totalServiceCommissions = revenues.reduce((sum, r) => sum + r.commissions, 0);
    
    // Receita de produtos (vem do Sale)
    const totalProductRevenue = sales.reduce((sum, s) => sum + (s.salePrice * s.quantity), 0);
    const totalProductCommissions = sales.reduce((sum, s) => sum + s.commission, 0);
    
    // Receita de mensalidades (vem do MonthlyPayment)
    const totalMonthlyRevenue = monthlyPayments.reduce((sum, mp) => sum + mp.amount, 0);
    const totalMonthlyCommissions = monthlyPayments.reduce((sum, mp) => {
      const commissionRate = mp.client?.barber?.serviceCommissionRate || 0.5;
      return sum + (mp.amount * commissionRate);
    }, 0);
    
    // TOTAIS GERAIS
    const totalRevenue = totalServiceRevenue + totalProductRevenue + totalMonthlyRevenue;
    const totalCommissions = totalServiceCommissions + totalProductCommissions + totalMonthlyCommissions;
    
    // 🔥 5. COMISSÕES POR BARBEIRO (SERVIÇOS + PRODUTOS + MENSALIDADES)
    const commissionsByBarber = {};
    
    // Adicionar comissões de serviços (Revenue)
    revenues.forEach(r => {
      const barberId = r.barberId;
      const barberName = r.barber?.name || 'Desconhecido';
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
    
    // Adicionar comissões de produtos (Sale)
    sales.forEach(s => {
      const barberId = s.barberId;
      const barberName = s.barber?.name || 'Desconhecido';
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
    
    // Adicionar comissões de mensalidades (MonthlyPayment)
    monthlyPayments.forEach(mp => {
      const barberId = mp.client?.barberId;
      const barberName = mp.client?.barber?.name || 'Desconhecido';
      if (!barberId) {
        // Se não tiver barbeiro, adicionar como "Sem Barbeiro"
        if (!commissionsByBarber['sem-barbeiro']) {
          commissionsByBarber['sem-barbeiro'] = { 
            name: 'Sem Barbeiro', 
            serviceCommission: 0, 
            productCommission: 0,
            monthlyCommission: 0 
          };
        }
        commissionsByBarber['sem-barbeiro'].monthlyCommission += 0;
        return;
      }
      
      if (!commissionsByBarber[barberId]) {
        commissionsByBarber[barberId] = { 
          name: barberName, 
          serviceCommission: 0, 
          productCommission: 0,
          monthlyCommission: 0 
        };
      }
      const commissionRate = mp.client?.barber?.serviceCommissionRate || 0.5;
      commissionsByBarber[barberId].monthlyCommission += mp.amount * commissionRate;
    });
    
    // 🔥 CORRIGIR: Subtrair a comissão de produto da comissão de serviço (Revenue)
    Object.keys(commissionsByBarber).forEach(barberId => {
      const barber = commissionsByBarber[barberId];
      // A comissão de serviço do Revenue inclui produtos, então subtraímos
      barber.serviceCommission = Math.max(0, barber.serviceCommission - barber.productCommission);
    });
    
    // 🔥 6. BUSCAR DESPESAS
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
    
    // 🔥 7. MONTAR RESULTADO
    const result = {
      period: {
        month: mes,
        year: ano,
        startDate,
        endDate,
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
        byBarber: Object.values(commissionsByBarber).map(b => ({
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
        services: revenues.filter(r => r.barberId !== null),
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
    const { period } = req.query;
    let startDate, endDate;
    const hoje = new Date();
    
    if (period === 'today') {
      startDate = hoje.toISOString().split('T')[0];
      endDate = hoje.toISOString().split('T')[0];
    } else if (period === 'week') {
      const weekStart = new Date(hoje);
      weekStart.setDate(hoje.getDate() - hoje.getDay());
      startDate = weekStart.toISOString().split('T')[0];
      endDate = hoje.toISOString().split('T')[0];
    } else if (period === 'month') {
      const monthStart = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      startDate = monthStart.toISOString().split('T')[0];
      endDate = hoje.toISOString().split('T')[0];
    } else {
      // Padrão: mês atual
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
                             monthlyPayments.reduce((sum, mp) => sum + (mp.amount * 0.5), 0);
    
    const totalServices = revenues.reduce((sum, r) => sum + r.servicesCount, 0);
    const totalProducts = sales.length;
    const totalMonthly = monthlyPayments.length;
    
    const summary = {
      totalRevenue,
      totalCommissions,
      totalServices,
      totalProducts,
      totalMonthly,
      count: revenues.length + sales.length + monthlyPayments.length,
    };
    
    res.json(summary);
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

module.exports = {
  getFinancialDashboard,
  getSummary,
  getAll,
  getByDate,
};