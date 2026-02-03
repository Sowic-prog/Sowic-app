import React, { useState, useRef, useEffect } from 'react';
import {
    Star, Search, Plus, Filter, Phone, Mail, ChevronLeft, Save,
    Upload, FileText, X, Trash2, Paperclip, CheckCircle2,
    Bell, Building2, UserCircle2, ShieldCheck, Globe
} from 'lucide-react';
import { MOCK_PROVIDERS } from '../constants';
import { Provider, ProviderReview } from '../types';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const Providers: React.FC = () => {
    const { user: authUser, checkPermission } = useAuth();
    const canEdit = checkPermission('/providers', 'edit');
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
    const [providerReviews, setProviderReviews] = useState<ProviderReview[]>([]);


    // Review Formulation State
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [newReview, setNewReview] = useState({
        rating: 5,
        comment: ''
    });

    // Form State
    const [formData, setFormData] = useState({
        companyName: '',
        serviceType: '',
        contactName: '',
        phone: '',
        email: '',
        status: 'Activo' as 'Activo' | 'Inactivo' | 'Potencial'
    });

    const [attachedFiles, setAttachedFiles] = useState<{ name: string, size: string, type: string }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAttachedFiles(prev => [...prev, {
                name: file.name,
                size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
                type: file.name.split('.').pop() || 'file'
            }]);
        }
    };

    const removeFile = (index: number) => {
        setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    };

    useEffect(() => {
        fetchProviders();
    }, []);

    const fetchProviders = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('providers')
                .select('*')
                .order('company_name', { ascending: true });

            if (error) throw error;

            // Transform DB to Frontend types
            const transformed: Provider[] = (data || []).map((p: any) => ({
                id: p.id,
                companyName: p.company_name,
                contactName: p.contact_name,
                serviceType: p.service_type,
                rating: Number(p.rating) || 0,
                status: p.status,
                phone: p.phone,
                email: p.email
            }));

            // Fetch average ratings for all
            const { data: reviewsData, error: reviewsError } = await supabase
                .from('provider_reviews')
                .select('provider_id, rating');

            if (!reviewsError && reviewsData) {
                transformed.forEach(p => {
                    const pReviews = reviewsData.filter(r => r.provider_id === p.id);
                    if (pReviews.length > 0) {
                        p.averageRating = pReviews.reduce((acc, r) => acc + Number(r.rating), 0) / pReviews.length;
                        p.reviewCount = pReviews.length;
                    } else {
                        p.averageRating = 0;
                        p.reviewCount = 0;
                    }
                });
            }

            setProviders(transformed);
        } catch (err) {
            console.error('Error fetching providers:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchReviews = async (providerId: string) => {
        try {
            const { data, error } = await supabase
                .from('provider_reviews')
                .select('*')
                .eq('provider_id', providerId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProviderReviews(data || []);
        } catch (err) {
            console.error('Error fetching reviews:', err);
        }
    };

    const handleProviderSelect = (provider: Provider) => {
        setSelectedProvider(provider);
        fetchReviews(provider.id);
    };

    const resetForm = () => {
        setFormData({
            companyName: '',
            serviceType: '',
            contactName: '',
            phone: '',
            email: '',
            status: 'Activo'
        });
        setAttachedFiles([]);
        setSelectedProvider(null);
        setProviderReviews([]);
    };

    const handleSaveReview = async () => {
        if (!selectedProvider || !newReview.comment) {
            alert("Por favor complete su comentario.");
            return;
        }

        try {
            const { error } = await supabase
                .from('provider_reviews')
                .insert({
                    provider_id: selectedProvider.id,
                    user_name: authUser?.name || 'Usuario',
                    rating: newReview.rating,
                    comment: newReview.comment
                });

            if (error) throw error;

            alert("¡Gracias por tu reseña!");
            setIsReviewModalOpen(false);
            setNewReview({ rating: 5, comment: '' });
            fetchReviews(selectedProvider.id);
            fetchProviders(); // Refresh main list to update average
        } catch (err: any) {
            alert("Error al guardar reseña: " + err.message);
        }
    };

    const handleDeleteReview = async (reviewId: string) => {
        if (!window.confirm("¿Estás seguro de que deseas eliminar esta reseña?")) return;

        try {
            const { error } = await supabase
                .from('provider_reviews')
                .delete()
                .eq('id', reviewId);

            if (error) throw error;

            alert("Reseña eliminada correctamente.");
            if (selectedProvider) {
                fetchReviews(selectedProvider.id);
                fetchProviders(); // Refresh main list to update average
            }
        } catch (err: any) {
            alert("Error al eliminar reseña: " + err.message);
        }
    };

    const handleSave = async () => {
        if (!formData.companyName || !formData.serviceType) {
            alert("Por favor complete al menos el nombre de la empresa y el rubro.");
            return;
        }

        try {
            const payload = {
                company_name: formData.companyName,
                service_type: formData.serviceType,
                contact_name: formData.contactName,
                status: formData.status,
                phone: formData.phone,
                email: formData.email,
                rating: 5 // Default initial rating
            };

            const { error } = await supabase
                .from('providers')
                .insert(payload);

            if (error) throw error;

            alert("Proveedor registrado exitosamente.");
            setIsCreating(false);
            resetForm();
            fetchProviders();
        } catch (err: any) {
            alert("Error al guardar proveedor: " + err.message);
        }
    };

    // FORM VIEW
    if (isCreating || selectedProvider) {
        const isEdit = !!selectedProvider;
        const data = isEdit ? selectedProvider : formData;

        return (
            <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans">
                <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex items-center justify-between">
                    <button onClick={() => { setIsCreating(false); resetForm(); }} className="text-slate-600 p-2" title="Volver" aria-label="Volver"><ChevronLeft size={24} /></button>
                    <h1 className="font-bold text-lg text-slate-800">{isEdit ? 'Detalles de Proveedor' : 'Nuevo Proveedor'}</h1>
                    {canEdit && <button onClick={handleSave} className="text-orange-500 font-bold text-sm px-2">Guardar</button>}
                </div>

                <div className="p-6 space-y-6">

                    {/* Basic Info Section */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Building2 size={18} className="text-orange-500" />
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Datos Fiscales</h3>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Razón Social</label>
                            <input
                                type="text"
                                value={data.companyName}
                                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                placeholder="Nombre de la empresa"
                                className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 text-sm font-bold text-slate-800"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Rubro / Servicio</label>
                                <input
                                    type="text"
                                    value={data.serviceType}
                                    onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                                    placeholder="Ej. Neumáticos"
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 text-sm font-medium"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Estado</label>
                                <div className="relative">
                                    <select
                                        id="provider-status"
                                        value={data.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 text-sm font-bold text-slate-700 appearance-none"
                                        title="Estado del proveedor"
                                    >
                                        <option value="Activo">Activo</option>
                                        <option value="Potencial">Potencial</option>
                                        <option value="Inactivo">Inactivo</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                        <ChevronLeft size={16} className="-rotate-90" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Info Section */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <UserCircle2 size={18} className="text-orange-500" />
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Contacto Directo</h3>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nombre de Contacto</label>
                            <input
                                type="text"
                                value={data.contactName}
                                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                                placeholder="Nombre del Ejecutivo"
                                className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 text-sm font-medium"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Teléfono</label>
                                <div className="relative">
                                    <input
                                        type="tel"
                                        placeholder="+54 9 11..."
                                        className="w-full p-4 pl-12 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 text-sm font-medium"
                                    />
                                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Email</label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        placeholder="ventas@proveedor.com"
                                        className="w-full p-4 pl-12 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 text-sm font-medium"
                                    />
                                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Documents Section */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={18} className="text-orange-500" />
                                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Documentación y Certificados</h3>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">{attachedFiles.length} ADJUNTOS</span>
                        </div>

                        {/* Upload Box */}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-200 rounded-[2rem] p-8 flex flex-col items-center justify-center text-slate-400 gap-3 cursor-pointer hover:bg-white hover:border-orange-300 transition-all group bg-slate-50/50"
                        >
                            <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center group-hover:text-orange-500 transition-colors border border-slate-100">
                                <Upload size={24} />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-bold text-slate-600 group-hover:text-orange-600 transition-colors">Adjuntar Constancia / PDF / JPG</p>
                                <p className="text-xs text-slate-400 mt-1">Sube el certificado de AFIP o Seguro (Max 10MB)</p>
                            </div>
                            <input
                                type="file"
                                id="file-upload"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={handleFileUpload}
                                title="Adjuntar archivo"
                            />
                        </div>

                        {/* File List */}
                        {attachedFiles.length > 0 && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                {attachedFiles.map((file, idx) => (
                                    <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 font-bold text-[10px] uppercase shrink-0">
                                                {file.type}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-slate-700 truncate">{file.name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{file.size}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeFile(idx)}
                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Eliminar archivo"
                                            aria-label="Eliminar archivo"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Action Button */}
                    <div className="flex gap-4 mt-4">
                        {canEdit && (
                            <button
                                onClick={handleSave}
                                className="flex-1 bg-slate-800 text-white py-4 rounded-2xl font-bold shadow-xl shadow-slate-200 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                            >
                                <Save size={20} /> {isEdit ? 'Actualizar' : 'Finalizar Registro'}
                            </button>
                        )}
                        {isEdit && canEdit && (
                            <button
                                onClick={() => setIsReviewModalOpen(true)}
                                className="bg-orange-500 text-white p-4 rounded-2xl shadow-xl shadow-orange-200 active:scale-95 transition-transform"
                                title="Dejar Reseña"
                            >
                                <Star size={24} fill="currentColor" />
                            </button>
                        )}
                    </div>

                    {/* Reviews Section */}
                    {isEdit && (
                        <div className="space-y-4 pt-4">
                            <div className="flex justify-between items-center px-1">
                                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <Star size={18} className="text-orange-500" fill="currentColor" /> Reseñas y Calificaciones
                                </h3>
                                <div className="flex items-center gap-1">
                                    <span className="text-lg font-black text-slate-800">
                                        {(providerReviews.length > 0
                                            ? providerReviews.reduce((acc, r) => acc + Number(r.rating), 0) / providerReviews.length
                                            : (selectedProvider?.averageRating || 0)).toFixed(1)}
                                    </span>
                                    <div className="flex">
                                        {[1, 2, 3, 4, 5].map(s => {
                                            const avg = providerReviews.length > 0
                                                ? providerReviews.reduce((acc, r) => acc + Number(r.rating), 0) / providerReviews.length
                                                : (selectedProvider?.averageRating || 0);
                                            return (
                                                <Star key={s} size={12} className={s <= Math.round(avg) ? 'text-orange-400' : 'text-slate-200'} fill="currentColor" />
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {providerReviews.length > 0 ? (
                                    providerReviews.map(rev => (
                                        <div key={rev.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                                            <div className="flex justify-between items-center">
                                                <p className="text-xs font-bold text-slate-700">{rev.user_name}</p>
                                                <div className="flex gap-1.5 items-center">
                                                    {(authUser?.role === 'SuperAdmin' || authUser?.role === 'Admin') && (
                                                        <button
                                                            onClick={() => handleDeleteReview(rev.id)}
                                                            className="p-1 px-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
                                                            title="Eliminar Reseña"
                                                            aria-label="Eliminar Reseña"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    )}
                                                    <div className="flex gap-0.5">
                                                        {[1, 2, 3, 4, 5].map(s => (
                                                            <Star key={s} size={10} className={s <= rev.rating ? 'text-orange-400' : 'text-slate-200'} fill="currentColor" />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-500 italic">"{rev.comment}"</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(rev.created_at).toLocaleDateString()}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                                        <p className="text-xs text-slate-400 italic">Sin reseñas aún. ¡Sé el primero en calificar!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Review Modal */}
                    {isReviewModalOpen && (
                        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-300">
                            <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-20 duration-300">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                        <Star size={24} className="text-orange-500" fill="currentColor" /> Calificar Proveedor
                                    </h3>
                                    <button onClick={() => setIsReviewModalOpen(false)} className="bg-slate-100 p-2 rounded-full text-slate-500" title="Cerrar" aria-label="Cerrar"><X size={20} /></button>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-center gap-2 py-4">
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <button
                                                key={s}
                                                onClick={() => setNewReview({ ...newReview, rating: s })}
                                                className="transition-transform active:scale-90"
                                                title={`Calificar con ${s} estrellas`}
                                                aria-label={`Calificar con ${s} estrellas`}
                                            >
                                                <Star size={32} className={s <= newReview.rating ? 'text-orange-500' : 'text-slate-200'} fill="currentColor" />
                                            </button>
                                        ))}
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Comentario / Motivo</label>
                                        <textarea
                                            value={newReview.comment}
                                            onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                                            className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium h-24 resize-none"
                                            placeholder="Cuéntanos tu experiencia con este proveedor..."
                                        />
                                    </div>
                                    <button
                                        onClick={handleSaveReview}
                                        className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-orange-200 mt-2"
                                    >
                                        Enviar Calificación
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // LIST VIEW
    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20">
            {/* Header */}
            <div className="bg-white p-6 sticky top-0 z-10 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-slate-800">Proveedores</h1>
                    <div className="flex gap-2">
                        {canEdit && (
                            <button
                                onClick={() => { resetForm(); setIsCreating(true); }}
                                className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-200 active:scale-95 transition-transform"
                                title="Nuevo Proveedor"
                                aria-label="Nuevo Proveedor"
                            >
                                <Plus size={28} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar empresa, rubro..."
                        className="w-full pl-11 pr-12 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 font-medium text-sm"
                    />
                    <button className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-orange-500 transition-colors" title="Filtrar" aria-label="Filtrar">
                        <Filter size={20} />
                    </button>
                </div>

                {/* Filters */}
                <div className="flex gap-3 overflow-x-auto no-scrollbar">
                    <button className="px-5 py-2.5 rounded-full bg-slate-800 text-white text-xs font-bold shadow-md shadow-slate-200">Todos</button>
                    <button className="px-5 py-2.5 rounded-full bg-white border border-slate-200 text-slate-500 text-xs font-bold">Activos</button>
                    <button className="px-5 py-2.5 rounded-full bg-white border border-slate-200 text-slate-500 text-xs font-bold">Potenciales</button>
                </div>
            </div>

            <div className="p-6 space-y-4">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-400 font-medium">Cargando proveedores...</p>
                    </div>
                ) : providers.map(provider => (
                    <div
                        key={provider.id}
                        onClick={() => handleProviderSelect(provider)}
                        className="bg-white p-5 rounded-3xl shadow-sm border border-slate-50 flex items-center gap-4 cursor-pointer active:scale-[0.99] transition-transform group hover:border-orange-100"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0 relative p-2 transition-colors group-hover:bg-orange-100/50">
                            {/* Placeholder Logo */}
                            <div className="w-full h-full bg-white rounded-xl flex items-center justify-center text-sm text-orange-600 font-bold uppercase text-center leading-none shadow-sm">
                                {provider.companyName.substring(0, 2)}
                            </div>
                            {provider.status === 'Activo' && (
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                                    <CheckCircle2 size={14} className="text-white" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-0.5">
                                <h3 className="font-bold text-slate-800 text-sm truncate pr-2 group-hover:text-orange-600 transition-colors">{provider.companyName}</h3>
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${provider.status === 'Activo'
                                    ? 'text-green-600 bg-green-50'
                                    : provider.status === 'Potencial' ? 'text-blue-600 bg-blue-50' : 'text-slate-400 bg-slate-100'
                                    }`}>
                                    {provider.status}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                {provider.serviceType}
                                {provider.averageRating && provider.averageRating > 0 && (
                                    <div className="ml-auto flex items-center gap-1 text-[10px] font-black text-orange-500">
                                        <Star size={10} fill="currentColor" /> {provider.averageRating.toFixed(1)}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-3 text-slate-400 text-[10px] mt-2 font-bold uppercase tracking-wider">
                                <span className="flex items-center gap-1"><UserCircle2 size={12} /> {provider.contactName}</span>
                                <span className="flex items-center gap-1"><FileText size={12} /> Docs OK</span>
                            </div>
                        </div>
                    </div>
                ))}

                {providers.length === 0 && (
                    <div className="text-center py-12">
                        <Building2 size={48} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-400 font-medium">No se encontraron proveedores registrados</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Providers;