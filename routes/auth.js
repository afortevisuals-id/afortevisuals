const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const router = express.Router();

// Batasi percobaan login untuk mencegah brute-force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Terlalu banyak percobaan login. Coba lagi nanti.' }
});

// POST /api/auth/login
// Body: { email, password }
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi.' });
  }

  const validEmail = email.toLowerCase() === (process.env.ADMIN_EMAIL || '').toLowerCase();
  const validPassword = validEmail && process.env.ADMIN_PASSWORD_HASH
    ? await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH)
    : false;

  if (!validEmail || !validPassword) {
    return res.status(401).json({ error: 'Email atau password salah.' });
  }

  const token = jwt.sign(
    { role: 'admin', email },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, expiresIn: '8h' });
});

module.exports = router;
