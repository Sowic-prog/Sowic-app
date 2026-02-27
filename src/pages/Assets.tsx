
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Car, Hammer, Monitor, UtilityPole, Building2,
    ChevronRight, Activity, Package, AlertTriangle,
    Tractor, Fan, Armchair, Menu
} from 'lucide-react';
import { supabase } from '../supabaseClient';


import AssetImportModal from '../components/AssetImportModal';

const Assets = () => {
    const navigate = useNavigate();
    const [counts, setCounts] = useState({
        vehicles: 0,
        machinery: 0,
        it: 0,
        installations: 0,
        infrastructure: 0,
        furniture: 0
    });
    const [loading, setLoading] = useState(true);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    useEffect(() => {
        fetchCounts();
    }, []);

    const fetchCounts = async () => {
        try {
            const [
                { count: vCount },
                { count: mCount },
                { count: iCount },
                { count: insCount },
                { count: infCount },
                { count: fCount }
            ] = await Promise.all([
                supabase.from('vehicles').select('*', { count: 'exact', head: true }),
                supabase.from('machinery').select('*', { count: 'exact', head: true }),
                supabase.from('it_equipment').select('*', { count: 'exact', head: true }),
                supabase.from('infrastructure_installations').select('*', { count: 'exact', head: true }),
                supabase.from('infrastructures').select('*', { count: 'exact', head: true }),
                supabase.from('mobiliario').select('*', { count: 'exact', head: true })
            ]);

            setCounts({
                vehicles: vCount || 0,
                machinery: mCount || 0,
                it: iCount || 0,
                installations: insCount || 0,
                infrastructure: infCount || 0,
                furniture: fCount || 0
            });
        } catch (error) {
            console.error('Error fetching counts:', error);
        } finally {
            setLoading(false);
        }
    };

    const categories = [
        {
            id: 'vehicles',
            name: 'Rodados',
            icon: Car,
            path: '/assets/vehicles',
            count: counts.vehicles,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50'
        },
        {
            id: 'machinery',
            name: 'Maquinaria',
            icon: Tractor,
            path: '/assets/machinery',
            count: counts.machinery,
            color: 'text-orange-600',
            bgColor: 'bg-orange-50'
        },
        {
            id: 'it',
            name: 'Informática',
            icon: Monitor,
            path: '/assets/it',
            count: counts.it,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50'
        },
        {
            id: 'furniture',
            name: 'Mobiliario',
            icon: Armchair,
            path: '/assets/furniture',
            count: counts.furniture,
            color: 'text-amber-600',
            bgColor: 'bg-amber-50'
        },
        {
            id: 'installations',
            name: 'Instalaciones',
            icon: Fan,
            path: '/assets/installations',
            count: counts.installations,
            color: 'text-green-600',
            bgColor: 'bg-green-50'
        },
        {
            id: 'infrastructure',
            name: 'Infraestructura',
            icon: Building2,
            path: '/assets/infrastructure',
            count: counts.infrastructure,
            color: 'text-slate-600',
            bgColor: 'bg-slate-50'
        },
    ];

    return (
        <div className="p-6 space-y-8 bg-[#F8F9FA] min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
                    <div className="flex flex-col gap-1">
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Mis Activos</h1>
                        <p className="text-slate-500 font-medium italic">Gestión de Categorías</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="group bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-600 hover:text-blue-600 px-6 py-3 rounded-[1.5rem] font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                >
                    <Package size={20} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                    Importar Activos
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((cat) => (
                    <div
                        key={cat.id}
                        onClick={() => navigate(cat.path)}
                        className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-xl hover:border-orange-200 transition-all cursor-pointer group active:scale-95"
                    >
                        <div className="flex justify-between items-start mb-8">
                            <div className={`w-14 h-14 ${cat.bgColor} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300`}>
                                <cat.icon className={`${cat.color}`} size={28} />
                            </div>
                            <div className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
                                <ChevronRight size={20} />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-slate-800 mb-1">{cat.name}</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-black text-slate-900">{loading ? '...' : cat.count}</span>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Unidades</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Global Stats or Recent Activity could go here */}
            <div className="bg-slate-900 rounded-[3rem] p-8 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h2 className="text-2xl font-bold mb-2">Resumen Operativo</h2>
                        <p className="text-slate-400 text-sm max-w-md">Control total de flota, maquinaria y activos tecnológicos en tiempo real.</p>
                    </div>
                    <div className="flex gap-8">
                        <div className="text-center">
                            <p className="text-3xl font-black text-orange-500">{loading ? '...' : (counts.vehicles + counts.machinery + counts.it + counts.installations + counts.infrastructure + counts.furniture)}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Activos</p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl font-black text-green-500">92%</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Operatividad</p>
                        </div>
                    </div>
                </div>
            </div>

            <AssetImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={() => {
                    fetchCounts();
                    // Optionally show a toast here
                }}
            />
        </div>
    );
};

export default Assets;

