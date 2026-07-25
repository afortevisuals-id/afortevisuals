const express = require('express');
const { z } = require('zod');
const supabase = require('../config/supabase');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

const bookingSchema = z.object({
  full_name: z.string().min(2),
  whatsapp: z.string().min(8),
  email: z.string().email(),
  service_type: z.string().min(2),
  package_name: z.string().min(2),
  shoot_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  shoot_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Format waktu harus HH:MM'),
  location: z.string().min(2),
  guest_count: z.number().int().positive().default(1),
  notes: z.string().optional().nullable()
});

// GET /api/bookings/availability?month=2026-07
router.get('/availability', async (req, res) => {
  const { month } = req.query;
  let query = supabase
    .from('bookings')
    .select('shoot_date, status')
    .in('status', ['pending', 'confirmed']);

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const start = `${month}-01`;
    const end = `${month}-31`;
    query = query.gte('shoot_date', start).lte('shoot_date', end);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ bookedDates: data.map(b => b.shoot_date) });
});

// POST /api/bookings
router.post('/', async (req, res) => {
  const parsed = bookingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Data tidak valid', details: parsed.error.flatten() });
  }
  const payload = parsed.data;

  if (new Date(payload.shoot_date) < new Date(new Date().toDateString())) {
    return res.status(400).json({ error: 'Tanggal pemotretan tidak boleh di masa lalu.' });
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert([{ ...payload, status: 'pending' }])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Tanggal ini baru saja dipesan orang lain. Silakan pilih tanggal lain.' });
    }
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json({ booking: data });
});

// ---------- ADMIN ONLY ----------

router.get('/', requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('shoot_date', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ bookings: data });
});

router.patch('/:id/status', requireAdmin, async (req, res) => {
  const { status } = req.body;
  const allowed = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `Status harus salah satu dari: ${allowed.join(', ')}` });
  }
  const { data, error } = await supabase
    .from('bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ booking: data });
});

module.exports = router;
