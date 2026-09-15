const express = require('express');
const router = express.Router();
const {
  getFinancialDashboard,
  getSummary,
  getAll,
  getByDate,
  getServices,
  deleteRevenue,
  updateRevenue, // 🔥 ADICIONAR
} = require('../controllers/revenueController');
const { authMiddleware } = require('../middlewares/auth');

router.use(authMiddleware);

// 🔥 ROTAS ESPECÍFICAS (PRIMEIRO)
router.get('/services', getServices);
router.get('/dashboard', getFinancialDashboard);
router.get('/summary', getSummary);

// 🔥 ROTAS COM PARÂMETROS
router.put('/:id', updateRevenue);    // 🔥 NOVA
router.delete('/:id', deleteRevenue); // ✅ Já existia
router.get('/:date', getByDate);

// 🔥 ROTAS GERAIS
router.get('/', getAll);

module.exports = router;