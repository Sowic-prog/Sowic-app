
import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Search, Filter, MapPin, Activity, ChevronRight, ArrowLeft, Truck,
    Hammer, Phone, Calendar, CheckCircle2, MoreVertical, Wrench,
    DollarSign, Bot, Car, Camera, Plus, Save, X, User, QrCode,
    Flashlight, ImageIcon, Keyboard, Edit3, History, Clock, FileText, Tag, Info, ChevronDown, UserCircle2, RotateCcw,
    ShieldAlert, ShieldCheck, AlertCircle, Trash2, Printer, Download, ChevronUp, ClipboardCheck, ChevronLeft, ClipboardList,
    HardHat, ScanLine, CalendarClock, Briefcase, Coins, Percent, FileType, AlertTriangle, CloudRain, Paperclip, FileCheck, Package
} from 'lucide-react';
import AssetImportModal from '../components/AssetImportModal';
import { Asset, AssetStatus, AssetExpiration, WorkOrderStatus, AssetOwnership, AssetIncident, Project, Staff } from '../types';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { getNextInternalId } from '../utils/assetUtils';

// Helper to map DB snake_case to TS camelCase
const mapAssetFromDB = (dbAsset: any): Asset => ({
    ...dbAsset,
    internalId: dbAsset.internal_id || '',
    barcodeId: dbAsset.barcode_id || '',
    dailyRate: dbAsset.daily_rate || 0,
    originYear: dbAsset.origin_year || dbAsset.year || new Date().getFullYear(),
    usefulLifeRemaining: dbAsset.useful_life_remaining || 0,
    accountingAccount: dbAsset.accounting_account || '',
    functionalDescription: dbAsset.functional_description || '',
    complementaryDescription: dbAsset.complementary_description || '',
    location: dbAsset.location || '', // Default to empty string
    domainNumber: dbAsset.domain_number || '',
    chassisNumber: dbAsset.chassis_number || '',
    engineNumber: dbAsset.engine_number || '',
    insuranceProvider: dbAsset.insurance_provider || '',
    regulatoryData: dbAsset.regulatory_data || undefined,
    averageDailyUsage: dbAsset.average_daily_usage || 0,
    // Ensure arrays are initialized
    expirations: dbAsset.expirations || [],
    incidents: dbAsset.incidents || [],
    type: 'Rodados', // Hardcoded for Vehicles page
    hours: dbAsset.hours || 0, // Default to 0 to avoid undefined error
    value: dbAsset.value || 0,
    tti: dbAsset.tti || 0,
    name: dbAsset.name || '',
    brand: dbAsset.brand || '',
    model: dbAsset.model || '',
    serial: dbAsset.serial || '',
    ownership: dbAsset.ownership || 'Propio',
    status: dbAsset.status || AssetStatus.OPERATIONAL,
    image: dbAsset.image || '',
    responsible: dbAsset.responsible || '',
    supplier: dbAsset.supplier || '',
});

const mapWorkOrderFromDB = (data: any) => ({
    id: data.id,
    mockId: data.mock_id,
    title: data.title,
    description: data.description,
    assetId: data.asset_id,
    assetName: data.asset_name,
    internalId: data.internal_id,
    type: data.type,
    priority: data.priority,
    status: data.status,
    dateStart: data.date_start,
    dateEnd: data.date_end,
    responsible: data.responsible,
    isOutsourced: data.is_outsourced,
    provider: data.provider,
    updates: data.updates || [],
    expenses: data.expenses || [],
    checklists: data.checklists || [],
    environmentalNotes: data.environmental_notes,
    environmentalTips: data.environmental_tips,
    checklistIA: data.checklist_ia || [],
    project_id: data.project_id,
    maintenancePlanId: data.maintenance_plan_id,
    maintenanceEventId: data.maintenance_event_id,
    closingData: data.closing_data
});

// Helper to map TS camelCase to DB snake_case
const mapAssetToDB = (asset: Partial<Asset>) => {
    const {
        internalId, barcodeId, dailyRate, originYear, usefulLifeRemaining,
        accountingAccount, functionalDescription, complementaryDescription,
        domainNumber, chassisNumber, engineNumber, insuranceProvider,
        regulatoryData, averageDailyUsage, expirations, incidents, documents,
        ...rest
    } = asset;

    return {
        ...rest,
        internal_id: internalId,
        barcode_id: barcodeId,
        daily_rate: dailyRate,
        origin_year: originYear,
        useful_life_remaining: usefulLifeRemaining,
        accounting_account: accountingAccount,
        functional_description: functionalDescription,
        complementary_description: complementaryDescription,
        domain_number: domainNumber,
        chassis_number: chassisNumber,
        engine_number: engineNumber,
        insurance_provider: insuranceProvider,
        regulatory_data: regulatoryData || {},
        average_daily_usage: averageDailyUsage,
        expirations: expirations || [],
        incidents: incidents || []
    };
};

const mapProjectFromDB = (data: any): Project => ({
    ...data,
    id: data.id,
    name: data.name,
    location: data.location || 'Ubicación Desconocida',
    status: data.status || 'Activa',
    internalId: data.internal_id,
    assignedAssets: data.assigned_assets_count || 0,
    assignedStaff: data.assigned_staff_count || 0,
    responsible: data.responsible || 'Sin Asignar'
});

const mapStaffFromDB = (data: any): Staff => ({
    ...data,
    id: data.id,
    name: data.name,
    role: data.role || 'Colaborador',
    status: data.status || 'Activo',
    location: data.location || 'Base',
    avatar: data.avatar || 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=400&q=80',
    assignedAssets: [],
    email: data.email,
    phone: data.phone,
    dni: data.dni
});

// Simple CSS Barcode Component
const BarcodeView = ({ id }: { id: string }) => {
    return (
        <div className="flex flex-col items-center gap-1 bg-white p-3 rounded-xl border border-slate-200 w-full max-w-[200px]">
            <div className="flex h-10 w-full items-end justify-center gap-[3px]">
                {[...Array(25)].map((_, i) => (
                    <div
                        key={i}
                        className={`bg-slate-900 ${Math.random() > 0.5 ? 'w-[3px]' : 'w-px'} ${Math.random() > 0.8 ? 'h-full' : 'h-[85%]'}`}
                    />
                ))}
            </div>
            <span className="font-mono text-sm font-bold tracking-[0.3em] text-slate-800">{id}</span>
        </div>
    );
};

const AssetListItem = React.memo(({ asset, onClick, getStatusColor }: { asset: Asset, onClick: (asset: Asset) => void, getStatusColor: (status: AssetStatus) => string }) => {
    return (
        <div
            onClick={() => onClick(asset)}
            className="bg-white p-4 rounded-3xl border border-slate-50 shadow-sm flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform relative overflow-hidden group optimize-visibility"
        >
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${getStatusColor(asset.status)}`}></div>

            <div className="w-20 h-20 bg-slate-100 rounded-2xl overflow-hidden shrink-0 border border-slate-100">
                <img src={asset.image} alt={asset.name} loading="lazy" className="w-full h-full object-cover" />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{asset.internalId}</span>
                    {asset.ownership === 'Alquilado' && (
                        <span className="text-[9px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">RENT</span>
                    )}
                </div>

                <h3 className="font-bold text-slate-800 text-sm truncate pr-2 leading-tight">{asset.name}</h3>

                <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">
                        <Activity size={12} className="text-orange-500" />
                        {(asset.hours || 0).toLocaleString()} {asset.type === 'Rodados' ? 'km' : 'hs'}
                    </div>
                </div>
            </div>

            <ChevronRight size={20} className="text-slate-300 group-hover:text-orange-500 transition-colors" />
        </div>
    );
});

const Vehicles: React.FC = () => {
    const { user, checkPermission } = useAuth();
    const isSuperAdmin = user?.auth?.role === 'SuperAdmin';
    const canEdit = checkPermission('/assets', 'edit'); // Keep permission key same? Or use new key?
    // Using '/assets' permission ensures backward compatibility unless user wants granular permissions.
    // Given the task, I'll stick to '/assets' for now or maybe check '/assets/vehicles' if implementing granular.
    // I'll stick to '/assets' to avoid permission issues immediately.
    const location = useLocation();
    const navigate = useNavigate();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [dbProjects, setDbProjects] = useState<Project[]>([]);
    const [dbStaff, setDbStaff] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [currentAllocation, setCurrentAllocation] = useState<any | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isEditingAsset, setIsEditingAsset] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Ownership Filter State
    const [assetTab, setAssetTab] = useState<'all' | 'owned' | 'rented' | 'leasing'>('all');

    // Incident Modal State
    const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
    const [isEditingIncident, setIsEditingIncident] = useState(false);
    const [editingIncidentId, setEditingIncidentId] = useState<string | null>(null);
    const [newIncidentForm, setNewIncidentForm] = useState<Partial<AssetIncident>>({
        date: new Date().toISOString().split('T')[0],
        description: '',
        damageLevel: 'Leve',
        cost: 0,
        status: 'Reportado',
        incidentNumber: '',
        reportUrl: ''
    });

    // Edit form state
    const [editFormData, setEditFormData] = useState<Partial<Asset>>({});
    const [addExpFormForEdit, setAddExpFormForEdit] = useState<Partial<AssetExpiration>>({ type: 'ITV', expirationDate: '', notes: '' });

    // New Detail States
    const [assetWorkOrders, setAssetWorkOrders] = useState<any[]>([]);
    const [assetChecklists, setAssetChecklists] = useState<any[]>([]);
    const [assetPlans, setAssetPlans] = useState<any[]>([]);
    const [isWorkOrdersExpanded, setIsWorkOrdersExpanded] = useState(false);

    // Create form state
    const [newAssetData, setNewAssetData] = useState<Partial<Asset>>({
        name: '',
        internalId: '',
        barcodeId: '',
        type: 'Rodados',
        status: AssetStatus.OPERATIONAL,
        ownership: 'Propio',
        supplier: '',
        brand: '',
        model: '',
        serial: '',
        year: new Date().getFullYear(),
        location: 'Pañol Central',
        responsible: '', // Initialize empty
        image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=400',
        dailyRate: 0,
        value: 0,
        hours: 0,
        domainNumber: '',
        // New Fields Initial State
        accountingAccount: '',
        functionalDescription: '',
        complementaryDescription: '',
        originYear: new Date().getFullYear(),
        usefulLifeRemaining: 0,
        tti: 0,
        chassisNumber: '',
        engineNumber: '',
        insuranceProvider: '',
        incidents: []
    });

    // Auto-generate Internal ID on Create
    useEffect(() => {
        if (isCreating) {
            const fetchNextId = async () => {
                const nextId = await getNextInternalId(newAssetData.type || 'Rodados');
                setNewAssetData(prev => ({ ...prev, internalId: nextId }));
            };
            fetchNextId();
        }
    }, [isCreating, newAssetData.type]);

    // Auto-generate Name
    useEffect(() => {
        if (isCreating) {
            const func = newAssetData.functionalDescription || '';
            const brand = newAssetData.brand || '';
            const model = newAssetData.model || '';

            let parts = [];
            if (func) parts.push(func);
            if (brand) parts.push(brand);
            if (model) parts.push(model);

            const generatedName = parts.join(' ');
            if (generatedName !== newAssetData.name) {
                setNewAssetData(prev => ({ ...prev, name: generatedName }));
            }
        }
    }, [newAssetData.functionalDescription, newAssetData.brand, newAssetData.model, isCreating]);

    const [newExpirations, setNewExpirations] = useState<AssetExpiration[]>([]);
    const [newExpForm, setNewExpForm] = useState<Partial<AssetExpiration>>({ type: 'ITV', expirationDate: '', notes: '' });

    // Expiration Modal State
    const [isExpModalOpen, setIsExpModalOpen] = useState(false);
    const [newExp, setNewExp] = useState<Partial<AssetExpiration>>({ type: 'ITV', expirationDate: '', notes: '' });

    // Collapsible states
    const [isPlansExpanded, setIsPlansExpanded] = useState(false);
    const [isWorkOrdersExpanded_Unused, setIsWorkOrdersExpanded_Unused] = useState(false); // Legacy
    const [isChecklistsExpanded, setIsChecklistsExpanded] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const incidentReportRef = useRef<HTMLInputElement>(null);
    const lastSelectedAssetId = useRef<string | null>(null);

    useEffect(() => {
        fetchAssets();
        fetchProjects();
        fetchStaff();
    }, []);

    const fetchAssets = async () => {
        try {
            const { data, error } = await supabase
                .from('vehicles') // Changed from 'assets'
                .select('*')
                // .eq('type', 'Rodados') // Removed
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const mappedAssets = data.map(mapAssetFromDB);
                setAssets(mappedAssets);
            }
        } catch (err: any) {
            console.error('Error fetching assets:', err);
            setError('Error al cargar activos: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchProjects = async () => {
        try {
            const { data, error } = await supabase.from('projects').select('*');
            if (error) throw error;
            if (data) setDbProjects(data.map(mapProjectFromDB));
        } catch (err) {
            console.error('Error fetching projects:', err);
        }
    };

    const fetchStaff = async () => {
        try {
            const { data, error } = await supabase.from('staff').select('*');
            if (error) throw error;
            if (data) setDbStaff(data.map(mapStaffFromDB));
        } catch (err) {
            console.error('Error fetching staff:', err);
        }
    };

    useEffect(() => {
        const assetId = selectedAsset?.id || null;
        const hasIdChanged = assetId !== lastSelectedAssetId.current;

        if (hasIdChanged) {
            setIsPlansExpanded(false);
            setIsWorkOrdersExpanded(false);
            setIsChecklistsExpanded(false);
            setIsEditingAsset(false);
            lastSelectedAssetId.current = assetId;
        }

        // Fetch allocation & documents if asset selected AND ID CHANGED
        if (selectedAsset && hasIdChanged) {
            const fetchAllocation = async () => {
                const { data } = await supabase
                    .from('asset_allocations')
                    .select('*, projects(name)')
                    .eq('asset_id', selectedAsset.id)
                    .eq('status', 'Programado') // Or Activo
                    .order('start_date', { ascending: true }) // Get next or current
                    .limit(1)
                    .single();

                if (data) setCurrentAllocation(data);
                else setCurrentAllocation(null);
            };

            const fetchDocuments = async () => {
                // We'll update the selectedAsset state with documents
                const { data } = await supabase
                    .from('asset_documents')
                    .select('*')
                    .eq('asset_id', selectedAsset.id)
                    .order('created_at', { ascending: false });

                if (data) {
                    const mappedDocs = data.map(d => ({
                        id: d.id,
                        assetId: d.asset_id,
                        type: d.type,
                        description: d.description,
                        fileUrl: d.file_url,
                        createdAt: d.created_at
                    }));
                    // Create a new object reference to trigger re-render if needed, 
                    // though usually we keep selectedAsset in sync with main assets list.
                    // IMPORTANT: Ideally we update the main 'assets' list too to keep cache warm,
                    // but for now updating locally is fine for the modal view.
                    setSelectedAsset(prev => prev ? ({ ...prev, documents: mappedDocs }) : null);
                }
            };

            fetchAllocation();
            fetchDocuments();

            // Fetch Work Orders
            const fetchWorkOrders = async () => {
                const { data } = await supabase
                    .from('work_orders')
                    .select('*')
                    .eq('asset_id', selectedAsset.id)
                    .order('created_at', { ascending: false });
                if (data) setAssetWorkOrders(data.map(mapWorkOrderFromDB));
            };

            // Fetch Checklists
            const fetchChecklists = async () => {
                const { data } = await supabase
                    .from('checklists')
                    .select('*')
                    .eq('asset_id', selectedAsset.id)
                    .order('created_at', { ascending: false });
                if (data) setAssetChecklists(data);
            };

            // Fetch Plans
            const fetchPlans = async () => {
                const { data } = await supabase
                    .from('maintenance_plans')
                    .select('*, maintenance_events(*)')
                    .eq('asset_id', selectedAsset.id)
                    .order('created_at', { ascending: false });
                if (data) {
                    setAssetPlans(data.map(p => ({
                        ...p,
                        events: p.maintenance_events || []
                    })));
                }
            };

            fetchWorkOrders();
            fetchChecklists();
            fetchPlans();
        }
    }, [selectedAsset]);

    useEffect(() => {
        if (location.state && assets.length > 0) {
            const state = location.state as any;
            if (state.targetAssetId) {
                const asset = assets.find(a => a.id === state.targetAssetId);
                if (asset) setSelectedAsset(asset);
            }
        }
    }, [location, assets]);

    const filteredAssets = assets.filter(a => {
        // Ensure strictly Rodados just in case
        if (a.type !== 'Rodados') return false;

        // Ownership Filter
        if (assetTab === 'owned' && a.ownership !== 'Propio') return false;
        if (assetTab === 'rented' && a.ownership !== 'Alquilado') return false;
        if (assetTab === 'leasing' && a.ownership !== 'Leasing') return false;

        const term = searchTerm.toLowerCase().trim();
        if (!term) return true;

        return (a.name || '').toLowerCase().includes(term) ||
            (a.internalId || '').toLowerCase().includes(term) ||
            (a.serial || '').toLowerCase().includes(term) ||
            (a.barcodeId || '').toLowerCase().includes(term);
    }).sort((a, b) => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return 0;

        const aBarcode = (a.barcodeId || '').toLowerCase();
        const bBarcode = (b.barcodeId || '').toLowerCase();
        const aInternal = (a.internalId || '').toLowerCase();
        const bInternal = (b.internalId || '').toLowerCase();

        // 1. Exact Barcode Match
        if (aBarcode === term && bBarcode !== term) return -1;
        if (bBarcode === term && aBarcode !== term) return 1;

        // 2. Exact Internal ID Match
        if (aInternal === term && bInternal !== term) return -1;
        if (bInternal === term && aInternal !== term) return 1;

        // 3. Starts with Barcode
        if (aBarcode.startsWith(term) && !bBarcode.startsWith(term)) return -1;
        if (bBarcode.startsWith(term) && !aBarcode.startsWith(term)) return 1;

        return 0;
    });

    const getStatusColor = (status: AssetStatus) => {
        switch (status) {
            case AssetStatus.OPERATIONAL: return 'bg-green-500';
            case AssetStatus.IN_MAINTENANCE: return 'bg-amber-500';
            case AssetStatus.ON_SITE: return 'bg-orange-500';
            case AssetStatus.RETURNED: return 'bg-slate-700'; // New color for Returned
            default: return 'bg-slate-400';
        }
    };

    const getOTStatusColor = (status: WorkOrderStatus) => {
        switch (status) {
            case WorkOrderStatus.COMPLETED: return 'bg-green-100 text-green-700 border-green-200';
            case WorkOrderStatus.IN_PROGRESS: return 'bg-orange-100 text-orange-700 border-orange-200';
            case WorkOrderStatus.CANCELLED: return 'bg-red-50 text-red-600 border-red-100';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const startEditing = () => {
        if (selectedAsset) {
            setEditFormData({ ...selectedAsset });
            setAddExpFormForEdit({ type: 'ITV', expirationDate: '', notes: '' });
            setIsEditingAsset(true);
        }
    };

    const cancelEditing = () => {
        setIsEditingAsset(false);
        setEditFormData({});
    };

    const saveAssetChanges = async () => {
        if (selectedAsset && editFormData.name) {
            // Logic for optional barcode if rented
            if (editFormData.ownership === 'Propio' && (!editFormData.barcodeId || editFormData.barcodeId.length !== 4)) {
                alert("El Código ID de 4 dígitos es obligatorio para activos propios.");
                return;
            }

            try {
                const updatedAssetData = { ...selectedAsset, ...editFormData } as Asset;
                const dbPayload = mapAssetToDB(updatedAssetData);

                // Remove ID from payload to avoid PK update issues if any
                const { id, ...payload } = dbPayload as any;

                const { error } = await supabase
                    .from('assets')
                    .update(payload)
                    .eq('id', selectedAsset.id);

                if (error) throw error;

                // Update local state
                setAssets(prev => prev.map(a => a.id === selectedAsset.id ? updatedAssetData : a));
                setSelectedAsset(updatedAssetData);
                setIsEditingAsset(false);
                setEditFormData({});
                alert("Activo actualizado correctamente.");
            } catch (err: any) {
                console.error('Error updating asset:', err);
                alert("Error al actualizar activo: " + err.message);
            }
        } else {
            alert("El nombre es obligatorio.");
        }
    };

    const addExpirationToEdit = () => {
        if (!addExpFormForEdit.type || !addExpFormForEdit.expirationDate) return;
        const exp: AssetExpiration = {
            id: Math.random().toString(36).substr(2, 9),
            type: addExpFormForEdit.type as any,
            expirationDate: addExpFormForEdit.expirationDate!,
            notes: addExpFormForEdit.notes
        };
        const currentExpirations = editFormData.expirations || [];
        setEditFormData({ ...editFormData, expirations: [...currentExpirations, exp] });
        setAddExpFormForEdit({ type: 'ITV', expirationDate: '', notes: '' });
    };

    const removeExpirationFromEdit = (id: string) => {
        const currentExpirations = editFormData.expirations || [];
        setEditFormData({ ...editFormData, expirations: currentExpirations.filter(e => e.id !== id) });
    };

    // --- NEW ASSET LOGIC ---
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    const target = isEditingAsset ? setEditFormData : setNewAssetData;
                    target(prev => ({ ...prev, image: ev.target?.result as string }));
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const updateGeneratedName = (isEdit: boolean, newBrand?: string, newModel?: string) => {
        const target = isEdit ? editFormData : newAssetData;
        const brand = newBrand !== undefined ? newBrand : (target.brand || '');
        const model = newModel !== undefined ? newModel : (target.model || '');
        const fullName = `${brand} ${model}`.trim();

        if (isEdit) {
            setEditFormData(prev => ({ ...prev, brand: brand, model: model, name: fullName }));
        } else {
            setNewAssetData(prev => ({ ...prev, brand: brand, model: model, name: fullName }));
        }
    };

    const addExpiration = () => {
        if (!newExpForm.type || !newExpForm.expirationDate) return;
        const exp: AssetExpiration = {
            id: Math.random().toString(36).substr(2, 9),
            type: newExpForm.type as any,
            expirationDate: newExpForm.expirationDate!,
            notes: newExpForm.notes
        };
        setNewExpirations([...newExpirations, exp]);
        setNewExpForm({ type: 'ITV', expirationDate: '', notes: '' });
    };

    const removeExpiration = (id: string) => {
        setNewExpirations(newExpirations.filter(e => e.id !== id));
    };

    const handleSaveNewAsset = async () => {
        if (!newAssetData.name || !newAssetData.internalId) {
            alert("Nombre e ID Interno son obligatorios.");
            return;
        }

        // Conditional Validation
        if (newAssetData.ownership === 'Propio') {
            if (!newAssetData.barcodeId || newAssetData.barcodeId.length !== 4) {
                alert("El código de 4 dígitos es obligatorio para activos propios.");
                return;
            }
        }

        try {
            const newAssetBase = {
                ...newAssetData,
                expirations: newExpirations,
                description: newAssetData.functionalDescription || newAssetData.name || '',
                responsible: newAssetData.responsible || 'Sin Asignar',
                incidents: []
            };

            const dbPayload = mapAssetToDB(newAssetBase);

            const { data, error } = await supabase
                .from('assets')
                .insert(dbPayload)
                .select()
                .single();

            if (error) throw error;

            if (data) {
                const newAsset = mapAssetFromDB(data);
                setAssets([newAsset, ...assets]);
                setIsCreating(false);
                // Reset form
                setNewAssetData({
                    name: '', internalId: '', barcodeId: '', type: 'Maquinaria', status: AssetStatus.OPERATIONAL,
                    ownership: 'Propio', supplier: '', brand: '', model: '', serial: '', year: new Date().getFullYear(), location: 'Pañol Central',
                    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=400',
                    dailyRate: 0, value: 0, hours: 0, domainNumber: '', responsible: '',
                    accountingAccount: '', functionalDescription: '', complementaryDescription: '', originYear: new Date().getFullYear(), usefulLifeRemaining: 0, tti: 0,
                    chassisNumber: '', engineNumber: '', insuranceProvider: '', incidents: []
                });
                setNewExpirations([]);
                alert("Activo creado exitosamente.");
            }
        } catch (err: any) {
            console.error('Error creating asset:', err);
            alert("Error al crear activo: " + err.message);
        }
    };

    const handleCreatePlan = () => {
        if (!selectedAsset) return;
        navigate('/maintenance/plans', {
            state: {
                createForAsset: selectedAsset.id,
                assetName: selectedAsset.name
            }
        });
    };

    // --- INCIDENT LOGIC ---
    const handleAddIncident = async () => {
        if (!newIncidentForm.description || !newIncidentForm.date || !selectedAsset) return;

        try {
            let updatedIncidents = [...(selectedAsset.incidents || [])];

            if (isEditingIncident && editingIncidentId) {
                updatedIncidents = updatedIncidents.map(inc =>
                    inc.id === editingIncidentId
                        ? { ...inc, ...newIncidentForm } as AssetIncident
                        : inc
                );
            } else {
                const incident: AssetIncident = {
                    id: Math.random().toString(36).substr(2, 9),
                    date: newIncidentForm.date!,
                    description: newIncidentForm.description!,
                    damageLevel: (newIncidentForm.damageLevel as any) || 'Leve',
                    cost: newIncidentForm.cost || 0,
                    status: (newIncidentForm.status as any) || 'Reportado',
                    incidentNumber: newIncidentForm.incidentNumber,
                    reportUrl: newIncidentForm.reportUrl
                };
                updatedIncidents = [incident, ...updatedIncidents];
            }

            const { error } = await supabase
                .from('assets')
                .update({ incidents: updatedIncidents })
                .eq('id', selectedAsset.id);

            if (error) throw error;

            const updatedAsset = {
                ...selectedAsset,
                incidents: updatedIncidents
            };

            setAssets(prev => prev.map(a => a.id === selectedAsset.id ? updatedAsset : a));
            setSelectedAsset(updatedAsset);

            setIsIncidentModalOpen(false);
            setIsEditingIncident(false);
            setEditingIncidentId(null);
            setNewIncidentForm({
                date: new Date().toISOString().split('T')[0],
                description: '',
                damageLevel: 'Leve',
                cost: 0,
                status: 'Reportado',
                incidentNumber: '',
                reportUrl: ''
            });
            alert(isEditingIncident ? "Siniestro actualizado correctamente." : "Siniestro registrado correctamente.");
        } catch (err: any) {
            console.error('Error saving incident:', err);
            alert("Error al guardar el siniestro: " + err.message);
        }
    };

    const handleEditIncident = (incident: AssetIncident) => {
        setNewIncidentForm({ ...incident });
        setEditingIncidentId(incident.id);
        setIsEditingIncident(true);
        setIsIncidentModalOpen(true);
    };

    const handleDeleteIncident = async (incidentId: string) => {
        if (!selectedAsset || !window.confirm("¿Está seguro de eliminar este registro de siniestro?")) return;

        try {
            const updatedIncidents = (selectedAsset.incidents || []).filter(inc => inc.id !== incidentId);

            const { error } = await supabase
                .from('assets')
                .update({ incidents: updatedIncidents })
                .eq('id', selectedAsset.id);

            if (error) throw error;

            const updatedAsset = {
                ...selectedAsset,
                incidents: updatedIncidents
            };

            setAssets(prev => prev.map(a => a.id === selectedAsset.id ? updatedAsset : a));
            setSelectedAsset(updatedAsset);
            alert("Siniestro eliminado correctamente.");
        } catch (err: any) {
            console.error('Error deleting incident:', err);
            alert("Error al eliminar el siniestro: " + err.message);
        }
    };

    const handleAddExpiration = async () => {
        if (!selectedAsset) return;
        if (!newExp.expirationDate) {
            alert('Ingrese una fecha de vencimiento');
            return;
        }

        try {
            const newExpiration = {
                id: crypto.randomUUID(),
                type: newExp.type || 'ITV',
                expirationDate: newExp.expirationDate,
                notes: newExp.notes || ''
            };

            const updatedExpirations = [...(selectedAsset.expirations || []), newExpiration];

            const { error } = await supabase
                .from('assets')
                .update({ expirations: updatedExpirations })
                .eq('id', selectedAsset.id);

            if (error) throw error;

            const updatedAsset = { ...selectedAsset, expirations: updatedExpirations };
            setSelectedAsset(updatedAsset);
            setAssets(assets.map(a => a.id === updatedAsset.id ? updatedAsset : a));
            setIsExpModalOpen(false);
            setNewExp({ type: 'ITV', expirationDate: '', notes: '' });
        } catch (err: any) {
            alert('Error al agregar vencimiento: ' + err.message);
        }
    };

    const handleIncidentReportUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    setNewIncidentForm(prev => ({ ...prev, reportUrl: ev.target?.result as string }));
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    if (isCreating) {
        return (
            <div className="bg-[#F8F9FA] min-h-screen pb-24 font-sans animate-in slide-in-from-right-5 duration-300">
                <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex items-center justify-between">
                    <button onClick={() => setIsCreating(false)} className="text-slate-600 p-2" aria-label="Volver"><ChevronLeft size={24} /></button>
                    <h1 className="font-bold text-lg text-slate-800 tracking-tight">Nuevo Rodado</h1>
                    <button onClick={handleSaveNewAsset} className="text-orange-500 font-bold text-sm bg-orange-50 px-4 py-2 rounded-full hover:bg-orange-100 transition-colors">
                        Guardar Activo
                    </button>
                </div>
                <div className="p-6 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* LEFT COLUMN */}
                    <div className="space-y-6">
                        {/* Image Upload */}
                        <div className="relative h-64 rounded-[2.5rem] overflow-hidden bg-slate-200 group shadow-inner">
                            <img src={newAssetData.image} alt="Preview" className="w-full h-full object-cover opacity-90" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/30 transition-colors">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="bg-white/90 backdrop-blur-sm p-4 rounded-full shadow-lg text-slate-600 hover:text-orange-500 transition-colors"
                                    aria-label="Subir imagen"
                                >
                                    <Camera size={28} />
                                </button>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} aria-label="Subir archivo" />
                            </div>
                        </div>

                        {/* Identification */}
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <Tag size={16} className="text-orange-500" /> Identificación
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">ID Interno</label>
                                    <input
                                        type="text"
                                        value={newAssetData.internalId}
                                        onChange={(e) => setNewAssetData({ ...newAssetData, internalId: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800 uppercase"
                                        placeholder="Ej. CAM-01"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Dominio / Patente</label>
                                    <input
                                        type="text"
                                        value={newAssetData.domainNumber}
                                        onChange={(e) => setNewAssetData({ ...newAssetData, domainNumber: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold uppercase"
                                        placeholder="AA-123-BB"
                                    />
                                </div>
                            </div>
                            {newAssetData.ownership === 'Propio' && (
                                <div className="space-y-1.5 animate-in slide-in-from-top-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Código ID (4 Dígitos)</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            maxLength={4}
                                            value={newAssetData.barcodeId}
                                            onChange={(e) => setNewAssetData({ ...newAssetData, barcodeId: e.target.value })}
                                            className="w-full p-4 pl-12 bg-slate-50 border-none rounded-2xl text-sm font-black tracking-widest"
                                            placeholder="0000"
                                        />
                                        <QrCode size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Propiedad</label>
                                    <select
                                        value={newAssetData.ownership}
                                        onChange={(e) => setNewAssetData({ ...newAssetData, ownership: e.target.value as any })}
                                        className="w-full p-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800 appearance-none"
                                    >
                                        <option value="Propio">Propio</option>
                                        <option value="Alquilado">Alquilado</option>
                                        <option value="Leasing">Leasing</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Ubicación Actual</label>
                                    <input
                                        type="text"
                                        value={newAssetData.location}
                                        onChange={(e) => setNewAssetData({ ...newAssetData, location: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800"
                                        placeholder="Base Central"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Responsable</label>
                                <div className="relative">
                                    <select
                                        value={newAssetData.responsible}
                                        onChange={(e) => setNewAssetData({ ...newAssetData, responsible: e.target.value })}
                                        className="w-full p-4 pl-12 bg-slate-50 border-none rounded-2xl text-sm font-medium appearance-none"
                                    >
                                        <option value="">Seleccionar Chofer/Responsable...</option>
                                        {dbStaff.map(s => (
                                            <option key={s.id} value={s.name}>{s.name} - {s.role}</option>
                                        ))}
                                    </select>
                                    <UserCircle2 size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Estado Inicial</label>
                                <select
                                    value={newAssetData.status}
                                    onChange={(e) => setNewAssetData({ ...newAssetData, status: e.target.value as any })}
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium"
                                >
                                    {Object.values(AssetStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Vehicle Data */}
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <Truck size={16} className="text-orange-500" /> Datos del Vehículo
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Marca</label>
                                    <input
                                        type="text"
                                        value={newAssetData.brand}
                                        onChange={(e) => updateGeneratedName(false, e.target.value, undefined)}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold"
                                        placeholder="Ej. Toyota"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Modelo</label>
                                    <input
                                        type="text"
                                        value={newAssetData.model}
                                        onChange={(e) => updateGeneratedName(false, undefined, e.target.value)}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold"
                                        placeholder="Ej. Hilux"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nombre Generado</label>
                                <input
                                    type="text"
                                    value={newAssetData.name}
                                    readOnly
                                    className="w-full p-4 bg-slate-100 border-none rounded-2xl text-sm font-bold text-slate-500"
                                />
                            </div>
                        </div>

                        {/* Descriptive Details */}
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <FileType size={16} className="text-orange-500" /> Detalle Descriptivo
                            </h3>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Descripción Funcional</label>
                                <input
                                    type="text"
                                    value={newAssetData.functionalDescription || ''}
                                    onChange={(e) => setNewAssetData({ ...newAssetData, functionalDescription: e.target.value })}
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium"
                                    placeholder="Ej. Camioneta 4x4"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Descripción Complementaria</label>
                                <textarea
                                    value={newAssetData.complementaryDescription}
                                    onChange={(e) => setNewAssetData({ ...newAssetData, complementaryDescription: e.target.value })}
                                    placeholder="Accesorios, componentes adicionales o detalles..."
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium resize-none min-h-[80px]"
                                />
                            </div>
                        </div>

                        {/* Technical */}
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <Wrench size={16} className="text-orange-500" /> Ficha Técnica
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Año de Origen</label>
                                    <input
                                        type="number"
                                        value={newAssetData.originYear}
                                        onChange={(e) => setNewAssetData({ ...newAssetData, originYear: Number(e.target.value), year: Number(e.target.value) })}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium"
                                        aria-label="Año de Origen"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Serie / VIN</label>
                                    <input
                                        type="text"
                                        value={newAssetData.serial}
                                        onChange={(e) => setNewAssetData({ ...newAssetData, serial: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium uppercase"
                                        aria-label="Serie / VIN"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Número de Chasis</label>
                                    <input
                                        type="text"
                                        value={newAssetData.chassisNumber}
                                        onChange={(e) => setNewAssetData({ ...newAssetData, chassisNumber: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium uppercase"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Número de Motor</label>
                                    <input
                                        type="text"
                                        value={newAssetData.engineNumber}
                                        onChange={(e) => setNewAssetData({ ...newAssetData, engineNumber: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium uppercase"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Horómetro / KM</label>
                                    <input
                                        type="number"
                                        value={newAssetData.hours}
                                        onChange={(e) => setNewAssetData({ ...newAssetData, hours: Number(e.target.value) })}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800"
                                        aria-label="Horómetro / KM"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">VÚR (Años)</label>
                                    <input
                                        type="number"
                                        value={newAssetData.usefulLifeRemaining}
                                        onChange={(e) => setNewAssetData({ ...newAssetData, usefulLifeRemaining: Number(e.target.value) })}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800"
                                        aria-label="VÚR (Años)"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Uso Diario Prom. (Km/Hs)</label>
                                    <input
                                        type="number"
                                        value={newAssetData.averageDailyUsage}
                                        onChange={(e) => setNewAssetData({ ...newAssetData, averageDailyUsage: Number(e.target.value) })}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800"
                                        aria-label="Uso Diario Promedio"
                                    />
                                </div>
                            </div>

                            {newAssetData.ownership !== 'Propio' && (
                                <div className="space-y-1.5 animate-in fade-in">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Proveedor / Dueño</label>
                                    <input
                                        type="text"
                                        value={newAssetData.supplier}
                                        onChange={(e) => setNewAssetData({ ...newAssetData, supplier: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium"
                                        placeholder="Empresa de Alquiler S.A."
                                    />
                                </div>
                            )}
                        </div>

                        {/* Financial */}
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <Coins size={16} className="text-orange-500" /> Contabilidad y Valuación
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Valor Razonable (ARS)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={newAssetData.value}
                                            onChange={(e) => setNewAssetData({ ...newAssetData, value: Number(e.target.value) })}
                                            className="w-full p-4 pl-10 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800"
                                        />
                                        <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">T.T.I. (%)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={newAssetData.tti}
                                            onChange={(e) => setNewAssetData({ ...newAssetData, tti: Number(e.target.value) })}
                                            className="w-full p-4 pl-10 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800"
                                            aria-label="T.T.I."
                                        />
                                        <Percent size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Cuenta Contable</label>
                                <input
                                    type="text"
                                    value={newAssetData.accountingAccount}
                                    onChange={(e) => setNewAssetData({ ...newAssetData, accountingAccount: e.target.value })}
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium"
                                    placeholder="Ej. 1.2.3.004"
                                />
                            </div>
                        </div>

                        {/* Expirations Section */}
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <Calendar size={16} className="text-orange-500" /> Vencimientos y Seguros
                            </h3>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Proveedor de Seguro</label>
                                <input
                                    type="text"
                                    value={newAssetData.insuranceProvider}
                                    onChange={(e) => setNewAssetData({ ...newAssetData, insuranceProvider: e.target.value })}
                                    placeholder="Ej. Mercantil Andina"
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium"
                                    aria-label="Proveedor de Seguro"
                                />
                            </div>

                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <select
                                        value={newExpForm.type}
                                        onChange={(e) => setNewExpForm({ ...newExpForm, type: e.target.value as any })}
                                        className="w-full p-3 bg-white border-none rounded-xl text-xs font-bold"
                                        aria-label="Tipo"
                                    >
                                        <option value="ITV">ITV / RTO</option>
                                        <option value="Seguro">Seguro</option>
                                        <option value="Cédula Verde">Cédula</option>
                                        <option value="Habilitación">Habilitación</option>
                                        <option value="Certificación">Certificación</option>
                                    </select>
                                    <input
                                        type="date"
                                        value={newExpForm.expirationDate}
                                        onChange={(e) => setNewExpForm({ ...newExpForm, expirationDate: e.target.value })}
                                        className="w-full p-3 bg-white border-none rounded-xl text-xs font-bold"
                                        aria-label="Fecha"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        placeholder="Notas (ej. Póliza #123)"
                                        value={newExpForm.notes}
                                        onChange={(e) => setNewExpForm({ ...newExpForm, notes: e.target.value })}
                                        className="flex-1 p-3 bg-white border-none rounded-xl text-xs font-medium"
                                        aria-label="Notas"
                                    />
                                    <button
                                        onClick={addExpiration}
                                        disabled={!newExpForm.expirationDate}
                                        aria-label="Agregar Vencimiento"
                                        className="bg-white p-3 rounded-xl shadow-sm text-slate-400 hover:text-orange-500"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>

                            {newExpirations.length > 0 && (
                                <div className="space-y-2">
                                    {newExpirations.map(exp => (
                                        <div key={exp.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                                            <div>
                                                <p className="text-xs font-bold text-slate-800">{exp.type}</p>
                                                <p className="text-[10px] text-slate-500">Vence: {exp.expirationDate} • {exp.notes}</p>
                                            </div>
                                            <button onClick={() => removeExpiration(exp.id)} className="text-slate-300 hover:text-red-500" aria-label="Eliminar">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- DETAIL VIEW ---
    if (selectedAsset) {
        const assetPlans: any[] = []; // TODO: Fetch real plans
        const assetWorkOrders: any[] = []; // TODO: Fetch real work orders
        const isRented = selectedAsset.ownership === 'Alquilado';

        return (
            <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans animate-in slide-in-from-right-5 duration-300">
                {/* INCIDENT MODAL */}
                {isIncidentModalOpen && (
                    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-20 duration-300 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <AlertTriangle size={24} className="text-red-500" />
                                    {isEditingIncident ? 'Editar Siniestro' : 'Registrar Siniestro'}
                                </h3>
                                <button onClick={() => {
                                    setIsIncidentModalOpen(false);
                                    setIsEditingIncident(false);
                                    setEditingIncidentId(null);
                                    setNewIncidentForm({
                                        date: new Date().toISOString().split('T')[0],
                                        description: '', damageLevel: 'Leve', cost: 0, status: 'Reportado',
                                        incidentNumber: '', reportUrl: ''
                                    });
                                }} className="bg-slate-100 p-2 rounded-full text-slate-500" aria-label="Cerrar" title="Cerrar"><X size={20} /></button>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Fecha del Evento</label>
                                        <input
                                            type="date"
                                            value={newIncidentForm.date}
                                            onChange={(e) => setNewIncidentForm({ ...newIncidentForm, date: e.target.value })}
                                            className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold"
                                            aria-label="Fecha del Evento"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">N° de Siniestro</label>
                                        <input
                                            type="text"
                                            value={newIncidentForm.incidentNumber}
                                            onChange={(e) => setNewIncidentForm({ ...newIncidentForm, incidentNumber: e.target.value })}
                                            placeholder="Ej: SIN-2024-001"
                                            className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold uppercase"
                                            aria-label="Número de Siniestro"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Descripción del Hecho</label>
                                    <textarea
                                        value={newIncidentForm.description}
                                        onChange={(e) => setNewIncidentForm({ ...newIncidentForm, description: e.target.value })}
                                        placeholder="Detalles del accidente o incidente..."
                                        className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium min-h-[80px] resize-none"
                                        aria-label="Descripción del Hecho"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Nivel de Daño</label>
                                        <select
                                            value={newIncidentForm.damageLevel}
                                            onChange={(e) => setNewIncidentForm({ ...newIncidentForm, damageLevel: e.target.value as any })}
                                            className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold"
                                            aria-label="Nivel de Daño"
                                        >
                                            <option value="Leve">Leve</option>
                                            <option value="Moderado">Moderado</option>
                                            <option value="Grave">Grave</option>
                                            <option value="Destrucción Total">Destrucción Total</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Estado</label>
                                        <select
                                            value={newIncidentForm.status}
                                            onChange={(e) => setNewIncidentForm({ ...newIncidentForm, status: e.target.value as any })}
                                            className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold"
                                            aria-label="Estado del Siniestro"
                                        >
                                            <option value="Reportado">Reportado</option>
                                            <option value="En Reparación">En Reparación</option>
                                            <option value="Cerrado">Cerrado</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Costo Estimado</label>
                                        <input
                                            type="number"
                                            value={newIncidentForm.cost}
                                            onChange={(e) => setNewIncidentForm({ ...newIncidentForm, cost: Number(e.target.value) })}
                                            className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold"
                                            aria-label="Costo Estimado"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Archivo Denuncia</label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => incidentReportRef.current?.click()}
                                                className={`flex-1 p-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border-2 border-dashed transition-colors ${newIncidentForm.reportUrl ? 'border-green-200 bg-green-50 text-green-700' : 'border-slate-200 text-slate-500 hover:border-red-200 hover:text-red-500'}`}
                                                title="Adjuntar Denuncia"
                                                aria-label="Adjuntar archivo de denuncia"
                                            >
                                                {newIncidentForm.reportUrl ? <CheckCircle2 size={16} /> : <Paperclip size={16} />}
                                                {newIncidentForm.reportUrl ? 'Denuncia Adjunta' : 'Adjuntar PDF/Imagen'}
                                            </button>
                                            {newIncidentForm.reportUrl && (
                                                <button
                                                    onClick={() => setNewIncidentForm(prev => ({ ...prev, reportUrl: '' }))}
                                                    className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100"
                                                    title="Eliminar Denuncia"
                                                    aria-label="Eliminar archivo adjunto"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                        <input type="file" ref={incidentReportRef} className="hidden" accept=".pdf,image/*" onChange={handleIncidentReportUpload} title="Cargar denuncia" />
                                    </div>
                                </div>

                                <button onClick={handleAddIncident} className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-red-200 mt-4 active:scale-95 transition-transform">
                                    {isEditingIncident ? 'Guardar Cambios' : 'Confirmar Registro'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* PRINT HEADER */}
                <div className="hidden print:block mb-8">
                    <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-widest text-slate-900">FICHA TÉCNICA DE ACTIVO</h1>
                            <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm font-bold bg-slate-100 px-3 py-1 rounded text-slate-600 uppercase">{selectedAsset.internalId}</span>
                                <span className="text-sm font-bold text-slate-500">{new Date().toLocaleDateString()}</span>
                            </div>
                        </div>
                        <div className="w-16 h-16 bg-slate-900 text-white flex items-center justify-center font-bold text-2xl rounded-lg">SW</div>
                    </div>
                </div>

                <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex items-center justify-between no-print">
                    <button onClick={() => setSelectedAsset(null)} className="text-slate-600 p-2" aria-label="Volver"><ChevronLeft size={24} /></button>
                    <h1 className="font-bold text-lg text-slate-800">{isEditingAsset ? 'Editar Activo' : 'Detalle de Activo'}</h1>
                    <div className="flex gap-2">
                        {isEditingAsset ? (
                            <>
                                <button onClick={cancelEditing} className="text-slate-400 font-bold text-sm px-2">Cancelar</button>
                                <button onClick={saveAssetChanges} className="text-orange-500 font-bold text-sm bg-orange-50 px-3 py-1.5 rounded-full">Guardar</button>
                            </>
                        ) : (
                            <>
                                {canEdit && (
                                    <button onClick={startEditing} className="p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-orange-50 hover:text-orange-500 transition-colors" aria-label="Editar">
                                        <Edit3 size={20} />
                                    </button>
                                )}
                                <button onClick={handlePrint} className="p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 transition-colors" aria-label="Imprimir">
                                    <Printer size={20} />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="p-6 space-y-6">

                    {/* --- EDIT MODE --- */}
                    {isEditingAsset ? (
                        <div className="space-y-6">
                            <div className="relative h-48 rounded-[2.5rem] overflow-hidden bg-slate-200 group shadow-inner mb-4">
                                <img src={editFormData.image} alt="Preview" className="w-full h-full object-cover opacity-90" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/30 transition-colors">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg text-slate-600 hover:text-orange-500 transition-colors"
                                        aria-label="Cambiar imagen"
                                    >
                                        <Camera size={24} />
                                    </button>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} aria-label="Subir archivo" />
                                </div>
                            </div>

                            {/* Identificación */}
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <Tag size={16} className="text-orange-500" /> Identificación
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Internal ID */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">ID Interno</label>
                                        <input
                                            type="text"
                                            value={editFormData.internalId}
                                            onChange={e => setEditFormData({ ...editFormData, internalId: e.target.value })}
                                            className={`w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold uppercase ${!isSuperAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            disabled={!isSuperAdmin}
                                        />
                                    </div>
                                    {/* Domain */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Dominio / Patente</label>
                                        <input
                                            type="text"
                                            value={editFormData.domainNumber}
                                            onChange={e => setEditFormData({ ...editFormData, domainNumber: e.target.value })}
                                            className={`w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold uppercase ${!isSuperAdmin ? 'opacity-50' : ''}`}
                                            disabled={!isSuperAdmin}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Código de Barra</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={editFormData.barcodeId}
                                            onChange={(e) => setEditFormData({ ...editFormData, barcodeId: e.target.value })}
                                            className={`w-full p-4 pl-12 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800 ${!isSuperAdmin ? 'opacity-50' : ''}`}
                                            disabled={!isSuperAdmin}
                                        />
                                        <QrCode size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Propiedad</label>
                                        <select
                                            value={editFormData.ownership}
                                            onChange={(e) => setEditFormData({ ...editFormData, ownership: e.target.value as any })}
                                            className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium appearance-none"
                                            disabled={!isSuperAdmin}
                                        >
                                            <option value="Propio">Propio</option>
                                            <option value="Alquilado">Alquilado</option>
                                            <option value="Leasing">Leasing</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Estado</label>
                                        <select
                                            value={editFormData.status}
                                            onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                                            className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium appearance-none"
                                        >
                                            {Object.values(AssetStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Ubicación Actual</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={editFormData.location}
                                                onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                                                className={`w-full p-4 pl-12 bg-slate-50 border-none rounded-2xl text-sm font-medium ${!isSuperAdmin ? 'opacity-50' : ''}`}
                                                disabled={!isSuperAdmin}
                                            />
                                            <MapPin size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Responsable</label>
                                        <div className="relative">
                                            <select
                                                value={editFormData.responsible || ''}
                                                onChange={(e) => setEditFormData({ ...editFormData, responsible: e.target.value })}
                                                className={`w-full p-4 pl-12 bg-slate-50 border-none rounded-2xl text-sm font-medium appearance-none ${!isSuperAdmin ? 'opacity-50' : ''}`}
                                                disabled={!isSuperAdmin}
                                            >
                                                <option value="">Sin Asignar</option>
                                                {dbStaff.map(s => (
                                                    <option key={s.id} value={s.name}>{s.name}</option>
                                                ))}
                                            </select>
                                            <UserCircle2 size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Datos del Vehículo */}
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <Truck size={16} className="text-orange-500" /> Datos del Vehículo
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Marca</label>
                                        <input
                                            type="text"
                                            value={editFormData.brand}
                                            onChange={(e) => updateGeneratedName(true, e.target.value, undefined)}
                                            className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Modelo</label>
                                        <input
                                            type="text"
                                            value={editFormData.model}
                                            onChange={(e) => updateGeneratedName(true, undefined, e.target.value)}
                                            className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nombre Generado</label>
                                    <input
                                        type="text"
                                        value={editFormData.name}
                                        readOnly
                                        className="w-full p-4 bg-slate-100 border-none rounded-2xl text-sm font-bold text-slate-500"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tipo de Activo</label>
                                    <select
                                        value={editFormData.type}
                                        onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value as any })}
                                        className={`w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium appearance-none ${!isSuperAdmin ? 'opacity-50' : ''}`}
                                        disabled={!isSuperAdmin}
                                    >
                                        <option value="Maquinaria">Maquinaria</option>
                                        <option value="Rodados">Rodados</option>
                                        <option value="Equipos de Informática">Equipos de Informática</option>
                                        <option value="Instalaciones en infraestructuras">Instalaciones en infraestructuras</option>
                                        <option value="Otros">Otros</option>
                                    </select>
                                </div>
                            </div>

                            {/* Detalle Descriptivo */}
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <FileType size={16} className="text-orange-500" /> Detalle Descriptivo
                                </h3>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Descripción Funcional</label>
                                    <textarea
                                        value={editFormData.functionalDescription}
                                        onChange={(e) => setEditFormData({ ...editFormData, functionalDescription: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium resize-none min-h-[80px]"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Descripción Complementaria</label>
                                    <textarea
                                        value={editFormData.complementaryDescription}
                                        onChange={(e) => setEditFormData({ ...editFormData, complementaryDescription: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium resize-none min-h-[80px]"
                                    />
                                </div>
                            </div>

                            {/* Contabilidad y Valuación */}
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <Coins size={16} className="text-orange-500" /> Contabilidad y Valuación
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Valor Razonable (ARS)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={editFormData.value}
                                                onChange={(e) => setEditFormData({ ...editFormData, value: Number(e.target.value) })}
                                                className="w-full p-4 pl-10 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800"
                                            />
                                            <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">T.T.I. (%)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={editFormData.tti}
                                                onChange={(e) => setEditFormData({ ...editFormData, tti: Number(e.target.value) })}
                                                className="w-full p-4 pl-10 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800"
                                            />
                                            <Percent size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Cuenta Contable</label>
                                        <input
                                            type="text"
                                            value={editFormData.accountingAccount}
                                            onChange={(e) => setEditFormData({ ...editFormData, accountingAccount: e.target.value })}
                                            className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tarifa Diaria</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={editFormData.dailyRate}
                                                onChange={(e) => setEditFormData({ ...editFormData, dailyRate: Number(e.target.value) })}
                                                className={`w-full p-4 pl-10 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800 ${!isSuperAdmin ? 'opacity-50' : ''}`}
                                                disabled={!isSuperAdmin}
                                            />
                                            <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Technical Edit */}
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <Wrench size={16} className="text-orange-500" /> Ficha Técnica
                                </h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Año Origen</label>
                                        <input
                                            type="number"
                                            value={editFormData.originYear}
                                            onChange={e => setEditFormData({ ...editFormData, originYear: Number(e.target.value) })}
                                            className={`w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium ${!isSuperAdmin ? 'opacity-50' : ''}`}
                                            disabled={!isSuperAdmin}
                                            aria-label="Año Origen"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Serie / VIN</label>
                                        <input
                                            type="text"
                                            value={editFormData.serial}
                                            onChange={e => setEditFormData({ ...editFormData, serial: e.target.value })}
                                            className={`w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium uppercase ${!isSuperAdmin ? 'opacity-50' : ''}`}
                                            disabled={!isSuperAdmin}
                                            aria-label="Serie"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Número de Chasis</label>
                                        <input
                                            type="text"
                                            value={editFormData.chassisNumber}
                                            onChange={e => setEditFormData({ ...editFormData, chassisNumber: e.target.value })}
                                            className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold uppercase"
                                            aria-label="Chasis"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Número de Motor</label>
                                        <input
                                            type="text"
                                            value={editFormData.engineNumber}
                                            onChange={e => setEditFormData({ ...editFormData, engineNumber: e.target.value })}
                                            className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold uppercase"
                                            aria-label="Motor"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Horómetro / KM</label>
                                        <input
                                            type="number"
                                            value={editFormData.hours}
                                            onChange={e => setEditFormData({ ...editFormData, hours: Number(e.target.value) })}
                                            className={`w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800 ${!isSuperAdmin ? 'opacity-50' : ''}`}
                                            disabled={!isSuperAdmin}
                                            aria-label="Horas"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">VÚR (Años)</label>
                                        <input
                                            type="number"
                                            value={editFormData.usefulLifeRemaining}
                                            onChange={e => setEditFormData({ ...editFormData, usefulLifeRemaining: Number(e.target.value) })}
                                            className={`w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800 ${!isSuperAdmin ? 'opacity-50' : ''}`}
                                            disabled={!isSuperAdmin}
                                            aria-label="VUR"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Uso Diario Prom. (Km/Hs)</label>
                                        <input
                                            type="number"
                                            value={editFormData.averageDailyUsage}
                                            onChange={e => setEditFormData({ ...editFormData, averageDailyUsage: Number(e.target.value) })}
                                            className={`w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800 ${!isSuperAdmin ? 'opacity-50' : ''}`}
                                            disabled={!isSuperAdmin}
                                            aria-label="Uso Diario Promedio"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Proveedor / Dueño</label>
                                    <input
                                        type="text"
                                        value={editFormData.supplier}
                                        onChange={e => setEditFormData({ ...editFormData, supplier: e.target.value })}
                                        className={`w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium ${!isSuperAdmin ? 'opacity-50' : ''}`}
                                        disabled={!isSuperAdmin}
                                        aria-label="Proveedor"
                                    />
                                </div>
                            </div>

                            {/* Expirations Edit */}
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <Calendar size={16} className="text-orange-500" /> Vencimientos y Seguros
                                </h3>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Proveedor de Seguro</label>
                                    <input
                                        type="text"
                                        value={editFormData.insuranceProvider}
                                        onChange={e => setEditFormData({ ...editFormData, insuranceProvider: e.target.value })}
                                        placeholder="Ej. Mercantil Andina"
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium"
                                        aria-label="Proveedor de Seguro"
                                    />
                                </div>

                                <div className="space-y-2">
                                    {editFormData.expirations?.map(exp => (
                                        <div key={exp.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                            <div>
                                                <p className="text-xs font-bold text-slate-700">{exp.type}</p>
                                                <p className="text-[10px] text-slate-500">{exp.expirationDate}</p>
                                            </div>
                                            <button onClick={() => removeExpirationFromEdit(exp.id)} className="text-red-400" aria-label="Eliminar vencimiento"><X size={16} /></button>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                                    <select
                                        value={addExpFormForEdit.type}
                                        onChange={(e) => setAddExpFormForEdit({ ...addExpFormForEdit, type: e.target.value as any })}
                                        className="p-2 bg-slate-50 rounded-lg text-xs font-bold"
                                        aria-label="Tipo de Vencimiento"
                                    >
                                        <option value="ITV">ITV / RTO</option>
                                        <option value="Seguro">Seguro</option>
                                        <option value="Cédula Verde">Cédula</option>
                                        <option value="Habilitación">Habilitación</option>
                                        <option value="Certificación">Certificación</option>
                                    </select>
                                    <input
                                        type="date"
                                        value={addExpFormForEdit.expirationDate}
                                        onChange={(e) => setAddExpFormForEdit({ ...addExpFormForEdit, expirationDate: e.target.value })}
                                        className="p-2 bg-slate-50 rounded-lg text-xs"
                                        aria-label="Fecha de Vencimiento"
                                    />
                                    <button onClick={addExpirationToEdit} className="col-span-2 bg-slate-800 text-white py-2 rounded-lg text-xs font-bold">Agregar Vencimiento</button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* --- READ ONLY MODE (Bento Grid) --- */
                        <>
                            {/* Hero Card */}
                            <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden break-inside-avoid">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500 rounded-full blur-[60px] opacity-20 -mr-10 -mt-10"></div>

                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="px-3 py-1 bg-white/10 rounded-lg backdrop-blur-md">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">{selectedAsset.internalId}</p>
                                        </div>
                                        <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider ${selectedAsset.status === AssetStatus.OPERATIONAL ? 'bg-green-500/20 text-green-300' :
                                            selectedAsset.status === AssetStatus.RETURNED ? 'bg-slate-700 text-slate-300' : 'bg-orange-500/20 text-orange-300'
                                            }`}>
                                            {selectedAsset.status}
                                        </span>
                                    </div>

                                    <div className="flex gap-5 items-center">
                                        <div className="w-20 h-20 rounded-2xl bg-white/10 overflow-hidden shrink-0 border border-white/10 shadow-lg">
                                            <img src={selectedAsset.image} className="w-full h-full object-cover" alt="Imagen del activo" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h2 className="text-xl font-bold leading-tight mb-1">{selectedAsset.name}</h2>
                                            {currentAllocation ? (
                                                <div className="mt-2 animate-in fade-in">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-0.5 flex items-center gap-1">
                                                        <CalendarClock size={10} /> Ubicación Programada
                                                    </p>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-white flex items-center gap-1">
                                                            <MapPin size={14} className="text-orange-500" />
                                                            {currentAllocation.projects?.name || 'Obra Desconocida'}
                                                        </span>
                                                        <span className="text-[10px] text-white/50 font-medium">
                                                            Hasta {new Date(currentAllocation.end_date + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-xs text-white/60 font-medium mt-1">
                                                    {(selectedAsset.location || '').includes('Pañol') ? null : (
                                                        <>
                                                            <MapPin size={14} className="text-orange-500" />
                                                            {selectedAsset.location}
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3 mt-6">
                                        <div className="bg-white/5 p-3 rounded-xl backdrop-blur-sm border border-white/5">
                                            <span className="block text-[9px] font-bold text-white/40 uppercase mb-1">Uso</span>
                                            <span className="text-sm font-bold">{(selectedAsset.hours || 0).toLocaleString()} <span className="text-[9px] font-normal text-white/50">{selectedAsset.type === 'Rodados' ? 'km' : 'hs'}</span></span>
                                        </div>
                                        <div className="bg-white/5 p-3 rounded-xl backdrop-blur-sm border border-white/5">
                                            <span className="block text-[9px] font-bold text-white/40 uppercase mb-1">Año Origen</span>
                                            <span className="text-sm font-bold">{selectedAsset.originYear}</span>
                                        </div>
                                        <div className="bg-white/5 p-3 rounded-xl backdrop-blur-sm border border-white/5">
                                            <span className="block text-[9px] font-bold text-white/40 uppercase mb-1">Propiedad</span>
                                            <span className="text-sm font-bold">{isRented ? 'Alquiler' : 'Propio'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bento Grid Layout */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                {/* Identification & Accounting */}
                                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4 break-inside-avoid">
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                        <ScanLine size={16} className="text-orange-500" /> Identificación y Contabilidad
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Cuenta Contable</p>
                                            <p className="text-sm font-bold text-slate-800">{selectedAsset.accountingAccount || 'Sin Asignar'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Serie / VIN</p>
                                            <p className="text-sm font-bold text-slate-800 uppercase">{selectedAsset.serial}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Motor</p>
                                            <p className="text-xs font-bold text-slate-800 uppercase">{selectedAsset.engineNumber || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Chasis</p>
                                            <p className="text-xs font-bold text-slate-800 uppercase">{selectedAsset.chassisNumber || '-'}</p>
                                        </div>
                                    </div>
                                    {selectedAsset.ownership === 'Propio' && (
                                        <div className="pt-2 border-t border-slate-50 flex justify-center">
                                            <BarcodeView id={selectedAsset.barcodeId} />
                                        </div>
                                    )}
                                </div>

                                {/* Descriptions */}
                                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4 break-inside-avoid">
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                        <FileType size={16} className="text-orange-500" /> Detalle Descriptivo
                                    </h3>
                                    {selectedAsset.functionalDescription && (
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Funcional</p>
                                            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                {selectedAsset.functionalDescription}
                                            </p>
                                        </div>
                                    )}
                                    {selectedAsset.complementaryDescription && (
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Complementaria</p>
                                            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                {selectedAsset.complementaryDescription}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Valuation & Technical */}
                                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 break-inside-avoid">
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4">
                                        <Coins size={16} className="text-orange-500" /> Valuación y Vida Útil
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Valor Razonable (ARS)</p>
                                            <p className="text-lg font-black text-slate-800">${selectedAsset.value?.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">T.T.I.</p>
                                            <p className="text-lg font-black text-slate-800">{selectedAsset.tti}%</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center px-2">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">VÚR (Años)</p>
                                            <p className="text-sm font-bold text-slate-800">{selectedAsset.usefulLifeRemaining} años</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase text-right">Marca / Modelo</p>
                                            <p className="text-sm font-bold text-slate-800 text-right">{selectedAsset.brand} {selectedAsset.model}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Expirations */}
                                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-3 break-inside-avoid">
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                        <ShieldCheck size={16} className="text-orange-500" /> Documentación y Vencimientos
                                    </h3>
                                    <button
                                        onClick={() => setIsExpModalOpen(true)}
                                        className="bg-slate-50 text-slate-500 p-2 rounded-full hover:bg-slate-100 transition-colors"
                                        aria-label="Agregar Vencimiento"
                                    >
                                        <Plus size={16} />
                                    </button>

                                    {selectedAsset.insuranceProvider && (
                                        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 mb-2">
                                            <p className="text-[10px] font-bold text-blue-400 uppercase">Seguro Vigente</p>
                                            <p className="text-sm font-bold text-blue-800">{selectedAsset.insuranceProvider}</p>
                                        </div>
                                    )}

                                    {selectedAsset.expirations && selectedAsset.expirations.length > 0 ? (
                                        selectedAsset.expirations.map(exp => (
                                            <div key={exp.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm">
                                                        <FileText size={14} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-700">{exp.type}</p>
                                                        <p className="text-[10px] text-slate-400">{exp.notes}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Vence</p>
                                                    <p className="text-xs font-bold text-red-500">{exp.expirationDate}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-slate-400 italic text-center py-2">Sin vencimientos registrados.</p>
                                    )}
                                </div>

                                {/* INCIDENTS SECTION (NEW) */}
                                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-3 break-inside-avoid col-span-1 md:col-span-2">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                            <CloudRain size={16} className="text-red-500" /> Historial de Siniestros
                                        </h3>
                                        <button
                                            onClick={() => setIsIncidentModalOpen(true)}
                                            className="bg-red-50 text-red-500 p-2 rounded-full hover:bg-red-100 transition-colors"
                                            aria-label="Registrar Siniestro"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>

                                    {selectedAsset.incidents && selectedAsset.incidents.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {selectedAsset.incidents.map(inc => (
                                                <div key={inc.id} className="flex flex-col gap-2 p-4 bg-red-50/50 rounded-2xl border border-red-100 group transition-all hover:bg-red-50">
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-red-500 shadow-sm shrink-0">
                                                            <AlertTriangle size={16} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <p className="text-xs font-bold text-slate-800">{inc.date}</p>
                                                                    {inc.incidentNumber && <p className="text-[9px] font-black text-red-400 uppercase tracking-tighter">{inc.incidentNumber}</p>}
                                                                </div>
                                                                <span className="text-[9px] font-bold bg-white px-2 py-0.5 rounded border border-red-100 text-red-600 uppercase">{inc.status}</span>
                                                            </div>
                                                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{inc.damageLevel}</p>
                                                        </div>
                                                    </div>

                                                    <p className="text-xs text-slate-600 leading-snug">{inc.description}</p>

                                                    <div className="flex justify-between items-center mt-1 pt-2 border-t border-red-100/50">
                                                        <div className="flex items-center gap-2">
                                                            {inc.cost ? <span className="text-[10px] font-black text-slate-800">${inc.cost.toLocaleString()}</span> : null}
                                                            {inc.reportUrl && (
                                                                <a
                                                                    href={inc.reportUrl}
                                                                    download={`Denuncia-${inc.incidentNumber || inc.id}`}
                                                                    className="p-1 px-2 bg-white text-blue-500 rounded-md border border-blue-100 text-[9px] font-bold flex items-center gap-1 hover:bg-blue-50"
                                                                >
                                                                    <Download size={10} /> Reporte
                                                                </a>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <button
                                                                onClick={() => handleEditIncident(inc)}
                                                                className="p-1.5 bg-white text-slate-400 rounded-lg hover:text-blue-500 border border-slate-100 shadow-sm"
                                                                title="Editar Siniestro"
                                                                aria-label="Editar Siniestro"
                                                            >
                                                                <Edit3 size={12} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteIncident(inc.id)}
                                                                className="p-1.5 bg-white text-slate-400 rounded-lg hover:text-red-500 border border-slate-100 shadow-sm"
                                                                title="Eliminar Siniestro"
                                                                aria-label="Eliminar Siniestro"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                            <p className="text-xs text-slate-400 italic">No se han registrado siniestros.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Quick Actions Grid */}
                            <div className="grid grid-cols-2 gap-4 break-inside-avoid">
                                <button
                                    onClick={() => navigate('/maintenance', { state: { action: 'createOT', assetId: selectedAsset.id, assetName: selectedAsset.name, internalId: selectedAsset.internalId } })}
                                    className="bg-slate-800 text-white p-4 rounded-2xl flex flex-col items-center gap-2 shadow-lg active:scale-95 transition-transform"
                                >
                                    <Wrench size={24} />
                                    <span className="text-xs font-bold uppercase">Crear OT</span>
                                </button>
                                <button
                                    onClick={() => navigate('/maintenance', { state: { action: 'createChecklist', assetId: selectedAsset.id } })}
                                    className="bg-white border border-slate-200 text-slate-600 p-4 rounded-2xl flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-transform hover:border-orange-200 hover:text-orange-500"
                                >
                                    <ClipboardCheck size={24} />
                                    <span className="text-xs font-bold uppercase">Checklist</span>
                                </button>
                            </div>

                            {/* Expandable History Sections */}
                            <div className="space-y-4 break-inside-avoid">
                                {/* Maintenance Plans */}
                                <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
                                    <button onClick={() => setIsPlansExpanded(!isPlansExpanded)} className="w-full p-5 flex items-center justify-between bg-slate-50/50">
                                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                            <CalendarClock size={16} className="text-slate-400" /> Planes de Mantenimiento
                                        </h3>
                                        {isPlansExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                                    </button>
                                    {isPlansExpanded && (
                                        <div className="p-5 space-y-3">
                                            {assetPlans.map(plan => (
                                                <div key={plan.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <div className="flex justify-between mb-1">
                                                        <span className="text-xs font-bold text-slate-700">{plan.title}</span>
                                                        <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded text-slate-600 font-bold">{plan.baseFrequency} {plan.baseFrequencyUnit}</span>
                                                    </div>
                                                    <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar">
                                                        {plan.events.slice(0, 3).map(evt => (
                                                            <span key={evt.id} className={`text-[9px] px-2 py-1 rounded border whitespace-nowrap ${evt.status === 'Programado' ? 'bg-white border-slate-200 text-slate-500' : 'bg-green-50 border-green-100 text-green-700'}`}>
                                                                {evt.title} ({evt.estimatedDate})
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                            {assetPlans.length === 0 && <p className="text-xs text-slate-400 text-center py-2">No hay planes activos.</p>}
                                            <button onClick={handleCreatePlan} className="w-full py-3 mt-2 text-xs font-bold text-orange-500 border border-dashed border-orange-200 rounded-xl hover:bg-orange-50 transition-colors">
                                                + Crear Nuevo Plan
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Checklists Realizados */}
                                <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
                                    <button onClick={() => setIsChecklistsExpanded(!isChecklistsExpanded)} className="w-full p-5 flex items-center justify-between bg-slate-50/50">
                                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                            <ClipboardList size={16} className="text-slate-400" /> Checklists Realizados
                                        </h3>
                                        {isChecklistsExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                                    </button>
                                    {isChecklistsExpanded && (
                                        <div className="p-5 space-y-3">
                                            {assetChecklists.map(chk => (
                                                <div key={chk.id} onClick={() => navigate(`/maintenance/checklist/${chk.id}`)} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl shadow-sm cursor-pointer hover:bg-slate-50">
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800">Checklist Operativo</p>
                                                        <p className="text-[10px] text-slate-400">{chk.date} • {chk.inspector}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[9px] px-2 py-1 rounded-lg border uppercase font-bold ${chk.conformity >= 80 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {chk.conformity}%
                                                        </span>
                                                        <ChevronRight size={14} className="text-slate-300" />
                                                    </div>
                                                </div>
                                            ))}
                                            {assetChecklists.length === 0 && <p className="text-xs text-slate-400 text-center py-2">No hay checklists registrados.</p>}
                                        </div>
                                    )}
                                </div>

                                {/* Work Orders */}
                                <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
                                    <button onClick={() => setIsWorkOrdersExpanded(!isWorkOrdersExpanded)} className="w-full p-5 flex items-center justify-between bg-slate-50/50">
                                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                            <Wrench size={16} className="text-slate-400" /> Órdenes de Trabajo (OT)
                                        </h3>
                                        {isWorkOrdersExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                                    </button>
                                    {isWorkOrdersExpanded && (
                                        <div className="p-5 space-y-3">
                                            {assetWorkOrders.map(ot => (
                                                <div key={ot.id} onClick={() => navigate(`/maintenance/ot/${ot.id}`)} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl shadow-sm cursor-pointer hover:bg-slate-50">
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800">{ot.title}</p>
                                                        <p className="text-[10px] text-slate-400">{ot.dateStart} • {ot.internalId || ot.mockId}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[9px] px-2 py-1 rounded-lg border uppercase font-bold ${getOTStatusColor(ot.status)}`}>
                                                            {ot.status}
                                                        </span>
                                                        <ChevronRight size={14} className="text-slate-300" />
                                                    </div>
                                                </div>
                                            ))}
                                            {assetWorkOrders.length === 0 && <p className="text-xs text-slate-400 text-center py-2">No hay órdenes registradas.</p>}
                                            <button
                                                onClick={() => navigate('/maintenance', { state: { action: 'createOT', assetId: selectedAsset.id } })}
                                                className="w-full py-3 mt-2 text-xs font-bold text-slate-500 border border-dashed border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                                            >
                                                + Nueva Orden de Trabajo
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 8. DOCUMENTACIÓN */}
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                        <Paperclip size={16} className="text-orange-500" /> Documentación Adjunta
                                    </h3>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            id="doc-upload"
                                            className="hidden"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={async (e) => {
                                                if (e.target.files && e.target.files[0] && selectedAsset) {
                                                    const file = e.target.files[0];
                                                    const description = window.prompt("Descripción del documento (Opcional):") || file.name;
                                                    const type = window.prompt("Tipo (Factura, Remito, Título, Tarjeta Verde, Certificación, Contrato, Otro):", "Otro") || "Otro";

                                                    const reader = new FileReader();
                                                    reader.onload = async (ev) => {
                                                        if (ev.target?.result) {
                                                            const fileUrl = ev.target.result as string;

                                                            // Save to DB
                                                            const { data, error } = await supabase.from('asset_documents').insert({
                                                                asset_id: selectedAsset.id,
                                                                type: type,
                                                                description: description,
                                                                file_url: fileUrl
                                                            }).select().single();

                                                            if (data) {
                                                                const newDoc = {
                                                                    id: data.id,
                                                                    assetId: data.asset_id,
                                                                    type: data.type,
                                                                    description: data.description,
                                                                    fileUrl: data.file_url,
                                                                    createdAt: data.created_at
                                                                };
                                                                // Update local state
                                                                setSelectedAsset(prev => prev ? ({ ...prev, documents: [newDoc, ...(prev.documents || [])] }) : null);
                                                            } else {
                                                                alert("Error al subir documento.");
                                                                console.error(error);
                                                            }
                                                        }
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />
                                        <label
                                            htmlFor="doc-upload"
                                            className="text-[10px] font-bold bg-slate-800 text-white px-3 py-1.5 rounded-full cursor-pointer hover:bg-slate-700 flex items-center gap-1"
                                        >
                                            <Plus size={14} /> Agregar
                                        </label>
                                    </div>
                                </div>

                                {selectedAsset.documents && selectedAsset.documents.length > 0 ? (
                                    <div className="space-y-2">
                                        {selectedAsset.documents.map((doc, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-orange-200 transition-colors group">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-400 group-hover:text-orange-500">
                                                        <FileCheck size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800">{doc.type}</p>
                                                        <p className="text-[10px] text-slate-500">{doc.description}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-bold text-slate-400">{new Date(doc.createdAt).toLocaleDateString()}</span>
                                                    {doc.fileUrl && (
                                                        <a
                                                            href={doc.fileUrl}
                                                            download={`Doc-${doc.type}-${selectedAsset.internalId}`}
                                                            className="p-1.5 bg-white text-slate-400 rounded-lg hover:text-blue-500 hover:bg-blue-50 border border-slate-200"
                                                            title="Descargar"
                                                        >
                                                            <Download size={14} />
                                                        </a>
                                                    )}
                                                    <button
                                                        onClick={async () => {
                                                            if (!window.confirm("¿Eliminar este documento?")) return;

                                                            const { error } = await supabase
                                                                .from('asset_documents')
                                                                .delete()
                                                                .eq('id', doc.id);

                                                            if (error) {
                                                                alert("Error al eliminar documento.");
                                                                console.error(error);
                                                            } else {
                                                                setSelectedAsset(prev => prev ? ({
                                                                    ...prev,
                                                                    documents: prev.documents?.filter(d => d.id !== doc.id)
                                                                }) : null);
                                                            }
                                                        }}
                                                        className="p-1.5 bg-white text-slate-400 rounded-lg hover:text-red-500 hover:bg-red-50 border border-slate-200"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 italic text-center py-4">Sin documentación adjunta.</p>
                                )}
                            </div>

                            {/* Modal de Vencimientos */}
                            {isExpModalOpen && (
                                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                    <div className="bg-white rounded-[2rem] p-6 w-full max-w-md shadow-2xl relative">
                                        <button
                                            onClick={() => setIsExpModalOpen(false)}
                                            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
                                        >
                                            <X size={24} />
                                        </button>

                                        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                            <ShieldCheck className="text-orange-500" /> Agregar Vencimiento
                                        </h2>

                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tipo</label>
                                                <select
                                                    value={newExp.type}
                                                    onChange={e => setNewExp({ ...newExp, type: e.target.value as any })}
                                                    className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-800"
                                                >
                                                    <option value="ITV">ITV</option>
                                                    <option value="RTO">RTO</option>
                                                    <option value="VTV">VTV</option>
                                                    <option value="Seguro">Seguro</option>
                                                    <option value="Cédula Verde">Cédula Verde</option>
                                                    <option value="Matafuegos">Matafuegos</option>
                                                    <option value="Certificación">Certificación</option>
                                                    <option value="Otro">Otro</option>
                                                </select>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Fecha Vencimiento</label>
                                                <input
                                                    type="date"
                                                    value={newExp.expirationDate}
                                                    onChange={e => setNewExp({ ...newExp, expirationDate: e.target.value })}
                                                    className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Notas / Proveedor</label>
                                                <input
                                                    type="text"
                                                    value={newExp.notes}
                                                    onChange={e => setNewExp({ ...newExp, notes: e.target.value })}
                                                    className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium"
                                                    placeholder="Detalles adicionales..."
                                                />
                                            </div>

                                            <button
                                                onClick={handleAddExpiration}
                                                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200 mt-4"
                                            >
                                                Guardar Vencimiento
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    }

    // --- LIST VIEW ---
    return (
        <div className="p-4 md:p-8 space-y-6 bg-[#F8F9FA] min-h-screen pb-24">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm sticky top-2 z-10 border border-slate-50">
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate('/assets')} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400">
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className="text-xl font-bold text-slate-800 pl-2">Rodados</h1>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 shadow-sm hover:bg-slate-50 hover:text-blue-600 transition-colors"
                        aria-label="Importar Activos"
                        title="Importar Activos"
                    >
                        <Package size={24} />
                    </button>
                    <button
                        onClick={() => {
                            setNewAssetData({
                                name: '', internalId: '', barcodeId: '', type: 'Rodados', status: AssetStatus.OPERATIONAL,
                                ownership: 'Propio', supplier: '', brand: '', model: '', serial: '', year: new Date().getFullYear(), location: 'Pañol Central',
                                image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=400',
                                dailyRate: 0, value: 0, hours: 0, domainNumber: '', responsible: '',
                                accountingAccount: '', functionalDescription: '', complementaryDescription: '', originYear: new Date().getFullYear(), usefulLifeRemaining: 0, tti: 0,
                                chassisNumber: '', engineNumber: '', insuranceProvider: '', incidents: []
                            });
                            setNewExpirations([]);
                            setIsCreating(true);
                        }}
                        className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200 active:scale-95 transition-transform"
                        aria-label="Agregar Nuevo Activo"
                    >
                        <Plus size={24} />
                    </button>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar equipo, flota..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white border-none rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 shadow-sm text-sm font-medium"
                        aria-label="Buscar activos"
                    />
                </div>

                <div className="flex bg-slate-200 p-1 rounded-xl">
                    <button onClick={() => setAssetTab('all')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${assetTab === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Todos</button>
                    <button onClick={() => setAssetTab('owned')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${assetTab === 'owned' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Propio</button>
                    <button onClick={() => setAssetTab('rented')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${assetTab === 'rented' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Alquilado</button>
                    <button onClick={() => setAssetTab('leasing')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${assetTab === 'leasing' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Leasing</button>
                </div>
            </div>

            {/* Asset List */}
            <div className="space-y-4">
                {filteredAssets.map(asset => (
                    <AssetListItem
                        key={asset.id}
                        asset={asset}
                        onClick={setSelectedAsset}
                        getStatusColor={getStatusColor}
                    />
                ))}

                {filteredAssets.length === 0 && (
                    <div className="text-center py-12">
                        <Bot size={48} className="mx-auto text-slate-200 mb-4" />
                    </div>
                )}


            </div>

            {/* Import Modal */}
            <AssetImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={() => {
                    fetchAssets();
                }}
                initialAssetType="Rodados"
                forceAssetType={true}
            />
        </div>
    );
};

export default Vehicles;
