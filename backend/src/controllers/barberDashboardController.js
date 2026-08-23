const { Appointment, Barber, Client, CashRegister, Revenue, Sale, Product } = require('../models');
const { Op } = require('sequelize');

const getBarberDashboard = async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const userId = req.userId;

    console.log('📊 Gerando dashboard da barbearia:', { hoje, userId });

    // 🔥 BUSCAR AGENDAMENTOS DO DIA (COM AS CORRETO)
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
          as: 'client',  // 🔥 ADICIONAR
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

    // 🔥 BUSCAR PRÓXIMOS AGENDAMENTOS (COM AS CORRETO)
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
          as: 'client',  // 🔥 ADICIONAR
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
          as: 'client',  // 🔥 ADICIONAR
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
          as: 'product',  // 🔥 ADICIONAR
          attributes: ['id', 'name'] 
        }
      ]
    });

    const totalProductsSold = monthlySales.reduce((sum, s) => sum + s.quantity, 0);
    const totalProductRevenue = monthlySales.reduce((sum, s) => sum + (s.salePrice * s.quantity), 0);
    const totalProductCommissions = monthlySales.reduce((sum, s) => sum + s.commission, 0);

    // 🔥 RESULTADO FINAL
    const result = {
      today: {
        appointments: todayAppointments.map(a => ({
          id: a.id,
          time: a.time,
          client: a.client?.name || 'Cliente',
          service: a.service,
          price: a.price,
          status: a.status
        })),
        appointmentsCount: todayAppointments.length,
        cashRegister: cashRegister ? {
          isOpen: cashRegister.isOpen,
          openingTime: cashRegister.openingTime,
          initialCash: cashRegister.initialCash,
          totalRevenue: cashRegister.totalRevenue,
          totalCommissions: cashRegister.totalCommissions,
          servicesCount: cashRegister.servicesCount
        } : null
      },
      upcoming: upcomingAppointments.map(a => ({
        id: a.id,
        date: a.date,
        time: a.time,
        client: a.client?.name || 'Cliente',
        service: a.service
      })),
      monthly: {
        totalServices,
        totalRevenue,
        totalCommissions,
        totalProductsSold,
        totalProductRevenue,
        totalProductCommissions,
        netProfit: totalRevenue + totalProductRevenue - totalCommissions - totalProductCommissions
      }
    };

    res.json(result);
  } catch (error) {
    console.error('❌ Erro ao gerar dashboard:', error);
    res.status(500).json({ error: 'Erro ao gerar dashboard' });
  }
};

module.exports = {
  getBarberDashboard
};