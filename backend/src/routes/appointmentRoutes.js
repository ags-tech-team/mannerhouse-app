const express = require('express');
const {
  getAll,
  getByBarber,
  getAvailableTimes,
  create,
  updateStatus,
  remove,
  searchClients,
  getById,
} = require('../controllers/appointmentController');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', getAll);
router.get('/clients/search', searchClients);
router.get('/barber/:barberId', getByBarber);
router.get('/barber/:barberId/available', getAvailableTimes);
router.post('/', create);
router.patch('/:id/status', updateStatus);
router.delete('/:id', remove);
router.get('/:id', appointmentController.getById);

module.exports = router;