const { Client } = require('../models');
const { Op } = require('sequelize');

const getAll = async (req, res) => {
  try {
    const clients = await Client.findAll({
      order: [['createdAt', 'DESC']],
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
    const client = await Client.findByPk(id);
    
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    res.json(client);
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({ error: 'Erro ao buscar cliente' });
  }
};

const create = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      phone, 
      isMonthly, 
      monthlyFee, 
      isActive 
    } = req.body;
    
    console.log('📝 Criando cliente:', { name, email, phone, isMonthly, monthlyFee, isActive });
    
    const existing = await Client.findOne({ where: { phone } });
    if (existing) {
      return res.status(400).json({ error: 'Telefone já cadastrado' });
    }
    
    // 🔥 AGORA SALVA TODOS OS CAMPOS
    const client = await Client.create({
      name,
      email: email || null,
      phone,
      isMonthly: isMonthly || false,
      monthlyFee: monthlyFee || 0,
      isActive: isActive !== undefined ? isActive : true,
    });
    
    console.log('✅ Cliente criado:', client.toJSON());
    res.status(201).json(client);
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ error: 'Erro ao criar cliente' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, isMonthly, monthlyFee, isActive } = req.body;
    
    const client = await Client.findByPk(id);
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    await client.update({
      name,
      email: email || null,
      phone,
      isMonthly: isMonthly !== undefined ? isMonthly : client.isMonthly,
      monthlyFee: monthlyFee !== undefined ? monthlyFee : client.monthlyFee,
      isActive: isActive !== undefined ? isActive : client.isActive,
    });
    
    console.log('✅ Cliente atualizado:', client.toJSON());
    res.json(client);
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ error: 'Erro ao atualizar cliente' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const client = await Client.findByPk(id);
    
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    await client.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar cliente:', error);
    res.status(500).json({ error: 'Erro ao deletar cliente' });
  }
};

const search = async (req, res) => {
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
  getById,
  create,
  update,
  remove,
  search,
};
