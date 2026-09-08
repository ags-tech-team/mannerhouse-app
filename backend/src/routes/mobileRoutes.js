const express = require('express');
const router = express.Router();
const { mobileLogin } = require('../controllers/mobileController');
const { authMiddleware } = require('../middlewares/auth');
const {
  getMobileAppointments,
  updateMobileAppointmentStatus,
  deleteMobileAppointment,
  updateMobileAppointment
} = require('../controllers/mobileController');

router.post('/login', mobileLogin);

router.use(authMiddleware);
router.get('/appointments', getMobileAppointments);
router.put('/appointments/:id/status', updateMobileAppointmentStatus);
router.put('/appointments/:id', updateMobileAppointment);
router.delete('/appointments/:id', deleteMobileAppointment);

module.exports = router;