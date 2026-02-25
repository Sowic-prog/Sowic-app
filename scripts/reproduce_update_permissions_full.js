
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFullUpdate() {
    console.log("Searching for 'Pablo Carrizo'...");
    const { data: staffList } = await supabase.from('staff').select('*').eq('name', 'Pablo Carrizo');

    if (!staffList || staffList.length === 0) {
        console.error("Pablo not found!");
        return;
    }

    const pablo = staffList[0];
    console.log("Found Pablo:", pablo.id);

    // Mimic the payload exactly as Personnel.tsx constructs it
    // Assumption: formData populated with new values
    const newStaffData = {
        name: pablo.name,
        role: pablo.role,
        status: pablo.status,
        location: pablo.location,
        avatar: pablo.avatar,
        email: pablo.email,
        phone: pablo.phone,
        dni: pablo.dni,
        admission_date: pablo.admission_date,
        certifications: pablo.certifications,
        assigned_assets: pablo.assigned_assets,

        // Auth payload mimicking how useStaff.ts constructs it
        username: "Pablo",
        password: pablo.password || "newpassword",
        auth_role: "User", // Trying to set him as User
        permissions: { // TRYING TO SET PERMISSIONS
            "/assets": "view",
            "/projects": "none",
            "/inventory": "edit"
        }
    };

    console.log("Updating with:", JSON.stringify(newStaffData.permissions, null, 2));

    const { data: updated, error } = await supabase
        .from('staff')
        .update(newStaffData)
        .eq('id', pablo.id)
        .select()
        .single();

    if (error) {
        console.error("Update failed:", error);
    } else {
        console.log("Update success!");
        console.log("Permissions in DB:", updated.permissions);
    }
}

testFullUpdate();
