
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://huzmjdmueyrhlucfpaun.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1em1qZG11ZXlyaGx1Y2ZwYXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NTAxMTYsImV4cCI6MjA4NDQyNjExNn0.9wRf8_UlBTF4GPutwzDYbf0kmZnzgPmkxYRsiy4VyYM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyInfrastructure() {
    console.log("Verifying Infrastructure Fix...");

    // 1. Try to fetch existing infrastructures (mapped as assets)
    console.log("Fetching infrastructures...");
    const { data: existing, error: fetchError } = await supabase
        .from('assets')
        .select('*')
        .eq('type', 'Instalaciones en infraestructuras');

    if (fetchError) {
        console.error("Error fetching:", fetchError);
        return;
    }
    console.log(`Found ${existing.length} existing infrastructure items.`);

    // 2. Try to insert a test infrastructure item
    const testItem = {
        name: 'Test Infrastructure ' + Date.now(),
        type: 'Instalaciones en infraestructuras',
        internal_id: 'TEST-INFRA-' + Math.floor(Math.random() * 1000),
        description: 'Temporary test item',
        status: 'Operativo',
        ownership: 'Propio'
    };

    console.log("Inserting test item:", testItem.name);
    const { data: inserted, error: insertError } = await supabase
        .from('assets')
        .insert(testItem)
        .select()
        .single();

    if (insertError) {
        console.error("Error inserting:", insertError);
    } else {
        console.log("Successfully inserted item ID:", inserted.id);

        // 3. Clean up
        console.log("Cleaning up test item...");
        const { error: deleteError } = await supabase
            .from('assets')
            .delete()
            .eq('id', inserted.id);

        if (deleteError) {
            console.error("Error deleting test item:", deleteError);
        } else {
            console.log("Cleanup successful.");
        }
    }

    console.log("Verification finished.");
}

verifyInfrastructure();
