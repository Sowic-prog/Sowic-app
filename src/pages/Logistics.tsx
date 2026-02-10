
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    Truck, MapPin, Calendar, ArrowRight, Camera, Plus, Check,
    ChevronLeft, ChevronRight, Save, X, PenTool, ArrowUpRight,
    ArrowDownLeft, Search, AlertTriangle, ImagePlus, Trash2,
    History, MoveRight, CheckCircle2, XCircle, MessageSquare, ScanEye, Loader2, Sparkles,
    ArrowLeftRight, ChevronDown, HardHat, CalendarDays, Edit3, Eye, User, FileText, DollarSign, Clock, Box, Laptop, Armchair
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { MOCK_TRANSFERS, MOCK_ASSETS, MOCK_ALLOCATIONS, MOCK_PROJECTS, MOCK_STAFF } from '../constants';
import { Transfer, Asset, AssetAllocation, ChecklistItem, Project } from '../types';

// Extended Transfer type to support new features locally
interface EnhancedTransfer {
    id: string;
    assetName: string;
    fromLocation: string;
    toLocation: string;
    date: string;
    status: 'En Tránsito' | 'Completado';
    meterReading: number;
    type: 'Ingreso' | 'Salida';
    checklist: ChecklistItem[];
    photos: string[]; // Base64 strings
    aiAnalysis?: string;
    notes?: string;
    projectId?: string;
    responsibleId?: string;
    conformity?: number; // Score 0-100
}

type LogisticsView = 'menu' | 'list' | 'form' | 'detail' | 'schedule' | 'allocation_form';
type FilterType = 'all' | 'out' | 'in';

// MISMA LISTA QUE EN TALLER PARA UNIFICAR CRITERIOS
const UNIFIED_CHECKLIST_ITEMS: ChecklistItem[] = [
    // Cabina y Seguridad
    { id: '1', category: 'Cabina y Seguridad', label: 'Limpieza General', status: 'ok', comment: '' },
    { id: '2', category: 'Cabina y Seguridad', label: 'Cinturones de Seguridad', status: 'ok', comment: '' },
    { id: '3', category: 'Cabina y Seguridad', label: 'Extintor (Carga/Vencimiento)', status: 'ok', comment: '' },
    { id: '4', category: 'Cabina y Seguridad', label: 'Espejos Retrovisores', status: 'ok', comment: '' },
    { id: '5', category: 'Cabina y Seguridad', label: 'Bocina y Alarma de Retroceso', status: 'ok', comment: '' },

    // Motor y Fluidos
    { id: '6', category: 'Motor y Fluidos', label: 'Nivel Aceite Motor', status: 'ok', comment: '' },
    { id: '7', category: 'Motor y Fluidos', label: 'Nivel Refrigerante', status: 'ok', comment: '' },
    { id: '8', category: 'Motor y Fluidos', label: 'Estado de Correas', status: 'ok', comment: '' },
    { id: '9', category: 'Motor y Fluidos', label: 'Fugas Visibles (Agua/Aceite)', status: 'ok', comment: '' },
    { id: '10', category: 'Motor y Fluidos', label: 'Filtro de Aire (Indicador)', status: 'ok', comment: '' },

    // Sistema Hidráulico
    { id: '11', category: 'Sistema Hidráulico', label: 'Nivel Aceite Hidráulico', status: 'ok', comment: '' },
    { id: '12', category: 'Sistema Hidráulico', label: 'Estado Mangueras y Acoples', status: 'ok', comment: '' },
    { id: '13', category: 'Sistema Hidráulico', label: 'Fugas en Cilindros', status: 'ok', comment: '' },

    // Eléctrico y Luces
    { id: '14', category: 'Eléctrico', label: 'Batería (Bornes/Sujeción)', status: 'ok', comment: '' },
    { id: '15', category: 'Eléctrico', label: 'Luces Delanteras (Alta/Baja)', status: 'ok', comment: '' },
    { id: '16', category: 'Eléctrico', label: 'Luces Traseras y Freno', status: 'ok', comment: '' },
    { id: '17', category: 'Eléctrico', label: 'Tablero de Instrumentos', status: 'ok', comment: '' },

    // Estructura y Rodado
    { id: '18', category: 'Estructura y Rodado', label: 'Presión de Neumáticos / Orugas', status: 'ok', comment: '' },
    { id: '19', category: 'Estructura y Rodado', label: 'Ajuste de Pernos de Rueda', status: 'ok', comment: '' },
    { id: '20', category: 'Estructura y Rodado', label: 'Estado de Balde / Implementos', status: 'ok', comment: '' },
    { id: '21', category: 'Estructura y Rodado', label: 'Engrase General', status: 'ok', comment: '' },
];

const Logistics: React.FC = () => {
    const { checkPermission } = useAuth();
    const canEdit = checkPermission('/logistics', 'edit');
    const [view, setView] = useState<LogisticsView>('menu');
    const [filter, setFilter] = useState<FilterType>('all');
    const [assetTypeFilter, setAssetTypeFilter] = useState<'ALL' | 'Rodados' | 'Maquinaria' | 'Instalaciones en infraestructuras' | 'Mobiliario' | 'Equipos de Informática'>('ALL');

    // Data State
    const [dbStaff, setDbStaff] = useState<any[]>([]);
    const [dbAssets, setDbAssets] = useState<Asset[]>([]);
    const [dbProjects, setDbProjects] = useState<Project[]>([]);
    const [transfers, setTransfers] = useState<EnhancedTransfer[]>([]);
    const [allocations, setAllocations] = useState<AssetAllocation[]>([]);

    // Form State
    const [isEditing, setIsEditing] = useState(false);

    // ... (rest of the code)

    const fetchStaff = async () => {
        try {
            const { data, error } = await supabase.from('staff').select('*');
            if (error) console.error("Error fetching staff:", error);
            else if (data) setDbStaff(data);
        } catch (e) { console.error(e) }
    };

    useEffect(() => {
        fetchTransfers();
        fetchAssets();
        fetchProjects();
        fetchStaff();
    }, []);


    const [currentTransferId, setCurrentTransferId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<EnhancedTransfer>>({
        assetName: '',
        fromLocation: '',
        toLocation: '',
        responsibleId: '',
        meterReading: 0,
        checklist: [],
        photos: [],
        notes: '',
        aiAnalysis: '',
        conformity: 100
    });
    const [selectedAssetId, setSelectedAssetId] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [allocationForm, setAllocationForm] = useState<{
        id?: string;
        assetIds: string[];
        projectId: string;
        startDate: string;
        endDate: string;
    }>({
        assetIds: [],
        projectId: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '' // Optional now
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Mappers
    const mapAssetFromDB = (data: any): Asset => ({
        ...data,
        id: data.id,
        name: data.name,
        internalId: data.internal_id, // Map snake_case to camelCase
        barcodeId: data.barcode_id,
        dailyRate: data.daily_rate,
        model: data.model || 'Modelo Genérico',
        brand: data.brand || 'Marca Genérica',
        year: data.year || new Date().getFullYear(),
        acquisitionDate: data.acquisition_date || new Date().toISOString(),
        status: data.status || 'Disponible',
        location: data.location || 'Pañol',
        image: data.image || 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80',
        specifications: data.specifications || {},
        history: [],
        maintenanceHistory: [],
        assignedTo: data.assigned_to
    });

    const mapProjectFromDB = (data: any): Project => ({
        ...data,
        id: data.id,
        name: data.name,
        location: data.location || 'Ubicación Desconocida',
        status: data.status || 'Activo',
        internalId: data.internal_id,
        assignedAssets: data.assigned_assets_count || 0,
        assignedStaff: data.assigned_staff_count || 0,
    });

    const loadData = async () => {
        try {
            console.log("Loading Logistics Data...");

            // 1. Fetch Staff
            const { data: staffData } = await supabase.from('staff').select('*');
            if (staffData) setDbStaff(staffData);

            // 2. Fetch Projects
            const { data: projectsData } = await supabase.from('projects').select('*');
            let mappedProjects: Project[] = [];
            if (projectsData) {
                mappedProjects = projectsData.map(mapProjectFromDB);
                setDbProjects(mappedProjects);
            }

            // 3. Fetch All Assets (Split Tables)
            const [
                { data: vehiclesData },
                { data: machineryData },
                { data: itData },
                { data: furnitureData },
                { data: infraData }
            ] = await Promise.all([
                supabase.from('vehicles').select('*'),
                supabase.from('machinery').select('*'),
                supabase.from('it_equipment').select('*'),
                supabase.from('mobiliario').select('*'),
                supabase.from('infrastructures').select('*')
            ]);

            const allAssets: Asset[] = [
                ...(vehiclesData || []).map((a: any) => ({ ...mapAssetFromDB(a), type: 'Rodados' as const, category: 'Vehículo' })),
                ...(machineryData || []).map((a: any) => ({ ...mapAssetFromDB(a), type: 'Maquinaria' as const, category: 'Equipo/Maquinaria' })),
                ...(itData || []).map((a: any) => ({ ...mapAssetFromDB(a), type: 'Equipos de Informática' as const, category: 'Equipos' })),
                ...(furnitureData || []).map((a: any) => ({ ...mapAssetFromDB(a), type: 'Mobiliario' as const, category: 'Mobiliario' })),
                ...(infraData || []).map((db: any) => ({
                    ...db,
                    id: db.id,
                    internalId: db.internal_id,
                    barcodeId: db.barcode_id,
                    name: db.name,
                    description: db.description,
                    location: db.location,
                    status: db.status,
                    image: db.image,
                    ownership: db.ownership,
                    dailyRate: db.daily_rate,
                    regulatoryData: db.regulatory_data || undefined,
                    type: 'Instalaciones en infraestructuras' as const,
                    hours: 0,
                    averageDailyUsage: 0,
                    category: 'Inmueble/Infraestructura',
                    functionalDescription: db.functional_description,
                    complementaryDescription: db.complementary_description,
                    expirations: [],
                    incidents: []
                } as Asset))
            ];
            setDbAssets(allAssets);

            // 4. Fetch Transfers (Raw)
            const { data: transfersData, error: transfersError } = await supabase
                .from('asset_transfers')
                .select(`
                    *,
                    staff (name)
                `)
                .order('created_at', { ascending: false });

            if (transfersError) console.error("Error fetching transfers:", transfersError);

            if (transfersData) {
                const mappedTransfers: EnhancedTransfer[] = transfersData.map((t: any) => {
                    const asset = allAssets.find(a => a.id === t.asset_id);
                    return {
                        id: t.id,
                        assetName: asset?.name || 'Desconocido',
                        fromLocation: t.from_location,
                        toLocation: t.to_location,
                        date: t.transfer_date,
                        status: t.status,
                        meterReading: t.meter_reading,
                        type: t.type,
                        checklist: t.checklist || [],
                        photos: t.photos || [],
                        notes: t.notes,
                        responsibleId: t.responsible_id,
                        conformity: t.conformity || 100,
                        aiAnalysis: t.ai_analysis
                    };
                });
                setTransfers(mappedTransfers);
            }

            // 5. Fetch Allocations (Raw)
            const { data: allocData, error: allocError } = await supabase
                .from('asset_allocations')
                .select(`
                    *,
                    projects (name)
                `)
                .order('start_date', { ascending: true });

            if (allocError) console.error("Error fetching allocations:", allocError);

            if (allocData) {
                const mappedAllocations: AssetAllocation[] = allocData.map((a: any) => {
                    const asset = allAssets.find(asst => asst.id === a.asset_id);
                    return {
                        id: a.id,
                        assetId: a.asset_id,
                        assetName: asset?.name || 'Desconocido',
                        projectId: a.project_id,
                        projectName: a.projects?.name || 'Desconocido',
                        startDate: a.start_date,
                        endDate: a.end_date,
                        status: a.status
                    };
                });
                setAllocations(mappedAllocations);
            }

        } catch (e) {
            console.error("Critical error loading logistics data:", e);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Also expose refresh function keeping the old name if used elsewhere, 
    // or just rely on loadData.
    // The previous code used fetchTransfers() to refresh after save.
    // We'll map fetchTransfers to loadData for compatibility with handleSaveTransfer
    const fetchTransfers = loadData; // Alias for refresh

    // Helpers
    // For single selection display (if only 1 selected) - mostly for header preview
    const selectedAssetData = useMemo(() => {
        if (allocationForm.assetIds.length === 1) {
            return dbAssets.find(a => a.id === allocationForm.assetIds[0]);
        } else if (allocationForm.assetIds.length > 1) {
            return {
                id: 'multiple',
                name: `${allocationForm.assetIds.length} Activos Seleccionados`,
                internalId: 'VARIOS',
                location: 'Múltiples Ubicaciones',
                image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80', // Box/Collection image
                status: 'Disponible'
            } as any; // Cast to any to simpler handling in UI without changing Asset type heavily
        }
        return null;
    }, [allocationForm.assetIds, dbAssets]);
    const assetForTransfer = useMemo(() => dbAssets.find(a => a.id === selectedAssetId), [selectedAssetId, dbAssets]);

    // Combined locations list
    const availableLocations = useMemo(() => {
        const projects = dbProjects.map(p => p.name);
        return ['Pañol Central', 'Taller Central', ...projects];
    }, [dbProjects]);

    // Group items by category for the form
    const groupedChecklist = useMemo(() => {
        const groups: Record<string, ChecklistItem[]> = {};
        if (formData.checklist) {
            formData.checklist.forEach(item => {
                if (!groups[item.category]) groups[item.category] = [];
                groups[item.category].push(item);
            });
        }
        return groups;
    }, [formData.checklist]);

    const calculateConformity = (items: ChecklistItem[]) => {
        if (!items || items.length === 0) return 0;
        const approved = items.filter(i => i.status === 'ok').length;
        return Math.round((approved / items.length) * 100);
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'bg-green-500 text-white';
        if (score >= 70) return 'bg-yellow-500 text-white';
        return 'bg-red-500 text-white';
    };

    // --- ACTIONS ---

    const handleOpenForm = (type: 'Ingreso' | 'Salida') => {
        setFormData({
            type: type,
            assetName: '',
            fromLocation: type === 'Salida' ? 'Pañol Central' : '',
            toLocation: type === 'Ingreso' ? 'Pañol Central' : '',
            responsibleId: '',
            meterReading: 0,
            checklist: JSON.parse(JSON.stringify(UNIFIED_CHECKLIST_ITEMS)), // Initialize with full list
            photos: [],
            notes: '',
            date: new Date().toISOString().split('T')[0],
            conformity: 100
        });
        setSelectedAssetId('');
        setIsEditing(false);
        setView('form');
    };

    const handleEditTransfer = (transfer: EnhancedTransfer) => {
        setFormData({ ...transfer });
        const asset = dbAssets.find(a => a.name === transfer.assetName);
        setSelectedAssetId(asset ? asset.id : '');
        setCurrentTransferId(transfer.id);
        setIsEditing(true);
        setView('form');
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    setFormData(prev => ({
                        ...prev,
                        photos: [...(prev.photos || []), ev.target?.result as string]
                    }));
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const removePhoto = (index: number) => {
        setFormData(prev => ({
            ...prev,
            photos: prev.photos?.filter((_, i) => i !== index)
        }));
    };

    const toggleChecklistItem = (itemId: string, newStatus: 'ok' | 'fail') => {
        if (!formData.checklist) return;
        const newChecklist = formData.checklist.map(item =>
            item.id === itemId ? { ...item, status: newStatus } : item
        );
        const newScore = calculateConformity(newChecklist);
        setFormData({ ...formData, checklist: newChecklist, conformity: newScore });
    };

    const updateChecklistComment = (itemId: string, comment: string) => {
        if (!formData.checklist) return;
        const newChecklist = formData.checklist.map(item =>
            item.id === itemId ? { ...item, comment } : item
        );
        setFormData({ ...formData, checklist: newChecklist });
    };

    const handleAnalyzeAI = async () => {
        if (!formData.photos || formData.photos.length === 0) {
            alert("Sube al menos una foto para analizar.");
            return;
        }
        setIsAnalyzing(true);
        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) {
                alert("API Key de Gemini no encontrada. Verifique su configuración.");
                setIsAnalyzing(false);
                return;
            }
            const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1' });
            const parts: any[] = [
                { text: "Analiza estas imágenes del activo para un reporte de logística. Identifica daños visibles, suciedad excesiva, desgaste de neumáticos o cualquier anomalía. Sé breve, técnico y directo." }
            ];
            for (const base64Data of formData.photos) {
                const base64String = base64Data.split(',')[1];
                parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64String } });
            }

            let response;
            try {
                // RESET TO STANDARD
                response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: [{ role: 'user', parts: parts }]
                });
            } catch (e) {
                console.error("AI Logistics Failed", e);
                throw e;
            }

            setFormData(prev => ({ ...prev, aiAnalysis: response.text }));
        } catch (error) {
            console.error("AI Analysis Failed", error);
            alert("Error al conectar con el servicio de IA.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSaveTransfer = async () => {
        if (!selectedAssetId && !formData.assetName) {
            alert("Seleccione un activo.");
            return;
        }
        if (!formData.responsibleId) {
            alert("Seleccione un responsable.");
            return;
        }
        if (!formData.fromLocation || !formData.toLocation) {
            alert("Indique origen y destino.");
            return;
        }

        const finalConformity = calculateConformity(formData.checklist || []);

        const transferPayload = {
            asset_id: selectedAssetId,
            from_location: formData.fromLocation || '-',
            to_location: formData.toLocation || '-',
            transfer_date: formData.date || new Date().toISOString().split('T')[0],
            status: 'Completado',
            type: formData.type,
            responsible_id: formData.responsibleId || null,
            checklist: formData.checklist,
            photos: formData.photos,
            notes: formData.notes,
            meter_reading: formData.meterReading,
            conformity: finalConformity,
            ai_analysis: formData.aiAnalysis
        };

        try {
            let savedData;
            if (isEditing && currentTransferId) {
                const { data, error } = await supabase
                    .from('asset_transfers')
                    .update(transferPayload)
                    .eq('id', currentTransferId)
                    .select()
                    .single();
                if (error) throw error;
                savedData = data;
            } else {
                const { data, error } = await supabase
                    .from('asset_transfers')
                    .insert(transferPayload)
                    .select()
                    .single();
                if (error) throw error;
                savedData = data;
            }

            // CRITICAL: Update Asset Location
            if (formData.toLocation) {
                const { error: assetError } = await supabase
                    .from('assets')
                    .update({
                        location: formData.toLocation,
                        status: formData.toLocation.includes('Taller') ? 'En Taller' : 'En Obra'
                    })
                    .eq('id', selectedAssetId);

                if (assetError) console.error("Error updating asset location:", assetError);
                else {
                    // Update local asset state
                    setDbAssets(prev => prev.map(a => a.id === selectedAssetId ? {
                        ...a,
                        location: formData.toLocation!,
                        status: formData.toLocation!.includes('Taller') ? 'En Taller' : 'En Obra' as any
                    } : a));
                }
            }

            alert("Transferencia registrada y ubicación actualizada.");
            fetchTransfers(); // Refresh list
            setView('list');

        } catch (e: any) {
            console.error("Error saving transfer:", e);
            alert("Error al guardar: " + e.message);
        }
    };

    const handleSaveAllocation = async () => {
        if (allocationForm.assetIds.length === 0 || !allocationForm.projectId) {
            alert("Por favor seleccione al menos un activo y una obra de destino.");
            return;
        }

        try {
            if (allocationForm.id) {
                // Update Single Allocation (Legacy behavior for editing single)
                // Note: We only allow editing one at a time for simplicity usually, 
                // but our form now supports multi-select. 
                // If editing, we assume assetIds has 1 item.

                const payload = {
                    asset_id: allocationForm.assetIds[0],
                    project_id: allocationForm.projectId,
                    start_date: allocationForm.startDate,
                    end_date: allocationForm.endDate || null, // Handle optional
                    status: 'Programado'
                };

                const { error } = await supabase
                    .from('asset_allocations')
                    .update(payload)
                    .eq('id', allocationForm.id);
                if (error) throw error;
            } else {
                // Insert Multiple
                const payloads = allocationForm.assetIds.map(assetId => ({
                    asset_id: assetId,
                    project_id: allocationForm.projectId,
                    start_date: allocationForm.startDate,
                    end_date: allocationForm.endDate || null, // Handle optional
                    status: 'Programado'
                }));

                const { error } = await supabase
                    .from('asset_allocations')
                    .insert(payloads);
                if (error) throw error;
            }

            alert("Cronograma actualizado.");
            fetchTransfers(); // Refresh allocations as well
            setView('schedule');
        } catch (e: any) {
            console.error("Error saving allocation:", e);
            alert("Error: " + e.message);
        }
    };

    const handleEditAllocation = (alloc: AssetAllocation) => {
        setAllocationForm({
            id: alloc.id,
            assetIds: [alloc.assetId],
            projectId: alloc.projectId,
            startDate: alloc.startDate,
            endDate: alloc.endDate || ''
        });
        setView('allocation_form');
    };

    const handleNewAllocation = () => {
        setAllocationForm({
            id: undefined,
            assetIds: [],
            projectId: '',
            startDate: new Date().toISOString().split('T')[0],
            endDate: ''
        });
        setView('allocation_form');
    };

    // --- VIEWS ---

    // 1. ALLOCATION FORM VIEW
    if (view === 'allocation_form') {
        return (
            <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans animate-in slide-in-from-right-5 duration-300">
                <div className="bg-white p-4 sticky top-0 z-10 shadow-sm flex items-center justify-between">
                    <button onClick={() => setView('menu')} className="text-slate-600 p-2 -ml-2 rounded-full hover:bg-slate-50" aria-label="Volver al menú principal"><ChevronLeft size={24} /></button>
                    <h1 className="font-bold text-lg text-slate-800">{allocationForm.id ? 'Editar Asignación' : 'Programar Asignación'}</h1>
                    <button onClick={handleSaveAllocation} className="text-orange-500 font-bold text-sm bg-orange-50 px-3 py-1.5 rounded-full">Confirmar</button>
                </div>
                <div className="p-6 space-y-8">
                    {selectedAssetData && (
                        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex gap-4 animate-in fade-in zoom-in-95">
                            <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-slate-50">
                                <img src={selectedAssetData.image} className="w-full h-full object-cover" alt="Activo seleccionado" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedAssetData.internalId}</p>
                                <h3 className="font-bold text-slate-800 leading-tight mb-1">{selectedAssetData.name}</h3>
                                <div className="flex items-center gap-1 text-[10px] text-orange-500 font-bold uppercase">
                                    <MapPin size={10} /> {selectedAssetData.location}
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Filtrar Activos</label>
                            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                {[
                                    { label: 'Todos', value: 'ALL', icon: <CheckCircle2 size={14} /> },
                                    { label: 'Vehículos', value: 'Rodados', icon: <Truck size={14} /> },
                                    { label: 'Maquinaria', value: 'Maquinaria', icon: <HardHat size={14} /> },
                                    { label: 'Inmuebles', value: 'Instalaciones en infraestructuras', icon: <MapPin size={14} /> },
                                    { label: 'Informática', value: 'Equipos de Informática', icon: <Laptop size={14} /> },
                                    { label: 'Mobiliario', value: 'Mobiliario', icon: <Armchair size={14} /> },
                                ].map(type => (
                                    <button
                                        key={type.value}
                                        onClick={() => setAssetTypeFilter(type.value as any)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${assetTypeFilter === type.value
                                            ? 'bg-slate-800 text-white border-slate-800 shadow-md'
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                            }`}
                                    >
                                        {type.icon}
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Activos a Movilizar ({allocationForm.assetIds.length})</label>

                            <div className="bg-white border border-slate-200 rounded-2xl max-h-60 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                {dbAssets && dbAssets.length > 0 ? (
                                    dbAssets
                                        .filter(a => assetTypeFilter === 'ALL' || a.type === assetTypeFilter)
                                        .map(asset => {
                                            const isSelected = allocationForm.assetIds.includes(asset.id);
                                            return (
                                                <div
                                                    key={asset.id}
                                                    onClick={() => {
                                                        const current = allocationForm.assetIds;
                                                        const newIds = current.includes(asset.id)
                                                            ? current.filter(id => id !== asset.id)
                                                            : [...current, asset.id];
                                                        setAllocationForm({ ...allocationForm, assetIds: newIds });
                                                    }}
                                                    className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-colors ${isSelected ? 'bg-orange-50 border border-orange-100' : 'hover:bg-slate-50 border border-transparent'}`}
                                                >
                                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-300 bg-white'}`}>
                                                        {isSelected && <Check size={12} strokeWidth={4} />}
                                                    </div>
                                                    <div>
                                                        <p className={`text-sm font-bold ${isSelected ? 'text-orange-900' : 'text-slate-700'}`}>{asset.name}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{asset.internalId} • {asset.location}</p>
                                                    </div>
                                                </div>
                                            );
                                        })
                                ) : (
                                    <p className="p-4 text-center text-xs text-slate-400">Cargando activos...</p>
                                )}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Obra de Destino</label>
                            <div className="relative">
                                <select id="project-select" value={allocationForm.projectId} onChange={(e) => setAllocationForm({ ...allocationForm, projectId: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-bold text-slate-800 shadow-sm" aria-label="Seleccionar obra de destino">
                                    <option value="">Seleccionar Obra...</option>
                                    {dbProjects && dbProjects.length > 0 ? dbProjects.map(proj => (<option key={proj.id} value={proj.id}>{proj.name}</option>)) : <option disabled>Cargando obras...</option>}
                                </select>
                                <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Fecha de Inicio</label>
                                <input type="date" value={allocationForm.startDate} onChange={(e) => setAllocationForm({ ...allocationForm, startDate: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-xs font-bold text-slate-700 shadow-sm" aria-label="Fecha de Inicio" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Fecha de Fin</label>
                                <input type="date" value={allocationForm.endDate} onChange={(e) => setAllocationForm({ ...allocationForm, endDate: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-xs font-bold text-slate-700 shadow-sm" aria-label="Fecha de Fin" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 2. CHECK-IN / CHECK-OUT FORM VIEW
    if (view === 'form') {
        const isOut = formData.type === 'Salida';
        const conformity = formData.conformity || 0;

        return (
            <div className="bg-[#F8F9FA] min-h-screen pb-24 font-sans animate-in slide-in-from-right-5 duration-300">
                <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex items-center justify-between">
                    <button onClick={() => setView('menu')} className="text-slate-600 p-2 -ml-2 rounded-full hover:bg-slate-50" aria-label="Cerrar formulario"><X size={24} /></button>
                    <h1 className="font-bold text-lg text-slate-800">{isEditing ? 'Editar Registro' : `Nueva ${formData.type}`}</h1>
                    <button onClick={handleSaveTransfer} className="text-orange-500 font-bold text-sm bg-orange-50 px-3 py-1.5 rounded-full flex items-center gap-1">
                        <Save size={16} /> Guardar
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* General Info */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isOut ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                {isOut ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                            </div>
                            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Datos del Movimiento</h3>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Activo</label>
                            <div className="relative">
                                <select
                                    value={selectedAssetId}
                                    onChange={(e) => {
                                        setSelectedAssetId(e.target.value);
                                        const asset = dbAssets.find(a => a.id === e.target.value);
                                        if (asset) setFormData({ ...formData, assetName: asset.name });
                                    }}
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800 appearance-none"
                                    aria-label="Seleccionar activo"
                                >
                                    <option value="">Seleccionar Activo...</option>
                                    {dbAssets && dbAssets.length > 0 ? dbAssets.map(a => <option key={a.id} value={a.id}>{a.name}</option>) : <option disabled>Cargando...</option>}
                                </select>
                                <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Origen</label>
                                <div className="relative">
                                    <select
                                        value={formData.fromLocation}
                                        onChange={e => setFormData({ ...formData, fromLocation: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border-none rounded-xl text-xs font-bold appearance-none"
                                        aria-label="Seleccionar ubicación de origen"
                                    >
                                        <option value="">Seleccionar...</option>
                                        {availableLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Destino</label>
                                <div className="relative">
                                    <select
                                        value={formData.toLocation}
                                        onChange={e => setFormData({ ...formData, toLocation: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border-none rounded-xl text-xs font-bold appearance-none"
                                        aria-label="Seleccionar ubicación de destino"
                                    >
                                        <option value="">Seleccionar...</option>
                                        {availableLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Responsable del Movimiento</label>
                            <div className="relative">
                                <select
                                    value={formData.responsibleId}
                                    onChange={e => setFormData({ ...formData, responsibleId: e.target.value })}
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium appearance-none text-slate-800"
                                    aria-label="Seleccionar responsable del movimiento"
                                >
                                    <option value="">Seleccionar Personal...</option>
                                    {MOCK_STAFF.map(s => <option key={s.id} value={s.id}>{s.name} - {s.role}</option>)}
                                </select>
                                <User size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Horómetro / Km</label>
                            <input type="number" value={formData.meterReading} onChange={e => setFormData({ ...formData, meterReading: Number(e.target.value) })} className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800" aria-label="Ingresar horómetro o kilometraje actual" placeholder="Ej: 12500" />
                        </div>
                    </div>

                    {/* Conformity Widget */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm flex items-center justify-between sticky top-20 z-10 border border-slate-100">
                        <div>
                            <p className="text-slate-500 text-xs font-bold uppercase mb-1">Evaluación Final</p>
                            <h2 className="text-3xl font-black text-slate-800">{conformity}% <span className="text-sm font-medium text-slate-400">OK</span></h2>
                        </div>
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-xl shadow-inner ${conformity >= 90 ? 'bg-green-100 text-green-600' : conformity >= 70 ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}>
                            {conformity >= 90 ? 'A' : conformity >= 70 ? 'B' : 'C'}
                        </div>
                    </div>

                    {/* Checklist Unificado y Riguroso */}
                    <div className="space-y-8">
                        {Object.entries(groupedChecklist).map(([category, items]: [string, ChecklistItem[]]) => (
                            <div key={category} className="space-y-3">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider px-2">
                                    <span className="w-1.5 h-4 bg-orange-500 rounded-full"></span>{category}
                                </h3>
                                <div className="space-y-3">
                                    {items.map((item) => (
                                        <div key={item.id} className={`bg-white rounded-2xl border p-4 shadow-sm space-y-3 transition-colors ${item.status === 'fail' ? 'border-red-200 ring-2 ring-red-500/10' : 'border-slate-100'}`}>
                                            <div className="flex items-center justify-between">
                                                <span className={`text-sm font-bold ${item.status === 'fail' ? 'text-red-700' : 'text-slate-700'}`}>{item.label}</span>
                                                <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                                                    <button
                                                        onClick={() => toggleChecklistItem(item.id, 'ok')}
                                                        className={`p-2 rounded-lg transition-all ${item.status === 'ok' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                        aria-label="Marcar conforme"
                                                    >
                                                        <CheckCircle2 size={20} />
                                                    </button>
                                                    <button
                                                        onClick={() => toggleChecklistItem(item.id, 'fail')}
                                                        className={`p-2 rounded-lg transition-all ${item.status === 'fail' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                        aria-label="Marcar no conforme"
                                                    >
                                                        <XCircle size={20} />
                                                    </button>
                                                </div>
                                            </div>

                                            <input
                                                type="text"
                                                placeholder={item.status === 'fail' ? "Describa la falla..." : "Observaciones..."}
                                                value={item.comment}
                                                onChange={(e) => updateChecklistComment(item.id, e.target.value)}
                                                className={`w-full bg-slate-50 border-none rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 ${item.status === 'fail' ? 'focus:ring-red-500/20 bg-red-50 placeholder:text-red-300' : 'focus:ring-orange-500/20'}`}
                                                aria-label={item.status === 'fail' ? "Describir la falla encontrada" : "Añadir observaciones opcionales"}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Photos & AI */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                            <Camera size={18} className="text-orange-500" /> Registro Visual e IA
                        </h3>

                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                            <div onClick={() => fileInputRef.current?.click()} className="w-20 h-20 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 shrink-0 cursor-pointer hover:border-orange-300 transition-colors" role="button" aria-label="Agregar nueva foto" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') fileInputRef.current?.click() }}>
                                <Plus size={24} />
                                <span className="text-[8px] font-bold uppercase mt-1">Agregar</span>
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handlePhotoUpload} aria-label="Cargar fotos" />

                            {(formData.photos as string[] | undefined)?.map((photo, idx) => (
                                <div key={idx} className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 relative group">
                                    <img src={photo} className="w-full h-full object-cover" alt="Foto de la inspección" />
                                    <button onClick={() => removePhoto(idx)} className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" aria-label={`Eliminar foto ${idx + 1}`}>
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {formData.photos && (formData.photos as string[]).length > 0 && (
                            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-2xl border border-indigo-100">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-indigo-800 flex items-center gap-1"><Sparkles size={14} /> Análisis IA Gemini</span>
                                    {!isAnalyzing && (
                                        <button onClick={handleAnalyzeAI} className="text-[10px] font-bold bg-white text-indigo-600 px-2 py-1 rounded-lg shadow-sm">
                                            {formData.aiAnalysis ? 'Re-analizar' : 'Analizar Fotos'}
                                        </button>
                                    )}
                                </div>

                                {isAnalyzing ? (
                                    <div className="flex items-center gap-2 text-xs text-indigo-500 py-2">
                                        <Loader2 size={16} className="animate-spin" /> Analizando daños y estado...
                                    </div>
                                ) : (
                                    <p className="text-xs text-indigo-700 leading-relaxed">
                                        {formData.aiAnalysis || "Sube fotos y pulsa analizar para obtener un reporte automático de daños y estado."}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // 3. TRANSFER DETAIL VIEW
    if (view === 'detail' && formData) {
        const responsible = dbStaff.find(s => s.id === formData.responsibleId);
        const conformity = formData.conformity || 0;

        return (
            <div className="bg-[#F8F9FA] min-h-screen pb-24 font-sans animate-in slide-in-from-right-5 duration-300">
                <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex items-center justify-between">
                    <button onClick={() => setView('list')} className="text-slate-600 p-2 -ml-2 rounded-full hover:bg-slate-50" aria-label="Volver a la lista"><ChevronLeft size={24} /></button>
                    <h1 className="font-bold text-lg text-slate-800">Detalle de {formData.type}</h1>
                    {canEdit && (
                        <button onClick={() => handleEditTransfer(formData as EnhancedTransfer)} className="text-orange-500 p-2 bg-orange-50 rounded-full hover:bg-orange-100 transition-colors" aria-label="Editar transferencia">
                            <Edit3 size={20} />
                        </button>
                    )}
                </div>

                <div className="p-6 space-y-6">
                    {/* Status Card */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden">
                        <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl text-[10px] font-bold uppercase tracking-wider text-white ${formData.type === 'Salida' ? 'bg-orange-500' : 'bg-green-500'}`}>
                            {formData.type}
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mt-2 mb-1">{formData.assetName}</h2>
                        <p className="text-xs text-slate-400 font-bold uppercase mb-4">{formData.date}</p>

                        <div className="flex items-center gap-3 text-sm font-medium text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
                            <MapPin size={16} className="text-orange-500" />
                            <span className="truncate">{formData.fromLocation}</span>
                            <ArrowRight size={14} className="text-slate-300 shrink-0" />
                            <span className="truncate">{formData.toLocation}</span>
                        </div>

                        {/* Score Badge */}
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                            <span className="text-xs font-bold text-slate-500">Evaluación de Estado</span>
                            <span className={`text-xs font-black px-3 py-1 rounded-lg ${getScoreColor(conformity)}`}>
                                {conformity}% {conformity >= 90 ? '(A)' : conformity >= 70 ? '(B)' : '(C)'}
                            </span>
                        </div>
                    </div>

                    {/* Checklist Display */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                            <CheckCircle2 size={18} className="text-orange-500" /> Resultado Inspección
                        </h3>
                        <div className="space-y-4">
                            {Object.entries(groupedChecklist).map(([category, items]: [string, ChecklistItem[]]) => {
                                if (!items || items.length === 0) return null;
                                return (
                                    <div key={category} className="space-y-1">
                                        <h4 className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">{category}</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {items.map((item, idx) => (
                                                <div key={idx} className={`p-2 rounded-lg border flex flex-col gap-1 ${item.status === 'ok' ? 'bg-slate-50 border-slate-100' : 'bg-red-50 border-red-200'}`}>
                                                    <div className="flex items-center justify-between">
                                                        <span className={`text-[10px] font-bold ${item.status === 'ok' ? 'text-slate-600' : 'text-red-600'} leading-tight`}>{item.label}</span>
                                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white ${item.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`}>
                                                            {item.status === 'ok' ? <Check size={10} /> : <X size={10} />}
                                                        </div>
                                                    </div>
                                                    {item.comment && (
                                                        <p className="text-[9px] text-slate-500 italic border-t border-slate-200/50 pt-1 mt-1">{item.comment}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* AI Analysis & Photos */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                            <ScanEye size={18} className="text-indigo-500" /> Inspección Visual IA
                        </h3>

                        {formData.aiAnalysis ? (
                            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 mb-4">
                                <div className="flex gap-2 mb-2 text-indigo-700 font-bold text-xs items-center">
                                    <Sparkles size={14} /> Reporte Gemini
                                </div>
                                <p className="text-xs text-indigo-800 leading-relaxed">
                                    {formData.aiAnalysis}
                                </p>
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400 italic mb-4">Sin análisis de IA registrado.</p>
                        )}

                        <div className="grid grid-cols-3 gap-2">
                            {(formData.photos as string[] | undefined)?.map((photo, idx) => (
                                <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                                    <img src={photo} className="w-full h-full object-cover" alt="Foto de la inspección" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 4. MAIN MENU VIEW
    if (view === 'menu') {
        return (
            <div className="bg-[#F8F9FA] min-h-screen p-6 md:p-8 space-y-8 font-sans">
                <div className="flex justify-between items-center mb-2">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Logística</h1>
                        <p className="text-sm text-slate-400 font-medium">Control de movimientos y activos</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-orange-500 p-0.5 shadow-lg shadow-orange-200">
                        <img src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=100" className="w-full h-full object-cover rounded-[14px]" alt="Perfil" />
                    </div>
                </div>

                <div className="space-y-5">
                    {canEdit && (
                        <>
                            <button onClick={() => setView('allocation_form')} className="w-full bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-200 relative overflow-hidden group active:scale-[0.98] transition-all" aria-label="Asignar Activo a Obra">
                                <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl group-hover:bg-orange-500/30 transition-colors"></div>
                                <div className="flex items-center gap-5 relative z-10">
                                    <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                                        <CalendarDays size={28} className="text-white" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <h2 className="text-lg font-bold">Asignar Activo a Obra</h2>
                                        <p className="text-xs text-white/50 font-medium">Programar fechas y destinos</p>
                                    </div>
                                    <ChevronRight size={20} className="text-white/20 group-hover:text-orange-500 transition-colors" />
                                </div>
                            </button>

                            <div className="grid grid-cols-2 gap-5">
                                <button onClick={() => handleOpenForm('Salida')} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center gap-4 group active:scale-95 transition-all hover:border-orange-200" aria-label="Registrar Salida">
                                    <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                                        <ArrowUpRight size={28} />
                                    </div>
                                    <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Salida</span>
                                </button>
                                <button onClick={() => handleOpenForm('Ingreso')} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center gap-4 group active:scale-95 transition-all hover:border-green-200" aria-label="Registrar Ingreso">
                                    <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
                                        <ArrowDownLeft size={28} />
                                    </div>
                                    <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Ingreso</span>
                                </button>
                            </div>
                        </>
                    )}

                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                        <button onClick={() => setView('schedule')} className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors" aria-label="Ver Cronograma">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500"><History size={24} /></div>
                                <div className="text-left"><h3 className="font-bold text-slate-800">Cronograma Completo</h3><p className="text-xs text-slate-400">Ver todas las afectaciones</p></div>
                            </div>
                            <ChevronRight size={20} className="text-slate-300" />
                        </button>
                    </div>

                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                        <button onClick={() => setView('list')} className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors" aria-label="Ver Historial">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500"><Truck size={24} /></div>
                                <div className="text-left"><h3 className="font-bold text-slate-800">Historial de Movimientos</h3><p className="text-xs text-slate-400">Registro de ingresos y salidas</p></div>
                            </div>
                            <ChevronRight size={20} className="text-slate-300" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 5. SCHEDULE VIEW
    if (view === 'schedule') {
        return (
            <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans">
                <div className="bg-white p-4 sticky top-0 z-10 shadow-sm flex items-center justify-between">
                    <button onClick={() => setView('menu')} className="text-slate-600 p-2 -ml-2 rounded-full hover:bg-slate-50" aria-label="Volver al menú principal"><ChevronLeft size={24} /></button>
                    <h1 className="font-bold text-lg text-slate-800">Cronograma de Afectación</h1>
                    {canEdit && <button onClick={handleNewAllocation} className="text-orange-500 font-bold text-sm p-2" aria-label="Crear nueva asignación"><Plus size={24} /></button>}
                </div>
                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        {allocations.map((alloc: AssetAllocation) => {
                            const isCurrent = alloc.status === 'Activo';
                            // Calculate rental cost logic
                            const asset = MOCK_ASSETS.find(a => a.id === alloc.assetId);
                            let totalCost = 0;
                            let durationDays = 0;

                            if (asset && alloc.startDate && alloc.endDate) {
                                const start = new Date(alloc.startDate);
                                const end = new Date(alloc.endDate);
                                // Simple diff including start day
                                const diffTime = Math.abs(end.getTime() - start.getTime());
                                durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                                totalCost = durationDays * (asset.dailyRate || 0);
                            }

                            return (
                                <div key={alloc.id} className={`bg-white p-5 rounded-3xl border shadow-sm relative overflow-hidden transition-all ${isCurrent ? 'border-orange-400 ring-4 ring-orange-500/5' : 'border-slate-100'}`}>
                                    {isCurrent && <div className="absolute top-0 right-0 bg-orange-500 text-white text-[9px] font-bold px-3 py-1 rounded-bl-xl">VIGENTE</div>}
                                    <div className="flex gap-4 items-start">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-bold text-slate-800 text-sm truncate">{alloc.assetName}</h3>
                                                {canEdit && (
                                                    <button onClick={() => handleEditAllocation(alloc)} className="text-slate-400 hover:text-orange-500 p-1 -mt-1 -mr-2" aria-label="Editar asignación">
                                                        <Edit3 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-2"><div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0"><HardHat size={14} className="text-slate-400" /></div><span className="text-sm font-bold text-slate-600 truncate">{alloc.projectName}</span></div>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                                        <div className="flex flex-col"><span className="text-slate-400 font-bold uppercase text-[8px] tracking-wider mb-1">Inicio</span><span className="font-bold text-slate-700 text-xs flex items-center gap-1.5"><Calendar size={12} className="text-orange-500" /> {alloc.startDate}</span></div>
                                        <ArrowRight size={16} className="text-slate-200" />
                                        <div className="flex flex-col items-end"><span className="text-slate-400 font-bold uppercase text-[8px] tracking-wider mb-1">Finalización</span><span className="font-bold text-slate-700 text-xs flex items-center gap-1.5"><Calendar size={12} className="text-slate-300" /> {alloc.endDate}</span></div>
                                    </div>

                                    {/* RENTAL COST SECTION */}
                                    {totalCost > 0 && (
                                        <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between items-center bg-slate-50/50 p-2 rounded-xl">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-400"><Clock size={12} /></div>
                                                <span className="text-xs font-bold text-slate-600">{durationDays} días</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase mr-1">Costo Est.</span>
                                                <span className="text-sm font-black text-slate-800">${totalCost.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // 6. LIST VIEW (Default Fallback)
    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-24 font-sans">
            <div className="bg-white px-6 pt-6 pb-4 sticky top-0 z-10 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => setView('menu')} className="text-slate-600 p-2 -ml-2 rounded-full hover:bg-slate-50" aria-label="Volver"><ChevronLeft size={24} /></button>
                    <h1 className="font-bold text-lg text-slate-800">Historial Logístico</h1>
                    <button className="text-slate-400 p-2" aria-label="Buscar"><Search size={24} /></button>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl mb-2">
                    <button onClick={() => setFilter('all')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${filter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`} aria-label="Filtrar por Todos">Todos</button>
                    <button onClick={() => setFilter('out')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${filter === 'out' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`} aria-label="Filtrar por Salidas">Salidas</button>
                    <button onClick={() => setFilter('in')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${filter === 'in' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500'}`} aria-label="Filtrar por Ingresos">Ingresos</button>
                </div>
            </div>

            <div className="p-6 space-y-4">
                {transfers.filter(t => filter === 'all' || (filter === 'out' && t.type === 'Salida') || (filter === 'in' && t.type === 'Ingreso')).map(item => (
                    <div
                        key={item.id}
                        onClick={() => { setFormData({ ...item }); setView('detail'); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setFormData({ ...item }); setView('detail'); } }}
                        role="button"
                        tabIndex={0}
                        aria-label={`Ver detalles de movimiento: ${item.assetName}`}
                        className="bg-white p-5 rounded-3xl shadow-sm border border-slate-50 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-all relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    >
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${getScoreColor(item.conformity || 100).split(' ')[0]}`}></div>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${item.type === 'Salida' ? 'bg-orange-50 text-orange-500' : 'bg-green-50 text-green-600'}`}>
                            {item.type === 'Salida' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold text-slate-800 text-sm truncate">{item.assetName}</h3>
                                <div className="flex items-center gap-2">
                                    {item.conformity !== undefined && (
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded text-white ${getScoreColor(item.conformity).split(' ')[0]}`}>
                                            {item.conformity}%
                                        </span>
                                    )}
                                    <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase">{item.type}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-[10px] text-slate-500 truncate w-full">
                                    {item.fromLocation} <span className="text-slate-300">➔</span> {item.toLocation}
                                </p>
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                <span className="flex items-center gap-1"><Calendar size={10} /> {item.date}</span>
                                {item.aiAnalysis && <span>• <Sparkles size={10} className="inline text-indigo-400" /> IA</span>}
                            </div>
                        </div>
                        <ChevronRight size={18} className="text-slate-300" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Logistics;
