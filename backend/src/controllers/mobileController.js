const { User, Barber, Appointment, Client } = require('../models');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// 🔐 Login do barbeiro
const mobileLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const user = await User.findOne({
      where: { email },
      include: [{ model: Barber, as: 'barber' }]
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Permitir apenas barbeiros (role 'barber')
    if (user.role !== 'barber') {
      return res.status(403).json({ error: 'Acesso permitido apenas para barbeiros' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, barberId: user.barber?.id || null },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        barberId: user.barber?.id || null,
        barberName: user.barber?.name || null
      }
    });
  } catch (error) {
    console.error('❌ Erro no login mobile:', error);
    res.status(500).json({ error: 'Erro no login' });
  }
};

const getMobileAppointments = async (req, res) => {
  try {
    const { month, year, barberId } = req.query;
    const userBarberId = req.user.barberId;

    let startDate, endDate;
    if (month && year) {
      const mes = parseInt(month);
      const ano = parseInt(year);
      startDate = `${ano}-${String(mes).padStart(2, '0')}-01`;
      const lastDay = new Date(ano, mes, 0).getDate();
      endDate = `${ano}-${String(mes).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    } else {
      const hoje = new Date();
      const mes = hoje.getMonth() + 1;
      const ano = hoje.getFullYear();
      startDate = `${ano}-${String(mes).padStart(2, '0')}-01`;
      const lastDay = new Date(ano, mes, 0).getDate();
      endDate = `${ano}-${String(mes).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }

    const where = {
      date: { [Op.between]: [startDate, endDate] },
      status: { [Op.notIn]: ['cancelled'] }
    };

    // 🔥 Se o usuário tem barberId, filtrar por ele; senão, buscar todos
    const effectiveBarberId = barberId || userBarberId;
    if (effectiveBarberId) {
      where.barberId = effectiveBarberId;
    }

    const appointments = await Appointment.findAll({
      where,
      include: [
        { model: Client, as: 'client', attributes: ['id', 'name', 'phone'] },
        { model: Barber, as: 'barber', attributes: ['id', 'name'] }
      ],
      order: [['date', 'ASC'], ['time', 'ASC']]
    });

    res.json(appointments);
  } catch (error) {
    console.error('❌ Erro ao listar agendamentos mobile:', error);
    res.status(500).json({ error: 'Erro ao buscar agendamentos' });
  }
};

const updateMobileAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const appointment = await Appointment.findByPk(id);
    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    // 🔥 Permissão: admin, barbeiro sem barberId, ou dono do agendamento
    const isAdmin = req.user.role === 'admin';
    const isBarberWithoutBarberId = req.user.role === 'barber' && !req.user.barberId;
    const isOwner = appointment.barberId === req.user.barberId;

    if (!isAdmin && !isBarberWithoutBarberId && !isOwner) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    await appointment.update({ status });
    res.json({ message: 'Status atualizado com sucesso', appointment });
  } catch (error) {
    console.error('❌ Erro ao atualizar status:', error);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
};

const updateMobileAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, serviceDescription, time } = req.body;

    const appointment = await Appointment.findByPk(id);
    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    const isAdmin = req.user.role === 'admin';
    const isBarberWithoutBarberId = req.user.role === 'barber' && !req.user.barberId;
    const isOwner = appointment.barberId === req.user.barberId;

    if (!isAdmin && !isBarberWithoutBarberId && !isOwner) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    await appointment.update({
      notes: notes || appointment.notes,
      serviceDescription: serviceDescription || appointment.serviceDescription,
      time: time || appointment.time
    });

    res.json({ message: 'Agendamento atualizado', appointment });
  } catch (error) {
    console.error('❌ Erro ao editar agendamento:', error);
    res.status(500).json({ error: 'Erro ao editar agendamento' });
  }
};

const deleteMobileAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findByPk(id);
    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    const isAdmin = req.user.role === 'admin';
    const isBarberWithoutBarberId = req.user.role === 'barber' && !req.user.barberId;
    const isOwner = appointment.barberId === req.user.barberId;

    if (!isAdmin && !isBarberWithoutBarberId && !isOwner) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    await appointment.destroy();
    res.json({ message: 'Agendamento excluído com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao excluir agendamento:', error);
    res.status(500).json({ error: 'Erro ao excluir agendamento' });
  }
};

module.exports = {
  mobileLogin,
  getMobileAppointments,
  updateMobileAppointmentStatus,
  updateMobileAppointment,
  deleteMobileAppointment
};