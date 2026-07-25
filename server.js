require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const portfolioRoutes = require('./routes/portfolio');
const pricingRoutes = require('./routes/pricing');
const servicesRoutes = require('./routes/services');
const testimonialRoutes = require('./routes/testimonials');
const settingsRoutes = require('./routes/settings');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));
app.use(express.json());

app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 120 }));

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/settings', settingsRoutes);

app.use((req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan.' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Aforte Visuals API berjalan di port ${PORT}`));
