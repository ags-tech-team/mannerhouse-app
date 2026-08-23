const express = require('express');
const { getBarberDashboard } = require('../controllers/barberDashboardController');
const { authMiddleware, barberMiddleware } = require('../middlewares/auth');

const router = express.Router();

router.use(authMiddleware);
router.use(barberMiddleware);

router.get('', getBarberDashboard);

module.exports = router;