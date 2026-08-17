const express = require('express');
const { Client } = require('../models');
const { Op } = require('sequelize');
const {
  getBarbers,
  getAvailableTimes,
  createAppointment,
} = require('../controllers/publicAppointmentController');

const router = express.Router();

// 🔥 ROTAS PÚBLICAS (SEM AUTENTICAÇÃO)
router.get('/barbers', getBarbers);
router.get('/available-times', getAvailableTimes);
router.post('/appointments', createAppointment);

router.get('/clients/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json([]);
    }
    
    const clients = await Client.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${q}%` } },
          { phone: { [Op.like]: `%${q}%` } },
        ],
        isActive: true,
      },
      attributes: ['id', 'name', 'phone', 'isMonthly', 'monthlyFee'],
      limit: 10,
    });
    
    res.json(clients);
  } catch (error) {
    console.error('Erro ao buscar clientes (público):', error);
    res.status(500).json({ error: 'Erro ao buscar clientes' });
  }
});

module.exports = router;