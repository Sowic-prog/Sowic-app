
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://huzmjdmueyrhlucfpaun.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1em1qZG11ZXlyaGx1Y2ZwYXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NTAxMTYsImV4cCI6MjA4NDQyNjExNn0.9wRf8_UlBTF4GPutwzDYbf0kmZnzgPmkxYRsiy4VyYM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
    console.log('--- Starting Staff CRUD Verification ---');

    const testName = `Test User ${Date.now()}`;
    const testEmail = `test_${Date.now()}@example.com`;

    // 1. CREATE
    console.log('1. Testing CREATE...');
    const { data: created, error: createError } = await supabase
        .from('staff')
        .insert([{
            name: testName,
            role: 'User',
            status: 'Disponible',
            email: testEmail,
            location: 'Test Lab',
            // Default fields to satisfy constraints if any
        }])
        .select()
        .single();

    if (createError) {
        console.error('CREATE Failed:', createError);
        process.exit(1);
    }
    console.log('CREATE Success. ID:', created.id);

    // 2. READ
    console.log('2. Testing READ...');
    const { data: readData, error: readError } = await supabase
        .from('staff')
        .select('*')
        .eq('id', created.id)
        .single();

    if (readError || !readData) {
        console.error('READ Failed:', readError);
        process.exit(1);
    }
    if (readData.name !== testName) {
        console.error('READ Mismatch:', readData.name, 'vs', testName);
        process.exit(1);
    }
    console.log('READ Success.');

    // 3. UPDATE
    console.log('3. Testing UPDATE...');
    const { error: updateError } = await supabase
        .from('staff')
        .update({ status: 'En Obra' })
        .eq('id', created.id);

    if (updateError) {
        console.error('UPDATE Failed:', updateError);
        process.exit(1);
    }

    // Verify Update
    const { data: updatedData } = await supabase.from('staff').select('status').eq('id', created.id).single();
    if (updatedData.status !== 'En Obra') {
        console.error('UPDATE Verification Failed. Status is:', updatedData.status);
        process.exit(1);
    }
    console.log('UPDATE Success.');

    // 4. DELETE
    console.log('4. Testing DELETE...');
    const { error: deleteError } = await supabase
        .from('staff')
        .delete()
        .eq('id', created.id);

    if (deleteError) {
        console.error('DELETE Failed:', deleteError);
        process.exit(1);
    }

    // Verify Delete
    const { data: deletedCheck } = await supabase.from('staff').select('*').eq('id', created.id).single();
    if (deletedCheck) {
        console.error('DELETE Verification Failed. Record still exists.');
        process.exit(1);
    }
    console.log('DELETE Success.');

    console.log('--- ALL TESTS PASSED ---');
}

runTests();
