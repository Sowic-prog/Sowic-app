
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCreate() {
    const timestamp = Date.now();
    const newStaff = {
        name: `Test Staff ${timestamp}`,
        role: "Tester",
        status: "Disponible",
        location: "-",
        avatar: "",
        email: `test${timestamp}@example.com`,
        phone: "",
        dni: "",
        admission_date: new Date().toISOString().split('T')[0],
        certifications: "",
        assigned_assets: [],
        // Auth fields
        username: `user${timestamp}`,
        password: "password123",
        auth_role: "Admin",
        permissions: { "/assets": "edit", "/inventory": "view" }
    };

    console.log("Attempting to insert new staff:", newStaff);

    const { data, error } = await supabase
        .from('staff')
        .insert([newStaff])
        .select()
        .single();

    if (error) {
        console.error("Insert failed:", error);
    } else {
        console.log("Insert successful!");
        console.log("ID:", data.id);
        console.log("Name:", data.name);
        console.log("Role (Auth):", data.auth_role);
        console.log("Permissions:", data.permissions);
    }
}

testCreate();
