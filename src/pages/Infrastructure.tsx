import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Building2, Zap, Lightbulb, PersonStanding, ChevronRight,
    MapPin, Calendar, AlertTriangle, CheckCircle2, FileText,
    ChevronLeft, ArrowRight, ShieldCheck, Ruler, Plus, Printer, Edit3, Save, X, Camera, Package
} from 'lucide-react';
import AssetImportModal from '../components/AssetImportModal';
import { Asset, AssetStatus } from '../types';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

// --- MAPPERS ---
const mapInfrastructureFromDB = (db: any): Asset => ({
    ...db,
    id: db.id,
    internalId: db.internal_id || '',
    barcodeId: db.barcode_id || '',
    name: db.name || '',
    description: db.description || '',
    location: db.location || '',
    status: db.status || 'Operativo',
    image: db.image || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=400',
    ownership: db.ownership || 'Propio',
    dailyRate: db.daily_rate || 0,
    regulatoryData: db.regulatory_data || undefined,
    // Ensure all required Asset fields are present even if not in DB
    type: 'Instalaciones en infraestructuras',
    hours: 0,
    averageDailyUsage: 0,
    functionalDescription: db.functional_description || '',
    complementaryDescription: db.complementary_description || '',
});

const mapInfrastructureToDB = (infra: Partial<Asset>) => {
    const {
        internalId, barcodeId, dailyRate, regulatoryData,
        type, // Exclude 'type' from payload as it might not be in infrastructures table or is implicitly known
        hours, // Exclude 'hours'
        averageDailyUsage, // Exclude usage
        ...rest
    } = infra;

    return {
        ...rest,
        internal_id: internalId,
        barcode_id: barcodeId,
        daily_rate: dailyRate,
        regulatory_data: regulatoryData,
        functional_description: infra.functionalDescription,
        complementary_description: infra.complementaryDescription,
    };
};

const Infrastructure: React.FC = () => {
    const navigate = useNavigate();
    const { checkPermission } = useAuth();
    const canEdit = checkPermission('/infrastructure', 'edit');
    const [localAssets, setLocalAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

    // States for Create/Edit
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<Asset>>({
        name: '',
        internalId: '',
        location: '',
        description: '',
        ownership: 'Propio',
        image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=400'
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        fetchInfrastructures();
    }, []);

    const fetchInfrastructures = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('infrastructures') // Reverted to 'infrastructures'
                .select('*')
                // Removed .eq('type', ...)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setLocalAssets(data.map(mapInfrastructureFromDB));
        } catch (err: any) {
            console.error('Error fetching infrastructures:', err);
            // Verify if it's just empty or actual error
        } finally {
            setLoading(false);
        }
    };

    // infraAssets is now just localAssets since we fetch only them
    const infraAssets = localAssets;

    // Helper to determine status color
    const getRegulatoryStatusColor = (status?: string) => {
        switch (status) {
            case 'Vigente': return 'bg-green-100 text-green-700 border-green-200';
            case 'Vencido': return 'bg-red-100 text-red-700 border-red-200';
            case 'Pendiente': return 'bg-orange-100 text-orange-700 border-orange-200';
            default: return 'bg-slate-100 text-slate-500 border-slate-200';
        }
    };

    const getStatusIcon = (status?: string) => {
        if (status === 'Vigente') return <CheckCircle2 size={16} />;
        if (status === 'Vencido') return <AlertTriangle size={16} />;
        return <Clock size={16} />;
    };

    const Clock = ({ size }: { size: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    );

    const handleCreateMeasurementOT = (type: string, description: string) => {
        if (!selectedAsset) return;

        const otData = {
            action: 'createOT',
            assetId: selectedAsset.id,
            assetName: selectedAsset.name,
            title: `Medición: ${type}`,
            description: `${description}\nActivo: ${selectedAsset.name}\nUbicación: ${selectedAsset.location}`,
            priority: 'Alta',
            date: new Date().toISOString().split('T')[0]
        };
        navigate('/maintenance', { state: otData });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    setFormData(prev => ({ ...prev, image: ev.target?.result as string }));
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleOpenCreate = () => {
        setFormData({
            name: '',
            internalId: '',
            location: '',
            description: '',
            ownership: 'Propio',
            image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=400',
            type: 'Instalaciones en infraestructuras',
            status: AssetStatus.OPERATIONAL
        });
        setIsCreating(true);
        setSelectedAsset(null);
    };

    const handleSaveNew = async () => {
        if (!formData.name || !formData.internalId) {
            alert("Nombre e ID Interno son obligatorios");
            return;
        }

        try {
            const payload = mapInfrastructureToDB({
                ...formData,
                barcodeId: Math.floor(1000 + Math.random() * 9000).toString(),
                brand: 'N/A',
                model: 'Infraestructura',
                serial: 'N/A',
                year: new Date().getFullYear(),
                dailyRate: 0,
                value: 0,
                regulatoryData: {
                    pat: { lastDate: '-', expirationDate: '-', value: '-', status: 'Pendiente' },
                    lighting: { lastDate: '-', expirationDate: '-', avgLux: 0, status: 'Pendiente' },
                    ergonomics: { lastDate: '-', expirationDate: '-', riskLevel: 'Bajo', status: 'Pendiente' }
                }
            });

            // Reverted to 'infrastructures'
            const { error } = await supabase.from('infrastructures').insert(payload);
            if (error) throw error;

            setIsCreating(false);
            fetchInfrastructures();
        } catch (err: any) {
            console.error("Error creating infrastructure:", err);
            alert("Error al guardar: " + err.message);
        }
    };

    const handleStartEdit = () => {
        if (!selectedAsset) return;
        setFormData({ ...selectedAsset });
        setIsEditing(true);
    };

    const handleSaveEdit = async () => {
        if (!selectedAsset || !formData.name) return;

        try {
            const payload = mapInfrastructureToDB(formData);
            // Reverted to 'infrastructures'
            const { error } = await supabase
                .from('infrastructures')
                .update(payload)
                .eq('id', selectedAsset.id);

            if (error) throw error;

            const updatedAsset = { ...selectedAsset, ...formData } as Asset;
            setSelectedAsset(updatedAsset);
            setIsEditing(false);
            fetchInfrastructures();
        } catch (err: any) {
            console.error("Error updating infrastructure:", err);
            alert("Error al actualizar: " + err.message);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    // --- CREATE VIEW ---
    if (isCreating) {
        return (
            <div className="bg-[#F8F9FA] min-h-screen pb-24 font-sans animate-in slide-in-from-right-5 duration-300">
                <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex items-center justify-between">
                    <button onClick={() => setIsCreating(false)} className="text-slate-600 p-2" title="Volver"><ChevronLeft size={24} /></button>
                    <h1 className="font-bold text-lg text-slate-800">Nueva Infraestructura</h1>
                    <button onClick={handleSaveNew} className="text-orange-500 font-bold text-sm bg-orange-50 px-3 py-1.5 rounded-full flex items-center gap-1">
                        <Save size={16} /> Guardar
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Image Upload */}
                    <div className="relative h-56 rounded-3xl overflow-hidden bg-slate-200 group">
                        <img src={formData.image} alt="Preview" className="w-full h-full object-cover opacity-80" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-white/90 backdrop-blur-sm p-4 rounded-full shadow-lg text-slate-600 hover:text-orange-500 transition-colors"
                                title="Subir Imagen"
                            >
                                <Camera size={28} />
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} title="Seleccionar Imagen" />
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Datos Generales</h3>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nombre del Inmueble</label>
                            <input
                                id="infra-name"
                                type="text"
                                title="Nombre del Inmueble"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej. Obrador Central"
                                className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">ID Interno</label>
                                <input
                                    id="infra-id"
                                    type="text"
                                    title="ID Interno"
                                    value={formData.internalId}
                                    onChange={(e) => setFormData({ ...formData, internalId: e.target.value })}
                                    placeholder="INF-001"
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800 uppercase"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Propiedad</label>
                                <select
                                    id="infra-ownership"
                                    title="Tipo de Propiedad"
                                    value={formData.ownership}
                                    onChange={(e) => setFormData({ ...formData, ownership: e.target.value as any })}
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium appearance-none"
                                >
                                    <option value="Propio">Propio</option>
                                    <option value="Alquilado">Alquilado</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Ubicación / Dirección</label>
                            <div className="relative">
                                <input
                                    id="infra-location"
                                    type="text"
                                    title="Ubicación"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="Ej. Ruta 3 Km 1200"
                                    className="w-full p-4 pl-12 bg-slate-50 border-none rounded-2xl text-sm font-medium"
                                />
                                <MapPin size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Descripción</label>
                            <textarea
                                id="infra-desc"
                                title="Descripción"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Breve descripción de las instalaciones..."
                                className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium min-h-[100px] resize-none"
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- DETAIL VIEW ---
    if (selectedAsset) {
        const reg = selectedAsset.regulatoryData || {};

        return (
            <div className="bg-[#F8F9FA] min-h-screen pb-24 font-sans animate-in slide-in-from-right-5 duration-300">

                {/* Print Header */}
                <div className="print-header">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold">SW</div>
                        <div>
                            <h1 className="font-bold text-lg text-slate-800 uppercase">Ficha Técnica: Infraestructura</h1>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">SOWIC Asset Management</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex items-center justify-between no-print">
                    <button onClick={() => setSelectedAsset(null)} className="text-slate-600 p-2" title="Volver"><ChevronLeft size={24} /></button>
                    <h1 className="font-bold text-lg text-slate-800">
                        {isEditing ? 'Editar Infraestructura' : 'Matriz Legal'}
                    </h1>
                    <div className="flex gap-2">
                        {isEditing ? (
                            <>
                                <button onClick={() => setIsEditing(false)} className="w-10 h-10 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center" title="Cancelar Edición">
                                    <X size={20} />
                                </button>
                                <button onClick={handleSaveEdit} className="w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-lg" title="Guardar Cambios">
                                    <Save size={20} />
                                </button>
                            </>
                        ) : (
                            <>
                                {canEdit && (
                                    <button onClick={handleStartEdit} className="w-10 h-10 bg-white border border-slate-200 text-slate-600 rounded-full flex items-center justify-center shadow-sm hover:text-orange-500 transition-colors" title="Editar">
                                        <Edit3 size={20} />
                                    </button>
                                )}
                                <button onClick={handlePrint} className="w-10 h-10 bg-slate-800 text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform" title="Imprimir">
                                    <Printer size={20} />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Header Asset Info / Edit Form */}
                    {isEditing ? (
                        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nombre</label>
                                <input
                                    id="edit-name"
                                    type="text"
                                    title="Nombre"
                                    placeholder="Nombre del inmueble"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border-none rounded-xl text-lg font-bold text-slate-800"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">ID Interno</label>
                                <input
                                    id="edit-id"
                                    type="text"
                                    title="ID Interno"
                                    placeholder="ID Interno"
                                    value={formData.internalId}
                                    onChange={(e) => setFormData({ ...formData, internalId: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-800 uppercase"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Ubicación</label>
                                <input
                                    id="edit-location"
                                    type="text"
                                    title="Ubicación"
                                    placeholder="Ubicación"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Descripción</label>
                                <textarea
                                    id="edit-desc"
                                    title="Descripción"
                                    placeholder="Descripción detallada"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium resize-none min-h-[80px]"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500 rounded-full blur-[60px] opacity-20 -mr-10 -mt-10"></div>
                            <div className="relative z-10">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedAsset.internalId}</span>
                                <h2 className="text-2xl font-bold mb-1">{selectedAsset.name}</h2>
                                <div className="flex items-center gap-2 text-sm text-slate-300 font-medium mb-3">
                                    <MapPin size={16} className="text-orange-500" />
                                    {selectedAsset.location}
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed max-w-md">{selectedAsset.description}</p>
                            </div>
                        </div>
                    )}

                    {/* 1. Res 900/15 PAT */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden break-inside-avoid">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-yellow-50 rounded-2xl flex items-center justify-center text-yellow-600">
                                    <Zap size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm">Res. 900/15</h3>
                                    <p className="text-xs text-slate-500">Puesta a Tierra</p>
                                </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border flex items-center gap-1 uppercase ${getRegulatoryStatusColor(reg.pat?.status)}`}>
                                {getStatusIcon(reg.pat?.status)} {reg.pat?.status || 'Pendiente'}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-slate-50 p-3 rounded-xl">
                                <p className="text-[9px] text-slate-400 font-bold uppercase">Última Medición</p>
                                <p className="text-sm font-bold text-slate-700">{reg.pat?.lastDate || '-'}</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-xl">
                                <p className="text-[9px] text-slate-400 font-bold uppercase">Valor Obtenido</p>
                                <p className="text-sm font-bold text-slate-700">{reg.pat?.value || '-'}</p>
                            </div>
                        </div>

                        {canEdit && (
                            <button
                                onClick={() => handleCreateMeasurementOT('Puesta a Tierra (Res 900/15)', 'Realizar medición de jabalinas, continuidad de masas y verificación de protecciones diferenciales según Protocolo SRT 900/15.')}
                                className="w-full py-3 bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform no-print"
                            >
                                <FileText size={14} /> Generar OT de Medición
                            </button>
                        )}
                    </div>

                    {/* 2. Res 84/12 Iluminación */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 break-inside-avoid">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                                    <Lightbulb size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm">Res. 84/12</h3>
                                    <p className="text-xs text-slate-500">Iluminación Ambiente</p>
                                </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border flex items-center gap-1 uppercase ${getRegulatoryStatusColor(reg.lighting?.status)}`}>
                                {getStatusIcon(reg.lighting?.status)} {reg.lighting?.status || 'Pendiente'}
                            </span>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-100 flex items-center justify-between">
                            <div>
                                <p className="text-[9px] text-slate-400 font-bold uppercase">Promedio Lux</p>
                                <p className="text-xl font-black text-slate-800">{reg.lighting?.avgLux || 0} lx</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] text-slate-400 font-bold uppercase">Vencimiento</p>
                                <p className="text-xs font-bold text-slate-600">{reg.lighting?.expirationDate || '-'}</p>
                            </div>
                        </div>

                        {canEdit && (
                            <button
                                onClick={() => handleCreateMeasurementOT('Iluminación (Res 84/12)', 'Realizar cuadrícula de medición luxométrica en puestos de trabajo y pasillos según Res 84/12.')}
                                className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors no-print"
                            >
                                <FileText size={14} /> Programar Medición
                            </button>
                        )}
                    </div>

                    {/* 3. Res 886/15 Ergonomía */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 break-inside-avoid">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                                    <PersonStanding size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm">Res. 886/15</h3>
                                    <p className="text-xs text-slate-500">Estudio Ergonómico</p>
                                </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border flex items-center gap-1 uppercase ${getRegulatoryStatusColor(reg.ergonomics?.status)}`}>
                                {getStatusIcon(reg.ergonomics?.status)} {reg.ergonomics?.status || 'Pendiente'}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl mb-4">
                            <Ruler size={14} className="text-purple-500" />
                            <span className="font-bold">Nivel de Riesgo Detectado:</span>
                            <span className="font-black">{reg.ergonomics?.riskLevel || 'Sin Datos'}</span>
                        </div>

                        {canEdit && (
                            <button
                                onClick={() => handleCreateMeasurementOT('Ergonomía (Res 886/15)', 'Realizar Planillas 1 y 2 de identificación de riesgos ergonómicos y evaluación de puestos administrativos.')}
                                className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors no-print"
                            >
                                <FileText size={14} /> Solicitar Estudio
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // --- LIST VIEW ---
    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-24 font-sans">
            <div className="bg-white p-6 sticky top-0 z-10 shadow-sm flex items-center justify-between no-print">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/assets')} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Infraestructuras</h1>
                        <p className="text-sm text-slate-500">Gestión de inmuebles y controles legales</p>
                    </div>
                </div>
                {canEdit && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-600 shadow-sm hover:bg-slate-50 hover:text-blue-600 transition-colors"
                            aria-label="Importar Activos"
                            title="Importar Activos"
                        >
                            <Package size={24} />
                        </button>
                        <button
                            onClick={handleOpenCreate}
                            className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
                            title="Agregar Nueva Infraestructura"
                        >
                            <Plus size={24} />
                        </button>
                    </div>
                )}
            </div>

            <div className="p-6 space-y-4">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-slate-400 font-medium">Cargando infraestructuras...</p>
                    </div>
                ) : infraAssets.map(asset => (
                    <div
                        key={asset.id}
                        onClick={() => setSelectedAsset(asset)}
                        className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-50 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform relative overflow-hidden group hover:border-orange-200"
                    >
                        <div className="w-20 h-20 bg-slate-100 rounded-2xl overflow-hidden shrink-0 border border-slate-100">
                            <img src={asset.image} alt={asset.name} className="w-full h-full object-cover" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="font-bold text-slate-800 text-sm truncate">{asset.name}</h3>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">{asset.location}</p>

                            <div className="flex gap-2">
                                {/* Compliance Indicators (Dots) */}
                                <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center border ${asset.regulatoryData?.pat?.status === 'Vigente' ? 'bg-green-100 border-green-200 text-green-600' : 'bg-red-100 border-red-200 text-red-600'}`}
                                    title="Res 900/15 (PAT)"
                                >
                                    <Zap size={12} />
                                </div>
                                <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center border ${asset.regulatoryData?.lighting?.status === 'Vigente' ? 'bg-green-100 border-green-200 text-green-600' : 'bg-red-100 border-red-200 text-red-600'}`}
                                    title="Res 84/12 (Iluminación)"
                                >
                                    <Lightbulb size={12} />
                                </div>
                                <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center border ${asset.regulatoryData?.ergonomics?.status === 'Vigente' ? 'bg-green-100 border-green-200 text-green-600' : 'bg-slate-100 border-slate-200 text-slate-400'}`}
                                    title="Res 886/15 (Ergonomía)"
                                >
                                    <PersonStanding size={12} />
                                </div>
                            </div>
                        </div>

                        <div className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
                            <ArrowRight size={20} />
                        </div>
                    </div>
                ))}

                {infraAssets.length === 0 && (
                    <div className="text-center py-12">
                        <Building2 size={48} className="mx-auto text-slate-200 mb-3" />
                        <p className="text-slate-400 font-medium">No hay infraestructuras registradas.</p>
                        <button onClick={handleOpenCreate} className="text-orange-500 font-bold text-xs mt-2 uppercase">Crear Primera</button>
                    </div>
                )}
            </div>

            {/* Import Modal */}
            <AssetImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={() => {
                    fetchInfrastructures();
                }}
                initialAssetType="Instalaciones en infraestructuras"
                forceAssetType={true}
            />
        </div>
    );
};

export default Infrastructure;
