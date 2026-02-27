import React from 'react';
import { NavLink } from 'react-router-dom';
import { FileText, Calendar, CheckCircle2, ChevronRight, Wrench, Menu, BrainCircuit } from 'lucide-react';

const MaintenanceHub: React.FC = () => {
    const hubItems = [
        {
            to: "/maintenance/orders",
            state: { activeTab: 'predictive' },
            label: "Predictivo IA",
            description: "Detección temprana de fallos y alertas de uso",
            icon: BrainCircuit,
            color: "text-indigo-600",
            bgColor: "bg-indigo-50",
            borderColor: "border-indigo-100"
        },
        {
            to: "/maintenance/orders",
            label: "Órdenes de Trabajo",
            description: "Gestión de reparaciones y servicios correctivos",
            icon: FileText,
            color: "text-orange-600",
            bgColor: "bg-orange-50",
            borderColor: "border-orange-100"
        },
        {
            to: "/maintenance/plans",
            label: "Planes Mant.",
            description: "Programación de mantenimientos preventivos",
            icon: Calendar,
            color: "text-blue-600",
            bgColor: "bg-blue-50",
            borderColor: "border-blue-100"
        },
        {
            to: "/maintenance/orders",
            state: { activeTab: 'preventive' },
            label: "Mantenimiento Preventivo",
            description: "Calendario y ejecución de tareas programadas",
            icon: Calendar,
            color: "text-purple-600",
            bgColor: "bg-purple-50",
            borderColor: "border-purple-100"
        },
        {
            to: "/checklist",
            label: "Check List",
            description: "Inspecciones y estados de equipos",
            icon: CheckCircle2,
            color: "text-emerald-600",
            bgColor: "bg-emerald-50",
            borderColor: "border-emerald-100"
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            {/* Header */}
            <div className="bg-white px-6 pt-12 pb-8 rounded-b-[2.5rem] shadow-sm border-b border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('sowic:toggle-sidebar'))}
                        className="p-2 md:hidden text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        <Menu size={24} />
                    </button>
                    <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                        <img src="/logo.jpg" alt="SOWIC" className="w-8 h-8 rounded-lg object-cover" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Mantenimiento</h1>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Centro de Operaciones</p>
                    </div>
                </div>

                <div className="bg-orange-500 rounded-3xl p-6 text-white shadow-lg shadow-orange-200 relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-orange-100 text-sm font-bold mb-1">Taller SOWIC</p>
                        <h2 className="text-2xl font-black mb-1 leading-tight">Gestión Técnica</h2>
                        <p className="text-orange-50 text-xs opacity-80 uppercase tracking-widest font-bold">Optimización de Activos</p>
                    </div>
                    <Wrench className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 rotate-12 transition-transform group-hover:scale-110 duration-500" />
                </div>
            </div>

            {/* Menu Grid */}
            <div className="px-6 -mt-4 space-y-4">
                {hubItems.map((item, index) => (
                    <NavLink
                        key={index}
                        to={item.to}
                        state={item.state}
                        className="flex items-center gap-4 bg-white p-5 rounded-3xl shadow-sm border border-slate-100 active:scale-[0.98] transition-all group"
                    >
                        <div className={`w-14 h-14 ${item.bgColor} rounded-2xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-110 duration-300`}>
                            <item.icon size={26} className={item.color} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-slate-800 font-black text-lg leading-tight">{item.label}</h3>
                            <p className="text-slate-400 text-xs mt-0.5 leading-snug">{item.description}</p>
                        </div>
                        <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 group-hover:text-orange-500 group-hover:bg-orange-50 transition-colors">
                            <ChevronRight size={20} />
                        </div>
                    </NavLink>
                ))}
            </div>

            {/* Hint */}
            <div className="px-10 mt-8 text-center">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Seleccione un módulo para continuar</p>
            </div>
        </div>
    );
};

export default MaintenanceHub;
