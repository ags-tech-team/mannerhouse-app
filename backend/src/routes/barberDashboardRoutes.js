const express = require('express');
const { getDashboard } = require('../controllers/barberDashboardController');
const { authMiddleware, barberMiddleware } = require('../middlewares/auth');

const router = express.Router();

router.use(authMiddleware);
router.use(barberMiddleware);

router.get('', getDashboard);

module.exports = router;