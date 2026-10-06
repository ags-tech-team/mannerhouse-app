const { Appointment, Barber, Client, Service, Plan } = require('../models');
const { Op } = require('sequelize');
const dateHelper = require('../utils/dateHelper');

const findServiceByIdentifier = async (identifier) => {
  if (!identifier) return null;
  let svc = await Service.findOne({ where: { id: identifier } });
  if (svc) return svc;
  svc = await Service.findOne({ where: { name: identifier } });
  return svc;
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 🔥 HELPER: carrega planos do banco
const getPlanos = async () => {
  const plans = await Plan.findAll({ order: [['displayOrder', 'ASC']] });
  const map = {};
  plans.forEach(p => {
    map[p.id] = { name: p.name, price: p.price, days: p.days };
  });
  return map;
};

const getBarbers = async (req, res) => {
  try {
    const barbers = await Barber.findAll({
      where: { isActive: true, name: { [Op.notLike]: '%Luiz%' } },
      attributes: ['id', 'name', 'phone', 'serviceCommissionRate', 'schedule']
    });
    res.json(barbers);
  } catch (error) {
    console.error('❌ Erro ao buscar barbeiros:', error);
    res.status(500).json({ error: 'Erro ao buscar barbeiros' });
  }
};

const getAvailableTimes = async (req, res) => {
  try {
    const { barberId, date } = req.query;
    if (!barberId || !date) return res.status(400).json({ error: 'Barbeiro e data são obrigatórios' });
    if (!dateHelper.isValidDate(date)) return res.status(400).json({ error: 'Data inválida' });

    const barber = await Barber.findByPk(barberId);
    if (!barber) return res.status(404).json({ error: 'Barbeiro não encontrado' });

    const dayOfWeek = dateHelper.getDayOfWeekEn(date);
    if (!dayOfWeek) return res.status(400).json({ error: 'Data inválida para cálculo do dia da semana' });

    const schedule = barber.schedule || {};
    const daySchedule = schedule[dayOfWeek];

    let allTimes = [];
    if (daySchedule && daySchedule.enabled) {
      allTimes = daySchedule.times || [];
    } else {
      return res.json([]);
    }

    const appointments = await Appointment.findAll({
      where: { barberId, date, status: { [Op.notIn]: ['cancelled'] } },
      attributes: ['time']
    });

    const bookedTimes = appointments.map(app => app.time);
    let availableTimes = allTimes.filter(time => !bookedTimes.includes(time));

    const todayStr = dateHelper.getTodayLocal();
    if (date === todayStr) {
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
    console.error('❌ Erro ao buscar horários disponíveis:', error);
    res.status(500).json({ error: 'Erro ao buscar horários disponíveis' });
  }
};

// ==========================================
// CREATE APPOINTMENT
// ==========================================
const createAppointment = async (req, res) => {
  try {
    const { barberId, clientName, clientPhone, date, time, service, serviceDescription, price } = req.body;

    if (!dateHelper.isValidDate(date)) return res.status(400).json({ error: 'Data inválida' });
    if (dateHelper.isPastDate(date)) return res.status(400).json({ error: 'Não é possível agendar em datas passadas' });

    const barber = await Barber.findByPk(barberId);
    if (!barber) return res.status(404).json({ error: 'Barbeiro não encontrado' });

    const existing = await Appointment.findOne({
      where: { barberId, date, time, status: { [Op.notIn]: ['cancelled'] } }
    });
    if (existing) return res.status(400).json({ error: 'Horário já ocupado' });

    let client = await Client.findOne({ where: { phone: clientPhone } });

    // 🔥 BLOQUEIO
    if (client && client.isBlocked) {
      console.log(`🚫 Tentativa de agendamento de cliente bloqueado: ${client.name} (${client.phone})`);
      await delay(600);
      return res.status(400).json({
        error: '⚠️ Ocorreu um erro ao processar seu agendamento. Entre em contato conosco para resolver esse problema.'
      });
    }

    // 🔥 VALIDAÇÃO DE PLANO — dinâmica (lê do banco)
    if (client && client.isMonthly && client.planType) {
      const PLANOS = await getPlanos();
      const plan = PLANOS[client.planType];

      if (plan && Array.isArray(plan.days)) {
        const dateObj = dateHelper.parseDateLocal(date);
        const dayOfWeek = dateObj.getDay();

        if (!plan.days.includes(dayOfWeek)) {
          console.log(`🚫 Tentativa de agendamento em dia fora do plano: ${client.name} | ${plan.name} | ${date} (dia ${dayOfWeek})`);
          await delay(600);
          return res.status(400).json({
            error: `⚠️ Ocorreu um erro ao processar seu agendamento. Seu plano ${plan.name} cobre apenas os dias ${plan.days.includes(5) ? 'de segunda a sábado' : 'de segunda a quinta'}. Entre em contato para fazer upgrade.`
          });
        }
      }
    }

    if (!client) {
      client = await Client.create({
        name: clientName || 'Cliente sem nome',
        phone: clientPhone,
        isActive: true,
        isBlocked: false,
      });
    }

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
      const dates = existingAppointments.map(a => `${a.date} ${a.time}`).join(', ');
      return res.status(400).json({
        error: `Este cliente já possui agendamento(s) na semana (${weekStartStr} a ${weekEndStr}): ${dates}. Não é permitido mais de um agendamento por semana para o mesmo barbeiro.`
      });
    }

    const sameDayAppointments = await Appointment.findAll({
      where: { clientId: client.id, barberId, date, status: { [Op.notIn]: ['cancelled'] } }
    });
    if (sameDayAppointments.length > 0) {
      return res.status(400).json({
        error: `Este cliente já possui um agendamento no dia ${date}. Não é permitido dois agendamentos no mesmo dia para o mesmo barbeiro.`
      });
    }

    let isCommissioned = true;
    let foundService = null;
    if (service) foundService = await findServiceByIdentifier(service);
    if (!foundService && serviceDescription) foundService = await findServiceByIdentifier(serviceDescription);
    if (foundService && foundService.isCommissioned === false) isCommissioned = false;

    const commission = isCommissioned ? (price || 0) * (barber.serviceCommissionRate || 0.50) : 0;

    const appointment = await Appointment.create({
      barberId, clientId: client.id, date, time,
      service: service || 'outro',
      serviceDescription: serviceDescription || '',
      price: price || 0, commission, status: 'pending',
      notes: `Agendamento feito pelo site - Cliente: ${clientName}`,
    });

    console.log(`✅ Agendamento público ${appointment.id} criado para ${date} às ${time} | comissão R$ ${commission.toFixed(2)}`);

    const created = await Appointment.findByPk(appointment.id, {
      include: [
        { model: Barber, as: 'barber', attributes: ['id', 'name'] },
        { model: Client, as: 'client', attributes: ['id', 'name', 'phone'] }
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