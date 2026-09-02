const { Appointment, Barber, Client, CashRegister, User } = require('../models');
const { Op } = require('sequelize');
const dateHelper = require('../utils/dateHelper');

// ==========================================
// DASHBOARD DO BARBEIRO (COM SELETOR)
// ==========================================
const getBarberDashboard = async (req, res) => {
  try {
    const userId = req.userId;
    const { barberId } = req.query; // 🔥 RECEBER O BARBEIRO SELECIONADO
    
    console.log('🔍 Buscando dashboard para usuário:', userId);
    console.log('📌 Barbeiro selecionado:', barberId || 'Nenhum (usando o próprio)');
    
    // 🔥 Buscar o usuário para verificar se é admin
    const user = await User.findByPk(userId);
    const isAdmin = user?.role === 'admin';
    
    // 🔥 Buscar o barbeiro do usuário logado
    const loggedBarber = await Barber.findOne({
      where: { userId, isActive: true }
    });

    if (!loggedBarber) {
      console.log('❌ Barbeiro não encontrado para o usuário:', userId);
      return res.status(404).json({ error: 'Barbeiro não encontrado' });
    }

    // 🔥 DETERMINAR QUAL BARBEIRO VISUALIZAR
    let targetBarberId = loggedBarber.id;
    let targetBarber = loggedBarber;
    
    // Se for admin e passou um barberId, usa o selecionado
    if (isAdmin && barberId) {
      const selectedBarber = await Barber.findByPk(barberId);
      if (selectedBarber && selectedBarber.isActive) {
        targetBarberId = barberId;
        targetBarber = selectedBarber;
        console.log(`👤 Visualizando barbeiro: ${targetBarber.name}`);
      } else {
        console.log('⚠️ Barbeiro selecionado não encontrado ou inativo, usando o próprio');
      }
    }

    console.log(`👤 Barbeiro alvo: ${targetBarber.name} (${targetBarber.id})`);

    // 🔥 DATAS
    const today = dateHelper.getTodayLocal();
    const startOfWeek = dateHelper.subtractDays(today, 7);
    const startOfMonth = today.substring(0, 7) + '-01';

    console.log(`📅 Hoje: ${today}`);

    // 🔥 LISTA DE BARBEIROS (para o seletor)
    const allBarbers = await Barber.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'userId'],
      order: [['name', 'ASC']]
    });

    console.log(`✂️ Total de barbeiros ativos: ${allBarbers.length}`);

    // 🔥 BUSCAR AGENDAMENTOS DO BARBEIRO SELECIONADO - HOJE
    const todayAppointments = await Appointment.findAll({
      where: {
        barberId: targetBarberId,
        date: today,
        status: { [Op.notIn]: ['cancelled'] }
      },
      order: [['time', 'ASC']],
    });

    // 🔥 AGENDAMENTOS DE HOJE COM DADOS DOS CLIENTES
    const todayAppointmentsWithDetails = await Promise.all(
      todayAppointments.map(async (app) => {
        const client = await Client.findByPk(app.clientId, { 
          attributes: ['id', 'name', 'phone'] 
        });
        return {
          id: app.id,
          time: app.time,
          client: client?.name || 'Cliente não encontrado',
          phone: client?.phone || '',
          barber: targetBarber.name,
          service: app.serviceDescription || app.service || 'Serviço',
          price: app.price || 0,
          status: app.status,
          isCompleted: app.status === 'completed'
        };
      })
    );

    console.log(`📋 Agendamentos hoje: ${todayAppointmentsWithDetails.length}`);

    // 🔥 PRÓXIMOS AGENDAMENTOS
    const upcomingAppointments = await Appointment.findAll({
      where: {
        barberId: targetBarberId,
        date: { [Op.gt]: today },
        status: { [Op.notIn]: ['cancelled'] }
      },
      order: [['date', 'ASC'], ['time', 'ASC']],
      limit: 10,
    });

    const upcomingWithDetails = await Promise.all(
      upcomingAppointments.map(async (app) => {
        const client = await Client.findByPk(app.clientId, { 
          attributes: ['id', 'name'] 
        });
        return {
          id: app.id,
          date: app.date,
          time: app.time,
          client: client?.name || 'Cliente não encontrado',
          barber: targetBarber.name,
          service: app.serviceDescription || app.service || 'Serviço',
          status: app.status
        };
      })
    );

    console.log(`📋 Próximos agendamentos: ${upcomingWithDetails.length}`);

    // 🔥 CÁLCULOS DE HOJE
    const todayRevenue = todayAppointments.reduce((sum, app) => sum + (app.price || 0), 0);
    const todayCommission = todayAppointments.reduce((sum, app) => sum + (app.commission || 0), 0);

    // 🔥 CÁLCULOS DA SEMANA
    const weekAppointments = await Appointment.findAll({
      where: {
        barberId: targetBarberId,
        date: { [Op.between]: [startOfWeek, today] },
        status: { [Op.notIn]: ['cancelled'] }
      }
    });

    const weekRevenue = weekAppointments.reduce((sum, app) => sum + (app.price || 0), 0);
    const weekCommission = weekAppointments.reduce((sum, app) => sum + (app.commission || 0), 0);

    // 🔥 CÁLCULOS DO MÊS
    const monthAppointments = await Appointment.findAll({
      where: {
        barberId: targetBarberId,
        date: { [Op.between]: [startOfMonth, today] },
        status: { [Op.notIn]: ['cancelled'] }
      }
    });

    const monthRevenue = monthAppointments.reduce((sum, app) => sum + (app.price || 0), 0);
    const monthCommission = monthAppointments.reduce((sum, app) => sum + (app.commission || 0), 0);

    // 🔥 SERVIÇOS VS PRODUTOS (MÊS)
    const serviceAppointments = monthAppointments.filter(a => a.service !== 'produto');
    const productAppointments = monthAppointments.filter(a => a.service === 'produto');

    const serviceRevenue = serviceAppointments.reduce((sum, app) => sum + (app.price || 0), 0);
    const productRevenue = productAppointments.reduce((sum, app) => sum + (app.price || 0), 0);
    const serviceCommission = serviceAppointments.reduce((sum, app) => sum + (app.commission || 0), 0);
    const productCommission = productAppointments.reduce((sum, app) => sum + (app.commission || 0), 0);

    // 🔥 AGENDAMENTOS PENDENTES
    const pendingAppointments = await Appointment.findAll({
      where: {
        barberId: targetBarberId,
        status: 'pending'
      }
    });

    console.log(`⏳ Pendentes: ${pendingAppointments.length}`);

    // 🔥 STATUS DO CAIXA DO BARBEIRO
    const cashRegister = await CashRegister.findOne({
      where: {
        date: today,
        isOpen: true,
        userId: targetBarber.userId, // 🔥 USA O USERID DO BARBEIRO ALVO
      }
    });

    // 🔥 STATS DO DIA
    const completedToday = todayAppointments.filter(a => a.status === 'completed').length;
    const pendingToday = todayAppointments.filter(a => a.status === 'pending').length;
    const cancelledToday = todayAppointments.filter(a => a.status === 'cancelled').length;

    // 🔥 TOTAL DE CLIENTES
    const totalClients = await Client.count({
      where: { isActive: true }
    });

    // 🔥 TOTAL DE BARBEIROS ATIVOS
    const totalBarbers = await Barber.count({
      where: { isActive: true }
    });

    const responseData = {
      summary: {
        totalBarbers,
        totalClients,
        today: {
          appointments: todayAppointments.length,
          revenue: todayRevenue,
          commission: todayCommission,
        },
        week: {
          appointments: weekAppointments.length,
          revenue: weekRevenue,
          commission: weekCommission,
        },
        month: {
          appointments: monthAppointments.length,
          revenue: monthRevenue,
          commission: monthCommission,
          serviceRevenue,
          productRevenue,
          serviceCommission,
          productCommission,
        }
      },
      todayAppointments: todayAppointmentsWithDetails,
      upcomingAppointments: upcomingWithDetails,
      cashRegister: {
        isOpen: !!cashRegister,
        openingTime: cashRegister?.openingTime || null
      },
      stats: {
        completedToday,
        pendingToday,
        cancelledToday
      },
      alerts: {
        pendingAppointments: pendingAppointments.length,
        todayAppointments: todayAppointments.length
      },
      // 🔥 DADOS PARA O SELETOR
      barbers: allBarbers,
      selectedBarberId: targetBarberId,
      selectedBarberName: targetBarber.name,
      isAdmin: isAdmin
    };

    console.log('✅ Dashboard gerado com sucesso!');
    console.log(`📊 ${todayAppointments.length} agendamentos hoje para ${targetBarber.name}`);

    res.json(responseData);

  } catch (error) {
    console.error('❌ Erro ao carregar dashboard:', error);
    res.status(500).json({ 
      error: 'Erro ao carregar dashboard', 
      details: error.message 
    });
  }
};

module.exports = {
  getBarberDashboard,
};