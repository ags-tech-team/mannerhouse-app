const express = require('express');
const router = express.Router();
const {
  getFinancialDashboard,
  getSummary,
  getAll,
  getByDate,
  getServices,
} = require('../controllers/revenueController');
const { authMiddleware } = require('../middlewares/auth');

router.use(authMiddleware);

// 🔥 ROTAS ESPECÍFICAS (SEM PARÂMETROS) - DEVEM VIR PRIMEIRO
router.get('/services', getServices);
router.get('/dashboard', getFinancialDashboard);
router.get('/summary', getSummary);

// 🔥 ROTAS COM PARÂMETROS - DEVEM VIR DEPOIS
router.get('/:date', getByDate);

// 🔥 ROTAS GERAIS - DEVEM VIR POR ÚLTIMO
router.get('/', getAll);

module.exports = router;