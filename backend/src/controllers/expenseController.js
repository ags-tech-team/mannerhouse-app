const { Expense } = require('../models');
const { Op } = require('sequelize');

const getAll = async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;
    const where = {};
    
    if (startDate && endDate) {
      where.date = {
        [Op.between]: [startDate, endDate],
      };
    }
    
    if (category) where.category = category;
    
    const expenses = await Expense.findAll({
      where,
      order: [['date', 'DESC']],
    });
    
    res.json(expenses);
  } catch (error) {
    console.error('Erro ao buscar despesas:', error);
    res.status(500).json({ error: 'Erro ao buscar despesas' });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findByPk(id);
    
    if (!expense) {
      return res.status(404).json({ error: 'Despesa não encontrada' });
    }
    
    res.json(expense);
  } catch (error) {
    console.error('Erro ao buscar despesa:', error);
    res.status(500).json({ error: 'Erro ao buscar despesa' });
  }
};

const create = async (req, res) => {
  try {
    const { description, category, value, date, paymentMethod, notes } = req.body;
    
    const expense = await Expense.create({
      description,
      category,
      value,
      date,
      paymentMethod,
      notes,
    });
    
    res.status(201).json(expense);
  } catch (error) {
    console.error('Erro ao criar despesa:', error);
    res.status(500).json({ error: 'Erro ao criar despesa' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, category, value, date, paymentMethod, notes } = req.body;
    
    const expense = await Expense.findByPk(id);
    if (!expense) {
      return res.status(404).json({ error: 'Despesa não encontrada' });
    }
    
    await expense.update({
      description,
      category,
      value,
      date,
      paymentMethod,
      notes,
    });
    
    res.json(expense);
  } catch (error) {
    console.error('Erro ao atualizar despesa:', error);
    res.status(500).json({ error: 'Erro ao atualizar despesa' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findByPk(id);
    
    if (!expense) {
      return res.status(404).json({ error: 'Despesa não encontrada' });
    }
    
    await expense.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar despesa:', error);
    res.status(500).json({ error: 'Erro ao deletar despesa' });
  }
};

const getByCategory = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};
    
    if (startDate && endDate) {
      where.date = {
        [Op.between]: [startDate, endDate],
      };
    }
    
    const expenses = await Expense.findAll({ where });
    
    const categorySummary = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.value;
      return acc;
    }, {});
    
    res.json(categorySummary);
  } catch (error) {
    console.error('Erro ao buscar despesas por categoria:', error);
    res.status(500).json({ error: 'Erro ao buscar despesas por categoria' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getByCategory,
};