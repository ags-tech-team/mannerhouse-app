const express = require('express');
const router = express.Router();
const {
  getFinancialDashboard,
  getSummary,
  getAll,
  getByDate,
  getServices,
  deleteRevenue, // 🔥 IMPORTAR
} = require('../controllers/revenueController');
const { authMiddleware } = require('../middlewares/auth');

router.use(authMiddleware);

// 🔥 ROTAS ESPECÍFICAS
router.get('/services', getServices);
router.get('/dashboard', getFinancialDashboard);
router.get('/summary', getSummary);

// 🔥 ROTAS COM PARÂMETROS
router.get('/:date', getByDate);
router.delete('/:id', deleteRevenue); // 🔥 NOVA ROTA DELETE

// 🔥 ROTAS GERAIS
router.get('/', getAll);

module.exports = router;