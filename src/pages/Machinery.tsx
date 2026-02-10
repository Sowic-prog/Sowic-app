import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Search, Plus, Filter, MoreVertical, MapPin, Calendar,
    FileText, AlertTriangle, ShieldCheck, Banknote, History,
    ChevronLeft, ChevronRight, X, Save, Trash2, Edit3,
    Tractor, Ruler, Wrench, Fuel, Truck,
    CheckCircle2, AlertCircle, Clock, FileCheck,
    CloudRain, DollarSign, Percent, Download, Upload,
    Image as ImageIcon, Printer, Share2, MoreHorizontal,
    ArrowUpRight, ArrowDownLeft, Zap, Battery, Gauge,
    Thermometer, Settings, ShieldAlert, FileType,
    Briefcase, UserCircle2, Building2, Coins, ScanLine, QrCode, ClipboardList, ClipboardCheck, CalendarClock, Paperclip, Camera, Bot,
    ChevronUp, ChevronDown, Package,
} from 'lucide-react';
import AssetImportModal from '../components/AssetImportModal';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { Asset, AssetStatus, AssetOwnership, Project } from '../types';
import { getNextInternalId } from '../utils/assetUtils';

/* --- Helper Functions & Components --- */

// Helper to convert DB field names (snake_case) to Frontend names (camelCase)
const mapAssetFromDB = (dbAsset: any): Asset => {
    return {
        ...dbAsset,
        internalId: dbAsset.internal_id || '',
        barcodeId: dbAsset.barcode_id || '',
        serial: dbAsset.serial || '',
        year: dbAsset.year || new Date().getFullYear(),
        acquisitionDate: dbAsset.acquisition_date || '', // Note: acquisition_date not found in schema, might need check
        location: dbAsset.location || '',
        status: dbAsset.status || AssetStatus.OPERATIONAL,
        image: dbAsset.image || 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=400',
        brand: dbAsset.brand || '',
        model: dbAsset.model || '',
        engineNumber: dbAsset.engine_number || '', // Fixed mapping
        // Additional explicit mappings/defaults to be safe
        name: dbAsset.name || '',
        description: dbAsset.description || '',
        functionalDescription: dbAsset.functional_description || '',
        complementaryDescription: dbAsset.complementary_description || '',
        type: 'Maquinaria',
        ownership: dbAsset.ownership || 'Propio',
        supplier: dbAsset.supplier || '',
        responsible: dbAsset.responsible || '',
        accountingAccount: dbAsset.accounting_account || '',
        usefulLifeRemaining: dbAsset.useful_life_remaining || 0,
        hours: dbAsset.hours || 0,
        value: dbAsset.value || 0,
        tti: dbAsset.tti || 0,
        dailyRate: dbAsset.daily_rate || 0,
        domainNumber: dbAsset.domain_number || '',
        chassisNumber: dbAsset.chassis_number || '',
        insuranceProvider: dbAsset.insurance_provider || '',
        expirations: dbAsset.expirations || [],
        incidents: dbAsset.incidents || [],
        documents: dbAsset.documents || [],
    };
};

// Helper to prepare asset for DB insertion/update
const prepareAssetForDB = (asset: Partial<Asset>) => {
    return {
        internal_id: asset.internalId,
        barcode_id: asset.barcodeId,
        serial: asset.serial,
        year: asset.year,
        origin_year: asset.originYear,
        brand: asset.brand,
        model: asset.model,
        type: asset.type,
        status: asset.status,
        name: asset.name,
        description: asset.description,
        location: asset.location,
        image: asset.image,
        ownership: asset.ownership,
        // rentalContract: asset.rentalContract, // Removed as not in Asset type
        supplier: asset.supplier,
        accounting_account: asset.accountingAccount,
        functional_description: asset.functionalDescription,
        complementary_description: asset.complementaryDescription,
        useful_life_remaining: asset.usefulLifeRemaining,
        value: asset.value,
        tti: asset.tti,
        daily_rate: asset.dailyRate,
        hours: asset.hours,
        domain_number: asset.domainNumber,
        insurance_provider: asset.insuranceProvider,
        chassis_number: asset.chassisNumber,
        engine_number: asset.engineNumber,
        expirations: asset.expirations || [],
        incidents: asset.incidents || []
    };
};

const BarcodeView = ({ id }: { id?: string }) => {
    if (!id) return null;
    return (
        <div className="flex flex-col items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
            <div className="h-8 flex items-center gap-1">
                {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className={`h-full w-[2px] ${Math.random() > 0.5 ? 'bg-slate-800' : 'bg-transparent'}`}></div>
                ))}
            </div>
            <span className="text-[9px] font-mono mt-1 text-slate-500 tracking-widest">{id}</span>
        </div>
    );
};

const AssetListItem = ({ asset, onClick, getStatusColor }: { asset: Asset, onClick: (a: Asset) => void, getStatusColor: (s: string) => string }) => {
    return (
        <div onClick={() => onClick(asset)} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer group">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden relative shrink-0">
                <img src={asset.image} alt={asset.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Tractor size={20} className="text-white drop-shadow-md" />
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-slate-800 text-sm truncate pr-2">{asset.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${getStatusColor(asset.status)} whitespace-nowrap`}>
                        {asset.status}
                    </span>
                </div>
                <p className="text-xs text-slate-500 truncate mb-2">{asset.brand} {asset.model} • {asset.internalId}</p>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-slate-400">
                        <MapPin size={12} />
                        <span className="text-[10px] truncate max-w-[80px]">{asset.location}</span>
                    </div>
                </div>
            </div>
            <ChevronRight size={18} className="text-slate-300" />
        </div>
    );
};

const Machinery = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const isSuperAdmin = user?.auth?.role === 'SuperAdmin' || user?.auth?.role === 'Admin';

    // State
    const [assets, setAssets] = useState<Asset[]>([]);
    const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [assetTab, setAssetTab] = useState<'all' | 'owned' | 'rented' | 'leasing'>('all');
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

    // Editing / Creation State
    const [isCreating, setIsCreating] = useState(false);
    const [isEditingAsset, setIsEditingAsset] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [newAssetData, setNewAssetData] = useState<Partial<Asset>>({
        name: '', internalId: '', barcodeId: '', type: 'Maquinaria',
        status: AssetStatus.OPERATIONAL,
        ownership: 'Propio',
        supplier: '',
        brand: '',
        model: '',
        serial: '',
        year: new Date().getFullYear(),
        location: 'Pañol Central',
        image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=400',
        // New Fields
        dailyRate: 0,
        value: 0,
        hours: 0,
        domainNumber: '',
        responsible: '',
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

    const [editFormData, setEditFormData] = useState<Partial<Asset>>({});
    const [dbStaff, setDbStaff] = useState<any[]>([]);

    // Expirations State (Create Mode)
    const [newExpirations, setNewExpirations] = useState<{ id: string, type: string, expirationDate: string, notes: string }[]>([]);
    const [newExpForm, setNewExpForm] = useState({ type: 'ITV', expirationDate: '', notes: '' });

    // Expirations State (Edit/View Mode)
    const [isExpModalOpen, setIsExpModalOpen] = useState(false);
    const [newExp, setNewExp] = useState({ type: 'ITV', expirationDate: '', notes: '' });

    // Expirations State (Edit Mode - List)
    const [addExpFormForEdit, setAddExpFormForEdit] = useState({ type: 'ITV', expirationDate: '', notes: '' });

    // Incidents State
    const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
    const [newIncidentForm, setNewIncidentForm] = useState({
        date: new Date().toISOString().split('T')[0],
        description: '',
        cost: 0,
        damageLevel: 'Leve',
        status: 'Reportado',
        incidentNumber: '',
        reportUrl: ''
    });
    const [isEditingIncident, setIsEditingIncident] = useState(false);
    const [editingIncidentId, setEditingIncidentId] = useState<string | null>(null);

    // Expanded Sections State
    const [isPlansExpanded, setIsPlansExpanded] = useState(false);
    const [isChecklistsExpanded, setIsChecklistsExpanded] = useState(false);
    const [isWorkOrdersExpanded, setIsWorkOrdersExpanded] = useState(false);

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const incidentReportRef = useRef<HTMLInputElement>(null);
    const lastSelectedAssetId = useRef<string | null>(null);

    // Data Fetching
    useEffect(() => {
        if (isCreating) {
            const fetchNextId = async () => {
                const nextId = await getNextInternalId(newAssetData.type || 'Maquinaria');
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

    const fetchAssets = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('machinery') // Changed from 'assets'
                .select('*');

            if (error) throw error;
            const mapped = data.map(mapAssetFromDB);
            setAssets(mapped);
            setFilteredAssets(mapped);
        } catch (err) {
            console.error('Error fetching assets:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStaff = async () => {
        const { data } = await supabase.from('staff').select('*'); // Removed .eq('active', true)
        if (data) setDbStaff(data);
    };

    // Allocation State
    const [assetAllocations, setAssetAllocations] = useState<any[]>([]);
    const [currentAllocation, setCurrentAllocation] = useState<any>(null); // Active allocation for selected asset

    const fetchAllocations = async (assetId: string) => {
        const { data, error } = await supabase
            .from('asset_allocations')
            .select(`
                *,
                projects(id, name, location)
            `)
            .eq('asset_id', assetId)
            .order('start_date', { ascending: false });

        if (error) {
            console.error("Error fetching allocations", error);
        } else {
            setAssetAllocations(data);
            const active = data.find((a: any) => a.status === 'Active');
            setCurrentAllocation(active || null);
        }
    };

    // New Data Fetching (Checklists, Plans, WorkOrders)
    const [assetChecklists, setAssetChecklists] = useState<any[]>([]); // Placeholder
    const [assetPlans, setAssetPlans] = useState<any[]>([]); // Placeholder
    const [assetWorkOrders, setAssetWorkOrders] = useState<any[]>([]); // Placeholder

    useEffect(() => {
        fetchAssets();
        fetchStaff();
    }, []);

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
                    .eq('status', 'Active')
                    .limit(1)
                    .single();
                setCurrentAllocation(data || null);
            };

            const fetchDocuments = async () => {
                const { data } = await supabase
                    .from('asset_documents')
                    .select('*')
                    .eq('asset_id', selectedAsset.id)
                    .order('created_at', { ascending: false });

                if (data) {
                    const mappedDocs = data.map((d: any) => ({
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

            const fetchWorkOrders = async () => {
                const { data } = await supabase.from('work_orders').select('*').eq('asset_id', selectedAsset.id).order('created_at', { ascending: false });
                if (data) setAssetWorkOrders(data); // Simple mapping for now
            };

            const fetchChecklists = async () => {
                const { data } = await supabase.from('checklists').select('*').eq('asset_id', selectedAsset.id).order('created_at', { ascending: false });
                if (data) setAssetChecklists(data);
            };

            const fetchPlans = async () => {
                const { data } = await supabase.from('maintenance_plans').select('*, maintenance_events(*)').eq('asset_id', selectedAsset.id).order('created_at', { ascending: false });
                if (data) setAssetPlans(data);
            };

            fetchAllocation();
            fetchDocuments();
            fetchWorkOrders();
            fetchChecklists();
            fetchPlans();
        }
    }, [selectedAsset]);

    useEffect(() => {
        let res = assets;

        // Search
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            res = res.filter(a =>
                a.name.toLowerCase().includes(lower) ||
                a.internalId.toLowerCase().includes(lower) ||
                a.brand?.toLowerCase().includes(lower) ||
                a.model?.toLowerCase().includes(lower)
            );
        }

        // Tab Filter
        if (assetTab === 'owned') res = res.filter(a => a.ownership === 'Propio');
        if (assetTab === 'rented') res = res.filter(a => a.ownership === 'Alquilado');
        if (assetTab === 'leasing') res = res.filter(a => a.ownership === 'Leasing');

        setFilteredAssets(res);
    }, [searchTerm, assetTab, assets]);

    // Handlers
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            // For create mode
            if (isCreating) {
                setNewAssetData(prev => ({ ...prev, image: reader.result as string }));
            }
            // For edit mode
            if (isEditingAsset) {
                setEditFormData(prev => ({ ...prev, image: reader.result as string }));
            }
        };
        reader.readAsDataURL(file);
    };

    const handleIncidentReportUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            setNewIncidentForm(prev => ({ ...prev, reportUrl: reader.result as string }));
        };
        reader.readAsDataURL(file);
    };

    const updateGeneratedName = (isEdit: boolean, brand?: string, model?: string) => {
        if (isEdit) {
            const b = brand !== undefined ? brand : editFormData.brand;
            const m = model !== undefined ? model : editFormData.model;
            setEditFormData(prev => ({ ...prev, brand: b, model: m, name: `${b || ''} ${m || ''}`.trim() }));
        } else {
            const b = brand !== undefined ? brand : newAssetData.brand;
            const m = model !== undefined ? model : newAssetData.model;
            setNewAssetData(prev => ({ ...prev, brand: b, model: m, name: `${b || ''} ${m || ''}`.trim() }));
        }
    };

    const addExpiration = () => {
        if (!newExpForm.expirationDate) return;
        setNewExpirations([...newExpirations, { id: Math.random().toString(), ...newExpForm }]);
        setNewExpForm({ type: 'ITV', expirationDate: '', notes: '' });
    };

    const removeExpiration = (id: string) => {
        setNewExpirations(newExpirations.filter(e => e.id !== id));
    };

    const handleCreateAsset = async () => {
        if (!newAssetData.name || !newAssetData.internalId) {
            alert("Nombre e ID Interno son obligatorios");
            return;
        }

        try {
            // Prepare data with expirations in JSONB
            const assetWithExps = {
                ...newAssetData,
                expirations: newExpirations as any[]
            };
            const toInsert = prepareAssetForDB(assetWithExps);
            const { data: assetData, error: assetError } = await supabase.from('assets').insert(toInsert).select().single();

            if (assetError) throw assetError;

            // Insert location allocation if present
            if (newAssetData.location?.includes('Obra') || newAssetData.location !== 'Pañol Central') {
                // Logic to alloc to project would go here
            }

            alert("Activo creado exitosamente");
            setIsCreating(false);
            fetchAssets();
        } catch (err: any) {
            console.error(err);
            alert("Error al crear activo: " + err.message);
        }
    };

    const startEditing = () => {
        if (!selectedAsset) return;
        setEditFormData({ ...selectedAsset });
        setIsEditingAsset(true);
    };

    const cancelEditing = () => {
        setIsEditingAsset(false);
        setEditFormData({});
    };

    const saveAssetChanges = async () => {
        if (!selectedAsset || !editFormData.id) return;
        try {
            const toUpdate = prepareAssetForDB(editFormData);
            const { error } = await supabase.from('assets').update(toUpdate).eq('id', selectedAsset.id);
            if (error) throw error;

            alert("Activo actualizado");
            setIsEditingAsset(false);
            fetchAssets();

            // Refresh selected asset
            const { data } = await supabase.from('assets').select('*').eq('id', selectedAsset.id).single();
            if (data) setSelectedAsset(mapAssetFromDB(data));

        } catch (err: any) {
            console.error(err);
            alert("Error al actualizar: " + err.message);
        }
    };

    // Incident Management
    const handleAddIncident = async () => {
        if (!selectedAsset) return;

        try {
            const payload = {
                asset_id: selectedAsset.id,
                date: newIncidentForm.date,
                description: newIncidentForm.description,
                cost: newIncidentForm.cost,
                damage_level: newIncidentForm.damageLevel,
                status: newIncidentForm.status,
                incident_number: newIncidentForm.incidentNumber,
                report_url: newIncidentForm.reportUrl,
                type: 'Siniestro'
            };

            if (isEditingIncident && editingIncidentId) {
                const { error } = await supabase.from('asset_incidents').update(payload).eq('id', editingIncidentId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('asset_incidents').insert(payload);
                if (error) throw error;
            }

            // Refresh
            const { data } = await supabase.from('assets').select('*, asset_incidents(*), asset_expirations(*)').eq('id', selectedAsset.id).single();
            if (data) setSelectedAsset(mapAssetFromDB(data));

            setIsIncidentModalOpen(false);
            setNewIncidentForm({ date: new Date().toISOString().split('T')[0], description: '', cost: 0, damageLevel: 'Leve', status: 'Reportado', incidentNumber: '', reportUrl: '' });
            setIsEditingIncident(false);
            setEditingIncidentId(null);

        } catch (err: any) {
            console.error(err);
            alert("Error al guardar siniestro: " + err.message);
        }
    };

    const handleEditIncident = (incident: any) => {
        setNewIncidentForm({
            date: incident.date,
            description: incident.description,
            cost: incident.cost,
            damageLevel: incident.damageLevel,
            status: incident.status,
            incidentNumber: incident.incidentNumber || '',
            reportUrl: incident.reportUrl || ''
        });
        setEditingIncidentId(incident.id);
        setIsEditingIncident(true);
        setIsIncidentModalOpen(true);
    };

    const handleDeleteIncident = async (id: string) => {
        if (!confirm("¿Eliminar este registro de siniestro?")) return;
        const { error } = await supabase.from('asset_incidents').delete().eq('id', id);
        if (!error && selectedAsset) {
            const { data } = await supabase.from('assets').select('*, asset_incidents(*), asset_expirations(*)').eq('id', selectedAsset.id).single();
            if (data) setSelectedAsset(mapAssetFromDB(data));
        }
    };

    // Expiration Management for Selected Asset
    const handleAddExpiration = async () => {
        if (!selectedAsset || !newExp.expirationDate) return;
        try {
            const { error } = await supabase.from('asset_expirations').insert({
                asset_id: selectedAsset.id,
                type: newExp.type,
                expiration_date: newExp.expirationDate,
                notes: newExp.notes
            });
            if (error) throw error;

            // Refresh
            const { data } = await supabase.from('assets').select('*, asset_incidents(*), asset_expirations(*)').eq('id', selectedAsset.id).single();
            if (data) setSelectedAsset(mapAssetFromDB(data));
            setIsExpModalOpen(false);
            setNewExp({ type: 'ITV', expirationDate: '', notes: '' });
        } catch (err: any) {
            alert(err.message);
        }
    };

    // Expiration Management for Edit Mode
    const addExpirationToEdit = () => {
        // This adds to local state only, needs backend syncing logic or separate handling
        // For simplicity assume simple adding to editFormData.expirations which will be tricky to sync.
        // Better to handle expirations separately even in edit mode or use the same modal flow.
        // In this UI implementation, the "Edit Form" has its own expiration section management.

        const newExpItem = {
            id: Math.random().toString(), // temporary ID
            type: addExpFormForEdit.type as any, // Cast to match AssetExpiration type
            expirationDate: addExpFormForEdit.expirationDate,
            notes: addExpFormForEdit.notes
        };

        setEditFormData(prev => ({
            ...prev,
            expirations: [...(prev.expirations || []), newExpItem]
        }));
        setAddExpFormForEdit({ type: 'ITV', expirationDate: '', notes: '' });
    };

    const removeExpirationFromEdit = (id: string) => {
        setEditFormData(prev => ({
            ...prev,
            expirations: prev.expirations?.filter(e => e.id !== id)
        }));
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case AssetStatus.OPERATIONAL: return 'bg-green-100 text-green-700';
            case AssetStatus.IN_MAINTENANCE: return 'bg-orange-100 text-orange-700';
            case AssetStatus.RETURNED: return 'bg-slate-200 text-slate-600';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    const getOTStatusColor = (status: string) => {
        switch (status) {
            case 'Completada': return 'bg-green-100 text-green-700 border-green-200';
            case 'En Progreso': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Pendiente': return 'bg-orange-100 text-orange-700 border-orange-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleCreatePlan = () => {
        navigate('/maintenance/plans', { state: { createForAsset: selectedAsset?.id } });
    };

    const canEdit = isSuperAdmin;

    // --- CREATE VIEW ---
    if (isCreating) {
        return (
            <div className="bg-slate-50 min-h-screen p-6 font-sans flex justify-center pb-20">
                <div className="max-w-4xl w-full space-y-6">
                    <div className="flex items-center gap-4 mb-6">
                        <button onClick={() => setIsCreating(false)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 shadow-sm border border-slate-100">
                            <ChevronLeft size={24} />
                        </button>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Nuevo Activo</h1>
                    </div>

                    <div className="flex justify-between items-center bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 sticky top-4 z-20">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-4">Alta de Equipo</span>
                        <div className="flex gap-2">
                            <button onClick={() => setIsCreating(false)} className="px-6 py-3 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50">Cancelar</button>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsImportModalOpen(true)}
                                    className="bg-white text-slate-600 border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 hover:text-blue-600 transition-all flex items-center gap-2"
                                >
                                    <Package size={18} /> Importar
                                </button>
                                <button onClick={handleCreateAsset} className="bg-slate-900 text-white px-8 py-3 rounded-xl text-xs font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-transform active:scale-95 flex items-center gap-2">
                                    <Save size={16} /> Guardar Ficha
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Status Card */}
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-6">
                            <div className="relative h-48 rounded-[2.5rem] overflow-hidden bg-slate-200 group shadow-inner">
                                <img src={newAssetData.image} alt="Preview" className="w-full h-full object-cover opacity-90" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/30 transition-colors">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg text-slate-600 hover:text-orange-500 transition-colors"
                                    >
                                        <Camera size={24} />
                                    </button>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Marca</label>
                                    <input
                                        type="text"
                                        value={newAssetData.brand}
                                        onChange={(e) => updateGeneratedName(false, e.target.value, undefined)}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium"
                                        aria-label="Marca"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Modelo</label>
                                    <input
                                        type="text"
                                        value={newAssetData.model}
                                        onChange={(e) => updateGeneratedName(false, undefined, e.target.value)}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium"
                                        aria-label="Modelo"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nombre (Generado)</label>
                                <input
                                    type="text"
                                    value={newAssetData.name}
                                    onChange={(e) => setNewAssetData({ ...newAssetData, name: e.target.value })}
                                    placeholder="Marca + Modelo"
                                    className="w-full p-4 bg-slate-100 border-none rounded-2xl text-sm font-bold text-slate-500"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Cuenta Contable</label>
                                <input
                                    type="text"
                                    value={newAssetData.accountingAccount}
                                    onChange={(e) => setNewAssetData({ ...newAssetData, accountingAccount: e.target.value })}
                                    placeholder="Ej. 1.04.01.002"
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium text-slate-800"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tipo</label>
                                    <select
                                        value={newAssetData.type}
                                        onChange={(e) => setNewAssetData({ ...newAssetData, type: e.target.value as any })}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium appearance-none"
                                        aria-label="Tipo"
                                    >
                                        <option value="Maquinaria">Maquinaria</option>
                                        <option value="Rodados">Rodados</option>
                                        <option value="Equipos de Informática">Equipos de Informática</option>
                                        <option value="Instalaciones en infraestructuras">Instalaciones en infraestructuras</option>
                                        <option value="Otros">Otros</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Estado</label>
                                    <select
                                        value={newAssetData.status}
                                        onChange={(e) => setNewAssetData({ ...newAssetData, status: e.target.value as any })}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium appearance-none"
                                        aria-label="Estado"
                                    >
                                        {Object.values(AssetStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* ID & Details */}
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <ScanLine size={16} className="text-orange-500" /> Identificación
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">ID Interno (M-001)</label>
                                        <input
                                            type="text"
                                            value={newAssetData.internalId}
                                            onChange={(e) => setNewAssetData({ ...newAssetData, internalId: e.target.value })}
                                            className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800 uppercase"
                                            placeholder="Ej: M-101"
                                            aria-label="ID Interno"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Patente / Dominio</label>
                                        <input
                                            type="text"
                                            value={newAssetData.domainNumber}
                                            onChange={(e) => setNewAssetData({ ...newAssetData, domainNumber: e.target.value })}
                                            className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800 uppercase"
                                            placeholder="AAA-123"
                                            aria-label="Patente / Dominio"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Código de Barra</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={newAssetData.barcodeId}
                                            onChange={(e) => setNewAssetData({ ...newAssetData, barcodeId: e.target.value })}
                                            className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium pl-10"
                                            placeholder="Escanee o ingrese..."
                                            aria-label="Código de Barras"
                                        />
                                        <QrCode size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Propiedad</label>
                                        <select
                                            value={newAssetData.ownership}
                                            onChange={(e) => setNewAssetData({ ...newAssetData, ownership: e.target.value as any })}
                                            className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium text-slate-800 appearance-none"
                                            aria-label="Propiedad"
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
                                            className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800"
                                            aria-label="Ubicación"
                                        />
                                    </div>
                                </div>

                                {/* Responsible Field */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Responsable Asignado</label>
                                    <div className="relative">
                                        <select
                                            value={newAssetData.responsible}
                                            onChange={(e) => setNewAssetData({ ...newAssetData, responsible: e.target.value })}
                                            className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800 appearance-none"
                                            aria-label="Responsable Asignado"
                                        >
                                            <option value="">Seleccionar del personal...</option>
                                            {dbStaff.map(staff => (
                                                <option key={staff.id} value={staff.name}>{staff.name} - {staff.role}</option>
                                            ))}
                                        </select>
                                        <UserCircle2 size={20} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                                    </div>
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
                                        placeholder="Ej. Excavadora 20T"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Descripción Complementaria</label>
                                    <textarea
                                        value={newAssetData.complementaryDescription}
                                        onChange={(e) => setNewAssetData({ ...newAssetData, complementaryDescription: e.target.value })}
                                        placeholder="Accesorios, componentes adicionales o detalles..."
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium resize-none min-h-[80px]"
                                        aria-label="Descripción Complementaria"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Technical Specs */}
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

                        {/* New Fields: Chassis & Engine */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nro. Chasis</label>
                                <input
                                    type="text"
                                    value={newAssetData.chassisNumber}
                                    onChange={(e) => setNewAssetData({ ...newAssetData, chassisNumber: e.target.value })}
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium uppercase"
                                    aria-label="Nro. Chasis"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nro. Motor</label>
                                <input
                                    type="text"
                                    value={newAssetData.engineNumber}
                                    onChange={(e) => setNewAssetData({ ...newAssetData, engineNumber: e.target.value })}
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium uppercase"
                                    aria-label="Nro. Motor"
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
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Uso Diario Prom. (Hs)</label>
                                <input
                                    type="number"
                                    value={newAssetData.averageDailyUsage}
                                    onChange={(e) => setNewAssetData({ ...newAssetData, averageDailyUsage: Number(e.target.value) })}
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800"
                                    aria-label="Uso Diario Promedio"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Valuation */}
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
                                        aria-label="Valor Razonable"
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
        );
    }

    // --- DETAIL VIEW ---
    if (selectedAsset) {
        const isRented = selectedAsset.ownership === 'Alquilado';

        return (
            <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans animate-in slide-in-from-right-5 duration-300">
                {/* INCIDENT MODAL */}
                {isIncidentModalOpen && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2rem] p-6 w-full max-w-md shadow-2xl relative">
                            <button
                                onClick={() => { setIsIncidentModalOpen(false); setIsEditingIncident(false); setNewIncidentForm({ date: new Date().toISOString().split('T')[0], description: '', cost: 0, damageLevel: 'Leve', status: 'Reportado', incidentNumber: '', reportUrl: '' }); }}
                                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
                            >
                                <X size={24} />
                            </button>

                            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <AlertTriangle className="text-red-500" /> {isEditingIncident ? 'Editar Siniestro' : 'Reportar Siniestro'}
                            </h2>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Fecha</label>
                                        <input
                                            type="date"
                                            value={newIncidentForm.date}
                                            onChange={e => setNewIncidentForm({ ...newIncidentForm, date: e.target.value })}
                                            className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nro. Siniestro</label>
                                        <input
                                            type="text"
                                            value={newIncidentForm.incidentNumber}
                                            onChange={e => setNewIncidentForm({ ...newIncidentForm, incidentNumber: e.target.value })}
                                            className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium"
                                            placeholder="Opcional"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Descripción</label>
                                    <textarea
                                        value={newIncidentForm.description}
                                        onChange={e => setNewIncidentForm({ ...newIncidentForm, description: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium resize-none h-24"
                                        placeholder="Detalle los daños..."
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Costo Estimado</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={newIncidentForm.cost}
                                                onChange={e => setNewIncidentForm({ ...newIncidentForm, cost: Number(e.target.value) })}
                                                className="w-full p-3 pl-8 bg-slate-50 border-none rounded-xl text-sm font-medium"
                                            />
                                            <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Daño</label>
                                        <select
                                            value={newIncidentForm.damageLevel}
                                            onChange={e => setNewIncidentForm({ ...newIncidentForm, damageLevel: e.target.value })}
                                            className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium"
                                        >
                                            <option value="Leve">Leve</option>
                                            <option value="Moderado">Moderado</option>
                                            <option value="Total">Total</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Reporte URL / Upload */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Adjuntar Denuncia</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => incidentReportRef.current?.click()}
                                            className="flex-1 p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-400 hover:bg-slate-100 flex items-center justify-center gap-2 text-xs font-bold"
                                        >
                                            <Paperclip size={14} /> {newIncidentForm.reportUrl ? 'Archivo Adjunto' : 'Subir Archivo'}
                                        </button>
                                        <input type="file" ref={incidentReportRef} className="hidden" accept=".pdf,.jpg,.png" onChange={handleIncidentReportUpload} />
                                        {newIncidentForm.reportUrl && (
                                            <button onClick={() => setNewIncidentForm(prev => ({ ...prev, reportUrl: '' }))} className="p-3 text-red-400 bg-red-50 rounded-xl">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={handleAddIncident}
                                    className="w-full py-4 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-200 mt-2"
                                >
                                    {isEditingIncident ? 'Actualizar Siniestro' : 'Registrar Siniestro'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* HEADER / TOP BAR */}
                <div className="bg-white p-4 sticky top-0 z-30 shadow-sm border-b border-slate-100 flex justify-between items-center px-4 md:px-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSelectedAsset(null)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-600">
                            <ChevronLeft size={24} />
                        </button>
                        <div>
                            <h2 className="text-lg font-black text-slate-800 leading-none">{selectedAsset.name}</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">{selectedAsset.internalId}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {canEdit && (
                            isEditingAsset ? (
                                <>
                                    <button onClick={cancelEditing} className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl text-xs font-bold">Cancelar</button>
                                    <button onClick={saveAssetChanges} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-slate-200">
                                        <Save size={16} /> Guardar
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={handlePrint} className="w-10 h-10 bg-white border border-slate-100 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-50 hover:text-slate-600 hidden md:flex">
                                        <Printer size={20} />
                                    </button>
                                    <button onClick={startEditing} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-slate-200 hover:bg-slate-800">
                                        <Edit3 size={16} /> Editar
                                    </button>
                                </>
                            )
                        )}
                    </div>
                </div>

                <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
                    {isEditingAsset ? (
                        /* --- EDIT FORM --- */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-6">
                                {/* Image & Basics */}
                                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-6">
                                    <div className="relative h-48 rounded-[2.5rem] overflow-hidden bg-slate-100 group">
                                        <img src={editFormData.image} alt="Asset" className="w-full h-full object-cover opacity-90" />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/30 transition-colors">
                                            <button onClick={() => fileInputRef.current?.click()} className="bg-white/90 p-3 rounded-full shadow-lg text-slate-600 hover:text-orange-500">
                                                <Camera size={24} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Marca</label>
                                            <input
                                                type="text"
                                                value={editFormData.brand}
                                                onChange={e => updateGeneratedName(true, e.target.value, undefined)}
                                                className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium"
                                                aria-label="Marca"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Modelo</label>
                                            <input
                                                type="text"
                                                value={editFormData.model}
                                                onChange={e => updateGeneratedName(true, undefined, e.target.value)}
                                                className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium"
                                                aria-label="Modelo"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Cuenta Contable</label>
                                        <input
                                            type="text"
                                            value={editFormData.accountingAccount}
                                            onChange={e => setEditFormData({ ...editFormData, accountingAccount: e.target.value })}
                                            className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium"
                                            aria-label="Cuenta Contable"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tipo</label>
                                            <select
                                                value={editFormData.type}
                                                onChange={e => setEditFormData({ ...editFormData, type: e.target.value as any })}
                                                className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium"
                                                aria-label="Tipo"
                                            >
                                                <option value="Maquinaria">Maquinaria</option>
                                                <option value="Rodados">Rodados</option>
                                                <option value="Equipos de Informática">Equipos de Informática</option>
                                                <option value="Instalaciones en infraestructuras">Instalaciones en infraestructuras</option>
                                                <option value="Otros">Otros</option>
                                            </select>
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
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Responsable</label>
                                        <select
                                            value={editFormData.responsible}
                                            onChange={(e) => setEditFormData({ ...editFormData, responsible: e.target.value })}
                                            className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium appearance-none"
                                            aria-label="Responsable"
                                        >
                                            <option value="">Sin Asignar</option>
                                            {dbStaff.map(s => <option key={s.id} value={s.name}>{s.name} ({s.role})</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Descriptions */}
                                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                        <FileType size={16} className="text-orange-500" /> Descripciones
                                    </h3>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Funcional</label>
                                        <textarea
                                            value={editFormData.functionalDescription}
                                            onChange={e => setEditFormData({ ...editFormData, functionalDescription: e.target.value })}
                                            className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium resize-none min-h-[80px]"
                                            aria-label="Descripción Funcional"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Complementaria</label>
                                        <textarea
                                            value={editFormData.complementaryDescription}
                                            onChange={e => setEditFormData({ ...editFormData, complementaryDescription: e.target.value })}
                                            className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium resize-none min-h-[80px]"
                                            aria-label="Descripción Complementaria"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* Technical */}
                                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                        <Wrench size={16} className="text-orange-500" /> Ficha Técnica
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Propiedad</label>
                                            <select
                                                value={editFormData.ownership}
                                                onChange={e => setEditFormData({ ...editFormData, ownership: e.target.value as any })}
                                                className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium"
                                                aria-label="Propiedad"
                                            >
                                                <option value="Propio">Propio</option>
                                                <option value="Alquilado">Alquilado</option>
                                                <option value="Leasing">Leasing</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Año Origen</label>
                                            <input
                                                type="number"
                                                value={editFormData.originYear}
                                                onChange={e => setEditFormData({ ...editFormData, originYear: Number(e.target.value) })}
                                                className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium"
                                                aria-label="Año Origen"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Patente / Dominio</label>
                                            <input
                                                type="text"
                                                value={editFormData.domainNumber}
                                                onChange={e => setEditFormData({ ...editFormData, domainNumber: e.target.value })}
                                                className={`w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium uppercase ${!isSuperAdmin ? 'opacity-50' : ''}`}
                                                disabled={!isSuperAdmin}
                                                aria-label="Patente"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Serie / VIN</label>
                                            <input
                                                type="text"
                                                value={editFormData.serial}
                                                onChange={e => setEditFormData({ ...editFormData, serial: e.target.value })}
                                                className={`w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium uppercase ${!isSuperAdmin ? 'opacity-50' : ''}`}
                                                disabled={!isSuperAdmin}
                                                aria-label="Serie"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Motor</label>
                                            <input
                                                type="text"
                                                value={editFormData.engineNumber}
                                                onChange={e => setEditFormData({ ...editFormData, engineNumber: e.target.value })}
                                                className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium uppercase"
                                                aria-label="Motor"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Chasis</label>
                                            <input
                                                type="text"
                                                value={editFormData.chassisNumber}
                                                onChange={e => setEditFormData({ ...editFormData, chassisNumber: e.target.value })}
                                                className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium uppercase"
                                                aria-label="Chasis"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Valuation */}
                                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                        <Coins size={16} className="text-orange-500" /> Valuación
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Valor (ARS)</label>
                                            <input
                                                type="number"
                                                value={editFormData.value}
                                                onChange={e => setEditFormData({ ...editFormData, value: Number(e.target.value) })}
                                                className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium"
                                                aria-label="Valor"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">T.T.I. (%)</label>
                                            <input
                                                type="number"
                                                value={editFormData.tti}
                                                onChange={e => setEditFormData({ ...editFormData, tti: Number(e.target.value) })}
                                                className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium"
                                                aria-label="TTI"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Horas / KM</label>
                                            <input
                                                type="number"
                                                value={editFormData.hours}
                                                onChange={e => setEditFormData({ ...editFormData, hours: Number(e.target.value) })}
                                                className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium"
                                                aria-label="Horas"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">VÚR (Años)</label>
                                            <input
                                                type="number"
                                                value={editFormData.usefulLifeRemaining}
                                                onChange={e => setEditFormData({ ...editFormData, usefulLifeRemaining: Number(e.target.value) })}
                                                className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium"
                                                aria-label="VUR"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Expirations in Edit Mode */}
                                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                        <Calendar size={16} className="text-orange-500" /> Vencimientos y Seguros
                                    </h3>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Proveedor Seguro</label>
                                        <input
                                            type="text"
                                            value={editFormData.insuranceProvider}
                                            onChange={e => setEditFormData({ ...editFormData, insuranceProvider: e.target.value })}
                                            className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium"
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
                                            <option value="ITV">ITV</option>
                                            <option value="Seguro">Seguro</option>
                                            <option value="Cédula Verde">Cédula</option>
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
                                            <span className="text-sm font-bold">{selectedAsset.hours.toLocaleString()} <span className="text-[9px] font-normal text-white/50">hs</span></span>
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
                    <h1 className="text-xl font-bold text-slate-800 pl-2">Maquinaria</h1>
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
                                name: '', internalId: '', barcodeId: '', type: 'Maquinaria', status: AssetStatus.OPERATIONAL,
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
                        placeholder="Buscar maquinaria..."
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
                initialAssetType="Maquinaria"
                forceAssetType={true}
            />
        </div>
    );
};

export default Machinery;


