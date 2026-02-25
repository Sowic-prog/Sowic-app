
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://huzmjdmueyrhlucfpaun.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1em1qZG11ZXlyaGx1Y2ZwYXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NTAxMTYsImV4cCI6MjA4NDQyNjExNn0.9wRf8_UlBTF4GPutwzDYbf0kmZnzgPmkxYRsiy4VyYM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable(tableName) {
    try {
        const { data, error } = await supabase.from(tableName).select('*').limit(1);
        if (error) {
            console.log(`Table '${tableName}': ERROR - ${error.message} (Code: ${error.code})`);
            return false;
        } else {
            console.log(`Table '${tableName}': EXISTS - Access OK. Data found: ${data.length}`);
            if (data.length > 0) console.log('Sample Data keys:', Object.keys(data[0]));
            return true;
        }
    } catch (e) {
        console.log(`Table '${tableName}': EXCEPTION - ${e.message}`);
        return false;
    }
}

async function run() {
    console.log('--- Starting DB Verification ---');
    await checkTable('staff');
    await checkTable('Staf');
    await checkTable('perfiles');
    await checkTable('profiles');
    await checkTable('users'); // sometimes used
    console.log('--- Finished ---');
}

run();
