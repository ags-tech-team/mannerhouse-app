const express = require('express');
const router = express.Router();
const {
  getAll,
  getById,
  create,
  update,
  remove,
} = require('../controllers/serviceController');
const { authMiddleware, adminMiddleware } = require('../middlewares/auth');

// 🔓 Leitura pública (usado pelo caixa, agenda, agendamento público)
router.get('/', getAll);
router.get('/:id', getById);

// 🔒 Apenas admin pode modificar
router.use(authMiddleware);
router.use(adminMiddleware);

router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;