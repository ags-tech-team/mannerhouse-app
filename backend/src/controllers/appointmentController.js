const { Appointment, Barber, Client, CashRegister, Revenue } = require('../models');
const { Op } = require('sequelize');
const { findOrCreateClient } = require('../services/clientService');
const dateHelper = require('../utils/dateHelper');

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
    
    // 🔥 CORRIGIDO: USAR DATEHELPER
    const dateObj = dateHelper.parseDateLocal(date);
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    const schedule = barber.schedule || {};
    const daySchedule = schedule[dayOfWeek];
    
    if (!daySchedule || !daySchedule.enabled) {
      console.log(`📅 ${barber.name} não trabalha em ${dayOfWeek} (${date})`);
      return res.json([]);
    }
    
    const barberTimes = daySchedule.times || [];
    
    const appointments = await Appointment.findAll({
      where: {
        barberId,
        date,
        status: { [Op.notIn]: ['cancelled'] }
      },
      attributes: ['time']
    });
    
    const bookedTimes = appointments.map(app => app.time);
    const availableTimes = barberTimes.filter(time => !bookedTimes.includes(time));
    
    console.log(`📅 Horários disponíveis para ${barber.name} em ${date}: ${availableTimes.length}`);
    
    res.json(availableTimes);
  } catch (error) {
    console.error('Erro ao buscar horários disponíveis:', error);
    res.status(500).json({ error: 'Erro ao buscar horários disponíveis' });
  }
};

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
      notes 
    } = req.body;
    
    console.log('📝 Criando agendamento:', { barberId, clientName, clientPhone, date, time });
    
    const barber = await Barber.findByPk(barberId);
    if (!barber) {
      return res.status(404).json({ error: 'Barbeiro não encontrado' });
    }
    
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
      notes,
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
      // 🔥 CORRIGIDO: USAR DATEHELPER
      const hoje = dateHelper.getTodayLocal();
      
      // 🔥 ATUALIZAR A DATA DO APPOINTMENT PARA HOJE
      if (appointment.date !== hoje) {
        await appointment.update({ date: hoje });
        console.log(`📅 Data do agendamento atualizada de ${appointment.date} para ${hoje}`);
      }
      
      cashRegister = await CashRegister.findOne({
        where: {
          date: hoje,
          isOpen: true,
          userId: req.userId,
        }
      });
      
      const barber = await Barber.findByPk(appointment.barberId);
      const commission = (appointment.price || 0) * (barber?.serviceCommissionRate || 0.50);
      const client = await Client.findByPk(appointment.clientId);
      
      if (cashRegister) {
        cashRegisterStatus = 'open';
        
        const services = cashRegister.services || [];
        const totalRevenue = cashRegister.totalRevenue || 0;
        const totalCommissions = cashRegister.totalCommissions || 0;
        
        services.push({
          id: appointment.id,
          type: 'service',
          client: client?.name || 'Cliente',
          clientId: appointment.clientId,
          barberId: appointment.barberId,
          barberName: barber?.name || 'Barbeiro',
          service: appointment.service,
          price: appointment.price || 0,
          commission,
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
        
        // 🔥 CRIAR REVENUE CONFIRMADO
        try {
          const revenue = await Revenue.create({
            cashRegisterId: cashRegister.id,
            barberId: appointment.barberId,
            clientId: appointment.clientId,
            date: hoje,
            total: appointment.price || 0,
            commissions: commission,
            servicesCount: 1,
            clientName: client?.name || 'Cliente',
            barberName: barber?.name || 'Barbeiro',
            service: appointment.service,
            serviceDescription: appointment.serviceDescription,
            status: 'confirmed',
            notes: `Concluído em ${new Date().toLocaleString('pt-BR')} (caixa aberto)`,
          });
          revenueCreated = true;
          console.log(`✅ Revenue confirmado criado: ${revenue.id}`);
        } catch (error) {
          console.error('❌ Erro ao criar Revenue:', error);
        }
        
        console.log(`✅ Serviço ${id} adicionado ao caixa.`);
      } else {
        // 🔥 CAIXA FECHADO - CRIA REVENUE PENDENTE
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
            clientName: client?.name || 'Cliente',
            barberName: barber?.name || 'Barbeiro',
            service: appointment.service,
            serviceDescription: appointment.serviceDescription,
            status: 'pending',
            notes: `Concluído em ${new Date().toLocaleString('pt-BR')} (caixa fechado)`,
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
      console.log('👤 Cliente encontrado manualmente:', client?.name);
    }
    
    if (appointment.barberId) {
      barber = await Barber.findByPk(appointment.barberId, {
        attributes: ['id', 'name', 'email', 'phone']
      });
      console.log('✂️ Barbeiro encontrado manualmente:', barber?.name);
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

const checkAvailability = async (req, res) => {
  try {
    const { barberId, date } = req.query;
    
    if (!barberId || !date) {
      return res.status(400).json({ error: 'Barbeiro e data são obrigatórios' });
    }
    
    console.log('🔍 Verificando disponibilidade:', { barberId, date });
    
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
    
    console.log('📅 Horários ocupados:', allBooked);
    
    res.json({ times: allBooked });
  } catch (error) {
    console.error('❌ Erro ao verificar disponibilidade:', error);
    res.status(500).json({ error: 'Erro ao buscar agendamento' });
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
};