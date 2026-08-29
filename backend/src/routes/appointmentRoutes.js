const express = require('express');
const {
  getAll,
  getByBarber,
  getAvailableTimes,
  checkAvailability, // 🔥 IMPORTAR
  create,
  updateStatus,
  remove,
  searchClients,
  getById,
} = require('../controllers/appointmentController');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();

router.use(authMiddleware);

// 🔥 ROTAS ESPECÍFICAS PRIMEIRO (ANTES DAS ROTAS COM PARÂMETROS)
router.get('/check-availability', checkAvailability); // 🔥 NOVO - DEVE VIR ANTES DO /:id
router.get('/clients/search', searchClients);

// 🔥 ROTAS COM PARÂMETROS
router.get('/barber/:barberId', getByBarber);
router.get('/barber/:barberId/available', getAvailableTimes);

// 🔥 ROTA GET BY ID (DEVE VIR POR ÚLTIMO)
router.get('/:id', getById);

// 🔥 DEMAIS ROTAS
router.get('/', getAll);
router.post('/', create);
router.patch('/:id/status', updateStatus);
router.delete('/:id', remove);

module.exports = router;