
import React, { useState, useMemo } from 'react';
import {
    ChevronLeft, ChevronRight, Calendar as CalendarIcon,
    MapPin, Filter, Plus, X, Save, Clock, Repeat,
    Wrench, AlertTriangle, Eye, ChevronDown, Truck, Bell, Briefcase, Sparkles, LayoutGrid, List,
    ExternalLink, ArrowRight, Info, CheckCircle2, FileText, ShieldAlert, AlertCircle, CalendarClock, Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

// Unified Event Type for display
interface CalendarEvent {
    id: string;
    date: Date; // For single day events
    endDate?: Date; // For ranges (Allocations)
    title: string;
    subtitle: string;
    type: 'Allocation' | 'WorkOrder' | 'Transfer' | 'Reminder' | 'Maintenance' | 'Expiration' | 'Incident' | 'MaintenanceEvent';
    priority?: string; // For styling
    status?: string;
    assetId?: string;
    notes?: string;
}

interface CustomReminder {
    id: string;
    title: string;
    date: string;
    time: string;
    frequency: 'No se repite' | 'Semanal' | 'Mensual' | 'Anual';
    notes: string;
}

const CalendarPage: React.FC = () => {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
    const [agendaViewMode, setAgendaViewMode] = useState<'day' | 'week' | 'month'>('day');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [customReminders, setCustomReminders] = useState<CustomReminder[]>([]);

    // State for detailed view
    const [eventInDetail, setEventInDetail] = useState<CalendarEvent | null>(null);

    // Reminder Form State
    const [isReminderOpen, setIsReminderOpen] = useState(false);
    const [isExpirationsSummaryOpen, setIsExpirationsSummaryOpen] = useState(false);

    const [reminderForm, setReminderForm] = useState<{
        title: string;
        date: string;
        time: string;
        frequency: 'No se repite' | 'Semanal' | 'Mensual' | 'Anual';
        notes: string;
    }>({
        title: '',
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        frequency: 'No se repite',
        notes: ''
    });

    // Real Data State
    const [workOrders, setWorkOrders] = useState<any[]>([]);
    const [allocations, setAllocations] = useState<any[]>([]);
    const [transfers, setTransfers] = useState<any[]>([]);
    const [maintenancePlans, setMaintenancePlans] = useState<any[]>([]);
    const [assets, setAssets] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch Real Data
    React.useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // 1. Work Orders
                const { data: woData } = await supabase.from('work_orders').select('*');
                if (woData) setWorkOrders(woData);

                // 2. Allocations
                const { data: allocData } = await supabase.from('asset_allocations').select('*, asset:assets(name), project:projects(name)');
                if (allocData) setAllocations(allocData);

                // 3. Transfers
                const { data: transData } = await supabase.from('asset_transfers').select('*, asset:assets(name)');
                if (transData) setTransfers(transData);

                // 4. Maintenance Plans
                const { data: planData } = await supabase.from('maintenance_plans').select('*');
                if (planData) setMaintenancePlans(planData);

                // 5. Assets (for expirations and incidents)
                const { data: assetData } = await supabase.from('assets').select('id, name, internal_id, expirations, incidents');
                if (assetData) setAssets(assetData);

            } catch (error) {
                console.error("Error fetching calendar data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // --- DATA AGGREGATION ---
    const allEvents = useMemo(() => {
        const events: CalendarEvent[] = [];

        // 1. Allocations (Logistics)
        allocations.forEach(alloc => {
            if (alloc.start_date) {
                // Start Event
                events.push({
                    id: `${alloc.id}-start`,
                    date: new Date(alloc.start_date + 'T00:00:00'),
                    title: `Inicio Asignación: ${alloc.asset?.name || alloc.asset_name || 'Desconocido'}`,
                    subtitle: alloc.project?.name || alloc.project_name || 'Sin Proyecto',
                    type: 'Allocation',
                    status: 'Inicio',
                    assetId: alloc.asset_id,
                    notes: 'Inicio de asignación de activo al proyecto.'
                });

                // End Event (if exists)
                if (alloc.end_date) {
                    events.push({
                        id: `${alloc.id}-end`,
                        date: new Date(alloc.end_date + 'T00:00:00'),
                        title: `Fin Asignación: ${alloc.asset?.name || alloc.asset_name || 'Desconocido'}`,
                        subtitle: alloc.project?.name || alloc.project_name || 'Sin Proyecto',
                        type: 'Allocation',
                        status: 'Fin',
                        assetId: alloc.asset_id,
                        notes: 'Fin de asignación de activo al proyecto.'
                    });
                }
            }
        });

        // 2. Work Orders
        workOrders.forEach(ot => {
            if (ot.date_start) {
                events.push({
                    id: ot.id,
                    date: new Date(ot.date_start), // timestampz usually works directly or needs New Date
                    title: `OT: ${ot.title}`,
                    subtitle: ot.asset_name || 'General',
                    type: 'WorkOrder',
                    priority: ot.priority,
                    status: ot.status,
                    assetId: ot.asset_id,
                    notes: ot.description
                });
            }
        });

        // 3. Transfers
        transfers.forEach(tr => {
            if (tr.transfer_date) {
                events.push({
                    id: tr.id,
                    date: new Date(tr.transfer_date + 'T00:00:00'),
                    title: `Traslado: ${tr.asset?.name || 'Activo'}`,
                    subtitle: `${tr.from_location} -> ${tr.to_location}`,
                    type: 'Transfer',
                    status: tr.status,
                    notes: `Lectura: ${tr.meter_reading || 'N/A'}`
                });
            }
        });

        // 4. Custom Reminders
        customReminders.forEach(rem => {
            const baseDate = new Date(rem.date + 'T00:00:00');
            let occurrences = 1;
            if (rem.frequency === 'Semanal') occurrences = 52;
            if (rem.frequency === 'Mensual') occurrences = 12;
            if (rem.frequency === 'Anual') occurrences = 2;

            for (let i = 0; i < occurrences; i++) {
                const eventDate = new Date(baseDate);

                if (rem.frequency === 'Semanal') eventDate.setDate(baseDate.getDate() + (i * 7));
                if (rem.frequency === 'Mensual') eventDate.setMonth(baseDate.getMonth() + i);
                if (rem.frequency === 'Anual') eventDate.setFullYear(baseDate.getFullYear() + i);

                events.push({
                    id: `${rem.id}-${i}`,
                    date: eventDate,
                    title: rem.title,
                    subtitle: rem.time + (rem.frequency !== 'No se repite' ? ` (${rem.frequency})` : ''),
                    type: 'Reminder',
                    priority: 'Alta',
                    notes: rem.notes
                });
            }
        });

        // 5. Maintenance Plans
        maintenancePlans.forEach(plan => {
            // Specific Events
            if (plan.events && Array.isArray(plan.events)) {
                plan.events.forEach((evt: any) => {
                    if (evt.estimatedDate) {
                        events.push({
                            id: `evt-${evt.id || Math.random()}`,
                            date: new Date(evt.estimatedDate + 'T00:00:00'),
                            title: `Planificado: ${evt.title}`,
                            subtitle: plan.asset_name || 'Activo',
                            type: 'MaintenanceEvent',
                            status: evt.status,
                            assetId: plan.asset_id,
                            notes: `Tareas definidas.`
                        });
                    }
                });
            }
        });

        // 6. Asset Expirations & Incidents
        assets.forEach(asset => {
            // Expirations
            if (asset.expirations && Array.isArray(asset.expirations)) {
                asset.expirations.forEach((exp: any) => {
                    if (exp.expirationDate) {
                        events.push({
                            id: `exp-${asset.id}-${exp.id || Math.random()}`,
                            date: new Date(exp.expirationDate + 'T00:00:00'),
                            title: `Vence: ${exp.type}`,
                            subtitle: asset.name,
                            type: 'Expiration',
                            status: 'Documentación',
                            assetId: asset.id,
                            notes: `Notas: ${exp.notes || 'Renovar.'}`
                        });
                    }
                });
            }

            // Incidents
            if (asset.incidents && Array.isArray(asset.incidents)) {
                asset.incidents.forEach((inc: any) => {
                    if (inc.date) {
                        events.push({
                            id: `inc-${asset.id}-${inc.id || Math.random()}`,
                            date: new Date(inc.date + 'T00:00:00'),
                            title: `Siniestro: ${inc.damageLevel}`,
                            subtitle: asset.name,
                            type: 'Incident',
                            status: inc.status,
                            assetId: asset.id,
                            priority: 'Crítica',
                            notes: inc.description
                        });
                    }
                });
            }
        });

        return events.sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [customReminders, workOrders, allocations, transfers, maintenancePlans, assets]);

    // --- UPCOMING EXPIRATIONS LOGIC (90 DAYS) ---
    const upcomingExpirations = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const limitDate = new Date();
        limitDate.setDate(today.getDate() + 90);
        limitDate.setHours(23, 59, 59, 999);

        const grouped: Record<string, any[]> = {};



        assets.forEach(asset => {
            if (asset.expirations && Array.isArray(asset.expirations)) {
                asset.expirations.forEach(exp => {
                    const expDate = new Date(exp.expirationDate + 'T00:00:00');

                    if (expDate >= today && expDate <= limitDate) {
                        if (!grouped[exp.type]) grouped[exp.type] = [];

                        // Calculate days remaining
                        const diffTime = Math.abs(expDate.getTime() - today.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        grouped[exp.type].push({
                            ...exp,
                            assetName: asset.name,
                            internalId: asset.internalId,
                            assetId: asset.id,
                            daysRemaining: diffDays,
                            isUrgent: diffDays <= 30
                        });
                    }
                });
            }
        });

        // Sort within groups by date
        Object.keys(grouped).forEach(key => {
            grouped[key].sort((a, b) => a.daysRemaining - b.daysRemaining);
        });

        return grouped;
    }, []);

    const totalUpcomingCount = Object.values(upcomingExpirations).flat().length;

    // --- HELPERS ---
    const isSameDay = (d1: Date, d2: Date) => d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();

    const isDateInEvent = (checkDate: Date, event: CalendarEvent) => {
        const checkTime = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate()).getTime();
        const startTime = new Date(event.date.getFullYear(), event.date.getMonth(), event.date.getDate()).getTime();
        if (event.endDate) {
            const endTime = new Date(event.endDate.getFullYear(), event.endDate.getMonth(), event.endDate.getDate()).getTime();
            return checkTime >= startTime && checkTime <= endTime;
        }
        return checkTime === startTime;
    };

    const isDateInWeek = (date: Date, referenceDate: Date) => {
        const startOfWeek = new Date(referenceDate);
        startOfWeek.setDate(referenceDate.getDate() - referenceDate.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return date.getTime() >= startOfWeek.getTime() && date.getTime() <= endOfWeek.getTime();
    };

    const isDateInMonth = (date: Date, referenceDate: Date) => date.getMonth() === referenceDate.getMonth() && date.getFullYear() === referenceDate.getFullYear();

    const getEventsForPeriod = () => {
        switch (agendaViewMode) {
            case 'day': return allEvents.filter(event => isDateInEvent(selectedDate, event));
            case 'week': return allEvents.filter(event => {
                if (event.endDate) {
                    const startOfWeek = new Date(selectedDate);
                    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
                    const endOfWeek = new Date(startOfWeek);
                    endOfWeek.setDate(startOfWeek.getDate() + 6);
                    return event.date <= endOfWeek && (event.endDate || event.date) >= startOfWeek;
                }
                return isDateInWeek(event.date, selectedDate);
            });
            case 'month': return allEvents.filter(event => {
                if (event.endDate) return isDateInMonth(event.date, selectedDate) || isDateInMonth(event.endDate, selectedDate);
                return isDateInMonth(event.date, selectedDate);
            });
            default: return [];
        }
    };

    const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const weekDays = ["D", "L", "M", "M", "J", "V", "S"];

    const handlePrev = () => {
        if (viewMode === 'month') {
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
        } else {
            const prevWeek = new Date(currentDate);
            prevWeek.setDate(currentDate.getDate() - 7);
            setCurrentDate(prevWeek);
        }
    };

    const handleNext = () => {
        if (viewMode === 'month') {
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
        } else {
            const nextWeek = new Date(currentDate);
            nextWeek.setDate(currentDate.getDate() + 7);
            setCurrentDate(nextWeek);
        }
    };

    const handleSaveReminder = () => {
        if (!reminderForm.title) { alert("Por favor escriba un título."); return; }

        const newReminder: CustomReminder = {
            id: Math.random().toString(36).substr(2, 9),
            title: reminderForm.title,
            date: reminderForm.date,
            time: reminderForm.time,
            frequency: reminderForm.frequency,
            notes: reminderForm.notes
        };
        setCustomReminders([...customReminders, newReminder]);
        setIsReminderOpen(false);
        setReminderForm({ title: '', date: new Date().toISOString().split('T')[0], time: '09:00', frequency: 'No se repite', notes: '' });
    };

    const getEventStyle = (event: CalendarEvent) => {
        switch (event.type) {
            case 'Incident': return { icon: <AlertTriangle size={18} />, bg: 'bg-red-500', border: 'border-red-200', text: 'text-white', accent: 'bg-red-700' };
            case 'Expiration': return { icon: <FileText size={18} />, bg: 'bg-teal-50', border: 'border-teal-100', text: 'text-teal-600', accent: 'bg-teal-500' };
            case 'Maintenance': return { icon: <Wrench size={18} />, bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', accent: 'bg-slate-400' };
            case 'MaintenanceEvent': return { icon: <CalendarClock size={18} />, bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-600', accent: 'bg-indigo-500' };
            case 'Reminder': return { icon: <Bell size={18} />, bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-600', accent: 'bg-purple-500' };
            case 'WorkOrder': return { icon: <Briefcase size={18} />, bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-600', accent: 'bg-blue-500' };
            case 'Transfer': return { icon: <Truck size={18} />, bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-600', accent: 'bg-green-500' };
            default: return { icon: <MapPin size={18} />, bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-600', accent: 'bg-orange-500' };
        }
    };

    const getEventTypeLabel = (type: string) => {
        const map: Record<string, string> = {
            'Allocation': 'Asignación',
            'WorkOrder': 'Orden de Trabajo',
            'Transfer': 'Traslado',
            'Reminder': 'Recordatorio',
            'Maintenance': 'Mantenimiento (Est.)',
            'MaintenanceEvent': 'Plan Mantenimiento',
            'Expiration': 'Vencimiento',
            'Incident': 'Siniestro'
        };
        return map[type] || type;
    };

    const selectedEvents = getEventsForPeriod();

    const getAgendaSubtitle = () => {
        if (agendaViewMode === 'day') return `${selectedDate.getDate()} de ${monthNames[selectedDate.getMonth()]}`;
        if (agendaViewMode === 'week') {
            const start = new Date(selectedDate);
            start.setDate(selectedDate.getDate() - selectedDate.getDay());
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            return `Del ${start.getDate()}/${start.getMonth() + 1} al ${end.getDate()}/${end.getMonth() + 1}`;
        }
        return monthNames[selectedDate.getMonth()] + ' ' + selectedDate.getFullYear();
    };

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-24 font-sans relative">

            {/* Expirations Summary Modal (90 Days) */}
            {isExpirationsSummaryOpen && (
                <div className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-sm flex items-end md:items-center justify-center animate-in fade-in duration-300 p-0 md:p-6">
                    <div className="bg-white w-full max-w-2xl rounded-t-[2.5rem] md:rounded-[2.5rem] h-[85vh] md:h-auto md:max-h-[85vh] flex flex-col shadow-2xl relative animate-in slide-in-from-bottom-20 duration-500">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <ShieldAlert size={24} className="text-red-500" /> Vencimientos Próximos
                                </h2>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">Próximos 90 Días</p>
                            </div>
                            <button onClick={() => setIsExpirationsSummaryOpen(false)} aria-label="Cerrar resumen" className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
                            {totalUpcomingCount === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 text-center">
                                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                                        <CheckCircle2 size={32} className="text-green-500" />
                                    </div>
                                    <p className="text-slate-500 font-medium">Todo en orden.</p>
                                    <p className="text-xs text-slate-400 mt-1">No hay vencimientos de documentación en los próximos 3 meses.</p>
                                </div>
                            ) : (
                                Object.entries(upcomingExpirations).map(([type, items]: [string, any[]]) => (
                                    <div key={type} className="space-y-3">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-slate-300"></span> {type} ({items.length})
                                        </h3>
                                        <div className="grid grid-cols-1 gap-3">
                                            {items.map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => { setIsExpirationsSummaryOpen(false); navigate(`/assets`, { state: { targetAssetId: item.assetId } }); }}
                                                    className={`p-4 rounded-2xl border flex justify-between items-center cursor-pointer transition-all hover:shadow-md active:scale-[0.98] ${item.isUrgent ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100'}`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 border ${item.isUrgent ? 'bg-white border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                                                            <span className={`text-lg font-bold ${item.isUrgent ? 'text-red-600' : 'text-slate-700'}`}>{item.daysRemaining}</span>
                                                            <span className="text-[8px] font-bold text-slate-400 uppercase">Días</span>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-slate-800 text-sm">{item.assetName}</h4>
                                                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">{item.internalId} • {item.notes}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${item.isUrgent ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                                                            {item.expirationDate}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-[2.5rem]">
                            <button onClick={() => setIsExpirationsSummaryOpen(false)} className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm shadow-sm">
                                Cerrar Reporte
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Event Detail Modal (Bottom Sheet) */}
            {eventInDetail && (
                <div
                    className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-300"
                    onClick={() => setEventInDetail(null)}
                >
                    <div
                        className="bg-white w-full max-w-lg rounded-t-[3rem] p-8 animate-in slide-in-from-bottom-40 duration-500 shadow-2xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-6"></div>

                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 ${getEventStyle(eventInDetail).bg} ${getEventStyle(eventInDetail).text} rounded-2xl flex items-center justify-center shadow-sm`}>
                                    {getEventStyle(eventInDetail).icon}
                                </div>
                                <div>
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${getEventStyle(eventInDetail).text}`}>
                                        {getEventTypeLabel(eventInDetail.type)}
                                    </span>
                                    <h2 className="text-xl font-bold text-slate-800 leading-tight">{eventInDetail.title}</h2>
                                </div>
                            </div>
                            <button onClick={() => setEventInDetail(null)} aria-label="Cerrar detalle" className="p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Fecha</span>
                                    <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <CalendarIcon size={14} className="text-slate-400" />
                                        {eventInDetail.date.toLocaleDateString('es-ES')}
                                    </p>
                                </div>
                                {eventInDetail.endDate && (
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Finaliza</span>
                                        <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                            <CalendarIcon size={14} className="text-slate-400" />
                                            {eventInDetail.endDate.toLocaleDateString('es-ES')}
                                        </p>
                                    </div>
                                )}
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50 col-span-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Entidad Relacionada</span>
                                    <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <MapPin size={14} className="text-orange-500" />
                                        {eventInDetail.subtitle}
                                    </p>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-3">
                                    <Info size={14} className="text-slate-400" /> Detalle
                                </h3>
                                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                    {eventInDetail.notes || "Sin información adicional disponible."}
                                </p>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setEventInDetail(null)}
                                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-colors"
                                >
                                    Cerrar
                                </button>

                                {eventInDetail.type === 'WorkOrder' && (
                                    <button
                                        onClick={() => { setEventInDetail(null); navigate(`/maintenance/ot/${eventInDetail.id}`); }}
                                        className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-100 flex items-center justify-center gap-2"
                                    >
                                        <ExternalLink size={18} /> Ver OT
                                    </button>
                                )}

                                {(eventInDetail.type === 'Allocation' || eventInDetail.type === 'Maintenance' || eventInDetail.type === 'Expiration' || eventInDetail.type === 'Incident' || eventInDetail.type === 'MaintenanceEvent') && eventInDetail.assetId && (
                                    <button
                                        onClick={() => { setEventInDetail(null); navigate(`/assets`, { state: { targetAssetId: eventInDetail.assetId } }); }}
                                        className="flex-1 py-4 bg-orange-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-orange-100 flex items-center justify-center gap-2"
                                    >
                                        <MapPin size={18} /> Ver Activo
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reminder Modal */}
            {isReminderOpen && (
                <div className="fixed inset-0 z-50 bg-[#F8F9FA] flex flex-col animate-in slide-in-from-bottom-10 duration-300">
                    <div className="bg-white p-4 shadow-sm flex items-center justify-between sticky top-0 z-10">
                        <button onClick={() => setIsReminderOpen(false)} aria-label="Volver" className="text-slate-600"><ChevronLeft size={24} /></button>
                        <h1 className="font-bold text-lg text-slate-800">Nuevo Recordatorio</h1>
                        <button onClick={() => setIsReminderOpen(false)} className="text-orange-500 font-bold text-sm">Cancelar</button>
                    </div>

                    <div className="p-6 space-y-8 overflow-y-auto pb-24">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">Título del Evento</label>
                            <input
                                type="text"
                                value={reminderForm.title}
                                onChange={(e) => setReminderForm({ ...reminderForm, title: e.target.value })}
                                placeholder="Ej. Reunión de coordinación, Pago de servicios..."
                                className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-orange-500 font-medium text-slate-700 shadow-sm"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">Frecuencia</label>
                            <div className="flex flex-wrap gap-2">
                                {['No se repite', 'Semanal', 'Mensual', 'Anual'].map(freq => (
                                    <button
                                        key={freq}
                                        onClick={() => setReminderForm({ ...reminderForm, frequency: freq as any })}
                                        className={`flex items-center justify-center px-4 py-3 rounded-xl border font-bold text-xs transition-all flex-1 ${reminderForm.frequency === freq ? 'bg-purple-500 border-purple-500 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500'}`}
                                    >
                                        {freq === 'Semanal' && <Repeat size={14} className="mr-1" />}
                                        {freq === 'Anual' && <CalendarIcon size={14} className="mr-1" />}
                                        {freq}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">Fecha</label>
                                <input
                                    type="date"
                                    value={reminderForm.date}
                                    onChange={(e) => setReminderForm({ ...reminderForm, date: e.target.value })}
                                    aria-label="Fecha del evento"
                                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-orange-500 text-sm font-medium text-slate-700"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">Hora</label>
                                <input
                                    type="time"
                                    value={reminderForm.time}
                                    onChange={(e) => setReminderForm({ ...reminderForm, time: e.target.value })}
                                    aria-label="Hora del evento"
                                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-orange-500 text-sm font-medium text-slate-700"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">Notas / Detalles</label>
                            <textarea
                                placeholder="Información adicional..."
                                value={reminderForm.notes}
                                onChange={(e) => setReminderForm({ ...reminderForm, notes: e.target.value })}
                                className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-orange-500 text-sm min-h-[120px] shadow-sm resize-none"
                            />
                        </div>

                        <button
                            onClick={handleSaveReminder}
                            className="w-full bg-slate-800 text-white py-4 rounded-2xl font-bold shadow-xl shadow-slate-200 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                        >
                            <Save size={20} /> Guardar Recordatorio
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-white p-4 sticky top-0 z-10 shadow-sm flex items-center justify-between">
                <button onClick={() => navigate(-1)} aria-label="Volver" className="text-slate-600 p-2"><ChevronLeft size={24} /></button>
                <div className="flex flex-col items-center">
                    <h1 className="font-bold text-lg text-slate-800">Calendario</h1>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</p>
                </div>
                <button
                    onClick={() => setIsExpirationsSummaryOpen(true)}
                    className="relative p-2 text-slate-600 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors"
                >
                    <AlertCircle size={24} />
                    {totalUpcomingCount > 0 && (
                        <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                            {totalUpcomingCount}
                        </span>
                    )}
                </button>
            </div>

            <div className="px-6 py-4">
                <div className="flex gap-2 mb-6">
                    <div className="flex bg-slate-200 p-1 rounded-2xl flex-1">
                        <button onClick={() => setViewMode('month')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${viewMode === 'month' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-50'}`}>Mes</button>
                        <button onClick={() => setViewMode('week')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${viewMode === 'week' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-50'}`}>Semana</button>
                    </div>
                    <button
                        onClick={() => setIsExpirationsSummaryOpen(true)}
                        className="bg-red-50 text-red-600 px-3 rounded-2xl text-[10px] font-bold border border-red-100 flex items-center gap-1 hover:bg-red-100 transition-colors whitespace-nowrap"
                    >
                        <ShieldAlert size={14} /> Vencimientos
                    </button>
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50 mb-8 overflow-hidden">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="font-bold text-slate-800 text-lg">
                            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </h2>
                        <div className="flex gap-2">
                            <button onClick={handlePrev} aria-label="Anterior" className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-600"><ChevronLeft size={18} /></button>
                            <button onClick={handleNext} aria-label="Siguiente" className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-600"><ChevronRight size={18} /></button>
                        </div>
                    </div>

                    {viewMode === 'month' ? (
                        <div className="grid grid-cols-7 gap-y-2 justify-items-center">
                            {weekDays.map((day, idx) => <span key={idx} className="text-xs font-bold text-slate-400 mb-2">{day}</span>)}
                            {Array.from({ length: firstDayOfMonth(currentDate) }).map((_, i) => <div key={`empty-${i}`} className="h-10 w-10"></div>)}
                            {Array.from({ length: daysInMonth(currentDate) }).map((_, i) => {
                                const day = i + 1;
                                const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                                const isSelected = isSameDay(dayDate, selectedDate);
                                const dayEvents = allEvents.filter(e => isDateInEvent(dayDate, e));

                                return (
                                    <button key={day} onClick={() => setSelectedDate(dayDate)} className={`h-10 w-10 rounded-full flex flex-col items-center justify-center relative ${isSelected ? 'bg-orange-500 text-white shadow-md scale-110' : 'text-slate-700'}`}>
                                        <span className="text-sm font-medium">{day}</span>
                                        {dayEvents.length > 0 && !isSelected && (
                                            <span className={`w-1.5 h-1.5 rounded-full absolute bottom-1 ${dayEvents.some(e => e.type === 'Incident') ? 'bg-red-500' : 'bg-orange-400'
                                                }`}></span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            {Array.from({ length: 7 }).map((_, i) => {
                                const curr = new Date(currentDate);
                                curr.setDate(curr.getDate() - curr.getDay() + i);
                                const isSelected = isSameDay(curr, selectedDate);
                                return (
                                    <button key={i} onClick={() => setSelectedDate(curr)} className={`flex-1 flex flex-col items-center py-4 rounded-2xl transition-all ${isSelected ? 'bg-orange-500 text-white shadow-xl scale-105' : 'bg-white hover:bg-slate-50'}`}>
                                        <span className={`text-[10px] font-bold uppercase mb-2 ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>{weekDays[i]}</span>
                                        <span className="text-lg font-bold">{curr.getDate()}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
                        <div>
                            <h3 className="font-bold text-slate-800 text-xl">{agendaViewMode === 'day' ? 'Agenda del Día' : agendaViewMode === 'week' ? 'Agenda Semanal' : 'Resumen Mensual'}</h3>
                            <p className="text-sm text-slate-400 font-medium">{getAgendaSubtitle()}</p>
                        </div>
                        <div className="flex bg-slate-200 p-1 rounded-xl w-full md:w-auto">
                            <button onClick={() => setAgendaViewMode('day')} className={`flex-1 px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${agendaViewMode === 'day' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Día</button>
                            <button onClick={() => setAgendaViewMode('week')} className={`flex-1 px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${agendaViewMode === 'week' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Semana</button>
                            <button onClick={() => setAgendaViewMode('month')} className={`flex-1 px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${agendaViewMode === 'month' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Mes</button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {selectedEvents.map((evt, idx) => {
                            const style = getEventStyle(evt);
                            return (
                                <div key={idx} onClick={() => setEventInDetail(evt)} className={`bg-white p-5 rounded-3xl shadow-sm border ${style.border} flex gap-4 relative overflow-hidden group transition-all cursor-pointer`}>
                                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${style.accent}`}></div>
                                    <div className={`flex flex-col items-center justify-center w-12 h-12 ${style.bg} rounded-2xl ${style.text} shrink-0`}>{style.icon}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-slate-800 text-sm truncate">{evt.title}</h4>
                                            {evt.status && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase">{evt.status}</span>}
                                        </div>
                                        <p className="text-xs text-slate-500 truncate mt-0.5">{evt.subtitle}</p>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-lg ${style.bg} ${style.text}`}>{getEventTypeLabel(evt.type)}</span>
                                            {agendaViewMode !== 'day' && <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400"><CalendarIcon size={10} /> {evt.date.getDate()}/{evt.date.getMonth() + 1}</div>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {selectedEvents.length === 0 && (
                            <div className="text-center py-12 bg-white/50 rounded-[2rem] border border-dashed border-slate-200">
                                <p className="text-slate-400 font-bold text-sm">Sin eventos para este periodo.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <button onClick={() => setIsReminderOpen(true)} aria-label="Agregar recordatorio" className="fixed bottom-24 right-6 w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-2xl z-40 border-4 border-white"><Plus size={28} /></button>
        </div>
    );
};

export default CalendarPage;
