
import React, { useState, useMemo, useEffect } from 'react';
import {
    MapPin, Users, HardHat, ChevronRight, ChevronLeft, Save,
    Calendar, Folder, Archive, CheckCircle2, Clock, MoreVertical,
    Truck, Package, Phone, Activity, Box, Search, AlertTriangle, Plus, Pencil
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { MOCK_PROJECTS, MOCK_ASSETS, MOCK_STAFF, MOCK_INVENTORY } from '../constants';
import { Project, Asset, Staff, InventoryItem } from '../types';
import { supabase } from '../supabaseClient';

const mapStaffFromDB = (data: any): Staff => ({
    id: data.id,
    name: data.name,
    role: data.role,
    status: data.status || 'Disponible',
    location: data.location || '-',
    avatar: data.avatar || 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=100',
    assignedAssets: data.assigned_assets || [],
    email: data.email || '',
    phone: data.phone || '',
    dni: data.dni || '',
    admissionDate: data.admission_date || '',
    certifications: data.certifications || ''
});

// Simplified mapping for inventory since we don't have full type yet
const mapAssetFromDB = (data: any): Asset => ({
    ...data,
    id: data.id,
    name: data.name,
    // ... incomplete mapping fallback
    internalId: data.internal_id,
    barcodeId: data.barcode_id,
    status: data.status || 'Operativo',
    location: data.location,
    image: data.image || 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=100',
    hours: data.hours || 0,
    // Fill mandatory fields with defaults if missing
    type: data.type || 'Maquinaria',
    ownership: data.ownership || 'Propio',
    brand: data.brand || '',
    model: data.model || '',
    year: data.year || 2024,
    dailyRate: 0,
    value: 0,
    serial: data.serial || ''
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
    responsible: data.responsible || 'Sin Asignar',
    comitente: data.comitente || ''
});

const mapProjectToDB = (project: Partial<Project>) => ({
    name: project.name,
    internal_id: project.internalId,
    status: project.status,
    location: project.location,
    responsible: project.responsible,
    comitente: project.comitente,
    // counts are usually calculated or ignored on insert if they are view-based, 
    // but if real columns:
    assigned_assets_count: project.assignedAssets || 0,
    assigned_staff_count: project.assignedStaff || 0
});

const Projects: React.FC = () => {
    const location = useLocation();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [projectStaff, setProjectStaff] = useState<Staff[]>([]);
    const [projectAssets, setProjectAssets] = useState<any[]>([]); // Extended Asset with dates
    const [projectInventory, setProjectInventory] = useState<InventoryItem[]>([]);

    // New Project Form State
    const [newProjectData, setNewProjectData] = useState<Partial<Project>>({
        name: '',
        internalId: '',
        status: 'Planificación' as any, // temporal cast, mapped to Activa/Cerrada later if needed or update type
        responsible: '',
        comitente: '',
        location: ''
    });

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setProjects(data.map(mapProjectFromDB));
        } catch (err) {
            console.error('Error fetching projects:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedProject) {
            fetchProjectStaff(selectedProject.name);
            fetchProjectResources(selectedProject);
        } else {
            setProjectStaff([]);
            setProjectAssets([]);
            setProjectInventory([]);
        }
    }, [selectedProject]);

    const fetchProjectStaff = async (projectName: string) => {
        try {
            const { data, error } = await supabase
                .from('staff')
                .select('*')
                .eq('location', projectName);

            if (error) throw error;
            if (data) setProjectStaff(data.map(mapStaffFromDB));
        } catch (err) {
            console.error("Error fetching project staff:", err);
        }
    };

    const fetchProjectResources = async (project: Project) => {
        try {
            // 1. Fetch Assets via Allocations (Cronograma)
            // We want assets that are allocated to this project
            const { data: allocData, error: allocError } = await supabase
                .from('asset_allocations')
                .select(`
                    *,
                    assets (*)
                `)
                .eq('project_id', project.id);

            if (allocError) throw allocError;

            // Also fetch assets that might just be "located" there but not allocated? 
            // For now, let's strictly follow the user's "logistics determines location" rule, 
            // but also fallback to the simple location check for assets that might have been transferred without allocation.
            // Actually, to show dates, we rely on allocations. 
            // Let's mix both: Assets physically there + Allocation info.

            // For simplicity and user request "visualizar desde fecha hasta fecha", 
            // we primarily use allocations.

            if (allocData) {
                const mappedAssets = allocData.map((item: any) => ({
                    ...mapAssetFromDB(item.assets), // Base asset
                    allocationId: item.id,
                    startDate: item.start_date,
                    endDate: item.end_date,
                }));
                setProjectAssets(mappedAssets);
            }

            // 2. Fetch Inventory
            // Inventory usually doesn't have allocations, just location
            // We need a mapInventoryFromDB helper if not exists or just cast
            const { data: invData, error: invError } = await supabase
                .from('inventory') // Assuming table name
                .select('*')
                .eq('location', project.name); // Using name for now as location usually strings

            if (!invError && invData) {
                // Simple mapping if needed, or direct use
                setProjectInventory(invData as any);
            } else {
                setProjectInventory([]); // fallback
            }

        } catch (err) {
            console.error("Error fetching project resources:", err);
        }
    };

    // Handle direct link from search
    useEffect(() => {
        if (location.state && (location.state as any).targetProjectId) {
            const targetId = (location.state as any).targetProjectId;
            const found = projects.find(p => p.id === targetId);
            if (found) setSelectedProject(found);
        }
    }, [location, projects]);

    const handleCloseProject = async () => {
        if (!selectedProject) return;

        const confirm = window.confirm(`¿Estás seguro de que deseas cerrar la obra "${selectedProject.name}"? Esta acción archivará el proyecto.`);

        if (confirm) {
            try {
                const { error } = await supabase
                    .from('projects')
                    .update({ status: 'Cerrada' })
                    .eq('id', selectedProject.id);

                if (error) throw error;

                const updatedList = projects.map(p =>
                    p.id === selectedProject.id ? { ...p, status: 'Cerrada' as const } : p
                );
                setProjects(updatedList);
                setSelectedProject({ ...selectedProject, status: 'Cerrada' });
                alert("Proyecto cerrado exitosamente.");
            } catch (err: any) {
                console.error("Error closing project:", err);
                alert("Error al cerrar proyecto: " + err.message);
            }
        }
    };

    const handleCreateProject = async () => {
        if (!newProjectData.name || !newProjectData.internalId) {
            alert("Nombre e ID son obligatorios");
            return;
        }

        try {
            const payload = mapProjectToDB({
                ...newProjectData,
                status: (newProjectData.status as any) === 'Finalizada' ? 'Cerrada' : 'Activa', // Map specific status to Project type
                assignedAssets: 0,
                assignedStaff: 0
            });

            const { data, error } = await supabase
                .from('projects')
                .insert(payload)
                .select()
                .single();

            if (error) throw error;

            if (data) {
                const newProject = mapProjectFromDB(data);
                setProjects([newProject, ...projects]);
                setIsCreating(false);
                setNewProjectData({ name: '', internalId: '', status: 'Planificación' as any, responsible: '', comitente: '', location: '' });
                alert("Proyecto creado exitosamente");
            }
        } catch (err: any) {
            console.error("Error creating project:", err);
            alert("Error al crear proyecto: " + err.message);
        }
    };

    const handleEditProject = () => {
        if (!selectedProject) return;
        setNewProjectData({
            name: selectedProject.name,
            internalId: selectedProject.internalId,
            status: selectedProject.status,
            responsible: selectedProject.responsible,
            comitente: selectedProject.comitente || '',
            location: selectedProject.location
        });
        setIsEditing(true);
    };

    const handleUpdateProject = async () => {
        if (!selectedProject) return;
        if (!newProjectData.name || !newProjectData.internalId) {
            alert("Nombre e ID son obligatorios");
            return;
        }

        try {
            const payload = mapProjectToDB({
                ...newProjectData,
                status: (newProjectData.status as any) === 'Finalizada' ? 'Cerrada' : (newProjectData.status || 'Activa') as any,
            });

            const { data, error } = await supabase
                .from('projects')
                .update(payload)
                .eq('id', selectedProject.id)
                .select()
                .single();

            if (error) throw error;

            if (data) {
                const updatedProject = mapProjectFromDB(data);
                const updatedList = projects.map(p => p.id === updatedProject.id ? updatedProject : p);
                setProjects(updatedList);
                setSelectedProject(updatedProject);
                setIsEditing(false);
                setNewProjectData({ name: '', internalId: '', status: 'Planificación' as any, responsible: '', comitente: '', location: '' });
                alert("Proyecto actualizado exitosamente");
            }
        } catch (err: any) {
            console.error("Error updating project:", err);
            alert("Error al actualizar proyecto: " + err.message);
        }
    };

    // Removed mock projectResources useMemo

    // CREATE / EDIT VIEW
    if (isCreating || isEditing) {
        return (
            <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans">
                <div className="bg-white p-4 sticky top-0 z-10 shadow-sm flex items-center justify-between">
                    <button onClick={() => { setIsCreating(false); setIsEditing(false); }} className="text-slate-600 p-2 -ml-2 rounded-full hover:bg-slate-50" aria-label="Volver"><ChevronLeft size={24} /></button>
                    <h1 className="font-bold text-lg text-slate-800">{isEditing ? 'Editar Obra' : 'Nueva Obra'}</h1>
                    <button onClick={isEditing ? handleUpdateProject : handleCreateProject} className="text-orange-500 font-bold text-sm">Guardar</button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Folder size={18} className="text-orange-500" /> Información General
                        </h3>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nombre del Proyecto</label>
                            <input
                                type="text"
                                value={newProjectData.name}
                                onChange={(e) => setNewProjectData({ ...newProjectData, name: e.target.value })}
                                placeholder="Ej. Torre Central - Etapa 2"
                                className="w-full p-4 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-medium shadow-sm"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">ID Interno</label>
                                <input
                                    type="text"
                                    value={newProjectData.internalId}
                                    onChange={(e) => setNewProjectData({ ...newProjectData, internalId: e.target.value })}
                                    placeholder="PRJ-..."
                                    className="w-full p-4 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-medium shadow-sm uppercase"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Estado</label>
                                <select
                                    value={newProjectData.status}
                                    onChange={(e) => setNewProjectData({ ...newProjectData, status: e.target.value as any })}
                                    className="w-full p-4 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-medium shadow-sm appearance-none"
                                    aria-label="Estado del Proyecto"
                                >
                                    <option value="Planificación">Planificación</option>
                                    <option value="Activa">Activa</option>
                                    <option value="Pausada">Pausada</option>
                                    <option value="Finalizada">Finalizada</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Comitente</label>
                            <input
                                type="text"
                                value={newProjectData.comitente}
                                onChange={(e) => setNewProjectData({ ...newProjectData, comitente: e.target.value })}
                                placeholder="Nombre del Comitente / Cliente"
                                className="w-full p-4 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-medium shadow-sm"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Responsable</label>
                            <input
                                type="text"
                                value={newProjectData.responsible}
                                onChange={(e) => setNewProjectData({ ...newProjectData, responsible: e.target.value })}
                                placeholder="Jefe de Obra / Gerente"
                                className="w-full p-4 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-medium shadow-sm"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Ubicación</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={newProjectData.location}
                                    onChange={(e) => setNewProjectData({ ...newProjectData, location: e.target.value })}
                                    placeholder="Dirección o Coordenadas"
                                    className="w-full p-4 pl-12 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-medium shadow-sm"
                                />
                                <MapPin size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>
                    </div>

                    <hr className="border-slate-200" />

                    <div className="space-y-4">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Calendar size={18} className="text-orange-500" /> Cronograma
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Fecha de Inicio</label>
                                <input
                                    type="date"
                                    className="w-full p-4 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-medium shadow-sm text-slate-600"
                                    aria-label="Fecha de Inicio"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Fecha Finalización</label>
                                <input
                                    type="date"
                                    className="w-full p-4 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-medium shadow-sm text-slate-600"
                                    aria-label="Fecha Finalización"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={isEditing ? handleUpdateProject : handleCreateProject}
                        className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold shadow-lg shadow-slate-300 flex items-center justify-center gap-2 mt-4"
                    >
                        <Save size={20} /> {isEditing ? 'Guardar Cambios' : 'Crear Proyecto'}
                    </button>
                </div>
            </div>
        );
    }

    // DETAIL VIEW
    if (selectedProject) {
        const isClosed = selectedProject.status === 'Cerrada';
        const assets = projectAssets;
        const inventory = projectInventory;

        return (
            <div className="bg-[#F8F9FA] min-h-screen pb-24 font-sans">
                <div className="bg-white p-4 sticky top-0 z-10 shadow-sm flex items-center justify-between">
                    <button onClick={() => setSelectedProject(null)} className="text-slate-600 p-2 -ml-2 rounded-full hover:bg-slate-50" aria-label="Volver">
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className="font-bold text-lg text-slate-800">Detalle de Obra</h1>
                    <button onClick={handleEditProject} className="text-slate-400 p-2 -mr-2 rounded-full hover:bg-slate-50" aria-label="Editar">
                        <Pencil size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Project Header Card */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
                        <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl text-[10px] font-bold uppercase tracking-wider ${isClosed ? 'bg-slate-800 text-white' : 'bg-green-100 text-green-700'}`}>
                            {selectedProject.status}
                        </div>

                        <span className="text-xs font-bold text-slate-400 block mb-1">{selectedProject.internalId}</span>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2 leading-tight">{selectedProject.name}</h2>

                        <div className="flex items-center gap-2 text-slate-500 text-sm mb-4">
                            <MapPin size={16} className="text-orange-500" />
                            {selectedProject.location}
                        </div>

                        {selectedProject.comitente && (
                            <div className="mb-4">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Comitente</p>
                                <p className="text-sm font-bold text-slate-700">{selectedProject.comitente}</p>
                            </div>
                        )}

                        <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border-2 border-white shadow-sm">
                                {selectedProject.responsible.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase">Responsable</p>
                                <p className="text-sm font-bold text-slate-800">{selectedProject.responsible}</p>
                            </div>
                        </div>
                    </div>

                    {/* --- 1. STAFF SECTION --- */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">
                                <Users size={18} className="text-orange-500" /> Personal del Proyecto
                            </h3>
                            <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{projectStaff.length}</span>
                        </div>
                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                            {projectStaff.map(person => (
                                <div key={person.id} className="min-w-[140px] bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center group active:scale-95 transition-transform">
                                    <div className="relative mb-3">
                                        <img src={person.avatar} className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-sm" alt={person.name} />
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                                    </div>
                                    <p className="text-xs font-bold text-slate-800 truncate w-full">{person.name}</p>
                                    <p className="text-[10px] text-slate-400 font-medium truncate w-full">{person.role}</p>
                                    <button className="mt-3 w-8 h-8 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center hover:bg-orange-500 hover:text-white transition-colors" aria-label="Llamar">
                                        <Phone size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        {projectStaff.length === 0 && (
                            <div className="w-full py-6 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sin personal registrado</p>
                            </div>
                        )}
                    </div>
                </div>

                <hr className="border-slate-100" />

                {/* --- 2. ASSETS SECTION --- */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">
                            <Truck size={18} className="text-orange-500" /> Activos Asignados
                        </h3>
                        <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{assets.length}</span>
                    </div>
                    <div className="space-y-3">
                        {assets.map(asset => (
                            <div key={asset.id + asset.allocationId} className="bg-white p-4 rounded-3xl border border-slate-50 shadow-sm flex items-center gap-4 hover:border-orange-200 transition-colors cursor-pointer">
                                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-50 shrink-0 border border-slate-100">
                                    <img src={asset.image} className="w-full h-full object-cover" alt={asset.name} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{asset.internalId}</p>
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${asset.status === 'Operativo' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                                            {asset.status}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-sm truncate">{asset.name}</h4>

                                    {/* Dates Display */}
                                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                        {asset.startDate && (
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase">
                                                <Calendar size={10} /> {new Date(asset.startDate + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                                                <span className="mx-1 text-slate-300">|</span>
                                                {new Date(asset.endDate + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                                            <Activity size={10} className="text-orange-500" /> {asset.hours.toLocaleString()} hrs
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {assets.length === 0 && (
                            <div className="py-8 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                                <Truck size={32} className="mx-auto text-slate-200 mb-2 opacity-50" />
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No hay maquinaria en esta obra</p>
                            </div>
                        )}
                    </div>
                </div>

                <hr className="border-slate-100" />

                {/* --- 3. INVENTORY SECTION --- */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">
                            <Box size={18} className="text-orange-500" /> Inventario de Obra
                        </h3>
                        <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{inventory.length}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        {inventory.map(item => (
                            <div key={item.id} className="bg-white p-4 rounded-3xl border border-slate-50 shadow-sm flex items-center justify-between group hover:border-orange-200 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                                        <Package size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-800 text-sm truncate">{item.name}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{item.category}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {item.quantity <= item.minThreshold && (
                                        <AlertTriangle size={14} className="text-red-500 animate-pulse" />
                                    )}
                                    <div className="bg-slate-100 px-3 py-1.5 rounded-xl text-center">
                                        <span className="text-xs font-black text-slate-700">{item.quantity}</span>
                                        <span className="text-[8px] font-bold text-slate-400 uppercase block -mt-1">Stock</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {inventory.length === 0 && (
                            <div className="py-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">Obrador vacío o sin registrar</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress / Timeline Card */}
                <div className="bg-slate-800 p-6 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-orange-500 opacity-20 rounded-full blur-2xl"></div>
                    <h3 className="font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Clock size={18} className="text-orange-500" /> Estado del Cronograma
                    </h3>
                    <div className="w-full bg-white/10 rounded-full h-3 mb-3 overflow-hidden">
                        <div className={`h-full rounded-full ${isClosed ? 'bg-slate-400' : 'bg-orange-500'} w-[75%]`}></div>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-white/60 uppercase tracking-tighter">
                        <span>Inicio: 10 Ene 2024</span>
                        <span>75% Completado</span>
                    </div>
                </div>

                {/* Close Project Action */}
                {!isClosed ? (
                    <button
                        onClick={handleCloseProject}
                        className="w-full bg-red-50 text-red-600 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.1em] shadow-sm border border-red-100 flex items-center justify-center gap-2 mt-8 hover:bg-red-100 transition-colors active:scale-[0.98]"
                    >
                        <Archive size={18} /> Marcar Obra como Cerrada
                    </button>
                ) : (
                    <div className="bg-slate-100 text-slate-500 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.1em] border border-slate-200 flex items-center justify-center gap-2 mt-8 opacity-70">
                        <CheckCircle2 size={18} /> Proyecto Finalizado y Archivado
                    </div>
                )}
            </div>

        );
    }

    // LIST VIEW
    return (
        <div className="p-4 md:p-8 space-y-6 bg-[#F8F9FA] min-h-screen">
            <h1 className="text-2xl font-bold text-slate-800">Obras Activas</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {projects.map(project => (
                    <div
                        key={project.id}
                        onClick={() => setSelectedProject(project)}
                        className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group hover:border-orange-300 transition-colors cursor-pointer active:scale-[0.99]"
                    >
                        <div className={`h-2 w-full ${project.status === 'Cerrada' ? 'bg-slate-400' : 'bg-orange-500'}`}></div>
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-slate-400">{project.internalId}</span>
                                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${project.status === 'Cerrada' ? 'bg-slate-100 text-slate-500' : 'bg-green-100 text-green-700'}`}>
                                    {project.status}
                                </span>
                            </div>
                            <h3 className={`text-xl font-bold mb-1 ${project.status === 'Cerrada' ? 'text-slate-500' : 'text-slate-800'}`}>{project.name}</h3>
                            <div className="flex items-center gap-1 text-slate-500 text-xs font-medium mb-4">
                                <MapPin size={14} className="text-orange-500" />
                                {project.location}
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                        <Truck size={16} className={project.status === 'Cerrada' ? 'text-slate-400' : 'text-orange-500'} />
                                        {project.assignedAssets}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                        <Users size={16} className="text-slate-500" />
                                        {project.assignedStaff}
                                    </div>
                                </div>
                                <ChevronRight size={20} className="text-slate-300 group-hover:text-orange-500 transition-colors" />
                            </div>
                        </div>
                    </div>
                ))}

                {/* Add New Project Card */}
                <div
                    onClick={() => setIsCreating(true)}
                    className="border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center p-8 text-slate-400 hover:border-orange-400 hover:text-orange-500 hover:bg-orange-50 transition-all cursor-pointer min-h-[220px]"
                >
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                        <Plus size={24} />
                    </div>
                    <span className="font-bold text-sm uppercase tracking-widest">Nueva Obra</span>
                </div>
            </div>
        </div>
    );
};

export default Projects;
