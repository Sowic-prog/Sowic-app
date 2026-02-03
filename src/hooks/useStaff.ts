import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Staff } from '../types';

export const useStaff = () => {
    const [data, setData] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStaff = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: staffData, error: staffError } = await supabase
                .from('staff')
                .select('*')
                .order('name');

            if (staffError) throw staffError;

            const formattedStaff: Staff[] = (staffData || []).map(item => ({
                id: item.id,
                name: item.name,
                role: item.role,
                status: item.status,
                location: item.location,
                avatar: item.avatar || 'https://ui-avatars.com/api/?name=User&background=random',
                assignedAssets: item.assigned_assets || [],
                email: item.email,
                phone: item.phone,
                dni: item.dni,
                admissionDate: item.admission_date,
                certifications: item.certifications,
                auth: (item.username || item.password) ? {
                    username: item.username,
                    password: item.password,
                    role: item.auth_role as any || (['SuperAdmin', 'Admin', 'User', 'Viewer'].includes(item.role) ? item.role : 'User'),
                    permissions: item.permissions || {},
                    canManageUsers: item.auth_role === 'SuperAdmin' || item.auth_role === 'Admin' || item.role === 'SuperAdmin'
                } : undefined
            }));

            setData(formattedStaff);
        } catch (err: any) {
            console.error('Error fetching staff:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const createStaff = async (staff: Omit<Staff, 'id'>) => {
        try {
            const dbPayload = {
                name: staff.name,
                role: staff.role, // Job Title
                status: staff.status,
                location: staff.location,
                avatar: staff.avatar,
                email: staff.email,
                phone: staff.phone,
                dni: staff.dni,
                admission_date: staff.admissionDate || null,
                certifications: staff.certifications,
                assigned_assets: staff.assignedAssets,
                username: staff.auth?.username || null,
                password: staff.auth?.password || null,
                auth_role: staff.auth?.role || 'User',
                permissions: staff.auth?.permissions || {}
            };

            const { data: inserted, error } = await supabase
                .from('staff')
                .insert([dbPayload])
                .select()
                .single();

            if (error) throw error;
            await fetchStaff();
            return inserted;
        } catch (err: any) {
            throw err;
        }
    };

    const updateStaff = async (id: string, staff: Partial<Staff>) => {
        console.log("updateStaff called with ID:", id); // DEBUG
        console.log("updateStaff input object:", staff); // DEBUG
        console.log("updateStaff auth payload:", staff.auth); // DEBUG
        try {
            const dbPayload: any = {};
            if (staff.name !== undefined) dbPayload.name = staff.name;
            if (staff.role !== undefined) dbPayload.role = staff.role;
            if (staff.status !== undefined) dbPayload.status = staff.status;
            if (staff.location !== undefined) dbPayload.location = staff.location;
            if (staff.avatar !== undefined) dbPayload.avatar = staff.avatar;
            if (staff.email !== undefined) dbPayload.email = staff.email;
            if (staff.phone !== undefined) dbPayload.phone = staff.phone;
            if (staff.dni !== undefined) dbPayload.dni = staff.dni;
            if (staff.admissionDate !== undefined) dbPayload.admission_date = staff.admissionDate || null;
            if (staff.certifications !== undefined) dbPayload.certifications = staff.certifications;
            if (staff.assignedAssets !== undefined) dbPayload.assigned_assets = staff.assignedAssets;

            // Handle Auth Updates
            if (staff.auth === null) {
                // Explicitly clear auth if null is passed
                dbPayload.username = null;
                dbPayload.password = null;
                dbPayload.auth_role = 'User'; // Default role
                dbPayload.permissions = {};
            } else if (staff.auth) {
                // Update auth if object is passed
                dbPayload.username = staff.auth.username;
                dbPayload.password = staff.auth.password;
                dbPayload.auth_role = staff.auth.role;
                dbPayload.permissions = staff.auth.permissions;
            }

            console.log("FINAL DB PAYLOAD:", JSON.stringify(dbPayload, null, 2)); // DEBUG

            const { data: updatedRecord, error } = await supabase
                .from('staff')
                .update(dbPayload)
                .eq('id', id)
                .select(); // Removed .single() to avoid PGRST116

            if (error) throw error;

            if (!updatedRecord || updatedRecord.length === 0) {
                console.error("CRITICAL: Update operation returned 0 rows. Check ID and Permissions.");
                console.log("Target ID:", id);
                throw new Error("La actualización no afectó a ningún registro. Verifique permisos o si el usuario existe.");
            }

            console.log("DB RETURNED RECORD:", updatedRecord[0]); // DEBUG

            await fetchStaff();
            return updatedRecord[0];
        } catch (err: any) {
            console.error("Error inside updateStaff:", err);
            throw err;
        }
    };

    const deleteStaff = async (id: string) => {
        try {
            const { error } = await supabase
                .from('staff')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchStaff();
        } catch (err: any) {
            throw err;
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchStaff();
    }, [fetchStaff]);

    return {
        data,
        loading,
        error,
        fetchStaff,
        createStaff,
        updateStaff,
        deleteStaff
    };
};
