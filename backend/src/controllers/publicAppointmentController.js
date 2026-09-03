const { Appointment, Barber, Client } = require('../models');
const { Op } = require('sequelize');
const dateHelper = require('../utils/dateHelper');

// ==========================================
// GET BARBERS - Listar barbeiros ativos
// ==========================================
const getBarbers = async (req, res) => {
  try {
    const barbers = await Barber.findAll({
      where: { 
        isActive: true,
        name: { [Op.notLike]: '%Luiz%' }
       },
      attributes: ['id', 'name', 'phone', 'serviceCommissionRate', 'schedule']
    });
    res.json(barbers);
  } catch (error) {
    console.error('❌ Erro ao buscar barbeiros:', error);
    res.status(500).json({ error: 'Erro ao buscar barbeiros' });
  }
};

// ==========================================
// 🔥 CORRIGIDO: Buscar horários disponíveis
// ==========================================
const getAvailableTimes = async (req, res) => {
  try {
    const { barberId, date } = req.query;
    
    if (!barberId || !date) {
      return res.status(400).json({ error: 'Barbeiro e data são obrigatórios' });
    }
    
    // 🔥 VALIDAR DATA
    if (!dateHelper.isValidDate(date)) {
      return res.status(400).json({ error: 'Data inválida' });
    }
    
    // 🔥 BUSCAR BARBEIRO COM SCHEDULE
    const barber = await Barber.findByPk(barberId);
    if (!barber) {
      return res.status(404).json({ error: 'Barbeiro não encontrado' });
    }
    
    // 🔥 CORREÇÃO: Usar helper para dia da semana
    const dayOfWeek = dateHelper.getDayOfWeekEn(date);
    
    if (!dayOfWeek) {
      return res.status(400).json({ error: 'Data inválida para cálculo do dia da semana' });
    }
    
    // 🔥 VERIFICAR SCHEDULE DO BARBEIRO
    const schedule = barber.schedule || {};
    const daySchedule = schedule[dayOfWeek];
    
    console.log(`📅 Buscando horários para ${barber.name} em ${date} (${dayOfWeek})`);
    
    let allTimes = [];
    
    // 🔥 SE TIVER SCHEDULE CONFIGURADO, USA ELE
    if (daySchedule && daySchedule.enabled) {
      allTimes = daySchedule.times || [];
      console.log(`✅ Usando schedule do barbeiro: ${allTimes.length} horários`);
    } else {
      // 🔥 SE NÃO TIVER, RETORNA VAZIO
      console.log(`⚠️ ${barber.name} não tem horários configurados para ${dayOfWeek}`);
      return res.json([]);
    }
    
    // 🔥 BUSCAR HORÁRIOS OCUPADOS
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
    
    console.log(`📅 Horários disponíveis para ${barber.name} em ${date}: ${availableTimes.length}`);
    
    res.json(availableTimes);
  } catch (error) {
    console.error('❌ Erro ao buscar horários disponíveis:', error);
    res.status(500).json({ error: 'Erro ao buscar horários disponíveis' });
  }
};

// ==========================================
// CREATE APPOINTMENT - Criar agendamento público
// ==========================================
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
    
    // 🔥 VALIDAR DATA
    if (!dateHelper.isValidDate(date)) {
      return res.status(400).json({ error: 'Data inválida' });
    }
    
    // 🔥 VERIFICAR SE A DATA NÃO É PASSADA
    if (dateHelper.isPastDate(date)) {
      return res.status(400).json({ error: 'Não é possível agendar em datas passadas' });
    }
    
    // 🔥 VERIFICAR BARBEIRO
    const barber = await Barber.findByPk(barberId);
    if (!barber) {
      return res.status(404).json({ error: 'Barbeiro não encontrado' });
    }
    
    // 🔥 VERIFICAR DISPONIBILIDADE
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
    
    // 🔥 BUSCAR OU CRIAR CLIENTE
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
    
    // 🔥 CALCULAR COMISSÃO
    const commission = (price || 0) * (barber.serviceCommissionRate || 0.50);
    
    // 🔥 CRIAR AGENDAMENTO
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
    
    console.log(`✅ Agendamento público ${appointment.id} criado para ${date} às ${time}`);
    
    const created = await Appointment.findByPk(appointment.id, {
      include: [
        { 
          model: Barber, 
          as: 'barber',
          attributes: ['id', 'name'] 
        },
        { 
          model: Client, 
          as: 'client',
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
    console.error('❌ Erro ao criar agendamento:', error);
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
};

module.exports = {
  getBarbers,
  getAvailableTimes,
  createAppointment,
};