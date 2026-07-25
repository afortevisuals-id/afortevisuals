const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[warn] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diset di .env');
}

// Service role key digunakan di backend saja (bypass RLS untuk operasi admin & booking).
// JANGAN PERNAH kirim service_role key ke frontend/browser.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

module.exports = supabase;
