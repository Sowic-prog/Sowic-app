
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://huzmjdmueyrhlucfpaun.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1em1qZG11ZXlyaGx1Y2ZwYXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NTAxMTYsImV4cCI6MjA4NDQyNjExNn0.9wRf8_UlBTF4GPutwzDYbf0kmZnzgPmkxYRsiy4VyYM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyRealInfrastructure() {
    console.log("Verifying Real Infrastructure Table Connection...");

    // 1. Try to fetch existing infrastructures
    console.log("Fetching from 'infrastructures' table...");
    const { data: existing, error: fetchError } = await supabase
        .from('infrastructures')
        .select('*');

    if (fetchError) {
        console.error("Error fetching:", fetchError);
        return;
    }
    console.log(`Found ${existing.length} infrastructure items.`);
    existing.forEach(item => {
        console.log(`- ${item.name} (${item.internal_id})`);
    });

    // 2. Try to insert a test item to ensure write permissions
    const testItem = {
        name: 'Test Setup Infra ' + Date.now(),
        internal_id: 'INF-TEST-SETUP',
        barcode_id: '9999',
        description: 'Testing write access',
        status: 'Operativo',
        ownership: 'Propio',
        image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=400',
        location: 'Test Location',
        year: 2024,
        daily_rate: 0,
        value: 0
    };

    console.log("Attempting to insert test item...");
    const { data: inserted, error: insertError } = await supabase
        .from('infrastructures')
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
            .from('infrastructures')
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

verifyRealInfrastructure();
