const { Plan } = require('../models');

const getAll = async (req, res) => {
  try {
    const plans = await Plan.findAll({ order: [['displayOrder', 'ASC']] });
    res.json(plans);
  } catch (error) {
    console.error('Erro ao buscar planos:', error);
    res.status(500).json({ error: 'Erro ao buscar planos' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { price } = req.body;

    const plan = await Plan.findByPk(id);
    if (!plan) return res.status(404).json({ error: 'Plano não encontrado' });

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ error: 'Valor inválido' });
    }

    await plan.update({ price: parsedPrice });
    console.log(`✅ Plano ${plan.name} atualizado: R$ ${parsedPrice.toFixed(2)}`);
    res.json(plan);
  } catch (error) {
    console.error('Erro ao atualizar plano:', error);
    res.status(500).json({ error: 'Erro ao atualizar plano' });
  }
};

module.exports = { getAll, update };