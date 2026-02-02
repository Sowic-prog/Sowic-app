import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Project } from '../types';

export const useProjects = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const { data, error } = await supabase
                    .from('projects')
                    .select('*')
                    .eq('status', 'Activa') // Only fetch active projects
                    .order('name');

                if (error) throw error;

                // Map database fields to Project type if necessary (assuming direct match based on previous checks)
                // Adjust mapping if database uses snake_case and types use camelCase
                const mappedProjects: Project[] = (data || []).map(p => ({
                    id: p.id,
                    name: p.name,
                    internalId: p.internal_id || p.internalId, // Handle both potential cases
                    responsible: p.responsible,
                    status: p.status,
                    location: p.location,
                    assignedAssets: p.assigned_assets_count || 0,
                    assignedStaff: p.assigned_staff_count || 0,
                    comitente: p.comitente
                }));

                setProjects(mappedProjects);
            } catch (err: any) {
                console.error('Error fetching projects:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, []);

    return { projects, loading, error };
};
