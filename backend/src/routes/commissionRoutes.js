const express = require('express');
const {
  getBarberCommission,
  getAllCommissions,
} = require('../controllers/commissionController');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/barbers', getAllCommissions);
router.get('/barber/:barberId', getBarberCommission);

module.exports = router;