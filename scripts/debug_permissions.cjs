
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPermissionSave() {
    const TEST_ID = '77e5556c-f2ea-4ebe-aa7f-60ac3e5c6a80'; // Pablo
    console.log('--- STARTING PERMISSION DEBUG TEST ---');
    console.log('Target ID:', TEST_ID);

    // 1. Fetch current
    const { data: initial, error: initialError } = await supabase
        .from('staff')
        .select('auth_role, permissions')
        .eq('id', TEST_ID)
        .single();

    if (initialError) {
        console.error('Initial Fetch Error:', initialError);
        return;
    }
    console.log('1. Initial State:', initial);

    // 2. Define NEW state (Simulate User changing Maintenance to EDIT)
    const newPermissions = {
        "/maintenance": "edit",
        "/assets": "view",
        "/timestamp": new Date().toISOString() // Unique marker
    };

    const payload = {
        auth_role: 'User',
        permissions: newPermissions
    };

    console.log('2. Attempting Update with:', payload);

    const { error: updateError } = await supabase
        .from('staff')
        .update(payload)
        .eq('id', TEST_ID);

    if (updateError) {
        console.error('Update Error:', updateError);
        return;
    }
    console.log('3. Update Success (No Error returned)');

    // 3. Fetch again to verify
    const { data: final, error: finalError } = await supabase
        .from('staff')
        .select('auth_role, permissions')
        .eq('id', TEST_ID)
        .single();

    if (finalError) {
        console.error('Final Fetch Error:', finalError);
        return;
    }
    console.log('4. Final State from DB:', final);

    // Verification
    const savedCorrectly = final.permissions && final.permissions['/maintenance'] === 'edit' && final.permissions['/timestamp'] === newPermissions['/timestamp'];
    console.log('--- RESULT ---');
    if (savedCorrectly) {
        console.log('✅ SUCCESS: DB accepted and persisted permissions.');
    } else {
        console.log('❌ FAILURE: DB did not persist the changes.');
    }
}

testPermissionSave();
