const { CashRegister, User, Revenue, Barber, Client, Service, Product, sequelize } = require('../models');
const { Op } = require('sequelize');
const { findOrCreateClient } = require('../services/clientService');
const dateHelper = require('../utils/dateHelper');

// ============================================================
// HELPERS
// ============================================================
const findServiceByIdentifier = async (identifier) => {
  if (!identifier) return null;
  let svc = await Service.findOne({ where: { id: identifier } });
  if (svc) return svc;
  svc = await Service.findOne({ where: { name: identifier } });
  return svc;
};

const calcularTotaisPorPagamento = (services = []) => {
  const totais = { dinheiro: 0, credito: 0, debito: 0, pix: 0, outros: 0 };
  services.forEach((s) => {
    const isMens = s.service && (s.service.toLowerCase().includes('mensal') || s.type === 'monthly');
    if (isMens) return;
    const price = s.price || s.valor || 0;
    const method = (s.paymentMethod || s.formaPagamento || 'dinheiro').toLowerCase();
    if (totais[method] !== undefined) totais[method] += price;
    else if (method === 'cartao' || method === 'cartão') totais.credito += price;
    else totais.outros += price;
  });
  return totais;
};

const isMensalidade = (s) => {
  return s.service && (
    s.service.toLowerCase().includes('mensal') ||
    s.service.toLowerCase().includes('mensalista') ||
    s.type === 'monthly' ||
    s.serviceId?.toLowerCase().includes('mensalista') ||
    s.serviceId?.toLowerCase().includes('mensal')
  );
};

// ============================================================
// 🔥 HELPER: calcular desconto e distribuir proporcionalmente
// ============================================================
const calcularDesconto = (subtotal, discountType, discountValue) => {
  if (!discountType || !discountValue || discountValue <= 0 || subtotal <= 0) {
    return 0;
  }
  let desc = 0;
  if (discountType === 'percentage') {
    desc = subtotal * (Number(discountValue) / 100);
  } else if (discountType === 'fixed') {
    desc = Number(discountValue);
  }
  return Math.min(desc, subtotal); // não pode passar do subtotal
};

// ============================================================
// 🔥 HELPER INTERNO: fecha caixa
// ============================================================
const fecharCaixaInterno = async (caixa, closedByBarberId = null) => {
  const services = caixa.services || [];
  const servicosReais = services.filter(s => !isMensalidade(s));
  const mensalidades = services.filter(s => isMensalidade(s));

  const totalRevenue = servicosReais.reduce((sum, s) => sum + Number(s.price || 0), 0);
  const totalCommissions = servicosReais.reduce((sum, s) => sum + Number(s.commission || 0), 0);
  const servicesCount = servicosReais.length;

  const closingLabel = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  await caixa.update({
    isOpen: false,
    closingTime: closingLabel,
    totalRevenue,
    totalCommissions,
    servicesCount,
    closedByBarberId: closedByBarberId || caixa.barberId || null,
  });

  let criados = 0, atualizados = 0;

  for (const service of servicosReais) {
    const barber = await Barber.findByPk(service.barberId);
    let clientName = 'Cliente';
    let clientId = service.clientId || null;

    if (service.clientId) {
      try {
        const client = await Client.findByPk(service.clientId);
        if (client) { clientName = client.name; clientId = client.id; }
      } catch (e) {}
    }
    if (clientName === 'Cliente' && service.client && !['', 'Cliente', 'Cliente sem cadastro'].includes(service.client)) {
      try {
        const client = await Client.findOne({ where: { name: service.client } });
        if (client) { clientName = client.name; clientId = client.id; }
        else clientName = service.client;
      } catch (e) { clientName = service.client; }
    }

    const sourceId = String(service.id);
    let revenue = await Revenue.findOne({ where: { sourceItemId: sourceId } });

    const payload = {
      cashRegisterId: caixa.id,
      barberId: service.barberId || null,
      clientId,
      date: caixa.date,
      total: Number(service.price || 0),
      commissions: Number(service.commission || 0),
      servicesCount: 1,
      clientName,
      barberName: barber?.name || 'Desconhecido',
      service: service.service || service.product || 'Serviço',
      serviceDescription: service.serviceDescription || '',
      sourceItemId: sourceId,
      status: 'confirmed',
    };

    if (revenue) { await revenue.update(payload); atualizados++; }
    else { await Revenue.create(payload); criados++; }
  }

  const pendingRevenues = await Revenue.findAll({
    where: { cashRegisterId: null, status: 'pending', date: caixa.date }
  });
  for (const pendingRevenue of pendingRevenues) {
    await pendingRevenue.update({ cashRegisterId: caixa.id, status: 'confirmed' });
  }

  console.log(`   🔒 Caixa ${caixa.date} fechado: ${criados} criados, ${atualizados} atualizados`);
  return { criados, atualizados, totalRevenue, totalCommissions, servicesCount };
};

// ============================================================
// GET TODAY
// ============================================================
const getToday = async (req, res) => {
  try {
    const today = dateHelper.getTodayLocal();
    const cashRegister = await CashRegister.findOne({
      where: { date: today, userId: req.userId },
      include: [
        { model: Barber, as: 'barber', attributes: ['id', 'name', 'email', 'phone'] },
        { model: Barber, as: 'closedByBarber', attributes: ['id', 'name'], required: false },
      ],
      order: [['isOpen', 'DESC'], ['createdAt', 'DESC']],
    });

    if (!cashRegister) {
      return res.json({
        id: null, date: today, isOpen: false,
        openingTime: null, closingTime: null, initialCash: 0, finalCash: null,
        services: [], totalRevenue: 0, totalCommissions: 0, servicesCount: 0,
        barber: null, closedByBarber: null,
        totalsByPayment: { dinheiro: 0, credito: 0, debito: 0, pix: 0, outros: 0 },
      });
    }

    const data = cashRegister.toJSON();
    data.totalsByPayment = calcularTotaisPorPagamento(data.services || []);
    res.json(data);
  } catch (error) {
    console.error('❌ Erro ao buscar caixa do dia:', error);
    res.status(500).json({ error: 'Erro ao buscar caixa do dia' });
  }
};

// ============================================================
// OPEN
// ============================================================
const openCashRegister = async (req, res) => {
  try {
    const { initialCash, barberId } = req.body;
    const today = dateHelper.getTodayLocal();

    if (barberId) {
      const barber = await Barber.findByPk(barberId);
      if (!barber) return res.status(400).json({ error: 'Barbeiro não encontrado' });
    }

    const qualquerAberto = await CashRegister.findOne({
      where: { userId: req.userId, isOpen: true },
      order: [['date', 'DESC']],
    });

    if (qualquerAberto) {
      if (qualquerAberto.date === today) {
        await fecharCaixaInterno(qualquerAberto, barberId);
      } else {
        await fecharCaixaInterno(qualquerAberto, qualquerAberto.barberId);
      }
    }

    const cashRegister = await CashRegister.create({
      userId: req.userId,
      date: today,
      isOpen: true,
      openingTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      initialCash: parseFloat(initialCash) || 0,
      services: [], totalRevenue: 0, totalCommissions: 0, servicesCount: 0,
      barberId: barberId || null,
    });

    res.status(201).json(cashRegister);
  } catch (error) {
    console.error('❌ Erro ao abrir caixa:', error);
    res.status(500).json({ error: 'Erro ao abrir caixa' });
  }
};

// ============================================================
// CLOSE
// ============================================================
const closeCashRegister = async (req, res) => {
  try {
    const { barberId } = req.body;
    const today = dateHelper.getTodayLocal();

    if (barberId) {
      const barber = await Barber.findByPk(barberId);
      if (!barber) return res.status(400).json({ error: 'Barbeiro que está fechando não encontrado' });
    }

    const cashRegister = await CashRegister.findOne({
      where: { date: today, userId: req.userId, isOpen: true },
      order: [['createdAt', 'DESC']],
    });
    if (!cashRegister) return res.status(404).json({ error: 'Nenhum caixa aberto encontrado' });

    const resultado = await fecharCaixaInterno(cashRegister, barberId);
    const totalsByPayment = calcularTotaisPorPagamento(cashRegister.services || []);

    const result = cashRegister.toJSON();
    result.totalsByPayment = totalsByPayment;
    result.revenuesCriados = resultado.criados;
    result.revenuesAtualizados = resultado.atualizados;
    res.json(result);
  } catch (error) {
    console.error('❌ Erro ao fechar caixa:', error);
    res.status(500).json({ error: 'Erro ao fechar caixa' });
  }
};

// ============================================================
// 🔥 ADD SERVICE — agora com desconto
// ============================================================
const addService = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      client, barberId,
      service, serviceId, price, commission: commissionFromBody,
      paymentMethod, date, time, phone,
      items,
      // 🔥 NOVOS
      discountType, discountValue,
    } = req.body;

    const today = date || dateHelper.getTodayLocal();

    if (!barberId) { await t.rollback(); return res.status(400).json({ error: 'Barbeiro é obrigatório' }); }
    const barber = await Barber.findByPk(barberId);
    if (!barber) { await t.rollback(); return res.status(400).json({ error: 'Barbeiro não encontrado' }); }

    let normalizedItems = [];
    let subtotal = 0;
    let aggregatedServiceNames = '';
    let aggregatedServiceIds = '';
    const productStockUpdates = new Map();

    if (items && Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        if (item.type === 'service') {
          let svc = null;
          if (item.serviceId) svc = await findServiceByIdentifier(item.serviceId);
          if (!svc && item.name) svc = await findServiceByIdentifier(item.name);

          const isCommissioned = !(svc && svc.isCommissioned === false);
          const itemPrice = Number(item.price) || 0;

          normalizedItems.push({
            type: 'service',
            serviceId: item.serviceId || (svc ? svc.id : ''),
            name: item.name || (svc ? svc.name : 'Serviço'),
            price: itemPrice,
            isCommissioned,
          });

          subtotal += itemPrice;
          aggregatedServiceNames = aggregatedServiceNames
            ? `${aggregatedServiceNames} + ${item.name}` : item.name;
          if (item.serviceId) {
            aggregatedServiceIds = aggregatedServiceIds
              ? `${aggregatedServiceIds},${item.serviceId}` : item.serviceId;
          }
        } else if (item.type === 'product') {
          const product = await Product.findByPk(item.productId);
          if (!product) continue;
          if (product.isActive === false) {
            await t.rollback();
            return res.status(400).json({ error: `Produto "${product.name}" está inativo` });
          }

          const qty = Math.max(1, parseInt(item.quantity) || 1);
          if (product.stock < qty) {
            await t.rollback();
            return res.status(400).json({
              error: `Estoque insuficiente para "${product.name}". Disponível: ${product.stock}, solicitado: ${qty}`,
            });
          }

          const itemPrice = product.price * qty;

          normalizedItems.push({
            type: 'product',
            productId: product.id,
            name: product.name,
            quantity: qty,
            unitPrice: product.price,
            costPrice: product.costPrice,
            price: itemPrice,
            hasCommission: product.hasCommission !== false,
          });

          subtotal += itemPrice;
          const current = productStockUpdates.get(product.id) || { product, quantity: 0 };
          current.quantity += qty;
          productStockUpdates.set(product.id, current);
        }
      }

      if (normalizedItems.length === 0) {
        await t.rollback();
        return res.status(400).json({ error: 'Nenhum item válido recebido' });
      }
    } else {
      if (!service || service.trim() === '') {
        await t.rollback();
        return res.status(400).json({ error: 'Serviço é obrigatório' });
      }
      normalizedItems.push({
        type: 'service',
        serviceId: serviceId || '',
        name: service,
        price: Number(price) || 0,
        isCommissioned: true,
      });
      subtotal = Number(price) || 0;
      aggregatedServiceNames = service;
      aggregatedServiceIds = serviceId || '';
    }

    // ============================================================
    // 🔥 APLICAR DESCONTO + CALCULAR COMISSÃO SOBRE O LÍQUIDO
    // ============================================================
    const discountAmount = calcularDesconto(subtotal, discountType, discountValue);
    const finalPrice = subtotal - discountAmount;

    // Separar totals por tipo
    const totalServices = normalizedItems.filter(i => i.type === 'service').reduce((s, i) => s + i.price, 0);
    const totalProducts = normalizedItems.filter(i => i.type === 'product').reduce((s, i) => s + i.price, 0);

    // Distribuir desconto proporcionalmente
    const servicesDiscount = subtotal > 0 ? discountAmount * (totalServices / subtotal) : 0;
    const productsDiscount = subtotal > 0 ? discountAmount * (totalProducts / subtotal) : 0;

    const serviceCommissionRate = barber.serviceCommissionRate || 0.50;
    const productCommissionRate = barber.productCommissionRate || 0.50;

    // Comissão serviços = base reduzida × taxa
    let serviceCommissionTotal = 0;
    const effectiveServicesTotal = totalServices - servicesDiscount;
    const effectiveServicesRate = totalServices > 0 ? (effectiveServicesTotal / totalServices) : 1;

    for (const item of normalizedItems.filter(i => i.type === 'service')) {
      const effectivePrice = item.price * effectiveServicesRate;
      const itemCommission = item.isCommissioned ? effectivePrice * serviceCommissionRate : 0;
      item.commission = itemCommission;
      item.priceOriginal = item.price; // guarda o original
      item.discount = item.price - effectivePrice;
      serviceCommissionTotal += itemCommission;
    }

    // Comissão produtos = base reduzida × taxa sobre lucro
    let productCommissionTotal = 0;
    const effectiveProductsRate = totalProducts > 0 ? ((totalProducts - productsDiscount) / totalProducts) : 1;

    for (const item of normalizedItems.filter(i => i.type === 'product')) {
      const effectivePrice = item.price * effectiveProductsRate;
      const cost = item.costPrice * item.quantity;
      const profit = Math.max(0, effectivePrice - cost);
      const itemCommission = item.hasCommission !== false ? profit * productCommissionRate : 0;
      item.commission = itemCommission;
      item.priceOriginal = item.price;
      item.discount = item.price - effectivePrice;
      item.profit = profit;
      productCommissionTotal += itemCommission;
    }

    const finalCommission = serviceCommissionTotal + productCommissionTotal;

    // Cliente
    let clientRecord = null, clientId = null, clientName = client || 'Cliente';
    if (client && !['Cliente sem cadastro', '', 'Cliente'].includes(client)) {
      try {
        const result = await findOrCreateClient({
          name: client, phone: phone || '(00) 00000-0000', isActive: true,
        });
        clientRecord = result.client;
        clientId = clientRecord.id;
        clientName = clientRecord.name;
      } catch (error) { console.error('❌ Erro cliente:', error); }
    }

    const cashRegister = await CashRegister.findOne({
      where: { date: today, userId: req.userId, isOpen: true },
      order: [['createdAt', 'DESC']],
      transaction: t,
    });
    if (!cashRegister) {
      await t.rollback();
      return res.status(404).json({ error: 'Nenhum caixa aberto encontrado' });
    }

    // Decrementa estoque
    for (const { product, quantity } of productStockUpdates.values()) {
      await Product.decrement('stock', {
        by: quantity, where: { id: product.id }, transaction: t,
      });
    }

    const newService = {
      id: Date.now().toString(),
      type: 'combined',
      client: clientName, clientId,
      barberId: barber.id,
      barberName: barber.name, barbeiro: barber.name,
      barbeiroId: barber.id,
      service: aggregatedServiceNames, servico: aggregatedServiceNames,
      serviceId: aggregatedServiceIds,
      // 🔥 NOVOS campos de desconto
      originalPrice: subtotal,
      discountType: discountType || null,
      discountValue: Number(discountValue) || 0,
      discountAmount,
      price: finalPrice,
      commission: finalCommission,
      comissao: finalCommission,
      items: normalizedItems,
      paymentMethod: paymentMethod || 'dinheiro',
      formaPagamento: paymentMethod || 'dinheiro',
      time: time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      hora: time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      date: today, data: today,
      phone: phone || '',
    };

    const services = [...(cashRegister.services || []), newService];

    await cashRegister.update({
      services,
      totalRevenue: (cashRegister.totalRevenue || 0) + finalPrice,
      totalCommissions: (cashRegister.totalCommissions || 0) + finalCommission,
      servicesCount: services.length,
    }, { transaction: t });

    await t.commit();

    console.log(`✅ Item adicionado: subtotal R$ ${subtotal.toFixed(2)} | desconto R$ ${discountAmount.toFixed(2)} | final R$ ${finalPrice.toFixed(2)} | comissão R$ ${finalCommission.toFixed(2)}`);

    res.status(201).json(newService);
  } catch (error) {
    await t.rollback();
    console.error('❌ Erro ao adicionar serviço:', error);
    res.status(500).json({ error: 'Erro ao adicionar serviço' });
  }
};

// ============================================================
// REMOVE SERVICE
// ============================================================
const removeService = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { serviceId } = req.params;
    const today = dateHelper.getTodayLocal();

    const cashRegister = await CashRegister.findOne({
      where: { date: today, userId: req.userId, isOpen: true },
      order: [['createdAt', 'DESC']],
      transaction: t,
    });
    if (!cashRegister) {
      await t.rollback();
      return res.status(404).json({ error: 'Nenhum caixa aberto encontrado' });
    }

    const services = cashRegister.services || [];
    const itemToRemove = services.find((s) => s.id === serviceId);
    const productStockRestores = new Map();

    if (itemToRemove && Array.isArray(itemToRemove.items)) {
      for (const it of itemToRemove.items) {
        if (it.type === 'product' && it.productId && it.quantity) {
          const current = productStockRestores.get(it.productId) || { productId: it.productId, quantity: 0 };
          current.quantity += it.quantity;
          productStockRestores.set(it.productId, current);
        }
      }
    } else if (itemToRemove && itemToRemove.type === 'product' && itemToRemove.productId) {
      const qty = itemToRemove.quantity || 1;
      const current = productStockRestores.get(itemToRemove.productId) || { productId: itemToRemove.productId, quantity: 0 };
      current.quantity += qty;
      productStockRestores.set(itemToRemove.productId, current);
    }

    for (const { productId, quantity } of productStockRestores.values()) {
      await Product.increment('stock', { by: quantity, where: { id: productId }, transaction: t });
    }

    if (itemToRemove) {
      const rev = await Revenue.findOne({ where: { sourceItemId: String(itemToRemove.id) }, transaction: t });
      if (rev) await rev.destroy({ transaction: t });
    }

    const updatedServices = services.filter((s) => s.id !== serviceId);
    const totalRevenue = updatedServices.reduce((sum, s) => sum + (s.price || 0), 0);
    const totalCommissions = updatedServices.reduce((sum, s) => sum + (s.commission || 0), 0);

    await cashRegister.update({
      services: updatedServices,
      totalRevenue, totalCommissions,
      servicesCount: updatedServices.length,
    }, { transaction: t });

    await t.commit();
    res.status(204).send();
  } catch (error) {
    await t.rollback();
    console.error('❌ Erro ao remover serviço:', error);
    res.status(500).json({ error: 'Erro ao remover serviço' });
  }
};

// ============================================================
// UPDATE SERVICES
// ============================================================
const updateServices = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { services } = req.body;
    const today = dateHelper.getTodayLocal();

    const cashRegister = await CashRegister.findOne({
      where: { date: today, userId: req.userId, isOpen: true },
      order: [['createdAt', 'DESC']],
      transaction: t,
    });
    if (!cashRegister) {
      await t.rollback();
      return res.status(404).json({ error: 'Nenhum caixa aberto encontrado' });
    }

    const currentServices = cashRegister.services || [];

    for (const updated of services) {
      const original = currentServices.find((s) => s.id === updated.id);
      if (!original) continue;

      const originalProducts = (original.items || []).filter((it) => it.type === 'product');
      const updatedProducts = (updated.items || []).filter((it) => it.type === 'product');

      if (originalProducts.length > 0 || updatedProducts.length > 0) {
        for (const origP of originalProducts) {
          const newP = updatedProducts.find((p) => p.productId === origP.productId);
          const oldQty = origP.quantity || 0;
          const newQty = newP ? newP.quantity || 0 : 0;
          const diff = newQty - oldQty;
          if (diff !== 0) {
            if (diff > 0) {
              const product = await Product.findByPk(origP.productId, { transaction: t });
              if (product && product.stock < diff) {
                await t.rollback();
                return res.status(400).json({
                  error: `Estoque insuficiente para "${product.name}". Disponível: ${product.stock}, adicional: ${diff}`,
                });
              }
              await Product.decrement('stock', { by: diff, where: { id: origP.productId }, transaction: t });
            } else {
              await Product.increment('stock', { by: Math.abs(diff), where: { id: origP.productId }, transaction: t });
            }
          }
        }
        for (const newP of updatedProducts) {
          const existedBefore = originalProducts.find((p) => p.productId === newP.productId);
          if (!existedBefore) {
            const product = await Product.findByPk(newP.productId, { transaction: t });
            const qty = newP.quantity || 1;
            if (product && product.stock < qty) {
              await t.rollback();
              return res.status(400).json({
                error: `Estoque insuficiente para "${product.name}". Disponível: ${product.stock}`,
              });
            }
            await Product.decrement('stock', { by: qty, where: { id: newP.productId }, transaction: t });
          }
        }
      } else if (
        original.type === 'product' && original.productId &&
        updated.type === 'product' && updated.productId
      ) {
        const oldQty = Number(original.quantity) || 0;
        const newQty = Number(updated.quantity) || 0;
        const diff = newQty - oldQty;
        if (diff !== 0) {
          if (diff > 0) {
            const product = await Product.findByPk(original.productId, { transaction: t });
            if (product && product.stock < diff) {
              await t.rollback();
              return res.status(400).json({
                error: `Estoque insuficiente para "${product.name}". Disponível: ${product.stock}, adicional: ${diff}`,
              });
            }
            await Product.decrement('stock', { by: diff, where: { id: original.productId }, transaction: t });
          } else {
            await Product.increment('stock', { by: Math.abs(diff), where: { id: original.productId }, transaction: t });
          }
        }
      }
    }

    const updatedServices = currentServices.map((s) => {
      const updated = services.find((u) => u.id === s.id);
      if (updated) return { ...s, ...updated };
      return s;
    });

    const totalRevenue = updatedServices.reduce((sum, s) => sum + (s.price || s.valor || 0), 0);
    const totalCommissions = updatedServices.reduce((sum, s) => sum + (s.commission || s.comissao || 0), 0);

    await cashRegister.update({
      services: updatedServices,
      totalRevenue, totalCommissions,
      servicesCount: updatedServices.length,
    }, { transaction: t });

    await t.commit();
    res.json(cashRegister);
  } catch (error) {
    await t.rollback();
    console.error('❌ Erro ao atualizar serviços:', error);
    res.status(500).json({ error: 'Erro ao atualizar serviços' });
  }
};

// ============================================================
// GET HISTORY
// ============================================================
const getHistory = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = { userId: req.userId };
    if (startDate && endDate) where.date = { [Op.between]: [startDate, endDate] };

    const registers = await CashRegister.findAll({
      where,
      include: [
        { model: Barber, as: 'barber', attributes: ['id', 'name'] },
        { model: Barber, as: 'closedByBarber', attributes: ['id', 'name'], required: false },
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
    });

    res.json(registers);
  } catch (error) {
    console.error('❌ Erro ao buscar histórico:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
};

module.exports = {
  getToday,
  openCashRegister,
  closeCashRegister,
  addService,
  removeService,
  updateServices,
  getHistory,
};