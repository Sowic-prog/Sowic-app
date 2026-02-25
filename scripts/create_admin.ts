
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Manually load env since we are not in Vite
const envPath = resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdmin() {
    const email = 'admin@sowic.com';
    const password = 'AdminUser123!'; // Stronger password than "Admin" to pass policies

    console.log(`Attempting to register user: ${email}`);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: 'Administrador Sistema'
            }
        }
    });

    if (error) {
        console.error('Error creating user:', error.message);
        return;
    }

    if (data.user) {
        console.log('User created successfully:', data.user.id);
        console.log('\nIMPORTANT: User is created with role "visualizador" by default (due to database trigger).');
        console.log('Use the following SQL to upgrade to Admin:');
        console.log(`UPDATE public.profiles SET role = 'admin' WHERE id = '${data.user.id}';`);
    } else {
        console.log('User creation initiated but no user returned (check email confirmation settings).');
    }
}

createAdmin();
