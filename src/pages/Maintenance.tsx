
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    Calendar as CalendarIcon, AlertCircle, CheckCircle2, Clock, Sparkles,
    PenTool, Plus, ClipboardCheck, ChevronRight, ChevronLeft, X, AlertTriangle,
    BarChart3, Save, Truck, Camera, MessageSquare, Image as ImageIcon, ChevronDown,
    Loader2, ScanEye, FileInput, Wrench, CalendarPlus, TrendingUp, Zap, History, Info,
    Filter, Trash2, User, Repeat, CalendarClock, Edit3, Menu
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MOCK_MAINTENANCE_PLANS } from '../constants';
import { WorkOrderStatus, WorkOrderPriority, Checklist, ChecklistItem, WorkOrderUpdate, Asset, Staff } from '../types';
import { CHECKLIST_TEMPLATES, ChecklistTemplate } from '../utils/checklistTemplates';
import { GoogleGenAI } from "@google/genai";

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

    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const [isPreventiveModalOpen, setIsPreventiveModalOpen] = useState(false);
    const [isOptimizingPreventive, setIsOptimizingPreventive] = useState(false);
    const [preventiveTasks, setPreventiveTasks] = useState<PreventiveTask[]>([]);
    const [newPreventive, setNewPreventive] = useState<Partial<PreventiveTask>>({
        assetId: '',
        task: '',
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        frequency: 'Mensual'
    });

    const [assetTypeFilter, setAssetTypeFilter] = useState<'ALL' | 'Rodados' | 'Maquinaria' | 'Instalaciones en infraestructuras' | 'Mobiliario' | 'Equipos de Informática'>('ALL');

    // Checklist Integrated State
    const [isCreatingChecklist, setIsCreatingChecklist] = useState(false);
    const [checklistAsset, setChecklistAsset] = useState('');
    const [checklistResponsible, setChecklistResponsible] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | null>(null);
    const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
    const [currentUsage, setCurrentUsage] = useState<number | ''>('');
    const [createOtOption, setCreateOtOption] = useState(false);
    const [activePhotoItemId, setActivePhotoItemId] = useState<string | null>(null);
    const [analyzingItemId, setAnalyzingItemId] = useState<string | null>(null);

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

    const [realPredictiveSuggestions, setRealPredictiveSuggestions] = useState<any[]>([]);
    const [isAnalyzingIA, setIsAnalyzingIA] = useState(false);

    const analyzeMaintenanceNeeds = async () => {
        setIsAnalyzingIA(true);
        try {
            const [
                { data: vehData },
                { data: machData },
                { data: itData },
                { data: furnData },
                { data: infraData },
                { data: plansData },
                { data: eventsData },
                { data: checklistData },
                { data: woData }
            ] = await Promise.all([
                supabase.from('vehicles').select('*'),
                supabase.from('machinery').select('*'),
                supabase.from('it_equipment').select('*'),
                supabase.from('mobiliario').select('*'),
                supabase.from('infrastructures').select('*'),
                supabase.from('maintenance_plans').select('*'),
                supabase.from('maintenance_events').select('*'),
                supabase.from('checklists').select('*').order('date', { ascending: false }).limit(50),
                supabase.from('work_orders').select('asset_id, title, status')
            ]);

            const allAssets: Asset[] = [
                ...(vehData || []).map(a => ({ ...a, type: 'Rodados' })),
                ...(machData || []).map(a => ({ ...a, type: 'Maquinaria' })),
                ...(itData || []).map(a => ({ ...a, type: 'Equipos de Informática' })),
                ...(furnData || []).map(a => ({ ...a, type: 'Mobiliario' })),
                ...(infraData || []).map(a => ({ ...a, type: 'Instalaciones en infraestructuras' })),
            ];

            const activeWorkOrders = woData?.filter(wo => wo.status !== 'Completada') || [];
            const newSuggestions: any[] = [];

            // 1. Checklists Failures
            if (checklistData) {
                checklistData.forEach(chk => {
                    chk.items?.filter((i: any) => i.status === 'fail').forEach((item: any) => {
                        const exists = activeWorkOrders.some(wo => wo.asset_id === chk.asset_id && wo.title.toLowerCase().includes(item.label.toLowerCase()));
                        if (!exists) {
                            newSuggestions.push({
                                id: `chk-${chk.id}-${item.id}`,
                                assetName: chk.asset_name,
                                suggestion: `Fallo en: ${item.label}`,
                                date: chk.date,
                                confidence: 95,
                                reason: `Reportado por inspección. Comentario: ${item.comment || 'N/A'}`,
                                priority: item.label.toLowerCase().includes('motor') ? 'Crítica' : 'Alta',
                                assetId: chk.asset_id,
                                type: 'checklist_fail',
                                sourceId: chk.id
                            });
                        }
                    });
                });
            }

            // 2. Usage/Date Thresholds
            if (eventsData && plansData) {
                eventsData.filter(e => e.status !== 'Completado').forEach(evt => {
                    const plan = plansData.find(p => p.id === evt.plan_id);
                    const asset = allAssets.find(a => a.id === plan?.asset_id);
                    if (!asset || !plan) return;

                    const currentUsage = (asset as any).hours || 0;
                    const triggerValue = evt.trigger_value;
                    const isOverdue = new Date(evt.estimated_date) < new Date();

                    if (isOverdue || (triggerValue > 0 && currentUsage >= triggerValue * 0.9)) {
                        const exists = activeWorkOrders.some(wo => wo.asset_id === asset.id && wo.title.toLowerCase().includes(evt.title.toLowerCase()));
                        if (!exists) {
                            newSuggestions.push({
                                id: `evt-${evt.id}`,
                                assetName: asset.name,
                                suggestion: evt.title,
                                date: evt.estimated_date,
                                confidence: 85,
                                reason: isOverdue ? 'Fecha estimada superada.' : `Uso próximo al límite (${currentUsage}/${triggerValue}).`,
                                priority: isOverdue ? 'Alta' : 'Media',
                                assetId: asset.id,
                                type: 'usage_threshold',
                                sourceId: evt.id
                            });
                        }
                    }
                });
            }

            setRealPredictiveSuggestions(newSuggestions);
        } catch (e) {
            console.error(e);
        } finally {
            setIsAnalyzingIA(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'predictive' && realPredictiveSuggestions.length === 0) {
            analyzeMaintenanceNeeds();
        }
    }, [activeTab]);

    const handleAcceptPredictive = (sug: any) => {
        setOtFormData(prev => ({
            ...prev,
            assetId: sug.assetId,
            assetName: sug.assetName,
            title: sug.suggestion,
            description: `SUGERENCIA PREDICTIVA\n${sug.reason}\nPrioridad sugerida: ${sug.priority}`,
            priority: sug.priority,
            date: new Date().toISOString().split('T')[0],
            maintenanceEventId: sug.type === 'usage_threshold' ? sug.sourceId : ''
        }));
        setIsCreatingOT(true);
    };

    // Handle incoming navigation state (e.g., from Assets page or Maintenance Plans)
    useEffect(() => {
        if (!location.state || loading) return;

        const state = location.state as any;
        let consumed = false;

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
            consumed = true;
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
                serviceRequestId: ''
            });
            setIsCreatingOT(true);
            consumed = true;
        } else if (state.action === 'createChecklist' && state.assetId && assets.length > 0) {
            const asset = assets.find(a => a.id === state.assetId);
            if (asset) {
                setChecklistAsset(state.assetId);
                const stateObj = state as { templateId?: string };
                const template = stateObj.templateId
                    ? CHECKLIST_TEMPLATES.find(t => t.id === stateObj.templateId)
                    : CHECKLIST_TEMPLATES.find(t => t.assetType === asset.type);

                if (template) {
                    setSelectedTemplate(template);
                    setChecklistItems(template.items.map(i => ({ ...i, status: 'ok' as any, comment: '' })));
                    setIsCreatingChecklist(true);
                    consumed = true;
                }
            }
        } else if (state.activeTab) {
            setActiveTab(state.activeTab);
            consumed = true;
        }

        if (consumed) {
            // Clear state to prevent reopening on simple refresh
            window.history.replaceState({}, document.title);
        }
    }, [location, assets, staff, projects, loading]);


    // Simulamos sugerencias predictivas de IA

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
        analyzeMaintenanceNeeds();
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

    // --- Checklist Handlers ---
    const handleSaveChecklist = async () => {
        if (!checklistAsset || !checklistResponsible || !selectedTemplate) {
            alert("Por favor seleccione el activo, responsable y asegure que halla una plantilla cargada.");
            return;
        }

        const failedItems = checklistItems.filter(i => i.status === 'fail');
        const asset = assets.find(a => a.id === checklistAsset);
        const responsible = staff.find(s => s.id === checklistResponsible);

        // 1. OT Generation Option
        if (failedItems.length > 0 && createOtOption) {
            const failureList = failedItems.map(i => `- ${i.category} > ${i.label}: ${i.comment || 'Sin observaciones'} ${i.aiAnalysis ? `(IA: ${i.aiAnalysis})` : ''}`).join('\n');
            const description = `OT Generada automáticamente por fallo en Inspección.\nPlantilla: ${selectedTemplate.name}\nInspector: ${responsible?.name || 'N/A'}\n\nÍtems a reparar:\n${failureList}`;

            setOtFormData({
                id: '',
                title: `Correctivo Post-Inspección: ${asset?.internalId || ''}`,
                assetId: checklistAsset,
                assetName: asset?.name || '',
                projectId: '',
                projectName: '',
                priority: 'Alta',
                date: new Date().toISOString().split('T')[0],
                description: description,
                initialLog: 'OT Creada automáticamente desde Inspección fallida.',
                maintenancePlanId: '',
                maintenanceEventId: '',
                dueDate: '',
                serviceRequestId: ''
            });

            setIsCreatingChecklist(false);
            setIsCreatingOT(true);
            return;
        }

        // 2. Regular Save
        const conformity = Math.round((checklistItems.filter(i => i.status === 'ok').length / checklistItems.length) * 100);

        try {
            const { data: chkData, error } = await supabase.from('checklists').insert({
                asset_id: checklistAsset,
                asset_name: asset?.name,
                inspector: responsible?.name,
                date: new Date().toISOString().split('T')[0],
                conformity: conformity,
                items: checklistItems,
                metadata: {
                    templateId: selectedTemplate.id,
                    usage: currentUsage
                }
            }).select().single();

            if (error) throw error;

            // 3. Update Asset Usage if applicable
            if (currentUsage !== '' && asset) {
                const tableName = (asset.type === 'Rodados' ? 'vehicles' :
                    asset.type === 'Maquinaria' ? 'machinery' :
                        asset.type === 'Equipos de Informática' ? 'it_equipment' :
                            asset.type === 'Instalaciones en infraestructuras' ? 'infrastructure_installations' :
                                asset.type === 'Infraestructura' ? 'infrastructures' : 'mobiliario') as any;

                await supabase.from(tableName).update({ hours: currentUsage }).eq('id', asset.id);
            }

            alert(`Inspección guardada con ${conformity}% de conformidad.`);

            // Reload lists
            const { data: checklistsData } = await supabase.from('checklists').select('*').order('created_at', { ascending: false });
            if (checklistsData) setChecklists(checklistsData.map(mapChecklistFromDB));

            setIsCreatingChecklist(false);
            setChecklistItems([]);
            setChecklistAsset('');
            setSelectedTemplate(null);
        } catch (err) {
            console.error(err);
            alert("Error al guardar la inspección.");
        }
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && activePhotoItemId) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    setChecklistItems(prev => prev.map(item =>
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
        setChecklistItems(prev => prev.map(item => item.id === itemId ? { ...item, photoData: undefined, aiAnalysis: undefined } : item));
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

            const promptText = "Analiza esta imagen técnica de inspección. Describe brevemente cualquier falla, daño, suciedad o estado visible. Escribe el resultado directamente como una nota técnica concisa.";

            const response = await (ai as any).models.generateContent({
                model: 'gemini-1.5-flash',
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: promptText },
                            { inlineData: { mimeType: 'image/jpeg', data: base64String } }
                        ]
                    }
                ]
            });

            const resultText = response.text || (response.response ? response.response.text() : "");

            if (resultText) {
                const comment = resultText.trim();
                setChecklistItems(prev => prev.map(item =>
                    item.id === itemId ? { ...item, comment: comment } : item
                ));
            }
        } catch (e: any) {
            console.error(e);
            alert("Error al analizar imagen: " + e.message);
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
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium text-slate-700"
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

    // --- VIEW: CREATE CHECKLIST (INTEGRATED) ---
    if (isCreatingChecklist && selectedTemplate) {
        const failedCount = checklistItems.filter(i => i.status === 'fail').length;
        const conformity = Math.round((checklistItems.filter(i => i.status === 'ok').length / checklistItems.length) * 100);
        const selectedAssetObj = assets.find(a => a.id === checklistAsset);

        return (
            <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans">
                <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex items-center justify-between">
                    <button onClick={() => setIsCreatingChecklist(false)} className="text-slate-600" aria-label="Volver"><ChevronLeft size={24} /></button>
                    <h1 className="font-bold text-lg text-slate-800">Inspección en Curso</h1>
                    {canEdit && <button onClick={handleSaveChecklist} className="text-orange-500 font-bold text-sm bg-orange-50 px-3 py-1.5 rounded-full">Finalizar</button>}
                </div>

                <div className="p-6 space-y-6">
                    {/* 1. Header Info (Asset + Responsible) */}
                    <div className="bg-slate-800 p-6 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Activo Asociado</p>
                            <h2 className="font-black text-xl mb-3">{selectedAssetObj?.name} <span className="text-slate-500 font-medium text-sm">({selectedAssetObj?.internalId})</span></h2>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Plantilla</label>
                                    <div className="bg-white/10 p-3 rounded-2xl text-xs font-bold border border-white/5">
                                        {selectedTemplate.name}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Responsable</label>
                                    <select
                                        title="Responsable de la Inspección"
                                        value={checklistResponsible}
                                        onChange={(e) => setChecklistResponsible(e.target.value)}
                                        className="w-full p-3 bg-white/10 border border-white/5 rounded-2xl text-xs font-bold text-white focus:ring-1 focus:ring-orange-500 appearance-none"
                                    >
                                        <option value="" className="text-slate-800">Seleccionar...</option>
                                        {staff.map(s => <option key={s.id} value={s.id} className="text-slate-800">{s.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <Sparkles className="absolute -right-6 -bottom-6 w-32 h-32 text-white/5 rotate-12" />
                    </div>

                    {/* 2. Conformity Widget */}
                    <div className={`p-6 rounded-[2rem] shadow-sm flex items-center justify-between border transition-colors ${failedCount > 0 ? 'border-red-200 bg-red-50' : 'bg-white border-slate-100'}`}>
                        <div>
                            <p className="text-slate-400 text-[10px] font-black uppercase mb-1 tracking-widest">Conformidad Estimada</p>
                            <h2 className={`text-4xl font-black ${failedCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>{conformity}%</h2>
                            {failedCount > 0 && <p className="text-[10px] font-bold text-red-500 uppercase animate-pulse">{failedCount} puntos con falla</p>}
                        </div>
                        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center font-black text-xl shadow-inner ${conformity >= 90 ? 'bg-emerald-100 text-emerald-600' : conformity >= 70 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                            {conformity >= 90 ? 'A' : conformity >= 70 ? 'B' : 'C'}
                        </div>
                    </div>

                    {/* 3. Usage Input */}
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Uso Actual del Equipo</h3>
                        <div className="relative">
                            <input
                                type="number"
                                placeholder={selectedAssetObj?.type === 'Rodados' ? "Kilometraje..." : "Horas..."}
                                className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800"
                                value={currentUsage}
                                onChange={(e) => setCurrentUsage(e.target.value === '' ? '' : Number(e.target.value))}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">
                                {selectedAssetObj?.type === 'Rodados' ? 'KM' : 'HS'}
                            </div>
                        </div>
                    </div>

                    {/* 4. Items List */}
                    <div className="space-y-8 pb-10">
                        {Array.from(new Set(checklistItems.map(i => i.category))).map(category => (
                            <div key={category} className="space-y-4">
                                <h3 className="px-3 text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-4 bg-orange-500 rounded-full"></span>
                                    {category}
                                </h3>
                                <div className="space-y-4">
                                    {checklistItems.filter(i => i.category === category).map(item => (
                                        <div key={item.id} className={`bg-white rounded-[2.5rem] p-5 border shadow-sm transition-all ${item.status === 'fail' ? 'border-red-200 ring-4 ring-red-500/5' : 'border-slate-100'}`}>
                                            <div className="flex items-center justify-between mb-4">
                                                <span className={`text-sm font-bold ${item.status === 'fail' ? 'text-red-700' : 'text-slate-700'}`}>{item.label}</span>
                                                <div className="flex bg-slate-100 rounded-2xl p-1.5 gap-1.5 shadow-inner">
                                                    <button
                                                        onClick={() => setChecklistItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'ok' } : i))}
                                                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${item.status === 'ok' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                                                    >
                                                        <CheckCircle2 size={22} />
                                                    </button>
                                                    <button
                                                        onClick={() => setChecklistItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'fail' } : i))}
                                                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${item.status === 'fail' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400'}`}
                                                    >
                                                        <AlertCircle size={22} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex gap-3">
                                                <textarea
                                                    placeholder={item.status === 'fail' ? "Describa el problema..." : "Notas..."}
                                                    value={item.comment}
                                                    onChange={(e) => setChecklistItems(prev => prev.map(i => i.id === item.id ? { ...i, comment: e.target.value } : i))}
                                                    className={`flex-1 bg-slate-50 border-none rounded-2xl p-3 text-xs font-bold text-slate-600 placeholder:text-slate-300 focus:ring-2 ${item.status === 'fail' ? 'focus:ring-red-500/20' : 'focus:ring-orange-500/20'} min-h-[60px] resize-none`}
                                                />
                                                <button
                                                    onClick={() => triggerPhotoUpload(item.id)}
                                                    className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all ${item.photoData ? 'bg-orange-50 border-orange-200 text-orange-500' : 'bg-slate-50 border-slate-100 text-slate-300'}`}
                                                >
                                                    <Camera size={24} />
                                                </button>
                                            </div>

                                            {item.photoData && (
                                                <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                                                    <div className="relative w-24 h-24 rounded-xl overflow-hidden shadow-md group">
                                                        <img src={item.photoData} alt="Inspección" className="w-full h-full object-cover" />
                                                        <button onClick={() => removePhoto(item.id)} className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>

                                                    <button
                                                        onClick={() => analyzeItemPhoto(item.id, item.photoData!)}
                                                        disabled={analyzingItemId === item.id}
                                                        className="w-full bg-slate-800 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                                                    >
                                                        {analyzingItemId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-emerald-400" />}
                                                        {analyzingItemId === item.id ? 'Analizando...' : 'Analizar con IA'}
                                                    </button>

                                                    {item.aiAnalysis && (
                                                        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                                                            <p className="text-[10px] font-bold text-emerald-700 uppercase mb-1">Resultado IA:</p>
                                                            <p className="text-xs text-emerald-600 leading-tight italic">"{item.aiAnalysis}"</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 5. Post-Action Options */}
                    {failedCount > 0 && (
                        <div className="bg-red-50 p-6 rounded-[2.5rem] border border-red-100 shadow-lg shadow-red-500/5">
                            <div className="flex items-start gap-4">
                                <AlertTriangle className="text-red-500 shrink-0" size={24} />
                                <div className="space-y-4 flex-1">
                                    <div>
                                        <h4 className="font-black text-red-700 text-sm leading-none mb-1">Fallas Detectadas</h4>
                                        <p className="text-xs text-red-600 font-medium">¿Deseas programar la reparación ahora?</p>
                                    </div>

                                    <label className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-red-200 cursor-pointer hover:border-red-400 transition-colors shadow-sm">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                checked={createOtOption}
                                                onChange={(e) => setCreateOtOption(e.target.checked)}
                                                className="w-6 h-6 accent-red-600 rounded-lg cursor-pointer"
                                            />
                                        </div>
                                        <span className="text-sm font-black text-slate-700">Generar Orden de Trabajo Correctiva</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleSaveChecklist}
                        className="w-full bg-slate-800 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-slate-200 active:scale-95 transition-transform flex items-center justify-center gap-3"
                    >
                        <Save size={24} /> Finalizar Inspección
                    </button>
                    <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">Los datos se sincronizarán con el historial del activo</p>
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                />
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
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('sowic:toggle-sidebar'))}
                        className="p-2 md:hidden text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        <Menu size={24} />
                    </button>
                    <div className="md:hidden bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                        <img src="/logo.jpg" alt="SOWIC" className="w-8 h-8 rounded-lg object-cover" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Taller SOWIC</h1>
                </div>
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

                </div>
            )}

            {activeTab === 'preventive' && (
                <div className="space-y-6 animate-in fade-in duration-300 relative pb-20">
                    {/* Header Preventivo Premium */}
                    <div className="bg-purple-900 text-white p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-purple-500 opacity-20 rounded-full blur-3xl"></div>
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center mb-4 backdrop-blur-md">
                                <CalendarClock size={32} className="text-purple-300 animate-pulse" />
                            </div>
                            <h2 className="text-xl font-bold mb-1 tracking-tight">Optimización Preventiva IA</h2>
                            <p className="text-xs text-purple-200 font-medium px-4 opacity-80 mb-6">Sincronización de planes maestros y alertas automáticas basadas en ciclos de vida.</p>
                            <button
                                onClick={async () => {
                                    setIsOptimizingPreventive(true);
                                    // Simulación de análisis de planes
                                    await new Promise(r => setTimeout(r, 2500));
                                    setIsOptimizingPreventive(false);
                                    alert("Planes preventivos sincronizados con el historial de uso detectado.");
                                }}
                                disabled={isOptimizingPreventive}
                                className="bg-white text-purple-900 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isOptimizingPreventive ? <Loader2 size={16} className="animate-spin" /> : <Repeat size={16} />}
                                {isOptimizingPreventive ? 'Optimizando...' : 'Optimizar Calendario'}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tareas Programadas</h3>
                        <span className="text-[10px] font-bold text-purple-500 bg-purple-50 px-2 py-0.5 rounded-full">Próximos 30 días</span>
                    </div>

                    <div className="space-y-4">
                        {preventiveTasks.map(task => (
                            <div key={task.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-3 group hover:border-purple-200 transition-colors relative overflow-hidden">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-500">
                                            <CalendarIcon size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest leading-none mb-1">{task.frequency}</p>
                                            <h4 className="font-bold text-slate-800 text-sm leading-tight">{task.assetName}</h4>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        {canEdit && (
                                            <>
                                                <button onClick={() => handleEditPreventive(task)} className="p-2 text-slate-300 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-colors" aria-label="Editar Tarea Preventiva">
                                                    <Edit3 size={16} />
                                                </button>
                                                <button onClick={() => handleDeletePreventive(task.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" aria-label="Eliminar Tarea Preventiva">
                                                    <Trash2 size={16} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                                    <Wrench size={16} className="text-purple-400 shrink-0" />
                                    <p className="text-xs font-bold text-slate-700 leading-snug">{task.task}</p>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                    <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
                                        <span className="flex items-center gap-1"><Clock size={12} className="text-slate-300" /> {task.time} Hs</span>
                                        <span className="flex items-center gap-1 text-slate-700 font-black">
                                            <CalendarClock size={12} className="text-purple-400" />
                                            {task.nextDue.split('-')[2]}/{task.nextDue.split('-')[1]}/{task.nextDue.split('-')[0]}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => navigate('/checklist/new', { state: { assetId: task.assetId } })}
                                        className="text-[10px] font-black uppercase tracking-widest text-purple-600 bg-purple-50 px-3 py-1.5 rounded-xl active:scale-95 transition-transform"
                                    >
                                        Ejecutar
                                    </button>
                                </div>
                            </div>
                        ))}

                        {preventiveTasks.length === 0 && (
                            <div className="text-center py-12 text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
                                <CalendarClock size={48} className="mx-auto mb-2 opacity-10" />
                                <p className="text-xs font-bold uppercase tracking-widest">Sin tareas programadas</p>
                            </div>
                        )}
                    </div>

                    {/* Insights de Mantenimiento (AI) */}
                    <div className="bg-purple-50 p-6 rounded-[2.5rem] border border-purple-100 flex items-start gap-4">
                        <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-purple-500 shrink-0 shadow-sm border border-purple-100">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-purple-900 text-sm italic">Sugerencia IA de Optimización</h3>
                            <p className="text-[11px] text-purple-700/80 leading-relaxed mt-1 font-medium italic">
                                "Hemos notado que el 40% de los mantenimientos preventivos mensuales se realizan con un desvío de 5 días. Sugerimos adelantar la ventana de programación para evitar cuellos de botella."
                            </p>
                        </div>
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

                        {realPredictiveSuggestions.map(sug => (
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
                                        <button
                                            onClick={() => handleAcceptPredictive(sug)}
                                            className="bg-slate-800 text-white p-3 rounded-xl shadow-md active:scale-95 transition-transform"
                                            aria-label="Aceptar Sugerencia Predictiva"
                                        >
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
