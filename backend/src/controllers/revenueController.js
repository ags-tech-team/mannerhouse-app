const { Revenue, CashRegister, Expense, Appointment, Sale, Barber, Product } = require('../models');
const { Op } = require('sequelize');

const getFinancialDashboard = async (req, res) => {
  try {
    const { month } = req.query;
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = month ? parseInt(month) : hoje.getMonth() + 1;
    
    const startDate = `${ano}-${String(mes).padStart(2, '0')}-01`;
    const endDate = `${ano}-${String(mes).padStart(2, '0')}-${new Date(ano, mes, 0).getDate()}`;
    
    console.log('📊 Gerando dashboard financeiro:', { startDate, endDate });
    
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
    
    const totalRevenue = revenues.reduce((sum, r) => sum + r.total, 0);
    const totalCommissions = revenues.reduce((sum, r) => sum + r.commissions, 0);
    
    const productIds = sales.map(s => s.id);
    
    const totalProductRevenue = sales.reduce((sum, s) => sum + (s.salePrice * s.quantity), 0);
    const totalProductCommissions = sales.reduce((sum, s) => sum + s.commission, 0);
    
    const totalServiceRevenue = totalRevenue - totalProductRevenue;
    const totalServiceCommissions = totalCommissions - totalProductCommissions;
    
    const commissionsByBarber = {};
    
    revenues.forEach(r => {
      const barberId = r.barberId;
      const barberName = r.barber?.name || 'Desconhecido';
      if (!commissionsByBarber[barberId]) {
        commissionsByBarber[barberId] = { 
          name: barberName, 
          serviceCommission: 0, 
          productCommission: 0 
        };
      }
      // 🔥 IMPORTANTE: Aqui estamos somando TODAS as comissões do Revenue
      // Depois vamos subtrair as de produto
      commissionsByBarber[barberId].serviceCommission += r.commissions || 0;
    });
    
    // Comissões de produtos (dos Sales) - SUBTRAIR do serviceCommission
    sales.forEach(s => {
      const barberId = s.barberId;
      const barberName = s.barber?.name || 'Desconhecido';
      if (!commissionsByBarber[barberId]) {
        commissionsByBarber[barberId] = { 
          name: barberName, 
          serviceCommission: 0, 
          productCommission: 0 
        };
      }
      // Adicionar comissão de produto
      commissionsByBarber[barberId].productCommission += s.commission || 0;
    });
    
    // 🔥 CORRIGIR: Subtrair a comissão de produto da comissão de serviço
    Object.keys(commissionsByBarber).forEach(barberId => {
      const barber = commissionsByBarber[barberId];
      barber.serviceCommission = barber.serviceCommission - barber.productCommission;
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
      },
      summary: {
        totalRevenue,
        totalExpenses,
        totalCommissions,
        netProfit,
        revenueFromServices: totalServiceRevenue,
        revenueFromProducts: totalProductRevenue,
      },
      commissions: {
        total: totalCommissions,
        service: Object.values(commissionsByBarber).reduce((sum, b) => sum + b.serviceCommission, 0),
        product: Object.values(commissionsByBarber).reduce((sum, b) => sum + b.productCommission, 0),
        byBarber: Object.values(commissionsByBarber).map(b => ({
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
        services: revenues.filter(r => r.barberId !== null), // Revenues com barbeiro são serviços
        products: sales.map(s => ({
          id: s.id,
          date: s.date,
          barber: s.barber?.name || 'Desconhecido',
          product: s.product?.name || 'Produto',
          quantity: s.quantity,
          total: s.salePrice * s.quantity,
          commission: s.commission,
          hasCommission: s.product?.hasCommission !== false
        }))
      }
    };
    
    res.json(result);
  } catch (error) {
    console.error('❌ Erro ao gerar dashboard financeiro:', error);
    res.status(500).json({ error: 'Erro ao gerar dashboard financeiro' });
  }
};

// O resto do código permanece igual...
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
    
    const sales = await Sale.findAll({
      where: {
        date: {
          [Op.between]: [startDate, endDate]
        }
      }
    });
    
    // 🔥 CORRIGIDO: Não somar Sales ao Revenue
    const totalRevenue = revenues.reduce((sum, r) => sum + r.total, 0);
    const totalCommissions = revenues.reduce((sum, r) => sum + r.commissions, 0);
    const totalServices = revenues.reduce((sum, r) => sum + r.servicesCount, 0);
    const totalProducts = sales.length;
    
    const summary = {
      totalRevenue,
      totalCommissions,
      totalServices,
      totalProducts,
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