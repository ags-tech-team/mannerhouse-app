const { Appointment, Barber, Client } = require('../models');
const { Op } = require('sequelize');

// 🔥 LISTAR BARBEIROS ATIVOS (PÚBLICO)
const getBarbers = async (req, res) => {
  try {
    const barbers = await Barber.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'phone', 'serviceCommissionRate']
    });
    res.json(barbers);
  } catch (error) {
    console.error('Erro ao buscar barbeiros:', error);
    res.status(500).json({ error: 'Erro ao buscar barbeiros' });
  }
};

// 🔥 BUSCAR HORÁRIOS DISPONÍVEIS (PÚBLICO)
const getAvailableTimes = async (req, res) => {
  try {
    const { barberId, date } = req.query;
    
    if (!barberId || !date) {
      return res.status(400).json({ error: 'Barbeiro e data são obrigatórios' });
    }
    
    // Horários padrão (09:00 às 18:00)
    const allTimes = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
      '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
    ];
    
    // Buscar horários já ocupados
    const appointments = await Appointment.findAll({
      where: {
        barberId,
        date,
        status: {
          [Op.notIn]: ['cancelled']
        }
      },
      attributes: ['time']
    });
    
    const bookedTimes = appointments.map(app => app.time);
    const availableTimes = allTimes.filter(time => !bookedTimes.includes(time));
    
    res.json(availableTimes);
  } catch (error) {
    console.error('Erro ao buscar horários disponíveis:', error);
    res.status(500).json({ error: 'Erro ao buscar horários disponíveis' });
  }
};

// 🔥 CRIAR AGENDAMENTO PÚBLICO
const createAppointment = async (req, res) => {
  try {
    const { 
      barberId, 
      clientName, 
      clientPhone, 
      date, 
      time, 
      service, 
      serviceDescription,
      price
    } = req.body;
    
    // Verificar se barbeiro existe
    const barber = await Barber.findByPk(barberId);
    if (!barber) {
      return res.status(404).json({ error: 'Barbeiro não encontrado' });
    }
    
    // Verificar se o horário já está ocupado
    const existing = await Appointment.findOne({
      where: {
        barberId,
        date,
        time,
        status: { [Op.notIn]: ['cancelled'] }
      }
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Horário já ocupado' });
    }
    
    // Buscar ou criar cliente
    let client = await Client.findOne({
      where: { phone: clientPhone }
    });
    
    if (!client) {
      client = await Client.create({
        name: clientName,
        phone: clientPhone,
        isActive: true,
      });
    }
    
    // Calcular comissão
    const commission = (price || 0) * barber.serviceCommissionRate;
    
    // Criar agendamento
    const appointment = await Appointment.create({
      barberId,
      clientId: client.id,
      date,
      time,
      service: service || 'outro',
      serviceDescription: serviceDescription || '',
      price: price || 0,
      commission,
      status: 'pending',
      notes: `Agendamento feito pelo site - Cliente: ${clientName}`,
    });
    
    const created = await Appointment.findByPk(appointment.id, {
      include: [
        { 
          model: Barber, 
          as: 'barber',  // ✅ ADICIONADO
          attributes: ['id', 'name'] 
        },
        { 
          model: Client, 
          as: 'client',  // ✅ ADICIONADO
          attributes: ['id', 'name', 'phone'] 
        }
      ],
    });
    
    res.status(201).json({
      success: true,
      message: 'Agendamento realizado com sucesso!',
      appointment: created
    });
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
};

module.exports = {
  getBarbers,
  getAvailableTimes,
  createAppointment,
};