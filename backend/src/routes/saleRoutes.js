const express = require('express');
const {
  getAll,
  getSummary,
  create,
  update,   
  remove
} = require('../controllers/saleController');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', getAll);
router.get('/summary', getSummary);
router.post('/', create);
router.put('/:id', update);   
router.delete('/:id', remove);

module.exports = router;