const express = require('express');
const {
  getAll,
  getById,
  create,
  update,
  remove,
  resetAllWeeklyAdvances,
  updateWeeklyAdvance
} = require('../controllers/barberController');
const { authMiddleware, adminMiddleware } = require('../middlewares/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', getAll);
router.get('/:id', getById);

router.use(adminMiddleware);
router.post('/', create);
router.post('/reset-weekly-advances', resetAllWeeklyAdvances);
router.put('/:id', update);
router.put('/:id/advance', updateWeeklyAdvance);
router.delete('/:id', remove);

module.exports = router;