const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    const t1 = await supabase.from('machinery').select('*').limit(1);
    const t2 = await supabase.from('it_equipment').select('*').limit(1);
    const t3 = await supabase.from('infrastructure_installations').select('*').limit(1);
    const t4 = await supabase.from('vehicles').select('*').limit(1);
    console.log('Machinery Error:', t1.error?.message);
    console.log('IT Error:', t2.error?.message);
    console.log('Installations Error:', t3.error?.message);
    console.log('Vehicles Error:', t4.error?.message);
    process.exit(0);
}
check();
