
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    Truck, MapPin, Calendar, ArrowRight, Camera, Plus, Check,
    ChevronLeft, ChevronRight, Save, X, PenTool, ArrowUpRight,
    ArrowDownLeft, Search, AlertTriangle, ImagePlus, Trash2,
    History, MoveRight, CheckCircle2, XCircle, MessageSquare, ScanEye, Loader2, Sparkles,
    ArrowLeftRight, ChevronDown, HardHat, CalendarDays, Edit3, Eye, User, FileText, DollarSign, Clock, Box, Laptop, Armchair
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useStaff } from '../hooks/useStaff';
import { Transfer, Asset, AssetAllocation, ChecklistItem, Project } from '../types';

interface EnhancedTransfer {
    id: string;
    assetName: string;
    assetId: string;
    fromLocation: string;
    toLocation: string;
    date: string;
    status: 'Pendiente' | 'En Tránsito' | 'Completado' | 'Cancelado' | 'Activo' | 'Programado' | 'Finalizado';
    meterReading: number;
    type: 'Ingreso' | 'Salida' | 'Asignación';
    checklist: ChecklistItem[];
    photos: string[];
    aiAnalysis?: string;
    notes?: string;
    responsibleId?: string;
    conformity?: number;
    remitoNumber?: string;
    toDate?: string;
    isAllocation?: boolean;
}

type LogisticsView = 'menu' | 'list' | 'form' | 'detail' | 'schedule' | 'allocation_form' | 'gate';

const UNIFIED_CHECKLIST_ITEMS: ChecklistItem[] = [
    { id: '1', category: 'Cabina y Seguridad', label: 'Limpieza General', status: 'ok', comment: '' },
    { id: '2', category: 'Cabina y Seguridad', label: 'Cinturones de Seguridad', status: 'ok', comment: '' },
    { id: '3', category: 'Cabina y Seguridad', label: 'Extintor (Carga/Vencimiento)', status: 'ok', comment: '' },
    { id: '4', category: 'Cabina y Seguridad', label: 'Espejos Retrovisores', status: 'ok', comment: '' },
    { id: '5', category: 'Motor y Fluidos', label: 'Nivel Aceite Motor', status: 'ok', comment: '' },
    { id: '6', category: 'Motor y Fluidos', label: 'Nivel Refrigerante', status: 'ok', comment: '' },
    { id: '7', category: 'Sistema Hidráulico', label: 'Nivel Aceite Hidráulico', status: 'ok', comment: '' },
    { id: '8', category: 'Eléctrico', label: 'Batería y Luces', status: 'ok', comment: '' },
    { id: '9', category: 'Estructura', label: 'Estado General / Neumáticos', status: 'ok', comment: '' },
];

const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-700';
    if (score >= 70) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
};

const Logistics: React.FC = () => {
    const { checkPermission } = useAuth();
    const canEdit = checkPermission('/logistics', 'edit');

    const [view, setView] = useState<LogisticsView>('menu');
    const [filter, setFilter] = useState<'all' | 'Pendiente' | 'Completado'>('all');
    const [projectFilter, setProjectFilter] = useState('ALL');
    const [assetTypeFilter, setAssetTypeFilter] = useState<string>('ALL');

    const { data: dbStaff } = useStaff();
    const [assetSearch, setAssetSearch] = useState('');
    const [allocationCategoryFilter, setAllocationCategoryFilter] = useState('ALL');
    const [dbAssets, setDbAssets] = useState<any[]>([]);
    const [dbProjects, setDbProjects] = useState<Project[]>([]);
    const [transfers, setTransfers] = useState<EnhancedTransfer[]>([]);
    const [allocations, setAllocations] = useState<AssetAllocation[]>([]);
    const [gateType, setGateType] = useState<'Ingreso' | 'Salida'>('Salida');

    const [isEditing, setIsEditing] = useState(false);
    const [currentTransferId, setCurrentTransferId] = useState<string | null>(null);
    const [selectedAssetId, setSelectedAssetId] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState<Partial<EnhancedTransfer>>({
        assetName: '', fromLocation: '', toLocation: '', date: '', status: 'Pendiente',
        meterReading: 0, type: 'Salida', checklist: [], photos: [], remitoNumber: ''
    });

    const [allocationForm, setAllocationForm] = useState({
        assetIds: [] as string[], projectId: '', fromLocation: 'Pañol Central',
        responsibleId: '', remitoNumber: '', startDate: new Date().toISOString().split('T')[0],
        endDate: '', notes: ''
    });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {

            // 2. Load Projects
            try {
                const { data, error } = await supabase.from('projects').select('*').order('name');
                if (data) setDbProjects(data);
            } catch (e) { console.error("Error loading projects:", e); }

            // 3. Load Assets (Sequentially to ensure partial success)
            const allAssets: any[] = [];
            const mapAsset = (db: any, type: string) => ({
                id: db.id, name: db.name || db.model || 'Activo', internalId: db.internal_id || db.id?.slice(0, 8) || 'S/ID',
                location: db.location, status: db.status, type
            });

            try {
                const { data } = await supabase.from('vehicles').select('*');
                if (data) allAssets.push(...data.map(a => mapAsset(a, 'Rodados')));
            } catch (e) { console.error("Error loading vehicles:", e); }

            try {
                const { data } = await supabase.from('machinery').select('*');
                if (data) allAssets.push(...data.map(a => mapAsset(a, 'Maquinaria')));
            } catch (e) { console.error("Error loading machinery:", e); }

            try {
                const { data } = await supabase.from('mobiliario').select('*');
                if (data) allAssets.push(...data.map(a => mapAsset(a, 'Mobiliario')));
            } catch (e) { console.error("Error loading mobiliario:", e); }

            try {
                const { data } = await supabase.from('it_equipment').select('*');
                if (data) allAssets.push(...data.map(a => mapAsset(a, 'Equipos de Informática')));
            } catch (e) { console.error("Error loading IT:", e); }

            try {
                const { data } = await supabase.from('infrastructures').select('*');
                if (data) allAssets.push(...data.map(a => mapAsset(a, 'Instalaciones en infraestructuras')));
            } catch (e) { console.error("Error loading infra:", e); }

            setDbAssets(allAssets);

            // 4. Load Transactions
            try {
                const { data: transData } = await supabase.from('asset_transfers').select('*').order('transfer_date', { ascending: false });
                if (transData) setTransfers(transData.map(t => ({
                    id: t.id, assetId: t.asset_id, assetName: t.asset_name, fromLocation: t.from_location,
                    toLocation: t.to_location, date: t.transfer_date, status: t.status,
                    meterReading: t.meter_reading, type: t.transfer_type, checklist: t.checklist || [],
                    photos: t.photos || [], aiAnalysis: t.ai_analysis, notes: t.notes,
                    responsibleId: t.responsible_id, remitoNumber: t.remito_number, conformity: t.conformity
                })));
            } catch (e) { console.error("Error loading transfers:", e); }

            // 5. Load Allocations
            try {
                const { data: allocsData } = await supabase.from('asset_allocations').select('*').order('start_date', { ascending: false });
                if (allocsData) setAllocations(allocsData.map(a => ({
                    id: a.id, assetId: a.asset_id, assetName: a.asset_name, projectId: a.project_id,
                    projectName: a.project_name, startDate: a.start_date, endDate: a.end_date,
                    status: a.status, remitoNumber: a.remito_number
                })));
            } catch (e) { console.error("Error loading allocations:", e); }

        } catch (e) { console.error("Critical loadData error:", e); }
    };

    // combinedHistory removed as it is no longer used for the main logic


    const uniqueRemitos = useMemo(() => {
        const remitosMap: Record<string, any> = {};
        const individualItems: any[] = [];

        // Helper to get code
        const getCode = (id: string) => dbAssets.find(a => a.id === id)?.internalId || 'S/ID';

        // 1. Process Allocations (Primary Source for Project Remitos)
        allocations.forEach(alloc => {
            if (!alloc.remitoNumber || alloc.remitoNumber === 'S/N') return;

            if (!remitosMap[alloc.remitoNumber]) {
                remitosMap[alloc.remitoNumber] = {
                    id: alloc.remitoNumber,
                    remitoNumber: alloc.remitoNumber,
                    status: alloc.status === 'Activo' ? 'Completado' : 'Pendiente',
                    date: alloc.startDate,
                    toDate: alloc.endDate, // Store strictly as toDate/endDate
                    fromLocation: 'Pañol Central',
                    toLocation: alloc.projectName,
                    type: 'Salida' as const,
                    displayType: 'Asignación',
                    assetCount: 0,
                    // These will be filled by matching transfers if found
                    responsibleId: '',
                    notes: '',
                    isAllocation: true,
                    // Store first asset code for preview
                    previewCode: getCode(alloc.assetId)
                };
            }
            // If multiple assets, maybe show "VHL-01 + 3 más" logic in UI, for now just keep first or concat?
            // Let's keep the first one found as a preview or "Various"
        });

        // 2. Process Transfers (Enrich Allocations + Handle Manual Remitos)
        transfers.forEach(trans => {
            const rNum = trans.remitoNumber;
            const hasRemito = rNum && rNum !== 'S/N' && rNum.trim() !== '';

            if (hasRemito) {
                if (remitosMap[rNum!]) {
                    // Enrich existing Allocation Remito with Transfer metadata
                    if (!remitosMap[rNum!].responsibleId) remitosMap[rNum!].responsibleId = trans.responsibleId;
                    if (!remitosMap[rNum!].notes) remitosMap[rNum!].notes = trans.notes;
                } else {
                    // New Manual Remito (not linked to allocation)
                    if (!remitosMap[rNum!]) {
                        remitosMap[rNum!] = {
                            ...trans,
                            displayType: trans.type,
                            assetCount: 0,
                            isAllocation: false,
                            previewCode: getCode(trans.assetId)
                        };
                    }
                }
                remitosMap[rNum!].assetCount++;
            } else {
                // Standalone Transfer
                individualItems.push({
                    ...trans,
                    displayType: trans.type,
                    assetCount: 1,
                    previewCode: getCode(trans.assetId)
                });
            }
        });

        const all = [...Object.values(remitosMap), ...individualItems].sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        return all;
    }, [allocations, transfers, dbAssets]);

    const groupedRemitos = useMemo(() => {
        const filtered = uniqueRemitos.filter(r => {
            const matchStatus = filter === 'all' || r.status === filter;
            const matchProj = projectFilter === 'ALL' || r.toLocation === projectFilter || r.fromLocation === projectFilter;
            return matchStatus && matchProj;
        });
        const groups: Record<string, any[]> = {};
        filtered.forEach(r => {
            const key = r.toLocation || 'Otros';
            if (!groups[key]) groups[key] = [];
            groups[key].push(r);
        });
        return groups;
    }, [uniqueRemitos, filter, projectFilter]);


    const relatedAssets = useMemo(() => {
        const remito = formData?.remitoNumber;
        if (!remito || remito === 'S/N') {
            const assetData = dbAssets.find(a => a.id === formData.assetId);
            return formData?.assetName ? [{
                id: formData.assetId || 'new',
                code: assetData?.internalId || 'S/ID',
                name: formData.assetName,
                type: formData.type || 'Movimiento',
                meter: formData.meterReading || 0,
                conformity: formData.conformity || 100
            }] : [];
        }

        // Gather all assets associated with this Remito Number
        const fromAllocations = allocations
            .filter(a => a.remitoNumber === remito)
            .map(a => {
                const assetData = dbAssets.find(db => db.id === a.assetId);
                return {
                    id: a.assetId,
                    code: assetData?.internalId || 'S/ID',
                    name: a.assetName,
                    type: 'Asignación' as const,
                    meter: 0,
                    conformity: 100,
                    status: a.status as any
                };
            });

        const fromTransfers = transfers
            .filter(t => t.remitoNumber === remito)
            .map(t => {
                const assetData = dbAssets.find(db => db.id === t.assetId);
                return {
                    id: t.assetId,
                    code: assetData?.internalId || 'S/ID',
                    name: t.assetName,
                    type: t.type,
                    meter: t.meterReading,
                    conformity: t.conformity || 100,
                    status: t.status
                };
            });

        // Merge, preferring Transfer data (real inspection) over Allocation data (plan)
        const combined = [...fromTransfers];
        fromAllocations.forEach(alloc => {
            if (!combined.some(c => c.id === alloc.id)) {
                combined.push(alloc);
            }
        });

        return combined;
    }, [formData?.remitoNumber, formData?.assetName, transfers, allocations, dbAssets]);

    const availableLocations = useMemo(() => {
        return ['Pañol Central', 'Taller Central', ...dbProjects.map(p => p.name)];
    }, [dbProjects]);

    const getNextRemitoNumber = () => {
        const lastRemito = [...transfers, ...allocations]
            .filter(t => t.remitoNumber?.startsWith('R-0001-'))
            .map(t => parseInt(t.remitoNumber!.split('-')[2]) || 0)
            .sort((a, b) => b - a)[0] || 0;
        return `R-0001-${(lastRemito + 1).toString().padStart(8, '0')}`;
    };

    const handleSaveAllocation = async () => {
        if (!allocationForm.projectId || allocationForm.assetIds.length === 0) return alert("Seleccione Obra y Activos.");
        try {
            const project = dbProjects.find(p => p.id === allocationForm.projectId);
            const toLoc = project?.name || 'Obra';
            for (const assetId of allocationForm.assetIds) {
                const asset = dbAssets.find(a => a.id === assetId);
                await supabase.from('asset_allocations').insert({
                    asset_id: assetId, asset_name: asset?.name, project_id: allocationForm.projectId,
                    project_name: toLoc, start_date: allocationForm.startDate, end_date: allocationForm.endDate || null,
                    status: 'Activo', remito_number: allocationForm.remitoNumber
                });
                await supabase.from('asset_transfers').insert({
                    asset_id: assetId, asset_name: asset?.name, from_location: allocationForm.fromLocation,
                    to_location: toLoc, transfer_date: allocationForm.startDate, transfer_type: 'Salida',
                    status: 'Completado', responsible_id: allocationForm.responsibleId,
                    remito_number: allocationForm.remitoNumber, notes: allocationForm.notes, conformity: 100
                });
                let table = 'assets';
                if (asset?.type === 'Rodados') table = 'vehicles';
                else if (asset?.type === 'Maquinaria') table = 'machinery';
                await supabase.from(table).update({ location: toLoc, status: 'En Obra' }).eq('id', assetId);
            }
            alert("Remito de Asignación Guardado.");
            loadData();
            setView('list');
        } catch (e: any) { alert(e.message); }
    };

    const handleSaveTransfer = async () => {
        if (!selectedAssetId || !formData.toLocation) return alert("Complete los datos.");
        try {
            const asset = dbAssets.find(a => a.id === selectedAssetId);
            const payload = {
                asset_id: selectedAssetId, asset_name: asset?.name, from_location: formData.fromLocation,
                to_location: formData.toLocation, transfer_date: formData.date, transfer_type: formData.type,
                status: formData.status, meter_reading: formData.meterReading, checklist: formData.checklist,
                photos: formData.photos, ai_analysis: formData.aiAnalysis, notes: formData.notes,
                responsible_id: formData.responsibleId, remito_number: formData.remitoNumber || 'S/N', conformity: formData.conformity || 100
            };
            const { error } = isEditing
                ? await supabase.from('asset_transfers').update(payload).eq('id', currentTransferId)
                : await supabase.from('asset_transfers').insert(payload);
            if (error) throw error;
            if (formData.status === 'Completado') {
                let table = 'assets';
                if (asset?.type === 'Rodados') table = 'vehicles';
                else if (asset?.type === 'Maquinaria') table = 'machinery';
                await supabase.from(table).update({ location: formData.toLocation, status: formData.toLocation === 'Pañol Central' ? 'Disponible' : 'En Obra' }).eq('id', selectedAssetId);
            }
            alert("Movimiento Guardado.");
            loadData();
            setView('list');
        } catch (e: any) { alert(e.message); }
    };

    const handleNewAllocation = () => {
        setAllocationForm({
            assetIds: [], projectId: '', fromLocation: 'Pañol Central', responsibleId: '',
            remitoNumber: getNextRemitoNumber(), startDate: new Date().toISOString().split('T')[0],
            endDate: '', notes: ''
        });
        setView('allocation_form');
    };

    const handleOpenForm = (type: 'Ingreso' | 'Salida') => {
        setFormData({
            type, date: new Date().toISOString().split('T')[0], status: 'Pendiente',
            fromLocation: type === 'Salida' ? 'Pañol Central' : '',
            toLocation: type === 'Ingreso' ? 'Pañol Central' : '',
            checklist: JSON.parse(JSON.stringify(UNIFIED_CHECKLIST_ITEMS)), photos: []
        });
        setSelectedAssetId('');
        setIsEditing(false);
        setView('form');
    };

    const handleEditTransfer = (t: EnhancedTransfer) => {
        setFormData(t);
        setSelectedAssetId(t.assetId);
        setCurrentTransferId(t.id);
        setIsEditing(true);
        setView('form');
    };

    const toggleChecklistItem = (id: string, status: 'ok' | 'fail') => {
        const list = formData.checklist?.map(i => i.id === id ? { ...i, status } : i) || [];
        const score = Math.round((list.filter(i => i.status === 'ok').length / list.length) * 100);
        setFormData({ ...formData, checklist: list, conformity: score });
    };

    const handleOpenGate = (type: 'Ingreso' | 'Salida') => {
        setGateType(type);
        setView('gate');
    };


    const handleDeleteRemito = async () => {
        if (!formData.remitoNumber || formData.remitoNumber === 'S/N') return alert("No se puede eliminar un remito sin número.");
        if (!window.confirm("¿Estás seguro de que deseas eliminar este Remito? \n\nESTA ACCIÓN ES IRREVERSIBLE.\n\nTodos los activos asociados volverán a estado 'Disponible' y ubicación 'Pañol Central'.")) return;

        try {
            // 1. Identify assets and revert status
            const assetIdsToRevert = [
                ...transfers.filter(t => t.remitoNumber === formData.remitoNumber).map(t => ({ id: t.assetId, name: t.assetName })),
                ...allocations.filter(a => a.remitoNumber === formData.remitoNumber).map(a => ({ id: a.assetId, name: a.assetName }))
            ];

            // Deduplicate
            const uniqueAssets = Array.from(new Set(assetIdsToRevert.map(a => a.id)))
                .map(id => assetIdsToRevert.find(a => a.id === id)!);

            for (const asset of uniqueAssets) {
                // Determine table based on asset type is tricky without the type here, 
                // but we can search in dbAssets which has the type.
                const fullAsset = dbAssets.find(a => a.id === asset.id);
                if (fullAsset) {
                    let table = 'assets';
                    if (fullAsset.type === 'Rodados') table = 'vehicles';
                    else if (fullAsset.type === 'Maquinaria') table = 'machinery';
                    else if (fullAsset.type === 'Mobiliario') table = 'mobiliario';
                    else if (fullAsset.type === 'Equipos de Informática') table = 'it_equipment';
                    else if (fullAsset.type === 'Instalaciones en infraestructuras') table = 'infrastructures';

                    await supabase.from(table).update({ location: 'Pañol Central', status: 'Disponible' }).eq('id', asset.id);
                }
            }

            // 2. Delete Allocations
            const { error: allocError } = await supabase.from('asset_allocations').delete().eq('remito_number', formData.remitoNumber);
            if (allocError) throw allocError;

            // 3. Delete Transfers
            const { error: transError } = await supabase.from('asset_transfers').delete().eq('remito_number', formData.remitoNumber);
            if (transError) throw transError;

            alert("Remito eliminado y activos restaurados a Pañol Central.");
            loadData();
            setView('list');

        } catch (e: any) {
            console.error(e);
            alert("Error al eliminar remito: " + e.message);
        }
    };

    // --- VIEWS ---

    if (view === 'allocation_form') {
        return (
            <div className="bg-[#F8F9FA] min-h-screen pb-20 animate-in slide-in-from-right-5 duration-300">
                <div className="bg-white p-4 sticky top-0 z-10 shadow-sm flex items-center justify-between">
                    <button onClick={() => setView('menu')} className="text-slate-600 p-2"><ChevronLeft size={24} /></button>
                    <h1 className="font-bold text-lg text-slate-800">Nuevo Remito de Salida</h1>
                    <button onClick={handleSaveAllocation} className="text-orange-500 font-bold bg-orange-50 px-4 py-2 rounded-full">Generar Remito</button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Activos a Movilizar</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar activo por nombre o código..."
                                value={assetSearch}
                                onChange={e => setAssetSearch(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold shadow-sm focus:outline-none focus:border-orange-500 transition-colors"
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                            {[
                                { label: 'Todos', value: 'ALL', icon: <CheckCircle2 size={14} /> },
                                { label: 'Vehículos', value: 'Rodados', icon: <Truck size={14} /> },
                                { label: 'Maquinaria', value: 'Maquinaria', icon: <HardHat size={14} /> },
                                { label: 'Inmuebles', value: 'Instalaciones en infraestructuras', icon: <MapPin size={14} /> },
                                { label: 'Informática', value: 'Equipos de Informática', icon: <Laptop size={14} /> },
                                { label: 'Mobiliario', value: 'Mobiliario', icon: <Armchair size={14} /> },
                            ].map(cat => (
                                <button
                                    key={cat.value}
                                    onClick={() => setAllocationCategoryFilter(cat.value)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${allocationCategoryFilter === cat.value ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    {cat.icon}
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                        <div className="bg-white border rounded-[2rem] max-h-60 overflow-y-auto p-4 space-y-2 shadow-sm">
                            {dbAssets.filter(a => {
                                const nameMatch = a.name?.toLowerCase().includes(assetSearch.toLowerCase()) ?? false;
                                const idMatch = a.internalId?.toLowerCase().includes(assetSearch.toLowerCase()) ?? false;
                                const matchesSearch = nameMatch || idMatch;
                                const matchesCategory = allocationCategoryFilter === 'ALL' || a.type === allocationCategoryFilter;
                                return matchesSearch && matchesCategory;
                            }).map(asset => {
                                const sel = allocationForm.assetIds.includes(asset.id);
                                return (
                                    <div key={asset.id} onClick={() => {
                                        const next = sel ? allocationForm.assetIds.filter(id => id !== asset.id) : [...allocationForm.assetIds, asset.id];
                                        setAllocationForm({ ...allocationForm, assetIds: next });
                                    }} className={`p-4 rounded-2xl flex items-center gap-4 transition-all cursor-pointer ${sel ? 'bg-orange-50 border border-orange-200 shadow-sm' : 'border border-transparent hover:bg-slate-50'}`}>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${sel ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-200'}`}>
                                            {sel && <Check size={14} strokeWidth={4} />}
                                        </div>
                                        <div className="flex-1">
                                            <p className={`font-bold text-sm ${sel ? 'text-orange-900' : 'text-slate-700'}`}>{asset.name}</p>
                                            <p className="text-[10px] text-slate-400 uppercase font-black">{asset.internalId} • {asset.location}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Origen</label>
                                <select value={allocationForm.fromLocation} onChange={e => setAllocationForm({ ...allocationForm, fromLocation: e.target.value })} className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800">
                                    {availableLocations.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Destino (Obra)</label>
                                <select value={allocationForm.projectId} onChange={e => setAllocationForm({ ...allocationForm, projectId: e.target.value })} className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800">
                                    <option value="">Seleccionar...</option>
                                    {dbProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Responsable</label>
                            <select value={allocationForm.responsibleId} onChange={e => setAllocationForm({ ...allocationForm, responsibleId: e.target.value })} className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800">
                                <option value="">Asignar Personal...</option>
                                {dbStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">N° Remito Generado</label>
                            <input type="text" value={allocationForm.remitoNumber} onChange={e => setAllocationForm({ ...allocationForm, remitoNumber: e.target.value })} className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl text-lg font-black text-slate-900" />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Emisión</label>
                                <input type="date" value={allocationForm.startDate} onChange={e => setAllocationForm({ ...allocationForm, startDate: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold" />
                            </div>
                            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fin Estimado</label>
                                <input type="date" value={allocationForm.endDate} onChange={e => setAllocationForm({ ...allocationForm, endDate: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'form') {
        return (
            <div className="bg-[#F8F9FA] min-h-screen pb-24 animate-in slide-in-from-right-5">
                <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex items-center justify-between">
                    <button onClick={() => setView('menu')} className="text-slate-600 p-2"><X size={24} /></button>
                    <h1 className="font-bold text-lg text-slate-800">{isEditing ? 'Editar Registro' : `Nueva ${formData.type}`}</h1>
                    <button onClick={handleSaveTransfer} className="text-orange-500 font-bold bg-orange-50 px-4 py-2 rounded-full">Guardar</button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Activo</label>
                        <select value={selectedAssetId} onChange={e => setSelectedAssetId(e.target.value)} className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold appearance-none">
                            <option value="">Seleccionar...</option>
                            {dbAssets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Origen</label>
                                <select value={formData.fromLocation} onChange={e => setFormData({ ...formData, fromLocation: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold border-none">{availableLocations.map(l => <option key={l} value={l}>{l}</option>)}</select>
                            </div>
                            <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Destino</label>
                                <select value={formData.toLocation} onChange={e => setFormData({ ...formData, toLocation: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold border-none">{availableLocations.map(l => <option key={l} value={l}>{l}</option>)}</select>
                            </div>
                        </div>
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Responsable</label>
                        <select value={formData.responsibleId} onChange={e => setFormData({ ...formData, responsibleId: e.target.value })} className="w-full p-4 bg-slate-50 rounded-2xl text-sm border-none"><option value="">Seleccionar...</option>{dbStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Inspección de Salida/Ingreso</h3>
                        {formData.checklist?.map(item => (
                            <div key={item.id} className="bg-white p-4 rounded-2xl border shadow-sm flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-700">{item.label}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => toggleChecklistItem(item.id, 'ok')} className={`p-2 rounded-xl transition-all ${item.status === 'ok' ? 'bg-green-100 text-green-600' : 'bg-slate-50 text-slate-300'}`}><Check size={20} strokeWidth={4} /></button>
                                    <button onClick={() => toggleChecklistItem(item.id, 'fail')} className={`p-2 rounded-xl transition-all ${item.status === 'fail' ? 'bg-red-100 text-red-600' : 'bg-slate-50 text-slate-300'}`}><X size={20} strokeWidth={4} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'detail' && formData) {
        return (
            <div className="bg-[#F8F9FA] min-h-screen pb-24 font-sans animate-in fade-in duration-500 print:bg-white">
                <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex items-center justify-between print:hidden">
                    <button onClick={() => setView('list')} className="text-slate-600 p-2"><ChevronLeft size={24} /></button>
                    <h1 className="font-black text-lg text-slate-800 uppercase italic">DOCUMENTO DE REMITO</h1>
                    <div className="flex gap-2">
                        {canEdit && (
                            <button onClick={handleDeleteRemito} className="bg-red-50 text-red-500 px-4 py-2 rounded-xl text-xs font-black hover:bg-red-100 transition-colors">ELIMINAR</button>
                        )}
                        <button onClick={() => window.print()} className="bg-slate-900 text-white px-6 py-2 rounded-xl text-xs font-black shadow-lg shadow-slate-200">IMPRIMIR</button>
                    </div>
                </div>
                <div className="p-6 max-w-4xl mx-auto print:p-0">
                    <div className="bg-white border-2 border-slate-200 rounded-[3rem] shadow-2xl overflow-hidden print:border-none print:shadow-none print:rounded-none">
                        <div className="p-12 border-b-8 border-slate-900 bg-slate-50/50 relative">
                            <div className="absolute top-0 right-0 m-12 p-6 border-4 border-slate-900 rounded-3xl flex flex-col items-center shadow-xl bg-white">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Remito N°</span>
                                <span className="text-3xl font-black text-slate-900 tracking-tighter">{formData.remitoNumber || 'S/N'}</span>
                            </div>
                            <div className="flex items-center gap-8 mb-10">
                                <div className="w-24 h-24 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white shadow-2xl rotate-3"><Truck size={48} strokeWidth={2.5} /></div>
                                <div><h2 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">SOWIC</h2><p className="text-xs font-black text-slate-400 tracking-[0.4em] uppercase mt-2">Logística e Infraestructura</p></div>
                            </div>
                            <div className="grid grid-cols-2 gap-12 pt-4">
                                <div className="space-y-1"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Procedencia</p><p className="text-xl font-black text-slate-800 flex items-center gap-2 underline decoration-orange-500/30 underline-offset-8 decoration-4">{formData.fromLocation || 'Pañol Central'}</p></div>
                                <div className="space-y-1"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Destino</p><p className="text-xl font-black text-slate-800 flex items-center gap-2 underline decoration-green-500/30 underline-offset-8 decoration-4">{formData.toLocation || 'Obra'}</p></div>
                            </div>
                            <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-4 gap-4">
                                <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Fecha Emisión</p><p className="text-sm font-black text-slate-700">{formData.date}</p></div>
                                {formData.toDate && (
                                    <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Vigencia Hasta</p><p className="text-sm font-black text-slate-700">{formData.toDate}</p></div>
                                )}
                                <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Responsable</p><p className="text-sm font-black text-slate-700 truncate">{dbStaff.find(s => s.id === formData.responsibleId)?.name || 'Personal Sowic'}</p></div>
                                <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Movimiento</p><span className="text-[10px] uppercase font-black px-2 py-0.5 bg-slate-900 text-white rounded-lg">{formData.type}</span></div>
                            </div>
                        </div>
                        <div className="p-12">
                            <div className="rounded-[2rem] overflow-hidden border-2 border-slate-100">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.1em]">
                                        <tr><th className="px-8 py-5">Código</th><th className="px-8 py-5">Descripción de Activos</th><th className="px-8 py-5 text-center">Estado</th><th className="px-8 py-5 text-right">Firma</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {relatedAssets.map((asset, idx) => (
                                            <tr key={idx} className="bg-white hover:bg-slate-50/50 transition-colors">
                                                <td className="px-8 py-6">
                                                    <span className="bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider">{asset.code}</span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div>
                                                        <p className="text-base font-black text-slate-800">{asset.name}</p>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Inspección OK: {asset.conformity || 100}%</p>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-center"><span className={`text-[10px] font-black px-3 py-1.5 rounded-full ${getScoreColor(asset.conformity || 100)}`}>CONFORME</span></td>
                                                <td className="px-8 py-6 text-right"><div className="w-32 h-1 bg-slate-50 ml-auto rounded-full"></div></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-12 p-8 bg-slate-50 rounded-[2.5rem] space-y-4">
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><FileText size={14} /> Observaciones Generales</h4>
                                <p className="text-sm font-bold text-slate-600 italic leading-relaxed">{formData.notes || "Sin observaciones registradoras en este documento."}</p>
                            </div>
                        </div>
                        <div className="p-10 bg-slate-900 flex justify-between items-center"><p className="text-[10px] font-black text-white/30 tracking-widest">SOWIC APP v2.2 • GENERADO: {new Date().toLocaleString()}</p></div>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'menu') {
        return (
            <div className="bg-[#F8F9FA] min-h-screen p-6 md:p-12 space-y-12 animate-in fade-in duration-500">
                <div className="flex justify-between items-end">
                    <div><h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Logística</h1><p className="text-sm text-slate-400 font-black uppercase tracking-[0.2em] mt-3">Módulo de Control y Movimiento</p></div>
                    <div className="w-16 h-16 rounded-3xl bg-slate-900 p-0.5 shadow-2xl flex items-center justify-center text-white"><Box size={32} /></div>
                </div>
                <div className="space-y-6">
                    {canEdit && (
                        <>
                            <button onClick={handleNewAllocation} className="w-full bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group active:scale-[0.98] transition-all">
                                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-orange-500/20 rounded-full blur-[80px]"></div>
                                <div className="flex items-center gap-6 relative z-10">
                                    <div className="w-16 h-16 bg-orange-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-orange-500/20 rotate-3 group-hover:rotate-0 transition-transform"><CalendarDays size={32} /></div>
                                    <div className="text-left flex-1"><h2 className="text-xl font-black uppercase italic italic">Generar Remito</h2><p className="text-[11px] text-white/50 font-black uppercase tracking-widest mt-1">Salida Masiva a Obra</p></div>
                                    <ChevronRight size={24} className="text-white/20" />
                                </div>
                            </button>
                            <div className="grid grid-cols-2 gap-6">
                                <button onClick={() => handleOpenGate('Salida')} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col items-center gap-4 group active:scale-95 transition-all hover:-translate-y-1"><div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-3xl flex items-center justify-center shadow-lg group-hover:bg-orange-500 group-hover:text-white transition-all"><ArrowUpRight size={32} /></div><span className="text-xs font-black uppercase tracking-widest text-slate-800">Salida Gate</span></button>
                                <button onClick={() => handleOpenGate('Ingreso')} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col items-center gap-4 group active:scale-95 transition-all hover:-translate-y-1"><div className="w-16 h-16 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center shadow-lg group-hover:bg-green-600 group-hover:text-white transition-all"><ArrowDownLeft size={32} /></div><span className="text-xs font-black uppercase tracking-widest text-slate-800">Ingreso Gate</span></button>
                            </div>
                        </>
                    )}
                    <div className="grid grid-cols-2 gap-6">
                        <button onClick={() => setView('schedule')} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col items-center gap-4 group active:scale-95 transition-all hover:-translate-y-1"><div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-3xl flex items-center justify-center shadow-lg group-hover:bg-blue-500 group-hover:text-white transition-all"><History size={32} /></div><span className="text-xs font-black uppercase tracking-widest text-slate-800">Control Obra</span></button>
                        <button onClick={() => setView('list')} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col items-center gap-4 group active:scale-95 transition-all hover:-translate-y-1"><div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-3xl flex items-center justify-center shadow-lg group-hover:bg-slate-900 group-hover:text-white transition-all"><FileText size={32} /></div><span className="text-xs font-black uppercase tracking-widest text-slate-800">Historial</span></button>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'list') {
        return (
            <div className="bg-[#F8F9FA] min-h-screen pb-24 animate-in fade-in duration-300">
                <div className="bg-white px-8 pt-8 pb-6 sticky top-0 z-10 shadow-sm border-b space-y-6">
                    <div className="flex justify-between items-center"><button onClick={() => setView('menu')} className="text-slate-600 p-2 -ml-2 rounded-full hover:bg-slate-50"><ChevronLeft size={24} /></button><h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Historial de Remitos <span className="text-xs text-orange-500 not-italic tracking-normal bg-orange-50 px-2 py-1 rounded-lg">v2.4</span></h1><div className="w-12" /></div>
                    <div className="flex bg-slate-100 p-1 rounded-2xl">
                        <button onClick={() => setFilter('all')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all ${filter === 'all' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400'}`}>Todos</button>
                        <button onClick={() => setFilter('Pendiente')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all ${filter === 'Pendiente' ? 'bg-white text-orange-600 shadow-lg' : 'text-slate-400'}`}>Pendientes</button>
                        <button onClick={() => setFilter('Completado')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all ${filter === 'Completado' ? 'bg-white text-green-600 shadow-lg' : 'text-slate-400'}`}>Completados</button>
                    </div>
                </div>
                <div className="p-6 space-y-8">
                    {Object.entries(groupedRemitos).map(([project, groups]) => (
                        <div key={project} className="space-y-4">
                            <div className="flex items-center gap-3 px-4"><div className="w-2 h-6 bg-orange-500 rounded-full"></div><h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{project}</h2></div>
                            <div className="space-y-3">
                                {groups.map((remito: any, idx) => (
                                    <div key={remito.remitoNumber ? `${remito.remitoNumber}-${idx}` : remito.id} onClick={() => { setFormData({ ...remito }); setView('detail'); }} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between hover:border-orange-200 hover:shadow-orange-100/50 hover:shadow-xl transition-all cursor-pointer group">
                                        <div className="flex items-center gap-5">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${remito.status === 'Completado' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}><FileText size={24} /></div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-black text-slate-900 text-lg tracking-tighter uppercase italic">{remito.remitoNumber || 'SIN NUMERO'}</h3>
                                                    {remito.displayType === 'Asignación' && <span className="text-[8px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-lg uppercase tracking-widest">Obra</span>}
                                                    {remito.previewCode && <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg uppercase tracking-widest">{remito.previewCode}</span>}
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{remito.date} • {remito.assetCount} {remito.assetCount === 1 ? 'Activo' : 'Activos'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={`text-[10px] font-black px-3 py-1 rounded-xl uppercase ${remito.status === 'Completado' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{remito.status}</span>
                                            <ChevronRight size={20} className="text-slate-200 group-hover:text-orange-500 transition-colors" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (view === 'schedule') {
        const activeAllocs = allocations.filter(a => a.status === 'Activo' || a.status === 'Programado');
        const groups: Record<string, any[]> = {};
        activeAllocs.forEach(a => { const p = a.projectName || 'Otros'; if (!groups[p]) groups[p] = []; groups[p].push(a); });

        return (
            <div className="bg-[#F8F9FA] min-h-screen pb-24 animate-in fade-in duration-300">
                <div className="bg-white p-6 sticky top-0 z-10 shadow-sm border-b flex items-center justify-between"><button onClick={() => setView('menu')} className="text-slate-600 p-2"><ChevronLeft size={24} /></button><h1 className="font-black text-lg text-slate-800 uppercase italic">Afectaciones Activas</h1><div className="w-10" /></div>
                <div className="p-6 space-y-8">
                    {Object.entries(groups).map(([project, items]) => (
                        <div key={project} className="bg-white rounded-[2.5rem] shadow-xl border border-slate-50 overflow-hidden">
                            <div className="bg-slate-900 p-6 flex justify-between items-center"><h2 className="text-xs font-black text-white uppercase tracking-widest">{project}</h2><span className="text-[10px] font-black bg-white/10 text-slate-400 px-3 py-1 rounded-full">{items.length} Activos</span></div>
                            <div className="divide-y divide-slate-50">
                                {items.map((item: any) => (
                                    <div key={item.id} onClick={() => { setFormData({ ...item, date: item.startDate, type: 'Salida' }); setView('detail'); }} className="p-6 hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-between group">
                                        <div className="flex items-center gap-4"><div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><HardHat size={24} /></div><div><p className="font-black text-slate-800 text-sm tracking-tight">{item.assetName}</p><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Desde: {item.startDate}</p></div></div>
                                        <ChevronRight size={18} className="text-slate-200 group-hover:text-slate-900 transition-colors" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (view === 'gate') {
        const pending = transfers.filter(t => t.type === gateType && t.status === 'Pendiente');
        return (
            <div className="bg-[#F8F9FA] min-h-screen pb-24 animate-in slide-in-from-right-5">
                <div className="bg-white p-6 sticky top-0 z-10 shadow-sm flex items-center justify-between"><button onClick={() => setView('menu')} className="text-slate-600 p-2"><ChevronLeft size={24} /></button><h1 className="font-black text-lg text-slate-800 uppercase italic">Control de {gateType}</h1><div className="w-10" /></div>
                <div className="p-6 space-y-8">
                    <button onClick={() => handleOpenForm(gateType)} className={`w-full ${gateType === 'Salida' ? 'bg-orange-500' : 'bg-green-600'} text-white p-6 rounded-[2rem] shadow-2xl flex items-center justify-center gap-4 text-sm font-black uppercase tracking-widest transition-all active:scale-95`}><Plus size={24} /> Nueva {gateType}</button>
                    <div className="space-y-4">
                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 italic">Checks Pendientes</h2>
                        {pending.map(item => (
                            <div key={item.id} onClick={() => handleEditTransfer(item)} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between hover:border-slate-300 transition-all cursor-pointer group">
                                <div className="flex items-center gap-4"><div className="w-14 h-14 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center group-hover:bg-slate-100 transition-colors"><Truck size={24} /></div><div><h3 className="font-black text-slate-800 text-sm">{item.assetName}</h3><p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mt-1">Remito: {item.remitoNumber || 'S/N'}</p></div></div>
                                <ChevronRight size={18} className="text-slate-200 group-hover:text-slate-900" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default Logistics;
