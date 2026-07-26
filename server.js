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
  const { data, error } = await supabase
    .from('services').select('*').eq('is_active', true).order('sort_order');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ services: data });
});

router.post('/', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { title, description, duration, photo_count } = req.body;
    if (!title) return res.status(400).json({ error: 'Judul layanan wajib diisi.' });

    let image_url = null;
    if (req.file) {
      const fileExt = req.file.originalname.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `services/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('aforte-media')
        .upload(filePath, req.file.buffer, { contentType: req.file.mimetype });
      if (uploadError) return res.status(500).json({ error: uploadError.message });
      const { data: publicUrlData } = supabase.storage.from('aforte-media').getPublicUrl(filePath);
      image_url = publicUrlData.publicUrl;
    }

    const { data, error } = await supabase
      .from('services')
      .insert([{ title, description, duration, photo_count, image_url }])
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ service: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { title, description, duration, photo_count } = req.body;
    const updateData = { title, description, duration, photo_count };

    if (req.file) {
      const fileExt = req.file.originalname.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `services/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('aforte-media')
        .upload(filePath, req.file.buffer, { contentType: req.file.mimetype });
      if (uploadError) return res.status(500).json({ error: uploadError.message });
      const { data: publicUrlData } = supabase.storage.from('aforte-media').getPublicUrl(filePath);
      updateData.image_url = publicUrlData.publicUrl;
    }

    const { data, error } = await supabase
      .from('services')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ service: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const { error } = await supabase.from('services').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
