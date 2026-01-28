
import React, { useState, useEffect } from 'react';
import {
    LifeBuoy, Clock, MapPin, AlertCircle, Plus, Filter, Search,
    ChevronLeft, Save, X, Edit3, Trash2, CheckCircle2, AlertTriangle,
    FileText, Calendar, ArrowRight, User, Wrench, ExternalLink, Bot, ChevronDown, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ServiceRequest, Asset, Project } from '../types';
import { supabase } from '../supabaseClient';

type ViewMode = 'list' | 'detail' | 'form';

// --- MAPPERS ---
const mapAssetFromDB = (dbAsset: any): Asset => ({
    ...dbAsset,
    internalId: dbAsset.internal_id,
    barcodeId: dbAsset.barcode_id,
    dailyRate: dbAsset.daily_rate,
    originYear: dbAsset.origin_year,
    usefulLifeRemaining: dbAsset.useful_life_remaining,
    accountingAccount: dbAsset.accounting_account,
    functionalDescription: dbAsset.functional_description,
    complementaryDescription: dbAsset.complementary_description,
    domainNumber: dbAsset.domain_number,
    chassisNumber: dbAsset.chassis_number,
    engineNumber: dbAsset.engine_number,
    insuranceProvider: dbAsset.insurance_provider,
    regulatoryData: dbAsset.regulatory_data || undefined,
    averageDailyUsage: dbAsset.average_daily_usage,
    expirations: dbAsset.expirations || [],
    incidents: dbAsset.incidents || [],
});

const mapServiceRequestFromDB = (db: any): ServiceRequest => ({
    id: db.id,
    title: db.title,
    category: db.category,
    priority: db.priority,
    status: db.status,
    location: db.location,
    slaDeadline: db.sla_deadline,
    description: db.description,
    relatedAssetId: db.related_asset_id,
    workOrderId: db.work_order_id
});

const mapServiceRequestToDB = (req: Partial<ServiceRequest>) => ({
    title: req.title,
    category: req.category,
    priority: req.priority,
    status: req.status,
    location: req.location,
    sla_deadline: req.slaDeadline,
    description: req.description,
    related_asset_id: req.relatedAssetId,
    work_order_id: req.workOrderId
});

const Services: React.FC = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState<ServiceRequest[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<ViewMode>('list');
    const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
    const [filterStatus, setFilterStatus] = useState<'Todas' | 'Pendiente' | 'En Proceso' | 'Resuelto'>('Todas');

    // Form State
    const [formData, setFormData] = useState<Partial<ServiceRequest>>({
        title: '',
        category: 'Infraestructura',
        priority: 'Media',
        status: 'Pendiente',
        location: '',
        description: '',
        slaDeadline: '48hs',
        relatedAssetId: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Service Requests
            const { data: srData, error: srError } = await supabase
                .from('service_requests')
                .select('*')
                .order('created_at', { ascending: false });
            if (srError) throw srError;
            if (srData) setRequests(srData.map(mapServiceRequestFromDB));

            // Fetch Assets
            const { data: astData, error: astError } = await supabase.from('assets').select('*');
            if (astError) throw astError;

            // Fetch Infrastructures
            const { data: infraData, error: infraError } = await supabase.from('infrastructures').select('*');
            if (infraError) throw infraError;

            const mappedAssets = (astData || []).map(db => ({
                ...mapAssetFromDB(db),
                category: 'Equipo/Maquinaria'
            }));

            const mappedInfras = (infraData || []).map(db => ({
                ...db,
                internalId: db.internal_id,
                barcodeId: db.barcode_id,
                dailyRate: db.daily_rate,
                regulatoryData: db.regulatory_data || undefined,
                type: 'Instalaciones en infraestructuras',
                hours: 0,
                averageDailyUsage: 0,
                category: 'Inmueble/Infraestructura'
            } as any));

            setAssets([...mappedAssets, ...mappedInfras]);

            // Fetch Projects for locations
            const { data: projData, error: projError } = await supabase.from('projects').select('*');
            if (projError) throw projError;
            if (projData) setProjects(projData as any);

        } catch (error) {
            console.error("Error fetching services data:", error);
        } finally {
            setLoading(false);
        }
    };

    const getPriorityStyle = (priority: string) => {
        switch (priority) {
            case 'Crítica': return 'bg-red-50 text-red-600 border-red-100';
            case 'Alta': return 'bg-orange-50 text-orange-600 border-orange-100';
            case 'Media': return 'bg-yellow-50 text-yellow-600 border-yellow-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    const handleOpenCreate = () => {
        setFormData({
            title: '',
            category: 'Infraestructura',
            priority: 'Media',
            status: 'Pendiente',
            location: '',
            description: '',
            slaDeadline: '48hs',
            relatedAssetId: ''
        });
        setSelectedRequest(null);
        setView('form');
    };

    const handleOpenEdit = (req: ServiceRequest) => {
        setFormData({ ...req, relatedAssetId: req.relatedAssetId || '' });
        setSelectedRequest(req);
        setView('form');
    };

    const handleSave = async () => {
        if (!formData.title || !formData.description) {
            alert("Título y descripción son obligatorios.");
            return;
        }

        setLoading(true);
        try {
            if (selectedRequest) {
                const { error } = await supabase
                    .from('service_requests')
                    .update(mapServiceRequestToDB(formData))
                    .eq('id', selectedRequest.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('service_requests')
                    .insert([mapServiceRequestToDB(formData)]);
                if (error) throw error;
            }
            await fetchData();
            setView('list');
        } catch (err) {
            console.error('Error saving request:', err);
            alert('Error al guardar la solicitud');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (selectedRequest && window.confirm("¿Eliminar esta solicitud?")) {
            setLoading(true);
            try {
                const { error } = await supabase
                    .from('service_requests')
                    .delete()
                    .eq('id', selectedRequest.id);
                if (error) throw error;
                await fetchData();
                setView('list');
            } catch (err) {
                console.error('Error deleting request:', err);
                alert('Error al eliminar');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleGenerateWorkOrder = () => {
        if (!selectedRequest) return;

        const relatedAsset = selectedRequest.relatedAssetId
            ? assets.find(a => a.id === selectedRequest.relatedAssetId)
            : null;

        navigate('/maintenance', {
            state: {
                action: 'createOT',
                title: `Derivado de Solicitud ${selectedRequest.id}: ${selectedRequest.title}`,
                description: `SOLICITUD DE SERVICIO #${selectedRequest.id}\nCategoría: ${selectedRequest.category}\nUbicación: ${selectedRequest.location}\n\nDetalle del problema:\n${selectedRequest.description}`,
                priority: selectedRequest.priority,
                assetId: relatedAsset ? relatedAsset.id : undefined,
                assetName: relatedAsset ? relatedAsset.name : undefined,
                internalId: relatedAsset ? relatedAsset.internalId : undefined,
            }
        });
    };

    // --- VIEWS ---

    if (loading && view === 'list') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            </div>
        );
    }

    // 1. FORM VIEW
    if (view === 'form') {
        return (
            <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans animate-in slide-in-from-right-5 duration-300">
                <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex items-center justify-between">
                    <button onClick={() => setView(selectedRequest ? 'detail' : 'list')} className="text-slate-600 p-2" aria-label="Volver"><ChevronLeft size={24} /></button>
                    <h1 className="font-bold text-lg text-slate-800">{selectedRequest ? 'Editar Solicitud' : 'Nueva Solicitud'}</h1>
                    <button onClick={handleSave} className="text-orange-500 font-bold text-sm bg-orange-50 px-3 py-1.5 rounded-full flex items-center gap-1">
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Título del Requerimiento</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Ej. Fuga de agua en baño..."
                                className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Activo Relacionado (Opcional)</label>
                            <div className="relative">
                                <select
                                    value={formData.relatedAssetId}
                                    aria-label="Activo Relacionado"
                                    onChange={(e) => {
                                        const asset = assets.find(a => a.id === e.target.value);
                                        setFormData({
                                            ...formData,
                                            relatedAssetId: e.target.value,
                                            location: asset ? asset.location : formData.location
                                        });
                                    }}
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium text-slate-700 appearance-none"
                                >
                                    <option value="">Ninguno / General</option>
                                    {assets.map(asset => (
                                        <option key={asset.id} value={asset.id}>
                                            {(asset as any).category === 'Inmueble/Infraestructura' ? '[INFRA] ' : ''}{asset.name} ({asset.internalId})
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Categoría</label>
                                <select
                                    value={formData.category}
                                    aria-label="Categoría"
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium text-slate-700 appearance-none"
                                >
                                    <option value="Infraestructura">Infraestructura</option>
                                    <option value="Eléctrico">Eléctrico</option>
                                    <option value="HVAC">HVAC (Clima)</option>
                                    <option value="Conectividad">Conectividad</option>
                                    <option value="Seguridad">Seguridad</option>
                                    <option value="Herramientas">Herramientas</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Prioridad</label>
                                <select
                                    value={formData.priority}
                                    aria-label="Prioridad"
                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium text-slate-700 appearance-none"
                                >
                                    <option value="Baja">Baja</option>
                                    <option value="Media">Media</option>
                                    <option value="Alta">Alta</option>
                                    <option value="Crítica">Crítica</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Ubicación / Obra</label>
                            <div className="relative">
                                <select
                                    value={formData.location}
                                    aria-label="Ubicación / Obra"
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full p-4 pl-12 bg-slate-50 border-none rounded-2xl text-sm font-medium text-slate-700 appearance-none"
                                >
                                    <option value="">Seleccionar Obra...</option>
                                    <option value="Oficina Central">Oficina Central</option>
                                    <option value="Taller Central">Taller Central</option>
                                    <option value="Almacén">Almacén</option>
                                    {projects.map(proj => (
                                        <option key={proj.id} value={proj.name}>{proj.name}</option>
                                    ))}
                                </select>
                                <MapPin size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Descripción del Problema</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Detalla qué sucede, cuándo comenzó, etc..."
                                className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium min-h-[120px] resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Estado</label>
                                <select
                                    value={formData.status}
                                    aria-label="Estado"
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium text-slate-700 appearance-none"
                                >
                                    <option value="Pendiente">Pendiente</option>
                                    <option value="En Proceso">En Proceso</option>
                                    <option value="Resuelto">Resuelto</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">SLA (Tiempo)</label>
                                <input
                                    type="text"
                                    value={formData.slaDeadline}
                                    onChange={(e) => setFormData({ ...formData, slaDeadline: e.target.value })}
                                    placeholder="Ej. 24hs"
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 2. DETAIL VIEW
    if (view === 'detail' && selectedRequest) {
        const relatedAsset = selectedRequest.relatedAssetId
            ? assets.find(a => a.id === selectedRequest.relatedAssetId)
            : null;

        return (
            <div className="bg-[#F8F9FA] min-h-screen pb-24 font-sans animate-in slide-in-from-right-5 duration-300">
                <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex items-center justify-between">
                    <button onClick={() => setView('list')} className="text-slate-600 p-2" aria-label="Volver"><ChevronLeft size={24} /></button>
                    <h1 className="font-bold text-lg text-slate-800">Detalle Solicitud</h1>
                    <div className="flex gap-2">
                        <button onClick={() => handleOpenEdit(selectedRequest)} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:bg-orange-50 hover:text-orange-500 transition-colors" aria-label="Editar">
                            <Edit3 size={20} />
                        </button>
                        <button onClick={handleDelete} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:bg-red-50 hover:text-red-500 transition-colors" aria-label="Eliminar">
                            {loading ? <Loader2 size={18} className="animate-spin text-red-500" /> : <Trash2 size={20} />}
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Header Card */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden">
                        <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl text-[10px] font-bold uppercase tracking-wider text-white ${selectedRequest.status === 'Resuelto' ? 'bg-green-500' :
                            selectedRequest.status === 'En Proceso' ? 'bg-orange-500' : 'bg-slate-400'
                            }`}>
                            {selectedRequest.status}
                        </div>

                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedRequest.id}</span>
                        <h2 className="text-2xl font-bold text-slate-800 mt-1 mb-4 leading-tight">{selectedRequest.title}</h2>

                        <div className="flex flex-wrap gap-2 mb-4">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${getPriorityStyle(selectedRequest.priority)}`}>
                                {selectedRequest.priority}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-500 uppercase border border-slate-200">
                                {selectedRequest.category}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl">
                            <MapPin size={16} className="text-orange-500" />
                            <span className="font-bold">{selectedRequest.location}</span>
                        </div>
                    </div>

                    {/* Related Asset Card */}
                    {relatedAsset && (
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Bot size={18} className="text-orange-500" /> Activo Afectado
                            </h3>
                            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <img src={relatedAsset.image} className="w-14 h-14 rounded-xl object-cover" alt={relatedAsset.name} />
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{relatedAsset.internalId}</p>
                                    <p className="text-sm font-bold text-slate-800">{relatedAsset.name}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Work Order Linking Section */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Wrench size={18} className="text-orange-500" /> Gestión Técnica y Derivación
                        </h3>

                        {selectedRequest.workOrderId ? (
                            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Orden de Trabajo Vinculada</p>
                                    <p className="text-lg font-black text-blue-700">{selectedRequest.workOrderId}</p>
                                </div>
                                <button
                                    onClick={() => navigate(`/maintenance/ot/${selectedRequest.workOrderId}`)}
                                    className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-sm border border-blue-100 hover:scale-105 transition-transform"
                                    aria-label="Ver Orden de Trabajo"
                                >
                                    <ExternalLink size={20} />
                                </button>
                            </div>
                        ) : (
                            <div>
                                <p className="text-xs text-slate-500 mb-4">
                                    Si este requerimiento necesita intervención técnica especializada, materiales o repuestos, genera una Orden de Trabajo.
                                </p>
                                <button
                                    onClick={handleGenerateWorkOrder}
                                    className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
                                >
                                    <Wrench size={16} /> Generar Orden de Trabajo
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                            <FileText size={18} className="text-orange-500" /> Descripción
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            {selectedRequest.description}
                        </p>
                    </div>

                    {/* Meta Info */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Clock size={18} className="text-orange-500" /> Tiempos y SLA
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Plazo SLA</span>
                                <span className="text-sm font-black text-slate-800">{selectedRequest.slaDeadline}</span>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Reportado</span>
                                <span className="text-sm font-black text-slate-800">Hoy</span>
                            </div>
                        </div>
                    </div>

                    {/* Resolver Action */}
                    {selectedRequest.status !== 'Resuelto' && (
                        <button
                            onClick={async () => {
                                try {
                                    const { error } = await supabase
                                        .from('service_requests')
                                        .update({ status: 'Resuelto' })
                                        .eq('id', selectedRequest.id);
                                    if (error) throw error;
                                    await fetchData();
                                    setSelectedRequest({ ...selectedRequest, status: 'Resuelto' as any });
                                } catch (err) {
                                    console.error('Error solving request:', err);
                                }
                            }}
                            className="w-full bg-green-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-green-200 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                        >
                            <CheckCircle2 size={20} /> Marcar como Resuelto
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // 3. LIST VIEW (Default)
    const filteredRequests = requests.filter(r => filterStatus === 'Todas' || r.status === filterStatus);

    return (
        <div className="bg-[#F8F9FA] min-h-screen font-sans">
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-xl font-bold text-slate-800">Solicitudes de Servicios</h1>
                    <div className="flex gap-2">
                        <button className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500" aria-label="Filtrar">
                            <Filter size={20} />
                        </button>
                    </div>
                </div>

                {/* Dashboard Row */}
                <div className="flex gap-3 mb-8 overflow-x-auto no-scrollbar">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 min-w-[120px]">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock size={16} className="text-orange-500" />
                            <span className="text-xs font-bold text-slate-500">Pendientes</span>
                        </div>
                        <span className="text-3xl font-bold text-slate-800">{requests.filter(r => r.status === 'Pendiente').length}</span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 min-w-[120px]">
                        <div className="flex items-center gap-2 mb-2">
                            <LifeBuoy size={16} className="text-blue-500" />
                            <span className="text-xs font-bold text-slate-500">En Proceso</span>
                        </div>
                        <span className="text-3xl font-bold text-slate-800">{requests.filter(r => r.status === 'En Proceso').length}</span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 min-w-[120px]">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertCircle size={16} className="text-red-500" />
                            <span className="text-xs font-bold text-slate-500">Críticas</span>
                        </div>
                        <span className="text-3xl font-bold text-slate-800">{requests.filter(r => r.priority === 'Crítica').length}</span>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input type="text" placeholder="Buscar ID, activo o persona..." className="w-full pl-11 py-3 bg-slate-100 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-100 font-medium text-sm" />
                </div>

                {/* Filter Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl mb-6 overflow-x-auto no-scrollbar">
                    {['Todas', 'Pendiente', 'En Proceso', 'Resuelto'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status as any)}
                            className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${filterStatus === status ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500'}`}
                        >
                            {status}
                        </button>
                    ))}
                </div>

                <div className="flex justify-between items-end mb-4">
                    <h3 className="font-bold text-lg text-slate-800">Listado</h3>
                </div>

                <div className="space-y-4 pb-24">
                    {filteredRequests.map(req => (
                        <div
                            key={req.id}
                            onClick={() => { setSelectedRequest(req); setView('detail'); }}
                            className="bg-white p-5 rounded-3xl shadow-sm border border-slate-50 relative overflow-hidden active:scale-[0.98] transition-all cursor-pointer group hover:border-orange-200"
                        >
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${req.priority === 'Crítica' ? 'bg-red-500' : req.priority === 'Alta' ? 'bg-orange-500' : 'bg-slate-300'}`}></div>

                            <div className="flex justify-between items-start mb-3 pl-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${req.status === 'En Proceso' ? 'bg-orange-50 text-orange-600' :
                                    req.status === 'Resuelto' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                    {req.status}
                                </span>

                                <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityStyle(req.priority)}`}>
                                    {req.priority === 'Alta' || req.priority === 'Crítica' ? <AlertTriangle size={10} /> : ''} {req.priority}
                                </div>
                            </div>

                            <div className="flex gap-4 pl-2 mb-4">
                                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500 shrink-0">
                                    {req.category === 'HVAC' ? <LifeBuoy size={24} /> :
                                        req.category === 'Infraestructura' ? <FileText size={24} /> : <Clock size={24} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-800 text-sm leading-tight mb-1 truncate">{req.title}</h3>
                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                        <MapPin size={12} /> {req.location}
                                    </div>
                                </div>
                                <div className="flex items-center justify-center text-slate-300">
                                    <ArrowRight size={20} className="group-hover:text-orange-500 transition-colors" />
                                </div>
                            </div>

                            <div className="pl-2">
                                <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                                    <span className="flex items-center gap-1"><Clock size={10} /> Tiempo Respuesta</span>
                                    <span className={req.priority === 'Crítica' ? 'text-red-500' : 'text-orange-500'}>{req.slaDeadline}</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full w-2/3 rounded-full ${req.priority === 'Crítica' ? 'bg-red-500' : 'bg-orange-500'}`}></div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredRequests.length === 0 && (
                        <div className="text-center py-12 text-slate-400">
                            <p className="text-sm font-medium">No se encontraron solicitudes.</p>
                        </div>
                    )}
                </div>
            </div>

            <button
                onClick={handleOpenCreate}
                className="fixed bottom-24 right-6 w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-orange-200 active:scale-90 transition-transform z-30"
                aria-label="Nueva Solicitud"
            >
                <Plus size={28} />
            </button>
        </div>
    );
};

export default Services;
