const express = require('express');
const supabase = require('../config/supabase');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

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

module.exports = router;
