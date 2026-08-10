const express = require('express');
const { getDashboard } = require('../controllers/adminDashboardController');
const { authMiddleware, adminMiddleware } = require('../middlewares/auth');

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/dashboard', getDashboard);

module.exports = router;