
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ClipboardCheck, Plus, Search, Filter, Calendar, User, ArrowRight, ClipboardList, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Checklist } from '../types';

const ChecklistHub: React.FC = () => {
    const { checkPermission, user } = useAuth();
    const navigate = useNavigate();
    const [checklists, setChecklists] = useState<Checklist[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'weekly' | 'full'>('all');

    useEffect(() => {
        fetchChecklists();
    }, []);

    const fetchChecklists = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('checklists')
                .select('*')
                .order('date', { ascending: false });

            if (error) throw error;

            if (data) {
                const mappedData: Checklist[] = data.map(item => ({
                    id: item.mock_id || item.id,
                    assetId: item.asset_id,
                    assetName: item.asset_name,
                    date: item.date,
                    inspector: item.inspector,
                    conformity: item.conformity,
                    items: item.items || [],
                    // We might need to add 'type' to our DB later, for now we infer or add to metadata
                    type: item.metadata?.type || 'Completo'
                }));
                setChecklists(mappedData);
            }
        } catch (err) {
            console.error("Error fetching checklists:", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredChecklists = checklists.filter(chk => {
        const matchesSearch = chk.assetName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            chk.inspector?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'all' || (chk as any).type?.toLowerCase() === (filterType === 'weekly' ? 'semanal' : 'completo');
        return matchesSearch && matchesType;
    });

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-emerald-600 bg-emerald-50';
        if (score >= 70) return 'text-amber-600 bg-amber-50';
        return 'text-red-600 bg-red-50';
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            {/* Header Area */}
            <div className="bg-white px-6 pt-12 pb-8 rounded-b-[2.5rem] shadow-sm border-b border-slate-100 mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-orange-100 rounded-xl text-orange-600">
                                <ClipboardCheck size={24} />
                            </div>
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Check Lists</h1>
                        </div>
                        <p className="text-slate-500 font-medium italic">Inspecciones y Control de Activos</p>
                    </div>

                    <div className="flex gap-3">
                        {checkPermission('/checklist', 'edit') && (
                            <button
                                onClick={() => navigate('/checklist/new')}
                                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-4 rounded-2xl font-black shadow-lg shadow-orange-200 transition-all flex items-center gap-2 group active:scale-95"
                            >
                                <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                                <span>Nuevo Informe</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por activo o inspector..."
                            className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-slate-700 font-bold focus:ring-4 focus:ring-orange-100 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 p-1 bg-slate-50 rounded-2xl">
                        {(['all', 'weekly', 'full'] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setFilterType(t)}
                                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${filterType === t ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {t === 'all' ? 'Todos' : t === 'weekly' ? 'Semanal' : 'Completo'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="px-6 space-y-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Cargando inspecciones...</p>
                    </div>
                ) : filteredChecklists.length === 0 ? (
                    <div className="bg-white p-16 rounded-[2.5rem] shadow-sm border border-slate-100 text-center">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <ClipboardList size={48} className="text-slate-200" />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-2">No hay resultados</h3>
                        <p className="text-slate-400 text-sm max-w-sm mx-auto font-medium">
                            No se encontraron informes de inspección que coincidan con tu búsqueda.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredChecklists.map((chk) => (
                            <div
                                key={chk.id}
                                onClick={() => navigate(`/maintenance/checklist/${chk.id}`)}
                                className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 hover:border-orange-200 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden active:scale-[0.98]"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${getScoreColor(chk.conformity)} shadow-inner`}>
                                            {chk.conformity >= 90 ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black text-slate-800 leading-tight group-hover:text-orange-600 transition-colors">{chk.assetName}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${(chk as any).type === 'Semanal' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                                    {(chk as any).type}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight flex items-center gap-1">
                                                    <Clock size={10} /> ID: {chk.id}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1.5 rounded-xl text-xs font-black ${getScoreColor(chk.conformity)} border border-slate-50`}>
                                        {chk.conformity}%
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100/50">
                                        <div className="flex items-center gap-2 text-slate-400 mb-0.5">
                                            <Calendar size={12} />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Fecha</span>
                                        </div>
                                        <p className="text-xs font-black text-slate-700">{chk.date}</p>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100/50">
                                        <div className="flex items-center gap-2 text-slate-400 mb-0.5">
                                            <User size={12} />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Inspector</span>
                                        </div>
                                        <p className="text-xs font-black text-slate-700 truncate">{chk.inspector}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end">
                                    <div className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                        Ver detalles <ArrowRight size={12} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Legend / Stats */}
            {!loading && checklists.length > 0 && (
                <div className="px-10 mt-12 text-center">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Total de {checklists.length} inspecciones realizadas</p>
                </div>
            )}
        </div>
    );
};

export default ChecklistHub;
