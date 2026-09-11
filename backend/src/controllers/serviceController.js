const { Service } = require('../models');

// ============================================================
// GET ALL – Listar todos os serviços
// ============================================================
const getAll = async (req, res) => {
  try {
    const services = await Service.findAll({
      order: [
        ['category', 'ASC'],
        ['name', 'ASC'],
      ],
    });
    res.json(services);
  } catch (error) {
    console.error('❌ Erro ao buscar serviços:', error);
    res.status(500).json({ error: 'Erro ao buscar serviços' });
  }
};

// ============================================================
// GET BY ID
// ============================================================
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findByPk(id);
    if (!service) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }
    res.json(service);
  } catch (error) {
    console.error('❌ Erro ao buscar serviço:', error);
    res.status(500).json({ error: 'Erro ao buscar serviço' });
  }
};

// ============================================================
// CREATE – Criar novo serviço
// ============================================================
const create = async (req, res) => {
  try {
    const { id, name, price, category } = req.body;

    if (!id || !name || price === undefined || !category) {
      return res.status(400).json({
        error: 'Campos obrigatórios: id, name, price, category',
      });
    }

    // Verificar se já existe
    const existing = await Service.findByPk(id);
    if (existing) {
      return res.status(400).json({ error: 'Já existe um serviço com esse ID' });
    }

    const service = await Service.create({
      id: id.trim().toLowerCase().replace(/\s+/g, '-'),
      name: name.trim(),
      price: parseFloat(price),
      category,
      isActive: true,
    });

    console.log('✅ Serviço criado:', service.id);
    res.status(201).json(service);
  } catch (error) {
    console.error('❌ Erro ao criar serviço:', error);
    res.status(500).json({ error: 'Erro ao criar serviço' });
  }
};

// ============================================================
// UPDATE – Atualizar serviço
// ============================================================
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, category, isActive } = req.body;

    const service = await Service.findByPk(id);
    if (!service) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (price !== undefined) updateData.price = parseFloat(price);
    if (category !== undefined) updateData.category = category;
    if (isActive !== undefined) updateData.isActive = isActive;

    await service.update(updateData);

    console.log('✅ Serviço atualizado:', service.id);
    res.json(service);
  } catch (error) {
    console.error('❌ Erro ao atualizar serviço:', error);
    res.status(500).json({ error: 'Erro ao atualizar serviço' });
  }
};

// ============================================================
// DELETE – Remover serviço
// ============================================================
const remove = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await Service.findByPk(id);
    if (!service) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }

    // 🔥 Não permitir remover o mensalista (é usado em lógica de negócio)
    if (id === 'mensalista') {
      return res.status(400).json({ error: 'O serviço "mensalista" não pode ser removido' });
    }

    await service.destroy();
    console.log('✅ Serviço removido:', id);
    res.status(204).send();
  } catch (error) {
    console.error('❌ Erro ao remover serviço:', error);
    res.status(500).json({ error: 'Erro ao remover serviço' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};