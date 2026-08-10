const { 
  Revenue, 
  Expense, 
  Appointment, 
  Sale, 
  Barber, 
  Client, 
  Product,
  CashRegister
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
    
    console.log('📊 Gerando dashboard admin:', { startDate, endDate });
    
    // 🔥 1. RESUMO FINANCEIRO
    const revenues = await Revenue.findAll({
      where: {
        date: {
          [Op.between]: [startDate, endDate]
        }
      }
    });
    
    const expenses = await Expense.findAll({
      where: {
        date: {
          [Op.between]: [startDate, endDate]
        }
      }
    });
    
    const totalRevenue = revenues.reduce((sum, r) => sum + r.total, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.value, 0);
    const totalCommissions = revenues.reduce((sum, r) => sum + r.commissions, 0);
    const netProfit = totalRevenue - totalExpenses - totalCommissions;
    const servicesCount = revenues.reduce((sum, r) => sum + r.servicesCount, 0);
    
    // 🔥 2. VENDAS DE PRODUTOS
    const sales = await Sale.findAll({
      where: {
        date: {
          [Op.between]: [startDate, endDate]
        }
      }
    });
    const productsSold = sales.reduce((sum, s) => sum + s.quantity, 0);
    
    // 🔥 3. BARBEIROS ATIVOS
    const activeBarbers = await Barber.count({
      where: { isActive: true }
    });
    
    // 🔥 4. TOTAL DE CLIENTES
    const totalClients = await Client.count();
    
    // 🔥 5. FATURAMENTO MENSAL (últimos 12 meses)
    const monthlyRevenue = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthNum = d.getMonth() + 1;
      const year = d.getFullYear();
      const start = `${year}-${String(monthNum).padStart(2, '0')}-01`;
      const end = `${year}-${String(monthNum).padStart(2, '0')}-${new Date(year, monthNum, 0).getDate()}`;
      
      const monthRevenues = await Revenue.findAll({
        where: {
          date: {
            [Op.between]: [start, end]
          }
        }
      });
      
      const total = monthRevenues.reduce((sum, r) => sum + r.total, 0);
      monthlyRevenue.push({
        month: `${String(monthNum).padStart(2, '0')}/${String(year).slice(2)}`,
        value: total
      });
    }
    
    // 🔥 6. PERFORMANCE DOS BARBEIROS
    const barbers = await Barber.findAll({
      where: { isActive: true }
    });
    
    const barbersPerformance = await Promise.all(barbers.map(async (barber) => {
      const barberAppointments = await Appointment.findAll({
        where: {
          barberId: barber.id,
          status: 'completed',
          date: {
            [Op.between]: [startDate, endDate]
          }
        }
      });
      
      const barberSales = await Sale.findAll({
        where: {
          barberId: barber.id,
          date: {
            [Op.between]: [startDate, endDate]
          }
        }
      });
      
      const serviceRevenue = barberAppointments.reduce((sum, a) => sum + a.price, 0);
      const productRevenue = barberSales.reduce((sum, s) => sum + (s.salePrice * s.quantity), 0);
      const serviceCommission = barberAppointments.reduce((sum, a) => sum + a.commission, 0);
      const productCommission = barberSales.reduce((sum, s) => sum + s.commission, 0);
      
      return {
        id: barber.id,
        name: barber.name,
        services: barberAppointments.length,
        products: barberSales.length,
        revenue: serviceRevenue + productRevenue,
        commission: serviceCommission + productCommission
      };
    }));
    
    // Ordenar por receita
    barbersPerformance.sort((a, b) => b.revenue - a.revenue);
    
    // 🔥 7. ÚLTIMOS AGENDAMENTOS
    const recentAppointments = await Appointment.findAll({
      limit: 10,
      where: {
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      include: [
        { model: Barber, attributes: ['name'] },
        { model: Client, attributes: ['name'] }
      ],
      order: [['date', 'DESC'], ['time', 'DESC']]
    });
    
    // 🔥 8. ESTOQUE BAIXO
    const lowStockProducts = await Product.findAll({
      where: {
        stock: {
          [Op.lt]: 5
        },
        isActive: true
      },
      order: [['stock', 'ASC']],
      limit: 10
    });
    
    // 🔥 9. ALERTAS
    const pendingAppointments = await Appointment.count({
      where: {
        status: 'pending'
      }
    });
    
    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = await Appointment.count({
      where: {
        date: today
      }
    });
    
    const result = {
      summary: {
        totalRevenue,
        totalExpenses,
        netProfit,
        totalCommissions,
        servicesCount,
        productsSold,
        activeBarbers,
        totalClients
      },
      monthlyRevenue: {
        labels: monthlyRevenue.map(m => m.month),
        values: monthlyRevenue.map(m => m.value)
      },
      barbersPerformance,
      recentAppointments: recentAppointments.map(a => ({
        id: a.id,
        client: a.Client?.name || 'Cliente',
        barber: a.Barber?.name || 'Barbeiro',
        service: a.service,
        date: a.date,
        time: a.time,
        status: a.status
      })),
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