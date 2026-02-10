
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ClipboardCheck, Plus, Search, Filter } from 'lucide-react';

const Checklist: React.FC = () => {
    const { checkPermission } = useAuth();
    const canEdit = checkPermission('/checklist', 'edit');

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Check Lists</h1>
                    <p className="text-slate-500 mt-1">Gestión de plantillas y registros de inspección.</p>
                </div>

                <div className="flex gap-2">
                    {canEdit && (
                        <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2">
                            <Plus size={18} />
                            <span>Nuevo Check List</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white p-12 rounded-[2rem] shadow-sm border border-slate-100 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ClipboardCheck size={40} className="text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-700 mb-2">Módulo en Construcción</h3>
                <p className="text-slate-400 max-w-md mx-auto">
                    Próximamente podrás gestionar aquí todos los modelos de checklists y ver el historial de inspecciones.
                </p>
            </div>
        </div>
    );
};

export default Checklist;
