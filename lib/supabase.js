require('dotenv').config(); // ensure .env is loaded before reading env vars
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.warn('Supabase env missing: SUPABASE_URL or SUPABASE_SERVICE_KEY');
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

module.exports = supabase;