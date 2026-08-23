const { Barber, User } = require('../models');
const bcrypt = require('bcryptjs');

const getAll = async (req, res) => {
  try {
    const { includeInactive } = req.query;
    const where = { isActive: true};
    
    // 🔥 POR PADRÃO, NÃO MOSTRAR INATIVOS
    if (includeInactive !== 'true') {
      where.isActive = true;
    }
    
    const barbers = await Barber.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',  // 🔥 ADICIONAR
          attributes: ['id', 'name', 'email', 'isActive'],
        },
      ],
      order: [['name', 'ASC']],
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
          as: 'user',  // 🔥 ADICIONAR
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

// 🔥 CORRIGIDO - CREATE
const create = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      phone, 
      username, 
      password, 
      serviceCommissionRate,
      productCommissionRate,
      isActive 
    } = req.body;

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
      isActive: isActive !== undefined ? isActive : true,
    });

    // Criar barbeiro
    const barber = await Barber.create({
      userId: user.id,
      name,
      email,
      phone,
      username,
      password,
      serviceCommissionRate: serviceCommissionRate || 0.5,
      productCommissionRate: productCommissionRate || 0.5,
      isActive: isActive !== undefined ? isActive : true,
    });

    console.log('✅ Barbeiro criado:', {
      id: barber.id,
      name: barber.name,
      serviceCommissionRate: barber.serviceCommissionRate,
      productCommissionRate: barber.productCommissionRate,
    });

    res.status(201).json(barber);
  } catch (error) {
    console.error('❌ Erro ao criar barbeiro:', error);
    res.status(500).json({ error: 'Erro ao criar barbeiro' });
  }
};

// 🔥 CORRIGIDO - UPDATE
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      email, 
      phone, 
      username, 
      password, 
      serviceCommissionRate,
      productCommissionRate,
      isActive 
    } = req.body;

    const barber = await Barber.findByPk(id);
    if (!barber) {
      return res.status(404).json({ error: 'Barbeiro não encontrado' });
    }

    // Atualizar usuário
    const user = await User.findByPk(barber.userId);
    if (user) {
      await user.update({ 
        name, 
        email, 
        isActive: isActive !== undefined ? isActive : true 
      });
    }

    // Atualizar barbeiro
    const updateData = { 
      name, 
      email, 
      phone, 
      username,
      serviceCommissionRate,
      productCommissionRate,
      isActive: isActive !== undefined ? isActive : true,
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    await barber.update(updateData);

    console.log('✅ Barbeiro atualizado:', {
      id: barber.id,
      name: barber.name,
      serviceCommissionRate: barber.serviceCommissionRate,
      productCommissionRate: barber.productCommissionRate,
    });

    // Buscar o barbeiro atualizado
    const updatedBarber = await Barber.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',  // 🔥 ADICIONAR
          attributes: ['id', 'name', 'email', 'isActive'],
        },
      ],
    });

    res.json(updatedBarber);
  } catch (error) {
    console.error('❌ Erro ao atualizar barbeiro:', error);
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

    await barber.update({ isActive: false });
    
    const user = await User.findByPk(barber.userId);
    if (user) {
      await user.update({ isActive: false });
    }

    res.json({ 
      message: 'Barbeiro desativado com sucesso',
      barber: { ...barber.toJSON(), isActive: false }
    });
  } catch (error) {
    console.error('Erro ao desativar barbeiro:', error);
    res.status(500).json({ error: 'Erro ao desativar barbeiro' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};