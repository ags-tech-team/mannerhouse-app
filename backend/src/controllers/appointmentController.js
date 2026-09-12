const { Appointment, Barber, Client, CashRegister, Revenue } = require('../models');
const { Op } = require('sequelize');
const { findOrCreateClient } = require('../services/clientService');
const dateHelper = require('../utils/dateHelper');

// ============================================================
// GET ALL
// ============================================================
const getAll = async (req, res) => {
  try {
    const { startDate, endDate, barberId, status } = req.query;
    const where = {};
    
    if (startDate && endDate) {
      where.date = {
        [Op.between]: [startDate, endDate]
      };
    }
    if (barberId) where.barberId = barberId;
    if (status) where.status = status;
    
    const appointments = await Appointment.findAll({
      where,
      order: [['date', 'ASC'], ['time', 'ASC']],
    });
    
    const result = await Promise.all(appointments.map(async (app) => {
      const appData = app.toJSON();
      
      if (app.clientId) {
        const client = await Client.findByPk(app.clientId, {
          attributes: ['id', 'name', 'phone']
        });
        appData.Client = client;
      }
      
      if (app.barberId) {
        const barber = await Barber.findByPk(app.barberId, {
          attributes: ['id', 'name', 'email', 'phone']
        });
        appData.Barber = barber;
      }
      
      return appData;
    }));
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    res.status(500).json({ error: 'Erro ao buscar agendamentos' });
  }
};

// ============================================================
// GET BY BARBER
// ============================================================
const getByBarber = async (req, res) => {
  try {
    const { barberId } = req.params;
    const { date } = req.query;
    
    const where = { barberId };
    if (date) where.date = date;
    
    const appointments = await Appointment.findAll({
      where,
      order: [['time', 'ASC']],
    });
    
    const result = await Promise.all(appointments.map(async (app) => {
      const appData = app.toJSON();
      
      if (app.clientId) {
        const client = await Client.findByPk(app.clientId, {
          attributes: ['id', 'name', 'phone']
        });
        appData.Client = client;
      }
      
      return appData;
    }));
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar agendamentos do barbeiro:', error);
    res.status(500).json({ error: 'Erro ao buscar agendamentos' });
  }
};

// ============================================================
// GET AVAILABLE TIMES
// ============================================================
const getAvailableTimes = async (req, res) => {
  try {
    const { barberId } = req.params;
    const { date } = req.query;

    if (!barberId || !date) {
      return res.status(400).json({ error: 'Barbeiro e data são obrigatórios' });
    }

    const barber = await Barber.findByPk(barberId);
    if (!barber) {
      return res.status(404).json({ error: 'Barbeiro não encontrado' });
    }

    // 🔥 Obter o schedule do barbeiro
    const schedule = barber.schedule || {};
    const dateObj = new Date(date + 'T00:00:00');
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const daySchedule = schedule[dayOfWeek];

    if (!daySchedule || !daySchedule.enabled || daySchedule.times.length === 0) {
      return res.json([]);
    }

    // 🔥 Buscar horários já ocupados
    const appointments = await Appointment.findAll({
      where: {
        barberId,
        date,
        status: { [Op.notIn]: ['cancelled'] }
      },
      attributes: ['time']
    });
    const bookedTimes = appointments.map(a => a.time);

    // 🔥 Filtrar horários disponíveis
    let availableTimes = daySchedule.times.filter(time => !bookedTimes.includes(time));

    // 🔥 Remover horários passados (se for hoje)
    const today = new Date();
    const isToday = date === today.toISOString().split('T')[0];
    if (isToday) {
      const currentHour = today.getHours();
      const currentMinute = today.getMinutes();
      availableTimes = availableTimes.filter(time => {
        const [hour, minute] = time.split(':').map(Number);
        return hour > currentHour || (hour === currentHour && minute > currentMinute);
      });
    }

    console.log(`📅 Horários disponíveis para ${barber.name} em ${date}: ${availableTimes.length}`);
    res.json(availableTimes);
  } catch (error) {
    console.error('Erro ao buscar horários disponíveis:', error);
    res.status(500).json({ error: 'Erro ao buscar horários disponíveis' });
  }
};

// ============================================================
// CREATE
// ============================================================
const create = async (req, res) => {
  try {
    const { 
      barberId, 
      clientId, 
      clientName,
      clientPhone,
      date, 
      time, 
      service, 
      serviceDescription,
      price,
    } = req.body;
    
    console.log('📝 Criando agendamento:', { barberId, clientName, clientPhone, date, time });
    
    // VALIDAÇÃO 1: Barbeiro existe
    const barber = await Barber.findByPk(barberId);
    if (!barber) {
      return res.status(404).json({ error: 'Barbeiro não encontrado' });
    }
    
    // VALIDAÇÃO 2: Horário já ocupado
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
    
    // VALIDAÇÃO 3: Horário passado
    const now = new Date();
    const appointmentDate = new Date(date + 'T' + time + ':00');
    if (appointmentDate < now) {
      return res.status(400).json({ error: 'Não é possível agendar em um horário que já passou.' });
    }
    
    // Buscar ou criar cliente
    let client = null;
    if (clientId) {
      client = await Client.findByPk(clientId);
    } else if (clientPhone) {
      const result = await findOrCreateClient({
        name: clientName || 'Cliente sem nome',
        phone: clientPhone,
        isActive: true,
      });
      client = result.client;
    }
    if (!client) {
      return res.status(400).json({ error: 'Cliente não encontrado ou não fornecido' });
    }
    
    // VALIDAÇÃO 4: Um agendamento por semana (por barbeiro)
    const appointmentDateObj = new Date(date + 'T00:00:00');
    const dayOfWeek = appointmentDateObj.getDay();
    const diffToMonday = (dayOfWeek === 0) ? 6 : dayOfWeek - 1;
    const weekStart = new Date(appointmentDateObj);
    weekStart.setDate(appointmentDateObj.getDate() - diffToMonday);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];
    
    const existingAppointments = await Appointment.findAll({
      where: {
        clientId: client.id,
        barberId: barberId,
        date: { [Op.between]: [weekStartStr, weekEndStr] },
        status: { [Op.notIn]: ['cancelled'] }
      }
    });
    if (existingAppointments.length > 0) {
      return res.status(400).json({
        error: `Este cliente já possui um agendamento na semana de ${weekStartStr} a ${weekEndStr}. Não é permitido mais de um agendamento por semana para o mesmo barbeiro.`
      });
    }
    
    // Criar agendamento
    const commission = (price || 0) * (barber.serviceCommissionRate || 0.50);
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
    });
    
    console.log('✅ Agendamento criado:', appointment.id);
    
    const created = await Appointment.findByPk(appointment.id);
    const result = created.toJSON();
    if (created.clientId) {
      const clientData = await Client.findByPk(created.clientId, {
        attributes: ['id', 'name', 'phone']
      });
      result.Client = clientData;
    }
    if (created.barberId) {
      const barberData = await Barber.findByPk(created.barberId, {
        attributes: ['id', 'name']
      });
      result.Barber = barberData;
    }
    
    res.status(201).json(result);
  } catch (error) {
    console.error('❌ Erro ao criar agendamento:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar agendamento' });
  }
};

// ============================================================
// UPDATE STATUS  (com correção do barbeiro/serviço)
// ============================================================
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const appointment = await Appointment.findByPk(id);
    
    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    
    const oldStatus = appointment.status;
    await appointment.update({ status });
    
    let cashRegister = null;
    let cashRegisterStatus = 'closed';
    let revenueCreated = false;
    
    if (status === 'completed' && oldStatus !== 'completed') {
      const hoje = dateHelper.getTodayLocal();
      
      // Atualizar data do appointment para hoje
      if (appointment.date !== hoje) {
        await appointment.update({ date: hoje });
        console.log(`📅 Data do agendamento atualizada de ${appointment.date} para ${hoje}`);
      }
      
      // Buscar caixa aberto
      cashRegister = await CashRegister.findOne({
        where: {
          date: hoje,
          isOpen: true,
          userId: req.userId,
        }
      });
      
      // 🔥 Buscar o barbeiro do agendamento (nunca usar req.user)
      const barber = await Barber.findByPk(appointment.barberId);
      const barberName = barber?.name || 'Barbeiro';
      const commission = (appointment.price || 0) * (barber?.serviceCommissionRate || 0.50);
      const client = await Client.findByPk(appointment.clientId);
      const clientName = client?.name || 'Cliente';
      
      // 🔥 Nome do serviço: preferir serviceDescription, depois service, com fallback seguro
      const serviceName = appointment.serviceDescription || appointment.service || 'Serviço';
      
      if (cashRegister) {
        cashRegisterStatus = 'open';
        
        const services = cashRegister.services || [];
        const totalRevenue = cashRegister.totalRevenue || 0;
        const totalCommissions = cashRegister.totalCommissions || 0;
        
        // 🔥 Adicionar serviço ao caixa com TODOS os campos preenchidos
        services.push({
          id: appointment.id,
          type: 'service',
          client: clientName,
          clientId: appointment.clientId,
          barberId: appointment.barberId,
          barberName: barberName,
          barbeiro: barberName,               // duplicata pt-BR
          barbeiroId: appointment.barberId,   // duplicata pt-BR
          service: serviceName,
          servico: serviceName,               // duplicata pt-BR
          serviceDescription: appointment.serviceDescription || '',
          serviceId: appointment.service || '',
          price: appointment.price || 0,
          commission,
          comissao: commission,               // duplicata pt-BR
          paymentMethod: 'dinheiro',
          time: appointment.time,
          date: hoje,
        });
        
        await cashRegister.update({
          services,
          totalRevenue: totalRevenue + (appointment.price || 0),
          totalCommissions: totalCommissions + commission,
          servicesCount: services.length,
        });
        
        // Criar Revenue confirmado
        try {
          const revenue = await Revenue.create({
            cashRegisterId: cashRegister.id,
            barberId: appointment.barberId,
            clientId: appointment.clientId,
            date: hoje,
            total: appointment.price || 0,
            commissions: commission,
            servicesCount: 1,
            clientName: clientName,
            barberName: barberName,
            service: serviceName,
            serviceDescription: appointment.serviceDescription || '',
            status: 'confirmed',
          });
          revenueCreated = true;
          console.log(`✅ Revenue confirmado criado: ${revenue.id}`);
        } catch (error) {
          console.error('❌ Erro ao criar Revenue:', error);
        }
        
        console.log(`✅ Serviço ${id} adicionado ao caixa.`);
      } else {
        // Caixa fechado – criar Revenue pendente
        console.log(`ℹ️ Caixa fechado, criando revenue pendente.`);
        
        try {
          const revenue = await Revenue.create({
            cashRegisterId: null,
            barberId: appointment.barberId,
            clientId: appointment.clientId,
            date: hoje,
            total: appointment.price || 0,
            commissions: commission,
            servicesCount: 1,
            clientName: clientName,
            barberName: barberName,
            service: serviceName,
            serviceDescription: appointment.serviceDescription || '',
            status: 'pending',
          });
          revenueCreated = true;
          console.log(`✅ Revenue pendente criado: ${revenue.id}`);
        } catch (error) {
          console.error('❌ Erro ao criar Revenue pendente:', error);
        }
        
        cashRegisterStatus = 'closed';
      }
    }
    
    const updated = await Appointment.findByPk(id, {
      include: [
        { model: Client, as: 'client', attributes: ['id', 'name', 'phone'] },
        { model: Barber, as: 'barber', attributes: ['id', 'name', 'email', 'phone'] }
      ]
    });
    
    const result = updated.toJSON();
    
    res.json({
      ...result,
      cashRegisterStatus: cashRegisterStatus,
      revenueCreated: revenueCreated,
      message: status === 'completed' 
        ? (cashRegister 
            ? '✅ Serviço concluído e enviado para o caixa e histórico!' 
            : '✅ Serviço concluído e registrado no histórico (caixa fechado).')
        : 'Status atualizado'
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar status:', error);
    res.status(500).json({ error: 'Erro ao atualizar status', details: error.message });
  }
};

// ============================================================
// REMOVE
// ============================================================
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findByPk(id);
    
    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    
    await appointment.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar agendamento:', error);
    res.status(500).json({ error: 'Erro ao deletar agendamento' });
  }
};

// ============================================================
// SEARCH CLIENTS
// ============================================================
const searchClients = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json([]);
    }
    
    const clients = await Client.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${q}%` } },
          { phone: { [Op.like]: `%${q}%` } },
        ],
        isActive: true,
      },
      limit: 10,
    });
    
    res.json(clients);
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    res.status(500).json({ error: 'Erro ao buscar clientes' });
  }
};

// ============================================================
// GET BY ID
// ============================================================
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔍 Buscando agendamento:', id);
    
    const appointment = await Appointment.findByPk(id);
    
    if (!appointment) {
      console.log('❌ Agendamento não encontrado');
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    
    let client = null;
    let barber = null;
    
    if (appointment.clientId) {
      client = await Client.findByPk(appointment.clientId, {
        attributes: ['id', 'name', 'phone']
      });
    }
    
    if (appointment.barberId) {
      barber = await Barber.findByPk(appointment.barberId, {
        attributes: ['id', 'name', 'email', 'phone']
      });
    }
    
    const result = {
      ...appointment.toJSON(),
      Client: client,
      Barber: barber
    };
    
    res.json(result);
  } catch (error) {
    console.error('❌ Erro ao buscar agendamento:', error);
    res.status(500).json({ error: 'Erro ao buscar agendamento' });
  }
};

// ============================================================
// CHECK AVAILABILITY
// ============================================================
const checkAvailability = async (req, res) => {
  try {
    const { barberId, date } = req.query;
    
    if (!barberId || !date) {
      return res.status(400).json({ error: 'Barbeiro e data são obrigatórios' });
    }
    
    const appointments = await Appointment.findAll({
      where: {
        barberId,
        date,
        status: { [Op.notIn]: ['cancelled'] }
      },
      attributes: ['time']
    });
    
    const cashRegister = await CashRegister.findOne({
      where: {
        date: date,
        isOpen: true,
      }
    });
    
    let bookedFromCashRegister = [];
    if (cashRegister && cashRegister.services) {
      bookedFromCashRegister = cashRegister.services
        .filter((s) => s.barberId === barberId && s.date === date)
        .map((s) => s.time);
    }
    
    const bookedFromAppointments = appointments.map((a) => a.time);
    const allBooked = [...new Set([...bookedFromAppointments, ...bookedFromCashRegister])];
    
    res.json({ times: allBooked });
  } catch (error) {
    console.error('❌ Erro ao verificar disponibilidade:', error);
    res.status(500).json({ error: 'Erro ao buscar agendamento' });
  }
};

// ============================================================
// GET AVAILABLE DATES
// ============================================================
const getAvailableDates = async (req, res) => {
  try {
    const { barberId, month } = req.query;
    if (!barberId || !month) {
      return res.status(400).json({ error: 'barberId e month são obrigatórios' });
    }

    const barber = await Barber.findByPk(barberId);
    if (!barber) {
      return res.status(404).json({ error: 'Barbeiro não encontrado' });
    }

    const [year, mes] = month.split('-').map(Number);
    if (!year || !mes || mes < 1 || mes > 12) {
      return res.status(400).json({ error: 'Mês inválido' });
    }

    const schedule = barber.schedule || {};
    const daysInMonth = new Date(year, mes, 0).getDate();
    const availableDates = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(mes).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      const dateObj = new Date(year, mes - 1, day);
      const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const daySchedule = schedule[dayOfWeek];
      
      if (!daySchedule || !daySchedule.enabled || daySchedule.times.length === 0) {
        continue;
      }

      const appointments = await Appointment.findAll({
        where: {
          barberId,
          date: dateStr,
          status: { [Op.notIn]: ['cancelled'] }
        },
        attributes: ['time']
      });
      const bookedTimes = appointments.map(a => a.time);

      const hasAvailable = daySchedule.times.some(time => !bookedTimes.includes(time));
      if (hasAvailable) {
        availableDates.push(dateStr);
      }
    }

    res.json({ dates: availableDates });
  } catch (error) {
    console.error('❌ Erro ao buscar dias disponíveis:', error);
    res.status(500).json({ error: 'Erro ao buscar dias disponíveis' });
  }
};

module.exports = {
  getAll,
  getById,
  getByBarber,
  getAvailableTimes,
  checkAvailability, 
  create,
  updateStatus,
  remove,
  searchClients,
  getAvailableDates
};