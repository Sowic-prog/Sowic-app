
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Calendar, User, CheckCircle2, AlertCircle, AlertTriangle, FileText, Camera, Sparkles } from 'lucide-react';
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
            // Try fetching by ID (UUID) or mock_id
            let { data, error } = await supabase
                .from('checklists')
                .select('*')
                .eq('id', checklistId)
                .single();

            if (error || !data) {
                // Fallback try mock_id
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
                    items: data.items || []
                });
            }
        } catch (err) {
            console.error("Error fetching checklist:", err);
            alert("Error al cargar el checklist.");
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-green-500 bg-green-50 border-green-100';
        if (score >= 70) return 'text-yellow-500 bg-yellow-50 border-yellow-100';
        return 'text-red-500 bg-red-50 border-red-100';
    };

    const getStatusIcon = (status: 'ok' | 'fail' | 'warning') => {
        switch (status) {
            case 'ok': return <CheckCircle2 size={18} className="text-green-500" />;
            case 'fail': return <AlertCircle size={18} className="text-red-500" />;
            case 'warning': return <AlertTriangle size={18} className="text-yellow-500" />;
            default: return <div className="w-4 h-4 rounded-full bg-slate-200" />;
        }
    };

    if (loading) return <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center text-slate-400">Cargando...</div>;
    if (!checklist) return <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">Checklist no encontrado</div>;

    // Group items by category
    const groupedItems: Record<string, ChecklistItem[]> = {};
    checklist.items.forEach(item => {
        if (!groupedItems[item.category]) groupedItems[item.category] = [];
        groupedItems[item.category].push(item);
    });

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans">
            {/* Header */}
            <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex items-center justify-between">
                <button onClick={() => navigate('/maintenance')} className="text-slate-600" aria-label="Volver">
                    <ChevronLeft size={24} />
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="font-bold text-lg text-slate-800">Inspección #{checklist.id}</h1>
                    <span className="text-[10px] text-slate-400 font-medium tracking-wide bg-slate-100 px-2 py-0.5 rounded-full mt-1">
                        {checklist.assetName}
                    </span>
                </div>
                <div className="w-8"></div> {/* Spacer */}
            </div>

            <div className="p-6 space-y-6">
                {/* Summary Card */}
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-6">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Conformidad</span>
                            <div className={`text-3xl font-black ${getScoreColor(checklist.conformity).split(' ')[0]}`}>
                                {checklist.conformity}%
                            </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${getScoreColor(checklist.conformity)}`}>
                            {checklist.conformity >= 90 ? 'Aprobado' : 'Revisar'}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-2xl">
                            <div className="flex items-center gap-2 text-slate-400 mb-1">
                                <Calendar size={14} />
                                <span className="text-[10px] font-bold uppercase">Fecha</span>
                            </div>
                            <p className="font-bold text-slate-700 text-sm">{checklist.date}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl">
                            <div className="flex items-center gap-2 text-slate-400 mb-1">
                                <User size={14} />
                                <span className="text-[10px] font-bold uppercase">Inspector</span>
                            </div>
                            <p className="font-bold text-slate-700 text-sm">{checklist.inspector}</p>
                        </div>
                    </div>
                </div>

                {/* Items List */}
                <div className="space-y-6">
                    {Object.entries(groupedItems).map(([category, items]) => (
                        <div key={category} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100">
                            <h3 className="font-bold text-slate-700 text-sm border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                                <FileText size={16} className="text-orange-500" />
                                {category}
                            </h3>
                            <div className="space-y-4">
                                {items.map((item) => (
                                    <div key={item.id} className="group">
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-1.5 rounded-full ${item.status === 'ok' ? 'bg-green-100' : 'bg-red-100'}`}>
                                                    {getStatusIcon(item.status)}
                                                </div>
                                                <span className={`text-sm font-medium ${item.status === 'ok' ? 'text-slate-600' : 'text-slate-800'}`}>
                                                    {item.label}
                                                </span>
                                            </div>
                                        </div>

                                        {(item.comment || item.photoData || item.aiAnalysis) && (
                                            <div className="ml-10 bg-slate-50 p-3 rounded-xl space-y-2 mt-2">
                                                {item.comment && (
                                                    <p className="text-xs text-slate-500 italic">"{item.comment}"</p>
                                                )}
                                                {item.photoData && (
                                                    <div className="mt-2">
                                                        <img src={item.photoData} alt="Evidencia" className="h-20 w-20 object-cover rounded-lg border border-slate-200" />
                                                    </div>
                                                )}
                                                {item.aiAnalysis && (
                                                    <div className="flex gap-2 items-start bg-purple-50 p-2 rounded-lg border border-purple-100">
                                                        <Sparkles size={12} className="text-purple-500 mt-0.5 shrink-0" />
                                                        <p className="text-[10px] text-purple-700 leading-tight">{item.aiAnalysis}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="border-b border-slate-50 mt-3 group-last:border-0" />
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
