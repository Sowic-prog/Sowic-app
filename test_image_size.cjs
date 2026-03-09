const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase.from('vehicles').select('id, image, photos');
    if (error) {
        console.error("Error fetching images:", error.message);
    } else {
        let hugeIds = [];
        data.forEach(v => {
            let size = 0;
            if (v.image) size += v.image.length;
            if (v.photos) size += v.photos.reduce((acc, p) => acc + (p ? p.length : 0), 0);
            if (size > 100000) hugeIds.push({ id: v.id, size: Math.round(size / 1024) + ' KB' });
        });
        console.log("Huge images found:", hugeIds);
    }
    process.exit(0);
}
check();
