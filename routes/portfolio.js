const express = require('express');
const multer = require('multer');
const supabase = require('../config/supabase');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('File harus berupa gambar.'));
    cb(null, true);
  }
});

router.get('/', async (req, res) => {
  let query = supabase
    .from('portfolio_items')
    .select('*, portfolio_categories(slug,label)')
    .order('sort_order', { ascending: true });

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  let items = data;
  if (req.query.category) {
    items = items.filter(i => i.portfolio_categories?.slug === req.query.category);
  }
  res.json({ items });
});

router.get('/categories', async (req, res) => {
  const { data, error } = await supabase
    .from('portfolio_categories')
    .select('*')
    .order('sort_order');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ categories: data });
});

router.post('/', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { title, category_slug, is_featured } = req.body;
    if (!req.file) return res.status(400).json({ error: 'File gambar wajib diunggah.' });
    if (!title) return res.status(400).json({ error: 'Judul foto wajib diisi.' });

    const { data: cat } = await supabase
      .from('portfolio_categories')
      .select('id')
      .eq('slug', category_slug)
      .single();

    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `portfolio/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('aforte-media')
      .upload(filePath, req.file.buffer, { contentType: req.file.mimetype });
    if (uploadError) return res.status(500).json({ error: uploadError.message });

    const { data: publicUrlData } = supabase.storage.from('aforte-media').getPublicUrl(filePath);

    const { data, error } = await supabase
      .from('portfolio_items')
      .insert([{
        title,
        category_id: cat?.id || null,
        image_url: publicUrlData.publicUrl,
        is_featured: is_featured === 'true'
      }])
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({ item: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const { error } = await supabase.from('portfolio_items').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
