const { Barber, Revenue, MonthlyPayment, Client } = require('../models');
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

    // TOTAIS
    let totalServiceRevenue = 0;
    let serviceCommissionTotal = 0;
    let serviceCount = 0;

    let totalProductRevenue = 0;
    let productCommissionTotal = 0;
    let productCount = 0;

    const serviceDetails = [];
    const productDetails = [];

    // Helper: detectar se o nome é de produto (fallback)
    const isProductName = (nome) => {
      const lower = (nome || '').toLowerCase();
      if (/ x\d/.test(lower)) return true;
      return /cerveja|coca|heineken|monster|red bull|budweiser|corona|água|agua|balm|pomada|shampoo|leavin|pente|óleo|oleo/.test(lower);
    };

    for (const rev of revenues) {
      const sv = Number(rev.serviceValue || 0);
      const pv = Number(rev.productValue || 0);
      const total = Number(rev.total || 0);
      const commission = Number(rev.commissions || 0);

      // Fallback se os campos não estiverem preenchidos
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

      // 🔥 Manda a data CRUA (YYYY-MM-DD) — o frontend formata
      if (serviceVal > 0) {
        serviceCount++;
        totalServiceRevenue += serviceVal;
        serviceCommissionTotal += serviceCommission;

        serviceDetails.push({
          id: rev.id,
          date: rev.date,  // 🔥 YYYY-MM-DD cru
          client: rev.clientName || 'Cliente',
          service: rev.serviceDescription || rev.service || 'Serviço',
          price: serviceVal,
          commission: serviceCommission,
        });
      }

      if (productVal > 0) {
        productCount++;
        totalProductRevenue += productVal;
        productCommissionTotal += productCommission;

        productDetails.push({
          id: rev.id,
          date: rev.date,  // 🔥 YYYY-MM-DD cru
          product: rev.serviceDescription || rev.service || 'Produto',
          quantity: 1,
          salePrice: productVal,
          costPrice: 0,
          profit: productVal,
          commission: productCommission,
        });
      }
    }

    // Totais de mensalidades
    const totalMonthlyRevenue = monthlyPayments.reduce((s, mp) => s + Number(mp.amount || 0), 0);
    const monthlyCommissionTotal = totalMonthlyRevenue * (barber.serviceCommissionRate || 0.5);

    // Resultado final
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
      return /cerveja|coca|heineken|monster|red bull|budweiser|corona|água|agua|balm|pomada|shampoo|leavin|pente|óleo|oleo/.test(lower);
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