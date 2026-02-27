
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    ChevronLeft, Search, CheckCircle2, AlertCircle, Camera, Save,
    X, Info, ClipboardList, Package, Truck, Hammer, Star,
    ChevronRight, ClipboardCheck, Sparkles, AlertTriangle, Monitor, Home, Grid, ChevronDown
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Asset, ChecklistItem } from '../types';
import { CHECKLIST_TEMPLATES, ChecklistTemplate } from '../utils/checklistTemplates';

const NewChecklist: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const location = useLocation();

    // Steps: 1. Select Asset, 2. Select Template, 3. Fill Form
    const [step, setStep] = useState(1);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | null>(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<'Todos' | 'Vehículos' | 'Maquinaria' | 'Inmuebles' | 'Informática'>('Todos');
    const [currentUsage, setCurrentUsage] = useState<number | ''>('');


    // Form State
    const [results, setResults] = useState<Record<string, { status: 'ok' | 'fail', comment: string, photo: string | null }>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchAssets();
    }, []);

    useEffect(() => {
        const state = location.state as { assetId?: string };
        if (state?.assetId && assets.length > 0 && step === 1) {
            const asset = assets.find(a => a.id === state.assetId);
            if (asset) {
                setSelectedAsset(asset);
                setStep(2);
            }
        }
    }, [location, assets]);

    const fetchAssets = async () => {
        try {
            setLoading(true);

            // We need to fetch from multiple tables as the system uses distributed tables
            const [
                { data: vData },
                { data: mData },
                { data: iData },
                { data: insData },
                { data: infData },
                { data: fData }
            ] = await Promise.all([
                supabase.from('vehicles').select('*'),
                supabase.from('machinery').select('*'),
                supabase.from('it_equipment').select('*'),
                supabase.from('infrastructure_installations').select('*'),
                supabase.from('infrastructures').select('*'),
                supabase.from('mobiliario').select('*')
            ]);

            const allUnifiedAssets: Asset[] = [
                ...(vData || []).map(a => ({
                    id: a.id,
                    name: a.name || 'Sin Nombre',
                    type: 'Rodados',
                    internalId: a.internal_id || '',
                    domainNumber: a.domain_number || '',
                    location: a.location || ''
                })),
                ...(mData || []).map(a => ({
                    id: a.id,
                    name: a.name || 'Sin Nombre',
                    type: 'Maquinaria',
                    internalId: a.internal_id || '',
                    domainNumber: a.serial || '',
                    location: a.location || ''
                })),
                ...(iData || []).map(a => ({
                    id: a.id,
                    name: a.name || 'Sin Nombre',
                    type: 'Equipos de Informática',
                    internalId: a.internal_id || '',
                    domainNumber: a.serial || '',
                    location: a.location || ''
                })),
                ...(insData || []).map(a => ({
                    id: a.id,
                    name: a.name || 'Sin Nombre',
                    type: 'Instalaciones en infraestructuras',
                    internalId: a.internal_id || '',
                    domainNumber: '',
                    location: a.location || ''
                })),
                ...(infData || []).map(a => ({
                    id: a.id,
                    name: a.name || 'Sin Nombre',
                    type: 'Infraestructura',
                    internalId: a.internal_id || '',
                    domainNumber: '',
                    location: a.location || ''
                })),
                ...(fData || []).map(a => ({
                    id: a.id,
                    name: a.name || 'Sin Nombre',
                    type: 'Mobiliario',
                    internalId: a.internal_id || '',
                    domainNumber: '',
                    location: a.location || ''
                }))
            ] as unknown as Asset[];

            setAssets(allUnifiedAssets);
        } catch (err) {
            console.error("Error fetching assets from multiple tables:", err);
        } finally {
            setLoading(false);
        }
    };

    const categories = [
        { id: 'Todos', label: 'Todos', icon: Grid },
        { id: 'Vehículos', label: 'Vehículos', icon: Truck },
        { id: 'Maquinaria', label: 'Maquinaria', icon: Hammer },
        { id: 'Inmuebles', label: 'Inmuebles', icon: Home },
        { id: 'Informática', label: 'Informática', icon: Monitor },
    ];

    const getCategoryMatches = (assetType: string) => {
        if (filterCategory === 'Todos') return true;
        if (filterCategory === 'Vehículos') return assetType === 'Rodados';
        if (filterCategory === 'Maquinaria') return assetType === 'Maquinaria';
        if (filterCategory === 'Inmuebles') return assetType === 'Instalaciones en infraestructuras' || assetType === 'Infraestructura';
        if (filterCategory === 'Informática') return assetType === 'Equipos de Informática';
        return false;
    };

    const filteredAssets = assets.filter(a => {
        const matchesCategory = getCategoryMatches(a.type);
        const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.internalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.domainNumber?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });


    const handleSelectAsset = (asset: Asset) => {
        setSelectedAsset(asset);
        setStep(2);
    };

    const availableTemplates = CHECKLIST_TEMPLATES.filter(t => {
        if (!selectedAsset) return true;

        // Base type match
        return t.assetType === selectedAsset.type;
    });

    const handleSelectTemplate = (template: ChecklistTemplate) => {
        if (!selectedAsset) return;
        navigate('/maintenance/orders', {
            state: {
                action: 'createChecklist',
                assetId: selectedAsset.id,
                templateId: template.id
            }
        });
    };

    const handleToggleStatus = (itemId: string) => {
        setResults(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                status: prev[itemId].status === 'ok' ? 'fail' : 'ok'
            }
        }));
    };

    const handleCommentChange = (itemId: string, comment: string) => {
        setResults(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                comment
            }
        }));
    };

    const handleSubmit = async () => {
        if (!selectedAsset || !selectedTemplate || !user) return;

        try {
            setSaving(true);

            // Calculate conformity
            const totalItems = selectedTemplate.items.length;
            const okItems = Object.values(results).filter(r => r.status === 'ok').length;
            const conformity = Math.round((okItems / totalItems) * 100);

            // Prepare items for DB
            const checklistItems: ChecklistItem[] = selectedTemplate.items.map(tItem => ({
                id: tItem.id,
                category: tItem.category,
                label: tItem.label,
                status: results[tItem.id].status,
                comment: results[tItem.id].comment,
                photoData: results[tItem.id].photo || undefined
            }));

            const now = new Date();
            const dateStr = now.toLocaleDateString('es-AR');

            const newChecklistData = {
                asset_id: selectedAsset.id,
                asset_name: `${selectedAsset.internalId} - ${selectedAsset.name}`,
                date: dateStr,
                inspector: user.name || 'Admin',
                conformity: conformity,
                items: checklistItems,
                metadata: {
                    templateId: selectedTemplate.id,
                    type: selectedTemplate.type,
                    usage: currentUsage
                }
            };

            const { data, error } = await supabase
                .from('checklists')
                .insert(newChecklistData)
                .select()
                .single();

            if (error) throw error;

            // --- Update Asset Current Usage & Last Inspection ---
            const tableName = (selectedAsset.type === 'Rodados' ? 'vehicles' :
                selectedAsset.type === 'Maquinaria' ? 'machinery' :
                    selectedAsset.type === 'Equipos de Informática' ? 'it_equipment' :
                        selectedAsset.type === 'Instalaciones en infraestructuras' ? 'infrastructure_installations' :
                            selectedAsset.type === 'Infraestructura' ? 'infrastructures' : 'mobiliario') as any;


            if (currentUsage !== '') {
                // Determine column name (most use 'hours' for both km and hs in the DB schema context of this project)
                const updateData: any = {
                    hours: currentUsage,
                    // If we want to track last inspection date on the asset itself
                    // last_inspection: now.toISOString() 
                };

                await supabase.from(tableName).update(updateData).eq('id', selectedAsset.id);
            }


            navigate(`/checklist/${data.id}`);
        } catch (err) {
            console.error("Error saving checklist:", err);
            alert("No se pudo guardar el checklist. Reintente por favor.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-24">
            {/* Nav Header */}
            <div className="bg-white px-6 pt-12 pb-6 rounded-b-[2rem] shadow-sm border-b border-slate-100 sticky top-0 z-30">
                <div className="flex items-center justify-between mb-4">
                    <button onClick={() => step > 1 ? setStep(step - 1) : navigate('/checklist')} className="p-2 bg-slate-50 rounded-xl text-slate-400">
                        <ChevronLeft size={24} />
                    </button>
                    <div className="text-center">
                        <h1 className="text-lg font-black text-slate-800">Nuevo Check List</h1>
                        <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest mt-0.5">Paso {step} de 3</p>
                    </div>
                    <div className="w-10"></div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-orange-500 transition-all duration-500"
                        style={{ width: `${(step / 3) * 100}%` }}
                    />
                </div>
            </div>

            <div className="flex-1 p-6">
                {/* STEP 1: SELECT ASSET */}
                {step === 1 && (
                    <div className="space-y-8 animate-in slide-in-from-bottom duration-500">
                        {/* Category Pills */}
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Filtrar Activos</h3>
                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setFilterCategory(cat.id as any)}
                                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${filterCategory === cat.id
                                            ? 'bg-slate-800 text-white border-slate-800 shadow-md'
                                            : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'
                                            }`}
                                    >
                                        <cat.icon size={14} className={filterCategory === cat.id ? 'text-emerald-400' : 'text-slate-400'} />
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Dropdown Style Selection */}
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Activo Asociado</h3>
                            <div className="relative group">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors z-10">
                                    <Search size={20} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Seleccionar Equipo o Inmueble..."
                                    className="w-full bg-[#F5F8FA] border-none rounded-3xl py-5 pl-14 pr-12 text-slate-700 font-bold shadow-inner focus:ring-4 focus:ring-slate-100 transition-all text-base"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300">
                                    <ChevronDown size={20} />
                                </div>
                            </div>
                        </div>

                        {/* Results List */}
                        <div className="space-y-3 pt-2">
                            {loading ? (
                                Array(3).fill(0).map((_, i) => <div key={i} className="h-20 bg-slate-100/50 rounded-3xl animate-pulse" />)
                            ) : filteredAssets.length > 0 ? (
                                filteredAssets.slice(0, 50).map(asset => (
                                    <button
                                        key={asset.id}
                                        onClick={() => handleSelectAsset(asset)}
                                        className="w-full bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between hover:border-orange-200 hover:translate-x-1 transition-all group active:scale-[0.98]"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
                                                {asset.type === 'Rodados' ? <Truck size={22} /> : asset.type === 'Maquinaria' ? <Hammer size={22} /> : asset.type === 'Equipos de Informática' ? <Monitor size={22} /> : <Home size={22} />}
                                            </div>
                                            <div className="text-left">
                                                <h4 className="font-black text-slate-800 text-sm leading-tight group-hover:text-orange-600 transition-colors">{asset.name}</h4>
                                                <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-1">{asset.internalId} • {asset.domainNumber || 'SIN ID'}</p>
                                            </div>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-200 group-hover:text-orange-500 group-hover:bg-orange-50 transition-all">
                                            <ChevronRight size={18} />
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="text-center py-12 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                                    <span className="inline-block p-4 bg-slate-50 rounded-full text-slate-200 mb-4">
                                        <Package size={32} />
                                    </span>
                                    <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Sin coincidencias</p>
                                </div>
                            )}
                        </div>

                        {/* Bottom Label for Step 1 */}
                        <div className="text-center pt-4">
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] px-4">Seleccione el activo para ver las plantillas disponibles</p>
                        </div>
                    </div>
                )}

                {/* STEP 2: SELECT TEMPLATE */}
                {step === 2 && selectedAsset && (
                    <div className="space-y-6 animate-in slide-in-from-right duration-500">
                        <div>
                            <div className="flex items-center gap-3 mb-4 p-4 bg-orange-50 rounded-3xl border border-orange-100">
                                {selectedAsset.type === 'Rodados' ? <Truck className="text-orange-500" /> : <Hammer className="text-orange-500" />}
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest leading-none">Activo Seleccionado</p>
                                    <p className="text-sm font-black text-orange-700">{selectedAsset.name}</p>
                                </div>
                                <button onClick={() => setStep(1)} className="text-orange-400 text-xs font-bold underline">Cambiar</button>
                            </div>
                            <h2 className="text-xl font-black text-slate-800 mb-2">Seleccionar Tipo</h2>
                            <p className="text-sm text-slate-400 font-medium">Elige la plantilla que deseas aplicar.</p>
                        </div>

                        <div className="space-y-4">
                            {availableTemplates.map(template => (
                                <button
                                    key={template.id}
                                    onClick={() => handleSelectTemplate(template)}
                                    className="w-full bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 text-left hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/5 transition-all group active:scale-95 text-balance"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className={`p-2 rounded-xl ${template.type === 'Semanal' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                            <ClipboardList size={20} />
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${template.type === 'Semanal' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                            {template.type}
                                        </span>
                                    </div>
                                    <h4 className="text-lg font-black text-slate-800 mb-1 group-hover:text-orange-600 transition-colors">{template.name}</h4>
                                    <p className="text-xs text-slate-400 font-medium leading-relaxed">{template.description}</p>
                                </button>
                            ))}

                            {availableTemplates.length === 0 && (
                                <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 text-center">
                                    <AlertTriangle className="text-amber-500 mx-auto mb-3" size={32} />
                                    <p className="text-amber-700 font-black text-sm mb-1">Sin plantillas disponibles</p>
                                    <p className="text-amber-600/80 text-xs font-medium">No hay modelos de checklist configurados para activos de tipo "{selectedAsset.type}".</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* STEP 3: FILL FORM */}
                {step === 3 && selectedAsset && selectedTemplate && (
                    <div className="space-y-6 animate-in slide-in-from-right duration-500">
                        {/* Summary Sticky Header */}
                        <div className="bg-slate-800 p-5 rounded-3xl text-white shadow-xl shadow-slate-200 mb-8 relative overflow-hidden">
                            <div className="relative z-10">
                                <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mb-1">Inspección en curso</p>
                                <h4 className="text-lg font-black leading-tight mb-2">{selectedAsset.name}</h4>
                                <div className="flex items-center gap-3">
                                    <span className="bg-white/10 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider">{selectedTemplate.type}</span>
                                    <span className="text-[10px] text-slate-300 font-bold uppercase">{selectedTemplate.items.length} Puntos de control</span>
                                </div>
                            </div>
                            <Sparkles className="absolute -right-4 -bottom-4 w-24 h-24 text-white/5 rotate-12" />
                        </div>

                        {/* Usage Update (KM / Hours) */}
                        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 mb-8">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Uso Actual</h3>
                            <div className="relative">
                                <input
                                    type="number"
                                    placeholder={selectedAsset.type === 'Rodados' ? "Ingrese Kilometraje (km)" : "Ingrese Horas (hs)"}
                                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-slate-800 placeholder:text-slate-300 focus:ring-4 focus:ring-orange-100 transition-all"
                                    value={currentUsage}
                                    onChange={(e) => setCurrentUsage(e.target.value === '' ? '' : Number(e.target.value))}
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-white px-3 py-1 rounded-lg text-[10px] font-black text-slate-400 shadow-sm border border-slate-100">
                                    {selectedAsset.type === 'Rodados' ? 'KM' : 'HS'}
                                </div>
                            </div>
                        </div>


                        {/* Items by Category */}
                        {Array.from(new Set(selectedTemplate.items.map(i => i.category))).map(category => (
                            <div key={category} className="space-y-4">
                                <h3 className="px-2 text-xs font-black text-slate-400 uppercase tracking-widest">{category}</h3>
                                {selectedTemplate.items.filter(i => i.category === category).map(item => (
                                    <div key={item.id} className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col gap-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <span className="text-sm font-bold text-slate-700 leading-snug">{item.label}</span>
                                            <div className="flex gap-2 shrink-0">
                                                <button
                                                    onClick={() => handleToggleStatus(item.id)}
                                                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${results[item.id].status === 'ok' ? 'bg-emerald-50 text-emerald-600 shadow-inner' : 'bg-slate-50 text-slate-300'}`}
                                                >
                                                    <CheckCircle2 size={24} />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleStatus(item.id)}
                                                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${results[item.id].status === 'fail' ? 'bg-red-50 text-red-600 shadow-inner' : 'bg-slate-50 text-slate-300'}`}
                                                >
                                                    <AlertCircle size={24} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Optional Comment */}
                                        <div className="relative overflow-hidden transition-all duration-300">
                                            <textarea
                                                placeholder="Agregar comentario u observación..."
                                                className={`w-full bg-slate-50 border-none rounded-2xl p-4 text-xs font-bold text-slate-600 placeholder:text-slate-300 focus:ring-4 focus:ring-orange-100 transition-all ${results[item.id].status === 'fail' ? 'min-h-[80px]' : 'h-12'}`}
                                                value={results[item.id].comment}
                                                onChange={(e) => handleCommentChange(item.id, e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}

                        {/* Submit Button Container */}
                        <div className="pt-6">
                            <button
                                onClick={handleSubmit}
                                disabled={saving}
                                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white p-5 rounded-3xl font-black text-lg shadow-xl shadow-orange-200 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                            >
                                {saving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        <span>Guardando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save size={24} />
                                        <span>Finalizar Inspección</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


export default NewChecklist;
