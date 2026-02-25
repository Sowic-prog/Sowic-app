
import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Search, Filter, MapPin, Activity, ChevronRight, ArrowLeft,
    Hammer, Phone, Calendar, CheckCircle2, MoreVertical, Wrench,
    DollarSign, Bot, Car, Camera, Plus, Save, X, User, QrCode,
    Flashlight, ImageIcon, Keyboard, Edit3, History, Clock, FileText, Tag, Info, ChevronDown, UserCircle2, RotateCcw,
    ShieldAlert, ShieldCheck, AlertCircle, Trash2, Printer, Download, ChevronUp, ClipboardCheck, ChevronLeft, ClipboardList,
    HardHat, ScanLine, CalendarClock, Briefcase, Coins, Percent, FileType, AlertTriangle, CloudRain, Paperclip, FileCheck, Armchair, Sofa, Package
} from 'lucide-react';
import AssetImportModal from '../components/AssetImportModal';
import { Asset, AssetStatus, AssetExpiration, WorkOrderStatus, AssetOwnership, AssetIncident, Project, Staff } from '../types';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

// Helper to map DB snake_case to TS camelCase
const mapAssetFromDB = (dbAsset: any): Asset => ({
    ...dbAsset,
    id: dbAsset.id,
    internalId: dbAsset.internal_id || '',
    barcodeId: dbAsset.barcode_id || '',
    name: dbAsset.name || '',
    brand: dbAsset.brand || '',
    model: dbAsset.model || '',
    serial: dbAsset.serial || '',
    // Common
    location: dbAsset.location || '',
    responsible: dbAsset.assigned_to || '', // Mapped from assigned_to
    ownership: dbAsset.ownership || '',
    status: dbAsset.status || 'Operativo',
    image: dbAsset.image || 'https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&q=80&w=400',
    // Ensure arrays are initialized
    expirations: dbAsset.expirations || [],
    incidents: dbAsset.incidents || [],
    // Metrics
    year: dbAsset.created_at ? new Date(dbAsset.created_at).getFullYear() : new Date().getFullYear(),
    hours: 0,
    dailyRate: 0,
    value: parseFloat(dbAsset.value) || 0,
    functionalDescription: dbAsset.functional_description || '',
    complementaryDescription: dbAsset.complementary_description || '',
    type: 'Mobiliario'
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
    return {
        internal_id: asset.internalId,
        barcode_id: asset.barcodeId,
        name: asset.name,
        brand: asset.brand,
        model: asset.model,
        serial: asset.serial,
        image: asset.image,
        status: asset.status,
        location: asset.location,
        assigned_to: asset.responsible, // Mapped to assigned_to
        description: asset.description,
        ownership: asset.ownership || 'Propio',
        type: 'Mobiliario',
        functional_description: asset.functionalDescription,
        complementary_description: asset.complementaryDescription,
        value: asset.value
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

            <div className="w-20 h-20 bg-slate-100 rounded-2xl overflow-hidden shrink-0 border border-slate-100 relative">
                <img src={asset.image} alt={asset.name} loading="lazy" className="w-full h-full object-cover" />
                {asset.responsible && (
                    <div className="absolute bottom-0 right-0 left-0 bg-black/50 backdrop-blur-[2px] p-1 text-center">
                        <span className="text-[8px] text-white font-bold truncate block">{asset.responsible}</span>
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{asset.internalId}</span>
                        {asset.barcodeId && <span className="text-[9px] font-bold text-slate-500 font-mono">{asset.barcodeId}</span>}
                    </div>
                    {asset.ownership === 'Alquilado' && (
                        <span className="text-[9px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">RENT</span>
                    )}
                </div>

                <h3 className="font-bold text-slate-800 text-sm truncate pr-2 leading-tight">{asset.name}</h3>

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                        <MapPin size={10} className="text-orange-500" />
                        <span className="truncate max-w-[100px]">{asset.location}</span>
                    </div>
                </div>
            </div>

            <ChevronRight size={20} className="text-slate-300 group-hover:text-orange-500 transition-colors" />
        </div>
    );
});

const Furniture: React.FC = () => {
    const { user, checkPermission } = useAuth();
    const isSuperAdmin = user?.auth?.role === 'SuperAdmin';
    const canEdit = checkPermission('/assets', 'edit');
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
        type: 'Mobiliario',
        status: AssetStatus.OPERATIONAL,
        ownership: 'Propio',
        supplier: '',
        brand: '',
        model: '',
        serial: '',
        year: new Date().getFullYear(),
        location: 'Pañol Central',
        responsible: '', // Initialize empty
        image: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&q=80&w=400',
        dailyRate: 0,
        value: 0,
        hours: 0,
        domainNumber: '',

        incidents: [],
        functionalDescription: ''
    });
    const [newExpirations, setNewExpirations] = useState<AssetExpiration[]>([]);
    const [newExpForm, setNewExpForm] = useState<Partial<AssetExpiration>>({ type: 'ITV', expirationDate: '', notes: '' });

    // Collapsible states
    const [isPlansExpanded, setIsPlansExpanded] = useState(false);
    const [isChecklistsExpanded, setIsChecklistsExpanded] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const incidentReportRef = useRef<HTMLInputElement>(null);
    const lastSelectedAssetId = useRef<string | null>(null);

    useEffect(() => {
        fetchAssets();
        fetchProjects();
        fetchStaff();
    }, []);

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

    const fetchAssets = async () => {
        setLoading(true);
        try {
            // 1. Fetch Assets
            const { data: assetsData, error: assetsError } = await supabase
                .from('mobiliario')
                .select('*')
                .order('created_at', { ascending: false });

            if (assetsError) throw assetsError;

            // 2. Fetch Active Allocations
            const today = new Date().toISOString().split('T')[0];
            const { data: allocationsData, error: allocationsError } = await supabase
                .from('asset_allocations')
                .select('*, projects(name)')
                .lte('start_date', today)
                .gte('end_date', today)
                .eq('status', 'Activo');

            if (allocationsError) {
                console.error('Error fetching allocations:', allocationsError);
            }

            if (assetsData) {
                const mappedAssets = assetsData.map(dbAsset => {
                    const baseAsset = mapAssetFromDB(dbAsset);

                    // Find active allocation
                    const allocation = allocationsData?.find(a => a.asset_id === baseAsset.id);

                    if (allocation) {
                        return {
                            ...baseAsset,
                            location: allocation.projects?.name || baseAsset.location,
                        };
                    }
                    return baseAsset;
                });
                setAssets(mappedAssets);
            }
        } catch (err: any) {
            console.error('Error fetching assets:', err);
            setError('Error al cargar mobiliario: ' + err.message);
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
                    .eq('asset_id', selectedAsset.id);

                if (data) {
                    setAssetPlans(data.map(p => ({
                        id: p.id,
                        title: p.title,
                        baseFrequency: p.base_frequency,
                        baseFrequencyUnit: p.base_frequency_unit,
                        events: p.maintenance_events.map((e: any) => ({
                            id: e.id,
                            title: e.title,
                            estimatedDate: e.estimated_date,
                            status: e.status
                        }))
                    })));
                }
            };

            // Fetch Incidents from Central Table
            const fetchIncidents = async () => {
                const { data } = await supabase
                    .from('asset_incidents')
                    .select('*')
                    .eq('asset_id', selectedAsset.id)
                    .order('date', { ascending: false });

                if (data) {
                    const mappedInc = data.map(i => ({
                        id: i.id,
                        assetId: i.asset_id,
                        date: i.date,
                        description: i.description,
                        damageLevel: i.damage_level,
                        cost: i.cost,
                        status: i.status,
                        incidentNumber: i.incident_number,
                        reportUrl: i.report_url
                    }));
                    setSelectedAsset(prev => prev ? ({ ...prev, incidents: mappedInc }) : null);
                }
            };

            fetchWorkOrders();
            fetchChecklists();
            fetchPlans();
            fetchIncidents();
        }
    }, [selectedAsset?.id]);

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
        // Ensure strictly Mobiliario
        if (a.type !== 'Mobiliario') return false;

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
            case AssetStatus.RETURNED: return 'bg-slate-700';
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
                    .from('mobiliario')
                    .update(payload)
                    .eq('id', selectedAsset.id);

                if (error) throw error;

                // Update local state
                setAssets(prev => prev.map(a => a.id === selectedAsset.id ? updatedAssetData : a));
                setSelectedAsset(updatedAssetData);
                setIsEditingAsset(false);
                setEditFormData({});
                alert("Mobiliario actualizado correctamente.");
            } catch (err: any) {
                console.error('Error updating asset:', err);
                alert("Error al actualizar mobiliario: " + err.message);
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
                .from('mobiliario')
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
                    name: '', internalId: '', barcodeId: '', type: 'Mobiliario', status: AssetStatus.OPERATIONAL,
                    ownership: 'Propio', brand: '', model: '', serial: '', location: 'Pañol Central',
                    image: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&q=80&w=400',
                    responsible: '', description: ''
                });
                setNewExpirations([]);
                alert("Mobiliario creado exitosamente.");
            }
        } catch (err: any) {
            console.error('Error creating asset:', err);
            alert("Error al crear mobiliario: " + err.message);
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
        if (!selectedAsset || !newIncidentForm.description) return;

        try {
            const payload = {
                asset_id: selectedAsset.id,
                date: newIncidentForm.date,
                description: newIncidentForm.description,
                damage_level: newIncidentForm.damageLevel,
                cost: newIncidentForm.cost,
                status: newIncidentForm.status,
                incident_number: newIncidentForm.incidentNumber,
                report_url: newIncidentForm.reportUrl
            };

            let data, error;
            if (isEditingIncident && editingIncidentId) {
                ({ data, error } = await supabase
                    .from('asset_incidents')
                    .update(payload)
                    .eq('id', editingIncidentId)
                    .select()
                    .single());
            } else {
                ({ data, error } = await supabase
                    .from('asset_incidents')
                    .insert(payload)
                    .select()
                    .single());
            }

            if (error) throw error;

            const newInc: AssetIncident = {
                id: data.id,
                assetId: data.asset_id,
                date: data.date,
                description: data.description,
                damageLevel: data.damage_level,
                cost: data.cost,
                status: data.status,
                incidentNumber: data.incident_number,
                reportUrl: data.report_url
            };

            setSelectedAsset(prev => prev ? ({
                ...prev,
                incidents: isEditingIncident
                    ? prev.incidents?.map(i => i.id === data.id ? newInc : i)
                    : [newInc, ...(prev.incidents || [])]
            }) : null);

            setIsIncidentModalOpen(false);
            setNewIncidentForm({ date: new Date().toISOString().split('T')[0], description: '', cost: 0, damageLevel: 'Leve', status: 'Reportado' });
            setIsEditingIncident(false);
            setEditingIncidentId(null);
        } catch (err: any) {
            console.error('Error saving incident:', err);
            alert("Error al guardar siniestro: " + err.message);
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
            const { error } = await supabase
                .from('asset_incidents')
                .delete()
                .eq('id', incidentId);

            if (error) throw error;

            setSelectedAsset(prev => prev ? ({
                ...prev,
                incidents: prev.incidents?.filter(i => i.id !== incidentId)
            }) : null);

            alert("Siniestro eliminado correctamente.");
        } catch (err: any) {
            console.error('Error deleting incident:', err);
            alert("Error al eliminar el siniestro: " + err.message);
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
                    <h1 className="font-bold text-lg text-slate-800 tracking-tight">Mobiliario</h1>
                    <button onClick={handleSaveNewAsset} className="text-orange-500 font-bold text-sm bg-orange-50 px-3 py-1.5 rounded-full">Guardar</button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Image Upload */}
                    <div className="relative h-56 rounded-[2.5rem] overflow-hidden bg-slate-200 group shadow-inner">
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
                            <Tag size={16} className="text-orange-500" /> Identificación y Propiedad
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Propiedad</label>
                                <select
                                    value={newAssetData.ownership}
                                    onChange={(e) => setNewAssetData({ ...newAssetData, ownership: e.target.value as any })}
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800 appearance-none"
                                >
                                    <option value="Propio">Propio</option>
                                    <option value="Alquilado">Alquilado</option>
                                    <option value="Leasing">Leasing</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Estado</label>
                                <select
                                    value={newAssetData.status}
                                    onChange={(e) => setNewAssetData({ ...newAssetData, status: e.target.value as any })}
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium"
                                >
                                    {Object.values(AssetStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">ID Interno</label>
                                <input
                                    type="text"
                                    value={newAssetData.internalId}
                                    onChange={(e) => setNewAssetData({ ...newAssetData, internalId: e.target.value })}
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800 uppercase"
                                    placeholder="Ej. MOB-001"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Código ID (4 dígitos)</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        maxLength={4}
                                        value={newAssetData.barcodeId}
                                        onChange={(e) => setNewAssetData({ ...newAssetData, barcodeId: e.target.value.replace(/\D/g, '') })}
                                        className="w-full p-4 pl-12 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800 tracking-widest placeholder:font-normal placeholder:tracking-normal"
                                        placeholder="Ej. 1001"
                                    />
                                    <QrCode size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nombre</label>
                            <input
                                type="text"
                                value={newAssetData.name}
                                onChange={(e) => setNewAssetData({ ...newAssetData, name: e.target.value })}
                                className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800"
                                placeholder="Ej. Escritorio Ejecutivo"
                            />
                        </div>
                    </div>

                    {/* Location & Assignment */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <MapPin size={16} className="text-orange-500" /> Ubicación y Responsable
                        </h3>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Ubicación Actual</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={newAssetData.location}
                                    onChange={(e) => setNewAssetData({ ...newAssetData, location: e.target.value })}
                                    className="w-full p-4 pl-12 bg-slate-50 border-none rounded-2xl text-sm font-medium"
                                    placeholder="Ej. Oficina Administración"
                                />
                                <MapPin size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
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
                                    <option value="">Seleccionar Responsable...</option>
                                    {dbStaff.map(s => (
                                        <option key={s.id} value={s.name}>{s.name}</option>
                                    ))}
                                </select>
                                <UserCircle2 size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <FileText size={16} className="text-orange-500" /> Detalle Descriptivo
                        </h3>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Descripción Funcional</label>
                            <input
                                type="text"
                                value={newAssetData.functionalDescription || ''}
                                onChange={(e) => setNewAssetData({ ...newAssetData, functionalDescription: e.target.value })}
                                placeholder="Ej. Escritorio en L"
                                className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium"
                            />
                        </div>
                        <textarea
                            value={newAssetData.description || ''}
                            onChange={(e) => setNewAssetData({ ...newAssetData, description: e.target.value })}
                            className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium h-32 resize-none"
                            placeholder="Descripción detallada..."
                        />
                    </div>
                </div>
            </div>
        );
    }

    if (selectedAsset) {
        return (
            <div className="bg-[#F8F9FA] min-h-screen pb-24 font-sans animate-in slide-in-from-right-5 duration-300">
                {/* Print Header */}
                <div className="print-header hidden print:flex items-center justify-between mb-8 border-b-2 border-slate-900 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white font-black text-xl">S</div>
                        <div>
                            <h1 className="font-black text-xl text-slate-800 tracking-tight uppercase">Ficha Técnica Mobiliario</h1>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Sowic Asset Management System</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex items-center justify-between no-print">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSelectedAsset(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                            <ChevronLeft size={24} />
                        </button>
                        <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none block">{selectedAsset.internalId}</span>
                            <h1 className="font-bold text-lg text-slate-800 tracking-tight">{selectedAsset.name}</h1>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {isEditingAsset ? (
                            <>
                                <button onClick={cancelEditing} className="w-10 h-10 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center" aria-label="Cancelar">
                                    <X size={20} />
                                </button>
                                <button onClick={saveAssetChanges} className="w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-lg transform transition-transform active:scale-95" aria-label="Guardar">
                                    <Save size={20} />
                                </button>
                            </>
                        ) : (
                            <>
                                {canEdit && (
                                    <button onClick={startEditing} className="w-10 h-10 bg-white border border-slate-200 text-slate-600 rounded-full flex items-center justify-center shadow-sm hover:text-orange-500 transition-colors" aria-label="Editar">
                                        <Edit3 size={20} />
                                    </button>
                                )}
                                <button onClick={handlePrint} className="w-10 h-10 bg-slate-800 text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform" aria-label="Imprimir">
                                    <Printer size={20} />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="p-6">
                    {isEditingAsset ? (
                        <div className="space-y-6 max-w-2xl mx-auto">
                            {/* Edit form implementation */}
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
                                <div className="flex justify-center mb-8">
                                    <div className="relative w-32 h-32 rounded-[2rem] overflow-hidden group shadow-xl ring-4 ring-slate-50">
                                        <img src={editFormData.image} alt="Preview" className="w-full h-full object-cover" />
                                        <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                                            <Camera size={24} />
                                        </button>
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} aria-label="Cambiar imagen" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 col-span-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nombre del Activo</label>
                                        <input
                                            type="text"
                                            value={editFormData.name}
                                            onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                                            className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">ID Interno</label>
                                        <input
                                            type="text"
                                            value={editFormData.internalId}
                                            disabled={!isSuperAdmin}
                                            className={`w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-black text-slate-800 border-2 ${!isSuperAdmin ? 'opacity-50' : 'border-blue-50 focus:border-blue-200'}`}
                                            aria-label="ID Interno"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Código ID</label>
                                        <input
                                            type="text"
                                            value={editFormData.barcodeId}
                                            onChange={e => setEditFormData({ ...editFormData, barcodeId: e.target.value })}
                                            className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800"
                                            placeholder="Auto"
                                            aria-label="Código de Barras"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Marca</label>
                                        <input
                                            type="text"
                                            value={editFormData.brand}
                                            onChange={e => setEditFormData({ ...editFormData, brand: e.target.value })}
                                            className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium"
                                            aria-label="Marca"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Modelo</label>
                                        <input
                                            type="text"
                                            value={editFormData.model}
                                            onChange={e => setEditFormData({ ...editFormData, model: e.target.value })}
                                            className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium"
                                            aria-label="Modelo"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Responsable</label>
                                    <select
                                        value={editFormData.responsible}
                                        onChange={e => setEditFormData({ ...editFormData, responsible: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800"
                                    >
                                        <option value="">Sin Asignar</option>
                                        {dbStaff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Descripción Funcional</label>
                                    <textarea
                                        value={editFormData.functionalDescription}
                                        onChange={e => setEditFormData({ ...editFormData, functionalDescription: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium h-24 resize-none"
                                        aria-label="Descripción Funcional"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-7xl mx-auto">
                            {/* Bento Grid layout */}
                            {/* Left Column: Image and Key Info (4/12) */}
                            <div className="md:col-span-4 space-y-6">
                                <div className="bg-white p-2 rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                                    <img src={selectedAsset.image} alt={selectedAsset.name} className="w-full h-80 object-cover rounded-[2rem]" />
                                </div>

                                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500 rounded-full blur-[60px] opacity-20 -mr-10 -mt-10"></div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Estado Actual</p>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full animate-pulse ${getStatusColor(selectedAsset.status)}`}></div>
                                        <h2 className="text-2xl font-black tracking-tight">{selectedAsset.status}</h2>
                                    </div>
                                    <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-400 font-bold uppercase">Propiedad</span>
                                            <span className="text-xs font-black text-orange-500 uppercase bg-orange-500/10 px-2 py-1 rounded">{selectedAsset.ownership}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-400 font-bold uppercase">Ubicación</span>
                                            <span className="text-xs font-black">{selectedAsset.location}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <QrCode size={16} className="text-orange-500" /> Identificación
                                    </h3>
                                    <div className="flex justify-center mb-6 py-4 bg-slate-50 rounded-3xl border border-slate-100 border-dashed">
                                        <BarcodeView id={selectedAsset.barcodeId || selectedAsset.internalId} />
                                    </div>
                                    <div className="space-y-4">
                                        <div className="p-4 bg-slate-50 rounded-2xl">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">ID Interno</p>
                                            <p className="text-sm font-black text-slate-800 tracking-tight">{selectedAsset.internalId}</p>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-2xl">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Código de Barras</p>
                                            <p className="text-sm font-black text-slate-800 tracking-tight">{selectedAsset.barcodeId || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Detailed Info and History (8/12) */}
                            <div className="md:col-span-8 space-y-6">
                                {/* Details Bento Row */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 min-h-[220px]">
                                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                                            <Armchair size={16} className="text-orange-500" /> Características
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Marca / Fabricante</p>
                                                <p className="text-sm font-bold text-slate-700">{selectedAsset.brand || 'No especificada'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Modelo</p>
                                                <p className="text-sm font-bold text-slate-700">{selectedAsset.model || 'No especificado'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Nº de Serie</p>
                                                <p className="text-sm font-mono font-bold text-slate-700">{selectedAsset.serial || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 min-h-[220px]">
                                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                                            <UserCircle2 size={16} className="text-orange-500" /> Responsable
                                        </h3>
                                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                                            <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-orange-100">
                                                {selectedAsset.responsible?.charAt(0) || 'S'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-800 tracking-tight">{selectedAsset.responsible || 'Sin Asignar'}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Responsable Actual</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Descriptions */}
                                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <FileText size={16} className="text-orange-500" /> Descripciones
                                    </h3>
                                    <div className="space-y-6">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Descripción Funcional</p>
                                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <p className="text-sm text-slate-700 leading-relaxed font-medium">
                                                    {selectedAsset.functionalDescription || 'Sin descripción funcional cargada.'}
                                                </p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Notas Complementarias</p>
                                            <p className="text-sm text-slate-500 leading-relaxed">
                                                {selectedAsset.description || 'No hay información adicional registrada para este activo.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Maintenance & History Accordion */}
                                <div className="space-y-4">
                                    {/* Work Orders */}
                                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden no-print">
                                        <button
                                            onClick={() => setIsWorkOrdersExpanded(!isWorkOrdersExpanded)}
                                            className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                                                    <Wrench size={20} />
                                                </div>
                                                <div className="text-left">
                                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Historial de Mantenimiento</h3>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{assetWorkOrders.length} Órdenes de Trabajo</p>
                                                </div>
                                            </div>
                                            {isWorkOrdersExpanded ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                                        </button>
                                        {isWorkOrdersExpanded && (
                                            <div className="p-6 pt-0 border-t border-slate-50 space-y-3">
                                                {assetWorkOrders.length > 0 ? (
                                                    assetWorkOrders.map(wo => (
                                                        <div key={wo.id} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100 hover:border-blue-100 transition-colors cursor-pointer group" onClick={() => navigate(`/maintenance/ot/${wo.id}`)}>
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:border-blue-100 transition-colors">
                                                                    <ClipboardList size={20} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-slate-700">{wo.title}</p>
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(wo.dateStart).toLocaleDateString()}</p>
                                                                </div>
                                                            </div>
                                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${getOTStatusColor(wo.status)}`}>{wo.status}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-center py-8 text-xs font-bold text-slate-400 uppercase">Sin órdenes registradas</p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Incidents (Siniestros) */}
                                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden no-print">
                                        <div className="p-6 flex items-center justify-between border-b border-slate-50">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
                                                    <ShieldAlert size={20} />
                                                </div>
                                                <div className="text-left">
                                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Registro de Siniestros</h3>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{selectedAsset.incidents?.length || 0} Incidentes reportados</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setIsIncidentModalOpen(true)}
                                                className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg active:scale-95 transition-all"
                                            >
                                                Registrar Siniestro
                                            </button>
                                        </div>
                                        <div className="p-6 space-y-4">
                                            {selectedAsset.incidents && selectedAsset.incidents.length > 0 ? (
                                                selectedAsset.incidents.map(inc => (
                                                    <div key={inc.id} className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 hover:border-red-100 transition-all group">
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-red-500">
                                                                    <AlertTriangle size={20} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-black text-slate-800 uppercase">{new Date(inc.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{inc.incidentNumber || 'S/N'}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase border ${inc.damageLevel === 'Grave' || inc.damageLevel === 'Destrucción Total' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                                                                    {inc.damageLevel}
                                                                </span>
                                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button onClick={() => handleEditIncident(inc)} className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-blue-500 transition-colors">
                                                                        <Edit3 size={14} />
                                                                    </button>
                                                                    <button onClick={() => handleDeleteIncident(inc.id)} className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-red-500 transition-colors">
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-slate-600 font-medium leading-relaxed mb-4">{inc.description}</p>
                                                        {inc.cost > 0 && (
                                                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase bg-white border border-slate-100 w-fit px-3 py-1 rounded-full">
                                                                <Coins size={12} className="text-orange-500" />
                                                                Costo: <span className="text-slate-800">${inc.cost.toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-10 opacity-30">
                                                    <ShieldCheck size={48} className="mx-auto mb-3 text-slate-300" />
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sin antecedentes de siniestros</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <IncidentModal
                    isOpen={isIncidentModalOpen}
                    onClose={() => {
                        setIsIncidentModalOpen(false);
                        setIsEditingIncident(false);
                        setEditingIncidentId(null);
                        setNewIncidentForm({ date: new Date().toISOString().split('T')[0], description: '', cost: 0, damageLevel: 'Leve', status: 'Reportado' });
                    }}
                    form={newIncidentForm}
                    onChange={setNewIncidentForm}
                    onSubmit={handleAddIncident}
                    isEditing={isEditingIncident}
                />
            </div>
        );
    }

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-24 font-sans">
            <div className="bg-white p-6 sticky top-0 z-10 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/assets')} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Mobiliario</h1>
                        <p className="text-sm text-slate-500 font-medium">Gestión de Muebles y Útiles</p>
                    </div>
                </div>
                {canEdit && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-600 shadow-sm hover:bg-slate-50 hover:text-blue-600 transition-colors"
                            aria-label="Importar Activos"
                            title="Importar Activos"
                        >
                            <Package size={24} />
                        </button>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-200 hover:scale-105 active:scale-95 transition-all"
                        >
                            <Plus size={28} />
                        </button>
                    </div>
                )}
            </div>

            <div className="px-6 py-2">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Buscar por nombre, ID o ubicación..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-4 pl-12 bg-white border-none rounded-2xl text-sm font-medium shadow-sm focus:ring-2 focus:ring-orange-100 transition-all text-slate-600"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                </div>
            </div>

            {/* Tabs */}
            <div className="px-6 py-2 flex gap-2 overflow-x-auto no-scrollbar">
                {[
                    { id: 'all', label: 'Todos' },
                    { id: 'owned', label: 'Propios' },
                    { id: 'rented', label: 'Alquilados' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setAssetTab(tab.id as any)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${assetTab === tab.id ? 'bg-slate-800 text-white' : 'bg-white text-slate-500'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="p-6 space-y-4">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-slate-400 font-medium animate-pulse">Cargando mobiliario...</p>
                    </div>
                ) : filteredAssets.length > 0 ? (
                    filteredAssets.map(asset => (
                        <AssetListItem key={asset.id} asset={asset} onClick={setSelectedAsset} getStatusColor={getStatusColor} />
                    ))
                ) : (
                    <div className="text-center py-12 opacity-50">
                        <Armchair size={48} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-500 font-medium">No se encontró mobiliario</p>
                    </div>
                )}
                {/* Import Modal */}
                <AssetImportModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    onSuccess={() => {
                        fetchAssets();
                    }}
                    initialAssetType="Mobiliario"
                    forceAssetType={true}
                />
            </div>
        </div>
    );
};

const IncidentModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    form: Partial<AssetIncident>;
    onChange: (form: Partial<AssetIncident>) => void;
    onSubmit: () => void;
    isEditing: boolean;
}> = ({ isOpen, onClose, form, onChange, onSubmit, isEditing }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">
                            {isEditing ? 'Editar Siniestro' : 'Registrar Siniestro'}
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Fecha</label>
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={e => onChange({ ...form, date: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nivel de Daño</label>
                                <select
                                    value={form.damageLevel}
                                    onChange={e => onChange({ ...form, damageLevel: e.target.value as any })}
                                    className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium"
                                >
                                    <option value="Leve">Leve</option>
                                    <option value="Moderado">Moderado</option>
                                    <option value="Grave">Grave</option>
                                    <option value="Destrucción Total">Destrucción Total</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Descripción del Evento</label>
                            <textarea
                                value={form.description}
                                onChange={e => onChange({ ...form, description: e.target.value })}
                                className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium h-24 resize-none"
                                placeholder="Describa lo ocurrido..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Costo Estimado</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={form.cost}
                                        onChange={e => onChange({ ...form, cost: parseFloat(e.target.value) })}
                                        className="w-full p-3 pl-8 bg-slate-50 border-none rounded-xl text-sm font-medium"
                                    />
                                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nro. de Siniestro</label>
                                <input
                                    type="text"
                                    value={form.incidentNumber || ''}
                                    onChange={e => onChange({ ...form, incidentNumber: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium"
                                    placeholder="Opcional"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-8">
                        <button onClick={onClose} className="flex-1 py-3 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">
                            Cancelar
                        </button>
                        <button onClick={onSubmit} className="flex-1 py-3 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-lg shadow-slate-200 active:scale-95 transition-transform">
                            {isEditing ? 'Guardar Cambios' : 'Confirmar Registro'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Furniture;
