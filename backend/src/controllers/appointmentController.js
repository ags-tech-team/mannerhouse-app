const { Appointment, Barber, Client, CashRegister, Revenue, Service } = require('../models');
const { Op } = require('sequelize');
const { findOrCreateClient } = require('../services/clientService');
const dateHelper = require('../utils/dateHelper');

// ============================================================
// 🔥 HELPER: buscar serviço por ID ou nome
// ============================================================
const findServiceByIdentifier = async (identifier) => {
  if (!identifier) return null;
  let svc = await Service.findOne({ where: { id: identifier } });
  if (svc) return svc;
  svc = await Service.findOne({ where: { name: identifier } });
  return svc;
};

// ============================================================
// 🔥 HELPER: calcular comissão respeitando isCommissioned
// ============================================================
const calculateCommission = async (appointment, barber, fallbackRate = 0.50) => {
  let isCommissioned = true;
  let foundService = null;

  // Tenta pelo campo `service` (que pode ser ID, nome, ou nome com emoji)
  if (appointment.service) {
    foundService = await findServiceByIdentifier(appointment.service);
  }
  // Fallback: tenta pelo serviceDescription
  if (!foundService && appointment.serviceDescription) {
    foundService = await findServiceByIdentifier(appointment.serviceDescription);
  }

  if (foundService && foundService.isCommissioned === false) {
    isCommissioned = false;
  }

  const rate = barber?.serviceCommissionRate || fallbackRate;
  const commission = isCommissioned ? (appointment.price || 0) * rate : 0;

  console.log(`💰 Comissão: R$ ${commission.toFixed(2)} | service encontrado: ${foundService ? foundService.name : 'NÃO'} | comissionado: ${isCommissioned}`);

  return commission;
};

// ============================================================
// GET ALL
// ============================================================
const getAll = async (req, res) => {
  try {
    const { startDate, endDate, barberId, status } = req.query;
    const where = {};
    if (startDate && endDate) where.date = { [Op.between]: [startDate, endDate] };
    if (barberId) where.barberId = barberId;
    if (status) where.status = status;

    const appointments = await Appointment.findAll({
      where,
      order: [['date', 'ASC'], ['time', 'ASC']],
    });

    const result = await Promise.all(appointments.map(async (app) => {
      const appData = app.toJSON();
      if (app.clientId) {
        appData.Client = await Client.findByPk(app.clientId, { attributes: ['id', 'name', 'phone'] });
      }
      if (app.barberId) {
        appData.Barber = await Barber.findByPk(app.barberId, { attributes: ['id', 'name', 'email', 'phone'] });
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

    const appointments = await Appointment.findAll({ where, order: [['time', 'ASC']] });
    const result = await Promise.all(appointments.map(async (app) => {
      const appData = app.toJSON();
      if (app.clientId) {
        appData.Client = await Client.findByPk(app.clientId, { attributes: ['id', 'name', 'phone'] });
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

    if (!barberId || !date) return res.status(400).json({ error: 'Barbeiro e data são obrigatórios' });

    const barber = await Barber.findByPk(barberId);
    if (!barber) return res.status(404).json({ error: 'Barbeiro não encontrado' });

    const schedule = barber.schedule || {};
    const dayOfWeek = dateHelper.getDayOfWeekEn(date);
    const daySchedule = schedule[dayOfWeek];

    if (!daySchedule || !daySchedule.enabled || daySchedule.times.length === 0) return res.json([]);

    const appointments = await Appointment.findAll({
      where: { barberId, date, status: { [Op.notIn]: ['cancelled'] } },
      attributes: ['time']
    });
    const bookedTimes = appointments.map(a => a.time);

    let availableTimes = daySchedule.times.filter(time => !bookedTimes.includes(time));

    if (date === dateHelper.getTodayLocal()) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      availableTimes = availableTimes.filter(time => {
        const [hour, minute] = time.split(':').map(Number);
        return hour > currentHour || (hour === currentHour && minute > currentMinute);
      });
    }

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
    const { barberId, clientId, clientName, clientPhone, date, time, service, serviceDescription, price } = req.body;
    console.log('📝 Criando agendamento:', { barberId, clientName, clientPhone, date, time });

    const barber = await Barber.findByPk(barberId);
    if (!barber) return res.status(404).json({ error: 'Barbeiro não encontrado' });

    const existing = await Appointment.findOne({
      where: { barberId, date, time, status: { [Op.notIn]: ['cancelled'] } }
    });
    if (existing) return res.status(400).json({ error: 'Horário já ocupado' });

    const now = new Date();
    const appointmentDate = new Date(date + 'T' + time + ':00');
    if (appointmentDate < now) return res.status(400).json({ error: 'Não é possível agendar em um horário que já passou.' });

    let client = null;
    if (clientId) client = await Client.findByPk(clientId);
    else if (clientPhone) {
      const result = await findOrCreateClient({ name: clientName || 'Cliente sem nome', phone: clientPhone, isActive: true });
      client = result.client;
    }
    if (!client) return res.status(400).json({ error: 'Cliente não encontrado ou não fornecido' });

    const appointmentDateObj = dateHelper.parseDateLocal(date);
    const dayOfWeek = appointmentDateObj.getDay();
    const diffToMonday = (dayOfWeek === 0) ? 6 : dayOfWeek - 1;
    const weekStartStr = dateHelper.subtractDays(date, diffToMonday);
    const weekEndStr = dateHelper.addDays(weekStartStr, 6);

    const existingAppointments = await Appointment.findAll({
      where: {
        clientId: client.id, barberId,
        date: { [Op.between]: [weekStartStr, weekEndStr] },
        status: { [Op.notIn]: ['cancelled'] }
      }
    });
    if (existingAppointments.length > 0) {
      return res.status(400).json({
        error: `Este cliente já possui um agendamento na semana de ${weekStartStr} a ${weekEndStr}. Não é permitido mais de um agendamento por semana para o mesmo barbeiro.`
      });
    }

    // 🔥 COMISSÃO respeitando isCommissioned
    const fakeAppt = { service, serviceDescription, price };
    const commission = await calculateCommission(fakeAppt, barber);

    const appointment = await Appointment.create({
      barberId, clientId: client.id, date, time,
      service: service || 'outro',
      serviceDescription: serviceDescription || '',
      price: price || 0, commission, status: 'pending',
    });

    console.log('✅ Agendamento criado:', appointment.id);

    const created = await Appointment.findByPk(appointment.id);
    const result = created.toJSON();
    if (created.clientId) result.Client = await Client.findByPk(created.clientId, { attributes: ['id', 'name', 'phone'] });
    if (created.barberId) result.Barber = await Barber.findByPk(created.barberId, { attributes: ['id', 'name'] });

    res.status(201).json(result);
  } catch (error) {
    console.error('❌ Erro ao criar agendamento:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar agendamento' });
  }
};

// ============================================================
// UPDATE STATUS
// ============================================================
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const appointment = await Appointment.findByPk(id);
    if (!appointment) return res.status(404).json({ error: 'Agendamento não encontrado' });

    const oldStatus = appointment.status;
    await appointment.update({ status });

    let cashRegister = null;
    let cashRegisterStatus = 'closed';
    let revenueCreated = false;

    if (status === 'completed' && oldStatus !== 'completed') {
      const hoje = dateHelper.getTodayLocal();

      if (appointment.date !== hoje) {
        await appointment.update({ date: hoje });
      }

      cashRegister = await CashRegister.findOne({
        where: { date: hoje, isOpen: true, userId: req.userId }
      });

      const barber = await Barber.findByPk(appointment.barberId);
      const barberName = barber?.name || 'Barbeiro';

      // 🔥 COMISSÃO respeitando isCommissioned
      const commission = await calculateCommission(appointment, barber);

      const client = await Client.findByPk(appointment.clientId);
      const clientName = client?.name || 'Cliente';
      const serviceName = appointment.serviceDescription || appointment.service || 'Serviço';

      if (cashRegister) {
        cashRegisterStatus = 'open';
        const services = cashRegister.services || [];
        const totalRevenue = cashRegister.totalRevenue || 0;
        const totalCommissions = cashRegister.totalCommissions || 0;

        services.push({
          id: appointment.id,
          type: 'service',
          client: clientName,
          clientId: appointment.clientId,
          barberId: appointment.barberId,
          barberName, barbeiro: barberName,
          barbeiroId: appointment.barberId,
          service: serviceName, servico: serviceName,
          serviceDescription: appointment.serviceDescription || '',
          serviceId: appointment.service || '',
          price: appointment.price || 0,
          commission, comissao: commission,
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

        try {
          const revenue = await Revenue.create({
            cashRegisterId: cashRegister.id,
            barberId: appointment.barberId,
            clientId: appointment.clientId,
            date: hoje,
            total: appointment.price || 0,
            commissions: commission,
            servicesCount: 1,
            clientName, barberName,
            service: serviceName,
            serviceDescription: appointment.serviceDescription || '',
            status: 'confirmed',
          });
          revenueCreated = true;
        } catch (error) {
          console.error('❌ Erro ao criar Revenue:', error);
        }
      } else {
        try {
          const revenue = await Revenue.create({
            cashRegisterId: null,
            barberId: appointment.barberId,
            clientId: appointment.clientId,
            date: hoje,
            total: appointment.price || 0,
            commissions: commission,
            servicesCount: 1,
            clientName, barberName,
            service: serviceName,
            serviceDescription: appointment.serviceDescription || '',
            status: 'pending',
          });
          revenueCreated = true;
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

    res.json({
      ...updated.toJSON(),
      cashRegisterStatus,
      revenueCreated,
      message: status === 'completed'
        ? (cashRegister ? '✅ Serviço concluído e enviado para o caixa e histórico!' : '✅ Serviço concluído e registrado no histórico (caixa fechado).')
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
    if (!appointment) return res.status(404).json({ error: 'Agendamento não encontrado' });
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
    if (!q || q.length < 2) return res.json([]);

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
    const appointment = await Appointment.findByPk(id);
    if (!appointment) return res.status(404).json({ error: 'Agendamento não encontrado' });

    let client = null, barber = null;
    if (appointment.clientId) client = await Client.findByPk(appointment.clientId, { attributes: ['id', 'name', 'phone'] });
    if (appointment.barberId) barber = await Barber.findByPk(appointment.barberId, { attributes: ['id', 'name', 'email', 'phone'] });

    res.json({ ...appointment.toJSON(), Client: client, Barber: barber });
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
    if (!barberId || !date) return res.status(400).json({ error: 'Barbeiro e data são obrigatórios' });

    const appointments = await Appointment.findAll({
      where: { barberId, date, status: { [Op.notIn]: ['cancelled'] } },
      attributes: ['time']
    });

    const cashRegister = await CashRegister.findOne({ where: { date, isOpen: true } });
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
    if (!barberId || !month) return res.status(400).json({ error: 'barberId e month são obrigatórios' });

    const barber = await Barber.findByPk(barberId);
    if (!barber) return res.status(404).json({ error: 'Barbeiro não encontrado' });

    const [year, mes] = month.split('-').map(Number);
    if (!year || !mes || mes < 1 || mes > 12) return res.status(400).json({ error: 'Mês inválido' });

    const schedule = barber.schedule || {};
    const daysInMonth = new Date(year, mes, 0).getDate();
    const availableDates = [];
    const todayStr = dateHelper.getTodayLocal();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(mes).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (dateStr < todayStr) continue;

      const dayOfWeek = dateHelper.getDayOfWeekEn(dateStr);
      const daySchedule = schedule[dayOfWeek];
      if (!daySchedule || !daySchedule.enabled || daySchedule.times.length === 0) continue;

      const appointments = await Appointment.findAll({
        where: { barberId, date: dateStr, status: { [Op.notIn]: ['cancelled'] } },
        attributes: ['time']
      });
      const bookedTimes = appointments.map(a => a.time);

      let timesToCheck = daySchedule.times;
      if (dateStr === todayStr) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        timesToCheck = timesToCheck.filter(time => {
          const [hour, minute] = time.split(':').map(Number);
          return hour > currentHour || (hour === currentHour && minute > currentMinute);
        });
      }

      const hasAvailable = timesToCheck.some(time => !bookedTimes.includes(time));
      if (hasAvailable) availableDates.push(dateStr);
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