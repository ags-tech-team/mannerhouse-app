const express = require('express');
const {
  getMonthlyClients,
  updateMonthlyStatus,
  confirmMonthlyPayment,
  getPaymentHistory,
  getMonthlyPayments,
  createMonthlyClient, 
} = require('../controllers/monthlyController');
const { authMiddleware, adminMiddleware } = require('../middlewares/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/clients', getMonthlyClients);
router.get('/payments', getMonthlyPayments);
router.get('/history/:clientId', getPaymentHistory);
router.put('/client/:id', updateMonthlyStatus);
router.post('/pay/:clientId', confirmMonthlyPayment);
router.post('/clients', createMonthlyClient); 
module.exports = router;