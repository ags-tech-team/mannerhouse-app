const express = require('express');
const {
  getBarbers,
  getAvailableTimes,
  createAppointment,
} = require('../controllers/publicAppointmentController');

const router = express.Router();

// 🔥 ROTAS PÚBLICAS (SEM AUTENTICAÇÃO)
router.get('/barbers', getBarbers);
router.get('/available-times', getAvailableTimes);
router.post('/appointments', createAppointment);

module.exports = router;