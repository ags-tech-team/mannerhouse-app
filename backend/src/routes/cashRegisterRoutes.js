const express = require('express');
const {
  getToday,
  openCashRegister,
  closeCashRegister,
  addService,
  removeService,
  getHistory,
  updateServices,
} = require('../controllers/cashRegisterController');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/today', getToday);
router.post('/open', openCashRegister);
router.post('/close', closeCashRegister);
router.post('/service', addService);
router.delete('/service/:serviceId', removeService);
router.get('/history', getHistory);
router.put('/services', updateServices);

module.exports = router;