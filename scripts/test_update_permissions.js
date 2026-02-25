
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdate() {
    console.log("Fetching a staff member...");
    const { data: staffList, error: fetchError } = await supabase
        .from('staff')
        .select('id, name, permissions, auth_role')
        .limit(1);

    if (fetchError) {
        console.error("Error fetching staff:", fetchError);
        return;
    }

    if (!staffList || staffList.length === 0) {
        console.error("No staff found.");
        return;
    }

    const staff = staffList[0];
    console.log("Target Staff:", staff.name, staff.id);
    console.log("Current Permissions:", staff.permissions);

    const newPermissions = {
        "/assets": "edit",
        "/inventory": "view"
    };
    const newRole = 'Admin';

    console.log("Attempting to update permissions to:", newPermissions);

    const { data: updated, error: updateError } = await supabase
        .from('staff')
        .update({
            permissions: newPermissions,
            auth_role: newRole
        })
        .eq('id', staff.id)
        .select()
        .single();

    if (updateError) {
        console.error("Update failed:", updateError);
    } else {
        console.log("Update successful!");
        console.log("New Permissions from DB:", updated.permissions);
        console.log("New Role from DB:", updated.auth_role);
    }
}

testUpdate();
