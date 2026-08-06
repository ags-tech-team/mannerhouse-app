const { Client } = require('../models');

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
    const { name, email, phone } = req.body;
    
    // Verificar se email já existe
    const existing = await Client.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }
    
    const client = await Client.create({ name, email, phone });
    res.status(201).json(client);
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ error: 'Erro ao criar cliente' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, isActive } = req.body;
    
    const client = await Client.findByPk(id);
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    await client.update({ name, email, phone, isActive });
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

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};