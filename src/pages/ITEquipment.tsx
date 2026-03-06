
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
import MultiPhotoUpload from '../components/MultiPhotoUpload';
import PhotoGallery from '../components/PhotoGallery';

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
    // IT Specific
    processor: dbAsset.processor || '',
    ram: dbAsset.ram || '',
    storage: dbAsset.storage || '',
    // Common
    location: dbAsset.location || '',
    responsible: dbAsset.assigned_to || '', // Mapped from assigned_to
    ownership: dbAsset.ownership || '',
    status: dbAsset.status || 'Operativo',
    image: dbAsset.image || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&q=80', // Default IT image
    // Ensure arrays are initialized
    expirations: dbAsset.expirations || [],
    incidents: dbAsset.incidents || [],
    // Defaults
    year: dbAsset.created_at ? new Date(dbAsset.created_at).getFullYear() : new Date().getFullYear(),
    hours: 0,
    dailyRate: 0,
    value: parseFloat(dbAsset.value) || 0,
    functionalDescription: dbAsset.functional_description || '',
    complementaryDescription: dbAsset.complementary_description || '',
    photos: dbAsset.photos || [],
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
        processor: asset.processor,
        ram: asset.ram,
        storage: asset.storage,
        image: asset.image,
        status: asset.status,
        location: asset.location,
        assigned_to: asset.responsible, // Mapped to assigned_to
        description: asset.description,
        ownership: asset.ownership,
        photos: asset.photos || [],
        type: 'Equipos de Informática' // Fixed type
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
                {asset.photos && asset.photos.length > 0 && (
                    <div className="absolute top-1 right-1 bg-black/60 backdrop-blur-sm text-white text-[8px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-1">
                        <Camera size={8} /> {asset.photos.length}
                    </div>
                )}
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
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                        <Activity size={10} className="text-blue-500" />
                        {asset.processor || 'N/A'}
                    </div>
                </div>
            </div>

            <ChevronRight size={20} className="text-slate-300 group-hover:text-orange-500 transition-colors" />
        </div>
    );
});

const ITEquipment: React.FC = () => {
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
        type: 'Equipos de Informática',
        status: AssetStatus.OPERATIONAL,
        ownership: 'Propio',
        supplier: '',
        brand: '',
        model: '',
        serial: '',
        year: new Date().getFullYear(),
        location: 'Pañol Central',
        responsible: '',
        image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=400',
        dailyRate: 0,
        value: 0,
        hours: 0,
        domainNumber: '',
        accountingAccount: '',
        functionalDescription: '',
        complementaryDescription: '',
        originYear: new Date().getFullYear(),
        usefulLifeRemaining: 0,
        tti: 0,
        chassisNumber: '',
        engineNumber: '',
        insuranceProvider: '',
        incidents: [],
        photos: []
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
            const { data: assetsData, error: assetsError } = await supabase
                .from('it_equipment')
                .select('*')
                .order('created_at', { ascending: false });

            if (assetsError) throw assetsError;

            const today = new Date().toISOString().split('T')[0];
            const { data: allocationsData, error: allocationsError } = await supabase
                .from('asset_allocations')
                .select('*, projects(name)')
                .lte('start_date', today)
                .gte('end_date', today)
                .eq('status', 'Activo');

            if (assetsData) {
                const mappedAssets = assetsData.map(dbAsset => {
                    const baseAsset = mapAssetFromDB(dbAsset);
                    const allocation = allocationsData?.find(a => a.asset_id === baseAsset.id);

                    if (allocation) {
                        return {
                            ...baseAsset,
                            location: allocation.projects?.name || baseAsset.location
                        };
                    }
                    return baseAsset;
                });
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
            if (data) setDbProjects(data.map(mapProjectFromDB));
        } catch (err) {
            console.error('Error fetching projects:', err);
        }
    };

    const fetchStaff = async () => {
        try {
            const { data, error } = await supabase.from('staff').select('*');
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

        if (selectedAsset && hasIdChanged) {
            const fetchAllocation = async () => {
                const { data } = await supabase
                    .from('asset_allocations')
                    .select('*, projects(name)')
                    .eq('asset_id', selectedAsset.id)
                    .eq('status', 'Programado')
                    .order('start_date', { ascending: true })
                    .limit(1)
                    .single();

                if (data) setCurrentAllocation(data);
                else setCurrentAllocation(null);
            };

            const fetchDocuments = async () => {
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

            const fetchWorkOrders = async () => {
                const { data } = await supabase
                    .from('work_orders')
                    .select('*')
                    .eq('asset_id', selectedAsset.id)
                    .order('created_at', { ascending: false });
                if (data) setAssetWorkOrders(data.map(mapWorkOrderFromDB));
            };

            const fetchChecklists = async () => {
                const { data } = await supabase
                    .from('checklists')
                    .select('*')
                    .eq('asset_id', selectedAsset.id)
                    .order('created_at', { ascending: false });
                if (data) setAssetChecklists(data);
            };

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
        if (a.type !== 'Equipos de Informática') return false;
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
        if (aBarcode === term && bBarcode !== term) return -1;
        if (bBarcode === term && aBarcode !== term) return 1;
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

    const handlePrint = () => { window.print(); };

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
            if (editFormData.ownership === 'Propio' && (!editFormData.barcodeId || editFormData.barcodeId.length !== 4)) {
                alert("El Código ID de 4 dígitos es obligatorio para activos propios.");
                return;
            }
            try {
                const updatedAssetData = { ...selectedAsset, ...editFormData } as Asset;
                const dbPayload = mapAssetToDB(updatedAssetData);
                const { id, ...payload } = dbPayload as any;

                const { error } = await supabase.from('assets').update(payload).eq('id', selectedAsset.id);
                if (error) throw error;

                setAssets(prev => prev.map(a => a.id === selectedAsset.id ? updatedAssetData : a));
                setSelectedAsset(updatedAssetData);
                setIsEditingAsset(false);
                setEditFormData({});
                alert("Activo actualizado correctamente.");
            } catch (err: any) {
                console.error('Error updating asset:', err);
                alert("Error al actualizar activo: " + err.message);
            }
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
        setEditFormData({ ...editFormData, expirations: [...(editFormData.expirations || []), exp] });
        setAddExpFormForEdit({ type: 'ITV', expirationDate: '', notes: '' });
    };

    const removeExpirationFromEdit = (id: string) => {
        setEditFormData({ ...editFormData, expirations: (editFormData.expirations || []).filter(e => e.id !== id) });
    };

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

        if (isEdit) setEditFormData(prev => ({ ...prev, brand: brand, model: model, name: fullName }));
        else setNewAssetData(prev => ({ ...prev, brand: brand, model: model, name: fullName }));
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
        if (newAssetData.ownership === 'Propio' && (!newAssetData.barcodeId || newAssetData.barcodeId.length !== 4)) {
            alert("El código de 4 dígitos es obligatorio para activos propios.");
            return;
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
            const { data, error } = await supabase.from('assets').insert(dbPayload).select().single();
            if (error) throw error;

            if (data) {
                const newAsset = mapAssetFromDB(data);
                setAssets([newAsset, ...assets]);
                setIsCreating(false);
                setNewAssetData({
                    name: '', internalId: '', barcodeId: '', type: 'Equipos de Informática', status: AssetStatus.OPERATIONAL,
                    ownership: 'Propio', brand: '', model: '', serial: '', location: 'Pañol Central',
                    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&q=80',
                    responsible: '', processor: '', ram: '', storage: '', description: '', photos: []
                });
                setNewExpirations([]);
                alert("Activo creado exitosamente.");
            }
        } catch (err: any) {
            console.error('Error creating asset:', err);
            alert("Error al crear activo: " + err.message);
        }
    };

    const handleAddIncident = async () => {
        if (!newIncidentForm.description || !newIncidentForm.date || !selectedAsset) return;
        try {
            let updatedIncidents = [...(selectedAsset.incidents || [])];
            if (isEditingIncident && editingIncidentId) {
                updatedIncidents = updatedIncidents.map(inc => inc.id === editingIncidentId ? { ...inc, ...newIncidentForm } as AssetIncident : inc);
            } else {
                const incident: AssetIncident = {
                    id: Math.random().toString(36).substr(2, 9),
                    assetId: selectedAsset.id,
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
            const { error } = await supabase.from('assets').update({ incidents: updatedIncidents }).eq('id', selectedAsset.id);
            if (error) throw error;

            const updatedAsset = { ...selectedAsset, incidents: updatedIncidents };
            setAssets(prev => prev.map(a => a.id === selectedAsset.id ? updatedAsset : a));
            setSelectedAsset(updatedAsset);
            setIsIncidentModalOpen(false);
            setIsEditingIncident(false);
            setNewIncidentForm({ date: new Date().toISOString().split('T')[0], description: '', damageLevel: 'Leve', cost: 0, status: 'Reportado', incidentNumber: '', reportUrl: '' });
            alert("Siniestro registrado correctamente.");
        } catch (err: any) {
            alert("Error al guardar el siniestro: " + err.message);
        }
    };

    const handleDeleteIncident = async (incidentId: string) => {
        if (!selectedAsset || !window.confirm("¿Eliminar este siniestro?")) return;
        try {
            const updatedIncidents = (selectedAsset.incidents || []).filter(inc => inc.id !== incidentId);
            const { error } = await supabase.from('assets').update({ incidents: updatedIncidents }).eq('id', selectedAsset.id);
            if (error) throw error;
            const updatedAsset = { ...selectedAsset, incidents: updatedIncidents };
            setAssets(prev => prev.map(a => a.id === selectedAsset.id ? updatedAsset : a));
            setSelectedAsset(updatedAsset);
            alert("Siniestro eliminado.");
        } catch (err: any) {
            alert("Error: " + err.message);
        }
    };

    const handleIncidentReportUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => { if (ev.target?.result) setNewIncidentForm(prev => ({ ...prev, reportUrl: ev.target?.result as string })); };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    if (isCreating) {
        return (
            <div className="bg-[#F8F9FA] min-h-screen pb-24 font-sans border-0">
                <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex items-center justify-between">
                    <button onClick={() => setIsCreating(false)} className="text-slate-600 p-2"><ChevronLeft size={24} /></button>
                    <h1 className="font-bold text-lg text-slate-800 tracking-tight">Nuevo Equipo de Informática</h1>
                    <button onClick={handleSaveNewAsset} className="text-orange-500 font-bold text-sm bg-orange-50 px-3 py-1.5 rounded-full">Guardar</button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="relative h-56 rounded-[2.5rem] overflow-hidden bg-slate-200 group shadow-inner">
                        <img src={newAssetData.image} alt="Preview" className="w-full h-full object-cover opacity-90" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors">
                            <button onClick={() => fileInputRef.current?.click()} className="bg-white/90 backdrop-blur-sm p-4 rounded-full shadow-lg text-slate-600 hover:text-orange-500 transition-colors"><Camera size={28} /></button>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2"><Tag size={16} className="text-orange-500" /> Identificación</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Propiedad</label>
                                <select value={newAssetData.ownership} onChange={(e) => setNewAssetData({ ...newAssetData, ownership: e.target.value as any })} className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold appearance-none">
                                    <option value="Propio">Propio</option>
                                    <option value="Alquilado">Alquilado</option>
                                    <option value="Leasing">Leasing</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">ID Interno</label>
                                <input type="text" value={newAssetData.internalId} onChange={(e) => setNewAssetData({ ...newAssetData, internalId: e.target.value })} placeholder="EQ-001" className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-black uppercase" />
                            </div>
                        </div>
                        {newAssetData.ownership === 'Propio' && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Código de Barras (4)</label>
                                <input type="text" maxLength={4} value={newAssetData.barcodeId} onChange={(e) => setNewAssetData({ ...newAssetData, barcodeId: e.target.value.replace(/\D/g, '') })} placeholder="0000" className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-mono font-bold text-orange-600 text-center tracking-widest" />
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <input type="text" value={newAssetData.brand} onChange={(e) => updateGeneratedName(false, e.target.value, undefined)} className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm" placeholder="Marca" />
                            <input type="text" value={newAssetData.model} onChange={(e) => updateGeneratedName(false, undefined, e.target.value)} className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm" placeholder="Modelo" />
                        </div>
                        <input type="text" value={newAssetData.name} onChange={(e) => setNewAssetData({ ...newAssetData, name: e.target.value })} placeholder="Nombre Completo" className="w-full p-4 bg-slate-100 border-none rounded-2xl text-sm font-bold text-slate-500" />
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2"><Bot size={16} className="text-orange-500" /> Especificaciones IT</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <input type="text" value={newAssetData.processor} onChange={(e) => setNewAssetData({ ...newAssetData, processor: e.target.value })} placeholder="Procesador" className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm" />
                            <input type="text" value={newAssetData.ram} onChange={(e) => setNewAssetData({ ...newAssetData, ram: e.target.value })} placeholder="RAM" className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm" />
                            <input type="text" value={newAssetData.storage} onChange={(e) => setNewAssetData({ ...newAssetData, storage: e.target.value })} placeholder="Almacenamiento" className="col-span-2 w-full p-4 bg-slate-50 border-none rounded-2xl text-sm" />
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2"><Camera size={16} className="text-orange-500" /> Fotos del Activo</h3>
                        <MultiPhotoUpload photos={newAssetData.photos || []} onChange={(photos) => setNewAssetData({ ...newAssetData, photos })} />
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2"><Calendar size={16} className="text-orange-500" /> Vencimientos</h3>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <select value={newExpForm.type} onChange={(e) => setNewExpForm({ ...newExpForm, type: e.target.value as any })} className="p-3 bg-slate-50 border-none rounded-xl text-xs font-bold">
                                    <option value="ITV">ITV</option>
                                    <option value="Seguro">Seguro</option>
                                    <option value="Certificación">Certificación</option>
                                </select>
                                <input type="date" value={newExpForm.expirationDate} onChange={(e) => setNewExpForm({ ...newExpForm, expirationDate: e.target.value })} className="p-3 bg-slate-50 border-none rounded-xl text-xs font-bold" />
                            </div>
                            <button onClick={addExpiration} disabled={!newExpForm.expirationDate} className="w-full py-2 bg-slate-800 text-white rounded-xl text-[10px] font-bold">Agregar Vencimiento</button>
                        </div>
                        {newExpirations.map(exp => (
                            <div key={exp.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                                <span className="text-xs font-bold">{exp.type} - {exp.expirationDate}</span>
                                <button onClick={() => removeExpiration(exp.id)} className="text-red-500"><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (selectedAsset) {
        const isRented = selectedAsset.ownership === 'Alquilado';
        return (
            <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans border-0">
                <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex items-center justify-between">
                    <button onClick={() => setSelectedAsset(null)} className="text-slate-600 p-2"><ChevronLeft size={24} /></button>
                    <h1 className="font-bold text-lg text-slate-800">{isEditingAsset ? 'Editar Activo' : 'Detalle de Activo'}</h1>
                    <div className="flex gap-2">
                        {isEditingAsset ? (
                            <>
                                <button onClick={cancelEditing} className="text-slate-400 font-bold text-sm px-2">Cancelar</button>
                                <button onClick={saveAssetChanges} className="text-orange-500 font-bold text-sm bg-orange-50 px-3 py-1.5 rounded-full">Guardar</button>
                            </>
                        ) : (
                            <>
                                {canEdit && <button onClick={startEditing} className="p-2 bg-slate-100 rounded-full text-slate-600 hover:text-orange-500"><Edit3 size={20} /></button>}
                                <button onClick={handlePrint} className="p-2 bg-slate-100 rounded-full text-slate-600"><Printer size={20} /></button>
                            </>
                        )}
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {isEditingAsset ? (
                        <div className="space-y-6">
                            <div className="relative h-48 rounded-[2.5rem] overflow-hidden bg-slate-200">
                                <img src={editFormData.image} alt="Preview" className="w-full h-full object-cover" />
                                <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 m-auto w-12 h-12 bg-white/90 rounded-full flex items-center justify-center text-slate-600"><Camera size={24} /></button>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </div>

                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" value={editFormData.brand} onChange={e => updateGeneratedName(true, e.target.value, undefined)} placeholder="Marca" className="p-3 bg-slate-50 rounded-xl text-sm" />
                                    <input type="text" value={editFormData.model} onChange={e => updateGeneratedName(true, undefined, e.target.value)} placeholder="Modelo" className="p-3 bg-slate-50 rounded-xl text-sm" />
                                </div>
                                <input type="text" value={editFormData.name} onChange={e => setEditFormData({ ...editFormData, name: e.target.value })} placeholder="Nombre Completo" className="w-full p-3 bg-slate-100 rounded-xl text-sm font-bold text-slate-500" />
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" value={editFormData.internalId} disabled={!isSuperAdmin} className="p-3 bg-slate-50 rounded-xl text-sm uppercase opacity-70" />
                                    <select value={editFormData.status} onChange={e => setEditFormData({ ...editFormData, status: e.target.value as any })} className="p-3 bg-slate-50 rounded-xl text-sm">
                                        {Object.values(AssetStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <textarea value={editFormData.functionalDescription} onChange={e => setEditFormData({ ...editFormData, functionalDescription: e.target.value })} placeholder="Descripción" className="w-full p-3 bg-slate-50 rounded-xl text-sm min-h-[80px]" />
                            </div>

                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2"><Camera size={16} className="text-orange-500" /> Fotos IT</h3>
                                <MultiPhotoUpload photos={editFormData.photos || []} onChange={(photos) => setEditFormData({ ...editFormData, photos })} />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500 rounded-full blur-[60px] opacity-20 -mr-10 -mt-10"></div>
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/80 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-md">{selectedAsset.internalId}</span>
                                        <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider ${selectedAsset.status === AssetStatus.OPERATIONAL ? 'bg-green-500/20 text-green-300' : 'bg-orange-500/20 text-orange-300'}`}>{selectedAsset.status}</span>
                                    </div>
                                    <div className="flex gap-5 items-center">
                                        <div className="w-20 h-20 rounded-2xl bg-white/10 overflow-hidden shrink-0 border border-white/10 shadow-lg">
                                            <img src={selectedAsset.image} className="w-full h-full object-cover" alt="Imagen" />
                                        </div>
                                        <div className="flex-1">
                                            <h2 className="text-xl font-bold leading-tight mb-1">{selectedAsset.name}</h2>
                                            <div className="flex items-center gap-1 text-xs text-white/60 font-medium">
                                                <MapPin size={12} className="text-orange-500" /> {selectedAsset.location}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 mt-6">
                                        <div className="bg-white/5 p-3 rounded-xl backdrop-blur-sm border border-white/5 text-center">
                                            <span className="block text-[9px] font-bold text-white/40 uppercase mb-1">Año Origen</span>
                                            <span className="text-sm font-bold">{selectedAsset.originYear}</span>
                                        </div>
                                        <div className="bg-white/5 p-3 rounded-xl backdrop-blur-sm border border-white/5 text-center">
                                            <span className="block text-[9px] font-bold text-white/40 uppercase mb-1">Propiedad</span>
                                            <span className="text-sm font-bold">{isRented ? 'Rented' : 'Propio'}</span>
                                        </div>
                                        <div className="bg-white/5 p-3 rounded-xl backdrop-blur-sm border border-white/5 text-center">
                                            <span className="block text-[9px] font-bold text-white/40 uppercase mb-1">RAM</span>
                                            <span className="text-sm font-bold">{selectedAsset.ram || '8GB'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2"><ScanLine size={16} className="text-orange-500" /> Especificaciones</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between"><span className="text-[10px] font-bold text-slate-400">Procesador</span><span className="text-xs font-bold">{selectedAsset.processor || '-'}</span></div>
                                        <div className="flex justify-between"><span className="text-[10px] font-bold text-slate-400">RAM</span><span className="text-xs font-bold">{selectedAsset.ram || '-'}</span></div>
                                        <div className="flex justify-between"><span className="text-[10px] font-bold text-slate-400">Serie</span><span className="text-xs font-bold uppercase">{selectedAsset.serial}</span></div>
                                    </div>
                                </div>

                                {selectedAsset.photos && selectedAsset.photos.length > 0 && (
                                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4 md:col-span-2">
                                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2"><Camera size={16} className="text-orange-500" /> Galería de Fotos</h3>
                                        <PhotoGallery photos={selectedAsset.photos} />
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-6 bg-[#F8F9FA] min-h-screen pb-24 border-0">
            <div className="flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm sticky top-2 z-10 border border-slate-50">
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate('/assets')} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400"><ChevronLeft size={24} /></button>
                    <h1 className="text-xl font-bold text-slate-800 pl-2">Informática</h1>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setIsImportModalOpen(true)} className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 shadow-sm"><Package size={24} /></button>
                    <button onClick={() => {
                        setNewAssetData({ name: '', internalId: '', barcodeId: '', type: 'Equipos de Informática', status: AssetStatus.OPERATIONAL, ownership: 'Propio', brand: '', model: '', serial: '', location: 'Pañol Central', image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&q=80', responsible: '', photos: [] });
                        setNewExpirations([]);
                        setIsCreating(true);
                    }} className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg"><Plus size={24} /></button>
                </div>
            </div>

            <div className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                    <input type="text" placeholder="Buscar equipo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 shadow-sm text-sm font-medium" />
                </div>
                <div className="flex bg-slate-200 p-1 rounded-xl">
                    <button onClick={() => setAssetTab('all')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${assetTab === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Todos</button>
                    <button onClick={() => setAssetTab('owned')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${assetTab === 'owned' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Propio</button>
                    <button onClick={() => setAssetTab('rented')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${assetTab === 'rented' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Alquilado</button>
                </div>
            </div>

            <div className="space-y-4">
                {filteredAssets.map(asset => (
                    <AssetListItem key={asset.id} asset={asset} onClick={setSelectedAsset} getStatusColor={getStatusColor} />
                ))}
                {filteredAssets.length === 0 && (
                    <div className="text-center py-12">
                        <Bot size={48} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-400 font-medium">No se encontraron activos</p>
                    </div>
                )}
            </div>

            <AssetImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onSuccess={fetchAssets} initialAssetType="Equipos de Informática" forceAssetType={true} />
        </div>
    );
};

export default ITEquipment;
