require('dotenv').config(); // Muat variabel lingkungan dari file .env
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const users = require('../data/users.json');

const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) {
  throw new Error("JWT_SECRET tidak ditemukan di environment variables. Pastikan file .env sudah benar.");
}

exports.login = (req, res) => {
  const { username, password } = req.body;

  const user = users.find(u => u.username === username);
  if (!user) {
    return res.status(401).json({ message: 'Username atau password salah' });
  }

  bcrypt.compare(password, user.password, (err, isMatch) => {
    if (err) {
      return res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
    if (!isMatch) {
      return res.status(401).json({ message: 'Username atau password salah' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, {
      expiresIn: '1h'
    });

    res.json({
      message: 'Login berhasil',
      token: token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  });
};
