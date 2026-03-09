const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase.from('vehicles').select('*').order('created_at', { ascending: false });
    console.log('Error:', error?.message);
    process.exit(0);
}
check();
