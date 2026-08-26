const { Product, Sale } = require('../models');
const { Op } = require('sequelize');

const getAll = async (req, res) => {
  try {
    const { category, search, includeInactive } = req.query;
    const where = {};
    
    // 🔥 POR PADRÃO, NÃO MOSTRA INATIVOS
    if (includeInactive !== 'true') {
      where.isActive = true;
    }
    
    if (category) where.category = category;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }
    
    const products = await Product.findAll({
      where,
      order: [['name', 'ASC']],
    });
    res.json(products);
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);
    
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    res.status(500).json({ error: 'Erro ao buscar produto' });
  }
};

const create = async (req, res) => {
  try {
    const { name, description, price, costPrice, stock, category, hasCommission } = req.body;
    
    console.log('📦 Criando produto:', { name, price, costPrice, stock });
    
    const product = await Product.create({
      name,
      description: description || '',
      price: parseFloat(price) || 0,
      costPrice: parseFloat(costPrice) || 0,
      stock: parseInt(stock) || 0,
      category: category || 'outros',
      hasCommission: hasCommission !== undefined ? hasCommission : true,
      isActive: true,
    });
    
    console.log('✅ Produto criado:', product.toJSON());
    
    res.status(201).json(product);
  } catch (error) {
    console.error('❌ Erro ao criar produto:', error);
    res.status(500).json({ error: 'Erro ao criar produto' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, costPrice, stock, category, isActive, hasCommission } = req.body;
    
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    
    await product.update({
      name: name || product.name,
      description: description !== undefined ? description : product.description,
      price: price !== undefined ? parseFloat(price) : product.price,
      costPrice: costPrice !== undefined ? parseFloat(costPrice) : product.costPrice,
      stock: stock !== undefined ? parseInt(stock) : product.stock,
      category: category || product.category,
      isActive: isActive !== undefined ? isActive : product.isActive,
      hasCommission: hasCommission !== undefined ? hasCommission : product.hasCommission,
    });
    
    res.json(product);
  } catch (error) {
    console.error('❌ Erro ao atualizar produto:', error);
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
};

// 🔥 CORRIGIDO: DELETE LÓGICO (DESATIVA) EM VEZ DE DELETE FÍSICO
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    
    // 🔥 VERIFICAR SE O PRODUTO TEM VENDAS
    const salesCount = await Sale.count({
      where: { productId: id }
    });
    
    if (salesCount > 0) {
      // 🔥 TEM VENDAS → DESATIVA
      await product.update({ isActive: false });
      console.log(`📦 Produto ${product.name} desativado (tem ${salesCount} vendas associadas)`);
      return res.json({
        message: 'Produto desativado com sucesso! (possui vendas associadas)',
        product: product,
        action: 'deactivated',
        salesCount
      });
    } else {
      // 🔥 NÃO TEM VENDAS → DELETA FÍSICO
      await product.destroy();
      console.log(`🗑️ Produto ${product.name} deletado fisicamente (sem vendas associadas)`);
      return res.json({
        message: 'Produto excluído com sucesso!',
        product: product,
        action: 'deleted'
      });
    }
  } catch (error) {
    console.error('❌ Erro ao deletar produto:', error);
    res.status(500).json({ error: 'Erro ao deletar produto', details: error.message });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};