const fs = require('fs').promises;
const path = require('path');

const trackingUpdatesPath = path.join(__dirname, '..', 'data', 'tracking_updates.json');
const transactionsPath = path.join(__dirname, '..', 'data', 'transactions.json');
const usersPath = path.join(__dirname, '..', 'data', 'users.json');

// Helper untuk membaca data JSON secara asinkron
const readData = async (filePath) => {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Jika file tidak ada atau error lain, kembalikan array kosong atau tangani error
    if (error.code === 'ENOENT') return [];
    throw error;
  }
};

// Helper untuk menulis data JSON secara asinkron
const writeData = async (filePath, data) => {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
};

// [POST] /api/tracking/scan
exports.submitScan = async (req, res) => {
  try {
    const { transaction_no, status, location_name, latitude, longitude } = req.body;
    const userId = req.user.id;

    if (!transaction_no || !status || !location_name) {
      return res.status(400).json({ message: 'Data tidak lengkap: transaction_no, status, dan location_name wajib diisi' });
    }

    const [trackingUpdates, transactions, users] = await Promise.all([
      readData(trackingUpdatesPath),
      readData(transactionsPath),
      readData(usersPath)
    ]);

    const transaction = transactions.find(t => t.transaction_no === transaction_no);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaksi tidak ditemukan' });
    }

    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }

    const newUpdate = {
      id: trackingUpdates.length > 0 ? Math.max(...trackingUpdates.map(u => u.id)) + 1 : 1,
      transaction_no,
      status,
      location_name,
      latitude,
      longitude,
      scanned_by: user.username,
      scanned_at: new Date().toISOString(),
      authorized: false
    };

    trackingUpdates.push(newUpdate);
    transaction.current_status = status;
    transaction.last_update = newUpdate.scanned_at;

    await Promise.all([
      writeData(trackingUpdatesPath, trackingUpdates),
      writeData(transactionsPath, transactions)
    ]);

    res.status(201).json({
      message: 'Data scan berhasil disimpan',
      data: newUpdate
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
};

// [GET] /api/tracking/history
exports.getScanHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const [users, trackingUpdates] = await Promise.all([
        readData(usersPath),
        readData(trackingUpdatesPath)
    ]);

    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }

    const userHistory = trackingUpdates.filter(update => update.scanned_by === user.username);

    res.json({
      message: 'Riwayat scan berhasil diambil',
      data: userHistory
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
};
