
import React, { useState, useMemo, useEffect } from 'react';
import {
    Minus, Plus, AlertTriangle, Search, Laptop, Hammer, Box,
    ScanLine, Calendar, MoreVertical, ShieldAlert, FileText,
    X, Send, Save, ChevronLeft, MapPin, User, Barcode, DollarSign,
    Tag, Printer, Briefcase, Check, UserPlus, HardHat, Edit3, Trash2, History,
    RotateCcw, Activity
} from 'lucide-react';
import { InventoryItem, Staff, Project } from '../types';
import { supabase } from '../supabaseClient';

const mapInventoryFromDB = (data: any): InventoryItem => ({
    ...data,
    id: data.id,
    barcodeId: data.barcode_id, // Normalize to camelCase
    name: data.name,
    category: data.category,
    quantity: data.quantity,
    minThreshold: data.min_threshold,
    location: data.location,
    unitPrice: data.unit_price,
    type: data.type,
    serialNumber: data.serial_number,
    status: data.status,
    expirationDate: data.expiration_date,
    lastServiceDate: data.last_service_date,
    assignedTo: data.assigned_to
});

const mapProjectFromDB = (data: any): Project => ({
    ...data,
    id: data.id,
    name: data.name,
    location: data.location || 'Ubicación Desconocida',
    status: data.status || 'Activa',
    internalId: data.internal_id,
    assignedAssets: data.assigned_assets_count || 0,
    assignedStaff: data.assigned_staff_count || 0,
    responsible: data.responsible || 'Sin Asignar'
});

const mapStaffFromDB = (data: any): Staff => ({
    ...data,
    id: data.id,
    name: data.name,
    role: data.role || 'Colaborador',
    status: data.status || 'Activo',
    location: data.location || 'Base',
    avatar: data.avatar || 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=400&q=80',
    assignedAssets: [],
    email: data.email,
    phone: data.phone,
    dni: data.dni
});

type InventoryTab = 'consumables' | 'serialized';

const InventoryListItem = React.memo(({ item, onClick, onUpdateQuantity, getStatusColor }: any) => {
    return (
        <div
            onClick={() => onClick(item)} // OPEN DETAIL VIEW
            className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden flex items-center justify-between group hover:border-orange-200 transition-all cursor-pointer optimize-visibility"
        >
            {item.type === 'Serializado' && (
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${item.status === 'Disponible' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            )}
            <div className="pl-2">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-800 text-sm">{item.name}</h3>
                    {item.barcodeId && (
                        <span className="text-[8px] font-mono bg-slate-100 px-1.5 py-0.5 rounded border text-slate-500">{item.barcodeId}</span>
                    )}
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{item.category} • {item.location}</p>
                {item.assignedTo && (
                    <div className="flex items-center gap-1.5 mt-2 bg-slate-50 px-2 py-0.5 rounded-full w-fit border border-slate-100">
                        <User size={10} className="text-orange-500" />
                        <span className="text-[10px] font-bold text-slate-600">{item.assignedTo}</span>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-3">
                <div className="flex flex-col items-end gap-1">
                    {/* Simulated Mini Barcode - Static for performance */}
                    {item.barcodeId && (
                        <div className="flex h-4 items-end gap-[1px] opacity-30">
                            {[1, 0.6, 1, 0.4, 1, 1, 0.6, 1, 0.6, 1].map((h, i) => (
                                <div key={i} className={`bg-black w-[1px] ${h === 1 ? 'h-full' : h === 0.6 ? 'h-[60%]' : 'h-[40%]'}`}></div>
                            ))}
                        </div>
                    )}

                    {item.type === 'Consumible' ? (
                        <div className="flex items-center bg-slate-100 rounded-xl p-1 mt-1" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => onUpdateQuantity(item.id, -1)} className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 shadow-sm active:scale-90" aria-label="Disminuir cantidad"><Minus size={14} /></button>
                            <span className="w-10 text-center font-black text-slate-800 text-sm">{item.quantity}</span>
                            <button onClick={() => onUpdateQuantity(item.id, 1)} className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-orange-500 shadow-sm active:scale-90" aria-label="Aumentar cantidad"><Plus size={14} /></button>
                        </div>
                    ) : (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border uppercase mt-1 ${getStatusColor(item.status)}`}>{item.status}</span>
                    )}
                </div>
            </div>
        </div>
    );
});

const Inventory: React.FC = () => {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [dbProjects, setDbProjects] = useState<Project[]>([]);
    const [dbStaff, setDbStaff] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<InventoryTab>('consumables');
    const [activeCategory, setActiveCategory] = useState<string>('Todos');

    // Data Fetching
    useEffect(() => {
        fetchInventory();
        fetchProjects();
        fetchStaff();
    }, []);

    const fetchInventory = async () => {
        try {
            const { data, error } = await supabase.from('inventory').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            if (data) setItems(data.map(mapInventoryFromDB));
        } catch (e) {
            console.error("Error fetching inventory:", e);
        }
    };

    const fetchProjects = async () => {
        try {
            const { data, error } = await supabase.from('projects').select('*');
            if (error) throw error;
            if (data) setDbProjects(data.map(mapProjectFromDB));
        } catch (err) { console.error(err); }
    };

    const fetchStaff = async () => {
        try {
            const { data, error } = await supabase.from('staff').select('*');
            if (error) throw error;
            if (data) setDbStaff(data.map(mapStaffFromDB));
        } catch (err) { console.error(err); }
    };

    // Detail & Edit State
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [isEditingItem, setIsEditingItem] = useState(false);
    const [editFormData, setEditFormData] = useState<Partial<InventoryItem>>({});

    // Create Item State
    const [isCreating, setIsCreating] = useState(false);
    const [staffSearch, setStaffSearch] = useState('');
    const [showStaffResults, setShowStaffResults] = useState(false);

    const [newItemForm, setNewItemForm] = useState<Partial<InventoryItem>>({
        name: '',
        barcodeId: '',
        category: 'Consumibles',
        type: 'Consumible',
        quantity: 1,
        minThreshold: 5,
        location: 'Pañol Central',
        unitPrice: 0,
        status: 'Disponible',
        assignedTo: ''
    });

    const filteredStaff = useMemo(() => {
        if (!staffSearch) return dbStaff;
        return dbStaff.filter(s =>
            s.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
            s.role.toLowerCase().includes(staffSearch.toLowerCase())
        );
    }, [staffSearch, dbStaff]);

    const updateQuantity = async (id: string, delta: number) => {
        // Optimistic Update
        setItems(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = Math.max(0, item.quantity + delta);
                // Fire and forget DB update
                supabase.from('inventory').update({ quantity: newQty }).eq('id', id).then(({ error }) => {
                    if (error) console.error("Error updating quantity:", error);
                });

                const updatedItem = { ...item, quantity: newQty };
                if (selectedItem && selectedItem.id === id) {
                    setSelectedItem(updatedItem);
                }
                return updatedItem;
            }
            return item;
        }));
    };

    const handlePrint = () => {
        window.print();
    };

    const handleSaveNewItem = async () => {
        if (!newItemForm.name || !newItemForm.category || !newItemForm.barcodeId || newItemForm.barcodeId.length !== 4) {
            alert("Por favor complete nombre, categoría y código de 4 dígitos.");
            return;
        }

        const dbPayload = {
            barcode_id: newItemForm.barcodeId,
            name: newItemForm.name,
            category: newItemForm.category,
            type: newItemForm.type,
            quantity: newItemForm.type === 'Serializado' ? 1 : (newItemForm.quantity || 0),
            min_threshold: newItemForm.minThreshold || 0,
            location: newItemForm.location || 'Pañol Central',
            unit_price: newItemForm.unitPrice || 0,
            serial_number: newItemForm.serialNumber,
            status: newItemForm.status,
            expiration_date: newItemForm.expirationDate,
            assigned_to: newItemForm.assignedTo
        };

        try {
            const { data, error } = await supabase.from('inventory').insert(dbPayload).select().single();
            if (error) throw error;
            if (data) {
                const newItem = mapInventoryFromDB(data);
                setItems([newItem, ...items]);
                setIsCreating(false);
                setNewItemForm({
                    name: '', barcodeId: '', category: 'Consumibles', type: 'Consumible', quantity: 1, minThreshold: 5, location: 'Pañol Central', unitPrice: 0, status: 'Disponible', assignedTo: ''
                });
                setStaffSearch('');
                if (newItem.type === 'Serializado') setActiveTab('serialized');
                else setActiveTab('consumables');
                alert("Ítem creado correctamente.");
            }
        } catch (e: any) {
            console.error("Error saving item:", e);
            alert("Error al guardar: " + e.message);
        }
    };

    // --- DETAIL & EDIT LOGIC ---
    const startEditing = () => {
        if (selectedItem) {
            setEditFormData({ ...selectedItem });
            setIsEditingItem(true);
        }
    };

    const cancelEditing = () => {
        setIsEditingItem(false);
        setEditFormData({});
    };

    const saveItemChanges = async () => {
        if (selectedItem && editFormData.name && editFormData.barcodeId && editFormData.barcodeId.length === 4) {
            try {
                const payload = {
                    name: editFormData.name,
                    barcode_id: editFormData.barcodeId,
                    category: editFormData.category,
                    min_threshold: editFormData.minThreshold,
                    unit_price: editFormData.unitPrice,
                    location: editFormData.location,
                    serial_number: editFormData.serialNumber,
                    assigned_to: editFormData.assignedTo
                    // Add others as needed
                };
                const { error } = await supabase.from('inventory').update(payload).eq('id', selectedItem.id);
                if (error) throw error;

                const updatedItem = { ...selectedItem, ...editFormData } as InventoryItem;
                setItems(prev => prev.map(i => i.id === selectedItem.id ? updatedItem : i));
                setSelectedItem(updatedItem);
                setIsEditingItem(false);
                setEditFormData({});
                alert("Ítem actualizado correctamente.");
            } catch (e: any) {
                console.error("Error updating item:", e);
                alert("Error al actualizar: " + e.message);
            }
        } else {
            alert("Nombre y Código ID (4 dígitos) son obligatorios.");
        }
    };

    const deleteItem = async () => {
        if (window.confirm("¿Está seguro de eliminar este ítem del inventario?")) {
            try {
                const { error } = await supabase.from('inventory').delete().eq('id', selectedItem?.id);
                if (error) throw error;
                setItems(prev => prev.filter(i => i.id !== selectedItem?.id));
                setSelectedItem(null);
            } catch (e: any) {
                alert("Error deleting item: " + e.message);
            }
        }
    };

    const categories = [
        { id: 'Todos', label: 'Todos', icon: Box },
        { id: 'Informática', label: 'Informática', icon: Laptop },
        { id: 'Herramientas', label: 'Herramientas', icon: Hammer },
        { id: 'Seguridad', label: 'Seguridad', icon: ShieldAlert },
        { id: 'Consumibles', label: 'Consumibles', icon: Box },
    ];

    const filteredItems = items.filter(i => {
        const matchesTab = activeTab === 'consumables' ? i.type === 'Consumible' : i.type === 'Serializado';
        const matchesCategory = activeCategory === 'Todos' ? true : i.category === activeCategory;
        return matchesTab && matchesCategory;
    });

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'Disponible': return 'text-green-600 bg-green-50 border-green-200';
            case 'En Reparación': return 'text-orange-600 bg-orange-50 border-orange-200';
            case 'Vencido': return 'text-red-600 bg-red-50 border-red-200';
            default: return 'text-slate-600 bg-slate-50 border-slate-200';
        }
    };

    // --- DETAIL VIEW ---
    if (selectedItem) {
        const isConsumable = selectedItem.type === 'Consumible';

        return (
            <div className="bg-[#F8F9FA] min-h-screen pb-24 font-sans">
                {/* Header Actions */}
                <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex items-center justify-between no-print">
                    <button onClick={() => setSelectedItem(null)} className="text-slate-600 p-2" aria-label="Volver"><ChevronLeft size={24} /></button>
                    <h1 className="font-bold text-lg text-slate-800">Detalle de Ítem</h1>
                    <div className="flex gap-2">
                        {isEditingItem ? (
                            <>
                                <button onClick={cancelEditing} className="text-slate-400 font-bold text-sm px-3 py-1.5">Cancelar</button>
                                <button onClick={saveItemChanges} className="bg-orange-500 text-white font-bold text-sm px-4 py-1.5 rounded-full shadow-lg">Guardar</button>
                            </>
                        ) : (
                            <>
                                <button onClick={startEditing} className="p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-orange-50 hover:text-orange-500 transition-colors" aria-label="Editar"><Edit3 size={20} /></button>
                                <button onClick={handlePrint} className="p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200" aria-label="Imprimir"><Printer size={20} /></button>
                            </>
                        )}
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Main Card */}
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg ${isConsumable ? 'bg-slate-800' : 'bg-orange-500'}`}>
                                {isConsumable ? <Box size={32} /> : <HardHat size={32} />}
                            </div>
                            {!isEditingItem && (
                                <div className="text-right">
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID Sistema</span>
                                    <span className="text-xl font-mono font-bold text-slate-800">{selectedItem.barcodeId}</span>
                                </div>
                            )}
                        </div>

                        {isEditingItem ? (
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Nombre</label>
                                    <input
                                        type="text"
                                        value={editFormData.name}
                                        onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border-none rounded-xl text-lg font-bold text-slate-800"
                                        aria-label="Nombre del ítem"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Código ID</label>
                                        <input
                                            type="text"
                                            maxLength={4}
                                            value={editFormData.barcodeId}
                                            onChange={e => setEditFormData({ ...editFormData, barcodeId: e.target.value.replace(/\D/g, '') })}
                                            className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-mono font-bold text-center"
                                            aria-label="Código ID"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Categoría</label>
                                        <select
                                            value={editFormData.category}
                                            onChange={e => setEditFormData({ ...editFormData, category: e.target.value as any })}
                                            className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold"
                                            aria-label="Categoría"
                                        >
                                            {categories.slice(1).map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-2xl font-bold text-slate-800 leading-tight mb-2">{selectedItem.name}</h2>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-lg uppercase">{selectedItem.category}</span>
                                    {!isConsumable && (
                                        <span className={`text-xs font-bold px-2 py-1 rounded-lg uppercase border ${getStatusColor(selectedItem.status)}`}>
                                            {selectedItem.status}
                                        </span>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Stock / Assignment Section */}
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                        {isConsumable ? (
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Activity size={16} className="text-orange-500" /> Control de Stock
                                </h3>

                                <div className="flex items-center justify-between mb-6">
                                    <div className="text-center">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Actual</span>
                                        <span className="text-4xl font-black text-slate-800">{selectedItem.quantity}</span>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => updateQuantity(selectedItem.id, -1)} className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors active:scale-95 shadow-sm" aria-label="Disminuir cantidad">
                                            <Minus size={24} />
                                        </button>
                                        <button onClick={() => updateQuantity(selectedItem.id, 1)} className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-white hover:bg-slate-700 transition-colors active:scale-95 shadow-lg shadow-slate-200" aria-label="Aumentar cantidad">
                                            <Plus size={24} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Mínimo</span>
                                        {isEditingItem ? (
                                            <input
                                                type="number"
                                                value={editFormData.minThreshold}
                                                onChange={e => setEditFormData({ ...editFormData, minThreshold: Number(e.target.value) })}
                                                className="w-full bg-white mt-1 p-2 rounded-lg font-bold text-slate-800 border border-slate-200"
                                                aria-label="Stock Mínimo"
                                            />
                                        ) : (
                                            <span className="text-lg font-bold text-slate-600">{selectedItem.minThreshold} un.</span>
                                        )}
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Valor Unit.</span>
                                        {isEditingItem ? (
                                            <input
                                                type="number"
                                                value={editFormData.unitPrice}
                                                onChange={e => setEditFormData({ ...editFormData, unitPrice: Number(e.target.value) })}
                                                className="w-full bg-white mt-1 p-2 rounded-lg font-bold text-slate-800 border border-slate-200"
                                                aria-label="Valor Unitario"
                                            />
                                        ) : (
                                            <span className="text-lg font-bold text-green-600">${selectedItem.unitPrice}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Briefcase size={16} className="text-orange-500" /> Asignación y Estado
                                </h3>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Responsable</label>
                                    {isEditingItem ? (
                                        <div className="relative">
                                            <select
                                                value={editFormData.assignedTo}
                                                onChange={e => setEditFormData({ ...editFormData, assignedTo: e.target.value })}
                                                className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold appearance-none"
                                                aria-label="Asignar Responsable"
                                            >
                                                <option value="">Sin Asignar (Pañol)</option>
                                                {dbStaff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                            </select>
                                            <User size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                                <User size={20} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{selectedItem.assignedTo || 'Sin Asignar'}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{selectedItem.assignedTo ? 'En Posesión' : 'En Pañol'}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Ubicación Actual</label>
                                    {isEditingItem ? (
                                        <select
                                            value={editFormData.location}
                                            onChange={e => setEditFormData({ ...editFormData, location: e.target.value })}
                                            className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold"
                                            aria-label="Ubicación Actual"
                                        >
                                            <option value="Pañol Central">Pañol Central</option>
                                            {dbProjects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                        </select>
                                    ) : (
                                        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                            <MapPin size={18} className="text-slate-400" />
                                            <span className="text-sm font-bold text-slate-700">{selectedItem.location}</span>
                                        </div>
                                    )}
                                </div>

                                {!isConsumable && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Número de Serie</label>
                                        {isEditingItem ? (
                                            <input
                                                type="text"
                                                value={editFormData.serialNumber}
                                                onChange={e => setEditFormData({ ...editFormData, serialNumber: e.target.value })}
                                                className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-mono font-bold"
                                                aria-label="Número de Serie"
                                            />
                                        ) : (
                                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 font-mono text-sm text-slate-600 font-bold">
                                                {selectedItem.serialNumber || 'N/A'}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Digital Tag Section */}
                    {!isEditingItem && (
                        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-2">
                                    <ScanLine size={16} className="text-orange-500" /> Etiqueta Digital
                                </h3>
                                <p className="text-[10px] text-slate-400">Escaneable en pañol</p>
                            </div>
                            <div className="flex flex-col items-center gap-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                <div className="flex h-8 items-end gap-[2px]">
                                    {[...Array(15)].map((_, i) => (
                                        <div key={i} className={`bg-slate-800 h-full ${Math.random() > 0.5 ? 'w-[2px]' : 'w-[1px]'}`} />
                                    ))}
                                </div>
                                <span className="font-mono text-xs font-bold tracking-[0.2em] text-slate-800">{selectedItem.barcodeId}</span>
                            </div>
                        </div>
                    )}

                    {/* Delete Option */}
                    {isEditingItem && (
                        <button
                            onClick={deleteItem}
                            className="w-full py-4 rounded-2xl border-2 border-red-100 text-red-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"
                        >
                            <Trash2 size={18} /> Dar de Baja Ítem
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // --- VIEW: CREATE ITEM ---
    if (isCreating) {
        return (
            <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans animate-in slide-in-from-right-5 duration-300">
                <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex items-center justify-between">
                    <button onClick={() => setIsCreating(false)} className="text-slate-600 p-2" aria-label="Volver"><ChevronLeft size={24} /></button>
                    <h1 className="font-bold text-lg text-slate-800">Cargar Inventario</h1>
                    <button onClick={handleSaveNewItem} className="text-orange-500 font-bold text-sm bg-orange-50 px-4 py-1.5 rounded-full">Guardar</button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Basic Info Section */}
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                            <Tag size={14} className="text-orange-500" /> Especificaciones del Bien
                        </h3>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nombre / Descripción</label>
                            <input
                                type="text"
                                value={newItemForm.name}
                                onChange={(e) => setNewItemForm({ ...newItemForm, name: e.target.value })}
                                placeholder="Ej. Notebook Lenovo, Martillo Demoledor..."
                                className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 text-sm font-bold text-slate-800"
                                aria-label="Nombre / Descripción"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tipo de Ítem</label>
                                <select
                                    value={newItemForm.type}
                                    onChange={(e) => setNewItemForm({ ...newItemForm, type: e.target.value as any })}
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 text-sm font-medium text-slate-700 appearance-none"
                                    aria-label="Tipo de Ítem"
                                >
                                    <option value="Consumible">Stock (Consumible)</option>
                                    <option value="Serializado">Equipo (Ficha/Herramienta)</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Categoría</label>
                                <select
                                    value={newItemForm.category}
                                    onChange={(e) => setNewItemForm({ ...newItemForm, category: e.target.value as any })}
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 text-sm font-medium text-slate-700 appearance-none"
                                    aria-label="Categoría"
                                >
                                    <option value="Consumibles">Consumibles</option>
                                    <option value="Herramientas">Herramientas</option>
                                    <option value="Informática">Informática</option>
                                    <option value="Seguridad">Seguridad</option>
                                    <option value="Medición">Medición</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Código ID (4 Dígitos)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    maxLength={4}
                                    value={newItemForm.barcodeId}
                                    onChange={(e) => setNewItemForm({ ...newItemForm, barcodeId: e.target.value.replace(/\D/g, '') })}
                                    placeholder="0000"
                                    className="w-full p-4 pl-12 bg-white border border-slate-200 rounded-2xl text-sm font-mono font-bold tracking-widest text-center"
                                    aria-label="Código ID"
                                />
                                <ScanLine size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>

                        {newItemForm.type === 'Consumible' ? (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Cantidad Inicial</label>
                                    <input
                                        type="number"
                                        value={newItemForm.quantity}
                                        onChange={(e) => setNewItemForm({ ...newItemForm, quantity: Number(e.target.value) })}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold"
                                        aria-label="Cantidad Inicial"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Stock Mínimo</label>
                                    <input
                                        type="number"
                                        value={newItemForm.minThreshold}
                                        onChange={(e) => setNewItemForm({ ...newItemForm, minThreshold: Number(e.target.value) })}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium text-slate-400"
                                        aria-label="Stock Mínimo"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-1 animate-in fade-in">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Número de Serie / S/N</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={newItemForm.serialNumber || ''}
                                        onChange={(e) => setNewItemForm({ ...newItemForm, serialNumber: e.target.value })}
                                        placeholder="S/N: 00000000"
                                        className="w-full p-4 bg-orange-50 border-none rounded-2xl text-sm font-mono text-orange-900 placeholder:text-orange-200"
                                        aria-label="Número de Serie"
                                    />
                                    <Tag size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-300" />
                                </div>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Costo Unitario (Estimado)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={newItemForm.unitPrice}
                                    onChange={(e) => setNewItemForm({ ...newItemForm, unitPrice: Number(e.target.value) })}
                                    className="w-full p-4 pl-12 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-800"
                                    aria-label="Costo Unitario"
                                />
                                <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                            </div>
                        </div>
                    </div>

                    {/* Serialized Specific: Assignment Logic */}
                    {newItemForm.type === 'Serializado' && (
                        <div className="bg-slate-900 p-6 rounded-[2.5rem] shadow-xl space-y-5 animate-in slide-in-from-bottom-5 duration-500">
                            <h3 className="text-xs font-bold text-orange-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                                <HardHat size={14} /> Asignación Operativa
                            </h3>

                            {/* Obra / Proyecto Selector */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Obra de Destino / Ubicación</label>
                                <div className="relative">
                                    <select
                                        value={newItemForm.location}
                                        onChange={(e) => setNewItemForm({ ...newItemForm, location: e.target.value })}
                                        className="w-full p-4 bg-white/10 border border-white/10 rounded-2xl focus:ring-2 focus:ring-orange-500/50 text-sm font-bold text-white appearance-none"
                                        aria-label="Obra de Destino"
                                    >
                                        <option value="Pañol Central" className="bg-slate-800">Pañol Central (Sin Asignar)</option>
                                        {dbProjects.map(proj => (
                                            <option key={proj.id} value={proj.name} className="bg-slate-800">{proj.name}</option>
                                        ))}
                                    </select>
                                    <MapPin size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-500 pointer-events-none" />
                                </div>
                            </div>

                            {/* Responsable Searchable Selector */}
                            <div className="space-y-1 relative">
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Responsable del Equipo</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder={newItemForm.assignedTo || "Buscar por nombre..."}
                                        value={staffSearch}
                                        onFocus={() => setShowStaffResults(true)}
                                        onChange={(e) => {
                                            setStaffSearch(e.target.value);
                                            setShowStaffResults(true);
                                        }}
                                        className="w-full p-4 pl-12 bg-white/10 border border-white/10 rounded-2xl focus:ring-2 focus:ring-orange-500/50 text-sm font-bold text-white placeholder:text-white/30"
                                        aria-label="Buscar Responsable"
                                    />
                                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />

                                    {newItemForm.assignedTo && !staffSearch && (
                                        <div className="absolute right-12 top-1/2 -translate-y-1/2 bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                            ASIGNADO
                                        </div>
                                    )}

                                    {newItemForm.assignedTo && (
                                        <button
                                            onClick={() => {
                                                setNewItemForm({ ...newItemForm, assignedTo: '' });
                                                setStaffSearch('');
                                            }}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                            aria-label="Limpiar selección"
                                        >
                                            <X size={18} />
                                        </button>
                                    )}
                                </div>

                                {/* Search Results Dropdown */}
                                {showStaffResults && (
                                    <div className="absolute z-30 left-0 right-0 top-full mt-2 bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 max-h-60 overflow-y-auto no-scrollbar animate-in fade-in zoom-in-95">
                                        <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Colaboradores</span>
                                            <button onClick={() => setShowStaffResults(false)} aria-label="Cerrar lista"><X size={14} className="text-slate-400" /></button>
                                        </div>
                                        {filteredStaff.map(staff => (
                                            <button
                                                key={staff.id}
                                                onClick={() => {
                                                    setNewItemForm({ ...newItemForm, assignedTo: staff.name });
                                                    setStaffSearch('');
                                                    setShowStaffResults(false);
                                                }}
                                                className="w-full p-4 flex items-center gap-3 hover:bg-orange-50 border-b border-slate-50 last:border-none text-left transition-colors"
                                            >
                                                <img src={staff.avatar} className="w-8 h-8 rounded-full object-cover border border-slate-200" alt="Avatar" />
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">{staff.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium">{staff.role}</p>
                                                </div>
                                                {newItemForm.assignedTo === staff.name && (
                                                    <Check size={16} className="ml-auto text-orange-500" />
                                                )}
                                            </button>
                                        ))}
                                        {filteredStaff.length === 0 && (
                                            <div className="p-8 text-center text-slate-400 text-xs italic">
                                                No se encontraron colaboradores...
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Estado de Entrega</label>
                                    <select
                                        value={newItemForm.status}
                                        onChange={(e) => setNewItemForm({ ...newItemForm, status: e.target.value as any })}
                                        className="w-full p-4 bg-white/10 border border-white/10 rounded-2xl text-sm font-bold text-white appearance-none"
                                        aria-label="Estado de Entrega"
                                    >
                                        <option value="Disponible" className="bg-slate-800">Disponible</option>
                                        <option value="En Reparación" className="bg-slate-800">Pendiente de Revisión</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Venc. Certificado</label>
                                    <input
                                        type="date"
                                        value={newItemForm.expirationDate || ''}
                                        onChange={(e) => setNewItemForm({ ...newItemForm, expirationDate: e.target.value })}
                                        className="w-full p-4 bg-white/10 border border-white/10 rounded-2xl text-xs font-bold text-white"
                                        aria-label="Vencimiento de Certificado"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleSaveNewItem}
                        className="w-full bg-slate-800 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-300 flex items-center justify-center gap-3 active:scale-95 transition-all"
                    >
                        <Save size={20} /> Confirmar Alta de Inventario
                    </button>
                </div>
            </div>
        );
    }

    // --- VIEW: LIST ---
    return (
        <div className="p-4 md:p-8 space-y-6 bg-[#F8F9FA] min-h-screen font-sans">
            {/* PRINT HEADER */}
            <div className="print-header">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">SW</div>
                    <div>
                        <h1 className="font-bold text-lg text-slate-800">SOWIC - REPORTE DE INVENTARIO</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{activeTab === 'consumables' ? 'Stock de Consumibles' : 'Equipos y Herramientas'}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Fecha de Emisión</p>
                    <p className="text-sm font-black text-slate-800">{new Date().toLocaleDateString()}</p>
                </div>
            </div>

            <div className="flex justify-between items-center no-print">
                <h1 className="text-2xl font-bold text-slate-800">Inventario</h1>
                <div className="flex gap-2">
                    <button onClick={handlePrint} className="p-2 bg-white rounded-xl shadow-sm text-slate-600 hover:text-orange-500 transition-colors" aria-label="Imprimir"><Printer size={20} /></button>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="w-12 h-12 bg-orange-500 rounded-[1.25rem] flex items-center justify-center text-white shadow-lg shadow-orange-200 active:scale-90 transition-transform"
                        aria-label="Nuevo Item"
                    >
                        <Plus size={28} />
                    </button>
                </div>
            </div>

            <div className="bg-slate-200 p-1 rounded-2xl flex mb-6 no-print">
                <button onClick={() => setActiveTab('consumables')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'consumables' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Consumibles</button>
                <button onClick={() => setActiveTab('serialized')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'serialized' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Herramientas y Equipos</button>
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 no-print">
                {categories.map(cat => (
                    <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-xs font-bold transition-colors ${activeCategory === cat.id ? 'bg-slate-800 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-600'}`}><cat.icon size={14} />{cat.label}</button>
                ))}
            </div>

            {/* PRINT TABLE (Visible only when printing) */}
            <div className="hidden print:block w-full overflow-hidden border border-slate-200 rounded-xl mt-4">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="p-3 text-[10px] font-bold text-slate-400 uppercase border-b">Artículo</th>
                            <th className="p-3 text-[10px] font-bold text-slate-400 uppercase border-b">ID / Código</th>
                            <th className="p-3 text-[10px] font-bold text-slate-400 uppercase border-b">Ubicación / Responsable</th>
                            <th className="p-3 text-[10px] font-bold text-slate-400 uppercase border-b text-center">Stock / Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredItems.map(item => (
                            <tr key={item.id} className="border-b border-slate-100 last:border-none">
                                <td className="p-3 text-xs">
                                    <p className="font-bold text-slate-800">{item.name}</p>
                                    <p className="text-[9px] text-slate-400">{item.category}</p>
                                </td>
                                <td className="p-3 text-xs font-mono">{item.barcodeId || item.serialNumber || '---'}</td>
                                <td className="p-3 text-xs">
                                    <p className="font-medium text-slate-700">{item.location}</p>
                                    <p className="text-[9px] text-orange-600 font-bold uppercase">{item.assignedTo || 'PAÑOL CENTRAL'}</p>
                                </td>
                                <td className="p-3 text-xs text-center font-bold">
                                    {item.type === 'Consumible' ? item.quantity : item.status}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="space-y-4 pb-20 no-print">
                {filteredItems.map(item => (
                    <InventoryListItem
                        key={item.id}
                        item={item}
                        onClick={setSelectedItem}
                        onUpdateQuantity={updateQuantity}
                        getStatusColor={getStatusColor}
                    />
                ))}
                {filteredItems.length === 0 && (
                    <div className="text-center py-20 bg-white/50 rounded-[3rem] border border-dashed border-slate-200">
                        <Box size={48} className="mx-auto text-slate-200 mb-4 opacity-50" />
                        <p className="text-slate-400 font-bold text-sm">No hay registros cargados aún.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Inventory;
