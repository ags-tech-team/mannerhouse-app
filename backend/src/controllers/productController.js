const { Product, Sale } = require('../models');
const { Op } = require('sequelize');

const getAll = async (req, res) => {
  try {
    const { category, search, includeInactive } = req.query;
    const where = {};
    
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

// 🔥 CORRIGIDO — só atualiza `stock` se explicitamente enviado com flag
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, description, price, costPrice, stock, 
      category, isActive, hasCommission,
      updateStock, // 🔥 flag: só altera estoque se o frontend mandar `true`
    } = req.body;
    
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    
    const payload = {
      name: name || product.name,
      description: description !== undefined ? description : product.description,
      price: price !== undefined ? parseFloat(price) : product.price,
      costPrice: costPrice !== undefined ? parseFloat(costPrice) : product.costPrice,
      category: category || product.category,
      isActive: isActive !== undefined ? isActive : product.isActive,
      hasCommission: hasCommission !== undefined ? hasCommission : product.hasCommission,
    };

    // 🔥 Só altera estoque se o frontend marcar `updateStock: true`
    // ou se NÃO houver vendas associadas (produto novo sendo cadastrado).
    if (updateStock === true && stock !== undefined) {
      payload.stock = parseInt(stock);
      console.log(`📦 Estoque alterado manualmente: ${product.name} ${product.stock} → ${payload.stock}`);
    } else if (stock !== undefined && stock !== product.stock) {
      console.log(`⚠️ Estoque enviado (${stock}) ≠ atual (${product.stock}) mas updateStock!=true — ignorado`);
    }
    
    await product.update(payload);
    
    res.json(product);
  } catch (error) {
    console.error('❌ Erro ao atualizar produto:', error);
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    
    const salesCount = await Sale.count({
      where: { productId: id }
    });
    
    if (salesCount > 0) {
      await product.update({ isActive: false });
      console.log(`📦 Produto ${product.name} desativado (tem ${salesCount} vendas associadas)`);
      return res.json({
        message: 'Produto desativado com sucesso! (possui vendas associadas)',
        product: product,
        action: 'deactivated',
        salesCount
      });
    } else {
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