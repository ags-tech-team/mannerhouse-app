const { 
  Revenue, 
  Expense, 
  Appointment, 
  Sale, 
  Barber, 
  Client, 
  Product,
  CashRegister,
  MonthlyPayment
} = require('../models');
const { Op } = require('sequelize');

const getDashboard = async (req, res) => {
  try {
    const { month } = req.query;
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = month ? parseInt(month) : hoje.getMonth() + 1;
    
    const startDate = `${ano}-${String(mes).padStart(2, '0')}-01`;
    const endDate = `${ano}-${String(mes).padStart(2, '0')}-${new Date(ano, mes, 0).getDate()}`;
    const monthString = `${ano}-${String(mes).padStart(2, '0')}`;
    
    console.log('📊 Gerando dashboard admin:', { startDate, endDate, monthString });
    
    // 🔥 1. BUSCAR REVENUES (SERVIÇOS)
    const revenues = await Revenue.findAll({
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
    
    // 🔥 4. BUSCAR DESPESAS
    const expenses = await Expense.findAll({
      where: {
        date: {
          [Op.between]: [startDate, endDate]
        }
      }
    });
    
    // 🔥 5. CALCULAR TOTAIS - MESMA LÓGICA DO FATURAMENTO
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
    
    const totalExpenses = expenses.reduce((sum, e) => sum + e.value, 0);
    const netProfit = totalRevenue - totalExpenses - totalCommissions;
    
    // 🔥 6. CONTAGENS
    const totalServices = serviceRevenues.length;
    const totalProductsSold = sales.reduce((sum, s) => sum + s.quantity, 0);
    const activeBarbers = await Barber.count({ where: { isActive: true } });
    const totalClients = await Client.count({ where: { isActive: true } });
    
    // 🔥 7. FATURAMENTO MENSAL (ÚLTIMOS 12 MESES)
    const monthlyRevenue = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthNum = d.getMonth() + 1;
      const year = d.getFullYear();
      const start = `${year}-${String(monthNum).padStart(2, '0')}-01`;
      const end = `${year}-${String(monthNum).padStart(2, '0')}-${new Date(year, monthNum, 0).getDate()}`;
      const monthKey = `${year}-${String(monthNum).padStart(2, '0')}`;
      
      const monthRevenues = await Revenue.findAll({
        where: { date: { [Op.between]: [start, end] } }
      });
      
      const monthSales = await Sale.findAll({
        where: { date: { [Op.between]: [start, end] } }
      });
      
      const monthMonthly = await MonthlyPayment.findAll({
        where: { month: monthKey, paid: true }
      });
      
      const total = monthRevenues.reduce((sum, r) => sum + r.total, 0) +
                    monthSales.reduce((sum, s) => sum + (s.salePrice * s.quantity), 0) +
                    monthMonthly.reduce((sum, mp) => sum + mp.amount, 0);
      
      monthlyRevenue.push({
        month: `${String(monthNum).padStart(2, '0')}/${String(year).slice(2)}`,
        value: total
      });
    }
    
    // 🔥 8. PERFORMANCE DOS BARBEIROS
    const barbers = await Barber.findAll({
      where: { isActive: true },
      attributes: ['id', 'name']
    });
    
    const barbersPerformance = await Promise.all(barbers.map(async (barber) => {
      const barberRevenues = serviceRevenues.filter(r => r.barberId === barber.id);
      const serviceRevenue = barberRevenues.reduce((sum, r) => sum + r.total, 0);
      const serviceCommission = barberRevenues.reduce((sum, r) => sum + r.commissions, 0);
      const servicesCount = barberRevenues.length;
      
      const barberSales = sales.filter(s => s.barberId === barber.id);
      const productRevenue = barberSales.reduce((sum, s) => sum + (s.salePrice * s.quantity), 0);
      const productCommission = barberSales.reduce((sum, s) => sum + s.commission, 0);
      
      const barberMonthly = monthlyPayments.filter(mp => mp.client?.barberId === barber.id);
      const monthlyRevenue_total = barberMonthly.reduce((sum, mp) => sum + mp.amount, 0);
      const monthlyCommission = barberMonthly.reduce((sum, mp) => {
        const rate = mp.client?.barber?.serviceCommissionRate || 0.5;
        return sum + (mp.amount * rate);
      }, 0);
      
      return {
        id: barber.id,
        name: barber.name,
        services: servicesCount,
        revenue: serviceRevenue + productRevenue + monthlyRevenue_total,
        commission: serviceCommission + productCommission + monthlyCommission
      };
    }));
    
    barbersPerformance.sort((a, b) => b.revenue - a.revenue);
    
    // 🔥 9. ÚLTIMOS AGENDAMENTOS
    const recentAppointments = await Appointment.findAll({
      limit: 10,
      where: {
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['date', 'DESC'], ['time', 'DESC']]
    });
    
    const recentAppointmentsWithData = await Promise.all(recentAppointments.map(async (app) => {
      let clientName = 'Cliente';
      let barberName = 'Barbeiro';
      
      if (app.clientId) {
        const client = await Client.findByPk(app.clientId, { attributes: ['name'] });
        if (client) clientName = client.name;
      }
      
      if (app.barberId) {
        const barber = await Barber.findByPk(app.barberId, { attributes: ['name'] });
        if (barber) barberName = barber.name;
      }
      
      return {
        id: app.id,
        client: clientName,
        barber: barberName,
        service: app.serviceDescription || app.service || 'Serviço',
        date: app.date,
        time: app.time,
        status: app.status
      };
    }));
    
    // 🔥 10. ESTOQUE BAIXO
    const lowStockProducts = await Product.findAll({
      where: {
        stock: { [Op.lt]: 5 },
        isActive: true
      },
      order: [['stock', 'ASC']],
      limit: 10
    });
    
    // 🔥 11. ALERTAS
    const pendingAppointments = await Appointment.count({
      where: { status: 'pending' }
    });
    
    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = await Appointment.count({
      where: { date: today }
    });
    
    // 🔥 12. MONTAR RESULTADO
    const result = {
      summary: {
        totalRevenue,
        totalExpenses,
        netProfit,
        totalCommissions,
        servicesCount: totalServices,
        productsSold: totalProductsSold,
        activeBarbers,
        totalClients
      },
      monthlyRevenue: {
        labels: monthlyRevenue.map(m => m.month),
        values: monthlyRevenue.map(m => m.value)
      },
      barbersPerformance,
      recentAppointments: recentAppointmentsWithData,
      lowStockProducts: lowStockProducts.map(p => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
        price: p.price
      })),
      alerts: {
        lowStock: lowStockProducts.length,
        pendingAppointments,
        todayAppointments
      }
    };
    
    res.json(result);
  } catch (error) {
    console.error('❌ Erro ao gerar dashboard:', error);
    res.status(500).json({ error: 'Erro ao gerar dashboard' });
  }
};

module.exports = {
  getDashboard
};