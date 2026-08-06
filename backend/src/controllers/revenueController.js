const { Revenue, CashRegister } = require('../models');
const { Op } = require('sequelize');

const getSummary = async (req, res) => {
  try {
    const { period } = req.query; // 'today', 'week', 'month'
    let startDate, endDate = new Date().toISOString().split('T')[0];
    
    const today = new Date();
    
    if (period === 'today') {
      startDate = today.toISOString().split('T')[0];
    } else if (period === 'week') {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      startDate = weekStart.toISOString().split('T')[0];
    } else if (period === 'month') {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      startDate = monthStart.toISOString().split('T')[0];
    }
    
    const revenues = await Revenue.findAll({
      where: {
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
      include: [{ model: CashRegister }],
    });
    
    const summary = {
      totalRevenue: revenues.reduce((sum, r) => sum + r.total, 0),
      totalCommissions: revenues.reduce((sum, r) => sum + r.commissions, 0),
      totalServices: revenues.reduce((sum, r) => sum + r.servicesCount, 0),
      totalInitialCash: revenues.reduce((sum, r) => sum + r.initialCash, 0),
      totalFinalCash: revenues.reduce((sum, r) => sum + r.finalCash, 0),
      count: revenues.length,
      revenues,
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Erro ao buscar resumo:', error);
    res.status(500).json({ error: 'Erro ao buscar resumo' });
  }
};

const getAll = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};
    
    if (startDate && endDate) {
      where.date = {
        [Op.between]: [startDate, endDate],
      };
    }
    
    const revenues = await Revenue.findAll({
      where,
      include: [{ model: CashRegister }],
      order: [['date', 'DESC']],
    });
    
    res.json(revenues);
  } catch (error) {
    console.error('Erro ao buscar faturamentos:', error);
    res.status(500).json({ error: 'Erro ao buscar faturamentos' });
  }
};

const getByDate = async (req, res) => {
  try {
    const { date } = req.params;
    
    const revenue = await Revenue.findOne({
      where: { date },
      include: [{ model: CashRegister }],
    });
    
    if (!revenue) {
      return res.status(404).json({ error: 'Faturamento não encontrado' });
    }
    
    res.json(revenue);
  } catch (error) {
    console.error('Erro ao buscar faturamento:', error);
    res.status(500).json({ error: 'Erro ao buscar faturamento' });
  }
};

module.exports = {
  getSummary,
  getAll,
  getByDate,
};