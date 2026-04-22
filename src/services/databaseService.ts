
import { supabase } from '../supabaseClient';
import { Asset, AssetStatus, Project, Staff, WorkOrder, Checklist, MaintenancePlan } from '../types';

// Centralized Mappers
export const mapAssetFromDB = (dbAsset: any, category: string): Asset => ({
    ...dbAsset,
    id: dbAsset.id,
    internalId: dbAsset.internal_id || '',
    barcodeId: dbAsset.barcode_id || '',
    name: dbAsset.name || '',
    type: dbAsset.type || category,
    description: dbAsset.description || '',
    status: dbAsset.status || AssetStatus.OPERATIONAL,
    ownership: dbAsset.ownership || 'Propio',
    supplier: dbAsset.supplier || '',
    hours: dbAsset.hours || 0,
    location: dbAsset.location || '',
    responsible: dbAsset.responsible || '',
    image: dbAsset.image || 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=400',
    brand: dbAsset.brand || '',
    model: dbAsset.model || '',
    serial: dbAsset.serial || '',
    year: dbAsset.year || new Date().getFullYear(),
    dailyRate: dbAsset.daily_rate || 0,
    value: dbAsset.value || 0,
    accountingAccount: dbAsset.accounting_account || '',
    functionalDescription: dbAsset.functional_description || '',
    complementaryDescription: dbAsset.complementary_description || '',
    originYear: dbAsset.origin_year || dbAsset.year || new Date().getFullYear(),
    usefulLifeRemaining: dbAsset.useful_life_remaining || 0,
    tti: dbAsset.tti || 0,
    domainNumber: dbAsset.domain_number || '',
    chassisNumber: dbAsset.chassis_number || '',
    engineNumber: dbAsset.engine_number || '',
    insuranceProvider: dbAsset.insurance_provider || '',
    regulatoryData: dbAsset.regulatory_data || undefined,
    averageDailyUsage: dbAsset.average_daily_usage || 0,
    expirations: dbAsset.expirations || [],
    incidents: dbAsset.incidents || [],
    photos: dbAsset.photos || [],
    category: category
});

// Cache keys
const ASSETS_CACHE_KEY = 'sowic_assets_persistent';
const LAST_SYNC_KEY = 'sowic_last_sync';

// Cache variables
let assetsCache: Asset[] | null = null;
let lastFetchTime = 0;
const MEMORY_CACHE_DURATION = 30000; // 30 seconds in memory

// Initialize cache from LocalStorage
const initPersistentCache = () => {
    try {
        const stored = localStorage.getItem(ASSETS_CACHE_KEY);
        if (stored) {
            assetsCache = JSON.parse(stored);
            console.log("Loaded persistent cache from Storage:", assetsCache?.length);
        }
    } catch (e) {
        console.error("Error loading persistent cache", e);
    }
};

initPersistentCache();

export const databaseService = {
    async getAllAssets(forceRefresh = false): Promise<Asset[]> {
        const now = Date.now();
        
        // If memory cache is fresh, return it immediately
        if (!forceRefresh && assetsCache && (now - lastFetchTime < MEMORY_CACHE_DURATION)) {
            return assetsCache;
        }

        const lastSync = localStorage.getItem(LAST_SYNC_KEY);
        
        try {
            // If we have no cache at all, do a full fetch
            if (!assetsCache || forceRefresh || !lastSync) {
                console.log("Performing FULL fetch of assets...");
                const responses = await Promise.all([
                    supabase.from('vehicles').select('*'),
                    supabase.from('machinery').select('*'),
                    supabase.from('it_equipment').select('*'),
                    supabase.from('mobiliario').select('*'),
                    supabase.from('infrastructures').select('*')
                ]);

                const [vData, mData, itData, fData, iData] = responses.map(r => r.data || []);

                const allAssets: Asset[] = [
                    ...vData.map(a => mapAssetFromDB(a, 'Vehículo')),
                    ...mData.map(a => mapAssetFromDB(a, 'Equipo/Maquinaria')),
                    ...itData.map(a => mapAssetFromDB(a, 'Equipos')),
                    ...fData.map(a => mapAssetFromDB(a, 'Mobiliario')),
                    ...iData.map(a => mapAssetFromDB(a, 'Inmueble/Infraestructura'))
                ];

                this.saveToPersistentCache(allAssets);
                return allAssets;
            } else {
                // INCREMENTAL FETCH: Only rows modified since last sync
                console.log(`Performing INCREMENTAL fetch since: ${lastSync}`);
                
                const responses = await Promise.all([
                    supabase.from('vehicles').select('*').gt('updated_at', lastSync),
                    supabase.from('machinery').select('*').gt('updated_at', lastSync),
                    supabase.from('it_equipment').select('*').gt('updated_at', lastSync),
                    supabase.from('mobiliario').select('*').gt('updated_at', lastSync),
                    supabase.from('infrastructures').select('*').gt('updated_at', lastSync)
                ]);

                const [vNew, mNew, itNew, fNew, iNew] = responses.map(r => r.data || []);

                const newRows = [
                    ...vNew.map(a => mapAssetFromDB(a, 'Vehículo')),
                    ...mNew.map(a => mapAssetFromDB(a, 'Equipo/Maquinaria')),
                    ...itNew.map(a => mapAssetFromDB(a, 'Equipos')),
                    ...fNew.map(a => mapAssetFromDB(a, 'Mobiliario')),
                    ...iNew.map(a => mapAssetFromDB(a, 'Inmueble/Infraestructura'))
                ];

                if (newRows.length > 0) {
                    console.log(`Sync complete: Found ${newRows.length} new/updated assets.`);
                    // Merge new rows into cache
                    const mergedAssets = [...assetsCache];
                    newRows.forEach(newItem => {
                        const index = mergedAssets.findIndex(a => a.id === newItem.id);
                        if (index !== -1) {
                            mergedAssets[index] = newItem; // Update existing
                        } else {
                            mergedAssets.push(newItem); // Add new
                        }
                    });
                    this.saveToPersistentCache(mergedAssets);
                    return mergedAssets;
                } else {
                    console.log("Sync complete: No new data.");
                    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString()); // Update timestamp anyway
                    return assetsCache;
                }
            }
        } catch (error) {
            console.error("Error fetching unified assets:", error);
            return assetsCache || [];
        }
    },

    saveToPersistentCache(assets: Asset[]) {
        assetsCache = assets;
        lastFetchTime = Date.now();
        try {
            // Strip heavy fields before saving to localStorage to stay under 5MB quota
            const lightAssets = assets.map(a => ({
                id: a.id,
                internalId: a.internalId,
                name: a.name,
                status: a.status,
                type: a.type,
                location: a.location,
                brand: a.brand,
                model: a.model,
                serial: a.serial,
                domainNumber: a.domainNumber,
                category: a.category,
                hours: a.hours,
                updated_at: (a as any).updated_at
            }));

            localStorage.setItem(ASSETS_CACHE_KEY, JSON.stringify(lightAssets));
            localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
        } catch (e) {
            console.warn("Storage Quota exceeded. Using memory-only cache.", e);
        }
    },

    async getMaintenanceData() {
        // Optimizing heavy fetch - uses the intelligent getAllAssets above
        const [assets, plans, events, checklists, workOrders] = await Promise.all([
            this.getAllAssets(),
            supabase.from('maintenance_plans').select('*'),
            supabase.from('maintenance_events').select('*'),
            supabase.from('checklists').select('*').order('date', { ascending: false }).limit(100),
            supabase.from('work_orders').select('id, asset_id, title, status, priority, date_start, date_due, responsible')
        ]);

        return {
            assets,
            plans: plans.data || [],
            events: events.data || [],
            checklists: checklists.data || [],
            workOrders: workOrders.data || []
        };
    },

    mapAssetFromDB
};
