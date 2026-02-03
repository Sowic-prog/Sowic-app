import React, { useState, useRef } from 'react';
import {
  Search, Phone, Mail, MapPin, Plus, Settings2, X, Check,
  UserPlus, ChevronRight, Save, Camera, UserCircle2, Briefcase,
  Edit, Trash2, ArrowLeft, CreditCard, Shield, Key, AlertTriangle, Smartphone, Palette, FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Staff } from '../types';
import { useStaff } from '../hooks/useStaff';
import { useProjects } from '../hooks/useProjects';

interface StatusConfig {
  label: string;
  color: string;
}

const DEFAULT_MODULES = [
  { path: '/maintenance', label: 'Taller y Mantenimiento' },
  { path: '/assets', label: 'Gestión de Activos' },
  { path: '/projects', label: 'Obras y Proyectos' },
  { path: '/personnel', label: 'Personal' },
  { path: '/inventory', label: 'Inventario' },
  { path: '/logistics', label: 'Logística' },
  { path: '/providers', label: 'Proveedores' },
  { path: '/services', label: 'Solicitudes y Servicios' },
  { path: '/calendar', label: 'Calendario y Agenda' },
  { path: '/reports', label: 'Reportes' },
  { path: '/infrastructure', label: 'Infraestructura' },
];

const Personnel: React.FC = () => {
  const { user: currentUser, checkPermission } = useAuth();
  const canEdit = checkPermission('/personnel', 'edit');
  const { data: staffList, loading, createStaff, updateStaff, deleteStaff } = useStaff();
  const { projects: activeProjects, loading: projectsLoading } = useProjects();

  const [isConfiguringStatuses, setIsConfiguringStatuses] = useState(false);
  const [selectedStaffForStatus, setSelectedStaffForStatus] = useState<Staff | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedStaffDetailId, setSelectedStaffDetailId] = useState<string | null>(null); // Changed to ID to avoid stale state
  const [staffToEdit, setStaffToEdit] = useState<Staff | null>(null);
  const [newStatusLabel, setNewStatusLabel] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Staff> & {
    enableAccess: boolean;
    authUsername: string;
    authPassword: string;
    authRole: 'SuperAdmin' | 'Admin' | 'User' | 'Viewer';
    authPermissions: Record<string, 'view' | 'edit'>;
  }>({
    name: '',
    role: '',
    status: 'Disponible',
    location: '',
    avatar: 'https://ui-avatars.com/api/?name=User&background=random',
    email: '',
    phone: '',
    dni: '',
    admissionDate: '',
    certifications: '',
    // Auth fields
    enableAccess: false,
    authUsername: '',
    authPassword: '',
    authRole: 'User',
    authPermissions: {},
  });


  const handleOpenCreate = () => {
    setStaffToEdit(null);
    setFormData({
      name: '',
      role: '',
      status: 'Disponible',
      location: '',
      avatar: 'https://ui-avatars.com/api/?name=New+User&background=random',
      email: '',
      phone: '',
      dni: '',
      admissionDate: '',
      certifications: '',
      enableAccess: false,
      authUsername: '',
      authPassword: '',
      authRole: 'User',
      authPermissions: {},
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (staff: Staff) => {
    setStaffToEdit(staff);
    setFormData({
      name: staff.name,
      role: staff.role,
      status: staff.status,
      location: staff.location,
      avatar: staff.avatar,
      email: staff.email || '',
      phone: staff.phone || '',
      dni: staff.dni || '',
      admissionDate: staff.admissionDate || '',
      certifications: staff.certifications || '',
      // Auth mapping
      enableAccess: !!staff.auth,
      authUsername: staff.auth?.username || '',
      authPassword: staff.auth?.password || '',
      authRole: staff.auth?.role || 'User',
      authPermissions: staff.auth?.permissions || {},
    });
    setIsFormOpen(true);
  };

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveStaff = async () => {
    // Validate Basic Info
    if (!formData.name.trim()) return alert("El nombre es obligatorio");
    // Validate Auth Info if Access is Enabled
    if (formData.enableAccess) {
      if (!formData.authUsername.trim()) return alert("El usuario es obligatorio para el acceso");
      if (!formData.authPassword.trim()) return alert("La contraseña es obligatoria para el acceso");
    }

    console.log("Saving Staff - Form Data Dump:", JSON.stringify(formData, null, 2)); // DEBUG
    try {
      const newAuthData = formData.enableAccess ? {
        username: formData.authUsername,
        password: formData.authPassword,
        role: formData.authRole,
        permissions: formData.authPermissions,
        canManageUsers: formData.authRole === 'SuperAdmin',
      } : null;

      const newStaffData: any = {
        name: formData.name || '',
        role: formData.role || '',
        status: formData.status || 'Disponible',
        location: formData.location || '-',
        avatar: formData.avatar || '',
        email: formData.email,
        phone: formData.phone,
        dni: formData.dni,
        admissionDate: formData.admissionDate,
        certifications: formData.certifications,
        assignedAssets: staffToEdit?.assignedAssets || [],
        auth: newAuthData
      };

      if (staffToEdit) {
        await updateStaff(staffToEdit.id, newStaffData);
        alert("Perfil actualizado.");
      } else {
        await createStaff(newStaffData);
        alert("Nuevo colaborador registrado.");
      }

      setIsFormOpen(false);

    } catch (err: any) {
      console.error("Error saving staff:", err);
      alert("Error al guardar: " + err.message);
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!window.confirm("¿Estás seguro de eliminar este colaborador?")) return;
    try {
      await deleteStaff(staffId);
    } catch (error: any) {
      alert("Error al eliminar: " + error.message);
    }
  };

  // Toggle Module Selection
  const setModulePermission = (path: string, level: 'none' | 'view' | 'edit') => {
    setFormData(prev => {
      const current = { ...prev.authPermissions };
      if (level === 'none') {
        delete current[path];
      } else {
        current[path] = level;
      }
      console.log("Updated Permissions for " + path + ":", current); // DEBUG
      return { ...prev, authPermissions: current };
    });
  };

  // Auto-set permissions based on role
  const handleRoleChange = (newRole: 'SuperAdmin' | 'Admin' | 'User' | 'Viewer') => {
    let newPermissions = { ...formData.authPermissions };

    if (newRole === 'SuperAdmin') {
      // SuperAdmin gets all edit
      DEFAULT_MODULES.forEach(m => {
        newPermissions[m.path] = 'edit';
      });
    } else if (newRole === 'Viewer') {
      // Viewer gets all view
      DEFAULT_MODULES.forEach(m => {
        newPermissions[m.path] = 'view';
      });
    }
    // Admin/User preserve existing or stay manual

    setFormData({ ...formData, authRole: newRole, authPermissions: newPermissions });
  };

  const updateStaffStatus = async (staffId: string, newStatus: string) => {
    try {
      await updateStaff(staffId, { status: newStatus });
      setSelectedStaffForStatus(null);
    } catch (error: any) {
      alert("Error al actualizar estado: " + error.message);
    }
  };

  const addCustomStatus = () => {
    if (!newStatusLabel.trim()) return;
    if (statuses.find(s => s.label.toLowerCase() === newStatusLabel.toLowerCase())) return;
    const colors = ['bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-yellow-500'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    setStatuses([...statuses, { label: newStatusLabel, color: randomColor }]);
    setNewStatusLabel('');
  };

  // Estados predefinidos
  const [statuses, setStatuses] = useState<StatusConfig[]>([
    { label: 'Disponible', color: 'bg-green-500' },
    { label: 'En Obra', color: 'bg-orange-500' },
    { label: 'Licencia', color: 'bg-blue-500' },
    { label: 'Ausente', color: 'bg-red-500' },
  ]);

  const getStatusColor = (statusLabel: string) => {
    return statuses.find(s => s.label === statusLabel)?.color || 'bg-slate-400';
  };

  const filteredStaff = staffList.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // FORM VIEW
  if (isFormOpen) {
    const isSuperAdmin = currentUser?.auth?.role === 'SuperAdmin';

    return (
      <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans animate-in slide-in-from-right-10 duration-300">
        <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex items-center justify-between">
          <button onClick={() => setIsFormOpen(false)} className="text-slate-600 p-2" aria-label="Volver"><ArrowLeft size={24} /></button>
          <h1 className="font-bold text-lg text-slate-800">{staffToEdit ? 'Editar Colaborador' : 'Nuevo Colaborador'}</h1>
          {canEdit && <button onClick={handleSaveStaff} className="text-orange-500 font-bold text-sm px-2">Guardar</button>}
        </div>

        <div className="p-6 space-y-8 max-w-2xl mx-auto">
          {/* Avatar Picker */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
              <img
                src={formData.avatar}
                alt="Avatar"
                className="w-24 h-24 rounded-[2rem] object-cover border-4 border-white shadow-xl transition-transform active:scale-95 group-hover:brightness-90"
              />
              <button className="absolute bottom-0 right-0 w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center text-white border-2 border-white shadow-lg active:scale-90 transition-transform" aria-label="Cambiar avatar">
                <Camera size={16} />
              </button>
              <input
                type="file"
                ref={avatarInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
                aria-label="Subir avatar del usuario"
              />
            </div>
          </div>

          <div className="space-y-6">
            {/* Personal Info */}
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <UserCircle2 size={18} className="text-orange-500" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Información Personal</h3>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nombre Completo</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej. Juan Pérez"
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 text-sm font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">DNI / ID</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.dni}
                      onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                      placeholder="12.345.678"
                      className="w-full p-4 pl-10 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 text-sm font-medium"
                    />
                    <CreditCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Fecha Ingreso</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={formData.admissionDate}
                      onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 text-xs font-medium"
                      aria-label="Fecha de Ingreso"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Ubicación / Obra</label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 z-10" />
                    <select
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full p-4 pl-10 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 text-sm font-bold text-slate-700"
                      disabled={projectsLoading}
                      aria-label="Ubicación / Obra"
                    >
                      <option value="">Seleccione Ubicación...</option>
                      <option value="Taller Central">Taller Central</option>
                      <option value="Oficina Principal">Oficina Principal</option>
                      <option value="Sin Asignar">Sin Asignar</option>
                      {activeProjects.map(project => (
                        <option key={project.id} value={project.name}>{project.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase size={18} className="text-orange-500" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Profesional</h3>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 text-sm font-medium"
                  aria-label="Dirección de correo electrónico"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Teléfono</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 text-sm font-medium"
                  aria-label="Número de teléfono"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Cargo</label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 text-sm font-medium"
                    aria-label="Cargo del empleado"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Estado</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 text-sm font-bold text-slate-700"
                    aria-label="Estado del empleado"
                  >
                    {statuses.map(s => <option key={s.label} value={s.label}>{s.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* AUTH SECTION - Only visible to SuperAdmin */}
            {isSuperAdmin && (
              <div className="bg-slate-800 p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 space-y-5 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={18} className="text-orange-400" />
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Credenciales y Accesos</h3>
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-2xl border border-slate-600">
                  <div className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${formData.enableAccess ? 'bg-orange-500' : 'bg-slate-600'}`} onClick={() => setFormData({ ...formData, enableAccess: !formData.enableAccess })}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${formData.enableAccess ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </div>
                  <span className="text-sm font-bold">Habilitar acceso al sistema</span>
                </div>

                {formData.enableAccess && (
                  <div className="space-y-5 animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Usuario</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={formData.authUsername}
                            onChange={(e) => setFormData({ ...formData, authUsername: e.target.value })}
                            className="w-full p-4 pl-10 bg-slate-700 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 text-sm font-medium text-white placeholder-slate-500"
                            placeholder="username"
                          />
                          <UserCircle2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Contraseña</label>
                        <div className="relative">
                          <input
                            type="text" // Visible just for prototype as per context
                            value={formData.authPassword}
                            onChange={(e) => setFormData({ ...formData, authPassword: e.target.value })}
                            className="w-full p-4 pl-10 bg-slate-700 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 text-sm font-medium text-white placeholder-slate-500"
                            placeholder="••••••"
                          />
                          <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Rol de Acceso</label>
                      <select
                        value={formData.authRole}
                        onChange={(e) => handleRoleChange(e.target.value as any)}
                        className="w-full p-4 bg-slate-700 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 text-sm font-bold text-white"
                        aria-label="Rol de acceso al sistema"
                      >
                        <option value="SuperAdmin">SuperAdmin (Acceso Total)</option>
                        <option value="Admin">Admin (Gestión)</option>
                        <option value="User">Operario (Restringido)</option>
                        <option value="Viewer">Visualizador (Solo Lectura)</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Permisos por Módulo</label>
                      <div className="space-y-2">
                        {DEFAULT_MODULES.map(module => {
                          const currentLevel = formData.authPermissions?.[module.path] || 'none';
                          return (
                            <div key={module.path} className="flex items-center justify-between p-3 rounded-xl bg-slate-700/30 border border-slate-700">
                              <span className="text-sm font-medium text-slate-200">{module.label}</span>
                              <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-600">
                                <button
                                  type="button"
                                  disabled={formData.authRole === 'SuperAdmin' || formData.authRole === 'Viewer'}
                                  onClick={() => setModulePermission(module.path, 'none')}
                                  className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${currentLevel === 'none' && formData.authRole !== 'SuperAdmin' && formData.authRole !== 'Viewer' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-white disabled:opacity-30'}`}
                                >
                                  Sin Acceso
                                </button>
                                <button
                                  type="button"
                                  disabled={formData.authRole === 'SuperAdmin' || formData.authRole === 'Viewer'}
                                  onClick={() => setModulePermission(module.path, 'view')}
                                  className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${currentLevel === 'view' && formData.authRole !== 'SuperAdmin' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-400 hover:text-white disabled:opacity-30'}`}
                                >
                                  Solo Ver
                                </button>
                                <button
                                  type="button"
                                  disabled={formData.authRole === 'SuperAdmin' || formData.authRole === 'Viewer'}
                                  onClick={() => setModulePermission(module.path, 'edit')}
                                  className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${currentLevel === 'edit' || formData.authRole === 'SuperAdmin' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-white'} disabled:cursor-not-allowed`}
                                >
                                  Ver y Editar
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-slate-400 flex gap-1 mt-2 "><AlertTriangle size={10} /> Los SuperAdmins tienen acceso total automáticamente.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Certifications (Moved here or duplicated) */}
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={18} className="text-orange-500" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Habilitaciones</h3>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Licencias y Certificaciones</label>
                <textarea
                  value={formData.certifications}
                  onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                  placeholder="Ej. Licencia de Conducir B1, Habilitación Grúa, Seguridad e Higiene..."
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 text-sm font-medium min-h-[100px] resize-none"
                />
              </div>
            </div>

          </div>

          {canEdit && (
            <button
              onClick={handleSaveStaff}
              className="w-full bg-slate-800 text-white py-4 rounded-3xl font-bold shadow-xl shadow-slate-200 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Save size={20} /> {staffToEdit ? 'Actualizar Datos' : 'Registrar Colaborador'}
            </button>
          )}
        </div >
      </div >
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 bg-[#F8F9FA] min-h-screen font-sans">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800">Personal SOWIC</h1>
          <div className="flex gap-2">
            {canEdit && (
              <>
                <button
                  onClick={() => setIsConfiguringStatuses(true)}
                  className="p-2.5 bg-white rounded-xl shadow-sm text-slate-400 hover:text-orange-500 border border-slate-100 transition-colors"
                  aria-label="Configurar Estados"
                >
                  <Settings2 size={22} />
                </button>
                <button
                  onClick={handleOpenCreate}
                  className="p-2.5 bg-orange-500 rounded-xl shadow-lg shadow-orange-200 text-white active:scale-95 transition-transform"
                  aria-label="Registrar Nuevo Colaborador"
                >
                  <UserPlus size={22} />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
            <span className="block text-2xl font-bold text-slate-800">{staffList.length}</span>
            <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Total</span>
          </div>
          <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 text-center">
            <span className="block text-2xl font-bold text-orange-600">
              {staffList.filter(s => s.status === 'En Obra').length}
            </span>
            <span className="text-[10px] uppercase text-orange-400 font-bold tracking-wider">En Obra</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
            <span className="block text-2xl font-bold text-slate-800">
              {statuses.length}
            </span>
            <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Estados</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" size={20} />
        <input
          type="text"
          placeholder="Buscar empleado o cargo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border-none rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 shadow-sm text-sm font-medium"
        />
      </div>

      {/* Staff List */}
      <div className="space-y-4">
        {filteredStaff.map(staff => (
          <div key={staff.id} className="bg-white p-5 rounded-3xl border border-slate-50 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
            {staff.auth && (
              <div className="absolute top-0 right-0 p-2 opacity-50">
                <Shield size={16} className="text-orange-500" />
              </div>
            )}
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => setSelectedStaffDetailId(staff.id)}>
              <div className="relative shrink-0">
                <img src={staff.avatar} alt={staff.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-sm" />
                <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(staff.status)}`}></span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-slate-800 truncate leading-tight">{staff.name}</h3>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-0.5">{staff.role}</p>

                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <MapPin size={12} className="text-orange-400" />
                  {staff.location === '-' ? 'Sin Ubicación' : staff.location}
                </div>
              </div>
            </div>

            {canEdit && (
              <div className="flex gap-3 mt-4 pt-4 border-t border-slate-50">
                <button
                  onClick={(e) => { e.stopPropagation(); handleOpenEdit(staff); }}
                  className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                  title="Editar Perfil"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteStaff(staff.id); }}
                  className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Eliminar Colaborador"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Change Status Modal */}
      {selectedStaffForStatus && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end justify-center animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] p-8 animate-in slide-in-from-bottom-20 duration-300">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Cambiar Estado</h2>
                <p className="text-sm text-slate-400">Actualizar disponibilidad de {selectedStaffForStatus.name}</p>
              </div>
              <button
                onClick={() => setSelectedStaffForStatus(null)}
                className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400"
                aria-label="Cerrar modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-8">
              {statuses.map(status => (
                <button
                  key={status.label}
                  onClick={() => updateStaffStatus(selectedStaffForStatus.id, status.label)}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col gap-3 items-start ${selectedStaffForStatus.status === status.label
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-slate-50 bg-white hover:border-slate-200'
                    }`}
                  aria-label={`Establecer estado como ${status.label}`}
                >
                  <div className={`w-8 h-8 rounded-full ${status.color} border-2 border-white shadow-sm flex items-center justify-center text-white`}>
                    {selectedStaffForStatus.status === status.label && <Check size={14} />}
                  </div>
                  <span className={`text-sm font-bold ${selectedStaffForStatus.status === status.label ? 'text-orange-600' : 'text-slate-600'}`}>
                    {status.label}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => { setSelectedStaffForStatus(null); setIsConfiguringStatuses(true); }}
              className="w-full py-4 rounded-2xl border border-dashed border-slate-200 text-slate-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
              aria-label="Definir nuevo estado"
            >
              <Plus size={18} />
              Definir nuevo estado
            </button>
          </div>
        </div>
      )}

      {/* Configure Statuses Modal */}
      {isConfiguringStatuses && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Gestionar Estados</h2>
              <button
                onClick={() => setIsConfiguringStatuses(false)}
                className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400"
                aria-label="Cerrar configuración"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 mb-8 max-h-60 overflow-y-auto no-scrollbar">
              {statuses.map(status => (
                <div key={status.label} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${status.color}`}></div>
                    <span className="text-sm font-bold text-slate-700">{status.label}</span>
                  </div>
                  <button
                    className="text-slate-300 hover:text-red-500"
                    onClick={() => {
                      if (['Disponible', 'En Obra', 'Licencia', 'Ausente'].includes(status.label)) return;
                      setStatuses(statuses.filter(s => s.label !== status.label));
                    }}
                    aria-label={`Eliminar estado ${status.label}`}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Palette className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  type="text"
                  placeholder="Nombre del nuevo estado..."
                  value={newStatusLabel}
                  onChange={(e) => setNewStatusLabel(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-medium"
                />
              </div>
              <button
                onClick={addCustomStatus}
                disabled={!newStatusLabel.trim()}
                className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-orange-200 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none"
              >
                Agregar Estado Personalizado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail View Modal */}
      {selectedStaffDetailId && (() => {
        const selectedStaffDetail = staffList.find(s => s.id === selectedStaffDetailId);
        if (!selectedStaffDetail) return null;

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar animate-in zoom-in-95 duration-200">

              {/* Header Image & Close */}
              <div className="relative h-48 bg-gradient-to-r from-slate-800 to-slate-900 p-6 flex items-start justify-end rounded-t-[2.5rem] overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                <button
                  onClick={() => setSelectedStaffDetailId(null)}
                  className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
                  aria-label="Cerrar detalle"
                >
                  <X size={20} />
                </button>
                <div className="absolute -bottom-16 left-8 p-1 bg-white rounded-[2.5rem]">
                  <img src={selectedStaffDetail.avatar} className="w-32 h-32 rounded-[2.2rem] object-cover" alt={`Avatar de ${selectedStaffDetail.name}`} />
                </div>
              </div>

              <div className="pt-20 px-8 pb-8 space-y-8">

                <div>
                  <h2 className="text-2xl font-bold text-slate-800">{selectedStaffDetail.name}</h2>
                  <p className="text-slate-500 font-medium">{selectedStaffDetail.role}</p>
                  <div className="flex gap-2 mt-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${selectedStaffDetail.status === 'Disponible' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                      {selectedStaffDetail.status}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                      <MapPin size={10} /> {selectedStaffDetail.location || '-'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <UserCircle2 size={14} /> Información Personal
                    </h3>
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase">DNI</label>
                        <p className="font-bold text-slate-700">{selectedStaffDetail.dni || '-'}</p>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Fecha de Ingreso</label>
                        <p className="font-bold text-slate-700">{selectedStaffDetail.admissionDate || '-'}</p>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Contacto</label>
                        <p className="text-sm text-slate-600 flex items-center gap-2 mt-1"><Mail size={12} /> {selectedStaffDetail.email || '-'}</p>
                        <p className="text-sm text-slate-600 flex items-center gap-2 mt-1"><Phone size={12} /> {selectedStaffDetail.phone || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Shield size={14} /> Acceso y Permisos
                    </h3>
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                      {selectedStaffDetail.auth ? (
                        <>
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="text-[10px] text-slate-400 font-bold uppercase">Usuario</label>
                              <p className="font-bold text-slate-700">{selectedStaffDetail.auth.username}</p>
                            </div>
                            <div className="text-right">
                              <label className="text-[10px] text-slate-400 font-bold uppercase">Rol</label>
                              <p className="font-bold text-orange-600">{selectedStaffDetail.auth.role}</p>
                            </div>
                          </div>
                          <div className="pt-3 border-t border-slate-200">
                            <label className="text-[10px] text-slate-400 font-bold uppercase block mb-2">Permisos Configurados</label>
                            <div className="space-y-1">
                              {DEFAULT_MODULES.map((module) => {
                                const level = selectedStaffDetail.auth?.permissions?.[module.path];
                                return (
                                  <div key={module.path} className="flex justify-between text-xs">
                                    <span className="text-slate-600 font-medium">{module.label}</span>
                                    {level ? (
                                      <span className={`px-2 py-0.5 rounded-md font-bold ${level === 'edit' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {level === 'edit' ? 'Editar' : 'Ver'}
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-md font-bold bg-slate-100 text-slate-400">
                                        Sin Acceso
                                      </span>
                                    )}
                                  </div>
                                );
                              })}

                              {selectedStaffDetail.auth.role === 'SuperAdmin' && (
                                <p className="text-xs text-orange-600 font-bold mt-2 flex items-center gap-1"><Check size={12} /> Acceso Total (SuperAdmin)</p>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center py-4 text-slate-400 text-sm italic">
                          Sin acceso al sistema
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {selectedStaffDetail.certifications && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <FileText size={14} /> Habilitaciones
                    </h3>
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-sm text-slate-600 whitespace-pre-wrap">
                      {selectedStaffDetail.certifications}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};

export default Personnel;
