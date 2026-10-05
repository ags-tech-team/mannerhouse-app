const { Client } = require('../models');
const { Op } = require('sequelize');
const { findOrCreateClient } = require('../services/clientService');

const getAll = async (req, res) => {
  try {
    const clients = await Client.findAll({
      order: [['name', 'ASC']],
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
    if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json(client);
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({ error: 'Erro ao buscar cliente' });
  }
};

const create = async (req, res) => {
  try {
    const { name, phone, isMonthly, monthlyFee, isActive } = req.body;

    console.log('📝 Criando cliente:', { name, phone, isMonthly, monthlyFee });

    const existing = await Client.findOne({
      where: { phone: phone.trim(), isActive: true }
    });

    if (existing) {
      return res.status(409).json({
        error: 'TELEFONE_JA_EXISTE',
        message: `O telefone ${phone} já está cadastrado para o cliente: ${existing.name}`,
        client: existing
      });
    }

    const client = await Client.create({
      name: name.trim(),
      phone: phone.trim(),
      isMonthly: isMonthly || false,
      monthlyFee: monthlyFee || 0,
      isActive: isActive !== undefined ? isActive : true,
      isBlocked: false,
    });

    console.log('✅ Cliente criado:', client.toJSON());
    res.status(201).json({
      client,
      created: true,
      message: 'Cliente criado com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao criar cliente:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar cliente' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, isMonthly, monthlyFee, isActive, isBlocked } = req.body;

    const client = await Client.findByPk(id);
    if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

    const existing = await Client.findOne({
      where: {
        [Op.and]: [
          { name: name.trim() },
          { phone: phone.trim() },
          { id: { [Op.ne]: id } }
        ]
      }
    });

    if (existing) {
      return res.status(400).json({
        error: 'Já existe outro cliente com este nome e telefone',
        client: existing
      });
    }

    await client.update({
      name: name.trim(),
      phone: phone.trim(),
      isMonthly: isMonthly !== undefined ? isMonthly : client.isMonthly,
      monthlyFee: monthlyFee !== undefined ? monthlyFee : client.monthlyFee,
      isActive: isActive !== undefined ? isActive : client.isActive,
      isBlocked: isBlocked !== undefined ? isBlocked : client.isBlocked,
    });

    console.log('✅ Cliente atualizado:', client.toJSON());
    res.json(client);
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        error: 'Já existe um cliente com este nome e telefone',
        details: error.errors
      });
    }

    res.status(500).json({ error: 'Erro ao atualizar cliente' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const client = await Client.findByPk(id);
    if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

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
    if (!q || q.length < 2) return res.json([]);

    const clients = await Client.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${q}%` } },
          { phone: { [Op.like]: `%${q}%` } },
        ],
        isActive: true,
      },
      order: [['name', 'ASC']],
      limit: 10,
    });

    res.json(clients);
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    res.status(500).json({ error: 'Erro ao buscar clientes' });
  }
};

const blockClient = async (req, res) => {
  try {
    const { id } = req.params;
    const client = await Client.findByPk(id);
    if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

    await client.update({ isBlocked: true });
    console.log(`🔒 Cliente bloqueado: ${client.name} (${client.phone})`);
    res.json({ message: 'Cliente bloqueado', client });
  } catch (error) {
    console.error('Erro ao bloquear cliente:', error);
    res.status(500).json({ error: 'Erro ao bloquear cliente' });
  }
};

const unblockClient = async (req, res) => {
  try {
    const { id } = req.params;
    const client = await Client.findByPk(id);
    if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

    await client.update({ isBlocked: false });
    console.log(`🔓 Cliente desbloqueado: ${client.name} (${client.phone})`);
    res.json({ message: 'Cliente desbloqueado', client });
  } catch (error) {
    console.error('Erro ao desbloquear cliente:', error);
    res.status(500).json({ error: 'Erro ao desbloquear cliente' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  search,
  blockClient,
  unblockClient,
};