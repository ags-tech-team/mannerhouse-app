const { Barber, User } = require('../models');
const bcrypt = require('bcryptjs');

const getAll = async (req, res) => {
  try {
    const barbers = await Barber.findAll({
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email', 'isActive'],
        },
      ],
    });
    res.json(barbers);
  } catch (error) {
    console.error('Erro ao buscar barbeiros:', error);
    res.status(500).json({ error: 'Erro ao buscar barbeiros' });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const barber = await Barber.findByPk(id, {
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email', 'isActive'],
        },
      ],
    });

    if (!barber) {
      return res.status(404).json({ error: 'Barbeiro não encontrado' });
    }

    res.json(barber);
  } catch (error) {
    console.error('Erro ao buscar barbeiro:', error);
    res.status(500).json({ error: 'Erro ao buscar barbeiro' });
  }
};

const create = async (req, res) => {
  try {
    const { name, email, phone, username, password, commissionRate = 0.20 } = req.body;

    // Verificar se email já existe
    const existingBarber = await Barber.findOne({ where: { email } });
    if (existingBarber) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Verificar se username já existe
    const existingUsername = await Barber.findOne({ where: { username } });
    if (existingUsername) {
      return res.status(400).json({ error: 'Username já cadastrado' });
    }

    // Criar usuário
    const user = await User.create({
      name,
      email,
      password,
      role: 'barber',
    });

    // Criar barbeiro
    const barber = await Barber.create({
      userId: user.id,
      name,
      email,
      phone,
      username,
      password,
      commissionRate,
    });

    res.status(201).json(barber);
  } catch (error) {
    console.error('Erro ao criar barbeiro:', error);
    res.status(500).json({ error: 'Erro ao criar barbeiro' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, username, password, commissionRate, isActive } = req.body;

    const barber = await Barber.findByPk(id);
    if (!barber) {
      return res.status(404).json({ error: 'Barbeiro não encontrado' });
    }

    // Atualizar usuário
    const user = await User.findByPk(barber.userId);
    if (user) {
      await user.update({ name, email, isActive });
    }

    // Atualizar barbeiro
    const updateData = { name, email, phone, username, commissionRate, isActive };
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    await barber.update(updateData);

    res.json(barber);
  } catch (error) {
    console.error('Erro ao atualizar barbeiro:', error);
    res.status(500).json({ error: 'Erro ao atualizar barbeiro' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const barber = await Barber.findByPk(id);
    if (!barber) {
      return res.status(404).json({ error: 'Barbeiro não encontrado' });
    }

    // Deletar usuário também
    await User.destroy({ where: { id: barber.userId } });
    await barber.destroy();

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar barbeiro:', error);
    res.status(500).json({ error: 'Erro ao deletar barbeiro' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};