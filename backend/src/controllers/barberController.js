const { Barber, User } = require('../models');
const bcrypt = require('bcryptjs');

// ========== GET ALL ==========
const getAll = async (req, res) => {
  try {
    const { includeInactive } = req.query;
    const where = { isActive: true };
    
    if (includeInactive !== 'true') {
      where.isActive = true;
    }
    
    const barbers = await Barber.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
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

// ========== GET BY ID ==========
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const barber = await Barber.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
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

// ========== CREATE ==========
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
      isActive,
      weeklyAdvance // 🔥 NOVO: vale semanal inicial
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
      weeklyAdvance: weeklyAdvance || 0, // 🔥 NOVO: valor inicial
    });

    console.log('✅ Barbeiro criado:', {
      id: barber.id,
      name: barber.name,
      serviceCommissionRate: barber.serviceCommissionRate,
      productCommissionRate: barber.productCommissionRate,
      weeklyAdvance: barber.weeklyAdvance,
    });

    res.status(201).json(barber);
  } catch (error) {
    console.error('❌ Erro ao criar barbeiro:', error);
    res.status(500).json({ error: 'Erro ao criar barbeiro' });
  }
};

// ========== UPDATE ==========
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
      isActive,
      weeklyAdvance // 🔥 NOVO: permite atualizar o vale semanal
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

    // 🔥 SE O weeklyAdvance FOR ENVIADO, ADICIONA AO UPDATE
    if (weeklyAdvance !== undefined && weeklyAdvance !== null) {
      updateData.weeklyAdvance = weeklyAdvance;
    }

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    await barber.update(updateData);

    console.log('✅ Barbeiro atualizado:', {
      id: barber.id,
      name: barber.name,
      serviceCommissionRate: barber.serviceCommissionRate,
      productCommissionRate: barber.productCommissionRate,
      weeklyAdvance: barber.weeklyAdvance,
    });

    // Buscar o barbeiro atualizado
    const updatedBarber = await Barber.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
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

// ========== REMOVE (DESATIVAR) ==========
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

// ========== 🔥 NOVO: ATUALIZAR APENAS O WEEKLY ADVANCE ==========
const updateWeeklyAdvance = async (req, res) => {
  try {
    const { id } = req.params;
    const { weeklyAdvance, action } = req.body;

    // 🔥 action pode ser 'set' (substitui) ou 'add' (soma/subtrai)
    const barber = await Barber.findByPk(id);
    if (!barber) {
      return res.status(404).json({ error: 'Barbeiro não encontrado' });
    }

    let newAdvance = barber.weeklyAdvance;

    if (action === 'add') {
      // 🔥 ADICIONAR UM VALOR (ex: dar um vale)
      const value = parseFloat(weeklyAdvance) || 0;
      newAdvance = (barber.weeklyAdvance || 0) + value;
    } else if (action === 'set') {
      // 🔥 DEFINIR UM VALOR ESPECÍFICO (substituir)
      newAdvance = parseFloat(weeklyAdvance) || 0;
    } else if (action === 'reset') {
      // 🔥 RESETAR PARA ZERO (ex: começo da semana)
      newAdvance = 0;
    } else {
      // Fallback: set
      newAdvance = parseFloat(weeklyAdvance) || 0;
    }

    // 🔥 GARANTIR QUE NÃO FIQUE NEGATIVO
    if (newAdvance < 0) newAdvance = 0;

    await barber.update({ weeklyAdvance: newAdvance });

    console.log(`✅ WeeklyAdvance do barbeiro ${barber.name} atualizado: ${newAdvance}`);

    res.json({
      message: 'Vale semanal atualizado com sucesso!',
      barberId: barber.id,
      barberName: barber.name,
      weeklyAdvance: newAdvance,
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar vale semanal:', error);
    res.status(500).json({ error: 'Erro ao atualizar vale semanal' });
  }
};

// ========== 🔥 NOVO: RESETAR WEEKLY ADVANCE DE TODOS OS BARBEIROS ==========
const resetAllWeeklyAdvances = async (req, res) => {
  try {
    // 🔥 Resetar para 0 no início da semana (pode ser chamado manualmente ou por um cron job)
    const barbers = await Barber.findAll({ where: { isActive: true } });
    
    const updates = await Promise.all(barbers.map(async (barber) => {
      await barber.update({ weeklyAdvance: 0 });
      return { id: barber.id, name: barber.name };
    }));

    console.log(`✅ WeeklyAdvance resetado para ${updates.length} barbeiros`);
    
    res.json({
      message: 'Todos os vales semanais foram resetados para 0',
      count: updates.length,
      barbers: updates,
    });
  } catch (error) {
    console.error('❌ Erro ao resetar vales semanais:', error);
    res.status(500).json({ error: 'Erro ao resetar vales semanais' });
  }
};

// ========== EXPORTAR ==========
module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  updateWeeklyAdvance,  // 🔥 NOVO
  resetAllWeeklyAdvances, // 🔥 NOVO
};
