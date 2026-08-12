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
    const hoje = new Date().toISOString().split('T')[0];
    const inicioSemana = new Date();
    inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
    const inicioSemanaStr = inicioSemana.toISOString().split('T')[0];
    const inicioMes = new Date();
    inicioMes.setDate(1);
    const inicioMesStr = inicioMes.toISOString().split('T')[0];
    
    console.log('📊 Gerando dashboard da barbearia:', { hoje });
    
    // 🔥 AGENDAMENTOS DE HOJE (TODOS OS BARBEIROS)
    const todayAppointments = await Appointment.findAll({
      where: {
        date: hoje,
        status: {
          [Op.notIn]: ['cancelled']
        }
      },
      include: [
        { model: Client, attributes: ['id', 'name', 'phone'] },
        { model: Barber, attributes: ['id', 'name'] }
      ],
      order: [['time', 'ASC']]
    });
    
    // 🔥 AGENDAMENTOS DA SEMANA (TODOS OS BARBEIROS)
    const weekAppointments = await Appointment.findAll({
      where: {
        date: {
          [Op.between]: [inicioSemanaStr, hoje]
        },
        status: 'completed'
      }
    });
    
    // 🔥 AGENDAMENTOS DO MÊS (TODOS OS BARBEIROS)
    const monthAppointments = await Appointment.findAll({
      where: {
        date: {
          [Op.between]: [inicioMesStr, hoje]
        },
        status: 'completed'
      }
    });
    
    // 🔥 VENDAS DE PRODUTOS DO MÊS (TODOS OS BARBEIROS)
    const sales = await Sale.findAll({
      where: {
        date: {
          [Op.between]: [inicioMesStr, hoje]
        }
      }
    });
    
    // 🔥 PRÓXIMOS AGENDAMENTOS (TODOS OS BARBEIROS)
    const upcomingAppointments = await Appointment.findAll({
      where: {
        date: {
          [Op.gte]: hoje
        },
        status: {
          [Op.notIn]: ['cancelled', 'completed']
        }
      },
      include: [
        { model: Client, attributes: ['id', 'name', 'phone'] },
        { model: Barber, attributes: ['id', 'name'] }
      ],
      order: [['date', 'ASC'], ['time', 'ASC']],
      limit: 5
    });
    
    // 🔥 CALCULAR TOTAIS
    const todayRevenue = todayAppointments.reduce((sum, a) => sum + (a.price || 0), 0);
    const todayCommission = todayAppointments.reduce((sum, a) => sum + (a.commission || 0), 0);
    
    const weekRevenue = weekAppointments.reduce((sum, a) => sum + (a.price || 0), 0);
    const weekCommission = weekAppointments.reduce((sum, a) => sum + (a.commission || 0), 0);
    
    const monthRevenue = monthAppointments.reduce((sum, a) => sum + (a.price || 0), 0);
    const monthCommission = monthAppointments.reduce((sum, a) => sum + (a.commission || 0), 0);
    
    const monthProductRevenue = sales.reduce((sum, s) => sum + (s.salePrice * s.quantity), 0);
    const monthProductCommission = sales.reduce((sum, s) => sum + (s.commission || 0), 0);
    
    // 🔥 TOTAL DE BARBEIROS ATIVOS
    const totalBarbers = await Barber.count({
      where: { isActive: true }
    });
    
    // 🔥 TOTAL DE CLIENTES
    const totalClients = await Client.count();
    
    // 🔥 VERIFICAR SE O CAIXA ESTÁ ABERTO (qualquer um)
    const cashRegister = await CashRegister.findOne({
      where: {
        date: hoje,
        isOpen: true
      }
    });
    
    // 🔥 FORMATAR RESULTADO
    const result = {
      summary: {
        totalBarbers,
        totalClients,
        today: {
          appointments: todayAppointments.length,
          revenue: todayRevenue,
          commission: todayCommission
        },
        week: {
          appointments: weekAppointments.length,
          revenue: weekRevenue,
          commission: weekCommission
        },
        month: {
          appointments: monthAppointments.length,
          revenue: monthRevenue + monthProductRevenue,
          commission: monthCommission + monthProductCommission,
          serviceRevenue: monthRevenue,
          productRevenue: monthProductRevenue,
          serviceCommission: monthCommission,
          productCommission: monthProductCommission
        }
      },
      todayAppointments: todayAppointments.map(app => ({
        id: app.id,
        time: app.time,
        client: app.Client?.name || 'Cliente',
        phone: app.Client?.phone || '',
        barber: app.Barber?.name || 'Barbeiro',
        service: app.service,
        price: app.price,
        status: app.status,
        isCompleted: app.status === 'completed'
      })),
      upcomingAppointments: upcomingAppointments.map(app => ({
        id: app.id,
        date: app.date,
        time: app.time,
        client: app.Client?.name || 'Cliente',
        barber: app.Barber?.name || 'Barbeiro',
        service: app.service,
        status: app.status
      })),
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
    console.error('❌ Erro ao gerar dashboard:', error);
    res.status(500).json({ error: 'Erro ao gerar dashboard' });
  }
};

module.exports = {
  getDashboard,
};