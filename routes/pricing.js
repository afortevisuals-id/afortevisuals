const express = require('express');
const supabase = require('../config/supabase');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

// GET /api/pricing (publik)
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('price_packages')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ packages: data });
});

// PUT /api/pricing/:id (admin) — ubah harga/fitur paket
router.put('/:id', requireAdmin, async (req, res) => {
  const { name, price_from, features, is_popular } = req.body;
  const { data, error } = await supabase
    .from('price_packages')
    .update({ name, price_from, features, is_popular, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ package: data });
});

module.exports = router;
