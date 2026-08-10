const { 
  Appointment, 
  Sale, 
  Barber, 
  Client,
  Revenue,
  CashRegister
} = require('../models');
const { Op } = require('sequelize');

const getDashboard = async (req, res) => {
  try {
    const userId = req.userId;
    
    // 🔥 BUSCAR O BARBEIRO PELO USER ID
    const barber = await Barber.findOne({
      where: { userId }
    });
    
    if (!barber) {
      return res.status(404).json({ error: 'Barbeiro não encontrado' });
    }
    
    const barberId = barber.id;
    const hoje = new Date().toISOString().split('T')[0];
    const inicioSemana = new Date();
    inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
    const inicioSemanaStr = inicioSemana.toISOString().split('T')[0];
    const inicioMes = new Date();
    inicioMes.setDate(1);
    const inicioMesStr = inicioMes.toISOString().split('T')[0];
    
    console.log('📊 Gerando dashboard do barbeiro:', { barberId, hoje });
    
    // 🔥 1. AGENDAMENTOS DE HOJE
    const todayAppointments = await Appointment.findAll({
      where: {
        barberId,
        date: hoje,
        status: {
          [Op.notIn]: ['cancelled']
        }
      },
      include: [
        { model: Client, attributes: ['id', 'name', 'phone'] }
      ],
      order: [['time', 'ASC']]
    });
    
    // 🔥 2. AGENDAMENTOS DA SEMANA
    const weekAppointments = await Appointment.findAll({
      where: {
        barberId,
        date: {
          [Op.between]: [inicioSemanaStr, hoje]
        },
        status: 'completed'
      }
    });
    
    // 🔥 3. AGENDAMENTOS DO MÊS
    const monthAppointments = await Appointment.findAll({
      where: {
        barberId,
        date: {
          [Op.between]: [inicioMesStr, hoje]
        },
        status: 'completed'
      }
    });
    
    // 🔥 4. VENDAS DE PRODUTOS DO MÊS
    const sales = await Sale.findAll({
      where: {
        barberId,
        date: {
          [Op.between]: [inicioMesStr, hoje]
        }
      }
    });
    
    // 🔥 5. PRÓXIMOS AGENDAMENTOS
    const upcomingAppointments = await Appointment.findAll({
      where: {
        barberId,
        date: {
          [Op.gte]: hoje
        },
        status: {
          [Op.notIn]: ['cancelled', 'completed']
        }
      },
      include: [
        { model: Client, attributes: ['id', 'name', 'phone'] }
      ],
      order: [['date', 'ASC'], ['time', 'ASC']],
      limit: 5
    });
    
    // 🔥 CALCULAR TOTAIS
    const totalToday = todayAppointments.length;
    const totalWeekCompleted = weekAppointments.length;
    const totalMonthCompleted = monthAppointments.length;
    
    const weekRevenue = weekAppointments.reduce((sum, a) => sum + (a.price || 0), 0);
    const weekCommission = weekAppointments.reduce((sum, a) => sum + (a.commission || 0), 0);
    
    const monthRevenue = monthAppointments.reduce((sum, a) => sum + (a.price || 0), 0);
    const monthCommission = monthAppointments.reduce((sum, a) => sum + (a.commission || 0), 0);
    
    const monthProductRevenue = sales.reduce((sum, s) => sum + (s.salePrice * s.quantity), 0);
    const monthProductCommission = sales.reduce((sum, s) => sum + (s.commission || 0), 0);
    
    // 🔥 VERIFICAR SE O CAIXA ESTÁ ABERTO
    const cashRegister = await CashRegister.findOne({
      where: {
        date: hoje,
        userId: req.userId,
        isOpen: true
      }
    });
    
    // 🔥 FORMATAR AGENDAMENTOS DE HOJE
    const formattedTodayAppointments = todayAppointments.map(app => ({
      id: app.id,
      time: app.time,
      client: app.Client?.name || 'Cliente',
      phone: app.Client?.phone || '',
      service: app.service,
      price: app.price,
      status: app.status,
      isCompleted: app.status === 'completed'
    }));
    
    // 🔥 FORMATAR PRÓXIMOS AGENDAMENTOS
    const formattedUpcoming = upcomingAppointments.map(app => ({
      id: app.id,
      date: app.date,
      time: app.time,
      client: app.Client?.name || 'Cliente',
      service: app.service,
      status: app.status
    }));
    
    const result = {
      barber: {
        id: barber.id,
        name: barber.name,
        email: barber.email,
        phone: barber.phone,
        commissionRate: barber.serviceCommissionRate * 100
      },
      summary: {
        today: {
          appointments: totalToday,
          revenue: todayAppointments.reduce((sum, a) => sum + (a.price || 0), 0),
          commission: todayAppointments.reduce((sum, a) => sum + (a.commission || 0), 0)
        },
        week: {
          appointments: totalWeekCompleted,
          revenue: weekRevenue,
          commission: weekCommission
        },
        month: {
          appointments: totalMonthCompleted,
          revenue: monthRevenue + monthProductRevenue,
          commission: monthCommission + monthProductCommission,
          serviceRevenue: monthRevenue,
          productRevenue: monthProductRevenue,
          serviceCommission: monthCommission,
          productCommission: monthProductCommission
        }
      },
      todayAppointments: formattedTodayAppointments,
      upcomingAppointments: formattedUpcoming,
      cashRegister: {
        isOpen: !!cashRegister,
        openingTime: cashRegister?.openingTime || null
      },
      stats: {
        completedToday: todayAppointments.filter(a => a.status === 'completed').length,
        pendingToday: todayAppointments.filter(a => a.status === 'pending' || a.status === 'confirmed').length,
        cancelledToday: todayAppointments.filter(a => a.status === 'cancelled').length
      }
    };
    
    res.json(result);
  } catch (error) {
    console.error('❌ Erro ao gerar dashboard do barbeiro:', error);
    res.status(500).json({ error: 'Erro ao gerar dashboard' });
  }
};

module.exports = {
  getDashboard
};