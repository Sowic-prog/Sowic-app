
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://huzmjdmueyrhlucfpaun.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1em1qZG11ZXlyaGx1Y2ZwYXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NTAxMTYsImV4cCI6MjA4NDQyNjExNn0.9wRf8_UlBTF4GPutwzDYbf0kmZnzgPmkxYRsiy4VyYM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProjects() {
    console.log('Checking projects table...');
    const { data, error } = await supabase.from('projects').select('*').limit(5);
    if (error) {
        console.error('Error fetching projects:', error);
    } else {
        console.log(`Found ${data.length} projects.`);
        if (data.length > 0) console.log('Sample project:', data[0]);
    }
}

checkProjects();
