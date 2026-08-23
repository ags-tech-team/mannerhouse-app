const { Appointment, Barber, Client, CashRegister, Revenue, Sale, Product } = require('../models');
const { Op } = require('sequelize');

const getBarberDashboard = async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const userId = req.userId;

    console.log('📊 Gerando dashboard da barbearia:', { hoje, userId });

    // 🔥 BUSCAR AGENDAMENTOS DO DIA
    const todayAppointments = await Appointment.findAll({
      where: {
        barberId: userId,
        date: hoje,
        status: {
          [Op.notIn]: ['cancelled']
        }
      },
      include: [
        { 
          model: Client, 
          as: 'client',
          attributes: ['id', 'name', 'phone'] 
        }
      ],
      order: [['time', 'ASC']]
    });

    // 🔥 BUSCAR CAIXA DO DIA
    const cashRegister = await CashRegister.findOne({
      where: {
        userId: userId,
        date: hoje,
        isOpen: true
      }
    });

    // 🔥 BUSCAR PRÓXIMOS AGENDAMENTOS
    const upcomingAppointments = await Appointment.findAll({
      where: {
        barberId: userId,
        date: {
          [Op.gte]: hoje
        },
        status: {
          [Op.notIn]: ['cancelled', 'completed']
        }
      },
      include: [
        { 
          model: Client, 
          as: 'client',
          attributes: ['id', 'name', 'phone'] 
        }
      ],
      order: [['date', 'ASC'], ['time', 'ASC']],
      limit: 5
    });

    // 🔥 RESUMO DO MÊS
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const startDate = startOfMonth.toISOString().split('T')[0];
    const endDate = hoje;

    const monthlyAppointments = await Appointment.findAll({
      where: {
        barberId: userId,
        date: {
          [Op.between]: [startDate, endDate]
        },
        status: 'completed'
      },
      include: [
        { 
          model: Client, 
          as: 'client',
          attributes: ['id', 'name'] 
        }
      ]
    });

    const totalServices = monthlyAppointments.length;
    const totalRevenue = monthlyAppointments.reduce((sum, a) => sum + a.price, 0);
    const totalCommissions = monthlyAppointments.reduce((sum, a) => sum + a.commission, 0);

    // 🔥 VENDAS DE PRODUTOS DO MÊS
    const monthlySales = await Sale.findAll({
      where: {
        barberId: userId,
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      include: [
        { 
          model: Product, 
          as: 'product',
          attributes: ['id', 'name'] 
        }
      ]
    });

    const totalProductsSold = monthlySales.reduce((sum, s) => sum + s.quantity, 0);
    const totalProductRevenue = monthlySales.reduce((sum, s) => sum + (s.salePrice * s.quantity), 0);
    const totalProductCommissions = monthlySales.reduce((sum, s) => sum + s.commission, 0);

    // 🔥 RESULTADO COM FALLBACKS
    const result = {
      today: {
        appointments: todayAppointments.map(a => ({
          id: a.id,
          time: a.time,
          client: a.client?.name || 'Cliente',
          service: a.service,
          price: a.price || 0,
          status: a.status || 'pending'
        })),
        appointmentsCount: todayAppointments.length || 0,
        cashRegister: cashRegister ? {
          isOpen: cashRegister.isOpen || false,
          openingTime: cashRegister.openingTime || null,
          initialCash: cashRegister.initialCash || 0,
          totalRevenue: cashRegister.totalRevenue || 0,
          totalCommissions: cashRegister.totalCommissions || 0,
          servicesCount: cashRegister.servicesCount || 0
        } : {
          isOpen: false,
          openingTime: null,
          initialCash: 0,
          totalRevenue: 0,
          totalCommissions: 0,
          servicesCount: 0
        }
      },
      upcoming: upcomingAppointments.map(a => ({
        id: a.id,
        date: a.date,
        time: a.time,
        client: a.client?.name || 'Cliente',
        service: a.service,
        status: a.status || 'pending'
      })),
      monthly: {
        totalServices: totalServices || 0,
        totalRevenue: totalRevenue || 0,
        totalCommissions: totalCommissions || 0,
        totalProductsSold: totalProductsSold || 0,
        totalProductRevenue: totalProductRevenue || 0,
        totalProductCommissions: totalProductCommissions || 0,
        netProfit: (totalRevenue || 0) + (totalProductRevenue || 0) - (totalCommissions || 0) - (totalProductCommissions || 0)
      },
      stats: {
        completedToday: todayAppointments.filter(a => a.status === 'completed').length || 0,
        pendingToday: todayAppointments.filter(a => a.status === 'pending').length || 0,
        cancelledToday: todayAppointments.filter(a => a.status === 'cancelled').length || 0
      },
      summary: {
        totalBarbers: await Barber.count({ where: { isActive: true } }) || 0,
        totalClients: await Client.count() || 0,
        today: {
          appointments: todayAppointments.length || 0,
          revenue: todayAppointments.reduce((sum, a) => sum + (a.price || 0), 0) || 0,
          commission: todayAppointments.reduce((sum, a) => sum + (a.commission || 0), 0) || 0
        },
        week: {
          appointments: 0,
          revenue: 0,
          commission: 0
        },
        month: {
          appointments: totalServices || 0,
          revenue: (totalRevenue || 0) + (totalProductRevenue || 0),
          commission: (totalCommissions || 0) + (totalProductCommissions || 0),
          serviceRevenue: totalRevenue || 0,
          productRevenue: totalProductRevenue || 0,
          serviceCommission: totalCommissions || 0,
          productCommission: totalProductCommissions || 0
        }
      }
    };

    // 🔥 CALCULAR SEMANA (ÚLTIMOS 7 DIAS)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekStartDate = weekStart.toISOString().split('T')[0];

    const weekAppointments = await Appointment.findAll({
      where: {
        barberId: userId,
        date: {
          [Op.between]: [weekStartDate, hoje]
        },
        status: 'completed'
      }
    });

    result.summary.week.appointments = weekAppointments.length || 0;
    result.summary.week.revenue = weekAppointments.reduce((sum, a) => sum + (a.price || 0), 0) || 0;
    result.summary.week.commission = weekAppointments.reduce((sum, a) => sum + (a.commission || 0), 0) || 0;

    res.json(result);
  } catch (error) {
    console.error('❌ Erro ao gerar dashboard:', error);
    
    // 🔥 FALLBACK EM CASO DE ERRO
    res.status(500).json({
      error: 'Erro ao gerar dashboard',
      today: {
        appointments: [],
        appointmentsCount: 0,
        cashRegister: { isOpen: false, openingTime: null, initialCash: 0, totalRevenue: 0, totalCommissions: 0, servicesCount: 0 }
      },
      upcoming: [],
      monthly: {
        totalServices: 0,
        totalRevenue: 0,
        totalCommissions: 0,
        totalProductsSold: 0,
        totalProductRevenue: 0,
        totalProductCommissions: 0,
        netProfit: 0
      },
      stats: { completedToday: 0, pendingToday: 0, cancelledToday: 0 },
      summary: {
        totalBarbers: 0,
        totalClients: 0,
        today: { appointments: 0, revenue: 0, commission: 0 },
        week: { appointments: 0, revenue: 0, commission: 0 },
        month: { 
          appointments: 0, 
          revenue: 0, 
          commission: 0,
          serviceRevenue: 0,
          productRevenue: 0,
          serviceCommission: 0,
          productCommission: 0
        }
      }
    });
  }
};

module.exports = {
  getBarberDashboard
};