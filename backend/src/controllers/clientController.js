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
    const { name, phone, isMonthly, monthlyFee, isActive } = req.body;
    
    console.log('📝 Criando/atualizando cliente:', { name, phone, isMonthly, monthlyFee });
    
    // 🔥 USAR O SERVIÇO CENTRALIZADO
    const { client, created } = await findOrCreateClient({
      name,
      phone,
      isMonthly: isMonthly || false,
      monthlyFee: monthlyFee || 0,
      isActive: isActive !== undefined ? isActive : true,
    });
    
    const message = created 
      ? 'Cliente criado com sucesso!' 
      : `Cliente já existe: ${client.name}`;
    
    console.log(`✅ ${message}`);
    res.status(created ? 201 : 200).json({
      client,
      created,
      message,
    });
  } catch (error) {
    console.error('❌ Erro ao criar cliente:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar cliente' });
  }
};


// 🔥 UPDATE COM VALIDAÇÃO DE NOME + TELEFONE
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, isMonthly, monthlyFee, isActive } = req.body;
    
    const client = await Client.findByPk(id);
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    // 🔥 VERIFICAR SE OUTRO CLIENTE JÁ TEM O MESMO NOME + TELEFONE
    const existing = await Client.findOne({
      where: {
        [Op.and]: [
          { name: name.trim() },
          { phone: phone.trim() },
          { id: { [Op.ne]: id } } // 🔥 EXCLUIR O PRÓPRIO CLIENTE
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