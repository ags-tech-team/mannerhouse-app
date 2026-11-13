const { Sale, Barber, Product, Client, CashRegister, Revenue } = require('../models');
const { Op } = require('sequelize');
const { findOrCreateClient } = require('../services/clientService');
const dateHelper = require('../utils/dateHelper');

const { cardTotal, saleTotal } = require('../utils/cardPayment');

const getAll = async (req, res) => {
  try {
    const { startDate, endDate, barberId, month } = req.query;
    const where = {};
    
    // 🔥 CORRIGIDO: Aceita filtro por 'month' (YYYY-MM) ou startDate/endDate
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [year, mes] = month.split('-').map(Number);
      const start = `${year}-${String(mes).padStart(2, '0')}-01`;
      const lastDay = new Date(year, mes, 0).getDate();
      const end = `${year}-${String(mes).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      where.date = { [Op.between]: [start, end] };
    } else if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
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
          attributes: ['id', 'name', 'price', 'costPrice', 'hasCommission'], // 🔥 hasCommission adicionado
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
      totalRevenue: sales.reduce((sum, s) => sum + saleTotal(s), 0),
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
      paymentMethod: requestedMethod = 'dinheiro',
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
    
    const paymentMethod = requestedMethod === 'credito' ? 'cartao' : requestedMethod;
    if (!['dinheiro', 'pix', 'debito', 'cartao'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Forma de pagamento inválida' });
    }
    const hoje = dateHelper.getTodayLocal();
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
    
    if (product.hasCommission !== false) {
      commission = profit * (barber.productCommissionRate || 0.50); // 🔥 Usa a taxa do barbeiro
    }
    
    console.log(`📊 Produto: ${product.name}`);
    console.log(`   hasCommission: ${product.hasCommission}`);
    console.log(`   Profit: R$ ${profit.toFixed(2)}`);
    console.log(`   Taxa comissão: ${(barber.productCommissionRate * 100).toFixed(0)}%`);
    console.log(`   Comissão: R$ ${commission.toFixed(2)}`);
    
    const chargedTotal = cardTotal(product.price * quantity, paymentMethod);
    const sale = await Sale.create({
      barberId,
      clientId: client.id,
      productId,
      quantity,
      salePrice: product.price,
      chargedTotal,
      costPrice: product.costPrice,
      profit,
      commission,
      date: hoje,
      paymentMethod: paymentMethod || 'dinheiro',
    });
    
    await Product.decrement('stock', { by: quantity, where: { id: productId } });
    
    if (cashRegister) {
      const services = cashRegister.services || [];
      const totalRevenue = cashRegister.totalRevenue || 0;
      const totalCommissions = cashRegister.totalCommissions || 0;
      
      services.push({
        id: sale.id,
        type: 'product',
        saleId: sale.id,
        productId: product.id,
        client: client.name,
        clientId: client.id,
        product: product.name,
        quantity,
        price: chargedTotal,
        commission,
        hasCommission: product.hasCommission,
        paymentMethod: paymentMethod || 'dinheiro',
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        commissionRate: barber.productCommissionRate,
      });
      
      await cashRegister.update({
        services,
        totalRevenue: totalRevenue + chargedTotal,
        totalCommissions: totalCommissions + commission,
        servicesCount: services.length,
      });
      
      console.log(`✅ Venda adicionada ao caixa. Total: R$ ${chargedTotal.toFixed(2)}`);
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

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    
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
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    const hoje = dateHelper.getTodayLocal();
    const cashRegister = await CashRegister.findOne({
      where: {
        date: hoje,
        isOpen: true,
      }
    });

    let stillInCashRegister = false;
    if (cashRegister) {
      const services = cashRegister.services || [];
      stillInCashRegister = services.some(s => s.id === sale.id);
    }

    if (sale.product && !stillInCashRegister) {
      await Product.increment('stock', {
        by: sale.quantity,
        where: { id: sale.productId }
      });
    }
    
    if (cashRegister && stillInCashRegister) {
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
    }
    
    await sale.destroy();
    
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

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { salePrice, quantity, paymentMethod } = req.body;
    
    const sale = await Sale.findByPk(id, {
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'price', 'costPrice', 'hasCommission'] },
        { model: Barber, as: 'barber', attributes: ['id', 'name', 'productCommissionRate'] } // 🔥 Inclui taxa
      ]
    });
    
    if (!sale) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    const oldQty = sale.quantity;
    const newQty = Number(quantity) || oldQty;
    const diff = newQty - oldQty;
    if (diff !== 0) {
      if (diff > 0) {
        const product = await Product.findByPk(sale.productId);
        if (product && product.stock < diff) {
          return res.status(400).json({
            error: `Estoque insuficiente para "${product.name}". Disponível: ${product.stock}`,
          });
        }
        await Product.decrement('stock', { by: diff, where: { id: sale.productId } });
      } else {
        await Product.increment('stock', { by: Math.abs(diff), where: { id: sale.productId } });
      }
    }
    
    const basePrice = salePrice ?? sale.salePrice;
    const method = paymentMethod === 'credito' ? 'cartao' : paymentMethod || sale.paymentMethod;
    const chargedTotal = sale.chargedTotal != null || paymentMethod
      ? cardTotal(basePrice * newQty, method)
      : null;
    const newTotal = basePrice * newQty;
    const newCost = sale.product.costPrice * newQty;
    const newProfit = newTotal - newCost;
    const newCommission = sale.product.hasCommission === false ? 0 : newProfit * (sale.barber?.productCommissionRate || 0.5);
    
    await sale.update({
      salePrice: basePrice,
      chargedTotal,
      quantity: newQty,
      profit: newProfit,
      commission: newCommission,
      paymentMethod: method
    });
    
    const hoje = dateHelper.getTodayLocal();
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
            price: chargedTotal ?? newTotal,
            valor: chargedTotal ?? newTotal,
            paymentMethod: method,
            formaPagamento: method,
            commission: newCommission,
            quantity: newQty
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
        { model: Product, as: 'product', attributes: ['id', 'name', 'price', 'costPrice', 'hasCommission'] },
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