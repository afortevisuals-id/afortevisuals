const express = require('express');
const supabase = require('../config/supabase');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

// GET /api/pricing (publik) — opsional ?category=wedding
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('price_packages')
    .select('*, portfolio_categories(slug,label)')
    .eq('is_active', true)
    .order('sort_order');
  if (error) return res.status(500).json({ error: error.message });

  let packages = data;
  if (req.query.category) {
    packages = packages.filter(p => p.portfolio_categories?.slug === req.query.category);
  }
  res.json({ packages });
});

// POST /api/pricing (admin) — BARU: tambah paket harga untuk layanan apa pun
router.post('/', requireAdmin, async (req, res) => {
  const { name, category_slug, price_from, features, is_popular } = req.body;
  if (!name) return res.status(400).json({ error: 'Nama paket wajib diisi.' });
  if (!price_from || Number(price_from) <= 0) return res.status(400).json({ error: 'Harga tidak valid.' });

  const { data: cat } = await supabase
    .from('portfolio_categories')
    .select('id')
    .eq('slug', category_slug)
    .single();

  const { data, error } = await supabase
    .from('price_packages')
    .insert([{
      name,
      category_id: cat?.id || null,
      price_from: Number(price_from),
      features: Array.isArray(features) ? features : [],
      is_popular: !!is_popular,
      is_active: true
    }])
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ package: data });
});

// PUT /api/pricing/:id (admin) — ubah harga/fitur/kategori paket
router.put('/:id', requireAdmin, async (req, res) => {
  const { name, category_slug, price_from, features, is_popular } = req.body;

  let category_id;
  if (category_slug) {
    const { data: cat } = await supabase
      .from('portfolio_categories')
      .select('id')
      .eq('slug', category_slug)
      .single();
    category_id = cat?.id || null;
  }

  const updatePayload = { name, price_from, features, is_popular, updated_at: new Date().toISOString() };
  if (category_id !== undefined) updatePayload.category_id = category_id;

  const { data, error } = await supabase
    .from('price_packages')
    .update(updatePayload)
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ package: data });
});

// DELETE /api/pricing/:id (admin) — BARU: hapus paket
router.delete('/:id', requireAdmin, async (req, res) => {
  const { error } = await supabase.from('price_packages').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
