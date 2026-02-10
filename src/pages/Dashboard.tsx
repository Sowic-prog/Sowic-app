
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell, Search, QrCode, ClipboardList, TrendingUp, AlertTriangle,
    Package, Users, ChevronRight, Truck, MoreHorizontal, Wrench,
    Bot, Handshake, LayoutGrid, HardHat, LifeBuoy, X, Folder, User, Wrench as WrenchIcon, Tag, Box,
    ScanLine, Camera, ArrowLeft, BellRing, Check, Settings, ShieldAlert, History, Grid, BarChart3, Calendar
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { MOCK_ASSETS, MOCK_PROJECTS, MOCK_STAFF, MOCK_INVENTORY, MOCK_WORK_ORDERS } from '../constants';

interface Notification {
    id: string;
    title: string;
    description: string;
    time: string;
    type: 'critical' | 'warning' | 'info' | 'success';
    read: boolean;
    link?: string;
}

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [globalSearch, setGlobalSearch] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Real Data State
    const [assets, setAssets] = useState<any[]>([]);
    const [activeWorkOrders, setActiveWorkOrders] = useState<any[]>([]);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Assets from all tables
                const [
                    { data: vehiclesData },
                    { data: machineryData },
                    { data: itData },
                    { data: furnitureData },
                    { data: infraData }
                ] = await Promise.all([
                    supabase.from('vehicles').select('id, name, status, internal_id'),
                    supabase.from('machinery').select('id, name, status, internal_id'),
                    supabase.from('it_equipment').select('id, name, status, internal_id'),
                    supabase.from('mobiliario').select('id, name, status, internal_id'),
                    supabase.from('infrastructures').select('id, name, status, internal_id')
                ]);

                // Combine and normalize
                const allAssets = [
                    ...(vehiclesData || []),
                    ...(machineryData || []),
                    ...(itData || []),
                    ...(furnitureData || []),
                    ...(infraData || [])
                ];

                if (allAssets.length > 0) setAssets(allAssets);

                // 2. Fetch Active Work Orders
                const { data: woData } = await supabase
                    .from('work_orders')
                    .select('*')
                    .neq('status', 'Completada');

                if (woData) setActiveWorkOrders(woData);

                // 3. Fetch Recent Activity (Latest created work orders)
                // Removed invalid join with 'assets' table
                const { data: activityData } = await supabase
                    .from('work_orders')
                    .select('id, title, status, created_at, asset_id')
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (activityData) {
                    // Manually map asset names
                    const mappedActivity = activityData.map((item: any) => {
                        const relatedAsset = allAssets.find((a: any) => a.id === item.asset_id);
                        return {
                            ...item,
                            asset: { name: relatedAsset?.name || 'Desconocido' }
                        };
                    });
                    setRecentActivity(mappedActivity);
                }

            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Mock Notifications Data
    const [notifications, setNotifications] = useState<Notification[]>([
        {
            id: '1',
            title: 'Vencimiento de Seguro',
            description: 'El seguro de la Toyota Hilux [VHL-TYT-12] vence en 5 días.',
            time: 'Hace 10 min',
            type: 'critical',
            read: false,
            link: '/assets'
        },
        {
            id: '2',
            title: 'Mantenimiento Pendiente',
            description: 'OT-2024-101 requiere aprobación de materiales.',
            time: 'Hace 1 hora',
            type: 'warning',
            read: false,
            link: '/maintenance/ot/OT-2024-101'
        },
        {
            id: '3',
            title: 'Stock Crítico: Filtros',
            description: 'Quedan menos de 5 unidades de Filtro Aceite NH en Pañol.',
            time: 'Hace 3 horas',
            type: 'warning',
            read: false,
            link: '/inventory'
        },
        {
            id: '4',
            title: 'Traslado Completado',
            description: 'El Compresor Atlas Copco ha llegado a Chubut.',
            time: 'Ayer',
            type: 'success',
            read: true,
            link: '/logistics'
        }
    ]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAllAsRead = () => {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
    };

    const deleteNotification = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setNotifications(notifications.filter(n => n.id !== id));
    };

    // Global Search Logic
    const searchResults = useMemo(() => {
        if (!globalSearch.trim()) return null;
        const term = globalSearch.toLowerCase();

        const results = {
            assets: MOCK_ASSETS.filter(a => a.name.toLowerCase().includes(term) || a.internalId.toLowerCase().includes(term) || a.serial.toLowerCase().includes(term)),
            projects: MOCK_PROJECTS.filter(p => p.name.toLowerCase().includes(term) || p.internalId.toLowerCase().includes(term)),
            staff: MOCK_STAFF.filter(s => s.name.toLowerCase().includes(term) || s.role.toLowerCase().includes(term)),
            inventory: MOCK_INVENTORY.filter(i => i.name.toLowerCase().includes(term) || (i.serialNumber && i.serialNumber.toLowerCase().includes(term))),
            workOrders: MOCK_WORK_ORDERS.filter(o => o.title.toLowerCase().includes(term) || o.id.toLowerCase().includes(term))
        };

        const hasResults = Object.values(results).some(arr => arr.length > 0);
        return hasResults ? results : 'empty';
    }, [globalSearch]);

    const handleResultClick = (type: string, id: string) => {
        setGlobalSearch('');
        setIsSearchFocused(false);
        switch (type) {
            case 'asset': navigate('/assets', { state: { targetAssetId: id } }); break;
            case 'project': navigate('/projects', { state: { targetProjectId: id } }); break;
            case 'staff': navigate('/personnel', { state: { targetStaffId: id } }); break;
            case 'inventory': navigate('/inventory'); break;
            case 'wo': navigate(`/maintenance/ot/${id}`); break;
        }
    };

    // Camera Logic for Dashboard Scanner
    useEffect(() => {
        let stream: MediaStream | null = null;
        if (isScanning) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                .then(s => {
                    stream = s;
                    if (videoRef.current) videoRef.current.srcObject = s;
                })
                .catch(err => console.error("Error accessing camera:", err));
        }
        return () => {
            if (stream) stream.getTracks().forEach(track => track.stop());
        };
    }, [isScanning]);

    const handleSimulateScan = () => {
        setGlobalSearch('MAQ-NH-04');
        setIsScanning(false);
        setIsSearchFocused(true);
    };

    // Fleet Chart Data Calculation using Real Data
    const statusCounts = useMemo(() => assets.reduce((acc, asset) => {
        const status = asset.status || 'Desconocido';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>), [assets]);

    const chartData = [
        { name: 'Disponible', value: statusCounts['Disponible'] || 0, color: '#10B981', dotClass: 'bg-emerald-500' },
        { name: 'En Obra', value: statusCounts['En Obra'] || 0, color: '#3B82F6', dotClass: 'bg-blue-500' },
        { name: 'En Taller', value: statusCounts['En Taller'] || 0, color: '#F59E0B', dotClass: 'bg-amber-500' },
        { name: 'Fuera de Servicio', value: statusCounts['Fuera de Servicio'] || 0, color: '#EF4444', dotClass: 'bg-red-500' },
    ].filter(d => d.value > 0);

    const totalAssets = assets.length;
    const operationalCount = statusCounts['Disponible'] || 0;
    const operationalPercentage = totalAssets > 0 ? Math.round((operationalCount / totalAssets) * 100) : 0;

    const mainModules = [
        { id: 'services', label: 'Servicios', icon: LifeBuoy, path: '/services', color: 'bg-white', iconColor: 'text-slate-600' },
        { id: 'personnel', label: 'Personal', icon: Users, path: '/personnel', color: 'bg-white', iconColor: 'text-orange-500' },
        { id: 'projects', label: 'Obras', icon: Folder, path: '/projects', color: 'bg-slate-800', iconColor: 'text-white' },
        { id: 'assets', label: 'Mis Activos', icon: Grid, path: '/assets', color: 'bg-orange-500', iconColor: 'text-white' },
        { id: 'maintenance', label: 'Mantenimiento', icon: Wrench, path: '/maintenance', color: 'bg-orange-50', iconColor: 'text-orange-600' },
    ];

    const managementModules = [
        { id: 'reports', label: 'Reportes', icon: BarChart3, path: '/reports', color: 'bg-white', iconColor: 'text-slate-600' },
        { id: 'logistics', label: 'Logística', icon: Truck, path: '/logistics', color: 'bg-white', iconColor: 'text-slate-600' },
        { id: 'inventory', label: 'Inventario', icon: Package, path: '/inventory', color: 'bg-white', iconColor: 'text-slate-600' },
        { id: 'providers', label: 'Proveedores', icon: Handshake, path: '/providers', color: 'bg-white', iconColor: 'text-slate-600' },
        { id: 'calendar', label: 'Calendario', icon: Calendar, path: '/calendar', color: 'bg-white', iconColor: 'text-slate-600' },
    ];

    if (isScanning) {
        return (
            <div className="fixed inset-0 bg-black z-[100] flex flex-col font-sans">
                <div className="absolute inset-0 z-0">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-60" />
                </div>
                <div className="relative z-10 p-6 flex justify-between items-center text-white">
                    <button onClick={() => setIsScanning(false)} aria-label='Volver' className="p-2 bg-black/20 rounded-full backdrop-blur-md"><ArrowLeft size={24} /></button>
                    <h2 className="font-bold text-lg">Búsqueda por Código</h2>
                    <button onClick={() => setIsScanning(false)} aria-label='Cerrar escáner' className="p-2 bg-black/20 rounded-full backdrop-blur-md"><X size={24} /></button>
                </div>
                <div className="flex-1 relative z-10 flex flex-col items-center justify-center p-8">
                    <div className="relative w-full max-w-[280px] aspect-square">
                        <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-orange-500 rounded-tl-3xl"></div>
                        <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-orange-500 rounded-tr-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-orange-500 rounded-bl-3xl"></div>
                        <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-orange-500 rounded-br-3xl"></div>
                        <div className="absolute left-4 right-4 h-1 bg-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.8)] animate-scan top-1/2"></div>
                        <button onClick={handleSimulateScan} aria-label='Simular escaneo' className="absolute inset-0 flex items-center justify-center group">
                            <ScanLine size={64} className="text-white/20 group-hover:text-orange-500/50 transition-colors" />
                        </button>
                    </div>
                    <p className="text-white text-center mt-12 px-8 text-sm font-medium leading-relaxed drop-shadow-md">Escanea un código de barras o QR para buscar automáticamente.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#F2F2F2] min-h-full font-sans pb-32 relative">

            {/* GLOBAL SEARCH OVERLAY */}
            {isSearchFocused && (
                <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto px-6 pt-24 pb-12 no-scrollbar">
                    <div className="max-w-xl mx-auto space-y-6">
                        <div className="flex justify-between items-center text-white mb-2">
                            <h2 className="text-xl font-bold">Resultados Globales</h2>
                            <button onClick={() => { setIsSearchFocused(false); setGlobalSearch(''); }} aria-label='Cerrar búsqueda' className="p-2 bg-white/10 rounded-full"><X size={20} /></button>
                        </div>
                        {searchResults === 'empty' ? (
                            <div className="bg-white p-12 rounded-[2.5rem] text-center space-y-3">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300"><Search size={32} /></div>
                                <p className="font-bold text-slate-800">No encontramos coincidencias</p>
                            </div>
                        ) : searchResults && (
                            <div className="space-y-6">
                                {searchResults.assets.length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] ml-2">Activos</h3>
                                        <div className="grid gap-2">
                                            {searchResults.assets.map(a => (
                                                <button key={a.id} onClick={() => handleResultClick('asset', a.id)} className="w-full bg-white p-4 rounded-2xl flex items-center gap-4 hover:bg-orange-50 transition-colors group">
                                                    <img src={a.image} alt={a.name} className="w-10 h-10 rounded-xl object-cover" />
                                                    <div className="text-left flex-1 truncate">
                                                        <p className="text-xs font-black text-slate-800 truncate">{a.name}</p>
                                                        <p className="text-[10px] font-bold text-orange-500 uppercase">{a.internalId}</p>
                                                    </div>
                                                    <ChevronRight size={16} className="text-slate-300 group-hover:text-orange-500" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {searchResults.projects.length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] ml-2">Obras</h3>
                                        <div className="grid gap-2">
                                            {searchResults.projects.map(p => (
                                                <button key={p.id} onClick={() => handleResultClick('project', p.id)} className="w-full bg-white p-4 rounded-2xl flex items-center gap-4 hover:bg-slate-50 transition-colors group">
                                                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600"><Folder size={20} /></div>
                                                    <div className="text-left flex-1 truncate">
                                                        <p className="text-xs font-black text-slate-800 truncate">{p.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{p.internalId}</p>
                                                    </div>
                                                    <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-800" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {searchResults.staff.length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] ml-2">Personal</h3>
                                        <div className="grid gap-2">
                                            {searchResults.staff.map(s => (
                                                <button key={s.id} onClick={() => handleResultClick('staff', s.id)} className="w-full bg-white p-4 rounded-2xl flex items-center gap-4 hover:bg-slate-50 transition-colors group">
                                                    <img src={s.avatar} alt={s.name} className="w-10 h-10 rounded-xl object-cover" />
                                                    <div className="text-left flex-1 truncate">
                                                        <p className="text-xs font-black text-slate-800 truncate">{s.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{s.role}</p>
                                                    </div>
                                                    <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-800" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {searchResults.workOrders.length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] ml-2">Órdenes de Trabajo</h3>
                                        <div className="grid gap-2">
                                            {searchResults.workOrders.map(o => (
                                                <button key={o.id} onClick={() => handleResultClick('wo', o.id)} className="w-full bg-white p-4 rounded-2xl flex items-center gap-4 hover:bg-slate-50 transition-colors group">
                                                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600"><WrenchIcon size={20} /></div>
                                                    <div className="text-left flex-1 truncate">
                                                        <p className="text-xs font-black text-slate-800 truncate">{o.title}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{o.id}</p>
                                                    </div>
                                                    <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-800" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {searchResults.inventory.length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] ml-2">Inventario</h3>
                                        <div className="grid gap-2">
                                            {searchResults.inventory.map(i => (
                                                <button key={i.id} onClick={() => handleResultClick('inventory', i.id)} className="w-full bg-white p-4 rounded-2xl flex items-center gap-4 hover:bg-slate-50 transition-colors group">
                                                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600"><Box size={20} /></div>
                                                    <div className="text-left flex-1 truncate">
                                                        <p className="text-xs font-black text-slate-800 truncate">{i.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{i.category}</p>
                                                    </div>
                                                    <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-800" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* NOTIFICATIONS PANEL */}
            {isNotificationsOpen && (
                <div className="fixed inset-0 z-[80] animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setIsNotificationsOpen(false)}></div>
                    <div className="absolute top-20 right-6 left-6 max-w-sm ml-auto bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-top-4 duration-300">
                        <div className="bg-slate-50 p-6 flex justify-between items-center border-b border-slate-100">
                            <div>
                                <h3 className="font-black text-slate-800 flex items-center gap-2">
                                    <BellRing size={18} className="text-orange-500" /> Notificaciones
                                </h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Centro de Control SOWIC</p>
                            </div>
                            <button onClick={markAllAsRead} className="text-[10px] font-bold text-orange-500 bg-orange-50 px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-orange-100 transition-colors">
                                <Check size={12} /> Leer todo
                            </button>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
                            {notifications.length > 0 ? (
                                <div className="divide-y divide-slate-50">
                                    {notifications.map((n) => (
                                        <div
                                            key={n.id}
                                            onClick={() => {
                                                if (n.link) { navigate(n.link); setIsNotificationsOpen(false); }
                                            }}
                                            className={`p-5 flex gap-4 transition-colors cursor-pointer relative ${n.read ? 'bg-white opacity-60' : 'bg-orange-50/30'}`}
                                        >
                                            {!n.read && <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-orange-500 rounded-full"></div>}

                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.type === 'critical' ? 'bg-red-100 text-red-600' :
                                                n.type === 'warning' ? 'bg-orange-100 text-orange-600' :
                                                    'bg-blue-100 text-blue-600'
                                                }`}>
                                                {n.type === 'critical' ? <ShieldAlert size={20} /> : <Bell size={20} />}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-0.5">
                                                    <h4 className="text-xs font-black text-slate-800 truncate pr-2">{n.title}</h4>
                                                    <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">{n.time}</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{n.description}</p>
                                            </div>

                                            <button onClick={(e) => deleteNotification(e, n.id)} aria-label='Borrar notificación' className="p-1.5 text-slate-300 hover:text-slate-500 transition-colors">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-12 text-center space-y-3">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                                        <Check size={32} />
                                    </div>
                                    <p className="text-sm font-bold text-slate-400">Todo al día. No hay alertas.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100">
                            <button
                                onClick={() => setIsNotificationsOpen(false)}
                                className="w-full py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
                            >
                                <Settings size={14} /> Configurar Alertas
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Orange */}
            <div className="bg-orange-500 pb-12 pt-6 px-6 rounded-b-[2.5rem] relative">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-sm">
                            <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-orange-500 font-bold text-xs">SW</div>
                        </div>
                        <div>
                            <h2 className="text-white/80 text-[10px] font-bold uppercase tracking-wider">SOWIC</h2>
                            <p className="text-white text-xs font-medium">Gestión de Activos</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                            className={`w-9 h-9 backdrop-blur-md rounded-full flex items-center justify-center text-white relative transition-all ${isNotificationsOpen ? 'bg-white text-orange-500 scale-110' : 'bg-white/20'}`}
                        >
                            <Bell size={18} />
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-orange-500 animate-pulse"></span>
                            )}
                        </button>
                        <div className="w-9 h-9 rounded-full bg-white/90 border-2 border-white overflow-hidden">
                            <img src={user?.avatar || "https://ui-avatars.com/api/?name=User"} alt="Profile" className="w-full h-full object-cover" />
                        </div>
                    </div>
                </div>

                {/* SEARCH INPUT */}
                <div className="mt-8 relative z-[70]">
                    <div className={`flex items-center gap-3 bg-white px-5 py-4 rounded-2xl shadow-xl transition-all duration-300 ${isSearchFocused ? 'scale-105 ring-4 ring-white/20' : ''}`}>
                        <Search size={20} className={isSearchFocused ? 'text-orange-500' : 'text-slate-400'} />
                        <input
                            type="text"
                            placeholder="Búsqueda global..."
                            value={globalSearch}
                            onChange={(e) => setGlobalSearch(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                            className="flex-1 bg-transparent border-none outline-none text-slate-800 font-medium placeholder:text-slate-300 text-sm"
                        />
                        <div className="flex items-center gap-3">
                            {globalSearch && (
                                <button onClick={() => setGlobalSearch('')} aria-label='Limpiar búsqueda' className="text-slate-300 hover:text-slate-500"><X size={18} /></button>
                            )}
                            <div className="w-px h-6 bg-slate-100"></div>
                            <button onClick={() => setIsScanning(true)} aria-label='Abrir escáner' className="text-orange-500 p-1 hover:scale-110 transition-transform"><ScanLine size={20} /></button>
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    <p className="text-white/90 text-xs font-medium">Panel Principal,</p>
                    <h1 className="text-2xl font-bold text-white mt-0.5">{user?.name || 'Bienvenido'}</h1>
                </div>
            </div>

            {/* KPI Row and Main Navigation... */}
            <div className="px-6 -mt-8 space-y-8 pb-10">
                <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
                    <div className="bg-white p-4 rounded-2xl shadow-sm flex-1 min-w-[140px] flex flex-col justify-between h-28 border border-slate-50">
                        <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 mb-2">
                            <Bot size={18} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Activos</p>
                            <div className="flex items-end gap-2">
                                <span className="text-2xl font-bold text-slate-800">{loading ? '...' : totalAssets}</span>
                                {/* <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold mb-1">+2%</span> */}
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm flex-1 min-w-[140px] flex flex-col justify-between h-28 border border-slate-50">
                        <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 mb-2">
                            <WrenchIcon size={18} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Mantenimiento</p>
                            <div className="flex items-end gap-2">
                                <span className="text-2xl font-bold text-slate-800">{loading ? '...' : activeWorkOrders.length}</span>
                                <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold mb-1">En Curso</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                            <LayoutGrid size={20} className="text-orange-500" />
                            Módulos
                        </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {mainModules.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => navigate(item.path)}
                                className={`${item.color} p-5 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-3 transition-all active:scale-95 group relative overflow-hidden`}
                            >
                                <div className={`w-12 h-12 ${item.color.includes('bg-white') ? 'bg-slate-50' : 'bg-white/20'} rounded-2xl flex items-center justify-center shadow-sm ${item.iconColor}`}>
                                    <item.icon size={26} />
                                </div>
                                <span className={`text-sm font-bold ${item.color.includes('bg-slate-800') || item.color.includes('bg-orange-500') ? 'text-white' : 'text-slate-700'}`}>
                                    {item.label}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center justify-between mb-4 mt-8">
                        <h3 className="font-bold text-slate-400 text-xs uppercase tracking-widest flex items-center gap-2">
                            Gestión
                        </h3>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {managementModules.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => navigate(item.path)}
                                className={`${item.color} p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 group relative overflow-hidden h-28`}
                            >
                                <div className={`w-10 h-10 ${item.color.includes('bg-white') ? 'bg-slate-50' : 'bg-white/20'} rounded-xl flex items-center justify-center shadow-sm ${item.iconColor}`}>
                                    <item.icon size={20} />
                                </div>
                                <span className={`text-[10px] font-bold ${item.color.includes('bg-slate-800') || item.color.includes('bg-orange-500') ? 'text-white' : 'text-slate-600'}`}>
                                    {item.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Fleet Status Chart */}
                <div className="bg-white p-8 rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <TrendingUp size={80} className="text-slate-800" />
                    </div>

                    <h3 className="font-extrabold text-slate-800 text-lg mb-8 flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
                        Estado de la Flota
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div className="h-56 relative group/chart">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        innerRadius={65}
                                        outerRadius={85}
                                        paddingAngle={8}
                                        dataKey="value"
                                        stroke="none"
                                        cornerRadius={10}
                                        animationBegin={0}
                                        animationDuration={1500}
                                        animationEasing="ease-out"
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.color}
                                                className="filter drop-shadow-sm hover:opacity-80 transition-opacity cursor-pointer"
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '20px',
                                            border: 'none',
                                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                                            padding: '12px 20px'
                                        }}
                                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-4xl font-black text-slate-800 tracking-tighter">{loading ? '...' : `${operationalPercentage}%`}</span>
                                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-[0.2em] mt-1">Disponible</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {chartData.map(d => (
                                <div key={d.name} className="flex items-center justify-between p-3 rounded-2xl border border-slate-50 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all group/item">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${d.dotClass} shadow-sm group-hover/item:scale-125 transition-transform`}></div>
                                        <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{d.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-black text-slate-800">{d.value}</span>
                                        <span className="text-[10px] font-bold text-slate-300">ACT.</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><History size={20} className="text-orange-500" /> Actividad Reciente</h3>
                    </div>
                    <div className="space-y-3">
                        {loading ? <p className="text-sm text-slate-400">Cargando...</p> : (
                            recentActivity.length > 0 ? recentActivity.map((activity) => (
                                <div key={activity.id} className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-4 border border-slate-50">
                                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600"><WrenchIcon size={18} /></div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-slate-800 text-sm truncate">{activity.title}</h4>
                                        <p className="text-[10px] text-slate-500 font-medium">Activo: {activity.asset?.name || 'N/A'}</p>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-bold">
                                        {new Date(activity.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            )) : (
                                <p className="text-sm text-slate-400 italic">No hay actividad reciente.</p>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
