const { Barber, Revenue, MonthlyPayment, Client, CashRegister } = require('../models');
const { Op } = require('sequelize');
const dateHelper = require('../utils/dateHelper');

// ============================================================
// GET BARBER COMMISSION — usa Revenue + MonthlyPayment
// ============================================================
const getBarberCommission = async (req, res) => {
  try {
    const { barberId } = req.params;
    const { startDate, endDate } = req.query;

    const hoje = dateHelper.getTodayLocal();
    const [ano, mes] = hoje.split('-');
    const inicioMes = `${ano}-${mes}-01`;
    const ultimoDia = new Date(Number(ano), Number(mes), 0).getDate();
    const fimMes = `${ano}-${mes}-${String(ultimoDia).padStart(2, '0')}`;

    const start = startDate || inicioMes;
    const end = endDate || fimMes;

    console.log(`📊 Calculando comissão do barbeiro ${barberId} de ${start} até ${end}`);

    const barber = await Barber.findByPk(barberId);
    if (!barber) {
      return res.status(404).json({ error: 'Barbeiro não encontrado' });
    }

    // Revenues
    const revenues = await Revenue.findAll({
      where: {
        barberId: barber.id,
        date: { [Op.between]: [start, end] },
        status: 'confirmed'
      },
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
    });

    // Mensalidades
    const monthlyPayments = await MonthlyPayment.findAll({
      where: {
        paid: true,
        paidAt: {
          [Op.between]: [new Date(start + 'T00:00:00'), new Date(end + 'T23:59:59.999')]
        }
      },
      include: [
        {
          model: Client,
          as: 'client',
          where: { barberId: barber.id },
          required: true,
          attributes: ['id', 'name', 'phone']
        }
      ],
      order: [['paidAt', 'DESC']]
    });

    // ============================================================
    // 🔥 PRELOAD: carregar todos os CashRegisters referenciados
    // pra extrair nomes reais dos items[] (serviço vs produto)
    // ============================================================
    const cashRegisterIds = [...new Set(
      revenues
        .filter(r => r.cashRegisterId)
        .map(r => r.cashRegisterId)
    )];

    const cashRegistersMap = {};
    if (cashRegisterIds.length > 0) {
      const caixas = await CashRegister.findAll({
        where: { id: cashRegisterIds }
      });
      caixas.forEach(c => { cashRegistersMap[c.id] = c; });
    }

    // 🔥 Helper: extrai o nome real de produtos do items[] do caixa
    const getProductName = (rev) => {
      const caixa = cashRegistersMap[rev.cashRegisterId];
      if (!caixa) return rev.serviceDescription || rev.service || 'Produto';

      const item = (caixa.services || []).find(s => String(s.id) === String(rev.sourceItemId));
      if (!item || !Array.isArray(item.items)) {
        return rev.serviceDescription || rev.service || 'Produto';
      }

      const products = item.items.filter(i => i.type === 'product');
      if (products.length === 0) return rev.serviceDescription || rev.service || 'Produto';

      return products
        .map(p => (p.quantity && p.quantity > 1) ? `${p.name} x${p.quantity}` : p.name)
        .join(' + ');
    };

    // 🔥 Helper: extrai o nome real de serviços do items[] do caixa
    const getServiceName = (rev) => {
      const caixa = cashRegistersMap[rev.cashRegisterId];
      if (!caixa) return rev.serviceDescription || rev.service || 'Serviço';

      const item = (caixa.services || []).find(s => String(s.id) === String(rev.sourceItemId));
      if (!item || !Array.isArray(item.items)) {
        return rev.serviceDescription || rev.service || 'Serviço';
      }

      const services = item.items.filter(i => i.type === 'service');
      if (services.length === 0) return rev.serviceDescription || rev.service || 'Serviço';

      return services.map(s => s.name).join(' + ');
    };

    // TOTAIS
    let totalServiceRevenue = 0;
    let serviceCommissionTotal = 0;
    let serviceCount = 0;

    let totalProductRevenue = 0;
    let productCommissionTotal = 0;
    let productCount = 0;

    const serviceDetails = [];
    const productDetails = [];

    const isProductName = (nome) => {
      const lower = (nome || '').toLowerCase();
      if (/ x\d/.test(lower)) return true;
      return /cerveja|coca|heineken|monster|red bull|budweiser|corona|água|agua|balm|pomada|shampoo|leavin|pente|óleo|oleo|sol\b/.test(lower);
    };

    for (const rev of revenues) {
      const sv = Number(rev.serviceValue || 0);
      const pv = Number(rev.productValue || 0);
      const total = Number(rev.total || 0);
      const commission = Number(rev.commissions || 0);

      let serviceVal = sv;
      let productVal = pv;

      if (sv === 0 && pv === 0 && total > 0) {
        const nome = rev.service || '';
        if (isProductName(nome)) {
          productVal = total;
        } else {
          serviceVal = total;
        }
      }

      // Dividir comissão proporcionalmente quando é misto
      let serviceCommission = 0;
      let productCommission = 0;

      if (serviceVal > 0 && productVal > 0 && total > 0) {
        serviceCommission = commission * (serviceVal / total);
        productCommission = commission * (productVal / total);
      } else if (serviceVal > 0) {
        serviceCommission = commission;
      } else if (productVal > 0) {
        productCommission = commission;
      }

      // 🔥 SERVIÇOS — usa nome real
      if (serviceVal > 0) {
        serviceCount++;
        totalServiceRevenue += serviceVal;
        serviceCommissionTotal += serviceCommission;

        serviceDetails.push({
          id: rev.id,
          date: rev.date,
          client: rev.clientName || 'Cliente',
          service: getServiceName(rev),  // 🔥 nome real
          price: serviceVal,
          commission: serviceCommission,
        });
      }

      // 🔥 PRODUTOS — usa nome real
      if (productVal > 0) {
        productCount++;
        totalProductRevenue += productVal;
        productCommissionTotal += productCommission;

        productDetails.push({
          id: rev.id,
          date: rev.date,
          product: getProductName(rev),  // 🔥 nome real
          quantity: 1,
          salePrice: productVal,
          costPrice: 0,
          profit: productVal,
          commission: productCommission,
        });
      }
    }

    const totalMonthlyRevenue = monthlyPayments.reduce((s, mp) => s + Number(mp.amount || 0), 0);
    const monthlyCommissionTotal = totalMonthlyRevenue * (barber.serviceCommissionRate || 0.5);

    const monthlyDetails = monthlyPayments.map(mp => {
      let dateStr = mp.month + '-01';
      if (mp.paidAt) {
        const d = new Date(mp.paidAt);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dateStr = `${y}-${m}-${day}`;
      }

      return {
        id: mp.id,
        date: dateStr,
        client: mp.client?.name || 'Cliente',
        month: mp.month,
        amount: Number(mp.amount || 0),
        commission: Number(mp.amount || 0) * (barber.serviceCommissionRate || 0.5),
      };
    });

    const totalRevenue = totalServiceRevenue + totalProductRevenue + totalMonthlyRevenue;
    const totalCommission = serviceCommissionTotal + productCommissionTotal + monthlyCommissionTotal;

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
        totalServices: serviceCount,
        totalServiceRevenue: totalServiceRevenue,
        serviceCommission: serviceCommissionTotal,
        totalProducts: productCount,
        totalProductRevenue: totalProductRevenue,
        productCommission: productCommissionTotal,
        totalMonthly: monthlyPayments.length,
        totalMonthlyRevenue: totalMonthlyRevenue,
        monthlyCommission: monthlyCommissionTotal,
        totalRevenue: totalRevenue,
        totalCommission: totalCommission,
      },
      details: {
        services: serviceDetails,
        products: productDetails,
        monthly: monthlyDetails,
      }
    };

    res.json(result);
  } catch (error) {
    console.error('❌ Erro ao calcular comissão:', error);
    res.status(500).json({ error: 'Erro ao calcular comissão' });
  }
};

// ============================================================
// GET ALL COMMISSIONS
// ============================================================
const getAllCommissions = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const hoje = dateHelper.getTodayLocal();
    const [ano, mes] = hoje.split('-');
    const inicioMes = `${ano}-${mes}-01`;
    const ultimoDia = new Date(Number(ano), Number(mes), 0).getDate();
    const fimMes = `${ano}-${mes}-${String(ultimoDia).padStart(2, '0')}`;

    const start = startDate || inicioMes;
    const end = endDate || fimMes;

    const barbers = await Barber.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'email', 'phone', 'serviceCommissionRate', 'productCommissionRate']
    });

    const isProductName = (nome) => {
      const lower = (nome || '').toLowerCase();
      if (/ x\d/.test(lower)) return true;
      return /cerveja|coca|heineken|monster|red bull|budweiser|corona|água|agua|balm|pomada|shampoo|leavin|pente|óleo|oleo|sol\b/.test(lower);
    };

    const results = await Promise.all(barbers.map(async (barber) => {
      const revenues = await Revenue.findAll({
        where: {
          barberId: barber.id,
          date: { [Op.between]: [start, end] },
          status: 'confirmed'
        }
      });

      const monthlyPayments = await MonthlyPayment.findAll({
        where: {
          paid: true,
          paidAt: {
            [Op.between]: [new Date(start + 'T00:00:00'), new Date(end + 'T23:59:59.999')]
          }
        },
        include: [{
          model: Client,
          as: 'client',
          where: { barberId: barber.id },
          required: true,
          attributes: ['id']
        }]
      });

      let serviceRevenue = 0;
      let serviceCommission = 0;
      let serviceCount = 0;
      let productRevenue = 0;
      let productCommission = 0;
      let productCount = 0;

      for (const rev of revenues) {
        const sv = Number(rev.serviceValue || 0);
        const pv = Number(rev.productValue || 0);
        const total = Number(rev.total || 0);
        const com = Number(rev.commissions || 0);

        let sVal = sv;
        let pVal = pv;

        if (sv === 0 && pv === 0 && total > 0) {
          const nome = rev.service || '';
          if (isProductName(nome)) pVal = total;
          else sVal = total;
        }

        if (sVal > 0 && pVal > 0 && total > 0) {
          const sCom = com * (sVal / total);
          const pCom = com * (pVal / total);
          serviceRevenue += sVal;
          serviceCommission += sCom;
          serviceCount++;
          productRevenue += pVal;
          productCommission += pCom;
          productCount++;
        } else if (sVal > 0) {
          serviceRevenue += sVal;
          serviceCommission += com;
          serviceCount++;
        } else if (pVal > 0) {
          productRevenue += pVal;
          productCommission += com;
          productCount++;
        }
      }

      const monthlyRevenue = monthlyPayments.reduce((s, mp) => s + Number(mp.amount || 0), 0);
      const monthlyCommission = monthlyRevenue * (barber.serviceCommissionRate || 0.5);

      return {
        barberId: barber.id,
        barberName: barber.name,
        barberEmail: barber.email,
        serviceCommissionRate: barber.serviceCommissionRate * 100,
        productCommissionRate: barber.productCommissionRate * 100,
        servicesCount: serviceCount,
        serviceRevenue: serviceRevenue,
        serviceCommission: serviceCommission,
        productsCount: productCount,
        productRevenue: productRevenue,
        productCommission: productCommission,
        monthlyCount: monthlyPayments.length,
        monthlyRevenue: monthlyRevenue,
        monthlyCommission: monthlyCommission,
        totalRevenue: serviceRevenue + productRevenue + monthlyRevenue,
        totalCommission: serviceCommission + productCommission + monthlyCommission,
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