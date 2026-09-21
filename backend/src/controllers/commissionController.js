const { Barber, Appointment, Sale, Product, Client, Service } = require('../models');
const { Op } = require('sequelize');

// 🔥 HELPER: extrair nome bonito do serviço
const getServiceDisplayName = async (app) => {
  // 1. Preferir serviceDescription se existir e não for slug
  if (app.serviceDescription && app.serviceDescription.trim() && !/-\d{10,}/.test(app.serviceDescription)) {
    return app.serviceDescription;
  }

  // 2. Tentar buscar o Service pelo ID direto
  if (app.service) {
    // Tenta busca direta (ex: "mensalista")
    let svc = await Service.findOne({ where: { id: app.service } });
    if (svc) return svc.name;

    // Se for slug tipo "mensalista-1788471297070-nq8z", extrai "mensalista"
    const parts = app.service.split('-');
    // Remove blocos de números e hash final
    const baseSlug = parts.filter(p => !/^\d+$/.test(p) && p.length > 2).join('-');
    if (baseSlug && baseSlug !== app.service) {
      svc = await Service.findOne({ where: { id: baseSlug } });
      if (svc) return svc.name;
    }
  }

  // 3. Fallback: retorna o que tem
  return app.serviceDescription || app.service || 'Serviço';
};

// Calcular comissão de um barbeiro específico
const getBarberCommission = async (req, res) => {
  try {
    const { barberId } = req.params;
    const { startDate, endDate } = req.query;
    
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    
    const start = startDate || inicioMes.toISOString().split('T')[0];
    const end = endDate || fimMes.toISOString().split('T')[0];
    
    console.log(`📊 Calculando comissão do barbeiro ${barberId} de ${start} até ${end}`);
    
    const barber = await Barber.findByPk(barberId);
    if (!barber) {
      return res.status(404).json({ error: 'Barbeiro não encontrado' });
    }
    
    // 🔥 BUSCAR SERVIÇOS CONCLUÍDOS NO PERÍODO
    const appointments = await Appointment.findAll({
      where: {
        barberId: barber.id,
        status: 'completed',
        date: { [Op.between]: [start, end] }
      },
      include: [
        { 
          model: Client, 
          as: 'client', 
          attributes: ['id', 'name', 'phone']
        }
      ]
    });
    
    // 🔥 BUSCAR VENDAS DE PRODUTOS NO PERÍODO
    const sales = await Sale.findAll({
      where: {
        barberId: barber.id,
        date: { [Op.between]: [start, end] }
      },
      include: [
        { 
          model: Product, 
          as: 'product', 
          attributes: ['id', 'name', 'price', 'costPrice'] 
        }
      ]
    });
    
    // Calcular comissão de serviços
    const serviceCommission = appointments.reduce((total, app) => {
      return total + (app.price * barber.serviceCommissionRate);
    }, 0);
    
    const totalServiceRevenue = appointments.reduce((total, app) => total + app.price, 0);
    
    // Calcular comissão de produtos (sobre o lucro)
    const productCommission = sales.reduce((total, sale) => {
      const profit = (sale.salePrice - sale.costPrice) * sale.quantity;
      return total + (profit * barber.productCommissionRate);
    }, 0);
    
    const totalProductRevenue = sales.reduce((total, sale) => total + (sale.salePrice * sale.quantity), 0);
    
    // 🔥 Detalhes dos serviços — nomes bonitos via helper
    const serviceDetails = await Promise.all(appointments.map(async (app) => {
      const displayName = await getServiceDisplayName(app);
      return {
        id: app.id,
        date: app.date,
        client: app.client?.name || 'Cliente não identificado',
        service: displayName,
        price: app.price,
        commission: app.price * barber.serviceCommissionRate,
      };
    }));
    
    // Detalhes das vendas
    const productDetails = sales.map(sale => ({
      id: sale.id,
      date: sale.date,
      product: sale.product?.name || 'Produto',
      quantity: sale.quantity,
      salePrice: sale.salePrice,
      costPrice: sale.costPrice,
      profit: (sale.salePrice - sale.costPrice) * sale.quantity,
      commission: ((sale.salePrice - sale.costPrice) * sale.quantity) * barber.productCommissionRate,
    }));
    
    const result = {
      barber: {
        id: barber.id,
        name: barber.name,
        email: barber.email,
        phone: barber.phone,
        username: barber.username,
        isActive: barber.isActive,
        serviceCommissionRate: barber.serviceCommissionRate * 100,
        productCommissionRate: barber.productCommissionRate * 100,
      },
      period: { startDate: start, endDate: end },
      summary: {
        totalServices: appointments.length,
        totalServiceRevenue: totalServiceRevenue,
        serviceCommission: serviceCommission,
        totalProducts: sales.length,
        totalProductRevenue: totalProductRevenue,
        productCommission: productCommission,
        totalRevenue: totalServiceRevenue + totalProductRevenue,
        totalCommission: serviceCommission + productCommission,
      },
      details: {
        services: serviceDetails,
        products: productDetails,
      }
    };
    
    res.json(result);
  } catch (error) {
    console.error('❌ Erro ao calcular comissão:', error);
    res.status(500).json({ error: 'Erro ao calcular comissão' });
  }
};

// Calcular comissões de todos os barbeiros (resumo)
const getAllCommissions = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    
    const start = startDate || inicioMes.toISOString().split('T')[0];
    const end = endDate || fimMes.toISOString().split('T')[0];
    
    const barbers = await Barber.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'email', 'phone', 'serviceCommissionRate', 'productCommissionRate']
    });
    
    const results = await Promise.all(barbers.map(async (barber) => {
      const appointments = await Appointment.findAll({
        where: {
          barberId: barber.id,
          status: 'completed',
          date: { [Op.between]: [start, end] }
        }
      });
      
      const sales = await Sale.findAll({
        where: {
          barberId: barber.id,
          date: { [Op.between]: [start, end] }
        }
      });
      
      const serviceCommission = appointments.reduce((total, app) => {
        return total + (app.price * barber.serviceCommissionRate);
      }, 0);
      
      const productCommission = sales.reduce((total, sale) => {
        const profit = (sale.salePrice - sale.costPrice) * sale.quantity;
        return total + (profit * barber.productCommissionRate);
      }, 0);
      
      const totalServiceRevenue = appointments.reduce((total, app) => total + app.price, 0);
      const totalProductRevenue = sales.reduce((total, sale) => total + (sale.salePrice * sale.quantity), 0);
      
      return {
        barberId: barber.id,
        barberName: barber.name,
        barberEmail: barber.email,
        serviceCommissionRate: barber.serviceCommissionRate * 100,
        productCommissionRate: barber.productCommissionRate * 100,
        servicesCount: appointments.length,
        serviceRevenue: totalServiceRevenue,
        serviceCommission: serviceCommission,
        productsCount: sales.length,
        productRevenue: totalProductRevenue,
        productCommission: productCommission,
        totalRevenue: totalServiceRevenue + totalProductRevenue,
        totalCommission: serviceCommission + productCommission,
      };
    }));
    
    const totals = results.reduce((acc, item) => {
      acc.totalServices += item.servicesCount;
      acc.totalProducts += item.productsCount;
      acc.totalRevenue += item.totalRevenue;
      acc.totalCommission += item.totalCommission;
      return acc;
    }, {
      totalServices: 0,
      totalProducts: 0,
      totalRevenue: 0,
      totalCommission: 0,
    });
    
    res.json({
      period: { startDate: start, endDate: end },
      barbers: results,
      totals,
    });
  } catch (error) {
    console.error('❌ Erro ao calcular comissões:', error);
    res.status(500).json({ error: 'Erro ao calcular comissões' });
  }
};

module.exports = {
  getBarberCommission,
  getAllCommissions,
};