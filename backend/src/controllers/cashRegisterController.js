const { CashRegister, User, Revenue, Barber, Client } = require('../models');
const { Op } = require('sequelize');
const { findOrCreateClient } = require('../services/clientService');
const dateHelper = require('../utils/dateHelper');

const getToday = async (req, res) => {
  try {
    const today = dateHelper.getTodayLocal();
    
    console.log('🔍 Buscando caixa do dia:', { userId: req.userId, date: today });
    
    const cashRegister = await CashRegister.findOne({
      where: {
        date: today,
        userId: req.userId,
      },
      include: [
        { 
          model: Barber, 
          as: 'barber', 
          attributes: ['id', 'name', 'email', 'phone'] 
        }
      ],
      order: [['createdAt', 'DESC']],
    });
    
    if (!cashRegister) {
      return res.json({
        id: null,
        date: today,
        isOpen: false,
        openingTime: null,
        closingTime: null,
        initialCash: 0,
        finalCash: null,
        services: [],
        totalRevenue: 0,
        totalCommissions: 0,
        servicesCount: 0,
        barber: null,
      });
    }
    
    res.json(cashRegister);
  } catch (error) {
    console.error('❌ Erro ao buscar caixa do dia:', error);
    res.status(500).json({ error: 'Erro ao buscar caixa do dia' });
  }
};

const openCashRegister = async (req, res) => {
  try {
    const { initialCash, barberId } = req.body;
    const today = dateHelper.getTodayLocal();
    
    console.log('🔓 ===== ABRINDO CAIXA =====');
    console.log('📌 userId:', req.userId);
    console.log('📌 date:', today);
    console.log('📌 initialCash:', initialCash);
    console.log('📌 barberId:', barberId);
    
    // Validar se o barbeiro existe (opcional)
    if (barberId) {
      const barber = await Barber.findByPk(barberId);
      if (!barber) {
        return res.status(400).json({ error: 'Barbeiro não encontrado' });
      }
    }
    
    const existingOpen = await CashRegister.findOne({
      where: {
        date: today,
        userId: req.userId,
        isOpen: true,
      },
    });
    
    if (existingOpen) {
      console.log('⚠️ Já existe um caixa aberto hoje');
      return res.status(400).json({ error: 'Já existe um caixa aberto hoje' });
    }
    
    const existingClosed = await CashRegister.findOne({
      where: {
        date: today,
        userId: req.userId,
        isOpen: false,
      },
      order: [['createdAt', 'DESC']],
    });
    
    if (existingClosed) {
      console.log('🔄 Caixa fechado encontrado. Reabrindo...');
      
      await existingClosed.update({
        isOpen: true,
        openingTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        initialCash: parseFloat(initialCash) || 0,
        finalCash: null,
        services: [],
        totalRevenue: 0,
        totalCommissions: 0,
        servicesCount: 0,
        closingTime: null,
        barberId: barberId || null,
      });
      
      console.log('✅ Caixa reaberto com sucesso');
      return res.json(existingClosed);
    }
    
    const cashRegister = await CashRegister.create({
      userId: req.userId,
      date: today,
      isOpen: true,
      openingTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      initialCash: parseFloat(initialCash) || 0,
      services: [],
      totalRevenue: 0,
      totalCommissions: 0,
      servicesCount: 0,
      barberId: barberId || null,
    });
    
    console.log('✅ CAIXA CRIADO COM SUCESSO');
    res.status(201).json(cashRegister);
  } catch (error) {
    console.error('❌ Erro ao abrir caixa:', error);
    res.status(500).json({ error: 'Erro ao abrir caixa' });
  }
};

const closeCashRegister = async (req, res) => {
  try {
    const today = dateHelper.getTodayLocal();
    
    console.log('🔒 ===== FECHANDO CAIXA =====');
    console.log('📌 userId:', req.userId);
    console.log('📌 date:', today);
    
    const cashRegister = await CashRegister.findOne({
      where: {
        date: today,
        userId: req.userId,
        isOpen: true,
      },
    });
    
    if (!cashRegister) {
      console.log('❌ Nenhum caixa aberto encontrado');
      return res.status(404).json({ error: 'Nenhum caixa aberto encontrado' });
    }
    
    const services = cashRegister.services || [];
    console.log('📋 Serviços no caixa:', services.length);
    
    // 🔥 SEPARAR SERVIÇOS E MENSALIDADES
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
      
      if (isMensalidade) {
        mensalidades.push(service);
        console.log(`📅 Mensalidade ignorada: ${service.client} - ${service.service} - R$ ${service.price}`);
      } else {
        servicosReais.push(service);
        console.log(`✂️ Serviço: ${service.client} - ${service.service} - R$ ${service.price}`);
      }
    }
    
    console.log(`📊 ${servicosReais.length} serviços, ${mensalidades.length} mensalidades ignoradas`);
    
    const totalRevenue = servicosReais.reduce((sum, s) => sum + (s.price || 0), 0);
    const totalCommissions = servicosReais.reduce((sum, s) => sum + (s.commission || 0), 0);
    const servicesCount = servicosReais.length;
    const finalCash = cashRegister.initialCash + totalRevenue + mensalidades.reduce((sum, s) => sum + (s.price || 0), 0);
    
    await cashRegister.update({
      isOpen: false,
      closingTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      finalCash,
      totalRevenue,
      totalCommissions,
      servicesCount,
    });
    
    console.log(`📝 Criando ${servicosReais.length} revenues...`);
    
    let revenueCount = 0;
    for (const service of servicosReais) {
      const barber = await Barber.findByPk(service.barberId);
      
      let clientName = 'Cliente';
      let clientId = null;
      
      if (service.clientId) {
        try {
          const client = await Client.findByPk(service.clientId);
          if (client) {
            clientName = client.name;
            clientId = client.id;
            console.log(`   ✅ Cliente encontrado por ID: ${clientName}`);
          }
        } catch (e) {
          console.log(`   ⚠️ Erro ao buscar cliente por ID: ${e.message}`);
        }
      }
      
      if (clientName === 'Cliente' && service.client && service.client !== '' && service.client !== 'Cliente sem cadastro' && service.client !== 'Cliente') {
        try {
          const client = await Client.findOne({
            where: { name: service.client }
          });
          if (client) {
            clientName = client.name;
            clientId = client.id;
            console.log(`   ✅ Cliente encontrado por nome: ${clientName}`);
          } else {
            clientName = service.client;
          }
        } catch (e) {
          clientName = service.client;
        }
      }
      
      console.log(`   Cliente final: ${clientName}`);
      console.log(`   Service: ${service.service}`);
      console.log(`   Price: ${service.price}`);
      console.log(`   Barber: ${barber?.name || 'Desconhecido'}`);
      
      // 🔥 VERIFICAR SE JÁ EXISTE REVENUE
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
          clientId: clientId,
          clientName: clientName,
          barberName: barber?.name || 'Desconhecido',
          service: service.service || 'Serviço',
          serviceDescription: service.serviceDescription || '',
          status: 'confirmed',
        });
        console.log(`   ✅ Revenue atualizado: R$ ${revenue.total} (Cliente: ${clientName})`);
      } else {
        revenue = await Revenue.create({
          cashRegisterId: cashRegister.id,
          barberId: service.barberId || null,
          clientId: clientId,
          date: today,
          total: service.price || 0,
          commissions: service.commission || 0,
          servicesCount: 1,
          clientName: clientName,
          barberName: barber?.name || 'Desconhecido',
          service: service.service || 'Serviço',
          serviceDescription: service.serviceDescription || '',
          status: 'confirmed',
        });
        console.log(`   ✅ Revenue criado: R$ ${revenue.total} (Cliente: ${clientName})`);
      }
      revenueCount++;
    }
    
    // 🔥 ATUALIZAR REVENUES PENDENTES
    const pendingRevenues = await Revenue.findAll({
      where: {
        cashRegisterId: null,
        status: 'pending',
        barberId: req.userId,
        date: today,
      }
    });
    
    if (pendingRevenues.length > 0) {
      console.log(`📝 Atualizando ${pendingRevenues.length} revenues pendentes...`);
      for (const pendingRevenue of pendingRevenues) {
        await pendingRevenue.update({
          cashRegisterId: cashRegister.id,
          status: 'confirmed',
        });
        console.log(`   ✅ Revenue pendente confirmado: ${pendingRevenue.id}`);
      }
    }
    
    console.log(`✅ ${revenueCount} revenues processados!`);
    console.log(`   Total Revenue: R$ ${totalRevenue}`);
    console.log(`   Total Comissões: R$ ${totalCommissions}`);
    console.log(`   📅 ${mensalidades.length} mensalidades ignoradas (já estão em monthly_payments)`);
    
    res.json(cashRegister);
  } catch (error) {
    console.error('❌ Erro ao fechar caixa:', error);
    res.status(500).json({ error: 'Erro ao fechar caixa' });
  }
};

const addService = async (req, res) => {
  try {
    const { 
      client, 
      barberId, 
      service, 
      serviceId, 
      price, 
      paymentMethod,
      date,
      time,
      phone
    } = req.body;
    
    const today = date || dateHelper.getTodayLocal();
    
    console.log('📦 Adicionando serviço ao caixa:');
    console.log('  client:', client);
    console.log('  phone:', phone);
    console.log('  barberId:', barberId);
    console.log('  service:', service);
    console.log('  price:', price);
    
    let clientRecord = null;
    let clientId = null;
    let clientName = client || 'Cliente';
    
    if (client && client !== 'Cliente sem cadastro' && client !== '' && client !== 'Cliente') {
      try {
        const result = await findOrCreateClient({
          name: client,
          phone: phone || '(00) 00000-0000',
          isActive: true,
        });
        clientRecord = result.client;
        clientId = clientRecord.id;
        clientName = clientRecord.name;
        console.log(`✅ Cliente ${result.created ? 'criado' : 'encontrado'}: ${clientName} (${clientRecord.phone})`);
      } catch (error) {
        console.error('❌ Erro ao buscar/criar cliente:', error);
      }
    } else {
      console.log('⚠️ Cliente não será criado (nome inválido ou "Cliente sem cadastro")');
    }
    
    let barber = null;
    let barberName = 'Barbeiro';
    
    if (barberId) {
      barber = await Barber.findByPk(barberId);
      if (barber) {
        barberName = barber.name;
      }
    }
    
    const cashRegister = await CashRegister.findOne({
      where: {
        date: today,
        userId: req.userId,
        isOpen: true,
      },
    });
    
    if (!cashRegister) {
      console.log('❌ Nenhum caixa aberto encontrado');
      return res.status(404).json({ error: 'Nenhum caixa aberto encontrado' });
    }
    
    const commissionRate = barber ? barber.serviceCommissionRate : 0.20;
    const commission = price * commissionRate;
    
    const newService = {
      id: Date.now().toString(),
      client: clientName,
      clientId: clientId,
      barberId: barber ? barber.id : barberId,
      barberName: barberName,
      service: service || 'Serviço',
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
      totalRevenue: (cashRegister.totalRevenue || 0) + price,
      totalCommissions: (cashRegister.totalCommissions || 0) + commission,
      servicesCount: services.length,
    });
    
    console.log('✅ Serviço adicionado com sucesso!');
    console.log(`   Cliente: ${newService.client} (ID: ${newService.clientId || 'N/A'})`);
    console.log(`   Telefone: ${newService.phone}`);
    
    res.status(201).json(newService);
  } catch (error) {
    console.error('❌ Erro ao adicionar serviço:', error);
    res.status(500).json({ error: 'Erro ao adicionar serviço' });
  }
};

const removeService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const today = dateHelper.getTodayLocal();
    
    const cashRegister = await CashRegister.findOne({
      where: {
        date: today,
        userId: req.userId,
        isOpen: true,
      },
    });
    
    if (!cashRegister) {
      return res.status(404).json({ error: 'Nenhum caixa aberto encontrado' });
    }
    
    const services = (cashRegister.services || []).filter(s => s.id !== serviceId);
    
    await cashRegister.update({ services });
    res.status(204).send();
  } catch (error) {
    console.error('❌ Erro ao remover serviço:', error);
    res.status(500).json({ error: 'Erro ao remover serviço' });
  }
};

const updateServices = async (req, res) => {
  try {
    const { services } = req.body;
    const today = dateHelper.getTodayLocal(); // 🔥 corrigido para usar dateHelper
    
    const cashRegister = await CashRegister.findOne({
      where: {
        date: today,
        userId: req.userId,
        isOpen: true,
      },
    });
    
    if (!cashRegister) {
      return res.status(404).json({ error: 'Nenhum caixa aberto encontrado' });
    }
    
    // 🔥 MERGE: só atualiza os serviços que vieram, mantendo os campos originais
    const currentServices = cashRegister.services || [];
    const updatedServices = currentServices.map(s => {
      const updated = services.find(service => service.id === s.id);
      if (updated) {
        return { ...s, ...updated }; // Mantém tudo e sobrescreve só o que veio
      }
      return s;
    });
    
    const totalRevenue = updatedServices.reduce((sum, s) => sum + (s.valor || 0), 0);
    const totalCommissions = updatedServices.reduce((sum, s) => sum + (s.comissao || 0), 0);
    
    await cashRegister.update({
      services: updatedServices,
      totalRevenue,
      totalCommissions,
      servicesCount: updatedServices.length,
    });
    
    res.json(cashRegister);
  } catch (error) {
    console.error('❌ Erro ao atualizar serviços:', error);
    res.status(500).json({ error: 'Erro ao atualizar serviços' });
  }
};

const getHistory = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {
      userId: req.userId,
    };
    
    if (startDate && endDate) {
      where.date = {
        [Op.between]: [startDate, endDate],
      };
    }
    
    const registers = await CashRegister.findAll({
      where,
      include: [
        { 
          model: Barber, 
          as: 'barber', 
          attributes: ['id', 'name'] 
        }
      ],
      order: [['date', 'DESC']],
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