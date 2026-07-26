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
    .from('testimonials').select('*').eq('is_published', true).order('sort_order');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ testimonials: data });
});

router.post('/', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { customer_name, service_type, rating, comment } = req.body;
    if (!customer_name || !comment) return res.status(400).json({ error: 'Nama dan komentar wajib diisi.' });

    let photo_url = null;
    if (req.file) {
      const fileExt = req.file.originalname.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `testimonials/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('aforte-media')
        .upload(filePath, req.file.buffer, { contentType: req.file.mimetype });
      if (uploadError) return res.status(500).json({ error: uploadError.message });
      const { data: publicUrlData } = supabase.storage.from('aforte-media').getPublicUrl(filePath);
      photo_url = publicUrlData.publicUrl;
    }

    const { data, error } = await supabase
      .from('testimonials')
      .insert([{ customer_name, service_type, rating: Number(rating) || 5, comment, photo_url }])
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ testimonial: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { customer_name, service_type, rating, comment } = req.body;
    const updateData = { customer_name, service_type, rating: Number(rating) || 5, comment };

    if (req.file) {
      const fileExt = req.file.originalname.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `testimonials/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('aforte-media')
        .upload(filePath, req.file.buffer, { contentType: req.file.mimetype });
      if (uploadError) return res.status(500).json({ error: uploadError.message });
      const { data: publicUrlData } = supabase.storage.from('aforte-media').getPublicUrl(filePath);
      updateData.photo_url = publicUrlData.publicUrl;
    }

    const { data, error } = await supabase
      .from('testimonials')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ testimonial: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const { error } = await supabase.from('testimonials').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
