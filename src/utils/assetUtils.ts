
import { supabase } from '../supabaseClient';
import { Asset } from '../types';

export const getAssetPrefix = (type: Asset['type']): string => {
    switch (type) {
        case 'Maquinaria': return 'MAQ';
        case 'Rodados': return 'ROD';
        case 'Equipos de Informática': return 'IT';
        case 'Instalaciones en infraestructuras': return 'INS';
        case 'Mobiliario': return 'MOB';
        default: return 'GEN';
    }
};

const getTableForType = (type: Asset['type']): string => {
    switch (type) {
        case 'Maquinaria': return 'machinery';
        case 'Rodados': return 'vehicles';
        case 'Equipos de Informática': return 'it_equipment';
        case 'Instalaciones en infraestructuras': return 'infrastructure_installations';
        case 'Mobiliario': return 'mobiliario';
        default: return 'assets';
    }
};

export const getNextInternalId = async (type: Asset['type']): Promise<string> => {
    const prefix = getAssetPrefix(type);
    const tableName = getTableForType(type);

    try {
        const { data, error } = await supabase
            .from(tableName as any)
            .select('internal_id')
            .ilike('internal_id', `${prefix}-%`)
            .order('internal_id', { ascending: false })
            .limit(1);

        if (error) {
            console.error(`Error fetching last internal ID from ${tableName}:`, error);
            // Fallback: try checking if any exist to avoid resetting to 001 if error is transient
            return `${prefix}-001`;
        }

        if (data && data.length > 0 && data[0].internal_id) {
            const lastId = data[0].internal_id;
            const parts = lastId.split('-');
            if (parts.length === 2) {
                const numberPart = parseInt(parts[1], 10);
                if (!isNaN(numberPart)) {
                    const nextNumber = numberPart + 1;
                    return `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
                }
            }
        }

        return `${prefix}-001`;
    } catch (err) {
        console.error('Exception in getNextInternalId:', err);
        return `${prefix}-001`;
    }
};
