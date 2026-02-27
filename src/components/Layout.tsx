
import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Car, Folder, Plus, X, Users, Package,
  Handshake, Truck, LifeBuoy, Wrench, Calendar,
  FileText, BarChart3, Building2, LogOut, ChevronDown, Monitor, Hammer, ChevronsRight, UtilityPole, Grid,
  Tractor, Fan, Briefcase, Armchair, CheckCircle2,
  HelpCircle, Menu, BrainCircuit, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isAssetsMenuOpen, setIsAssetsMenuOpen] = React.useState(false);
  const [isMaintenanceMenuOpen, setIsMaintenanceMenuOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, checkPermission, user } = useAuth();

  React.useEffect(() => {
    const handleToggle = () => setIsMenuOpen(prev => !prev);
    window.addEventListener('sowic:toggle-sidebar', handleToggle);
    return () => window.removeEventListener('sowic:toggle-sidebar', handleToggle);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const desktopNavItems = [
    { to: '/', icon: Home, label: 'Inicio' },
    { to: '/services', icon: LifeBuoy, label: 'Servicios' },
    { to: '/personnel', icon: Users, label: 'Personal' },
    { to: '/projects', icon: Folder, label: 'Obras' },
  ].filter(item => checkPermission(item.to));

  const assetsSubmenu = [
    { to: '/assets/vehicles', icon: Car, label: 'Rodados' },
    { to: '/assets/machinery', icon: Tractor, label: 'Maquinaria' },
    { to: '/assets/it', icon: Monitor, label: 'Informática' },
    { to: '/assets/installations', icon: Fan, label: 'Instalaciones' },
    { to: '/assets/furniture', icon: Armchair, label: 'Mobiliario' },
    { to: '/assets/infrastructure', icon: Building2, label: 'Infraestructura' },
  ];

  const desktopMenuItems = [
    { to: '/reports', icon: BarChart3, label: 'Reportes' },
    { to: '/logistics', icon: Truck, label: 'Logística' },
    { to: '/inventory', icon: Package, label: 'Inventario' },
    { to: '/providers', icon: Handshake, label: 'Proveedores' },
    { to: '/calendar', icon: Calendar, label: 'Calendario' },
    { to: '/help', icon: HelpCircle, label: 'Ayuda' },
  ].filter(item => checkPermission(item.to));

  // El menú global móvil con colores de marca (Naranja y Gris)
  const globalOverlayItems = [
    { to: '/assets', icon: Grid, label: 'Mis Activos', color: 'text-orange-600', bgColor: 'bg-orange-100' },
    { to: '/maintenance', icon: Wrench, label: 'Taller', color: 'text-orange-600', bgColor: 'bg-orange-100' },
    { to: '/assets/infrastructure', icon: Building2, label: 'Infraestructura', color: 'text-slate-600', bgColor: 'bg-slate-100' },
    { to: '/maintenance/plans', icon: FileText, label: 'Planes Mant.', color: 'text-slate-600', bgColor: 'bg-slate-100' },
    { to: '/projects', icon: Folder, label: 'Obras', color: 'text-orange-600', bgColor: 'bg-orange-100' },
    { to: '/logistics', icon: Truck, label: 'Logística', color: 'text-orange-600', bgColor: 'bg-orange-100' },
    { to: '/inventory', icon: Package, label: 'Inventario', color: 'text-slate-600', bgColor: 'bg-slate-100' },
    { to: '/personnel', icon: Users, label: 'Personal', color: 'text-slate-600', bgColor: 'bg-slate-100' },
    { to: '/services', icon: LifeBuoy, label: 'Servicios', color: 'text-orange-600', bgColor: 'bg-orange-100' },
    { to: '/providers', icon: Handshake, label: 'Proveedores', color: 'text-slate-600', bgColor: 'bg-slate-100' },
    { to: '/reports', icon: BarChart3, label: 'Reportes', color: 'text-slate-800', bgColor: 'bg-slate-200' },
    { to: '/help', icon: HelpCircle, label: 'Ayuda', color: 'text-slate-800', bgColor: 'bg-slate-200' },
  ].filter(item => checkPermission(item.to));

  const mobileNavItems = [
    { to: '/', icon: Home, label: 'Inicio' },
    { to: '/services', icon: LifeBuoy, label: 'Servicios' },
    { to: '/assets', icon: Grid, label: 'Mis Activos' },
    { to: '/maintenance', icon: Wrench, label: 'Mantenimiento' },
  ].filter(item => checkPermission(item.to));

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col md:flex-row max-w-7xl mx-auto shadow-2xl overflow-hidden relative font-sans text-slate-600">
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-100 p-6 h-screen sticky top-0 z-20">
        <div className="flex items-center gap-3 mb-10">
          <img src="/logo.jpg" alt="SOWIC Logo" className="w-10 h-10 rounded-xl object-cover shadow-lg" />
          <div><h1 className="text-lg font-bold text-slate-800 leading-tight">SOWIC</h1><p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Gestión de Activos</p></div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
          {desktopNavItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 font-medium ${isActive ? 'bg-orange-50 text-orange-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
              <item.icon size={20} /><span className="text-sm">{item.label}</span>
            </NavLink>
          ))}

          {/* Mis Activos Submenu */}
          {checkPermission('/assets') && (
            <div className="space-y-1">
              <button
                onClick={() => setIsAssetsMenuOpen(!isAssetsMenuOpen)}
                className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200 font-medium ${location.pathname.startsWith('/assets') ? 'bg-orange-50 text-orange-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-3">
                  <Briefcase size={20} />
                  <span className="text-sm">Mis Activos</span>
                </div>
                <ChevronDown size={16} className={`transition-transform duration-200 ${isAssetsMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isAssetsMenuOpen && (
                <div className="pl-4 space-y-1 animate-in slide-in-from-top-2 duration-200">
                  {assetsSubmenu.map((subItem) => (
                    <NavLink
                      key={subItem.to}
                      to={subItem.to}
                      className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-xs font-medium ${isActive ? 'text-orange-600 bg-orange-50/50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                    >
                      <subItem.icon size={16} />
                      <span>{subItem.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Mantenimiento Submenu */}
          {(checkPermission('/maintenance') || checkPermission('/maintenance/plans') || checkPermission('/checklist')) && (
            <div className="space-y-1">
              <button
                onClick={() => setIsMaintenanceMenuOpen(!isMaintenanceMenuOpen)}
                className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200 font-medium ${location.pathname.startsWith('/maintenance') || location.pathname.startsWith('/checklist') ? 'bg-orange-50 text-orange-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-3">
                  <Wrench size={20} />
                  <span className="text-sm">Mantenimiento</span>
                </div>
                <ChevronDown size={16} className={`transition-transform duration-200 ${isMaintenanceMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isMaintenanceMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="pl-4 space-y-1 pt-1">
                  {checkPermission('/maintenance') && (
                    <NavLink to="/maintenance/orders" end className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${isActive ? 'bg-orange-50 text-orange-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
                      <FileText size={18} />
                      <span>Órdenes de Trabajo</span>
                    </NavLink>
                  )}
                  {checkPermission('/maintenance/plans') && (
                    <NavLink to="/maintenance/plans" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${isActive ? 'bg-orange-50 text-orange-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
                      <Calendar size={18} />
                      <span>Planes Mant.</span>
                    </NavLink>
                  )}
                  {checkPermission('/maintenance') && (
                    <NavLink
                      to="/maintenance/orders"
                      state={{ activeTab: 'predictive' }}
                      className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${isActive && location.state?.activeTab === 'predictive' ? 'bg-orange-50 text-orange-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                    >
                      <BrainCircuit size={18} />
                      <span>Predictivo IA</span>
                    </NavLink>
                  )}
                  {checkPermission('/maintenance') && (
                    <NavLink
                      to="/maintenance/orders"
                      state={{ activeTab: 'preventive' }}
                      className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${isActive && location.state?.activeTab === 'preventive' ? 'bg-orange-50 text-orange-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                    >
                      <ShieldCheck size={18} />
                      <span>Mantenimiento Preventivo</span>
                    </NavLink>
                  )}
                </div>
              </div>
            </div>
          )}
          {desktopMenuItems.length > 0 && (
            <>
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-8 mb-3">Gestión</p>
              {desktopMenuItems.map((item) => (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 font-medium ${isActive ? 'bg-orange-50 text-orange-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
                  <item.icon size={20} /><span className="text-sm">{item.label}</span>
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* User & Logout Section */}
        <div className="pt-4 border-t border-slate-100 mt-auto">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
              <img src={user?.avatar} alt="User" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-400 truncate uppercase mt-0.5">{user?.auth?.role || user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 h-screen overflow-y-auto overflow-x-hidden pb-24 md:pb-0 relative bg-[#F8F9FA] print:h-auto print:overflow-visible print:bg-white print:pb-0">
        {children}
      </main>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-50 flex items-center justify-around px-2 py-2 shadow-xl">
        {mobileNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${isActive ? 'text-orange-500 bg-orange-50' : 'text-slate-400'
              }`
            }
          >
            <item.icon size={20} />
            <span className="text-[9px] font-bold uppercase tracking-wide">{item.label}</span>
          </NavLink>
        ))}
      </div>

      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[100] flex animate-in fade-in duration-300">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Menu Drawer */}
          <div className="relative w-4/5 max-w-[300px] bg-white h-full shadow-2xl overflow-y-auto animate-in slide-in-from-left duration-300 flex flex-col p-6">
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-3">
                <div className="bg-white p-1 rounded-xl shadow-md border border-slate-50">
                  <img src="/logo.jpg" alt="SOWIC Logo" className="w-12 h-12 rounded-lg object-cover" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-800 leading-tight">SOWIC</h1>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gestión de Activos</p>
                </div>
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            <nav className="flex-1 space-y-1">
              {/* Primary Nav Items */}
              {[
                { to: '/', icon: Home, label: 'Inicio' },
                { to: '/services', icon: LifeBuoy, label: 'Servicios' },
                { to: '/personnel', icon: Users, label: 'Personal' },
                { to: '/projects', icon: Folder, label: 'Obras' },
              ].filter(item => checkPermission(item.to)).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMenuOpen(false)}
                  className={({ isActive }) => `flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-200 font-bold ${isActive ? 'bg-orange-50 text-orange-600' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <item.icon size={22} /><span className="text-base">{item.label}</span>
                </NavLink>
              ))}

              {/* Mis Activos Collapsible */}
              {checkPermission('/assets') && (
                <div className="space-y-1">
                  <button
                    onClick={() => setIsAssetsMenuOpen(!isAssetsMenuOpen)}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200 font-bold ${location.pathname.startsWith('/assets') ? 'bg-orange-50 text-orange-600' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center gap-4">
                      <Briefcase size={22} />
                      <span className="text-base">Mis Activos</span>
                    </div>
                    <ChevronDown size={18} className={`transition-transform duration-200 ${isAssetsMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${isAssetsMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="pl-6 space-y-1 py-1">
                      {assetsSubmenu.map((sub) => (
                        <NavLink
                          key={sub.to}
                          to={sub.to}
                          onClick={() => setIsMenuOpen(false)}
                          className={({ isActive }) => `flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${isActive ? 'bg-orange-50 text-orange-600' : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                          <sub.icon size={18} />
                          <span>{sub.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Mantenimiento Collapsible */}
              {checkPermission('/maintenance') && (
                <div className="space-y-1">
                  <button
                    onClick={() => setIsMaintenanceMenuOpen(!isMaintenanceMenuOpen)}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200 font-bold ${location.pathname.startsWith('/maintenance') || location.pathname.startsWith('/checklist') ? 'bg-orange-50 text-orange-600' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center gap-4">
                      <Wrench size={22} />
                      <span className="text-base">Mantenimiento</span>
                    </div>
                    <ChevronDown size={18} className={`transition-transform duration-200 ${isMaintenanceMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${isMaintenanceMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="pl-6 space-y-1 py-1">
                      <NavLink
                        to="/maintenance/orders"
                        end
                        onClick={() => setIsMenuOpen(false)}
                        className={({ isActive }) => `flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${isActive ? 'bg-orange-50 text-orange-600' : 'text-slate-400 hover:bg-slate-50'}`}
                      >
                        <FileText size={18} />
                        <span>Órdenes de Trabajo</span>
                      </NavLink>
                      <NavLink
                        to="/maintenance/plans"
                        onClick={() => setIsMenuOpen(false)}
                        className={({ isActive }) => `flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${isActive ? 'bg-orange-50 text-orange-600' : 'text-slate-400 hover:bg-slate-50'}`}
                      >
                        <Calendar size={18} />
                        <span>Planes Mant.</span>
                      </NavLink>
                      <NavLink
                        to="/maintenance/orders"
                        state={{ activeTab: 'predictive' }}
                        onClick={() => setIsMenuOpen(false)}
                        className={({ isActive }) => `flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${isActive && location.state?.activeTab === 'predictive' ? 'bg-orange-50 text-orange-600' : 'text-slate-400 hover:bg-slate-50'}`}
                      >
                        <BrainCircuit size={18} />
                        <span>Predictivo IA</span>
                      </NavLink>
                      <NavLink
                        to="/maintenance/orders"
                        state={{ activeTab: 'preventive' }}
                        onClick={() => setIsMenuOpen(false)}
                        className={({ isActive }) => `flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${isActive && location.state?.activeTab === 'preventive' ? 'bg-orange-50 text-orange-600' : 'text-slate-400 hover:bg-slate-50'}`}
                      >
                        <ShieldCheck size={18} />
                        <span>Mantenimiento Preventivo</span>
                      </NavLink>
                    </div>
                  </div>
                </div>
              )}

              {/* Gestión Section */}
              {desktopMenuItems.length > 0 && (
                <>
                  <div className="pt-6 pb-2">
                    <p className="px-3 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Gestión</p>
                  </div>
                  {desktopMenuItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setIsMenuOpen(false)}
                      className={({ isActive }) => `flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-200 font-bold ${isActive ? 'bg-slate-50 text-slate-800 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      <item.icon size={22} /><span className="text-base">{item.label}</span>
                    </NavLink>
                  ))}
                </>
              )}
            </nav>

            <div className="mt-auto pt-8 border-t border-slate-100">
              <div className="flex items-center gap-4 mb-6 px-1">
                <div className="w-12 h-12 rounded-full bg-orange-100 border-2 border-orange-500 flex items-center justify-center text-orange-600 overflow-hidden shadow-inner">
                  {user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="" /> : <Users size={24} />}
                </div>
                <div>
                  <p className="text-base font-black text-slate-800 leading-none">{user?.name || 'Usuario'}</p>
                  <p className="text-[10px] text-orange-600 font-bold uppercase tracking-wider mt-1">{user?.role || 'Personal'}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-4 w-full px-4 py-4 rounded-2xl bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all font-bold"
              >
                <LogOut size={22} />
                <span className="text-base">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
