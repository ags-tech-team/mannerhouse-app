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

router.get('/services', revenueController.getServices);
router.get('/dashboard', getFinancialDashboard);
router.get('/summary', getSummary);
router.get('/', getAll);
router.get('/:date', getByDate);

module.exports = router;