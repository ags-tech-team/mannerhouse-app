const { Sale, Barber, Product, Client, CashRegister, Revenue } = require('../models');
const { Op } = require('sequelize');
const { findOrCreateClient } = require('../services/clientService');

const getAll = async (req, res) => {
  try {
    const { startDate, endDate, barberId } = req.query;
    const where = {};
    
    if (startDate && endDate) {
      where.date = {
        [Op.between]: [startDate, endDate],
      };
    }
    if (barberId) where.barberId = barberId;
    
    const sales = await Sale.findAll({
      where,
      include: [
        { 
          model: Barber, 
          as: 'barber',
          attributes: ['id', 'name'],
          required: false
        },
        { 
          model: Product, 
          as: 'product',
          attributes: ['id', 'name', 'price', 'costPrice'],
          required: false
        },
        { 
          model: Client, 
          as: 'client',
          attributes: ['id', 'name', 'phone'],
          required: false
        },
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
    });
    
    res.json(sales);
  } catch (error) {
    console.error('Erro ao buscar vendas:', error);
    res.status(500).json({ error: 'Erro ao buscar vendas' });
  }
};

const getSummary = async (req, res) => {
  try {
    const { startDate, endDate, barberId } = req.query;
    const where = {};
    
    if (startDate && endDate) {
      where.date = {
        [Op.between]: [startDate, endDate],
      };
    }
    if (barberId) where.barberId = barberId;
    
    const sales = await Sale.findAll({ where });
    
    const summary = {
      totalSales: sales.length,
      totalRevenue: sales.reduce((sum, s) => sum + (s.salePrice * s.quantity), 0),
      totalProfit: sales.reduce((sum, s) => sum + (s.profit * s.quantity), 0),
      totalCommission: sales.reduce((sum, s) => sum + (s.commission * s.quantity), 0),
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Erro ao buscar resumo:', error);
    res.status(500).json({ error: 'Erro ao buscar resumo' });
  }
};

const create = async (req, res) => {
  try {
    const { 
      barberId, 
      clientId, 
      productId, 
      quantity = 1, 
      paymentMethod,
      clientName,
      clientPhone
    } = req.body;
    
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    
    if (product.stock < quantity) {
      return res.status(400).json({ 
        error: `Estoque insuficiente. Disponível: ${product.stock}` 
      });
    }
    
    const barber = await Barber.findByPk(barberId);
    if (!barber) {
      return res.status(404).json({ error: 'Barbeiro não encontrado' });
    }
    
    const hoje = new Date().toISOString().split('T')[0];
    const cashRegister = await CashRegister.findOne({
      where: {
        date: hoje,
        isOpen: true,
        userId: req.userId, 
      }
    });

    if (!cashRegister) {
      return res.status(400).json({ 
        error: '⚠️ Caixa fechado! Abra o caixa antes de realizar uma venda.' 
      });
    }
    
    // 🔥 BUSCAR OU CRIAR CLIENTE USANDO O SERVIÇO
    let client = null;
    if (clientId) {
      client = await Client.findByPk(clientId);
    } else if (clientName) {
      try {
        const result = await findOrCreateClient({
          name: clientName,
          phone: clientPhone || '(00) 00000-0000',
          isActive: true,
        });
        client = result.client;
        console.log(`✅ Cliente ${result.created ? 'criado' : 'encontrado'}: ${client.name} (${client.phone})`);
      } catch (error) {
        console.error('❌ Erro ao buscar/criar cliente:', error);
        return res.status(400).json({ error: error.message || 'Erro ao processar cliente' });
      }
    }
    
    if (!client) {
      return res.status(400).json({ error: 'Cliente não encontrado ou não fornecido' });
    }
    
    const profit = (product.price - product.costPrice) * quantity;
    let commission = 0;
    
    if (product.hasCommission) {
      commission = profit * barber.productCommissionRate;
    }
    
    const sale = await Sale.create({
      barberId,
      clientId: client.id,
      productId,
      quantity,
      salePrice: product.price,
      costPrice: product.costPrice,
      profit,
      commission,
      date: hoje,
      paymentMethod: paymentMethod || 'dinheiro',
    });
    
    await product.update({ 
      stock: product.stock - quantity 
    });
    
    if (cashRegister) {
      const services = cashRegister.services || [];
      const totalRevenue = cashRegister.totalRevenue || 0;
      const totalCommissions = cashRegister.totalCommissions || 0;
      
      services.push({
        id: sale.id,
        type: 'product',
        client: client.name,
        clientId: client.id,
        product: product.name,
        quantity,
        price: product.price * quantity,
        commission,
        hasCommission: product.hasCommission,
        paymentMethod: paymentMethod || 'dinheiro',
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      });
      
      await cashRegister.update({
        services,
        totalRevenue: totalRevenue + (product.price * quantity),
        totalCommissions: totalCommissions + commission,
        servicesCount: services.length,
      });
      
      console.log(`✅ Venda adicionada ao caixa. Total: R$ ${(product.price * quantity).toFixed(2)}`);
      console.log(`   Comissão: R$ ${commission.toFixed(2)} ${!product.hasCommission ? '(produto sem comissão)' : ''}`);
    }
    
    const created = await Sale.findByPk(sale.id, {
      include: [
        { model: Barber, as: 'barber', attributes: ['id', 'name'] },
        { model: Product, as: 'product', attributes: ['id', 'name', 'price', 'costPrice', 'hasCommission'] },
        { model: Client, as: 'client', attributes: ['id', 'name', 'phone'] },
      ],
    });
    
    res.status(201).json({
      ...created.toJSON(),
      cashRegisterStatus: cashRegister ? 'open' : 'closed',
      message: cashRegister 
        ? 'Venda registrada no caixa' 
        : 'Caixa fechado. Venda registrada diretamente no faturamento.'
    });
  } catch (error) {
    console.error('❌ Erro ao criar venda:', error);
    res.status(500).json({ error: 'Erro ao criar venda' });
  }
};

// 🔥 CORRIGIDO - DELETAR VENDA
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🗑️ Tentando excluir venda:', id);
    
    const sale = await Sale.findByPk(id, {
      include: [
        { 
          model: Product, 
          as: 'product',
          attributes: ['id', 'name', 'stock'] 
        }
      ]
    });
    
    if (!sale) {
      console.log('❌ Venda não encontrada:', id);
      return res.status(404).json({ error: 'Venda não encontrada' });
    }
    
    console.log('✅ Venda encontrada:', sale.id);
    
    // Restaurar estoque
    if (sale.product) {
      console.log(`📦 Restaurando estoque do produto ${sale.product.name}: +${sale.quantity}`);
      await sale.product.update({
        stock: (sale.product.stock || 0) + sale.quantity
      });
    }
    
    // Remover do caixa
    const hoje = new Date().toISOString().split('T')[0];
    const cashRegister = await CashRegister.findOne({
      where: {
        date: hoje,
        isOpen: true,
      }
    });
    
    if (cashRegister) {
      const services = cashRegister.services || [];
      const updatedServices = services.filter(s => s.id !== sale.id);
      
      const totalRevenue = updatedServices.reduce((sum, s) => sum + (s.price || 0), 0);
      const totalCommissions = updatedServices.reduce((sum, s) => sum + (s.commission || 0), 0);
      
      await cashRegister.update({
        services: updatedServices,
        totalRevenue: totalRevenue,
        totalCommissions: totalCommissions,
        servicesCount: updatedServices.length
      });
      
      console.log(`🗑️ Venda ${id} removida do caixa`);
    }
    
    await sale.destroy();
    
    console.log('✅ Venda excluída com sucesso!');
    res.json({ 
      message: 'Venda excluída com sucesso! Estoque restaurado.',
      product: sale.product?.name,
      quantity: sale.quantity
    });
  } catch (error) {
    console.error('❌ Erro ao deletar venda:', error);
    res.status(500).json({ error: 'Erro ao deletar venda', details: error.message });
  }
};

// 🔥 ATUALIZAR VENDA
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { salePrice, quantity, paymentMethod } = req.body;
    
    const sale = await Sale.findByPk(id, {
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'price', 'costPrice'] },
        { model: Barber, as: 'barber', attributes: ['id', 'name'] }
      ]
    });
    
    if (!sale) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }
    
    const newTotal = salePrice * quantity;
    const newCost = sale.product.costPrice * quantity;
    const newProfit = newTotal - newCost;
    const newCommission = newProfit * (sale.barber?.productCommissionRate || 0.5);
    
    await sale.update({
      salePrice,
      quantity,
      profit: newProfit,
      commission: newCommission,
      paymentMethod: paymentMethod || sale.paymentMethod
    });
    
    const hoje = new Date().toISOString().split('T')[0];
    const cashRegister = await CashRegister.findOne({
      where: {
        date: hoje,
        isOpen: true,
      }
    });
    
    if (cashRegister) {
      const services = cashRegister.services || [];
      const updatedServices = services.map(s => {
        if (s.id === sale.id) {
          return {
            ...s,
            price: salePrice * quantity,
            commission: newCommission,
            quantity: quantity
          };
        }
        return s;
      });
      
      const totalRevenue = updatedServices.reduce((sum, s) => sum + (s.price || 0), 0);
      const totalCommissions = updatedServices.reduce((sum, s) => sum + (s.commission || 0), 0);
      
      await cashRegister.update({
        services: updatedServices,
        totalRevenue,
        totalCommissions,
        servicesCount: updatedServices.length
      });
    }
    
    const updated = await Sale.findByPk(id, {
      include: [
        { model: Barber, as: 'barber', attributes: ['id', 'name'] },
        { model: Product, as: 'product', attributes: ['id', 'name', 'price', 'costPrice'] },
        { model: Client, as: 'client', attributes: ['id', 'name'] }
      ]
    });
    
    res.json(updated);
  } catch (error) {
    console.error('❌ Erro ao atualizar venda:', error);
    res.status(500).json({ error: 'Erro ao atualizar venda' });
  }
};

module.exports = {
  getAll,
  getSummary,
  create,
  remove,
  update,
};