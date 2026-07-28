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
  const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ settings: data });
});

router.put('/', requireAdmin, async (req, res) => {
  const allowedFields = [
    'business_name','whatsapp_number','contact_email','instagram_handle',
    'tiktok_handle','studio_address','operating_hours','hero_media_url','active_theme'
  ];
  const update = {};
  allowedFields.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
  update.updated_at = new Date().toISOString();
  const { data, error } = await supabase
    .from('site_settings').update(update).eq('id', 1).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ settings: data });
});

// BARU — upload/ganti foto "Di Balik Lensa" (section Tentang Kami di landing page)
router.post('/about-photo', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File gambar wajib diunggah.' });

    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `settings/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('aforte-media')
      .upload(filePath, req.file.buffer, { contentType: req.file.mimetype });
    if (uploadError) return res.status(500).json({ error: uploadError.message });

    const { data: publicUrlData } = supabase.storage.from('aforte-media').getPublicUrl(filePath);

    const { data, error } = await supabase
      .from('site_settings')
      .update({ about_photo_url: publicUrlData.publicUrl, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });

    res.json({ about_photo_url: data.about_photo_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
