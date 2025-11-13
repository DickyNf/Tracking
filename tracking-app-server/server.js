require('dotenv').config();
const express = require('express');
const cors = require('cors'); // Impor middleware cors
const app = express();
const port = 3000;

const authRoutes = require('./src/routes/auth');
const trackingRoutes = require('./src/routes/tracking');
const adminRoutes = require('./src/routes/admin');

// Gunakan middleware cors untuk semua rute
app.use(cors());

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Tracking App Server is running!');
});

// Gunakan rute autentikasi dengan prefix /api/auth
app.use('/api/auth', authRoutes);

// Gunakan rute tracking dengan prefix /api/tracking
app.use('/api/tracking', trackingRoutes);

// Gunakan rute admin dengan prefix /api/admin
app.use('/api/admin', adminRoutes);

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
