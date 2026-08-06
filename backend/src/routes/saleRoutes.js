const express = require('express');
const {
  getAll,
  create,
  getSummary,
} = require('../controllers/saleController');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', getAll);
router.get('/summary', getSummary);
router.post('/', create);

module.exports = router;