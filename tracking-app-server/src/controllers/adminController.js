const fs = require('fs').promises;
const path = require('path');

const transactionsPath = path.join(__dirname, '..', 'data', 'transactions.json');
const trackingUpdatesPath = path.join(__dirname, '..', 'data', 'tracking_updates.json');
const auditLogsPath = path.join(__dirname, '..', 'data', 'audit_logs.json');
const usersPath = path.join(__dirname, '..', 'data', 'users.json');

// Helper untuk membaca data JSON secara asinkron
const readData = async (filePath) => {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
};

// Helper untuk menulis data JSON secara asinkron
const writeData = async (filePath, data) => {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
};

// [GET] /api/admin/transactions
exports.getAllTransactions = async (req, res) => {
  try {
    const { date, status, pegawai } = req.query;
    let [transactions, trackingUpdates] = await Promise.all([
        readData(transactionsPath),
        readData(trackingUpdatesPath)
    ]);

    transactions = transactions.map(t => {
        const lastUpdate = trackingUpdates
            .filter(u => u.transaction_no === t.transaction_no)
            .sort((a, b) => new Date(b.scanned_at) - new Date(a.scanned_at))[0];
        return { ...t, last_scanned_by: lastUpdate ? lastUpdate.scanned_by : null };
    });

    if (status) {
      transactions = transactions.filter(t => t.current_status === status);
    }
    if (pegawai) {
        transactions = transactions.filter(t => t.last_scanned_by === pegawai);
    }
    if (date) {
      transactions = transactions.filter(t => {
        const lastUpdateDate = new Date(t.last_update).toISOString().split('T')[0];
        return lastUpdateDate === date;
      });
    }

    res.json({
      message: 'Data transaksi berhasil diambil',
      data: transactions
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
};

// [GET] /api/admin/transactions/:transaction_no
exports.getTransactionDetails = async (req, res) => {
  try {
    const { transaction_no } = req.params;
    const [transactions, trackingUpdates] = await Promise.all([
        readData(transactionsPath),
        readData(trackingUpdatesPath)
    ]);

    const transaction = transactions.find(t => t.transaction_no === transaction_no);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaksi tidak ditemukan' });
    }

    const timeline = trackingUpdates
      .filter(update => update.transaction_no === transaction_no)
      .sort((a, b) => new Date(a.scanned_at) - new Date(b.scanned_at));

    res.json({
      message: 'Detail transaksi berhasil diambil',
      data: {
        ...transaction,
        timeline: timeline
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
};

// [GET] /api/admin/authorizations
exports.getPendingAuthorizations = async (req, res) => {
  try {
    const trackingUpdates = await readData(trackingUpdatesPath);
    const pendingUpdates = trackingUpdates.filter(update => !update.authorized);
    res.json({
      message: 'Daftar update yang menunggu otorisasi berhasil diambil',
      data: pendingUpdates
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
};

// [POST] /api/admin/authorizations/:update_id
exports.processAuthorization = async (req, res) => {
  try {
    const { update_id } = req.params;
    const { action, notes } = req.body;
    const adminId = req.user.id;

    if (!action || (action !== 'authorize' && action !== 'reject')) {
      return res.status(400).json({ message: 'Aksi tidak valid. Gunakan "authorize" atau "reject".' });
    }

    const [trackingUpdates, auditLogs, users] = await Promise.all([
        readData(trackingUpdatesPath),
        readData(auditLogsPath),
        readData(usersPath)
    ]);

    const adminUser = users.find(u => u.id === adminId);
    if (!adminUser) {
      return res.status(404).json({ message: 'Admin tidak ditemukan' });
    }

    const updateIndex = trackingUpdates.findIndex(u => u.id === parseInt(update_id));
    if (updateIndex === -1) {
      return res.status(404).json({ message: 'Update tidak ditemukan' });
    }

    const updateToProcess = trackingUpdates[updateIndex];
    updateToProcess.authorized = (action === 'authorize');

    const newLog = {
      log_id: auditLogs.length > 0 ? Math.max(...auditLogs.map(l => l.log_id)) + 1 : 1,
      update_id: parseInt(update_id),
      action: action,
      authorized_by: adminUser.username,
      authorized_at: new Date().toISOString(),
      notes: notes || ''
    };
    auditLogs.push(newLog);

    await Promise.all([
        writeData(trackingUpdatesPath, trackingUpdates),
        writeData(auditLogsPath, auditLogs)
    ]);

    res.json({
      message: `Update berhasil di-${action}`,
      data: {
        update: updateToProcess,
        log: newLog
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
};
