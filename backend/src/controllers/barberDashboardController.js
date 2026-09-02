const { Appointment, Barber, Client, CashRegister, Revenue, Sale, Product } = require('../models');
const { Op } = require('sequelize');
const dateHelper = require('../utils/dateHelper');

const getBarberDashboard = async (req, res) => {
  try {
    const { barberId } = req.query;
    const userId = req.userId;
    
    console.log('📊 Gerando dashboard da barbearia:');
    console.log('  Usuário:', userId);
    console.log('  Barbeiro selecionado:', barberId || 'Nenhum');
    
    const hoje = dateHelper.getTodayLocal();
    const startOfMonth = hoje.substring(0, 7) + '-01';

    const allBarbers = await Barber.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'userId'],
      order: [['name', 'ASC']]
    });

    console.log(`✂️ Total de barbeiros ativos: ${allBarbers.length}`);

    if (allBarbers.length === 0) {
      return res.json({
        summary: {
          totalBarbers: 0,
          totalClients: 0,
          today: { appointments: 0, revenue: 0, commission: 0 },
          week: { appointments: 0, revenue: 0, commission: 0 },
          month: { appointments: 0, revenue: 0, commission: 0, serviceRevenue: 0, productRevenue: 0, serviceCommission: 0, productCommission: 0 }
        },
        todayAppointments: [],
        upcomingAppointments: [],
        cashRegister: { isOpen: false, openingTime: null },
        stats: { completedToday: 0, pendingToday: 0, cancelledToday: 0 },
        alerts: { pendingAppointments: 0, todayAppointments: 0 },
        barbers: [],
        selectedBarberId: '',
        selectedBarberName: '',
        isAdmin: true
      });
    }

    let targetBarberId;
    let targetBarber;

    if (barberId && allBarbers.some(b => b.id === barberId)) {
      targetBarberId = barberId;
    } else {
      targetBarberId = allBarbers[0].id;
    }

    targetBarber = allBarbers.find(b => b.id === targetBarberId) || allBarbers[0];

    console.log(`👤 Visualizando: ${targetBarber.name} (${targetBarber.id})`);

    const barberIdForQuery = targetBarber.id;

    const todayAppointments = await Appointment.findAll({
      where: {
        barberId: barberIdForQuery,
        date: hoje,
        status: { [Op.notIn]: ['cancelled'] }
      },
      include: [
        { model: Client, as: 'client', attributes: ['id', 'name', 'phone'] }
      ],
      order: [['time', 'ASC']]
    });

    const cashRegister = await CashRegister.findOne({
      where: {
        userId: targetBarber.userId,
        date: hoje,
        isOpen: true
      }
    });

    const upcomingAppointments = await Appointment.findAll({
      where: {
        barberId: barberIdForQuery,
        date: { [Op.gt]: hoje },
        status: { [Op.notIn]: ['cancelled', 'completed'] }
      },
      include: [
        { model: Client, as: 'client', attributes: ['id', 'name', 'phone'] }
      ],
      order: [['date', 'ASC'], ['time', 'ASC']],
      limit: 10
    });

    const monthlyAppointments = await Appointment.findAll({
      where: {
        barberId: barberIdForQuery,
        date: { [Op.between]: [startOfMonth, hoje] },
        status: 'completed'
      },
      include: [
        { model: Client, as: 'client', attributes: ['id', 'name'] }
      ]
    });

    const totalServices = monthlyAppointments.length;
    const totalRevenue = monthlyAppointments.reduce((sum, a) => sum + (a.price || 0), 0);
    const totalCommissions = monthlyAppointments.reduce((sum, a) => sum + (a.commission || 0), 0);

    const monthlySales = await Sale.findAll({
      where: {
        barberId: barberIdForQuery,
        date: { [Op.between]: [startOfMonth, hoje] }
      },
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name'] }
      ]
    });

    const totalProductsSold = monthlySales.reduce((sum, s) => sum + (s.quantity || 0), 0);
    const totalProductRevenue = monthlySales.reduce((sum, s) => sum + ((s.salePrice || 0) * (s.quantity || 0)), 0);
    const totalProductCommissions = monthlySales.reduce((sum, s) => sum + (s.commission || 0), 0);

    const weekStart = dateHelper.subtractDays(hoje, 7);
    const weekStartDate = weekStart;

    const weekAppointments = await Appointment.findAll({
      where: {
        barberId: barberIdForQuery,
        date: { [Op.between]: [weekStartDate, hoje] },
        status: 'completed'
      }
    });

    const result = {
      summary: {
        totalBarbers: allBarbers.length || 0,
        totalClients: await Client.count() || 0,
        today: {
          appointments: todayAppointments.length || 0,
          revenue: todayAppointments.reduce((sum, a) => sum + (a.price || 0), 0) || 0,
          commission: todayAppointments.reduce((sum, a) => sum + (a.commission || 0), 0) || 0
        },
        week: {
          appointments: weekAppointments.length || 0,
          revenue: weekAppointments.reduce((sum, a) => sum + (a.price || 0), 0) || 0,
          commission: weekAppointments.reduce((sum, a) => sum + (a.commission || 0), 0) || 0
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
      },
      todayAppointments: todayAppointments.map(a => ({
        id: a.id,
        time: a.time,
        client: a.client?.name || 'Cliente',
        phone: a.client?.phone || '',
        barber: targetBarber.name,
        service: a.serviceDescription || a.service || 'Serviço',
        price: a.price || 0,
        status: a.status || 'pending',
        isCompleted: a.status === 'completed'
      })),
      upcomingAppointments: upcomingAppointments.map(a => ({
        id: a.id,
        date: a.date,
        time: a.time,
        client: a.client?.name || 'Cliente',
        barber: targetBarber.name,
        service: a.serviceDescription || a.service || 'Serviço',
        status: a.status || 'pending'
      })),
      cashRegister: cashRegister ? {
        isOpen: cashRegister.isOpen || false,
        openingTime: cashRegister.openingTime || null
      } : {
        isOpen: false,
        openingTime: null
      },
      stats: {
        completedToday: todayAppointments.filter(a => a.status === 'completed').length || 0,
        pendingToday: todayAppointments.filter(a => a.status === 'pending').length || 0,
        cancelledToday: todayAppointments.filter(a => a.status === 'cancelled').length || 0
      },
      alerts: {
        pendingAppointments: await Appointment.count({
          where: {
            barberId: barberIdForQuery,
            status: 'pending'
          }
        }) || 0,
        todayAppointments: todayAppointments.length || 0
      },
      barbers: allBarbers,
      selectedBarberId: targetBarber.id,
      selectedBarberName: targetBarber.name,
      isAdmin: true
    };

    console.log('✅ Dashboard gerado com sucesso!');
    console.log(`📊 ${todayAppointments.length} agendamentos hoje para ${targetBarber.name}`);

    res.json(result);
  } catch (error) {
    console.error('❌ Erro ao gerar dashboard:', error);
    
    res.status(500).json({
      error: 'Erro ao gerar dashboard',
      summary: {
        totalBarbers: 0,
        totalClients: 0,
        today: { appointments: 0, revenue: 0, commission: 0 },
        week: { appointments: 0, revenue: 0, commission: 0 },
        month: { appointments: 0, revenue: 0, commission: 0, serviceRevenue: 0, productRevenue: 0, serviceCommission: 0, productCommission: 0 }
      },
      todayAppointments: [],
      upcomingAppointments: [],
      cashRegister: { isOpen: false, openingTime: null },
      stats: { completedToday: 0, pendingToday: 0, cancelledToday: 0 },
      alerts: { pendingAppointments: 0, todayAppointments: 0 },
      barbers: [],
      selectedBarberId: '',
      selectedBarberName: '',
      isAdmin: true
    });
  }
};

module.exports = { getBarberDashboard };