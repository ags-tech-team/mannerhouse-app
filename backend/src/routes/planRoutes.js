const express = require('express');
const { getAll, update } = require('../controllers/planController');
const { authMiddleware, adminMiddleware } = require('../middlewares/auth');

const router = express.Router();

router.use(authMiddleware);
router.get('/', getAll);

router.use(adminMiddleware);
router.put('/:id', update);

module.exports = router;