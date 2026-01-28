
import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Car, Folder, Plus, X, Users, Package,
  Handshake, Truck, LifeBuoy, Wrench, Calendar,
  FileText, BarChart3, Building2, LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, checkPermission, user } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const desktopNavItems = [
    { to: '/', icon: Home, label: 'Inicio' },
    { to: '/assets', icon: Car, label: 'Activos' },
    { to: '/infrastructure', icon: Building2, label: 'Infraestructura' },
    { to: '/projects', icon: Folder, label: 'Obras' },
    { to: '/maintenance', icon: Wrench, label: 'Taller' },
  ].filter(item => checkPermission(item.to));

  const desktopMenuItems = [
    { to: '/maintenance/plans', icon: FileText, label: 'Planes Mant.' },
    { to: '/reports', icon: BarChart3, label: 'Reportes' },
    { to: '/logistics', icon: Truck, label: 'Logística' },
    { to: '/services', icon: LifeBuoy, label: 'Servicios' },
    { to: '/personnel', icon: Users, label: 'Personal' },
    { to: '/inventory', icon: Package, label: 'Inventario' },
    { to: '/providers', icon: Handshake, label: 'Proveedores' },
    { to: '/calendar', icon: Calendar, label: 'Calendario' },
  ].filter(item => checkPermission(item.to));

  // El menú global móvil con colores de marca (Naranja y Gris)
  const globalOverlayItems = [
    { to: '/maintenance', icon: Wrench, label: 'Taller', color: 'text-orange-600', bgColor: 'bg-orange-100' },
    { to: '/infrastructure', icon: Building2, label: 'Infraestructura', color: 'text-slate-600', bgColor: 'bg-slate-100' },
    { to: '/maintenance/plans', icon: FileText, label: 'Planes Mant.', color: 'text-slate-600', bgColor: 'bg-slate-100' },
    { to: '/projects', icon: Folder, label: 'Obras', color: 'text-orange-600', bgColor: 'bg-orange-100' },
    { to: '/logistics', icon: Truck, label: 'Logística', color: 'text-orange-600', bgColor: 'bg-orange-100' },
    { to: '/inventory', icon: Package, label: 'Inventario', color: 'text-slate-600', bgColor: 'bg-slate-100' },
    { to: '/personnel', icon: Users, label: 'Personal', color: 'text-slate-600', bgColor: 'bg-slate-100' },
    { to: '/services', icon: LifeBuoy, label: 'Servicios', color: 'text-orange-600', bgColor: 'bg-orange-100' },
    { to: '/providers', icon: Handshake, label: 'Proveedores', color: 'text-slate-600', bgColor: 'bg-slate-100' },
    { to: '/reports', icon: BarChart3, label: 'Reportes', color: 'text-slate-800', bgColor: 'bg-slate-200' },
  ].filter(item => checkPermission(item.to));

  const mobileNavItems = [
    { to: '/', icon: Home, label: 'Inicio' },
    { to: '/assets', icon: Car, label: 'Activos' },
    { to: 'create-action', icon: Plus, label: '', isAction: true },
    { to: '/reports', icon: BarChart3, label: 'Reportes' },
    { to: '/calendar', icon: Calendar, label: 'Calendario' },
  ].filter(item => item.isAction || checkPermission(item.to));

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col md:flex-row max-w-7xl mx-auto shadow-2xl overflow-hidden relative font-sans text-slate-600">
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-100 p-6 h-screen sticky top-0 z-20">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg"><span className="font-bold text-white text-lg">SW</span></div>
          <div><h1 className="text-lg font-bold text-slate-800 leading-tight">SOWIC</h1><p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Gestión de Activos</p></div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
          {desktopNavItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 font-medium ${isActive ? 'bg-orange-50 text-orange-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
              <item.icon size={20} /><span className="text-sm">{item.label}</span>
            </NavLink>
          ))}
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

      <main className="flex-1 h-screen overflow-y-auto overflow-x-hidden pb-24 md:pb-0 relative bg-[#F8F9FA]">
        {children}
      </main>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-2 z-50 flex items-center justify-between shadow-xl rounded-t-3xl">
        {mobileNavItems.map((item, index) => {
          if (item.isAction) {
            return (
              <div key={index} className="relative -top-8">
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-orange-200 border-4 border-[#F8F9FA]">
                  {isMenuOpen ? <X size={24} /> : <Plus size={28} />}
                </button>
              </div>
            )
          }
          return (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex flex-col items-center justify-center w-12 h-12 ${isActive ? 'text-orange-500' : 'text-slate-300'}`}>
              <item.icon size={24} />
            </NavLink>
          )
        })}
      </div>

      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-white/95 backdrop-blur-sm z-40 flex flex-col p-6 animate-in fade-in duration-200">
          <div className="flex justify-between items-center mb-6 mt-4">
            <div><h2 className="text-2xl font-bold text-slate-800">Menú Global</h2><p className="text-slate-400 text-sm">Operaciones SOWIC</p></div>
            <button onClick={() => setIsMenuOpen(false)} title="Cerrar Menú" className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center"><X size={20} /></button>
          </div>

          <div className="flex flex-col h-full">
            <div className="grid grid-cols-2 gap-4 overflow-y-auto pb-6 no-scrollbar flex-1">
              {globalOverlayItems.map(item => (
                <button
                  key={item.to}
                  onClick={() => { navigate(item.to); setIsMenuOpen(false); }}
                  className="flex flex-col items-center justify-center bg-white p-5 rounded-3xl text-slate-600 border border-slate-100 shadow-sm active:scale-95 transition-transform hover:border-orange-200"
                >
                  <div className={`w-14 h-14 ${item.bgColor} rounded-2xl flex items-center justify-center mb-3 shadow-sm`}>
                    <item.icon size={28} className={item.color} />
                  </div>
                  <span className="text-sm font-bold text-slate-700">{item.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-4 rounded-xl bg-red-50 text-red-600 font-bold flex items-center justify-center gap-2 mt-4"
            >
              <LogOut size={20} />
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
