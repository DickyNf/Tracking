const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackingController');
const { verifyToken, authorize } = require('../authMiddleware');

// Endpoint untuk mengirim data hasil scan, hanya bisa diakses oleh 'pegawai'
router.post('/scan', verifyToken, authorize('pegawai'), trackingController.submitScan);

// Endpoint untuk melihat riwayat scan yang dilakukan oleh pegawai yang sedang login
router.get('/history', verifyToken, authorize('pegawai'), trackingController.getScanHistory);

module.exports = router;
