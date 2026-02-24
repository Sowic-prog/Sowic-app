
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    Calendar as CalendarIcon, AlertCircle, CheckCircle2, Clock, Sparkles,
    PenTool, Plus, ClipboardCheck, ChevronRight, ChevronLeft, X, AlertTriangle,
    BarChart3, Save, Truck, Camera, MessageSquare, Image as ImageIcon, ChevronDown,
    Loader2, ScanEye, FileInput, Wrench, CalendarPlus, TrendingUp, Zap, History, Info,
    Filter, Trash2, User, Repeat, CalendarClock, Edit3
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { useNavigate, useLocation } from 'react-router-dom';
import { MOCK_MAINTENANCE_PLANS } from '../constants';
import { WorkOrderStatus, WorkOrderPriority, Checklist, ChecklistItem, WorkOrderUpdate, Asset, Staff } from '../types';

import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const mapAssetFromDB = (dbAsset: any): Asset => ({
    ...dbAsset,
    internalId: dbAsset.internal_id,
    barcodeId: dbAsset.barcode_id,
    dailyRate: dbAsset.daily_rate,
    originYear: dbAsset.origin_year,
    usefulLifeRemaining: dbAsset.useful_life_remaining,
    accountingAccount: dbAsset.accounting_account,
    functionalDescription: dbAsset.functional_description,
    complementaryDescription: dbAsset.complementary_description,
    domainNumber: dbAsset.domain_number,
    chassisNumber: dbAsset.chassis_number,
    engineNumber: dbAsset.engine_number,
    insuranceProvider: dbAsset.insurance_provider,
    regulatoryData: dbAsset.regulatory_data || undefined,
    averageDailyUsage: dbAsset.average_daily_usage,
    expirations: dbAsset.expirations || [],
    incidents: dbAsset.incidents || [],
});

// Helper for Checklists mapping
const mapChecklistFromDB = (db: any): Checklist => ({
    id: db.mock_id || db.id, // Fallback to ID if mock_id missing
    assetId: db.asset_id,
    assetName: db.asset_name,
    date: db.date,
    inspector: db.inspector,
    conformity: db.conformity,
    items: db.items || []
});

const mapWorkOrderFromDB = (db: any): any => ({ // Using any to avoid strict interface mismatch on WorkOrder vs DB
    id: db.mock_id || db.id,
    title: db.title,
    assetId: db.asset_id,
    assetName: db.asset_name,
    status: db.status,
    priority: db.priority,
    dateStart: db.date_start,
    responsible: db.responsible,
    description: db.description,
    updates: db.updates || [],
    expenses: db.expenses || [],
    initialLog: db.initial_log,
    projectId: db.project_id,
    projectName: db.project_name,
    dueDate: db.date_due
});

interface PreventiveTask {
    id: string;
    assetId: string;
    assetName: string;
    task: string;
    date: string;
    time: string;
    frequency: 'Diaria' | 'Semanal' | 'Mensual';
    nextDue: string;
}

const WorkOrderListItem = React.memo(({ order, onClick, onEdit, onDelete, getPriorityColor, canEdit }: any) => {
    return (
        <div onClick={() => onClick(order)} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden cursor-pointer group hover:border-orange-200 transition-colors optimize-visibility"
        >
            <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[10px] font-bold uppercase border-b border-l ${getPriorityColor(order.priority)}`}>{order.priority}</div>
            <div>
                <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{order.id}</span>
                <h4 className="font-bold text-slate-800 text-lg leading-tight mt-0.5">{order.title}</h4>
                <p className="text-xs text-slate-500 mt-1">{order.assetName}</p>
            </div>
            <div className="pt-3 mt-3 border-t border-slate-50 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5"><CalendarIcon size={14} /> {order.dateStart}</span>
                <div className="flex items-center gap-2">
                    {canEdit && (
                        <>
                            <button
                                onClick={(e) => onEdit(e, order)}
                                className="p-1.5 text-slate-300 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors z-10"
                                title="Editar Orden"
                            >
                                <Edit3 size={16} />
                            </button>
                            <button
                                onClick={(e) => onDelete(e, order.id)}
                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors z-10"
                                title="Eliminar Orden"
                            >
                                <Trash2 size={16} />
                            </button>
                        </>
                    )}
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-orange-500" />
                </div>
            </div>
        </div>
    );
});

const Maintenance: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { checkPermission } = useAuth();
    const canEdit = checkPermission('/maintenance', 'edit');
    const [activeTab, setActiveTab] = useState<'orders' | 'checklists' | 'predictive' | 'preventive'>('orders');

    const [isCreatingChecklist, setIsCreatingChecklist] = useState(false);
    const [checklistAsset, setChecklistAsset] = useState('');
    const [checklistResponsible, setChecklistResponsible] = useState('');
    const [createOtOption, setCreateOtOption] = useState(false); // State for the OT generation question
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activePhotoItemId, setActivePhotoItemId] = useState<string | null>(null);
    const [analyzingItemId, setAnalyzingItemId] = useState<string | null>(null);

    const [isCreatingOT, setIsCreatingOT] = useState(false);
    const [otFormData, setOtFormData] = useState({
        id: '' as string,
        title: '',
        assetId: '',
        assetName: '',
        projectId: '', // New field
        projectName: '', // New field
        priority: 'Media',
        date: new Date().toISOString().split('T')[0],
        description: '',
        initialLog: '',

        maintenancePlanId: '',
        maintenanceEventId: '',
        dueDate: '',
        serviceRequestId: '' // New field for linkage
    });

    const [workOrders, setWorkOrders] = useState<any[]>([]);
    const [checklists, setChecklists] = useState<Checklist[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [staff, setStaff] = useState<Staff[]>([]);
    const [projects, setProjects] = useState<any[]>([]); // New State
    const [loading, setLoading] = useState(true);

    // Preventive Maintenance State
    const [isPreventiveModalOpen, setIsPreventiveModalOpen] = useState(false);
    const [preventiveTasks, setPreventiveTasks] = useState<PreventiveTask[]>([]);
    const [newPreventive, setNewPreventive] = useState<Partial<PreventiveTask>>({
        assetId: '',
        task: '',
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        frequency: 'Mensual'
    });

    const [assetTypeFilter, setAssetTypeFilter] = useState<'ALL' | 'Rodados' | 'Maquinaria' | 'Instalaciones en infraestructuras' | 'Mobiliario' | 'Equipos de Informática'>('ALL');

    // Fetch Data from Supabase
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // Work Orders
                const { data: woData } = await supabase.from('work_orders').select('*').order('created_at', { ascending: false });
                if (woData) setWorkOrders(woData.map(mapWorkOrderFromDB));

                // Checklists
                const { data: chkData } = await supabase.from('checklists').select('*').order('created_at', { ascending: false });
                if (chkData) setChecklists(chkData.map(mapChecklistFromDB));

                // Assets & Infrastructures (for dropdowns)
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
                    ...(vehiclesData || []).map(a => ({ ...mapAssetFromDB(a), type: 'Rodados' as const, category: 'Vehículo' })),
                    ...(machineryData || []).map(a => ({ ...mapAssetFromDB(a), type: 'Maquinaria' as const, category: 'Equipo/Maquinaria' })),
                    ...(itData || []).map(a => ({ ...mapAssetFromDB(a), type: 'Equipos de Informática' as const, category: 'Equipos' })),
                    ...(furnitureData || []).map(a => ({ ...mapAssetFromDB(a), type: 'Mobiliario' as const, category: 'Mobiliario' })),
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

                setAssets(allAssets);

                // Staff (for dropdowns)
                const { data: stfData } = await supabase.from('staff').select('*');
                if (stfData) setStaff(stfData as any);

                // Projects (Active)
                const { data: projData } = await supabase
                    .from('projects')
                    .select('id, name')
                    .or('status.eq.Activa,status.eq.Planificación');
                if (projData) setProjects(projData);

            } catch (error) {
                console.error("Error fetching maintenance data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const [isAnalyzingIA, setIsAnalyzingIA] = useState(false);

    // Handle incoming navigation state (e.g., from Assets page or Maintenance Plans)
    useEffect(() => {
        if (location.state) {
            const state = location.state as any;
            if (state.action === 'createOT' && state.assetId) {
                setActiveTab('orders');
                setOtFormData(prev => ({
                    ...prev,
                    assetId: state.assetId,
                    assetName: state.assetName || '',
                    title: state.title || (state.assetName ? `Mantenimiento: ${state.internalId || state.assetName}` : ''),
                    description: state.description || prev.description,
                    priority: state.priority || prev.priority,
                    date: state.date || prev.date,
                    initialLog: state.initialLog || '',
                    maintenancePlanId: state.maintenancePlanId || '',
                    maintenanceEventId: state.maintenanceEventId || '',

                    dueDate: state.dueDate || '',
                    serviceRequestId: state.serviceRequestId || ''
                }));
                setIsCreatingOT(true);
            } else if (state.action === 'editOT' && state.order) {
                setActiveTab('orders');
                const order = state.order;
                setOtFormData({
                    id: order.id,
                    title: order.title,
                    assetId: order.assetId,
                    assetName: order.assetName,
                    projectId: order.projectId || '',
                    projectName: order.projectName || '',
                    priority: order.priority,
                    date: order.dateStart,
                    description: order.description,
                    initialLog: '',
                    maintenancePlanId: order.maintenancePlanId || '',
                    maintenanceEventId: order.maintenanceEventId || '',
                    dueDate: order.dueDate || '',
                    serviceRequestId: '' // Add missing field
                });
                setIsCreatingOT(true);
            } else if (state.action === 'createChecklist' && state.assetId) {
                setActiveTab('checklists');
                setChecklistAsset(state.assetId);
                setIsCreatingChecklist(true);
            }
            // Clear state to prevent reopening on simple refresh (in a real app, use history.replace)
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    // Checklist Ampliado y Riguroso
    const ROBUST_CHECKLIST_ITEMS: ChecklistItem[] = [
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

    const [items, setItems] = useState<ChecklistItem[]>(ROBUST_CHECKLIST_ITEMS);

    const groupedItems = useMemo(() => {
        const groups: Record<string, ChecklistItem[]> = {};
        items.forEach(item => {
            if (!groups[item.category]) groups[item.category] = [];
            groups[item.category].push(item);
        });
        return groups;
    }, [items]);

    // Simulamos sugerencias predictivas de IA
    const predictiveSuggestions = useMemo(() => {
        return [
            {
                id: 'pred-001',
                assetName: 'Retroexcavadora New Holland B90B',
                suggestion: 'Revisión de sellos hidráulicos del brazo principal',
                date: '2024-05-28',
                confidence: 88,
                reason: 'Patrón de vibración atípico detectado en últimos 3 ciclos de trabajo.',
                priority: 'Alta'
            },
            {
                id: 'pred-002',
                assetName: 'Toyota Hilux SRX 4x4',
                suggestion: 'Limpieza de inyectores y filtro de combustible',
                date: '2024-06-05',
                confidence: 72,
                reason: 'Incremento del 15% en consumo de combustible respecto a media estacional.',
                priority: 'Media'
            }
        ];
    }, []);

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'Crítica': case 'Alta': return 'text-red-600 bg-red-50 border-red-100';
            case 'Media': return 'text-orange-600 bg-orange-50 border-orange-100';
            default: return 'text-slate-600 bg-slate-50 border-slate-100';
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'bg-green-500 text-white';
        if (score >= 70) return 'bg-yellow-500 text-white';
        return 'bg-red-500 text-white';
    };

    const calculateConformity = () => {
        const total = items.length;
        const approved = items.filter(i => i.status === 'ok').length;
        return Math.round((approved / total) * 100);
    };

    const handleSavePreventive = () => {
        if (!newPreventive.assetId || !newPreventive.task) {
            alert("Seleccione un activo y describa la tarea.");
            return;
        }

        const asset = assets.find(a => a.id === newPreventive.assetId);

        // Update Mode
        if (newPreventive.id) {
            const updatedTasks = preventiveTasks.map(t =>
                t.id === newPreventive.id ? {
                    ...t,
                    assetId: newPreventive.assetId!,
                    assetName: asset?.name || 'Desconocido',
                    task: newPreventive.task!,
                    date: newPreventive.date!,
                    time: newPreventive.time!,
                    frequency: newPreventive.frequency as any,
                    nextDue: newPreventive.date! // Simple logic for demo
                } : t
            );
            setPreventiveTasks(updatedTasks);
        }
        // Create Mode
        else {
            const newTask: PreventiveTask = {
                id: Math.random().toString(36).substr(2, 9),
                assetId: newPreventive.assetId,
                assetName: asset?.name || 'Desconocido',
                task: newPreventive.task,
                date: newPreventive.date || new Date().toISOString().split('T')[0],
                time: newPreventive.time || '09:00',
                frequency: newPreventive.frequency as any,
                nextDue: newPreventive.date || new Date().toISOString().split('T')[0]
            };
            setPreventiveTasks([newTask, ...preventiveTasks]);
        }

        setIsPreventiveModalOpen(false);
        setNewPreventive({ assetId: '', task: '', date: new Date().toISOString().split('T')[0], time: '09:00', frequency: 'Mensual' });
    };

    const handleEditPreventive = (task: PreventiveTask) => {
        setNewPreventive({ ...task });
        setIsPreventiveModalOpen(true);
    };

    const handleDeletePreventive = (id: string) => {
        if (window.confirm("¿Estás seguro de eliminar esta tarea preventiva?")) {
            setPreventiveTasks(prev => prev.filter(t => t.id !== id));
        }
    };

    const handleSaveChecklist = () => {
        if (!checklistAsset || !checklistResponsible) {
            alert("Por favor seleccione el activo y el responsable de la inspección.");
            return;
        }

        // 1. Detectar fallas
        const failedItems = items.filter(i => i.status === 'fail');

        // 2. Si hay fallas y el usuario seleccionó crear OT
        if (failedItems.length > 0 && createOtOption) {
            const asset = assets.find(a => a.id === checklistAsset);
            const responsible = staff.find(s => s.id === checklistResponsible);

            // Generar descripción automática basada en las fallas
            const failureList = failedItems.map(i => `- ${i.category} > ${i.label}: ${i.comment || 'Sin observaciones'} ${i.aiAnalysis ? `(IA: ${i.aiAnalysis})` : ''}`).join('\n');
            const description = `OT Generada automáticamente por fallo en Checklist #${(checklists.length + 1).toString().padStart(4, '0')}.\nInspector: ${responsible?.name || 'N/A'}\n\nÍtems a reparar:\n${failureList}`;

            // Pre-llenar formulario de OT
            // Pre-llenar formulario de OT
            setOtFormData({
                id: '',
                title: `Correctivo Post-Inspección: ${asset?.internalId || ''}`,
                assetId: checklistAsset,
                assetName: asset?.name || '',
                projectId: '', // Default
                projectName: '',
                priority: 'Alta',
                date: new Date().toISOString().split('T')[0],
                description: description,
                initialLog: 'OT Creada automáticamente desde Inspección fallida.',
                maintenancePlanId: '',
                maintenanceEventId: '',
                dueDate: '',
                serviceRequestId: '' // Add missing field
            });

            // Cambiar de vista
            setIsCreatingChecklist(false);
            setItems(ROBUST_CHECKLIST_ITEMS);
            setChecklistAsset('');
            setChecklistResponsible('');
            setCreateOtOption(false);
            setIsCreatingOT(true); // Abrir formulario de OT
            return;
        }

        // 3. Guardado normal si no hay fallas o no se crea OT
        const consecutive = (checklists.length + 1).toString().padStart(4, '0');
        const mockId = `CHK-${consecutive}`;

        const asset = assets.find(a => a.id === checklistAsset);
        const responsible = staff.find(s => s.id === checklistResponsible);

        // SAVE TO SUPABASE
        supabase.from('checklists').insert({
            mock_id: mockId,
            asset_id: checklistAsset,
            asset_name: asset?.name,
            inspector: responsible?.name,
            date: new Date().toISOString().split('T')[0],
            conformity: calculateConformity(),
            items: items // Using JSONB
        }).then(({ error }) => {
            if (error) {
                console.error(error);
                alert("Error al guardar checklist");
            } else {
                alert(`Checklist ${mockId} guardado con ${calculateConformity()}% de conformidad.`);
                // Reload
                supabase.from('checklists').select('*').order('created_at', { ascending: false }).then(({ data }) => {
                    if (data) setChecklists(data.map(mapChecklistFromDB));
                });
            }
        });

        setIsCreatingChecklist(false);
        setItems(ROBUST_CHECKLIST_ITEMS);
        setChecklistAsset('');
        setChecklistResponsible('');
        setCreateOtOption(false);
    };

    const handleSaveOT = async () => {
        if (!otFormData.title || !otFormData.assetId) {
            alert("Por favor completa el título y selecciona un activo.");
            return;
        }

        try {
            // --- UPDATE MODE ---
            if (otFormData.id) {
                // Find existing order to get current updates
                const existingOrder = workOrders.find(wo => wo.id === otFormData.id);
                const currentUpdates = existingOrder ? existingOrder.updates : [];

                // Create audit log
                const editLog: WorkOrderUpdate = {
                    id: Math.random().toString(36).substr(2, 9),
                    date: new Date().toLocaleString(),
                    user: 'Sistema',
                    comment: `Edición de OT. Campos actualizados.` // Could be more specific diffing fields if needed
                };

                const updatesPayload = {
                    title: otFormData.title,
                    asset_id: otFormData.assetId,
                    asset_name: otFormData.assetName,
                    project_id: otFormData.projectId || null,
                    project_name: otFormData.projectName || null,
                    priority: otFormData.priority,
                    date_start: otFormData.date,
                    date_due: otFormData.dueDate || null,
                    description: otFormData.description,
                    updates: [editLog, ...currentUpdates]
                };

                // Update in DB (Try mock_id first as usual based on current app logic)
                const { error } = await supabase
                    .from('work_orders')
                    .update(updatesPayload)
                    .eq('mock_id', otFormData.id);

                if (error) {
                    // Fallback to UUID
                    const { error: uuidError } = await supabase
                        .from('work_orders')
                        .update(updatesPayload)
                        .eq('id', otFormData.id);
                    if (uuidError) throw uuidError;
                }

                alert("Orden de trabajo actualizada correctamente.");
            }
            // --- INSERT MODE ---
            else {
                const mockId = `OT-${(workOrders.length + Math.floor(Math.random() * 1000)).toString()}`;

                const { data: insertedData, error } = await supabase.from('work_orders').insert({
                    mock_id: mockId,
                    title: otFormData.title,
                    asset_id: otFormData.assetId,
                    asset_name: otFormData.assetName,
                    project_id: otFormData.projectId || null,
                    project_name: otFormData.projectName || null,
                    priority: otFormData.priority,
                    status: WorkOrderStatus.PENDING,
                    date_start: otFormData.date,
                    date_due: otFormData.dueDate || null,
                    description: otFormData.description,
                    responsible: 'Asignar',
                    updates: otFormData.initialLog ? [{
                        id: 'u-init', date: new Date().toISOString(), user: 'Sistema', comment: otFormData.initialLog
                    }] : [],
                    expenses: [],
                    maintenance_plan_id: otFormData.maintenancePlanId || null,
                    maintenance_event_id: otFormData.maintenanceEventId || null
                }).select().single();

                if (error) throw error;

                // Link back logic (same as before)
                if (otFormData.maintenanceEventId && insertedData) {
                    await supabase
                        .from('maintenance_events')
                        .update({ generated_ot_id: insertedData.id })
                        .eq('id', otFormData.maintenanceEventId);
                }

                // Link back logic for Service Requests
                if (otFormData.serviceRequestId && insertedData) {
                    // Fetch existing request to get log
                    const { data: sReq } = await supabase.from('service_requests').select('audit_log').eq('id', otFormData.serviceRequestId).single();
                    if (sReq) {
                        const currentLog = sReq.audit_log || [];
                        const newEntry = {
                            id: Math.random().toString(36).substr(2, 9),
                            date: new Date().toLocaleString(),
                            user: 'Sistema',
                            action: 'Derivación a OT',
                            details: `Generada Orden de Trabajo ${mockId}`
                        };
                        const updatedLog = [newEntry, ...currentLog];

                        await supabase.from('service_requests').update({
                            work_order_id: mockId,
                            status: 'En Proceso', // Auto-update status
                            audit_log: updatedLog
                        }).eq('id', otFormData.serviceRequestId);
                    }
                }

                let alertMsg = `Orden de Trabajo ${mockId} creada exitosamente.`;
                if (otFormData.initialLog) alertMsg += "\n\nSe ha registrado automáticamente una nota en la bitácora.";
                alert(alertMsg);
            }

            setIsCreatingOT(false);

            // Reload Data
            const { data } = await supabase.from('work_orders').select('*').order('created_at', { ascending: false });
            if (data) setWorkOrders(data.map(mapWorkOrderFromDB));

            // Reset Form
            setOtFormData({
                id: '',
                title: '',
                assetId: '',
                assetName: '',
                projectId: '',
                projectName: '',
                priority: 'Media',
                date: new Date().toISOString().split('T')[0],
                description: '',
                initialLog: '',
                maintenancePlanId: '',
                maintenanceEventId: '',
                dueDate: '',
                serviceRequestId: ''
            });

        } catch (err: any) {
            console.error('Error saving Work Order:', err);
            alert('Error al guardar orden de trabajo: ' + err.message);
        }
    };

    const handleEditWorkOrder = (e: React.MouseEvent, order: any) => {
        e.stopPropagation();
        setOtFormData({
            id: order.id,
            title: order.title,
            assetId: order.assetId,
            assetName: order.assetName,
            projectId: order.projectId || '', // Need to ensure mapper includes this
            projectName: order.projectName || '',
            priority: order.priority,
            date: order.dateStart,
            description: order.description,
            initialLog: '',
            maintenancePlanId: order.maintenancePlanId || '',
            maintenanceEventId: order.maintenanceEventId || '',
            dueDate: order.dueDate || '',
            serviceRequestId: ''
        });
        setIsCreatingOT(true);
    };

    const handleRefreshIA = () => {
        setIsAnalyzingIA(true);
        setTimeout(() => setIsAnalyzingIA(false), 2000);
    };

    const handleDeleteWorkOrder = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm("¿Estás seguro de que deseas eliminar esta Orden de Trabajo? Esta acción no se puede deshacer.")) {
            try {
                // Try deleting by mock_id first (as that's what we use for ID in the app usually)
                const { error } = await supabase.from('work_orders').delete().eq('mock_id', id);

                if (error) {
                    // Fallback: try by internal UUID if mock_id fails or if id is actually a UUID
                    console.warn("Delete by mock_id failed or returned no rows, trying by id...", error);
                    const { error: uuidError } = await supabase.from('work_orders').delete().eq('id', id);
                    if (uuidError) throw uuidError;
                }

                setWorkOrders(prev => prev.filter(wo => wo.id !== id));
            } catch (err) {
                console.error("Error deleting order:", err);
                alert("Error al eliminar la orden. Verifique su conexión.");
            }
        }
    };

    // --- Photo Handling Logic ---
    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && activePhotoItemId) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    setItems(prev => prev.map(item =>
                        item.id === activePhotoItemId ? { ...item, photoData: ev.target?.result as string } : item
                    ));
                }
                setActivePhotoItemId(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const triggerPhotoUpload = (itemId: string) => {
        setActivePhotoItemId(itemId);
        fileInputRef.current?.click();
    };

    const removePhoto = (itemId: string) => {
        setItems(prev => prev.map(item => item.id === itemId ? { ...item, photoData: undefined, aiAnalysis: undefined } : item));
    };

    const analyzeItemPhoto = async (itemId: string, photoData: string) => {
        setAnalyzingItemId(itemId);
        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) {
                alert("API Key no configurada.");
                setAnalyzingItemId(null);
                return;
            }
            const ai = new GoogleGenAI({ apiKey });
            const base64String = photoData.split(',')[1];
            const parts = [
                { text: "Analiza esta imagen técnica de inspección. Describe brevemente cualquier falla, daño, suciedad o estado visible. Escribe el resultado directamente como una nota técnica concisa." },
                { inlineData: { mimeType: 'image/jpeg', data: base64String } }
            ];

            let response;
            try {
                // RESET TO STANDARD STABLE MODEL
                response = await (ai as any).models.generateContent({
                    model: 'gemini-1.5-flash',
                    contents: [{ role: 'user', parts: parts }]
                });
            } catch (e: any) {
                console.warn("Retrying with fallback model due to:", e.message);
                try {
                    response = await (ai as any).models.generateContent({
                        model: 'gemini-pro-vision',
                        contents: [{ role: 'user', parts: parts }]
                    });
                } catch (e2) {
                    console.error("AI Maintenance Failed completely", e2);
                    throw e; // throw original error
                }
            }

            const analysis = response.text || (response.response ? response.response.text() : "");
            // Se guarda en aiAnalysis Y ADEMÁS se sobrescribe el comentario (nota) para que el usuario pueda editarlo
            setItems(prev => prev.map(i => i.id === itemId ? {
                ...i,
                aiAnalysis: analysis,
                comment: analysis // El análisis IA se convierte en la nota editable
            } : i));
        } catch (e) {
            console.error(e);
            alert("Error al analizar imagen con IA. Verifique conexión.");
        } finally {
            setAnalyzingItemId(null);
        }
    };

    // --- VIEW: CREATE OT ---
    if (isCreatingOT) {
        return (
            <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans animate-in slide-in-from-right-5 duration-300">
                <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex items-center justify-between">
                    <button onClick={() => setIsCreatingOT(false)} className="text-slate-600" aria-label="Volver"><ChevronLeft size={24} /></button>
                    <h1 className="font-bold text-lg text-slate-800">{otFormData.id ? 'Editar Orden' : 'Nueva Orden de Trabajo'}</h1>
                    {canEdit && <button onClick={handleSaveOT} className="text-orange-500 font-bold text-sm bg-orange-50 px-3 py-1.5 rounded-full">{otFormData.id ? 'Guardar Cambios' : 'Generar Orden'}</button>}
                </div>

                <div className="p-6 space-y-6">
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                        {/* Alert for Auto-Generated OTs (Failures or Overdue) */}
                        {(otFormData.description.includes('Generada automáticamente') || otFormData.initialLog) && (
                            <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-start gap-3">
                                <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-red-600 uppercase">
                                        {otFormData.initialLog ? 'No Conformidad Detectada' : 'Origen: Fallo en Checklist'}
                                    </p>
                                    <p className="text-[10px] text-red-500 whitespace-pre-wrap">
                                        {otFormData.initialLog ? otFormData.initialLog : 'Esta OT fue precargada con las anomalías detectadas.'}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label htmlFor="ot-title" className="text-[10px] font-bold text-slate-400 uppercase ml-1">Título de la Tarea</label>
                            <input
                                id="ot-title"
                                type="text"
                                value={otFormData.title}
                                onChange={(e) => setOtFormData({ ...otFormData, title: e.target.value })}
                                placeholder="Ej. Cambio de filtros..."
                                title="Título de la Orden de Trabajo"
                                className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 text-sm font-bold text-slate-800"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Filtrar Activos</label>
                            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                {[
                                    { label: 'Todos', value: 'ALL', icon: <CheckCircle2 size={14} /> },
                                    { label: 'Vehículos', value: 'Rodados', icon: <Truck size={14} /> },
                                    { label: 'Maquinaria', value: 'Maquinaria', icon: <Wrench size={14} /> },
                                    { label: 'Inmuebles', value: 'Instalaciones en infraestructuras', icon: <CheckCircle2 size={14} /> },
                                    { label: 'Informática', value: 'Equipos de Informática', icon: <CheckCircle2 size={14} /> },
                                    { label: 'Mobiliario', value: 'Mobiliario', icon: <CheckCircle2 size={14} /> },
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

                        <div className="space-y-1">
                            <label htmlFor="ot-asset" className="text-[10px] font-bold text-slate-400 uppercase ml-1">Activo Asociado</label>
                            <div className="relative">
                                <select
                                    id="ot-asset"
                                    title="Seleccionar Activo Asociado"
                                    value={otFormData.assetId}
                                    onChange={(e) => {
                                        const asset = assets.find(a => a.id === e.target.value);
                                        setOtFormData({ ...otFormData, assetId: e.target.value, assetName: asset ? asset.name : '' });
                                    }}
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 text-sm font-medium text-slate-700 appearance-none"
                                >
                                    <option value="">Seleccionar Equipo o Inmueble...</option>
                                    {assets
                                        .filter(a => assetTypeFilter === 'ALL' || a.type === assetTypeFilter)
                                        .map(a => (
                                            <option key={a.id} value={a.id}>
                                                {a.type === 'Instalaciones en infraestructuras' ? '[INFRA] ' : ''}{a.name} ({a.internalId})
                                            </option>
                                        ))}
                                </select>
                                <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="ot-project" className="text-[10px] font-bold text-slate-400 uppercase ml-1">Obra / Ubicación (Imputación)</label>
                            <div className="relative">
                                <select
                                    id="ot-project"
                                    title="Seleccionar Obra"
                                    value={otFormData.projectId}
                                    onChange={(e) => {
                                        const selectedProj = projects.find(p => p.id === e.target.value);
                                        setOtFormData({
                                            ...otFormData,
                                            projectId: e.target.value,
                                            projectName: selectedProj ? selectedProj.name : ''
                                        });
                                    }}
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 text-sm font-medium text-slate-700 appearance-none"
                                >
                                    <option value="">Seleccionar Obra...</option>
                                    {projects.map(proj => (
                                        <option key={proj.id} value={proj.id}>{proj.name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label htmlFor="ot-priority" className="text-[10px] font-bold text-slate-400 uppercase ml-1">Prioridad</label>
                                <select
                                    id="ot-priority"
                                    title="Prioridad de la Orden de Trabajo"
                                    value={otFormData.priority}
                                    onChange={(e) => setOtFormData({ ...otFormData, priority: e.target.value })}
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 text-sm font-medium text-slate-700 appearance-none"
                                >
                                    <option value="Baja">Baja</option>
                                    <option value="Media">Media</option>
                                    <option value="Alta">Alta</option>
                                    <option value="Crítica">Crítica</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label htmlFor="ot-date" className="text-[10px] font-bold text-slate-400 uppercase ml-1">Fecha Inicio</label>
                                <input
                                    id="ot-date"
                                    type="date"
                                    title="Fecha de Inicio"
                                    value={otFormData.date}
                                    onChange={(e) => setOtFormData({ ...otFormData, date: e.target.value })}
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 text-sm font-medium text-slate-700"
                                />
                            </div>
                            <div className="space-y-1">
                                <label htmlFor="ot-due-date" className="text-[10px] font-bold text-slate-400 uppercase ml-1">Fecha de Vencimiento (Firma de OT)</label>
                                <input
                                    id="ot-due-date"
                                    type="date"
                                    title="Fecha de Vencimiento"
                                    value={otFormData.dueDate}
                                    onChange={(e) => setOtFormData({ ...otFormData, dueDate: e.target.value })}
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 text-sm font-bold text-orange-600"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="ot-description" className="text-[10px] font-bold text-slate-400 uppercase ml-1">Descripción Detallada</label>
                            <textarea
                                id="ot-description"
                                title="Descripción Detallada de la Tarea"
                                value={otFormData.description}
                                onChange={(e) => setOtFormData({ ...otFormData, description: e.target.value })}
                                placeholder="Detalles del problema o trabajo a realizar..."
                                className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 text-sm font-medium text-slate-800 min-h-[150px] resize-none"
                            />
                        </div>
                    </div>

                    {canEdit && (
                        <button
                            onClick={handleSaveOT}
                            className="w-full bg-slate-800 text-white py-4 rounded-3xl font-bold shadow-xl shadow-slate-200 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                        >
                            <Save size={20} /> {otFormData.id ? 'Guardar Cambios' : 'Generar Orden'}
                        </button>
                    )}
                </div>
            </div>
        )
    }

    // --- VIEW: CREATE CHECKLIST ---
    if (isCreatingChecklist) {
        const conformity = calculateConformity();
        const failedCount = items.filter(i => i.status === 'fail').length;

        return (
            <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans">
                <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex items-center justify-between">
                    <button onClick={() => setIsCreatingChecklist(false)} className="text-slate-600" aria-label="Volver"><ChevronLeft size={24} /></button>
                    <h1 className="font-bold text-lg text-slate-800">Nueva Inspección</h1>
                    {canEdit && <button onClick={handleSaveChecklist} className="text-orange-500 font-bold text-sm">Finalizar</button>}
                </div>

                <div className="p-6 space-y-6">
                    {/* 1. Header Info (Asset + Responsible) */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 mb-6 space-y-4">
                        <h2 className="font-bold text-slate-800 text-lg">Detalles de la Inspección</h2>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Filtrar Activos</label>
                            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                {[
                                    { label: 'Todos', value: 'ALL', icon: <CheckCircle2 size={14} /> },
                                    { label: 'Vehículos', value: 'Rodados', icon: <Truck size={14} /> },
                                    { label: 'Maquinaria', value: 'Maquinaria', icon: <Wrench size={14} /> },
                                    { label: 'Inmuebles', value: 'Instalaciones en infraestructuras', icon: <CheckCircle2 size={14} /> },
                                    { label: 'Informática', value: 'Equipos de Informática', icon: <CheckCircle2 size={14} /> },
                                    { label: 'Mobiliario', value: 'Mobiliario', icon: <CheckCircle2 size={14} /> },
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Activo a Inspeccionar</label>
                                <div className="relative">
                                    <select
                                        id="chk-asset"
                                        title="Seleccionar Activo a Inspeccionar"
                                        value={checklistAsset}
                                        onChange={(e) => setChecklistAsset(e.target.value)}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 text-sm font-medium text-slate-700 appearance-none"
                                    >
                                        <option value="">Seleccionar Equipo...</option>
                                        {assets
                                            .filter(a => assetTypeFilter === 'ALL' || a.type === assetTypeFilter)
                                            .map(a => (
                                                <option key={a.id} value={a.id}>{a.name} ({a.internalId})</option>
                                            ))}
                                    </select>
                                    <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="chk-responsible" className="text-[10px] font-bold text-slate-400 uppercase ml-1">Responsable Técnico</label>
                                <div className="relative">
                                    <select
                                        id="chk-responsible"
                                        title="Seleccionar Responsable Técnico"
                                        value={checklistResponsible}
                                        onChange={(e) => setChecklistResponsible(e.target.value)}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800 appearance-none"
                                    >
                                        <option value="">Seleccionar personal...</option>
                                        {staff.map(s => <option key={s.id} value={s.id}>{s.name} - {s.role}</option>)}
                                    </select>
                                    <User size={18} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Conformity Widget */}
                    <div className={`bg-white p-6 rounded-[2rem] shadow-sm flex items-center justify-between sticky top-20 z-10 border transition-colors ${failedCount > 0 ? 'border-red-200 bg-red-50' : 'border-slate-100'}`}>
                        <div>
                            <p className="text-slate-500 text-xs font-bold uppercase mb-1">Estado General</p>
                            <h2 className={`text-3xl font-black ${failedCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>{conformity}% <span className="text-sm font-medium text-slate-400">OK</span></h2>
                            {failedCount > 0 && <p className="text-[10px] font-bold text-red-500 uppercase animate-pulse">{failedCount} puntos a reparar</p>}
                        </div>
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-xl shadow-inner ${conformity >= 90 ? 'bg-green-100 text-green-600' : conformity >= 70 ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}>
                            {conformity >= 90 ? 'A' : conformity >= 70 ? 'B' : 'C'}
                        </div>
                    </div>

                    {/* 3. Items List */}
                    <div className="space-y-8">
                        {Object.entries(groupedItems).map(([category, categoryItems]) => (
                            <div key={category} className="space-y-3">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider px-2">
                                    <span className="w-1.5 h-4 bg-orange-500 rounded-full"></span>{category}
                                </h3>
                                <div className="space-y-3">
                                    {(categoryItems as ChecklistItem[]).map((item) => (
                                        <div key={item.id} className={`bg-white rounded-2xl border p-4 shadow-sm space-y-3 transition-colors ${item.status === 'fail' ? 'border-red-200 ring-2 ring-red-500/10' : 'border-slate-100'}`}>
                                            {/* Header Row */}
                                            <div className="flex items-center justify-between">
                                                <span className={`text-sm font-bold ${item.status === 'fail' ? 'text-red-700' : 'text-slate-700'}`}>{item.label}</span>
                                                <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                                                    <button
                                                        onClick={() => setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'ok' } : i))}
                                                        className={`p-2 rounded-lg transition-all ${item.status === 'ok' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                        aria-label="Marcar como Correcto"
                                                    >
                                                        <CheckCircle2 size={20} />
                                                    </button>
                                                    <button
                                                        onClick={() => setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'fail' } : i))}
                                                        className={`p-2 rounded-lg transition-all ${item.status === 'fail' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                        aria-label="Marcar como Fallido"
                                                    >
                                                        <X size={20} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Actions Row */}
                                            <div className="flex gap-3 items-start">
                                                <textarea
                                                    aria-label={`Comentario para ${item.label}`}
                                                    title={`Comentario para ${item.label}`}
                                                    placeholder={item.status === 'fail' ? "Describa la falla (Obligatorio)..." : "Observaciones..."}
                                                    value={item.comment}
                                                    onChange={(e) => setItems(prev => prev.map(i => i.id === item.id ? { ...i, comment: e.target.value } : i))}
                                                    className={`flex-1 bg-slate-50 border-none rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 min-h-[60px] resize-none ${item.status === 'fail' ? 'focus:ring-red-500/20 bg-red-50 placeholder:text-red-300' : 'focus:ring-orange-500/20'}`}
                                                />
                                                <button
                                                    onClick={() => triggerPhotoUpload(item.id)}
                                                    className={`p-2 rounded-xl border transition-colors ${item.photoData ? 'border-orange-200 bg-orange-50 text-orange-500' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}
                                                    aria-label="Subir foto"
                                                >
                                                    <Camera size={18} />
                                                </button>
                                            </div>

                                            {/* Photo Preview & AI Analysis */}
                                            {item.photoData && (
                                                <div className="mt-2 space-y-3">
                                                    <div className="relative w-24 h-24 rounded-xl overflow-hidden group shadow-sm border border-slate-100">
                                                        <img src={item.photoData} alt="Previsualización de inspección" className="w-full h-full object-cover" />
                                                        <button
                                                            onClick={() => removePhoto(item.id)}
                                                            className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                            aria-label="Eliminar foto"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>

                                                    <button
                                                        onClick={() => analyzeItemPhoto(item.id, item.photoData!)}
                                                        disabled={analyzingItemId === item.id}
                                                        className="w-full bg-indigo-50 text-indigo-600 border border-indigo-100 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors disabled:opacity-50"
                                                    >
                                                        {analyzingItemId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                                        {analyzingItemId === item.id ? 'Analizando...' : item.aiAnalysis ? 'Re-analizar con IA' : 'Inspeccionar con IA'}
                                                    </button>

                                                    {item.aiAnalysis && (
                                                        <p className="text-[10px] text-indigo-400 text-center italic">
                                                            Análisis guardado en notas.
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Dynamic Section: Create OT Question if Failures exist */}
                    {failedCount > 0 && (
                        <div className="bg-red-50 p-4 rounded-2xl border border-red-100 animate-in slide-in-from-bottom-2">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="text-red-500 mt-1" size={20} />
                                <div className="flex-1">
                                    <h4 className="font-bold text-red-700 text-sm">Anomalías Detectadas</h4>
                                    <p className="text-xs text-red-600 mb-3">Se han marcado {failedCount} puntos como "No Conforme".</p>

                                    <label className="flex items-center gap-3 bg-white p-3 rounded-xl border border-red-100 cursor-pointer shadow-sm hover:border-red-300 transition-colors">
                                        <input
                                            aria-label="Generar Orden de Trabajo Correctiva"
                                            title="Generar Orden de Trabajo Correctiva"
                                            type="checkbox"
                                            className="w-5 h-5 accent-red-500 rounded cursor-pointer"
                                            checked={createOtOption}
                                            onChange={(e) => setCreateOtOption(e.target.checked)}
                                        />
                                        <span className="text-sm font-bold text-slate-700">Generar Orden de Trabajo Correctiva</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {canEdit && (
                        <button onClick={handleSaveChecklist} className="w-full bg-slate-800 text-white py-4 rounded-2xl font-bold shadow-xl shadow-slate-200 flex items-center justify-center gap-2 mt-4">
                            <Save size={20} /> Guardar Inspección
                        </button>
                    )}

                    {/* Hidden File Input */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        title="Subir foto de inspección"
                        aria-label="Subir foto de inspección"
                    />
                </div>
            </div>
        );
    }

    // --- VIEW: MAIN DASHBOARD ---
    return (
        <div className="p-4 md:p-8 space-y-6 bg-[#F8F9FA] min-h-screen relative pb-28">
            {/* PREVENTIVE MAINTENANCE MODAL */}
            {isPreventiveModalOpen && (
                <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] p-8 animate-in slide-in-from-bottom-20 duration-300 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <CalendarPlus size={24} className="text-purple-500" /> {newPreventive.id ? 'Editar Preventivo' : 'Programar Preventivo'}
                            </h3>
                            <button onClick={() => { setIsPreventiveModalOpen(false); setNewPreventive({ assetId: '', task: '', date: new Date().toISOString().split('T')[0], time: '09:00', frequency: 'Mensual' }); }} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200" aria-label="Cerrar">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label htmlFor="prev-asset" className="text-[10px] font-bold text-slate-400 uppercase ml-1">Activo</label>
                                <div className="relative">
                                    <select
                                        id="prev-asset"
                                        title="Seleccionar Activo para Tarea Preventiva"
                                        value={newPreventive.assetId}
                                        onChange={(e) => setNewPreventive({ ...newPreventive, assetId: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-purple-500/20 text-sm font-bold text-slate-800 appearance-none"
                                    >
                                        <option value="">Seleccionar Equipo o Inmueble...</option>
                                        {assets.map(a => (
                                            <option key={a.id} value={a.id}>
                                                {a.type === 'Instalaciones en infraestructuras' ? '[INFRA] ' : ''}{a.name} ({a.internalId})
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="prev-task" className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tarea Preventiva</label>
                                <input
                                    id="prev-task"
                                    type="text"
                                    title="Nombre de la Tarea Preventiva"
                                    value={newPreventive.task}
                                    onChange={(e) => setNewPreventive({ ...newPreventive, task: e.target.value })}
                                    placeholder="Ej. Lubricación, Revisión de niveles..."
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-purple-500/20 text-sm font-medium text-slate-800"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label htmlFor="prev-date" className="text-[10px] font-bold text-slate-400 uppercase ml-1">Fecha Inicio</label>
                                    <input
                                        id="prev-date"
                                        type="date"
                                        title="Fecha de Inicio"
                                        value={newPreventive.date}
                                        onChange={(e) => setNewPreventive({ ...newPreventive, date: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium text-slate-700"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="prev-time" className="text-[10px] font-bold text-slate-400 uppercase ml-1">Hora</label>
                                    <input
                                        id="prev-time"
                                        type="time"
                                        title="Hora de Inicio"
                                        value={newPreventive.time}
                                        onChange={(e) => setNewPreventive({ ...newPreventive, time: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium text-slate-700"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Frecuencia</label>
                                <div className="flex gap-2">
                                    {['Diaria', 'Semanal', 'Mensual'].map(freq => (
                                        <button
                                            key={freq}
                                            onClick={() => setNewPreventive({ ...newPreventive, frequency: freq as any })}
                                            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${newPreventive.frequency === freq ? 'bg-purple-500 text-white shadow-md' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}
                                        >
                                            {freq}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleSavePreventive}
                                className="w-full bg-slate-800 text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 mt-4 active:scale-95 transition-transform"
                            >
                                <Save size={20} /> {newPreventive.id ? 'Actualizar Tarea' : 'Programar Tarea'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">Taller SOWIC</h1>
                <button className="p-2 bg-white rounded-xl shadow-sm text-slate-400" aria-label="Filtrar">
                    <Filter size={20} />
                </button>
            </div>

            <div className="flex p-1 bg-slate-200 rounded-xl overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveTab('orders')} className={`flex-1 min-w-[80px] py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'orders' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Órdenes</button>
                <button onClick={() => setActiveTab('checklists')} className={`flex-1 min-w-[80px] py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'checklists' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Checklists</button>
                <button onClick={() => setActiveTab('preventive')} className={`flex-1 min-w-[80px] py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'preventive' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'}`}>Preventivo</button>
                <button onClick={() => setActiveTab('predictive')} className={`flex-1 min-w-[80px] py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'predictive' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Predictivo</button>
            </div>

            {activeTab === 'orders' && (
                <div className="space-y-4 animate-in fade-in duration-300 relative">
                    {loading ? <div className="text-center p-10"><Loader2 className="animate-spin mx-auto" /> Cargo Órdenes...</div> : workOrders.map(order => (
                        <WorkOrderListItem
                            key={order.id}
                            order={order}
                            onClick={() => navigate(`/maintenance/ot/${order.id}`)}
                            onEdit={handleEditWorkOrder}
                            onDelete={handleDeleteWorkOrder}
                            getPriorityColor={getPriorityColor}
                            canEdit={canEdit}
                        />
                    ))}

                    {/* FAB for Orders */}
                    {canEdit && (
                        <button
                            onClick={() => setIsCreatingOT(true)}
                            className="fixed bottom-24 right-6 w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-orange-200 z-30 active:scale-90 transition-transform"
                            aria-label="Crear Nueva Orden de Trabajo"
                        >
                            <Plus size={28} />
                        </button>
                    )}
                </div>
            )}

            {activeTab === 'checklists' && (
                <div className="space-y-4 animate-in fade-in duration-300 relative">
                    {loading ? <div className="text-center p-10"><Loader2 className="animate-spin mx-auto" /> Cargo Checklists...</div> : checklists.map(chk => (
                        <div key={chk.id} onClick={() => navigate(`/maintenance/checklist/${chk.id}`)} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 cursor-pointer group hover:border-emerald-200 transition-colors">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xs shadow-sm ${getScoreColor(chk.conformity)}`}>{chk.conformity}%</div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{chk.id}</p>
                                <h4 className="font-bold text-slate-800 truncate">{chk.assetName}</h4>
                                <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    <span className="flex items-center gap-1"><CalendarIcon size={12} /> {chk.date}</span>
                                    <span className="flex items-center gap-1"><PenTool size={12} /> {chk.inspector}</span>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-slate-300 group-hover:text-emerald-500" />
                        </div>
                    ))}

                    {/* FAB for Checklists */}
                    {canEdit && (
                        <button
                            onClick={() => setIsCreatingChecklist(true)}
                            className="fixed bottom-24 right-6 w-14 h-14 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-emerald-200 z-30 active:scale-90 transition-transform"
                            aria-label="Crear Nuevo Checklist"
                        >
                            <ClipboardCheck size={26} />
                        </button>
                    )}
                </div>
            )}

            {activeTab === 'preventive' && (
                <div className="space-y-6 animate-in fade-in duration-300 relative pb-20">
                    <div className="bg-purple-900 text-white p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-purple-500 opacity-20 rounded-full blur-3xl"></div>
                        <div className="relative z-10 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold mb-1 tracking-tight">Mantenimiento Preventivo</h2>
                                <p className="text-xs text-purple-200 font-medium">Tareas programadas y rutinas</p>
                            </div>
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                <CalendarClock size={24} className="text-purple-300" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {preventiveTasks.map(task => (
                            <div key={task.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-3 group hover:border-purple-200 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest bg-purple-50 px-2 py-0.5 rounded-lg mb-1 inline-block">{task.frequency}</span>
                                        <h4 className="font-bold text-slate-800 text-sm leading-tight">{task.assetName}</h4>
                                    </div>
                                    <div className="flex gap-2">
                                        {canEdit && (
                                            <>
                                                <button onClick={() => handleEditPreventive(task)} className="p-2 text-slate-400 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-colors" aria-label="Editar Tarea Preventiva">
                                                    <Edit3 size={16} />
                                                </button>
                                                <button onClick={() => handleDeletePreventive(task.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" aria-label="Eliminar Tarea Preventiva">
                                                    <Trash2 size={16} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100/50">
                                    <Wrench size={16} className="text-purple-400 shrink-0" />
                                    <p className="text-xs font-medium text-slate-600 leading-snug">{task.task}</p>
                                </div>

                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pt-1">
                                    <span className="flex items-center gap-1"><Clock size={12} /> {task.time} Hs</span>
                                    <span className="flex items-center gap-1">Próximo: {task.nextDue.split('-')[2]}/{task.nextDue.split('-')[1]}</span>
                                </div>
                            </div>
                        ))}

                        {preventiveTasks.length === 0 && (
                            <div className="text-center py-12 text-slate-400">
                                <CalendarClock size={48} className="mx-auto mb-2 opacity-20" />
                                <p className="text-sm">No hay tareas preventivas programadas.</p>
                            </div>
                        )}
                    </div>

                    {/* FAB for Preventive */}
                    {canEdit && (
                        <button
                            onClick={() => { setIsPreventiveModalOpen(true); setNewPreventive({ assetId: '', task: '', date: new Date().toISOString().split('T')[0], time: '09:00', frequency: 'Mensual' }); }}
                            className="fixed bottom-24 right-6 w-14 h-14 bg-purple-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-purple-200 z-30 active:scale-90 transition-transform"
                            aria-label="Programar Nueva Tarea Preventiva"
                        >
                            <Plus size={28} />
                        </button>
                    )}
                </div>
            )}

            {activeTab === 'predictive' && (
                <div className="space-y-6 animate-in fade-in duration-300 pb-20">
                    {/* Header Predictivo */}
                    <div className="bg-indigo-900 text-white p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-indigo-500 opacity-20 rounded-full blur-3xl"></div>
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center mb-4 backdrop-blur-md">
                                <Sparkles size={32} className="text-indigo-300 animate-pulse" />
                            </div>
                            <h2 className="text-xl font-bold mb-1 tracking-tight">Análisis Predictivo Central</h2>
                            <p className="text-xs text-indigo-300 font-medium px-4 opacity-80 mb-6">Gemini IA analizando patrones de sensores e historial para prevenir fallos críticos.</p>
                            <button
                                onClick={handleRefreshIA}
                                disabled={isAnalyzingIA}
                                className="bg-white text-indigo-900 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isAnalyzingIA ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                                {isAnalyzingIA ? 'Analizando...' : 'Refrescar Análisis'}
                            </button>
                        </div>
                    </div>

                    {/* Listado de Sugerencias */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Próximas Sugerencias IA</h3>
                            <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">Proyección 15 días</span>
                        </div>

                        {predictiveSuggestions.map(sug => (
                            <div key={sug.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 relative group overflow-hidden hover:border-indigo-200 transition-colors">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
                                            <TrendingUp size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Sugerencia Preventiva</p>
                                            <h4 className="font-bold text-slate-800 text-sm">{sug.assetName}</h4>
                                        </div>
                                    </div>
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${getPriorityColor(sug.priority)}`}>
                                        {sug.priority}
                                    </span>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4">
                                    <p className="text-sm font-bold text-slate-700 leading-tight mb-2">{sug.suggestion}</p>
                                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                                        <Info size={14} className="text-indigo-400 shrink-0" />
                                        <span>{sug.reason}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Confianza IA</span>
                                            <span className="text-xs font-black text-indigo-600">{sug.confidence}%</span>
                                        </div>
                                        <div className="flex flex-col border-l border-slate-100 pl-4">
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Fecha Estimada</span>
                                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                                <CalendarIcon size={12} className="text-slate-300" /> {sug.date}
                                            </span>
                                        </div>
                                    </div>
                                    {canEdit && (
                                        <button className="bg-slate-800 text-white p-3 rounded-xl shadow-md active:scale-95 transition-transform" aria-label="Aceptar Sugerencia Predictiva">
                                            <Plus size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* AI Insights Card */}
                    <div className="bg-indigo-50 p-6 rounded-[2.5rem] border border-indigo-100 flex items-start gap-4">
                        <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-indigo-500 shrink-0 shadow-sm">
                            <Zap size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-indigo-900 text-sm">Resumen de Flota IA</h3>
                            <p className="text-xs text-indigo-700/80 leading-relaxed mt-1">
                                El sistema detecta una tendencia de aumento en temperaturas de transmisión en la flota de maquinaria pesada. Se recomienda verificar lubricantes en el próximo turno.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Maintenance;
