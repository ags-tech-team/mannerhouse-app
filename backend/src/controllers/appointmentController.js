const { Appointment, Barber, Client, CashRegister, Revenue } = require('../models');
const { Op } = require('sequelize');
const { findOrCreateClient } = require('../services/clientService');

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
      include: [
        { 
          model: Barber, 
          as: 'barber',  // 🔥 ADICIONAR
          attributes: ['id', 'name', 'email', 'phone'],
          required: false
        },
        { 
          model: Client, 
          as: 'client',  // 🔥 ADICIONAR
          attributes: ['id', 'name', 'phone'],
          required: false
        }
      ],
      order: [['date', 'ASC'], ['time', 'ASC']],
    });
    
    res.json(appointments);
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
      include: [
        { 
          model: Client, 
          as: 'client',  // 🔥 ADICIONAR
          attributes: ['id', 'name', 'phone']
        }
      ],
      order: [['time', 'ASC']],
    });
    
    res.json(appointments);
  } catch (error) {
    console.error('Erro ao buscar agendamentos do barbeiro:', error);
    res.status(500).json({ error: 'Erro ao buscar agendamentos' });
  }
};

// Buscar horários disponíveis de um barbeiro em um dia
const getAvailableTimes = async (req, res) => {
  try {
    const { barberId } = req.params;
    const { date } = req.query;
    
    const allTimes = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
      '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
    ];
    
    const appointments = await Appointment.findAll({
      where: {
        barberId,
        date,
        status: { [Op.notIn]: ['cancelled'] }
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
    
    // 🔥 BUSCAR OU CRIAR CLIENTE PELO TELEFONE
    let client = null;
    
    if (clientId) {
      client = await Client.findByPk(clientId);
    } else if (clientPhone) {
      // 🔥 USAR SERVIÇO CENTRALIZADO
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
    
    // Calcular comissão
    const commission = (price || 0) * (barber.serviceCommissionRate || 0.50);
    
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
      notes,
    });
    
    console.log('✅ Agendamento criado:', appointment.id);
    
    const created = await Appointment.findByPk(appointment.id, {
      include: [
       { model: Barber, as: 'barber', attributes: ['id', 'name'] },  
       { model: Client, as: 'client', attributes: ['id', 'name', 'phone'] }
      ],
    });
    
    res.status(201).json(created);
  } catch (error) {
    console.error('❌ Erro ao criar agendamento:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar agendamento' });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const appointment = await Appointment.findByPk(id, {
      include: [
        { model: Barber, as: 'barber' }, 
        { model: Client, as: 'client' }
      ]
    });
    
    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    
    const oldStatus = appointment.status;
    await appointment.update({ status });
    
    let cashRegister = null;
    let cashRegisterStatus = 'closed';
    
    if (status === 'completed' && oldStatus !== 'completed') {
      const hoje = new Date().toISOString().split('T')[0];
      
      // 🔥 BUSCAR CAIXA
      cashRegister = await CashRegister.findOne({
        where: {
          date: hoje,
          isOpen: true,
          userId: req.userId,
        }
      });
      
      // 🔥 VERIFICAR SE O CAIXA ESTÁ ABERTO - ANTES DE CONTINUAR
      if (!cashRegister) {
        // Reverter o status se não tiver caixa aberto
        await appointment.update({ status: oldStatus });
        return res.status(400).json({ 
          error: '⚠️ Caixa fechado! Abra o caixa antes de concluir o agendamento.',
          cashRegisterStatus: 'closed'
        });
      }
      
      cashRegisterStatus = 'open';
      
      const commission = (appointment.price || 0) * (appointment.Barber?.serviceCommissionRate || 0.50);
      
      // 🔥 ADICIONAR AO CAIXA (cashRegister existe com certeza aqui)
      const services = cashRegister.services || [];
      const totalRevenue = cashRegister.totalRevenue || 0;
      const totalCommissions = cashRegister.totalCommissions || 0;
      
      services.push({
        id: appointment.id,
        type: 'service',
        client: appointment.Client?.name || 'Cliente',
        barberId: appointment.barberId,
        barberName: appointment.Barber?.name || 'Barbeiro',
        service: appointment.service,
        price: appointment.price || 0,
        commission,
        paymentMethod: 'dinheiro',
        time: appointment.time,
      });
      
      await cashRegister.update({
        services,
        totalRevenue: totalRevenue + (appointment.price || 0),
        totalCommissions: totalCommissions + commission,
        servicesCount: services.length,
      });
      
      console.log(`✅ Serviço ${id} concluído e adicionado ao caixa.`);
    }
    
    const updated = await Appointment.findByPk(id, {
      include: [
        { model: Barber, attributes: ['id', 'name', 'email', 'phone'] },
        { model: Client, attributes: ['id', 'name', 'phone'] }
      ],
    });
    
    res.json({
      ...updated.toJSON(),
      cashRegisterStatus: cashRegisterStatus,
      message: status === 'completed' 
        ? (cashRegister 
            ? 'Serviço concluído e enviado para o caixa' 
            : 'Serviço concluído. Caixa fechado, registro direto no faturamento.')
        : 'Status atualizado'
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar status:', error);
    res.status(500).json({ error: 'Erro ao atualizar status', details: error.message });
  }
};

// Deletar agendamento
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

module.exports = {
  getAll,
  getByBarber,
  getAvailableTimes,
  create,
  updateStatus,
  remove,
  searchClients,
};