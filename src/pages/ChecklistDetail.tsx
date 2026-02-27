
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Calendar, User, CheckCircle2, AlertCircle,
    AlertTriangle, FileText, Camera, Sparkles, Activity,
    MapPin, ClipboardCheck, Info
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Checklist, ChecklistItem } from '../types';

const ChecklistDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [checklist, setChecklist] = useState<Checklist | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchChecklist(id);
    }, [id]);

    const fetchChecklist = async (checklistId: string) => {
        try {
            setLoading(true);
            let { data, error } = await supabase
                .from('checklists')
                .select('*')
                .eq('id', checklistId)
                .single();

            if (error || !data) {
                const { data: mockData, error: mockError } = await supabase
                    .from('checklists')
                    .select('*')
                    .eq('mock_id', checklistId)
                    .single();
                if (mockError) throw mockError;
                data = mockData;
            }

            if (data) {
                setChecklist({
                    id: data.mock_id || data.id,
                    assetId: data.asset_id,
                    assetName: data.asset_name,
                    date: data.date,
                    inspector: data.inspector,
                    conformity: data.conformity,
                    items: data.items || [],
                    type: data.metadata?.type || 'Completo',
                    metadata: data.metadata || {}
                });
            }
        } catch (err) {
            console.error("Error fetching checklist:", err);
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return { text: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: CheckCircle2 };
        if (score >= 70) return { text: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100', icon: Info };
        return { text: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100', icon: AlertTriangle };
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Cargando inspección...</p>
        </div>
    );

    if (!checklist) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-300 mb-4">
                <FileText size={40} />
            </div>
            <h2 className="text-xl font-black text-slate-800 mb-2">Checklist no encontrado</h2>
            <p className="text-slate-500 text-sm mb-6">No pudimos localizar el informe solicitado.</p>
            <button onClick={() => navigate('/checklist')} className="px-6 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 shadow-sm">
                Volver al listado
            </button>
        </div>
    );

    const scoreStyle = getScoreColor(checklist.conformity);
    const usage = checklist.metadata?.usage;
    const isRodado = checklist.assetName.toLowerCase().includes('ro') || true; // Assume rodado for unit choice if unclear

    // Group items by category
    const groupedItems: Record<string, ChecklistItem[]> = {};
    checklist.items.forEach(item => {
        if (!groupedItems[item.category]) groupedItems[item.category] = [];
        groupedItems[item.category].push(item);
    });

    return (
        <div className="bg-slate-50 min-h-screen pb-24 font-sans">
            {/* Premium Header */}
            <div className="bg-white px-6 pt-12 pb-8 rounded-b-[2.5rem] shadow-sm border-b border-slate-100 sticky top-0 z-30">
                <div className="flex items-center justify-between mb-6">
                    <button onClick={() => navigate('/checklist')} className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
                        <ChevronLeft size={24} />
                    </button>
                    <div className="text-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Informe Técnico</span>
                        <h1 className="text-lg font-black text-slate-800">Inspección #{checklist.id.toString().slice(-4)}</h1>
                    </div>
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500">
                        <ClipboardCheck size={20} />
                    </div>
                </div>

                <div className="flex flex-col items-center">
                    <div className={`mb-4 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${checklist.type === 'Semanal' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                        {checklist.type}
                    </div>
                    <h2 className="text-xl font-black text-slate-800 text-center mb-1">{checklist.assetName}</h2>
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                        <MapPin size={12} className="text-orange-500" />
                        Ubicación registrada
                    </div>
                </div>
            </div>

            <div className="px-6 -mt-6 space-y-6">
                {/* Score & Highlights Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Conformity Card */}
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-between group overflow-hidden relative">
                        <div className={`absolute right-0 top-0 bottom-0 w-2 ${scoreStyle.text.replace('text', 'bg')}`}></div>
                        <div>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider mb-1">Aprobación</p>
                            <div className={`text-4xl font-black ${scoreStyle.text} leading-none mb-1`}>
                                {checklist.conformity}%
                            </div>
                            <p className="text-slate-500 text-[10px] font-bold uppercase">{checklist.conformity >= 90 ? 'Estado Óptimo' : 'Requiere Atención'}</p>
                        </div>
                        <div className={`w-16 h-16 ${scoreStyle.bg} rounded-3xl flex items-center justify-center ${scoreStyle.text} shadow-inner transition-transform group-hover:scale-110`}>
                            <scoreStyle.icon size={32} />
                        </div>
                    </div>

                    {/* Meta Card (Usage & Inspector) */}
                    <div className="bg-slate-900 p-6 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500 rounded-full blur-[60px] opacity-20 -mr-10 -mt-10"></div>
                        <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-orange-400">
                                        <Activity size={20} />
                                    </div>
                                    <div>
                                        <p className="text-white/40 text-[9px] font-black uppercase tracking-widest">Uso al momento</p>
                                        <p className="text-lg font-black">{usage ? `${usage} ${isRodado ? 'KM' : 'HS'}` : '---'}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 border-t border-white/10 pt-4 mt-auto">
                                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                                    <User size={14} className="text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-white/40 text-[8px] font-black uppercase tracking-widest">Inspeccionado por</p>
                                    <p className="text-xs font-bold">{checklist.inspector}</p>
                                </div>
                                <div className="ml-auto flex items-center gap-2 bg-white/5 px-2 py-1 rounded-lg">
                                    <Calendar size={12} className="text-orange-500" />
                                    <span className="text-[10px] font-bold">{checklist.date}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Checklist Categories */}
                <div className="space-y-6 pb-12">
                    {Object.entries(groupedItems).map(([category, items], idx) => (
                        <div key={category} className="space-y-3">
                            <h3 className="flex items-center gap-2 px-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                                {category}
                            </h3>
                            <div className="space-y-3">
                                {items.map((item) => (
                                    <div
                                        key={item.id}
                                        className={`bg-white p-5 rounded-[2rem] shadow-sm border ${item.status === 'ok' ? 'border-slate-100' : 'border-rose-100 bg-rose-50/30'} transition-all hover:shadow-md`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${item.status === 'ok' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-100 text-rose-500'}`}>
                                                    {item.status === 'ok' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                                                </div>
                                                <span className={`text-sm font-bold leading-tight ${item.status === 'ok' ? 'text-slate-700' : 'text-slate-900'}`}>
                                                    {item.label}
                                                </span>
                                            </div>
                                            <div className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${item.status === 'ok' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-100'}`}>
                                                {item.status === 'ok' ? 'OK' : 'FALLO'}
                                            </div>
                                        </div>

                                        {(item.comment || item.photoData || item.aiAnalysis) && (
                                            <div className="mt-4 pt-4 border-t border-slate-50 space-y-3">
                                                {item.comment && (
                                                    <div className="flex items-start gap-3 bg-slate-50/50 p-3 rounded-2xl">
                                                        <FileText size={14} className="text-slate-400 mt-0.5" />
                                                        <p className="text-xs text-slate-600 font-medium italic">"{item.comment}"</p>
                                                    </div>
                                                )}

                                                {item.photoData && (
                                                    <div className="flex gap-2 p-2 bg-white rounded-2xl border border-slate-100 w-fit">
                                                        <img src={item.photoData} alt="Evidencia" className="h-24 w-24 object-cover rounded-xl shadow-inner" />
                                                        <div className="flex flex-col justify-center px-2">
                                                            <div className="bg-orange-50 p-2 rounded-lg text-orange-500 mb-1">
                                                                <Camera size={16} />
                                                            </div>
                                                            <span className="text-[8px] font-black text-slate-400 uppercase">Evidencia Foto</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {item.aiAnalysis && (
                                                    <div className="flex gap-3 items-center bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50">
                                                        <div className="bg-indigo-500 p-2 rounded-xl text-white shadow-lg shadow-indigo-100">
                                                            <Sparkles size={16} />
                                                        </div>
                                                        <p className="text-[11px] text-indigo-700 font-bold leading-snug">{item.aiAnalysis}</p>
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
            </div>
        </div>
    );
};

export default ChecklistDetail;
