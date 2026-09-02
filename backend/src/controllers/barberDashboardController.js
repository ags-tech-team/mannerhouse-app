const { Appointment, Barber, Client, CashRegister, Revenue, Sale, Product } = require('../models');
const { Op } = require('sequelize');
const dateHelper = require('../utils/dateHelper');

const getBarberDashboard = async (req, res) => {
  try {
    const { barberId } = req.query;  // 🔥 RECEBE O BARBEIRO SELECIONADO
    const userId = req.userId;
    
    console.log('📊 Gerando dashboard da barbearia:');
    console.log('  Usuário:', userId);
    console.log('  Barbeiro selecionado:', barberId || 'Nenhum');
    
    const hoje = dateHelper.getTodayLocal();
    const startOfMonth = hoje.substring(0, 7) + '-01';

    // 🔥 LISTA DE TODOS OS BARBEIROS ATIVOS (PARA O SELETOR)
    const allBarbers = await Barber.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'userId'],
      order: [['name', 'ASC']]
    });

    console.log(`✂️ Total de barbeiros ativos: ${allBarbers.length}`);

    // 🔥 SE NÃO HOUVER BARBEIROS, RETORNAR VAZIO
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

    // 🔥 DETERMINAR QUAL BARBEIRO VISUALIZAR
    let targetBarberId;
    let targetBarber;

    // Se passou um barberId e existe na lista, usa ele
    if (barberId && allBarbers.some(b => b.id === barberId)) {
      targetBarberId = barberId;
    } else {
      // Senão, usa o primeiro da lista
      targetBarberId = allBarbers[0].id;
    }

    targetBarber = allBarbers.find(b => b.id === targetBarberId) || allBarbers[0];

    console.log(`👤 Visualizando: ${targetBarber.name} (${targetBarber.id})`);

    // 🔥 CORRIGIDO: USAR barberId, NÃO userId!
    const barberIdForQuery = targetBarber.id;

    // 🔥 BUSCAR AGENDAMENTOS DO DIA (USANDO barberId CORRETO)
    const todayAppointments = await Appointment.findAll({
      where: {
        barberId: barberIdForQuery,  // ← 🔥 CORRIGIDO!
        date: hoje,
        status: { [Op.notIn]: ['cancelled'] }
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

    // 🔥 BUSCAR CAIXA DO DIA (USANDO userId DO BARBEIRO)
    const cashRegister = await CashRegister.findOne({
      where: {
        userId: targetBarber.userId,  // ← 🔥 CORRIGIDO!
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
        { 
          model: Client, 
          as: 'client',
          attributes: ['id', 'name', 'phone'] 
        }
      ],
      order: [['date', 'ASC'], ['time', 'ASC']],
      limit: 10
    });


    // 🔥 RESUMO DO MÊS (USANDO barberId CORRETO)
    const monthlyAppointments = await Appointment.findAll({
      where: {
        barberId: barberIdForQuery,  // ← 🔥 CORRIGIDO!
        date: {
          [Op.between]: [startOfMonth, hoje]
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
    const totalRevenue = monthlyAppointments.reduce((sum, a) => sum + (a.price || 0), 0);
    const totalCommissions = monthlyAppointments.reduce((sum, a) => sum + (a.commission || 0), 0);

    // 🔥 VENDAS DE PRODUTOS DO MÊS (USANDO barberId CORRETO)
    const monthlySales = await Sale.findAll({
      where: {
        barberId: barberIdForQuery,  // ← 🔥 CORRIGIDO!
        date: {
          [Op.between]: [startOfMonth, hoje]
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

    const totalProductsSold = monthlySales.reduce((sum, s) => sum + (s.quantity || 0), 0);
    const totalProductRevenue = monthlySales.reduce((sum, s) => sum + ((s.salePrice || 0) * (s.quantity || 0)), 0);
    const totalProductCommissions = monthlySales.reduce((sum, s) => sum + (s.commission || 0), 0);

    // 🔥 CALCULAR SEMANA (ÚLTIMOS 7 DIAS)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekStartDate = weekStart.toISOString().split('T')[0];

    const weekAppointments = await Appointment.findAll({
      where: {
        barberId: barberIdForQuery,  // ← 🔥 CORRIGIDO!
        date: {
          [Op.between]: [weekStartDate, hoje]
        },
        status: 'completed'
      }
    });

    // 🔥 RESULTADO
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
      // 🔥 DADOS PARA O SELETOR
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
    
    // 🔥 FALLBACK EM CASO DE ERRO
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

module.exports = {
  getBarberDashboard
};