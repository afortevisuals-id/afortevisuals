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

// GET /api/stories (publik) — opsional ?category=wedding
router.get('/', async (req, res) => {
  let query = supabase
    .from('wedding_stories')
    .select('*, portfolio_categories(slug,label)')
    .order('sort_order', { ascending: true });

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  let stories = data;
  if (req.query.category) {
    stories = stories.filter(s => s.portfolio_categories?.slug === req.query.category);
  }
  res.json({ stories });
});

// POST /api/stories (admin) — tambah story baru, dilengkapi foto
router.post('/', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { title, description, category_slug } = req.body;
    if (!req.file) return res.status(400).json({ error: 'File gambar wajib diunggah.' });
    if (!title) return res.status(400).json({ error: 'Judul story wajib diisi.' });

    const { data: cat } = await supabase
      .from('portfolio_categories')
      .select('id')
      .eq('slug', category_slug)
      .single();

    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `stories/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('aforte-media')
      .upload(filePath, req.file.buffer, { contentType: req.file.mimetype });
    if (uploadError) return res.status(500).json({ error: uploadError.message });

    const { data: publicUrlData } = supabase.storage.from('aforte-media').getPublicUrl(filePath);

    const { data, error } = await supabase
      .from('wedding_stories')
      .insert([{
        title,
        description: description || '',
        category_id: cat?.id || null,
        image_url: publicUrlData.publicUrl
      }])
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({ story: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/stories/:id (admin) — ubah judul/deskripsi/kategori (tanpa ganti foto)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { title, description, category_slug } = req.body;
    let category_id;
    if (category_slug) {
      const { data: cat } = await supabase
        .from('portfolio_categories')
        .select('id')
        .eq('slug', category_slug)
        .single();
      category_id = cat?.id || null;
    }

    const updatePayload = { title, description, updated_at: new Date().toISOString() };
    if (category_id !== undefined) updatePayload.category_id = category_id;

    const { data, error } = await supabase
      .from('wedding_stories')
      .update(updatePayload)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ story: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/stories/:id/photo (admin) — ganti foto story saja
router.put('/:id/photo', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File gambar wajib diunggah.' });

    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `stories/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('aforte-media')
      .upload(filePath, req.file.buffer, { contentType: req.file.mimetype });
    if (uploadError) return res.status(500).json({ error: uploadError.message });

    const { data: publicUrlData } = supabase.storage.from('aforte-media').getPublicUrl(filePath);

    const { data, error } = await supabase
      .from('wedding_stories')
      .update({ image_url: publicUrlData.publicUrl, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ story: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/stories/:id (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  const { error } = await supabase.from('wedding_stories').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
