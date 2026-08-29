const express = require('express');
const {
  getFinancialDashboard,
  getSummary,
  getAll,
  getByDate,
  getServices,
} = require('../controllers/revenueController');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/dashboard', getFinancialDashboard);
router.get('/summary', getSummary);
router.get('/', getAll);
router.get('/:date', getByDate);
router.get('/services', getServices)

module.exports = router;