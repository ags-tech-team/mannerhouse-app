const express = require('express');
const router = express.Router();
const monthlyController = require('../controllers/monthlyController');
const { authMiddleware } = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/clients', monthlyController.getMonthlyClients);
router.post('/clients', monthlyController.createMonthlyClient);
router.put('/client/:id', monthlyController.updateMonthlyStatus);
router.post('/pay/:clientId', monthlyController.confirmMonthlyPayment);
router.get('/payments', monthlyController.getMonthlyPayments);
router.get('/payment/history/:clientId', monthlyController.getPaymentHistory);
router.put('/payment/:id', monthlyController.updatePayment); // 🔥 NOVO
router.delete('/payment/:id', monthlyController.removePayment);

module.exports = router;