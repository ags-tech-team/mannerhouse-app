const { CashRegister, User, Revenue, Barber, Client, Service } = require('../models');
const { Op } = require('sequelize');
const { findOrCreateClient } = require('../services/clientService');
const dateHelper = require('../utils/dateHelper');

// ============================================================
// 🔥 HELPER: buscar serviço por ID ou nome (id pode estar salvo
// como slug, nome ou nome com emoji em outros lugares do sistema)
// ============================================================
const findServiceByIdentifier = async (identifier) => {
  if (!identifier) return null;
  let svc = await Service.findOne({ where: { id: identifier } });
  if (svc) return svc;
  svc = await Service.findOne({ where: { name: identifier } });
  return svc;
};

// ============================================================
// 🔥 HELPER: calcular totais por forma de pagamento
// ============================================================
const calcularTotaisPorPagamento = (services = []) => {
  const totais = { dinheiro: 0, credito: 0, debito: 0, pix: 0, outros: 0 };

  services.forEach((s) => {
    const isMensalidade = s.service && (
      s.service.toLowerCase().includes('mensal') ||
      s.service.toLowerCase().includes('mensalista') ||
      s.type === 'monthly'
    );
    if (isMensalidade) return;

    const price = s.price || s.valor || 0;
    const method = (s.paymentMethod || s.formaPagamento || 'dinheiro').toLowerCase();

    if (totais[method] !== undefined) totais[method] += price;
    else if (method === 'cartao' || method === 'cartão') totais.credito += price;
    else totais.outros += price;
  });

  return totais;
};

// ============================================================
// GET TODAY
// ============================================================
const getToday = async (req, res) => {
  try {
    const today = dateHelper.getTodayLocal();
    console.log('🔍 Buscando caixa do dia:', { userId: req.userId, date: today });

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
// OPEN CASH REGISTER
// ============================================================
const openCashRegister = async (req, res) => {
  try {
    const { initialCash, barberId } = req.body;
    const today = dateHelper.getTodayLocal();

    console.log('🔓 ===== ABRINDO CAIXA =====');
    console.log('📌 userId:', req.userId, '| date:', today, '| initialCash:', initialCash, '| barberId:', barberId);

    if (barberId) {
      const barber = await Barber.findByPk(barberId);
      if (!barber) return res.status(400).json({ error: 'Barbeiro não encontrado' });
    }

    const existingOpen = await CashRegister.findOne({
      where: { date: today, userId: req.userId, isOpen: true },
    });
    if (existingOpen) {
      return res.status(400).json({ error: 'Já existe um caixa aberto hoje' });
    }

    const existingClosed = await CashRegister.findOne({
      where: { date: today, userId: req.userId, isOpen: false },
      order: [['createdAt', 'DESC']],
    });

    if (existingClosed) {
      await existingClosed.update({
        isOpen: true,
        openingTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        initialCash: parseFloat(initialCash) || 0,
        finalCash: null,
        services: [], totalRevenue: 0, totalCommissions: 0, servicesCount: 0,
        closingTime: null,
        barberId: barberId || existingClosed.barberId || null,
        closedByBarberId: null,
      });
      return res.json(existingClosed);
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
// CLOSE CASH REGISTER
// ============================================================
const closeCashRegister = async (req, res) => {
  try {
    const { barberId } = req.body;
    const today = dateHelper.getTodayLocal();

    console.log('🔒 ===== FECHANDO CAIXA =====');
    console.log('📌 userId:', req.userId, '| date:', today, '| closedByBarberId:', barberId);

    if (barberId) {
      const barber = await Barber.findByPk(barberId);
      if (!barber) return res.status(400).json({ error: 'Barbeiro que está fechando não encontrado' });
    }

    const cashRegister = await CashRegister.findOne({
      where: { date: today, userId: req.userId, isOpen: true },
      order: [['createdAt', 'DESC']],
    });
    if (!cashRegister) return res.status(404).json({ error: 'Nenhum caixa aberto encontrado' });

    const services = cashRegister.services || [];
    const servicosReais = [];
    const mensalidades = [];

    for (const service of services) {
      const isMensalidade = service.service && (
        service.service.toLowerCase().includes('mensal') ||
        service.service.toLowerCase().includes('mensalista') ||
        service.type === 'monthly' ||
        service.serviceId?.toLowerCase().includes('mensalista') ||
        service.serviceId?.toLowerCase().includes('mensal')
      );
      if (isMensalidade) mensalidades.push(service);
      else servicosReais.push(service);
    }

    const totalRevenue = servicosReais.reduce((sum, s) => sum + (s.price || 0), 0);
    const totalCommissions = servicosReais.reduce((sum, s) => sum + (s.commission || 0), 0);
    const servicesCount = servicosReais.length;
    const finalCash = cashRegister.initialCash + totalRevenue + mensalidades.reduce((sum, s) => sum + (s.price || 0), 0);
    const totalsByPayment = calcularTotaisPorPagamento(services);

    await cashRegister.update({
      isOpen: false,
      closingTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      finalCash, totalRevenue, totalCommissions, servicesCount,
      closedByBarberId: barberId || null,
    });

    let revenueCount = 0;
    for (const service of servicosReais) {
      const barber = await Barber.findByPk(service.barberId);
      let clientName = 'Cliente';
      let clientId = null;

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

      let revenue = await Revenue.findOne({
        where: {
          cashRegisterId: cashRegister.id,
          barberId: service.barberId || null,
          date: today,
          total: service.price || 0,
        }
      });

      if (revenue) {
        await revenue.update({
          clientId, clientName,
          barberName: barber?.name || 'Desconhecido',
          service: service.service || 'Serviço',
          serviceDescription: service.serviceDescription || '',
          status: 'confirmed',
        });
      } else {
        revenue = await Revenue.create({
          cashRegisterId: cashRegister.id,
          barberId: service.barberId || null,
          clientId,
          date: today,
          total: service.price || 0,
          commissions: service.commission || 0,
          servicesCount: 1,
          clientName,
          barberName: barber?.name || 'Desconhecido',
          service: service.service || 'Serviço',
          serviceDescription: service.serviceDescription || '',
          status: 'confirmed',
        });
      }
      revenueCount++;
    }

    const pendingRevenues = await Revenue.findAll({
      where: { cashRegisterId: null, status: 'pending', date: today }
    });
    for (const pendingRevenue of pendingRevenues) {
      await pendingRevenue.update({ cashRegisterId: cashRegister.id, status: 'confirmed' });
    }

    const result = cashRegister.toJSON();
    result.totalsByPayment = totalsByPayment;
    res.json(result);
  } catch (error) {
    console.error('❌ Erro ao fechar caixa:', error);
    res.status(500).json({ error: 'Erro ao fechar caixa' });
  }
};

// ============================================================
// ADD SERVICE
// ============================================================
const addService = async (req, res) => {
  try {
    const { 
      client, barberId, service, serviceId, price, commission: commissionFromBody,
      paymentMethod, date, time, phone
    } = req.body;

    const today = date || dateHelper.getTodayLocal();

    if (!barberId) return res.status(400).json({ error: 'Barbeiro é obrigatório' });
    const barber = await Barber.findByPk(barberId);
    if (!barber) return res.status(400).json({ error: 'Barbeiro não encontrado' });
    if (!service || service.trim() === '') return res.status(400).json({ error: 'Serviço é obrigatório' });

    let clientRecord = null;
    let clientId = null;
    let clientName = client || 'Cliente';

    if (client && !['Cliente sem cadastro', '', 'Cliente'].includes(client)) {
      try {
        const result = await findOrCreateClient({
          name: client,
          phone: phone || '(00) 00000-0000',
          isActive: true,
        });
        clientRecord = result.client;
        clientId = clientRecord.id;
        clientName = clientRecord.name;
      } catch (error) {
        console.error('❌ Erro ao buscar/criar cliente:', error);
      }
    }

    const cashRegister = await CashRegister.findOne({
      where: { date: today, userId: req.userId, isOpen: true },
      order: [['createdAt', 'DESC']],
    });
    if (!cashRegister) return res.status(404).json({ error: 'Nenhum caixa aberto encontrado' });

    // ============================================================
    // 🔥 CÁLCULO DE COMISSÃO — respeita isCommissioned
    // ============================================================
    // Estratégia em camadas:
    // 1) Se o frontend mandou `commission` já calculado → usa ele (o BarberCaixa
    //    já filtra por isCommissioned antes de enviar)
    // 2) Senão, calcula aqui checando isCommissioned por serviceId
    // 3) Fallback final: assume comissionado (padrão antigo)
    let commission;

    if (commissionFromBody !== undefined && commissionFromBody !== null) {
      commission = Number(commissionFromBody);
      console.log(`💰 Comissão recebida do frontend: R$ ${commission.toFixed(2)}`);
    } else {
      // Não veio do frontend → backend tenta validar sozinho
      const commissionRate = barber.serviceCommissionRate || 0.50;
      let isCommissioned = true;

      // serviceId pode conter múltiplos IDs separados por vírgula
      if (serviceId) {
        const ids = serviceId.split(',').map(s => s.trim()).filter(Boolean);
        // Se pelo menos um serviço NÃO for comissionado, aplica regra conservadora:
        // assume que o pacote inteiro é não-comissionado (evita pagar comissão indevida)
        for (const id of ids) {
          const svc = await findServiceByIdentifier(id);
          if (svc && svc.isCommissioned === false) {
            isCommissioned = false;
            break;
          }
        }
      } else {
        // Sem serviceId, tenta pelo nome
        const svc = await findServiceByIdentifier(service);
        if (svc && svc.isCommissioned === false) isCommissioned = false;
      }

      commission = isCommissioned ? (price || 0) * commissionRate : 0;
      console.log(`💰 Comissão calculada no backend: R$ ${commission.toFixed(2)} | comissionado: ${isCommissioned}`);
    }

    const newService = {
      id: Date.now().toString(),
      client: clientName,
      clientId: clientId,
      barberId: barber.id,
      barberName: barber.name,
      service: service.trim(),
      serviceId: serviceId || '',
      price: price || 0,
      commission,
      paymentMethod: paymentMethod || 'dinheiro',
      time: time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      date: today,
      phone: phone || '',
    };

    const services = [...(cashRegister.services || []), newService];

    await cashRegister.update({
      services,
      totalRevenue: (cashRegister.totalRevenue || 0) + (price || 0),
      totalCommissions: (cashRegister.totalCommissions || 0) + commission,
      servicesCount: services.length,
    });

    console.log(`✅ Serviço adicionado: ${newService.service} | R$ ${newService.price} | comissão R$ ${newService.commission}`);
    res.status(201).json(newService);
  } catch (error) {
    console.error('❌ Erro ao adicionar serviço:', error);
    res.status(500).json({ error: 'Erro ao adicionar serviço' });
  }
};

// ============================================================
// REMOVE SERVICE
// ============================================================
const removeService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const today = dateHelper.getTodayLocal();

    const cashRegister = await CashRegister.findOne({
      where: { date: today, userId: req.userId, isOpen: true },
      order: [['createdAt', 'DESC']],
    });
    if (!cashRegister) return res.status(404).json({ error: 'Nenhum caixa aberto encontrado' });

    const services = (cashRegister.services || []).filter(s => s.id !== serviceId);
    const totalRevenue = services.reduce((sum, s) => sum + (s.price || 0), 0);
    const totalCommissions = services.reduce((sum, s) => sum + (s.commission || 0), 0);

    await cashRegister.update({
      services, totalRevenue, totalCommissions,
      servicesCount: services.length,
    });

    res.status(204).send();
  } catch (error) {
    console.error('❌ Erro ao remover serviço:', error);
    res.status(500).json({ error: 'Erro ao remover serviço' });
  }
};

// ============================================================
// UPDATE SERVICES
// ============================================================
const updateServices = async (req, res) => {
  try {
    const { services } = req.body;
    const today = dateHelper.getTodayLocal();

    const cashRegister = await CashRegister.findOne({
      where: { date: today, userId: req.userId, isOpen: true },
      order: [['createdAt', 'DESC']],
    });
    if (!cashRegister) return res.status(404).json({ error: 'Nenhum caixa aberto encontrado' });

    const currentServices = cashRegister.services || [];
    const updatedServices = currentServices.map(s => {
      const updated = services.find(service => service.id === s.id);
      if (updated) return { ...s, ...updated };
      return s;
    });

    const totalRevenue = updatedServices.reduce((sum, s) => sum + (s.price || s.valor || 0), 0);
    const totalCommissions = updatedServices.reduce((sum, s) => sum + (s.commission || s.comissao || 0), 0);

    await cashRegister.update({
      services: updatedServices,
      totalRevenue, totalCommissions,
      servicesCount: updatedServices.length,
    });

    res.json(cashRegister);
  } catch (error) {
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

    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    }

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