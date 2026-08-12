const { Appointment, Barber, Client, CashRegister, Revenue } = require('../models');
const { Op } = require('sequelize');

// Buscar agendamentos com filtros
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
          attributes: ['id', 'name', 'email', 'phone'] 
        },
        { 
          model: Client, 
          attributes: ['id', 'name', 'email', 'phone'] 
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

// Buscar agendamentos de um barbeiro específico
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
          attributes: ['id', 'name', 'email', 'phone'] 
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
    
    // Horários padrão (09:00 às 18:00, de hora em hora)
    const allTimes = [
      '09:00', '10:00', '11:00', '12:00', 
      '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
    ];
    
    // Buscar horários já ocupados
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

// Criar agendamento
const create = async (req, res) => {
  try {
    const { 
      barberId, 
      clientId, 
      clientName,
      clientPhone, // 🔥 REMOVER clientEmail
      date, 
      time, 
      service, 
      serviceDescription,
      price,
      notes 
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
    let client = null;
    if (clientId) {
      client = await Client.findByPk(clientId);
    } else if (clientEmail) {
      client = await Client.findOne({ where: { email: clientEmail } });
    }
    
    if (!client && clientName) {
      // Criar novo cliente
      client = await Client.create({
        name: clientName,
        phone: clientPhone || '(00) 00000-0000',
        isActive: true,
      });
    }
    
    if (!client) {
      return res.status(400).json({ error: 'Cliente não encontrado ou não fornecido' });
    }
    
    // Calcular comissão
    const commission = price * barber.serviceCommissionRate;
    
    // Criar agendamento
    const appointment = await Appointment.create({
      barberId,
      clientId: client.id,
      date,
      time,
      service,
      serviceDescription: serviceDescription || '',
      price: price || 0,
      commission,
      status: 'pending',
      notes,
    });
    
    // Buscar agendamento criado com relacionamentos
    const created = await Appointment.findByPk(appointment.id, {
      include: [
        { 
          model: Barber, 
          attributes: ['id', 'name', 'email', 'phone'] 
        },
        { 
          model: Client, 
          attributes: ['id', 'name', 'email', 'phone'] 
        }
      ],
    });
    
    res.status(201).json(created);
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const appointment = await Appointment.findByPk(id, {
      include: [
        { model: Barber },
        { model: Client }
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
      
      cashRegister = await CashRegister.findOne({
        where: {
          date: hoje,
          isOpen: true,
          userId: req.userId,
        }
      });
      
      cashRegisterStatus = cashRegister ? 'open' : 'closed';
      
      // 🔥 BUSCAR O BARBEIRO PARA PEGAR O NOME
      const barber = await Barber.findByPk(appointment.barberId);
      const barberName = barber ? barber.name : 'Barbeiro';
      
      const commission = appointment.price * (barber ? barber.serviceCommissionRate : 0.20);
      
      if (cashRegister) {
        const services = cashRegister.services || [];
        const totalRevenue = cashRegister.totalRevenue || 0;
        const totalCommissions = cashRegister.totalCommissions || 0;
        
        services.push({
          id: appointment.id,
          type: 'service',
          client: appointment.Client?.name || 'Cliente',
          barberId: appointment.barberId,
          barberName: barberName, // 🔥 SALVAR O NOME DO BARBEIRO
          service: appointment.service,
          price: appointment.price,
          commission: commission,
          paymentMethod: 'dinheiro',
          time: appointment.time,
        });
        
        await cashRegister.update({
          services,
          totalRevenue: totalRevenue + appointment.price,
          totalCommissions: totalCommissions + commission,
          servicesCount: services.length,
        });
        
        console.log(`✅ Serviço ${id} concluído e adicionado ao caixa.`);
      } else {
        await Revenue.create({
          cashRegisterId: null,
          date: hoje,
          total: appointment.price,
          commissions: commission,
          servicesCount: 1,
          initialCash: 0,
          finalCash: appointment.price,
        });
        
        console.log(`⚠️ Caixa fechado. Serviço ${id} registrado diretamente no faturamento.`);
      }
    }
    
    const updated = await Appointment.findByPk(id, {
      include: [
        { model: Barber, attributes: ['id', 'name', 'email', 'phone'] },
        { model: Client, attributes: ['id', 'name', 'email', 'phone'] }
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

// Buscar clientes para auto-complete
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
          { email: { [Op.like]: `%${q}%` } },
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