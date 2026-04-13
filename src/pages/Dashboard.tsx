
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell, Search, QrCode, ClipboardList, TrendingUp, AlertTriangle,
    Package, Users, ChevronRight, Truck, MoreHorizontal, Wrench,
    Bot, Handshake, LayoutGrid, HardHat, LifeBuoy, X, Folder, User, Wrench as WrenchIcon, Tag, Box,
    ScanLine, Camera, ArrowLeft, BellRing, Check, Settings, ShieldAlert, History, Grid, BarChart3, Calendar, HelpCircle, Menu
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { databaseService } from '../services/databaseService';
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
    const [projects, setProjects] = useState<any[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [inventory, setInventory] = useState<any[]>([]);
    const [workOrders, setWorkOrders] = useState<any[]>([]);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    // Dynamic Notifications State
    const [notifications, setNotifications] = useState<Notification[]>([]);

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // 1. Fetch Assets and Basic Data via Service
                const { assets, events: mEvents, plans: mPlans, workOrders: woData } = await databaseService.getMaintenanceData();
                setAssets(assets);
                setWorkOrders(woData);

                // Fetch Staff
                const { data: staffData } = await supabase.from('staff').select('*');
                if (staffData) setStaff(staffData);

                // Fetch Projects
                const { data: projData } = await supabase.from('projects').select('*');
                if (projData) setProjects(projData);

                // Fetch Inventory
                const { data: invData } = await supabase.from('inventory').select('*');
                if (invData) setInventory(invData);

                // 2. Notifications Logic
                const dynamicNotifications: Notification[] = [];
                const readIds = JSON.parse(localStorage.getItem('read_notifications') || '[]');
                const deletedIds = JSON.parse(localStorage.getItem('deleted_notifications') || '[]');

                // Service Requests -> Notifications
                const { data: sRequests } = await supabase.from('service_requests').select('*').eq('status', 'Pendiente').limit(5);
                if (sRequests) {
                    sRequests.forEach(req => {
                        if (deletedIds.includes(req.id)) return;
                        dynamicNotifications.push({
                            id: req.id,
                            title: 'Nueva Solicitud',
                            description: req.title,
                            time: 'Pendiente',
                            type: req.priority === 'Crítica' ? 'critical' : 'warning',
                            read: readIds.includes(req.id),
                            link: '/services'
                        });
                    });
                }

                // Maintenance Events -> Notifications
                if (mEvents && mPlans) {
                    const today = new Date();
                    const sevenDaysLater = new Date();
                    sevenDaysLater.setDate(today.getDate() + 7);

                    mEvents.forEach(evt => {
                        if (deletedIds.includes(evt.id)) return;
                        const evtDate = new Date(evt.estimated_date);
                        if (evtDate <= sevenDaysLater) {
                            const plan = mPlans.find(p => p.id === evt.plan_id);
                            const asset = assets.find(a => a.id === plan?.asset_id);
                            dynamicNotifications.push({
                                id: evt.id,
                                title: 'Mantenimiento Próximo',
                                description: `${evt.title} para ${asset?.name || 'Activo'}${asset?.domainNumber ? ` [${asset.domainNumber}]` : ''}`,
                                time: evtDate < today ? 'VENCIDO' : evt.estimated_date,
                                type: evtDate < today ? 'critical' : 'warning',
                                read: readIds.includes(evt.id),
                                link: '/maintenance/plans'
                            });
                        }
                    });
                }
                setNotifications(dynamicNotifications);

                // 3. Recent Activity (Recent Work Orders)
                if (woData) {
                    const mappedActivity = woData.slice(0, 5).map((item: any) => {
                        const relatedAsset = assets.find((a: any) => a.id === item.asset_id);
                        return {
                            ...item,
                            asset: { 
                                name: relatedAsset?.name || 'Desconocido',
                                domainNumber: relatedAsset?.domainNumber 
                            }
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


    const unreadCount = notifications.filter(n => !n.read).length;

    const markAllAsRead = () => {
        const readIds = notifications.map(n => n.id);
        localStorage.setItem('read_notifications', JSON.stringify(readIds));
        setNotifications(notifications.map(n => ({ ...n, read: true })));
    };

    const deleteNotification = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const deletedIds = JSON.parse(localStorage.getItem('deleted_notifications') || '[]');
        localStorage.setItem('deleted_notifications', JSON.stringify([...deletedIds, id]));
        setNotifications(notifications.filter(n => n.id !== id));
    };

    // Global Search Logic using Real Data
    const searchResults = useMemo(() => {
        if (!globalSearch.trim()) return null;
        const term = globalSearch.toLowerCase();

        const results = {
            assets: assets.filter(a => 
                a.name.toLowerCase().includes(term) || 
                (a.internalId && String(a.internalId).toLowerCase().includes(term)) || 
                (a.domainNumber && String(a.domainNumber).toLowerCase().includes(term)) || 
                (a.serial && String(a.serial).toLowerCase().includes(term))
            ),
            projects: projects.filter(p => p.name.toLowerCase().includes(term) || (p.internalId && String(p.internalId).toLowerCase().includes(term))),
            staff: staff.filter(s => s.name.toLowerCase().includes(term) || (s.role && String(s.role).toLowerCase().includes(term))),
            inventory: inventory.filter(i => (i.name && i.name.toLowerCase().includes(term)) || (i.serialNumber && String(i.serialNumber).toLowerCase().includes(term))),
            workOrders: workOrders.filter(o => o.title.toLowerCase().includes(term) || (o.id && String(o.id).toLowerCase().includes(term)))
        };

        const hasResults = Object.values(results).some(arr => arr.length > 0);
        return hasResults ? results : 'empty';
    }, [globalSearch, assets, projects, staff, inventory, workOrders]);

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
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => window.dispatchEvent(new CustomEvent('sowic:toggle-sidebar'))}
                            className="p-2 md:hidden text-white/90 hover:bg-white/10 rounded-xl transition-colors"
                        >
                            <Menu size={24} />
                        </button>
                        <div className="bg-white/20 p-1 rounded-xl backdrop-blur-sm">
                            <img src="/logo.jpg" alt="SOWIC" className="w-8 h-8 rounded-lg object-cover" />
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
                <div className="mt-8 relative z-10">
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
                {globalSearch.trim() ? (
                    /* INTEGRATED SEARCH VIEW (Replaces dashboard content) */
                    <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-slate-50 min-h-[60vh] animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                                <Search size={22} className="text-orange-500" />
                                Resultados
                            </h3>
                            <button onClick={() => setGlobalSearch('')} className="text-[10px] font-black text-orange-500 uppercase tracking-widest px-3 py-1 bg-orange-50 rounded-full">Limpiar</button>
                        </div>

                        <div className="space-y-2">
                            {searchResults && searchResults !== 'empty' ? (
                                [
                                    ...searchResults.assets.map(a => ({ ...a, typeIdx: 'asset', icon: Package, label: a.name, sub: a.domainNumber ? `Patente: ${a.domainNumber}` : a.internalId, color: 'text-orange-500', bgColor: 'bg-orange-50' })),
                                    ...searchResults.workOrders.map(wo => ({ ...wo, typeIdx: 'wo', icon: Wrench, label: wo.title, sub: `OT-${String(wo.id).slice(0, 4)}`, color: 'text-blue-500', bgColor: 'bg-blue-50' })),
                                    ...searchResults.projects.map(p => ({ ...p, typeIdx: 'project', icon: Folder, label: p.name, sub: 'Obra', color: 'text-slate-700', bgColor: 'bg-slate-100' })),
                                    ...searchResults.staff.map(s => ({ ...s, typeIdx: 'staff', icon: User, label: s.name, sub: s.role, color: 'text-slate-600', bgColor: 'bg-slate-100' }))
                                ].map((item, idx) => (
                                    <button
                                        key={`${item.typeIdx}-${item.id || idx}`}
                                        onClick={() => handleResultClick(item.typeIdx as any, item.id)}
                                        className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-all rounded-3xl group border border-transparent hover:border-slate-100"
                                    >
                                        <div className={`w-12 h-12 ${item.bgColor} ${item.color} rounded-2xl flex items-center justify-center shrink-0 shadow-sm`}>
                                            <item.icon size={20} />
                                        </div>
                                        <div className="text-left flex-1 min-w-0">
                                            <p className="text-sm font-black text-slate-700 truncate">{item.label}</p>
                                            <p className="text-xs text-slate-400 font-medium">{item.sub}</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
                                            <ChevronRight size={16} />
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="py-20 text-center opacity-40">
                                    <Search size={48} className="mx-auto mb-4 text-slate-200" />
                                    <p className="text-sm font-bold text-slate-500">No se encontró lo que buscas</p>
                                    <p className="text-xs text-slate-400 mt-1">Prueba con otro nombre o ID</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* NORMAL DASHBOARD VIEW */
                    <>
                        <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
                            <div className="bg-white p-4 rounded-2xl shadow-sm flex-1 min-w-[140px] flex flex-col justify-between h-28 border border-slate-50 group">
                                <div className="flex justify-between items-start">
                                    <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 mb-2">
                                        <Bot size={18} />
                                    </div>
                                    <div title="Total de activos registrados en la plataforma.">
                                        <HelpCircle size={14} className="text-slate-300 cursor-help hover:text-orange-500 transition-colors" />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Activos</p>
                                    <div className="flex items-end gap-2">
                                        <span className="text-2xl font-bold text-slate-800">{loading ? '...' : totalAssets}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-2xl shadow-sm flex-1 min-w-[140px] flex flex-col justify-between h-28 border border-slate-50 group">
                                <div className="flex justify-between items-start">
                                    <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 mb-2">
                                        <WrenchIcon size={18} />
                                    </div>
                                    <div title="Órdenes de trabajo actualmente en curso.">
                                        <HelpCircle size={14} className="text-slate-300 cursor-help hover:text-slate-500 transition-colors" />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Mantenimiento</p>
                                    <div className="flex items-end gap-2">
                                        <span className="text-2xl font-bold text-slate-800">{loading ? '...' : workOrders.filter(wo => wo.status !== 'Completada').length}</span>
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
                        <div className="bg-white p-8 rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-50 relative overflow-hidden group min-h-[300px]">
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
                                                <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1.5">
                                                    Activo: {activity.asset?.name || 'N/A'}
                                                    {activity.asset?.domainNumber && (
                                                        <span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-[4px] font-black uppercase text-[8px]">
                                                            {activity.asset.domainNumber}
                                                        </span>
                                                    )}
                                                </p>
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
                    </>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
