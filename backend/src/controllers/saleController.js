const { Sale, Barber, Product, Client, CashRegister, Revenue } = require('../models');
const { Op } = require('sequelize');

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
          as: 'barber',  // 🔥 ADICIONAR
          attributes: ['id', 'name'],
          required: false
        },
        { 
          model: Product, 
          as: 'product',  // 🔥 ADICIONAR
          attributes: ['id', 'name', 'price', 'costPrice'],
          required: false
        },
        { 
          model: Client, 
          as: 'client',  // 🔥 ADICIONAR
          attributes: ['id', 'name'],
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

// 🔥 FUNÇÃO FALTANTE: Resumo de vendas
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
      clientName 
    } = req.body;
    
    // Buscar produto
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    
    // Verificar estoque
    if (product.stock < quantity) {
      return res.status(400).json({ 
        error: `Estoque insuficiente. Disponível: ${product.stock}` 
      });
    }
    
    // Buscar barbeiro
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

      // 🔥 ADICIONAR ESTE BLOCO
      if (!cashRegister) {
        return res.status(400).json({ 
          error: '⚠️ Caixa fechado! Abra o caixa antes de realizar uma venda.' 
        });
      }
    
    // Criar cliente
    let client = null;
    if (clientId) {
      client = await Client.findByPk(clientId);
    } else if (clientName) {
      client = await Client.create({
        name: clientName,
        email: `${clientName.toLowerCase().replace(/\s/g, '')}@cliente.com`,
        phone: '(00) 00000-0000',
        isActive: true,
      });
    }
    
    // 🔥 CALCULAR LUCRO E COMISSÃO (COM VERIFICAÇÃO hasCommission)
    const profit = (product.price - product.costPrice) * quantity;
    let commission = 0;
    
    // 🔥 SÓ CALCULA COMISSÃO SE O PRODUTO TIVER COMISSÃO ATIVA
    if (product.hasCommission) {
      commission = profit * barber.productCommissionRate;
    }
    
    // Criar venda
    const sale = await Sale.create({
      barberId,
      clientId: client?.id || null,
      productId,
      quantity,
      salePrice: product.price,
      costPrice: product.costPrice,
      profit,
      commission,
      date: hoje,
      paymentMethod: paymentMethod || 'dinheiro',
    });
    
    // Atualizar estoque
    await product.update({ 
      stock: product.stock - quantity 
    });
    
    // SE O CAIXA ESTIVER ABERTO, ADICIONA AO CAIXA
    if (cashRegister) {
      const services = cashRegister.services || [];
      const totalRevenue = cashRegister.totalRevenue || 0;
      const totalCommissions = cashRegister.totalCommissions || 0;
      
      services.push({
        id: sale.id,
        type: 'product',
        client: client?.name || clientName || 'Cliente',
        product: product.name,
        quantity,
        price: product.price,
        commission,
        hasCommission: product.hasCommission, // 🔥 ADICIONAR
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
    } else {
      console.log(`⚠️ Caixa fechado. Venda registrada diretamente no faturamento.`);
      
      await Revenue.create({
        cashRegisterId: null,
        date: hoje,
        total: product.price * quantity,
        commissions: commission,
        servicesCount: 1,
        initialCash: 0,
        finalCash: product.price * quantity,
      });
    }

    const created = await Sale.findByPk(sale.id, {
      include: [
        { model: Barber, as: 'barber', attributes: ['id', 'name'] },
        { model: Product, as: 'product', attributes: ['id', 'name', 'price', 'costPrice', 'hasCommission'] },
        { model: Client, as: 'client', attributes: ['id', 'name'] },
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

// 🔥 EXPORTAR TODAS AS FUNÇÕES
module.exports = {
  getAll,
  getSummary,
  create,
};