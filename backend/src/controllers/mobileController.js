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

    // Verificar se é um barbeiro (role 'barber')
    if (user.role !== 'barber') {
      return res.status(403).json({ error: 'Acesso permitido apenas para barbeiros' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Gerar token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, barberId: user.barber?.id },
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
        barberId: user.barber?.id,
        barberName: user.barber?.name
      }
    });
  } catch (error) {
    console.error('❌ Erro no login mobile:', error);
    res.status(500).json({ error: 'Erro no login' });
  }
};

// 📅 Listar agendamentos do barbeiro (com filtro de mês)
const getMobileAppointments = async (req, res) => {
  try {
    const { month, year } = req.query;
    const barberId = req.user.barberId;
    if (!barberId) {
      return res.status(400).json({ error: 'Barbeiro não associado ao usuário' });
    }

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

    const appointments = await Appointment.findAll({
      where: {
        barberId,
        date: { [Op.between]: [startDate, endDate] },
        status: { [Op.notIn]: ['cancelled'] }
      },
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

// ✅ Atualizar status (confirmar)
const updateMobileAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'completed', 'cancelled', etc.

    const appointment = await Appointment.findByPk(id);
    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    // Verificar se o agendamento pertence ao barbeiro logado
    if (appointment.barberId !== req.user.barberId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    await appointment.update({ status });
    res.json({ message: 'Status atualizado com sucesso', appointment });
  } catch (error) {
    console.error('❌ Erro ao atualizar status:', error);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
};

// ✏️ Editar agendamento (ex: notas)
const updateMobileAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, serviceDescription, time } = req.body;

    const appointment = await Appointment.findByPk(id);
    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    if (appointment.barberId !== req.user.barberId) {
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

// 🗑️ Excluir agendamento
const deleteMobileAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findByPk(id);
    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    if (appointment.barberId !== req.user.barberId) {
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