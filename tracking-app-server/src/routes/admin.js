const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, authorize } = require('../authMiddleware');

// Endpoint untuk melihat semua transaksi dengan filter
// Bisa diakses oleh admin_view dan admin_auth
router.get('/transactions', verifyToken, authorize(['admin_view', 'admin_auth']), adminController.getAllTransactions);

// Endpoint untuk melihat detail dan timeline dari satu transaksi
router.get('/transactions/:transaction_no', verifyToken, authorize(['admin_view', 'admin_auth']), adminController.getTransactionDetails);

// Endpoint untuk mendapatkan daftar update yang butuh otorisasi
router.get('/authorizations', verifyToken, authorize('admin_auth'), adminController.getPendingAuthorizations);

// Endpoint untuk menyetujui atau menolak sebuah update
router.post('/authorizations/:update_id', verifyToken, authorize('admin_auth'), adminController.processAuthorization);

module.exports = router;
