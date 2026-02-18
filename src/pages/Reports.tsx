
import React, { useState, useMemo } from 'react';
import {
    BarChart3, DollarSign, Wrench, AlertTriangle, ArrowUpRight, ArrowDownRight, Package, Truck, FileText,
    HardHat, Printer, HelpCircle
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart as RechartsPieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { supabase } from '../supabaseClient';
import { Calendar as CalendarIcon, Filter } from 'lucide-react'; // Added icons

const AssetProgressBar: React.FC<{ percentage: number }> = ({ percentage }) => (
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <progress
            value={percentage}
            max={100}
            className="w-full h-full [&::-webkit-progress-bar]:bg-slate-100 [&::-webkit-progress-value]:bg-orange-500 [&::-webkit-progress-value]:transition-all [&::-webkit-progress-value]:duration-1000 [&::-moz-progress-bar]:bg-orange-500"
        />
    </div>
);

const Reports: React.FC = () => {
    // Filter State
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]); // First day of month
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); // Today
    const [statusFilter, setStatusFilter] = useState<'Todas' | 'Completada' | 'En Proceso' | 'Pendiente'>('Todas');
    const [selectedReport, setSelectedReport] = useState<'dashboard' | 'expenses' | 'assets' | 'service_requests'>('dashboard');
    const [selectedProject, setSelectedProject] = useState<string>('Todos'); // Project Filter

    const [loading, setLoading] = useState(true);

    // Raw Data State
    const [workOrders, setWorkOrders] = useState<any[]>([]);
    const [assets, setAssets] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [serviceRequests, setServiceRequests] = useState<any[]>([]);

    // --- 1. FETCH REAL DATA ---
    React.useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Work Orders
                const { data: woData, error: woError } = await supabase
                    .from('work_orders')
                    .select('*')
                    .order('date_start', { ascending: true });

                if (woError) throw woError;
                setWorkOrders(woData || []);

                // Fetch Assets
                const { data: assetData, error: assetError } = await supabase
                    .from('assets')
                    .select('id, name, location, value');

                if (assetError) throw assetError;
                setAssets(assetData || []);

                // Fetch Projects
                const { data: projData, error: projError } = await supabase
                    .from('projects')
                    .select('id, name');

                if (projError) throw projError;
                setProjects(projData || []);

                // Fetch Service Requests
                const { data: srData, error: srError } = await supabase
                    .from('service_requests')
                    .select('*');

                if (srError) throw srError;
                setServiceRequests(srData || []);

            } catch (err) {
                console.error("Error fetching report data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // --- FILTER DATA ---
    const filteredData = useMemo(() => {
        // Filter Work Orders
        const filteredWO = workOrders.filter(wo => {
            // Date Filter
            if (wo.date_start) {
                const woDate = wo.date_start.split('T')[0];
                if (woDate < startDate || woDate > endDate) return false;
            }
            // Status Filter
            if (statusFilter !== 'Todas' && wo.status !== statusFilter) return false;

            // Project Filter
            if (selectedProject !== 'Todos') {
                // If project selected, checks either direct location or asset allocation
                // WORKAROUND: assuming location string matches project name for now as per current data
                const asset = assets.find(a => a.id === wo.asset_id);
                const location = asset ? asset.location : wo.location;
                if (location !== selectedProject) return false;
            }

            return true;
        });

        // Filter Service Requests
        const filteredSR = serviceRequests.filter(sr => {
            const srDate = sr.created_at ? sr.created_at.split('T')[0] : '';
            if (srDate && (srDate < startDate || srDate > endDate)) return false;

            if (selectedProject !== 'Todos') {
                if (sr.location !== selectedProject) return false;
            }
            // Status filter applies? Maybe separate or mapped.
            // For now, only apply Date and Project to SRs to keep it simple, unless user wants status too.
            // User asked for "dashboard filters", usually implies global.
            // SR Statuses: 'Pendiente', 'En Proceso', 'Resuelto'. WO ones: 'Pendiente', 'En Proceso', 'Completada'.
            // We can map them.
            if (statusFilter !== 'Todas') {
                if (statusFilter === 'Completada' && sr.status !== 'Resuelto') return false;
                if (statusFilter === 'Pendiente' && sr.status !== 'Pendiente') return false;
                if (statusFilter === 'En Proceso' && sr.status !== 'En Proceso') return false;
            }
            return true;
        });

        return { wo: filteredWO, sr: filteredSR };
    }, [workOrders, serviceRequests, assets, startDate, endDate, statusFilter, selectedProject]);

    const filteredWorkOrders = filteredData.wo;
    const filteredServiceRequests = filteredData.sr;

    // --- 2. KPI CALCULATIONS ---
    const kpis = useMemo(() => {
        // WORK ORDERS KPIs
        let totalCost = 0;
        let completedOTs = 0;
        let totalOTs = filteredWorkOrders.length;
        let alerts = 0;
        let onTimeOTs = 0;
        let totalClosedOTs = 0;

        filteredWorkOrders.forEach(wo => {
            // Sum Expenses
            const woCost = (wo.expenses || []).reduce((acc: number, curr: any) => acc + (curr.totalCost || 0), 0);
            totalCost += woCost;

            // Count Completed
            if (wo.status === 'Completada') {
                completedOTs++;
                totalClosedOTs++;
                // Check On-Time (if due_date and date_end exist)
                // Assuming date_end is set when status becomes completed. 
                // DB naming might be different, let's look at interfaces or data map if we had it.
                // Assuming `date_end` vs `due_date`.
                if (wo.date_end && wo.due_date) {
                    if (wo.date_end <= wo.due_date) onTimeOTs++;
                } else if (wo.due_date) {
                    // If no date_end, check if today is past due? No, only count closed for "On Time Rate"?
                    // Or count active as on-track? 
                    // Standard is: On Time Rate = (On Time Closed / Total Closed)
                }
            }

            // Count Critical/High pending
            if (wo.status !== 'Completada' && (wo.priority === 'Alta' || wo.priority === 'Crítica')) {
                alerts++;
            }
        });

        const efficiency = totalOTs > 0 ? Math.round((completedOTs / totalOTs) * 100) : 0;
        const onTimeRate = totalClosedOTs > 0 ? Math.round((onTimeOTs / totalClosedOTs) * 100) : 100; // Default 100 if no closed? or 0? 

        // SERVICE REQUESTS KPIs
        let totalSR = filteredServiceRequests.length;
        let resolvedSR = 0;
        let totalSLACompliance = 0;
        let pendingSR = 0;

        filteredServiceRequests.forEach(sr => {
            if (sr.status === 'Resuelto') {
                resolvedSR++;
                // SLA Check: 
                // SLA: 24hs, 48hs... parse.
                // We need closure date. ServiceRequest interface has `auditLog` or `closureConformity`.
                // Let's assume closureConformity.date exists if resolved.
                if (sr.closure_conformity?.date && sr.sla_deadline && sr.created_at) {
                    const created = new Date(sr.created_at).getTime();
                    const closed = new Date(sr.closure_conformity.date).getTime();
                    const hoursTaken = (closed - created) / (1000 * 60 * 60);

                    const slaHours = parseInt(sr.sla_deadline); // "48hs" -> 48
                    if (!isNaN(slaHours) && hoursTaken <= slaHours) {
                        totalSLACompliance++;
                    }
                }
            } else {
                pendingSR++;
            }
        });

        const srResolutionRate = totalSR > 0 ? Math.round((resolvedSR / totalSR) * 100) : 0;
        const slaComplianceRate = resolvedSR > 0 ? Math.round((totalSLACompliance / resolvedSR) * 100) : 100;

        return {
            totalCost, completedOTs, efficiency, alerts, onTimeRate,
            totalSR, resolvedSR, pendingSR, srResolutionRate, slaComplianceRate
        };
    }, [filteredWorkOrders, filteredServiceRequests]);


    // --- 3. CHART DATA PROCESSING ---

    // A. Gastos por Ubicación (Project/Site)
    const projectExpenses = useMemo(() => {
        const expensesByLoc: Record<string, number> = {};

        filteredWorkOrders.forEach(wo => {
            // Find asset location
            const asset = assets.find(a => a.id === wo.asset_id);
            const location = asset ? asset.location : 'Sin Asignar';

            const woCost = (wo.expenses || []).reduce((acc: number, curr: any) => acc + (curr.totalCost || 0), 0);

            if (!expensesByLoc[location]) expensesByLoc[location] = 0;
            expensesByLoc[location] += woCost;
        });

        return Object.entries(expensesByLoc)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10); // Top 10 locations
    }, [filteredWorkOrders, assets]);

    // B. Evolución de Gastos (Mensual)
    const expenseData = useMemo(() => {
        const monthlyData: Record<string, { repuestos: number, manoObra: number, servicios: number }> = {};
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

        filteredWorkOrders.forEach(wo => {
            if (!wo.date_start) return;
            const date = new Date(wo.date_start);
            const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear().toString().slice(2)}`; // e.g., "Ene 24"

            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { repuestos: 0, manoObra: 0, servicios: 0 };
            }

            (wo.expenses || []).forEach((exp: any) => {
                if (exp.category === 'Repuesto' || exp.category === 'Consumible') {
                    monthlyData[monthKey].repuestos += exp.totalCost;
                } else if (exp.category === 'Mano de Obra') {
                    monthlyData[monthKey].manoObra += exp.totalCost;
                } else {
                    monthlyData[monthKey].servicios += exp.totalCost;
                }
            });
        });

        // Convert to array and sort chronologically is tricky with strings, 
        // but if we assume data comes ordered by database query (verified above), we just object.values? 
        // Better to map entries. Ideally we'd sort by date but simplified here:
        return Object.entries(monthlyData).map(([name, vals]) => ({
            name,
            ...vals
        })).slice(-6); // Last 6 months
    }, [filteredWorkOrders]);

    // C. Mix de Mantenimiento (Preventivo vs Correctivo)
    const maintenanceStats = useMemo(() => {
        let prev = 0;
        let corr = 0;
        let pred = 0; // If checking for specific predictive programs

        filteredWorkOrders.forEach(wo => {
            // If linked to maintenance_plan -> Preventive
            // If explicitly 'Predictive' -> Predictive (add logic if field exists)
            // Else -> Corrective
            if (wo.maintenance_plan_id) {
                prev++;
            } else {
                corr++;
            }
        });

        const total = prev + corr + pred;
        if (total === 0) return [];

        return [
            { name: 'Preventivos', value: Math.round((prev / total) * 100), color: '#10B981', colorClass: 'bg-emerald-500', count: prev },
            { name: 'Correctivos', value: Math.round((corr / total) * 100), color: '#F59E0B', colorClass: 'bg-amber-500', count: corr }
        ];
    }, [filteredWorkOrders]);

    // D. Top Activos con Mayor Gasto
    const assetCosts = useMemo(() => {
        const costs: Record<string, number> = {};

        filteredWorkOrders.forEach(wo => {
            const name = wo.asset_name || 'Desconocido';
            const woCost = (wo.expenses || []).reduce((acc: number, curr: any) => acc + (curr.totalCost || 0), 0);

            if (!costs[name]) costs[name] = 0;
            costs[name] += woCost;
        });

        return Object.entries(costs)
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
    }, [filteredWorkOrders]);


    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="bg-[#F8F9FA] min-h-screen flex items-center justify-center font-sans">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full"></div>
                    <p className="text-slate-400 font-bold animate-pulse">Generando Reportes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-24 font-sans">
            {/* PRINT HEADER */}
            <div className="print-header">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-white font-bold text-xl">SW</div>
                    <div>
                        <h1 className="font-bold text-xl text-slate-800 uppercase">Reporte Ejecutivo de Gestión</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">SOWIC Assets & Fleet Analytics</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Periodo: {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}</p>
                    <p className="text-sm font-black text-slate-800">Generado: {new Date().toLocaleDateString()}</p>
                </div>
            </div>

            <div className="p-6 md:p-8 space-y-8">
                <div className="flex justify-between items-center no-print">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Reportes y Analytics</h1>
                        <p className="text-sm text-slate-500">Monitorea el rendimiento y gastos (Datos Reales)</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handlePrint} title="Imprimir Reporte" className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 shadow-sm hover:bg-slate-50">
                            <Printer size={20} />
                        </button>
                    </div>
                </div>

                {/* --- FILTERS BAR --- */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center justify-between no-print">
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                            <CalendarIcon size={16} className="text-slate-400" />
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none"
                                />
                                <span className="text-slate-400">-</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                            <Filter size={16} className="text-slate-400" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none"
                            >
                                <option value="Todas">Estados: Todas</option>
                                <option value="Pendiente">Pendiente</option>
                                <option value="En Proceso">En Proceso</option>
                                <option value="Completada">Completada</option>
                            </select>
                        </div>

                        {/* Project Filter */}
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                            <HardHat size={16} className="text-slate-400" />
                            <select
                                value={selectedProject}
                                onChange={(e) => setSelectedProject(e.target.value)}
                                className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none max-w-[150px]"
                            >
                                <option value="Todos">Obras: Todas</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.name}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            value={selectedReport}
                            onChange={(e) => setSelectedReport(e.target.value as any)}
                            className="bg-orange-50 text-orange-600 px-4 py-2 rounded-xl text-sm font-bold border border-orange-100 focus:outline-none cursor-pointer"
                        >
                            <option value="dashboard">Vista General (Dashboard)</option>
                            <option value="service_requests">Solicitudes de Servicio (KPIs)</option>
                            <option value="expenses">Gastos Detallados</option>
                            <option value="assets">Análisis de Activos</option>
                        </select>
                    </div>
                </div>

                {/* --- CONTENT BASED ON SELECTION --- */}
                {selectedReport === 'dashboard' && (
                    <div className="animate-in fade-in duration-500 space-y-8">
                        {/* Global KPIs */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 group relative">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500"><DollarSign size={16} /></div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Gasto Total</span>
                                    </div>
                                    <div title="Suma total de gastos (materiales, mano de obra, servicios) imputados a las OTs en el periodo seleccionado.">
                                        <HelpCircle size={14} className="text-slate-300 cursor-help" />
                                    </div>
                                </div>
                                <p className="text-2xl font-bold text-slate-800">${kpis.totalCost.toLocaleString()}</p>
                                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold mt-1">
                                    Acumulado Histórico
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 group relative">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500"><Wrench size={16} /></div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">OTs Finalizadas</span>
                                    </div>
                                    <div title="Cantidad de Órdenes de Trabajo con estado 'Completada' dentro del periodo.">
                                        <HelpCircle size={14} className="text-slate-300 cursor-help" />
                                    </div>
                                </div>
                                <p className="text-2xl font-bold text-slate-800">{kpis.completedOTs}</p>
                                <div className="flex items-center gap-1 text-[10px] text-blue-600 font-bold mt-1">
                                    <ArrowUpRight size={10} /> Total
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 group relative">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-500"><BarChart3 size={16} /></div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Eficiencia</span>
                                    </div>
                                    <div title="% de OTs Finalizadas sobre el Total de OTs generadas en el periodo.">
                                        <HelpCircle size={14} className="text-slate-300 cursor-help" />
                                    </div>
                                </div>
                                <p className="text-2xl font-bold text-slate-800">{kpis.efficiency}%</p>
                                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold mt-1">
                                    Tasa de Cierre
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 group relative">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500"><AlertTriangle size={16} /></div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Alertas Activas</span>
                                    </div>
                                    <div title="Cantidad de OTs NO completadas con prioridad Alta o Crítica.">
                                        <HelpCircle size={14} className="text-slate-300 cursor-help" />
                                    </div>
                                </div>
                                <p className="text-2xl font-bold text-slate-800">{kpis.alerts}</p>
                                <div className="flex items-center gap-1 text-[10px] text-red-600 font-bold mt-1">
                                    Prioridad Alta/Crítica
                                </div>
                            </div>
                        </div>

                        {/* SERVICE REQUESTS SUMMARY (Visible on Dashboard too, or separate?) 
                            Let's add a row for Service Requests if on Dashboard, or keep it separate.
                            User asked for "reporte de todos los indicadores... de las solicitudes".
                            Let's add a small summary card on Dashboard or just use the View Selector.
                        */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between relative group">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Solicitudes de Servicio</p>
                                        <div title="Total de tickets recibidos en el periodo.">
                                            <HelpCircle size={12} className="text-slate-300 cursor-help" />
                                        </div>
                                    </div>
                                    <p className="text-2xl font-bold text-slate-800">{kpis.totalSR}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-green-500">{kpis.srResolutionRate}% Resueltas</p>
                                    <p className="text-[10px] text-slate-400">{kpis.pendingSR} Pendientes</p>
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between relative group">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Cumplimiento SLA</p>
                                        <div title="% de solicitudes resueltas dentro del tiempo límite establecido por prioridad (Baja: 72h, Media: 48h, Alta: 24h, Crítica: 4h).">
                                            <HelpCircle size={12} className="text-slate-300 cursor-help" />
                                        </div>
                                    </div>
                                    <p className="text-2xl font-bold text-slate-800">{kpis.slaComplianceRate}%</p>
                                </div>
                                <div className="text-right">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 font-bold text-xs">
                                        SLA
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* On Time OT Rate Card */}
                        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between relative group">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Compromiso de Entrega (On-Time)</p>
                                    <div title="% de OTs completadas antes o en la fecha de vencimiento.">
                                        <HelpCircle size={12} className="text-slate-300 cursor-help" />
                                    </div>
                                </div>
                                <p className="text-2xl font-bold text-slate-800">{kpis.onTimeRate}%</p>
                            </div>
                            <div className="h-2 w-24 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500" style={{ width: `${kpis.onTimeRate}%` }}></div>
                            </div>
                        </div>

                        {/* ... existing charts ... */}
                        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <HardHat size={20} className="text-orange-500" /> Gastos por Centro de Costo (Obras)
                                </h3>
                            </div>
                            {projectExpenses.length > 0 ? (
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={projectExpenses} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                            <XAxis type="number" hide />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                axisLine={false}
                                                tickLine={false}
                                                width={150}
                                                tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }}
                                            />
                                            <Tooltip
                                                cursor={{ fill: '#f8fafc' }}
                                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Gasto Total']}
                                            />
                                            <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} barSize={24} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-40 flex items-center justify-center flex-col text-slate-400">
                                    <BarChart3 size={40} className="mb-2 opacity-50" />
                                    <p className="text-sm font-medium">Sin datos de gastos registrados aún</p>
                                </div>
                            )}
                            <div className="flex justify-end mt-2">
                                <p className="text-[10px] text-slate-400 italic">Datos calculados en base a Órdenes de Trabajo registradas</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Chart 2: Expenses Evolution */}
                            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-slate-800">Evolución de Gastos (6 Meses)</h3>
                                    <div className="flex gap-2 text-[10px] uppercase font-bold text-slate-400">
                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-800"></span> Repuestos</span>
                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> M. Obra</span>
                                    </div>
                                </div>
                                {expenseData.length > 0 ? (
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={expenseData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} tickFormatter={(v) => `$${v / 1000}k`} />
                                                <Tooltip
                                                    cursor={{ fill: '#f8fafc' }}
                                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                                />
                                                <Bar dataKey="repuestos" stackId="a" fill="#0f172a" radius={[0, 0, 4, 4]} barSize={20} />
                                                <Bar dataKey="manoObra" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} barSize={20} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
                                        Sin histórico suficiente
                                    </div>
                                )}
                            </div>

                            {/* Chart 3: Maintenance Types */}
                            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                                <h3 className="font-bold text-slate-800 mb-6">Mix de Mantenimiento</h3>
                                {maintenanceStats.length > 0 ? (
                                    <div className="flex items-center">
                                        <div className="h-64 w-1/2">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RechartsPieChart>
                                                    <Pie
                                                        data={maintenanceStats}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                    >
                                                        {maintenanceStats.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                </RechartsPieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="w-1/2 space-y-4">
                                            {maintenanceStats.map(stat => (
                                                <div key={stat.name} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-3 h-3 rounded-full ${stat.colorClass || 'bg-slate-500'}`}></div>
                                                        <span className="text-xs font-bold text-slate-600">{stat.name}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="block text-sm font-black text-slate-800">{stat.value}%</span>
                                                        <span className="text-[10px] text-slate-400">{stat.count} OTs</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
                                        No hay OTs clasificadas
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Section: Higher Cost Assets */}
                        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <Truck size={18} className="text-orange-500" /> Activos con mayor gasto acumulado
                            </h3>
                            <div className="space-y-4">
                                {assetCosts.length > 0 ? assetCosts.map((asset, i) => {
                                    const percentage = (asset.total / (assetCosts[0].total || 1)) * 100;
                                    return (
                                        <div key={i} className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center font-black text-slate-400 text-xs">{i + 1}</div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-end mb-1.5">
                                                    <span className="text-sm font-bold text-slate-700">{asset.name}</span>
                                                    <span className="text-sm font-black text-slate-900">${asset.total.toLocaleString()}</span>
                                                </div>
                                                <AssetProgressBar percentage={percentage} />
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <p className="text-slate-400 text-sm text-center py-4">Sin gastos registrados por activo</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {selectedReport === 'service_requests' && (
                    <div className="animate-in fade-in duration-500 space-y-8">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <FileText size={20} className="text-blue-500" /> Detalle de Solicitudes de Servicio
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* KPI Cards duplicated or specialized here */}
                            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                                <p className="text-sm font-bold text-slate-400 uppercase">Total Solicitudes</p>
                                <p className="text-4xl font-black text-slate-800 mt-2">{kpis.totalSR}</p>
                            </div>
                            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                                <p className="text-sm font-bold text-slate-400 uppercase">Resolución SLA</p>
                                <p className={`text-4xl font-black mt-2 ${kpis.slaComplianceRate >= 90 ? 'text-green-500' : 'text-orange-500'}`}>{kpis.slaComplianceRate}%</p>
                            </div>
                            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                                <p className="text-sm font-bold text-slate-400 uppercase">Pendientes</p>
                                <p className="text-4xl font-black text-slate-800 mt-2">{kpis.pendingSR}</p>
                            </div>
                        </div>

                        {/* List of critical pending requests could go here */}
                        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                            <h4 className="font-bold text-slate-700 mb-4">Solicitudes Pendientes (Prioridad Alta/Crítica)</h4>
                            <div className="space-y-3">
                                {filteredServiceRequests.filter(sr => sr.status !== 'Resuelto' && (sr.priority === 'Alta' || sr.priority === 'Crítica')).map(sr => (
                                    <div key={sr.id} className="flex justify-between items-center p-4 bg-red-50 rounded-2xl border border-red-100">
                                        <div>
                                            <p className="font-bold text-slate-800">{sr.title}</p>
                                            <p className="text-xs text-slate-500">{sr.location}</p>
                                        </div>
                                        <span className="text-xs font-black text-red-600 uppercase bg-white px-2 py-1 rounded-lg">{sr.priority}</span>
                                    </div>
                                ))}
                                {filteredServiceRequests.filter(sr => sr.status !== 'Resuelto' && (sr.priority === 'Alta' || sr.priority === 'Crítica')).length === 0 && (
                                    <p className="text-slate-400 text-sm text-center">No hay solicitudes críticas pendientes</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {selectedReport === 'expenses' && (
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 animate-in fade-in duration-500">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <DollarSign size={20} className="text-green-500" /> Detalle de Gastos
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-slate-500">
                                <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 rounded-l-xl">Fecha</th>
                                        <th className="px-6 py-3">Concepto / OT</th>
                                        <th className="px-6 py-3">Categoría</th>
                                        <th className="px-6 py-3 text-right rounded-r-xl">Monto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredWorkOrders.flatMap(wo => (wo.expenses || []).map((exp: any, i: number) => ({ ...exp, woTitle: wo.title, date: wo.date_start }))).map((item: any, i: number) => (
                                        <tr key={i} className="bg-white border-b hover:bg-slate-50">
                                            <td className="px-6 py-4 font-medium">{new Date(item.date).toLocaleDateString()}</td>
                                            <td className="px-6 py-4">{item.description} <span className="text-xs text-slate-400 block">{item.woTitle}</span></td>
                                            <td className="px-6 py-4"><span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold">{item.category}</span></td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-800">${item.totalCost?.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    {filteredWorkOrders.flatMap(wo => wo.expenses || []).length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-slate-400">No se encontraron gastos en el periodo seleccionado</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ... other code ... */}
                {selectedReport === 'assets' && (
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 animate-in fade-in duration-500">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <Truck size={20} className="text-blue-500" /> Análisis de Activos
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            {assetCosts.map((asset, i) => (
                                <div key={i} className="p-4 border border-slate-100 rounded-2xl flex justify-between items-center hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-600">{i + 1}</div>
                                        <div>
                                            <p className="font-bold text-slate-800">{asset.name}</p>
                                            <p className="text-xs text-slate-400">Gasto Total Acumulado</p>
                                        </div>
                                    </div>
                                    <p className="text-xl font-black text-slate-800">${asset.total.toLocaleString()}</p>
                                </div>
                            ))}
                            {assetCosts.length === 0 && (
                                <p className="text-center py-12 text-slate-400">Sin datos para mostrar</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Reports;
