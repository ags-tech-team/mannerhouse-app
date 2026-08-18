const { Revenue, CashRegister, Expense, Appointment, Sale, Barber } = require('../models');
const { Op } = require('sequelize');

const getFinancialDashboard = async (req, res) => {
  try {
    const { month } = req.query;
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = month ? parseInt(month) : hoje.getMonth() + 1;
    
    const startDate = `${ano}-${String(mes).padStart(2, '0')}-01`;
    const endDate = `${ano}-${String(mes).padStart(2, '0')}-${new Date(ano, mes, 0).getDate()}`;
    
    // 🔥 BUSCAR REVENUES COM BARBEIRO
    const revenues = await Revenue.findAll({
      where: {
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      include: [
        { model: CashRegister },
        { model: Barber, as: 'barber', attributes: ['id', 'name'] }
      ]
    });
    
    const totalRevenueFromCash = revenues.reduce((sum, r) => sum + r.total, 0);
    const totalCommissionsFromCash = revenues.reduce((sum, r) => sum + r.commissions, 0);
    
    // 🔥 COMISSÕES POR BARBEIRO (DOS REVENUES)
    const commissionsByBarberFromRevenue = revenues.reduce((acc, r) => {
      const barberId = r.barberId;
      const barberName = r.barber?.name || 'Desconhecido';
      if (!acc[barberId]) {
        acc[barberId] = { name: barberName, serviceCommission: 0, productCommission: 0 };
      }
      acc[barberId].serviceCommission += r.commissions || 0;
      return acc;
    }, {});

    // Buscar sales (produtos)
    const sales = await Sale.findAll({
      where: {
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      include: [{ model: Barber, attributes: ['id', 'name'] }]
    });
    
    const totalProductRevenue = sales.reduce((sum, s) => sum + (s.salePrice * s.quantity), 0);
    const totalProductCommissions = sales.reduce((sum, s) => sum + (s.commission * s.quantity), 0);

    // Adicionar comissões de produtos ao agrupamento
    sales.forEach(sale => {
      const barberId = sale.barberId;
      if (commissionsByBarberFromRevenue[barberId]) {
        commissionsByBarberFromRevenue[barberId].productCommission += sale.commission;
      } else {
        const barberName = sale.Barber?.name || 'Desconhecido';
        commissionsByBarberFromRevenue[barberId] = {
          name: barberName,
          serviceCommission: 0,
          productCommission: sale.commission
        };
      }
    });

    // Buscar appointments (serviços) que não estão no revenue
    const appointments = await Appointment.findAll({
      where: {
        date: {
          [Op.between]: [startDate, endDate]
        },
        status: 'completed'
      },
      attributes: ['barberId', 'commission', 'price'],
      include: [{ model: Barber, attributes: ['id', 'name'] }]
    });

    // Adicionar comissões de appointments ao agrupamento
    appointments.forEach(app => {
      const barberId = app.barberId;
      if (commissionsByBarberFromRevenue[barberId]) {
        commissionsByBarberFromRevenue[barberId].serviceCommission += app.commission || 0;
      } else {
        const barberName = app.Barber?.name || 'Desconhecido';
        commissionsByBarberFromRevenue[barberId] = {
          name: barberName,
          serviceCommission: app.commission || 0,
          productCommission: 0
        };
      }
    });

    // Calcular totais
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

    // 🔥 TOTAL DE COMISSÕES (soma de todas as fontes)
    const totalCommissions = Object.values(commissionsByBarberFromRevenue).reduce(
      (sum, b) => sum + b.serviceCommission + b.productCommission, 0
    );

    // 🔥 TOTAL DE RECEITA (revenue + sales)
    const totalRevenue = totalRevenueFromCash + totalProductRevenue;

    const netProfit = totalRevenue - totalExpenses - totalCommissions;
    
    const result = {
      period: {
        month: mes,
        year: ano,
        startDate,
        endDate,
      },
      summary: {
        totalRevenue,
        totalExpenses,
        totalCommissions,
        netProfit,
        revenueFromServices: totalRevenueFromCash,
        revenueFromProducts: totalProductRevenue,
      },
      commissions: {
        total: totalCommissions,
        service: Object.values(commissionsByBarberFromRevenue).reduce((sum, b) => sum + b.serviceCommission, 0),
        product: Object.values(commissionsByBarberFromRevenue).reduce((sum, b) => sum + b.productCommission, 0),
        byBarber: Object.values(commissionsByBarberFromRevenue).map(b => ({
          name: b.name,
          serviceCommission: b.serviceCommission,
          productCommission: b.productCommission,
          total: b.serviceCommission + b.productCommission
        }))
      },
      expenses: {
        total: totalExpenses,
        byCategory: expensesByCategory,
        list: expenses
      },
      revenues: {
        services: revenues,
        products: sales
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
    }
    
    const revenues = await Revenue.findAll({
      where: {
        date: {
          [Op.between]: [startDate, endDate]
        }
      }
    });
    
    const summary = {
      totalRevenue: revenues.reduce((sum, r) => sum + r.total, 0),
      totalCommissions: revenues.reduce((sum, r) => sum + r.commissions, 0),
      totalServices: revenues.reduce((sum, r) => sum + r.servicesCount, 0),
      count: revenues.length,
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
      include: [{ model: CashRegister }],
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
      include: [{ model: CashRegister }],
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