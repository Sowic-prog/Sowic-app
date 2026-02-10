
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
    image: dbAsset.image || 'https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&q=80&w=400', // Default Furniture image
    // Ensure arrays are initialized (even if not used)
    expirations: dbAsset.expirations || [],
    incidents: dbAsset.incidents || [],
    // Defaults for missing fields avoids TS errors
    year: dbAsset.created_at ? new Date(dbAsset.created_at).getFullYear() : new Date().getFullYear(),
    hours: 0,
    dailyRate: 0,
    value: parseFloat(dbAsset.value) || 0,
    functionalDescription: dbAsset.functional_description || '',
    complementaryDescription: dbAsset.complementary_description || '',
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
        ownership: asset.ownership,
        type: 'Mobiliario', // Fixed type
        functional_description: asset.functionalDescription
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
                .from('mobiliario')
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
                .from('mobiliario')
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
                <div className="print-header">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold">SW</div>
                        <div>
                            <h1 className="font-bold text-lg text-slate-800 uppercase">Ficha Técnica: Mobiliario</h1>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">SOWIC Asset Management</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-slate-400 uppercase">Actualizado al</p>
                        <p className="font-bold text-slate-800">{new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex items-center justify-between no-print">
                    <button onClick={() => setSelectedAsset(null)} className="text-slate-600 p-2" aria-label="Volver"><ChevronLeft size={24} /></button>
                    <h1 className="font-bold text-lg text-slate-800 tracking-tight">
                        {isEditingAsset ? 'Editar Mobiliario' : 'Detalle'}
                    </h1>
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

                <div className="p-6 space-y-6">
                    {/* Header Asset Info / Edit Form */}
                    {isEditingAsset ? (
                        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-4">
                            {/* Image Edit */}
                            <div className="flex justify-center mb-6">
                                <div className="relative w-32 h-32 rounded-3xl overflow-hidden bg-slate-100 group">
                                    <img src={editFormData.image} alt="Asset" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                        <Camera className="text-white" size={24} />
                                    </div>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nombre</label>
                                <input
                                    type="text"
                                    value={editFormData.name}
                                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border-none rounded-xl text-lg font-bold text-slate-800"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">ID Interno</label>
                                    <input
                                        type="text"
                                        value={editFormData.internalId}
                                        onChange={e => setEditFormData({ ...editFormData, internalId: e.target.value })}
                                        className={`w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-800 uppercase ${!isSuperAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        disabled={!isSuperAdmin}
                                        aria-label="ID Interno"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Estado</label>
                                    <select
                                        value={editFormData.status}
                                        onChange={e => setEditFormData({ ...editFormData, status: e.target.value as any })}
                                        className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium"
                                        aria-label="Estado"
                                    >
                                        {Object.values(AssetStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Propiedad</label>
                                    <select
                                        value={editFormData.ownership}
                                        onChange={e => setEditFormData({ ...editFormData, ownership: e.target.value as any })}
                                        className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium"
                                        disabled={!isSuperAdmin}
                                        aria-label="Propiedad"
                                    >
                                        <option value="Propio">Propio</option>
                                        <option value="Alquilado">Alquilado</option>
                                        <option value="Leasing">Leasing</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Código de Barras</label>
                                    <input
                                        type="text"
                                        value={editFormData.barcodeId}
                                        onChange={e => setEditFormData({ ...editFormData, barcodeId: e.target.value })}
                                        className={`w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium ${!isSuperAdmin ? 'opacity-50' : ''}`}
                                        disabled={!isSuperAdmin}
                                        aria-label="Código de Barras"
                                    />
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Ubicación</label>
                                    <input
                                        type="text"
                                        value={editFormData.location}
                                        onChange={e => setEditFormData({ ...editFormData, location: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium"
                                    />
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Responsable</label>
                                    <select
                                        value={editFormData.responsible}
                                        onChange={e => setEditFormData({ ...editFormData, responsible: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium"
                                    >
                                        <option value="">Seleccionar Responsable</option>
                                        {dbStaff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Descripción</label>
                                    <textarea
                                        value={editFormData.description}
                                        onChange={e => setEditFormData({ ...editFormData, description: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium h-24"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500 rounded-full blur-[60px] opacity-20 -mr-10 -mt-10 pointer-events-none"></div>

                            <div className="relative z-10">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-800/50 px-2 py-1 rounded mb-3 inline-block backdrop-blur-sm">
                                    {selectedAsset.internalId}
                                </span>
                                <h2 className="text-3xl font-black mb-1 leading-tight">{selectedAsset.name}</h2>
                            </div>

                            <div className="mt-6 flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
                                        <MapPin className="text-orange-500" size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Ubicación</p>
                                        <p className="text-sm font-bold text-slate-200">{selectedAsset.location}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${selectedAsset.status === AssetStatus.OPERATIONAL ? 'bg-green-500/20 border-green-500/30 text-green-400' :
                                        selectedAsset.status === AssetStatus.IN_MAINTENANCE ? 'bg-orange-500/20 border-orange-500/30 text-orange-400' :
                                            'bg-red-500/20 border-red-500/30 text-red-400'
                                        }`}>
                                        <div className={`w-2 h-2 rounded-full ${selectedAsset.status === AssetStatus.OPERATIONAL ? 'bg-green-500' : 'bg-red-500'
                                            }`}></div>
                                        <span className="text-xs font-bold uppercase">{selectedAsset.status}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
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

export default Furniture;
