
import React, { useState, useMemo } from 'react';
import {
    BarChart3, DollarSign, Wrench, AlertTriangle, ArrowUpRight, ArrowDownRight, Package, Truck, FileText,
    HardHat, Printer
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart as RechartsPieChart, Pie, Cell
} from 'recharts';
import { supabase } from '../supabaseClient';

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
    const [reportPeriod, setReportPeriod] = useState('Ultimos 30 días');
    const [loading, setLoading] = useState(true);

    // Raw Data State
    const [workOrders, setWorkOrders] = useState<any[]>([]);
    const [assets, setAssets] = useState<any[]>([]);

    // --- 1. FETCH REAL DATA ---
    React.useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Work Orders (Order by date for evolution charts)
                const { data: woData, error: woError } = await supabase
                    .from('work_orders')
                    .select('*')
                    .order('date_start', { ascending: true });

                if (woError) throw woError;
                setWorkOrders(woData || []);

                // Fetch Assets (for location/project mapping)
                const { data: assetData, error: assetError } = await supabase
                    .from('assets')
                    .select('id, name, location, value');

                if (assetError) throw assetError;
                setAssets(assetData || []);

            } catch (err) {
                console.error("Error fetching report data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // --- 2. KPI CALCULATIONS ---
    const kpis = useMemo(() => {
        let totalCost = 0;
        let completedOTs = 0;
        let totalOTs = workOrders.length;
        let alerts = 0;

        workOrders.forEach(wo => {
            // Sum Expenses
            const woCost = (wo.expenses || []).reduce((acc: number, curr: any) => acc + (curr.totalCost || 0), 0);
            totalCost += woCost;

            // Count Completed
            if (wo.status === 'Completada') completedOTs++;

            // Count Critical/High pending
            if (wo.status !== 'Completada' && (wo.priority === 'Alta' || wo.priority === 'Crítica')) {
                alerts++;
            }
        });

        const efficiency = totalOTs > 0 ? Math.round((completedOTs / totalOTs) * 100) : 0;

        return { totalCost, completedOTs, efficiency, alerts };
    }, [workOrders]);


    // --- 3. CHART DATA PROCESSING ---

    // A. Gastos por Ubicación (Project/Site)
    const projectExpenses = useMemo(() => {
        const expensesByLoc: Record<string, number> = {};

        workOrders.forEach(wo => {
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
    }, [workOrders, assets]);

    // B. Evolución de Gastos (Mensual)
    const expenseData = useMemo(() => {
        const monthlyData: Record<string, { repuestos: number, manoObra: number, servicios: number }> = {};
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

        workOrders.forEach(wo => {
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
    }, [workOrders]);

    // C. Mix de Mantenimiento (Preventivo vs Correctivo)
    const maintenanceStats = useMemo(() => {
        let prev = 0;
        let corr = 0;
        let pred = 0; // If checking for specific predictive programs

        workOrders.forEach(wo => {
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
    }, [workOrders]);

    // D. Top Activos con Mayor Gasto
    const assetCosts = useMemo(() => {
        const costs: Record<string, number> = {};

        workOrders.forEach(wo => {
            const name = wo.asset_name || 'Desconocido';
            const woCost = (wo.expenses || []).reduce((acc: number, curr: any) => acc + (curr.totalCost || 0), 0);

            if (!costs[name]) costs[name] = 0;
            costs[name] += woCost;
        });

        return Object.entries(costs)
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
    }, [workOrders]);


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
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Periodo: {reportPeriod}</p>
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

                {/* Global KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500"><DollarSign size={16} /></div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Gasto Total</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-800">${kpis.totalCost.toLocaleString()}</p>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold mt-1">
                            Acumulado Histórico
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500"><Wrench size={16} /></div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">OTs Finalizadas</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-800">{kpis.completedOTs}</p>
                        <div className="flex items-center gap-1 text-[10px] text-blue-600 font-bold mt-1">
                            <ArrowUpRight size={10} /> Total
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-500"><BarChart3 size={16} /></div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Eficiencia</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-800">{kpis.efficiency}%</p>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold mt-1">
                            Tasa de Cierre
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500"><AlertTriangle size={16} /></div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Alertas Activas</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-800">{kpis.alerts}</p>
                        <div className="flex items-center gap-1 text-[10px] text-red-600 font-bold mt-1">
                            Prioridad Alta/Crítica
                        </div>
                    </div>
                </div>

                {/* --- REPORTE 1: GASTOS POR OBRA --- */}
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
        </div>
    );
};

export default Reports;
