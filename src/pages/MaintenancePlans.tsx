
import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Plus, Calendar, Clock, Wrench, ChevronRight, CheckCircle2, Sparkles, Loader2, FileText, AlertTriangle, X, Save, Trash2, Info, ArrowRight, Timer, CalendarClock, Play, Edit2, TrendingUp, CalendarDays, ExternalLink, GripVertical, Check, ChevronDown, MapPin, Bot, Truck, HardHat, Box, Laptop, Armchair } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleGenAI, Type } from "@google/genai";
import { MaintenancePlan, MaintenanceEvent, MaintenanceTask, Asset } from '../types';
import { supabase } from '../supabaseClient';

// --- MAPPERS ---
const mapEventFromDB = (e: any): MaintenanceEvent => ({
    id: e.id,
    title: e.title,
    estimatedDate: e.estimated_date,
    status: e.status,
    triggerValue: e.trigger_value,
    generatedOtId: e.generated_ot_id,
    tasks: e.tasks || []
});

const mapPlanFromDB = (p: any): MaintenancePlan => ({
    id: p.id,
    assetId: p.asset_id,
    assetName: p.asset_name,
    title: p.title,
    baseFrequency: p.base_frequency,
    baseFrequencyUnit: p.base_frequency_unit,
    frequencyTimeValue: p.frequency_time_value,
    frequencyTimeUnit: p.frequency_time_unit,
    dailyUsageEstimate: p.daily_usage_estimate,
    notes: p.notes,
    events: p.events ? p.events.map(mapEventFromDB) : []
});

const mapEventToDB = (e: MaintenanceEvent, planId: string) => ({
    plan_id: planId,
    title: e.title,
    estimated_date: e.estimatedDate,
    status: e.status,
    trigger_value: e.triggerValue,
    generated_ot_id: e.generatedOtId,
    tasks: e.tasks
});

const mapPlanToDB = (p: Partial<MaintenancePlan>) => ({
    asset_id: p.assetId,
    asset_name: p.assetName,
    title: p.title,
    base_frequency: p.baseFrequency,
    base_frequency_unit: p.baseFrequencyUnit,
    frequency_time_value: p.frequencyTimeValue,
    frequency_time_unit: p.frequencyTimeUnit,
    daily_usage_estimate: p.dailyUsageEstimate,
    notes: p.notes
});

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
    // Ensure arrays are initialized
    expirations: dbAsset.expirations || [],
    incidents: dbAsset.incidents || [],
});

// Helper to generate UUIDs
const getUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for older environments
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const MaintenancePlanListItem = React.memo(({ plan, assets, onSelect }: any) => {
    return (
        <div
            onClick={() => onSelect(plan)}
            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-50 flex items-center gap-4 cursor-pointer active:scale-[0.99] transition-transform relative overflow-hidden group hover:border-indigo-100 optimize-visibility"
        >
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500 group-hover:bg-indigo-600 transition-colors"></div>

            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0 text-indigo-500 group-hover:scale-110 transition-transform">
                <CalendarDays size={20} />
            </div>

            <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-800 text-sm truncate">{plan.title}</h3>
                <p className="text-xs text-slate-500 truncate">{plan.assetName}</p>

                <div className="flex items-center gap-3 mt-2">
                    {(assets.find((a: any) => a.id === plan.assetId) as any)?.category === 'Inmueble/Infraestructura' ? (
                        <span className="text-[10px] bg-slate-50 px-2 py-0.5 rounded text-slate-400 font-bold border border-slate-100 flex items-center gap-1 uppercase">
                            <MapPin size={10} /> Infraestructura
                        </span>
                    ) : (
                        plan.dailyUsageEstimate > 0 && (
                            <span className="text-[10px] bg-slate-50 px-2 py-0.5 rounded text-slate-500 font-bold border border-slate-100 flex items-center gap-1">
                                <TrendingUp size={10} /> {plan.dailyUsageEstimate} {plan.baseFrequencyUnit}/día
                            </span>
                        )
                    )}
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                        {plan.events.length} Eventos Anuales
                    </span>
                </div>
            </div>

            <ChevronRight size={20} className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
        </div>
    );
});

const MaintenancePlans: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [plans, setPlans] = useState<MaintenancePlan[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [workOrders, setWorkOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState<MaintenancePlan | null>(null);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    // Filter State
    const [filterAssetId, setFilterAssetId] = useState<string>('all');

    // Searchable Asset Selector State (Removed custom searchable state as requested)

    // Form States
    const [isCreating, setIsCreating] = useState(false);
    const [formPlan, setFormPlan] = useState<Partial<MaintenancePlan>>({
        title: '',
        assetId: '',
        baseFrequency: 500,
        baseFrequencyUnit: 'Horas',
        frequencyTimeValue: 0,
        frequencyTimeUnit: 'Meses',
        dailyUsageEstimate: 0,
        events: [],
        notes: ''
    });

    // Event Editing States
    const [editingEventId, setEditingEventId] = useState<string | null>(null);

    const [tempEventData, setTempEventData] = useState<MaintenanceEvent | null>(null);
    const [assetTypeFilter, setAssetTypeFilter] = useState<'ALL' | 'Rodados' | 'Maquinaria' | 'Instalaciones en infraestructuras' | 'Mobiliario' | 'Equipos de Informática'>('ALL');

    useEffect(() => {
        if (location.state && assets.length > 0) {
            const state = location.state as any;

            // Case 1: Create for Asset
            if (state.createForAsset) {
                const asset = assets.find(a => a.id === state.createForAsset);
                setFormPlan({
                    title: `Plan Anual ${new Date().getFullYear()}`,
                    assetId: state.createForAsset,
                    assetName: state.assetName || '',
                    baseFrequency: asset?.type === 'Maquinaria' ? 250 : 10000,
                    baseFrequencyUnit: asset?.type === 'Maquinaria' ? 'Horas' : 'Kilómetros',
                    frequencyTimeValue: 6,
                    frequencyTimeUnit: 'Meses',
                    dailyUsageEstimate: asset?.averageDailyUsage || 0,
                    events: [],
                    notes: ''
                });
                setIsCreating(true);
                setSelectedPlan(null);
            }

            // Case 2: Open Specific Plan (Back from OT)
            if (state.targetPlanId) {
                const target = plans.find(p => p.id === state.targetPlanId);
                if (target) setSelectedPlan(target);
            }

            // Clear state
            window.history.replaceState({}, document.title);
        }
    }, [location, plans, assets]);
    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('maintenance_plans')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            let plans = data ? data.map(mapPlanFromDB) : [];

            // Robust Manual Fetch for Events
            if (plans.length > 0) {
                const planIds = plans.map(p => p.id);
                const { data: eventsData, error: eventsError } = await supabase
                    .from('maintenance_events')
                    .select('*')
                    .in('plan_id', planIds);

                if (eventsError) console.error("Error fetching events manually:", eventsError);

                if (eventsData) {
                    const eventsByPlan = eventsData.reduce((acc: any, evt: any) => {
                        if (!acc[evt.plan_id]) acc[evt.plan_id] = [];
                        acc[evt.plan_id].push(mapEventFromDB(evt));
                        return acc;
                    }, {});

                    plans = plans.map(p => ({
                        ...p,
                        events: eventsByPlan[p.id] || []
                    }));
                }
            }

            console.log("Plans with stitched events:", plans);
            setPlans(plans);

            // Fetch Assets from all tables
            const [
                { data: vehiclesData, error: vehiclesError },
                { data: machineryData, error: machineryError },
                { data: itData, error: itError },
                { data: furnitureData, error: furnitureError },
                { data: infraData, error: infraError }
            ] = await Promise.all([
                supabase.from('vehicles').select('*'),
                supabase.from('machinery').select('*'),
                supabase.from('it_equipment').select('*'),
                supabase.from('mobiliario').select('*'),
                supabase.from('infrastructures').select('*')
            ]);

            if (vehiclesError) console.error("Error loading vehicles:", vehiclesError);
            if (machineryError) console.error("Error loading machinery:", machineryError);
            if (itError) console.error("Error loading it_equipment:", itError);
            if (furnitureError) console.error("Error loading furniture:", furnitureError);
            if (infraError) console.error("Error loading infrastructures:", infraError);

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

            console.log("Combined All Assets:", allAssets);
            setAssets(allAssets);

            // Fetch Work Orders
            const { data: woData, error: woError } = await supabase.from('work_orders').select('*');
            if (woError) throw woError;
            if (woData) setWorkOrders(woData);

        } catch (err) {
            console.error('Error fetching plans:', err);
        } finally {
            setLoading(false);
        }
    };




    const fetchPlanEvents = async (planId: string) => {
        console.log("Fetching events for plan:", planId);
        const { data, error } = await supabase
            .from('maintenance_events')
            .select('*')
            .eq('plan_id', planId);

        if (error) {
            console.error("Error fetching plan events:", error);
            return;
        }

        if (data) {
            console.log("Fetched events:", data);
            const mappedEvents = data.map(mapEventFromDB);

            // Update selected plan if it matches
            setSelectedPlan(prev => {
                if (prev && prev.id === planId) {
                    return { ...prev, events: mappedEvents };
                }
                return prev;
            });

            // Update list state as well
            setPlans(prev => prev.map(p => p.id === planId ? { ...p, events: mappedEvents } : p));
        }
    };

    // --- PROJECTION LOGIC ---
    const calculateProjections = () => {
        const { assetId, dailyUsageEstimate, baseFrequency, baseFrequencyUnit, frequencyTimeValue, frequencyTimeUnit } = formPlan;

        if (!assetId) {
            alert("Por favor seleccione un activo.");
            return;
        }

        // We need at least one frequency defined
        const hasUsageFreq = dailyUsageEstimate && baseFrequency && dailyUsageEstimate > 0 && baseFrequency > 0;
        const hasTimeFreq = frequencyTimeValue && frequencyTimeValue > 0;

        if (!hasUsageFreq && !hasTimeFreq) {
            alert("Debe configurar al menos un criterio de frecuencia (Uso o Tiempo).");
            return;
        }

        const asset = assets.find(a => a.id === assetId);
        if (!asset) return;

        const currentUsage = asset.hours; // This field holds KM or Hours based on type
        const newEvents: MaintenanceEvent[] = [];
        const today = new Date();

        // Project next 6 services
        for (let i = 1; i <= 6; i++) {
            let dateByUsage: Date | null = null;
            let dateByTime: Date | null = null;
            let targetUsage = 0;

            // 1. Calculate Date by Usage
            if (hasUsageFreq) {
                // Calculate target usage marker (e.g. 500, 1000, 1500)
                targetUsage = Math.ceil((currentUsage + (baseFrequency! * i)) / baseFrequency!) * baseFrequency!;
                // Days until target = (Target - Current) / Daily
                const daysUntil = Math.max(0, (targetUsage - currentUsage) / dailyUsageEstimate!);
                dateByUsage = new Date(today);
                dateByUsage.setDate(today.getDate() + Math.ceil(daysUntil));
            }

            // 2. Calculate Date by Time
            if (hasTimeFreq) {
                dateByTime = new Date(today);
                if (frequencyTimeUnit === 'Días') {
                    dateByTime.setDate(today.getDate() + (frequencyTimeValue! * i));
                } else if (frequencyTimeUnit === 'Meses') {
                    dateByTime.setMonth(today.getMonth() + (frequencyTimeValue! * i));
                } else if (frequencyTimeUnit === 'Años') {
                    dateByTime.setFullYear(today.getFullYear() + (frequencyTimeValue! * i));
                } else {
                    // Semanas
                    dateByTime.setDate(today.getDate() + (frequencyTimeValue! * 7 * i));
                }
            }

            // 3. Whichever comes first logic
            let finalDate: Date;
            let eventTitle = "";

            if (dateByUsage && dateByTime) {
                // If usage date is sooner, use usage logic
                if (dateByUsage < dateByTime) {
                    finalDate = dateByUsage;
                    eventTitle = `Service ${targetUsage.toLocaleString()} ${baseFrequencyUnit}`;
                } else {
                    finalDate = dateByTime;
                    // If triggered by time, we estimate what the usage might be roughly, or just show Time title
                    eventTitle = `Preventivo ${frequencyTimeValue! * i} ${frequencyTimeUnit}`;
                }
            } else if (dateByUsage) {
                finalDate = dateByUsage;
                eventTitle = `Service ${targetUsage.toLocaleString()} ${baseFrequencyUnit}`;
            } else {
                finalDate = dateByTime!;
                eventTitle = `Preventivo ${frequencyTimeValue! * i} ${frequencyTimeUnit}`;
            }

            newEvents.push({
                id: getUUID(),
                title: eventTitle,
                estimatedDate: finalDate.toISOString().split('T')[0],
                status: 'Programado',
                triggerValue: targetUsage || 0, // 0 if time only
                tasks: [],
                generatedOtId: undefined
            });
        }

        setFormPlan(prev => ({ ...prev, events: newEvents }));
    };

    // --- LOGIC: EXECUTE EVENT (GENERATE OT) ---
    const handleGenerateOT = (event: MaintenanceEvent) => {
        if (!selectedPlan) return;

        // Safe check for tasks array
        const tasks = event.tasks || [];
        const taskList = tasks.length > 0
            ? tasks.map(t => `- [ ] ${t.description} (Plazo estimado: ${t.durationDays} días)`).join('\n')
            : 'Sin tareas específicas definidas.';

        // Check for Overdue status
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const estimatedDate = new Date(event.estimatedDate);
        estimatedDate.setHours(0, 0, 0, 0);

        const isOverdue = estimatedDate < today;

        let priority = 'Baja'; // Default preventive priority
        let initialLog = null;

        if (isOverdue) {
            priority = 'Crítica'; // Escalate to Critical
            const diffTime = Math.abs(today.getTime() - estimatedDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            const reason = window.prompt(`El evento "${event.title}" está vencido por ${diffDays} días.\n\nPor favor ingrese el motivo de la regularización para la bitácora:`);

            if (!reason) return; // Cancel if no reason provided

            initialLog = `⚠️ REGULARIZACIÓN DE VENCIMIENTO\n\nEl evento "${event.title}" ha vencido por ${diffDays} días (Fecha est: ${event.estimatedDate}).\n\nMotivo de Regularización: ${reason}\n\nAcción del Sistema:\n1. Generación de OT correctiva/preventiva para regularizar.\n2. Prioridad escalada a CRÍTICA.\n3. Registro en bitácora para trazabilidad.`;
        }

        // Direct navigation without window.confirm for better UX. 
        // The confirmation happens implicitly by saving the OT in the next screen.
        const otData = {
            action: 'createOT',
            assetId: selectedPlan.assetId,
            assetName: selectedPlan.assetName,
            title: `Preventivo: ${event.title}`,
            description: `EJECUCIÓN DE PLAN ANUAL\nEvento Programado: ${event.title}\nVencimiento Original: ${event.estimatedDate}\n\nListado de Tareas:\n${taskList}`,
            priority: priority,
            date: new Date().toISOString().split('T')[0], // Set start date to today as we are executing now
            dueDate: event.estimatedDate,
            initialLog: initialLog, // Pass the non-conformity log

            // Linking Data
            maintenancePlanId: selectedPlan.id,
            maintenanceEventId: event.id
        };

        navigate('/maintenance', { state: otData });
    };

    const handleNavigateToOT = (otId: string) => {
        navigate(`/maintenance/ot/${otId}`);
    };

    // --- AI GENERATION LOGIC ---
    const generateFullPlanWithAI = async () => {
        if (!formPlan.assetId) {
            alert("Por favor seleccione un activo primero.");
            return;
        }

        const asset = assets.find(a => a.id === formPlan.assetId);
        if (!asset) return;

        setIsGeneratingAI(true);
        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) {
                alert("API Key no encontrada.");
                setIsGeneratingAI(false);
                return;
            }
            const ai = new GoogleGenAI({ apiKey });

            // First, establish the base frequency and events based on inputs
            let baseFreq = formPlan.baseFrequency || 500;
            let unit = formPlan.baseFrequencyUnit || 'Horas';
            let usage = formPlan.dailyUsageEstimate || 8;
            let current = asset.hours;
            const todayStr = new Date().toISOString().split('T')[0];

            const prompt = `Actúa como un experto en gestión de flotas y mantenimiento preventivo.
            Genera un PLAN ANUAL DE MANTENIMIENTO detallado para el siguiente activo:
            
            - Tipo: ${asset.type}
            - Marca/Modelo: ${asset.brand} ${asset.model}
            - Año: ${asset.year}
            - Uso Actual: ${current} ${unit}
            - Uso Estimado Diario: ${usage} ${unit}
            - Frecuencia Base: ${baseFreq} ${unit}
            - FECHA ACTUAL (HOY): ${todayStr}

            Genera al menos 4 eventos de mantenimiento distribuidos en el próximo año a partir de HOY.
            IMPORTANTE: Las fechas estimadas 'estimatedDate' DEBEN ser posteriores a ${todayStr}. No generes fechas en el pasado/vencidas.`;

            let response;
            let retryCount = 0;
            const maxRetries = 3;

            while (retryCount < maxRetries) {
                try {
                    console.log(`[v2] Attempt ${retryCount + 1} generating plan...`);
                    response = await ai.models.generateContent({
                        model: 'gemini-3-flash-preview',
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        config: {
                            responseMimeType: 'application/json',
                            responseSchema: {
                                type: Type.OBJECT,
                                properties: {
                                    planTitle: { type: Type.STRING },
                                    events: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                title: { type: Type.STRING },
                                                estimatedDate: { type: Type.STRING, description: "YYYY-MM-DD" },
                                                triggerValue: { type: Type.NUMBER },
                                                tasks: {
                                                    type: Type.ARRAY,
                                                    items: {
                                                        type: Type.OBJECT,
                                                        properties: {
                                                            description: { type: Type.STRING },
                                                            durationDays: { type: Type.NUMBER },
                                                            isCritical: { type: Type.BOOLEAN }
                                                        },
                                                        required: ["description", "durationDays", "isCritical"]
                                                    }
                                                }
                                            },
                                            required: ["title", "estimatedDate", "triggerValue", "tasks"]
                                        }
                                    }
                                },
                                required: ["planTitle", "events"]
                            }
                        }
                    });
                    break; // Success
                } catch (e: any) {
                    retryCount++;
                    console.warn(`Attempt ${retryCount} failed: ${e.message}`);
                    if (retryCount >= maxRetries) {
                        console.error("AI Generation Failed in MaintenancePlans after retries", e);
                        setIsGeneratingAI(false);
                        alert(`Error: Modelo sobrecargado (503). Intente en unos momentos.\nDetalle: ${e.message}`);
                        return;
                    }
                    // Wait 2 seconds before retrying
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            console.log("AI Response received (MaintenancePlans):", response);

            let generatedData;
            try {
                // Try parsing the text directly (safest across versions)
                // Use a type assertion to safely access .text if it exists, or fallback to sensible default
                const rawText = (response as any).text || JSON.stringify((response as any).parsed) || "{}";
                generatedData = JSON.parse(rawText);
            } catch (parseError) {
                console.error("JSON Parse Error", parseError);
                // Fallback: Check if .parsed is available directly as object
                if ((response as any).parsed) {
                    generatedData = (response as any).parsed;
                }
            }

            if (generatedData && generatedData.events) {
                setFormPlan(prev => ({
                    ...prev,
                    title: generatedData.planTitle || prev.title,
                    events: generatedData.events.map((e: any) => ({
                        id: getUUID(),
                        title: e.title,
                        estimatedDate: e.estimatedDate,
                        status: 'Programado',
                        triggerValue: e.triggerValue,
                        tasks: e.tasks?.map((t: any) => ({
                            id: getUUID(),
                            description: t.description,
                            durationDays: t.durationDays,
                            isCritical: t.isCritical
                        })) || []
                    }))
                }));
            } else {
                alert("La IA no devolvió un plan válido. Intente nuevamente.");
            }

        } catch (error: any) {
            console.error("AI Error", error);
            alert("Error al generar el plan con IA: " + error.message);
        } finally {
            setIsGeneratingAI(false);
        }
    };

    // --- EVENT EDITING LOGIC ---
    const startEditingEvent = (evt: MaintenanceEvent) => {
        setEditingEventId(evt.id);
        setTempEventData(JSON.parse(JSON.stringify(evt))); // Deep copy
    };

    const saveEventChanges = () => {
        if (!tempEventData) return;
        setFormPlan(prev => ({
            ...prev,
            events: prev.events?.map(e => e.id === tempEventData.id ? tempEventData : e)
        }));
        setEditingEventId(null);
        setTempEventData(null);
    };

    const cancelEventEdit = () => {
        setEditingEventId(null);
        setTempEventData(null);
    };

    const deleteEvent = (id: string) => {
        if (window.confirm('¿Eliminar este evento del plan?')) {
            setFormPlan(prev => ({
                ...prev,
                events: prev.events?.filter(e => e.id !== id)
            }));
        }
    };

    const addManualEvent = () => {
        const newEvent: MaintenanceEvent = {
            id: getUUID(),
            title: 'Nuevo Mantenimiento',
            estimatedDate: new Date().toISOString().split('T')[0],
            status: 'Programado',
            triggerValue: 0,
            tasks: []
        };
        setFormPlan(prev => ({
            ...prev,
            events: [...(prev.events || []), newEvent]
        }));
        // Start editing immediately
        setEditingEventId(newEvent.id);
        setTempEventData(newEvent);
    };

    // --- TASK EDITING LOGIC (Inside Event) ---
    const addTaskToTempEvent = () => {
        if (!tempEventData) return;
        const newTask: MaintenanceTask = {
            id: getUUID(),
            description: '',
            durationDays: 1,
            isCritical: false
        };
        setTempEventData({
            ...tempEventData,
            tasks: [...tempEventData.tasks, newTask]
        });
    };

    const updateTaskInTemp = (taskId: string, field: keyof MaintenanceTask, value: any) => {
        if (!tempEventData) return;
        setTempEventData({
            ...tempEventData,
            tasks: tempEventData.tasks.map(t => t.id === taskId ? { ...t, [field]: value } : t)
        });
    };

    const removeTaskFromTemp = (taskId: string) => {
        if (!tempEventData) return;
        setTempEventData({
            ...tempEventData,
            tasks: tempEventData.tasks.filter(t => t.id !== taskId)
        });
    };

    const handleDeletePlan = async (planId: string) => {
        if (!window.confirm("¿Está seguro de que desea eliminar este plan de mantenimiento? Esta acción no se puede deshacer y borrará todos los eventos asociados.")) {
            return;
        }

        try {
            // 1. Delete associated events first (Manual Cascade)
            const { error: eventsError } = await supabase
                .from('maintenance_events')
                .delete()
                .eq('plan_id', planId);

            if (eventsError) throw eventsError;

            // 2. Delete the plan
            const { error: planError } = await supabase
                .from('maintenance_plans')
                .delete()
                .eq('id', planId);

            if (planError) throw planError;

            alert("Plan eliminado exitosamente.");
            setSelectedPlan(null);
            fetchPlans(); // Refresh list

        } catch (error: any) {
            console.error("Error deleting plan:", error);
            alert("Error al eliminar el plan: " + error.message);
        }
    };

    const handleSavePlan = async () => {
        if (!formPlan.title || !formPlan.assetId) {
            alert("Título y Activo son obligatorios.");
            return;
        }

        try {
            const payload = mapPlanToDB(formPlan);

            // 1. Upsert Plan
            let planId = formPlan.id;

            if (planId) {
                const { error } = await supabase.from('maintenance_plans').update(payload).eq('id', planId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('maintenance_plans').insert(payload).select().single();
                if (error) throw error;
                planId = data.id;
            }

            // 2. Handle Events
            if (formPlan.events && formPlan.events.length > 0) {
                const eventsToUpsert = formPlan.events.map(evt => {
                    // Ensure we have a valid UUID for the event
                    const eventId = (evt.id && evt.id.length > 20) ? evt.id : getUUID();
                    return {
                        ...mapEventToDB({ ...evt, id: eventId }, planId!),
                        id: eventId
                    };
                });

                console.log("Upserting events:", eventsToUpsert);

                const { error: eventsError } = await supabase
                    .from('maintenance_events')
                    .upsert(eventsToUpsert, { onConflict: 'id' });

                if (eventsError) {
                    console.error("Error upserting events:", eventsError);
                    throw eventsError;
                }
            }

            alert("Plan guardado exitosamente.");
            setIsCreating(false);
            fetchPlans();

        } catch (err: any) {
            console.error("Error saving plan:", err);
            alert("Error al guardar plan: " + err.message);
        }
    };

    const handleOpenEdit = (plan: MaintenancePlan) => {
        setFormPlan({ ...plan });
        setIsCreating(true);
        setSelectedPlan(null);
    };

    const handleOpenCreate = () => {
        setFormPlan({
            title: `Plan Anual ${new Date().getFullYear()}`,
            assetId: '',
            baseFrequency: 500,
            baseFrequencyUnit: 'Horas',
            frequencyTimeValue: 6,
            frequencyTimeUnit: 'Meses',
            dailyUsageEstimate: 0,
            events: [],
            notes: ''
        });
        setIsCreating(true);
        setSelectedPlan(null);
    };

    // --- VIEWS ---

    // FORM VIEW (NEW ANNUAL PLAN)
    if (isCreating) {
        return (
            <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans">
                <div className="bg-white p-4 sticky top-0 z-10 shadow-sm flex items-center justify-between">
                    <button onClick={() => setIsCreating(false)} aria-label="Cerrar formulario" className="text-slate-600 p-2 -ml-2 rounded-full hover:bg-slate-50"><X size={24} /></button>
                    <h1 className="font-bold text-lg text-slate-800">{formPlan.id ? 'Editar Plan Anual' : 'Nuevo Plan Anual'}</h1>
                    <button onClick={handleSavePlan} className="text-orange-500 font-bold text-sm flex items-center gap-1 bg-orange-50 px-3 py-1.5 rounded-full">
                        <Save size={18} /> Guardar
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* 1. Configuration Section */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                            <TrendingUp size={16} className="text-orange-500" /> Configuración de Proyección
                        </h3>

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

                        <div className="space-y-1">
                            <label htmlFor="plan-asset" className="text-[10px] font-bold text-slate-400 uppercase ml-1">Activo Asociado</label>
                            <div className="relative">
                                <select
                                    id="plan-asset"
                                    title="Seleccionar Activo Asociado"
                                    aria-label="Seleccionar Activo Asociado"
                                    value={formPlan.assetId}
                                    onChange={(e) => {
                                        const asset = assets.find(a => a.id === e.target.value);
                                        const isInfra = (asset as any)?.category === 'Inmueble/Infraestructura';

                                        setFormPlan({
                                            ...formPlan,
                                            assetId: e.target.value,
                                            assetName: asset?.name || '',
                                            dailyUsageEstimate: isInfra ? 0 : (asset?.averageDailyUsage || 0),
                                            baseFrequency: isInfra ? 0 : (asset?.type === 'Maquinaria' ? 250 : 10000),
                                            baseFrequencyUnit: asset?.type === 'Maquinaria' ? 'Horas' : 'Kilómetros',
                                            frequencyTimeValue: isInfra ? 12 : 6,
                                            frequencyTimeUnit: 'Meses'
                                        });
                                    }}
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 text-sm font-bold text-slate-800 appearance-none"
                                >
                                    <option value="">Seleccionar Equipo o Inmueble...</option>
                                    {assets
                                        .filter(a => assetTypeFilter === 'ALL' || a.type === assetTypeFilter)
                                        .map(a => (
                                            <option key={a.id} value={a.id}>
                                                {(a as any).category === 'Inmueble/Infraestructura' ? '[INFRA] ' : ''}{a.name} ({a.internalId})
                                            </option>
                                        ))}
                                </select>
                                <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Criterio por Uso (Opcional)</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label htmlFor="plan-daily" className="text-[10px] font-bold text-slate-400 uppercase ml-1">Uso Diario Promedio</label>
                                    <input
                                        id="plan-daily"
                                        aria-label="Uso Diario Promedio"
                                        type="number"
                                        value={formPlan.dailyUsageEstimate}
                                        onChange={e => setFormPlan({ ...formPlan, dailyUsageEstimate: Number(e.target.value) })}
                                        className="w-full p-3 bg-white border-none rounded-xl text-xs font-bold text-slate-800"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="plan-base-freq" className="text-[10px] font-bold text-slate-400 uppercase ml-1">Frecuencia Base</label>
                                    <div className="flex gap-2">
                                        <input
                                            id="plan-base-freq"
                                            aria-label="Frecuencia Base"
                                            type="number"
                                            value={formPlan.baseFrequency}
                                            onChange={e => setFormPlan({ ...formPlan, baseFrequency: Number(e.target.value) })}
                                            className="w-full p-3 bg-white border-none rounded-xl text-xs font-bold text-slate-800"
                                        />
                                        <span className="flex items-center text-[10px] font-bold text-slate-500">{formPlan.baseFrequencyUnit}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Criterio por Tiempo (Opcional)</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label htmlFor="plan-time-val" className="text-[10px] font-bold text-slate-400 uppercase ml-1">Cada (Valor)</label>
                                    <input
                                        id="plan-time-val"
                                        aria-label="Valor de frecuencia temporal"
                                        type="number"
                                        value={formPlan.frequencyTimeValue}
                                        onChange={e => setFormPlan({ ...formPlan, frequencyTimeValue: Number(e.target.value) })}
                                        className="w-full p-3 bg-white border-none rounded-xl text-xs font-bold text-slate-800"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Unidad de Tiempo</label>
                                    <select
                                        aria-label="Unidad de tiempo"
                                        value={formPlan.frequencyTimeUnit}
                                        onChange={e => setFormPlan({ ...formPlan, frequencyTimeUnit: e.target.value as any })}
                                        className="w-full p-3 bg-white border-none rounded-xl text-xs font-bold text-slate-800"
                                    >
                                        <option value="Días">Días</option>
                                        <option value="Semanas">Semanas</option>
                                        <option value="Meses">Meses</option>
                                        <option value="Años">Años</option>
                                    </select>
                                </div>
                            </div>
                            <p className="text-[9px] text-slate-400 italic">
                                * Si configura ambos criterios, el sistema programará los eventos según lo que ocurra primero.
                            </p>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={calculateProjections}
                                className="flex-1 bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold text-xs shadow-sm hover:bg-slate-50"
                            >
                                Calcular Proyección
                            </button>
                            <button
                                onClick={generateFullPlanWithAI}
                                disabled={isGeneratingAI}
                                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2"
                            >
                                {isGeneratingAI ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                Generar con IA
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Título del Plan</label>
                        <input
                            aria-label="Título del Plan"
                            type="text"
                            value={formPlan.title}
                            onChange={e => setFormPlan({ ...formPlan, title: e.target.value })}
                            className="w-full p-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-slate-800 shadow-sm"
                        />
                    </div>

                    {/* 2. Timeline Preview */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center px-2">
                            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
                                Cronograma de Eventos
                            </h3>
                            <button
                                onClick={addManualEvent}
                                className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-lg flex items-center gap-1"
                            >
                                <Plus size={14} /> Agregar Manual
                            </button>
                        </div>

                        {formPlan.events && formPlan.events.length > 0 ? (
                            <div className="relative pl-6 space-y-6 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                                {formPlan.events.map((evt, index) => (
                                    <div key={evt.id} className="relative pl-4">
                                        <div className="absolute left-[-29px] top-1 w-10 h-10 rounded-full border-4 border-[#F8F9FA] bg-slate-800 text-white flex items-center justify-center z-10 text-[10px] font-bold">
                                            {index + 1}
                                        </div>

                                        {/* EDIT MODE FOR SINGLE EVENT */}
                                        {editingEventId === evt.id && tempEventData ? (
                                            <div className="bg-white p-4 rounded-2xl shadow-lg border border-orange-200 ring-2 ring-orange-500/10 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                                                <div className="flex justify-between items-center">
                                                    <h4 className="text-xs font-bold text-orange-600 uppercase tracking-wider">Editando Evento</h4>
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-400">Título</label>
                                                    <input
                                                        aria-label="Título del evento"
                                                        type="text"
                                                        value={tempEventData.title}
                                                        onChange={e => setTempEventData({ ...tempEventData, title: e.target.value })}
                                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-400">Fecha Estimada</label>
                                                        <input
                                                            aria-label="Fecha estimada"
                                                            type="date"
                                                            value={tempEventData.estimatedDate}
                                                            onChange={e => setTempEventData({ ...tempEventData, estimatedDate: e.target.value })}
                                                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-400">Valor (Km/Hs)</label>
                                                        <input
                                                            aria-label="Valor de disparo"
                                                            type="number"
                                                            value={tempEventData.triggerValue}
                                                            onChange={e => setTempEventData({ ...tempEventData, triggerValue: Number(e.target.value) })}
                                                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Tareas ({tempEventData.tasks.length})</label>
                                                        <button onClick={addTaskToTempEvent} className="text-[10px] font-bold text-blue-500">+ Tarea</button>
                                                    </div>
                                                    <div className="space-y-2 max-h-32 overflow-y-auto">
                                                        {tempEventData.tasks.map(task => (
                                                            <div key={task.id} className="flex gap-2 items-center">
                                                                <input
                                                                    aria-label="Descripción de tarea"
                                                                    type="text"
                                                                    value={task.description}
                                                                    onChange={e => updateTaskInTemp(task.id, 'description', e.target.value)}
                                                                    placeholder="Descripción..."
                                                                    className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                                                                />
                                                                <input
                                                                    aria-label="Duración en días"
                                                                    type="number"
                                                                    value={task.durationDays}
                                                                    onChange={e => updateTaskInTemp(task.id, 'durationDays', Number(e.target.value))}
                                                                    className="w-12 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-center"
                                                                />
                                                                <button
                                                                    onClick={() => updateTaskInTemp(task.id, 'isCritical', !task.isCritical)}
                                                                    className={`p-2 rounded-lg ${task.isCritical ? 'bg-red-100 text-red-500' : 'bg-slate-100 text-slate-400'}`}
                                                                    aria-label={task.isCritical ? "Marcar como no crítico" : "Marcar como crítico"}
                                                                >
                                                                    <AlertTriangle size={14} />
                                                                </button>
                                                                <button onClick={() => removeTaskFromTemp(task.id)} aria-label="Eliminar tarea" className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="flex gap-2 pt-2">
                                                    <button onClick={saveEventChanges} className="flex-1 bg-slate-800 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2"><Check size={14} /> Listo</button>
                                                    <button onClick={cancelEventEdit} aria-label="Cancelar edición" className="px-3 bg-slate-100 text-slate-500 rounded-lg"><X size={16} /></button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-bold text-sm text-slate-800">{evt.title}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500">{evt.estimatedDate} • {evt.triggerValue > 0 ? `${evt.triggerValue} ${formPlan.baseFrequencyUnit}` : 'Por Fecha'}</span>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => startEditingEvent(evt)} aria-label="Editar evento" className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:text-orange-500 hover:bg-orange-50 transition-colors"><Edit2 size={14} /></button>
                                                        <button onClick={() => deleteEvent(evt.id)} aria-label="Eliminar evento" className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    {evt.tasks?.slice(0, 2).map((t, i) => (
                                                        <div key={i} className="flex items-center gap-1">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${t.isCritical ? 'bg-red-500' : 'bg-slate-300'}`} />
                                                            <p className="text-[10px] text-slate-500 truncate max-w-[120px]">{t.description}</p>
                                                        </div>
                                                    ))}
                                                    {evt.tasks && evt.tasks.length > 2 && (
                                                        <p className="text-[9px] text-slate-400 pl-2.5">+{evt.tasks.length - 2} tareas más</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <Sparkles size={24} className="text-slate-300 mx-auto mb-2" />
                                <p className="text-xs text-slate-400 font-bold">Sin eventos programados</p>
                                <button onClick={addManualEvent} className="text-[10px] text-indigo-500 font-bold mt-2">Agregar manualmente</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // DETAIL VIEW
    if (selectedPlan) {
        // Find asset to get info
        const asset = assets.find(a => a.id === selectedPlan.assetId);

        return (
            <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans">
                <div className="bg-white p-4 sticky top-0 z-10 shadow-sm flex items-center justify-between">
                    <button onClick={() => setSelectedPlan(null)} aria-label="Volver a la lista" className="text-slate-600 p-2 -ml-2 rounded-full hover:bg-slate-50"><ChevronLeft size={24} /></button>
                    <h1 className="font-bold text-lg text-slate-800">Plan Anual</h1>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleDeletePlan(selectedPlan.id)}
                            className="text-red-500 font-bold text-sm bg-red-50 px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-red-100 transition-colors"
                        >
                            <Trash2 size={16} /> Eliminar
                        </button>
                        <button
                            onClick={() => handleOpenEdit(selectedPlan)}
                            className="text-orange-500 font-bold text-sm bg-orange-50 px-3 py-1.5 rounded-full hover:bg-orange-100 transition-colors"
                        >
                            Editar
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Header Card */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl text-[10px] font-bold uppercase tracking-wider border-b border-l bg-slate-800 text-white">
                            Vigente
                        </div>

                        <h2 className="text-2xl font-bold text-slate-800 mb-1">{selectedPlan.title}</h2>
                        <p className="text-sm font-bold text-slate-500">{selectedPlan.assetName}</p>

                        <div className="mt-4 flex gap-4 text-xs">
                            {selectedPlan.baseFrequency && selectedPlan.baseFrequency > 0 && (
                                <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                                    <span className="block font-bold text-slate-400 uppercase text-[9px]">Uso</span>
                                    <span className="font-bold text-slate-800">Cada {selectedPlan.baseFrequency} {selectedPlan.baseFrequencyUnit}</span>
                                </div>
                            )}
                            {selectedPlan.frequencyTimeValue && selectedPlan.frequencyTimeValue > 0 && (
                                <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                                    <span className="block font-bold text-slate-400 uppercase text-[9px]">Tiempo</span>
                                    <span className="font-bold text-slate-800">Cada {selectedPlan.frequencyTimeValue} {selectedPlan.frequencyTimeUnit}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ANNUAL TIMELINE */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                            <CalendarDays size={18} className="text-orange-500" /> Cronograma de Eventos
                        </h3>

                        <div className="relative pl-6 space-y-6 before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200">
                            {selectedPlan.events?.map((evt, index) => {
                                const isEventOverdue = new Date(evt.estimatedDate) < new Date() && evt.status !== 'Completado';
                                const linkedOt = evt.generatedOtId ? workOrders.find(o => o.id === evt.generatedOtId || o.mock_id === evt.generatedOtId) : null;
                                const isOtOverdue = linkedOt && linkedOt.status !== 'Completada' && new Date(linkedOt.dateStart) < new Date();

                                const statusColor = evt.status === 'Completado' ? 'bg-green-500' : isEventOverdue ? 'bg-red-500' : 'bg-slate-300';

                                return (
                                    <div key={index} className="relative pl-6">
                                        <div className={`absolute left-[-29px] top-1 w-10 h-10 rounded-full border-4 border-[#F8F9FA] ${statusColor} text-white flex items-center justify-center z-10 text-[10px] font-bold`}>
                                            {evt.status === 'Completado' ? <CheckCircle2 size={16} /> : index + 1}
                                        </div>

                                        <div className={`bg-white p-5 rounded-2xl shadow-sm border ${isEventOverdue ? 'border-red-200' : 'border-slate-100'}`}>
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h4 className={`font-bold text-sm ${isEventOverdue ? 'text-red-700' : 'text-slate-800'}`}>{evt.title}</h4>
                                                    <p className={`text-xs font-medium ${isEventOverdue ? 'text-red-500' : 'text-slate-500'}`}>
                                                        {isEventOverdue ? '⚠️ Vencido: ' : 'Vencimiento: '} {evt.estimatedDate}
                                                    </p>
                                                </div>

                                                {/* Logic Button State */}
                                                {linkedOt ? (
                                                    // Case 1 & 2: OT Exists
                                                    isOtOverdue ? (
                                                        <button
                                                            onClick={() => handleNavigateToOT(linkedOt.id)}
                                                            className="text-[10px] font-bold bg-red-50 text-red-600 px-3 py-1.5 rounded-lg border border-red-100 flex items-center gap-1 hover:bg-red-100 transition-colors animate-pulse"
                                                        >
                                                            <AlertTriangle size={12} /> Regularizar OT
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleNavigateToOT(linkedOt.id)}
                                                            className="text-[10px] font-bold bg-green-50 text-green-600 px-3 py-1.5 rounded-lg border border-green-100 flex items-center gap-1 hover:bg-green-100 transition-colors"
                                                        >
                                                            <ExternalLink size={12} /> OT
                                                        </button>
                                                    )
                                                ) : (
                                                    // Case 3: No OT yet
                                                    isEventOverdue ? (
                                                        <button
                                                            onClick={() => handleGenerateOT(evt)}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-bold shadow-md active:scale-95 transition-transform bg-red-600 text-white animate-pulse"
                                                        >
                                                            Regularizar OT
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleGenerateOT(evt)}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-bold shadow-md active:scale-95 transition-transform bg-slate-800 text-white"
                                                        >
                                                            Generar OT
                                                        </button>
                                                    )
                                                )}
                                            </div>

                                            <div className="space-y-2 pt-2 border-t border-slate-50">
                                                {evt.tasks.map((t, i) => (
                                                    <div key={i} className="flex items-start gap-2">
                                                        <div className="mt-0.5">{t.isCritical ? <AlertTriangle size={12} className="text-red-500" /> : <div className="w-3 h-3 rounded-full bg-slate-200" />}</div>
                                                        <p className="text-xs text-slate-600 leading-tight flex-1">{t.description}</p>
                                                        <span className="text-[10px] font-bold text-slate-400">{t.durationDays}d</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // LIST VIEW
    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-24 font-sans">
            <div className="bg-white p-6 sticky top-0 z-10 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-slate-800">Planes Anuales</h1>
                    <div className="flex gap-2">
                        <button
                            onClick={handleOpenCreate}
                            aria-label="Crear nuevo plan"
                            className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200"
                        >
                            <Plus size={24} />
                        </button>
                    </div>
                </div>

                <div className="bg-slate-100 p-1 rounded-xl flex items-center">
                    <button className="flex-1 py-2 bg-white rounded-lg text-xs font-bold text-slate-800 shadow-sm transition-all active:scale-95">Planes Vigentes</button>
                    <div className="w-px h-6 bg-slate-200 mx-1"></div>
                    <select
                        aria-label="Filtrar por Activo"
                        value={filterAssetId}
                        onChange={(e) => setFilterAssetId(e.target.value)}
                        className="flex-1 bg-transparent border-none text-[10px] font-bold text-slate-500 focus:ring-0 uppercase tracking-widest cursor-pointer px-4 text-center appearance-none"
                    >
                        <option value="all">TODOS LOS ACTIVOS</option>
                        {assets.map(a => (
                            <option key={a.id} value={a.id}>
                                {(a as any).category === 'Inmueble/Infraestructura' ? '[INFRA] ' : ''}{a.name} ({a.internalId})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="p-6 space-y-4">
                {plans
                    .filter(plan => filterAssetId === 'all' || plan.assetId === filterAssetId)
                    .map(plan => (
                        <MaintenancePlanListItem
                            key={plan.id}
                            plan={plan}
                            assets={assets}
                            onSelect={(p: MaintenancePlan) => {
                                console.log("Selected Plan:", p);
                                setSelectedPlan(p);
                                fetchPlanEvents(p.id);
                            }}
                        />
                    ))}

                {plans.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                        <FileText size={48} className="mx-auto mb-2 opacity-20" />
                        <p>No hay planes configurados</p>
                    </div>
                ) : plans.filter(plan => filterAssetId === 'all' || plan.assetId === filterAssetId).length === 0 && (
                    <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <Bot size={48} className="mx-auto mb-2 text-slate-200" />
                        <p className="text-sm font-bold text-slate-400 italic">No se hallaron planes para este activo</p>
                        <button onClick={() => setFilterAssetId('all')} className="text-xs font-bold text-indigo-500 underline mt-2 uppercase tracking-widest">Ver todos</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MaintenancePlans;
