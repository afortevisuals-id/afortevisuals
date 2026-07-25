const express = require('express');
const supabase = require('../config/supabase');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('testimonials').select('*').eq('is_published', true).order('sort_order');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ testimonials: data });
});

router.post('/', requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('testimonials').insert([req.body]).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ testimonial: data });
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('testimonials').update(req.body).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ testimonial: data });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const { error } = await supabase.from('testimonials').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
