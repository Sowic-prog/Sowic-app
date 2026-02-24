
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Calendar, User, Clock, CheckCircle2, AlertTriangle,
  Leaf, DollarSign, FileText, Plus, Save, MoreVertical, Trash2,
  History, Sparkles, Loader2, X, Upload, Paperclip, ShieldCheck, Printer, Wrench,
  Check, Trash, ExternalLink, ShieldAlert, BadgeCheck, Calculator, ShoppingBag, HardHat, Cog,
  MessageSquare, Send, ArrowRightCircle, FileUp, Download, Eye, Briefcase, Handshake, CalendarDays
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from '../supabaseClient';
import { WorkOrder, WorkOrderStatus, WorkOrderExpense, WorkOrderUpdate, Provider } from '../types';

// Helper to map DB -> App
const mapWorkOrderFromDB = (db: any): WorkOrder => ({
  id: db.mock_id || db.id,
  title: db.title,
  assetId: db.asset_id,
  assetName: db.asset_name,
  status: db.status,
  priority: db.priority,
  dateStart: db.date_start,
  responsible: db.responsible,
  description: db.description,
  updates: db.updates || [],
  expenses: db.expenses || [],
  // Environmental
  environmentalNotes: db.environmental_notes,
  environmentalChecklist: db.environmental_checklist,
  environmentalFiles: db.environmental_files,
  // Outsourcing
  isOutsourced: db.is_outsourced,
  providerId: db.provider_id,
  providerName: db.provider_name,
  providerInstructions: db.provider_instructions,
  maintenancePlanId: db.maintenance_plan_id,
  maintenanceEventId: db.maintenance_event_id,
  dueDate: db.date_due,
  closingData: db.closing_data
});

const WorkOrderDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);

  // Changed default tab to 'details' based on new order
  const [activeTab, setActiveTab] = useState<'details' | 'activity' | 'expenses' | 'environment'>('details');

  // Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [newExpense, setNewExpense] = useState<Partial<WorkOrderExpense>>({
    description: '',
    category: 'Repuesto',
    quantity: 1,
    unitCost: 0
  });

  // Closing Modal State
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [closingForm, setClosingForm] = useState({
    invoiceUrl: '',
    remitoUrl: '',
    notes: '',
    workConfirmation: false
  });

  // Update State
  const [newUpdateComment, setNewUpdateComment] = useState('');
  const [newUpdateStatus, setNewUpdateStatus] = useState<WorkOrderStatus | ''>('');

  // Environmental
  const [isGeneratingEnv, setIsGeneratingEnv] = useState(false);
  const envFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;

      try {
        // Determine search strategy
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        let resultData = null;

        // Strategy 1: If it looks like a UUID, try ID first
        if (isUuid) {
          const { data, error } = await supabase
            .from('work_orders')
            .select('*')
            .eq('id', id)
            .maybeSingle();

          if (data) {
            resultData = data;
          } else if (error) {
            console.warn("First attempt by UUID failed:", error.message);
          }
        }

        // Strategy 2: If finding by UUID failed or it wasn't a UUID, try mock_id
        if (!resultData) {
          const { data, error } = await supabase
            .from('work_orders')
            .select('*')
            .eq('mock_id', id)
            .maybeSingle();

          if (data) resultData = data;
          if (error) console.warn("Second attempt by mock_id failed/empty:", error.message);
        }

        // Strategy 3: Final fallback, try ID if we didn't try before (e.g. non-standard UUID format)
        if (!resultData && !isUuid) {
          const { data } = await supabase
            .from('work_orders')
            .select('*')
            .eq('id', id)
            .maybeSingle();
          if (data) resultData = data;
        }

        if (resultData) {
          setOrder(mapWorkOrderFromDB(resultData));
        } else {
          console.error("Order not found with ID:", id);
          alert("No se encontró la orden de trabajo especificada.");
          navigate('/maintenance'); // Redirect back to list
        }

        // Fetch Providers
        const { data: provs } = await supabase.from('providers').select('*');
        if (provs) {
          setProviders(provs.map((p: any) => ({
            id: p.id,
            companyName: p.company_name, // Mapping from snake_case DB
            contactName: p.contact_name,
            serviceType: p.service_type,
            rating: p.rating,
            status: p.status
          })));
        }

      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };

    fetchOrder();
  }, [id]);

  const saveOrderToDB = async (updatedOrder: WorkOrder) => {
    try {
      const { error } = await supabase.from('work_orders').update({
        status: updatedOrder.status,
        updates: updatedOrder.updates,
        expenses: updatedOrder.expenses,
        environmental_notes: updatedOrder.environmentalNotes,
        environmental_checklist: updatedOrder.environmentalChecklist,
        environmental_files: updatedOrder.environmentalFiles,
        is_outsourced: updatedOrder.isOutsourced,
        provider_id: updatedOrder.providerId,
        provider_name: updatedOrder.providerName,
        provider_instructions: updatedOrder.providerInstructions,
        closing_data: updatedOrder.closingData
      }).eq('mock_id', updatedOrder.id); // Assuming ID in URL is mock_id

      if (error) throw error;
    } catch (err) {
      console.error("Error updating order:", err);
      alert("Error al guardar cambios en la nube.");
    }
  };

  if (!order) return <div className="p-8 text-center font-bold text-slate-400">Cargando orden...</div>;

  const handlePrint = () => {
    window.print();
  };

  const handleDeleteOrder = async () => {
    if (!order) return;
    if (window.confirm("¿Estás seguro de que deseas eliminar esta Orden de Trabajo permanentemente?")) {
      try {
        const { error } = await supabase.from('work_orders').delete().eq('mock_id', order.id);
        if (error) {
          const { error: uuidError } = await supabase.from('work_orders').delete().eq('id', order.id);
          if (uuidError) throw uuidError;
        }
        navigate('/maintenance');
      } catch (err) {
        console.error("Error deleting order:", err);
        alert("Error al eliminar la orden.");
      }
    }
  };

  const getStatusColor = (status: WorkOrderStatus) => {
    switch (status) {
      case WorkOrderStatus.IN_PROGRESS: return 'bg-orange-500';
      case WorkOrderStatus.COMPLETED: return 'bg-green-500';
      case WorkOrderStatus.CANCELLED: return 'bg-red-500';
      default: return 'bg-slate-400';
    }
  };

  const handleAddExpense = () => {
    if (!newExpense.description || !newExpense.unitCost) {
      alert("Por favor completa los campos obligatorios.");
      return;
    }

    const expense: WorkOrderExpense = {
      id: Math.random().toString(36).substr(2, 9),
      description: newExpense.description || '',
      category: newExpense.category as any,
      quantity: newExpense.quantity || 1,
      unitCost: newExpense.unitCost || 0,
      totalCost: (newExpense.quantity || 1) * (newExpense.unitCost || 0),
      date: new Date().toISOString().split('T')[0]
    };

    // Auto-log to bitácora (Activity Log)
    const systemUpdate: WorkOrderUpdate = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toLocaleString(),
      user: 'Sistema',
      comment: `Compra registrada: ${expense.description} - $${expense.totalCost.toLocaleString()}`,
      newStatus: undefined
    };

    setOrder(prev => {
      if (!prev) return null;
      const updated = {
        ...prev,
        expenses: [...prev.expenses, expense],
        updates: [systemUpdate, ...prev.updates] // Add to start
      };
      saveOrderToDB(updated);
      return updated;
    });

    setNewExpense({ description: '', category: 'Repuesto', quantity: 1, unitCost: 0 });
    setIsExpenseModalOpen(false);
    alert("Gasto registrado y añadido a la bitácora.");
  };

  const removeExpense = (expenseId: string) => {
    setOrder(prev => {
      if (!prev) return null;
      const updated = {
        ...prev,
        expenses: prev.expenses.filter(e => e.id !== expenseId)
      };
      saveOrderToDB(updated);
      return updated;
    });
  };

  const handleAddUpdate = () => {
    if (!newUpdateComment && !newUpdateStatus) return;

    if (newUpdateStatus === WorkOrderStatus.COMPLETED) {
      setIsClosingModalOpen(true);
      setNewUpdateStatus('');
      return;
    }

    const update: WorkOrderUpdate = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toLocaleString(),
      user: 'Usuario Actual', // In real app, use auth user
      comment: newUpdateComment,
      newStatus: newUpdateStatus || undefined
    };

    setOrder(prev => {
      if (!prev) return null;
      const updated = {
        ...prev,
        status: newUpdateStatus || prev.status,
        updates: [update, ...prev.updates]
      };
      saveOrderToDB(updated);
      return updated;
    });

    setNewUpdateComment('');
    setNewUpdateStatus('');
  };

  const handleFinalClose = async () => {
    if (!order) return;

    const hasExpenses = order.expenses.length > 0;
    const hasInvoice = !!closingForm.invoiceUrl;
    const hasRemito = !!closingForm.remitoUrl;
    const isConfirmed = closingForm.workConfirmation;

    if (!isConfirmed) {
      alert("Debe dar conformidad de que el trabajo se finalizó correctamente.");
      return;
    }

    if (hasExpenses && !hasInvoice && !hasRemito) {
      alert("Para cerrar una orden con gastos debe adjuntar al menos una Factura o un Remito.");
      return;
    }

    const update: WorkOrderUpdate = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toLocaleString(),
      user: 'Usuario Actual', // In real app, use auth user
      comment: `ORDEN CERRADA - ${closingForm.notes || 'Sin observaciones adicionales.'}`,
      newStatus: WorkOrderStatus.COMPLETED
    };

    const updatedOrder: WorkOrder = {
      ...order,
      status: WorkOrderStatus.COMPLETED,
      updates: [update, ...order.updates],
      closingData: {
        ...closingForm,
        closedAt: new Date().toISOString(),
        closedBy: 'Usuario Actual'
      }
    };

    setOrder(updatedOrder);
    await saveOrderToDB(updatedOrder);
    setIsClosingModalOpen(false);
    alert("Orden de trabajo cerrada exitosamente.");
  };

  const updateProviderSelection = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    setOrder(prev => {
      if (!prev) return null;
      const updated = {
        ...prev,
        isOutsourced: !!providerId,
        providerId: providerId,
        providerName: provider ? provider.companyName : undefined,
        // Reset environmental info if provider changes as context changes
        environmentalNotes: undefined,
        environmentalChecklist: undefined,
        providerInstructions: undefined
      };
      saveOrderToDB(updated);
      return updated;
    });
  };

  const generateEnvironmentalTips = async () => {
    setIsGeneratingEnv(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

      if (!apiKey) {
        alert("Falta la API Key de Gemini. Revisa tu archivo .env y reinicia el servidor.");
        console.error("Gemini API Key missing in environment");
        setIsGeneratingEnv(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });

      let promptText = `Analiza esta Orden de Trabajo: "${order.title}" para el activo "${order.assetName}" con descripción: "${order.description}". `;
      promptText += `Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura:
      {
        "analysis": "Un párrafo técnico sobre mitigación de impacto ambiental",
        "checklist": ["item1", "item2", "item3"],
        "provider_request": "Instrucciones para el contratista"
      }`;

      let response;
      try {
        console.log("Attempting generation with gemini-1.5-flash...");
        response = await (ai as any).models.generateContent({
          model: 'gemini-1.5-flash',
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
          config: { responseMimeType: 'application/json' }
        });
      } catch (e: any) {
        console.warn("Retrying with fallback due to:", e.message);
        try {
          response = await (ai as any).models.generateContent({
            model: 'gemini-pro',
            contents: [{ role: 'user', parts: [{ text: promptText }] }]
          });
        } catch (e2) {
          console.error("AI Generation Failed completely", e2);
          alert(`Error al generar el protocolo ambiental: ${e.message}`);
          setIsGeneratingEnv(false);
          return;
        }
      }

      console.log("AI Response received:", response);
      const rawText = response.text || (response.response ? response.response.text() : "");
      let result;
      try {
        const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        result = JSON.parse(cleanedText || "{}");
      } catch (e) {
        console.error("JSON Parse Error", e);
        alert("Error al procesar la respuesta de la IA.");
        return;
      }

      if (result && result.analysis && result.checklist) {
        setOrder(prev => {
          if (!prev) return null;
          const updated = {
            ...prev,
            environmentalNotes: result.analysis,
            environmentalChecklist: result.checklist.map((item: string) => ({ label: item, checked: false })),
            providerInstructions: result.provider_request
          };
          saveOrderToDB(updated);
          return updated;
        });
      }
    } catch (error: any) {
      console.error("AI Environmental Generation Error:", error);
      alert(`Error al generar el protocolo ambiental: ${error.message}`);
    } finally {
      setIsGeneratingEnv(false);
    }
  };

  const toggleChecklistItem = (index: number) => {
    if (!order.environmentalChecklist) return;
    const newList = [...order.environmentalChecklist];
    newList[index].checked = !newList[index].checked;
    const updated = { ...order, environmentalChecklist: newList };
    setOrder(updated);
    saveOrderToDB(updated);
  };

  const handleEnvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Mock upload - in real app upload to storage
      const newFile = {
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        type: file.name.split('.').pop() || 'file',
        date: new Date().toLocaleDateString()
      };

      setOrder(prev => {
        if (!prev) return null;
        const updated = {
          ...prev,
          environmentalFiles: [...(prev.environmentalFiles || []), newFile]
        };
        saveOrderToDB(updated);
        return updated;
      });
    }
  };

  const removeEnvFile = (idx: number) => {
    setOrder(prev => {
      if (!prev || !prev.environmentalFiles) return prev;
      const newFiles = [...prev.environmentalFiles];
      newFiles.splice(idx, 1);
      const updated = { ...prev, environmentalFiles: newFiles };
      saveOrderToDB(updated);
      return updated;
    });
  };

  const totalExpenses = order.expenses.reduce((acc, curr) => acc + curr.totalCost, 0);

  return (
    <div className="bg-[#F8F9FA] min-h-screen pb-24 font-sans relative print:bg-white print:min-h-0 print:pb-0">
      {/* --- PRINT VIEW (REMITO) --- */}
      {/* --- PRINT VIEW --- */}
      <div className="hidden print:block bg-white p-8 w-full font-sans text-slate-900">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-widest text-slate-900">ORDEN DE TRABAJO</h1>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-sm font-bold bg-slate-100 px-3 py-1 rounded text-slate-600 uppercase">Orden #{order.id}</span>
              <span className="text-sm font-bold text-slate-500">{new Date().toLocaleDateString()}</span>
            </div>
          </div>
          <div className="w-16 h-16 bg-slate-900 text-white flex items-center justify-center font-bold text-2xl rounded-lg">SW</div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Activo</p>
            <p className="text-xl font-bold text-slate-900">{order.assetName}</p>
            <p className="text-xs text-slate-500 mt-1">{order.internalId || 'S/N'} • {order.location || 'Ubicación no especificada'}</p>
          </div>
          <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Responsable</p>
            <p className="text-xl font-bold text-slate-900">{order.responsible || 'Sin Asignar'}</p>
            <p className="text-xs text-slate-500 mt-1">Solicitante</p>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-widest border-b border-slate-200 pb-2 mb-4 text-slate-400">Descripción del Trabajo</h3>
          <p className="text-sm leading-relaxed whitespace-pre-line text-slate-800 font-medium">{order.description}</p>
        </div>

        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-widest border-b border-slate-200 pb-2 mb-4 text-slate-400">Bitácora de Actividad</h3>
          <div className="space-y-4">
            {order.updates && order.updates.length > 0 ? order.updates.map((update, idx) => (
              <div key={idx} className="flex gap-4 text-xs pb-4 border-b border-slate-100 last:border-0 break-inside-avoid">
                <span className="font-mono font-bold w-24 shrink-0 text-slate-500">{update.date.split(' ')[0]}</span>
                <span className="font-bold w-32 shrink-0 text-slate-700">{update.user}</span>
                <span className="flex-1 text-slate-600 whitespace-pre-line">{update.comment}</span>
              </div>
            )) : <p className="text-xs italic text-slate-400">Sin movimientos registrados.</p>}
          </div>
        </div>

        {order.expenses.length > 0 && (
          <div className="mb-12">
            <h3 className="text-xs font-bold uppercase tracking-widest border-b border-slate-200 pb-2 mb-4 text-slate-400">Detalle de Insumos</h3>
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500">
                  <th className="py-2 px-3 font-bold uppercase rounded-l-lg">Item</th>
                  <th className="py-2 px-3 font-bold uppercase text-center w-20">Cant.</th>
                  <th className="py-2 px-3 font-bold uppercase text-right w-32 rounded-r-lg">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.expenses.map(exp => (
                  <tr key={exp.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-medium text-slate-800">{exp.description} <span className="text-[10px] text-slate-400 block">{exp.category}</span></td>
                    <td className="py-3 px-3 text-center text-slate-600">{exp.quantity}</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-800">${exp.totalCost.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="grid grid-cols-3 gap-8 mt-20">
          <div className="text-center pt-8 border-t border-slate-300">
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Solicitó</p>
          </div>
          <div className="text-center pt-8 border-t border-slate-300">
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Realizó</p>
          </div>
          <div className="text-center pt-8 border-t border-slate-300">
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Conformidad</p>
          </div>
        </div>
      </div>

      {/* --- SCREEN VIEW --- */}
      <div className="print:hidden">
        {/* MODAL GASTOS */}
        {isExpenseModalOpen && (
          <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] p-8 animate-in slide-in-from-bottom-20 duration-300 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Cargar Insumo / Gasto</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Detalle económico de la OT</p>
                </div>
                <button onClick={() => setIsExpenseModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-400" aria-label="Cerrar">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Descripción del Ítem</label>
                  <input
                    type="text"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    placeholder="Ej. Filtro de aire primario"
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 text-sm font-bold text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Categoría</label>
                    <select
                      value={newExpense.category}
                      aria-label="Categoría de gasto"
                      onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value as any })}
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 appearance-none"
                    >
                      <option value="Repuesto">Repuesto</option>
                      <option value="Consumible">Consumible</option>
                      <option value="Mano de Obra">Mano de Obra</option>
                      <option value="Servicio Externo">Servicio Externo</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="expense-quantity" className="text-[10px] font-bold text-slate-400 uppercase ml-1">Cantidad</label>
                    <input
                      id="expense-quantity"
                      type="number"
                      value={newExpense.quantity}
                      placeholder="0"
                      aria-label="Cantidad"
                      onChange={(e) => setNewExpense({ ...newExpense, quantity: Number(e.target.value) })}
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="expense-cost" className="text-[10px] font-bold text-slate-400 uppercase ml-1">Costo Unitario ($)</label>
                  <div className="relative">
                    <input
                      id="expense-cost"
                      type="number"
                      value={newExpense.unitCost}
                      placeholder="0.00"
                      aria-label="Costo Unitario"
                      onChange={(e) => setNewExpense({ ...newExpense, unitCost: Number(e.target.value) })}
                      className="w-full p-4 pl-12 bg-slate-50 border-none rounded-2xl text-sm font-bold text-orange-600"
                    />
                    <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  </div>
                </div>

                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-orange-400 uppercase">Subtotal Estimado</span>
                  <span className="text-lg font-black text-orange-600">
                    ${((newExpense.quantity || 1) * (newExpense.unitCost || 0)).toLocaleString()}
                  </span>
                </div>

                <button
                  onClick={handleAddExpense}
                  className="w-full bg-slate-800 text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  <Plus size={20} /> Añadir a la Orden
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL CIERRE */}
        {isClosingModalOpen && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-end justify-center animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] p-8 animate-in slide-in-from-bottom-20 duration-300 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Cierre de Orden</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Validación y Documentación Final</p>
                </div>
                <button onClick={() => setIsClosingModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-400" aria-label="Cerrar modal de cierre">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Resumen Económico */}
                <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Resumen de Gastos</span>
                    <span className="text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded-lg border border-slate-100">
                      {order.expenses.length} ítems
                    </span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-3xl font-black text-slate-800">${totalExpenses.toLocaleString()}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Costo Total Acumulado</p>
                    </div>
                    {order.expenses.length === 0 && (
                      <div className="flex items-center gap-2 text-red-500 bg-red-50 px-3 py-1.5 rounded-xl border border-red-100">
                        <AlertTriangle size={14} />
                        <span className="text-[10px] font-black uppercase">Sin Gastos</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Documentación Obligatoria */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Documentación Requerida</h4>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="relative group">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Número / Enlace de Factura</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={closingForm.invoiceUrl}
                          onChange={(e) => setClosingForm({ ...closingForm, invoiceUrl: e.target.value })}
                          placeholder="Ej. Factura A-0001-00001234 o link"
                          className={`w-full p-4 pl-12 bg-slate-50 border-2 rounded-2xl text-sm font-bold transition-all ${closingForm.invoiceUrl ? 'border-emerald-100 focus:border-emerald-500' : 'border-transparent focus:border-orange-500'}`}
                        />
                        <FileText size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${closingForm.invoiceUrl ? 'text-emerald-500' : 'text-slate-300'}`} />
                        {closingForm.invoiceUrl && <Check size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 animate-in zoom-in" />}
                      </div>
                    </div>

                    <div className="relative group">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Número / Enlace de Remito</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={closingForm.remitoUrl}
                          onChange={(e) => setClosingForm({ ...closingForm, remitoUrl: e.target.value })}
                          placeholder="Ej. Remito R-0002-00005678 o link"
                          className={`w-full p-4 pl-12 bg-slate-50 border-2 rounded-2xl text-sm font-bold transition-all ${closingForm.remitoUrl ? 'border-emerald-100 focus:border-emerald-500' : 'border-transparent focus:border-orange-500'}`}
                        />
                        <ShoppingBag size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${closingForm.remitoUrl ? 'text-emerald-500' : 'text-slate-300'}`} />
                        {closingForm.remitoUrl && <Check size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 animate-in zoom-in" />}
                      </div>
                    </div>
                  </div>

                  {order.expenses.length > 0 && !closingForm.invoiceUrl && !closingForm.remitoUrl && (
                    <div className="flex items-center gap-3 p-4 bg-orange-50 text-orange-700 rounded-2xl border border-orange-100 animate-pulse">
                      <ShieldAlert size={18} className="shrink-0" />
                      <p className="text-[10px] font-bold uppercase leading-tight">Es obligatorio adjuntar Factura o Remito para cerrar una orden con gastos.</p>
                    </div>
                  )}
                </div>

                {/* Observaciones Finales */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Observaciones de Cierre</label>
                  <textarea
                    value={closingForm.notes}
                    onChange={(e) => setClosingForm({ ...closingForm, notes: e.target.value })}
                    placeholder="Detalles sobre el trabajo finalizado, garantías, etc."
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-slate-200 min-h-[100px] resize-none"
                  />
                </div>

                {/* Conformidad del Trabajo */}
                <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={closingForm.workConfirmation}
                        onChange={(e) => setClosingForm({ ...closingForm, workConfirmation: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-6 h-6 border-2 border-emerald-200 rounded-lg flex items-center justify-center transition-all peer-checked:bg-emerald-500 peer-checked:border-emerald-500 group-hover:border-emerald-400">
                        <Check size={16} className={`text-white transition-transform ${closingForm.workConfirmation ? 'scale-100' : 'scale-0'}`} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-bold text-emerald-900 block leading-tight">Conformidad de Finalización</span>
                      <span className="text-[10px] text-emerald-600 font-medium">Confirmo que el trabajo se completó correctamente conforme a lo solicitado.</span>
                    </div>
                  </label>
                </div>

                <div className="pt-4 space-y-3">
                  <button
                    onClick={handleFinalClose}
                    disabled={!closingForm.workConfirmation || (order.expenses.length > 0 && !closingForm.invoiceUrl && !closingForm.remitoUrl)}
                    className={`w-full py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 ${(!closingForm.workConfirmation || (order.expenses.length > 0 && !closingForm.invoiceUrl && !closingForm.remitoUrl))
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-900 text-white hover:bg-black'
                      }`}
                  >
                    Confirmar y Cerrar Orden <ArrowRightCircle size={18} />
                  </button>
                  <button
                    onClick={() => setIsClosingModalOpen(false)}
                    className="w-full py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PRINT HEADER */}
        <div className="print-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-white font-bold">SW</div>
            <div>
              <h1 className="font-bold text-lg text-slate-800">ORDEN DE TRABAJO TÉCNICA</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">SOWIC Maintenance System</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Orden N°</p>
            <p className="text-lg font-black text-orange-600">{order.id}</p>
          </div>
        </div>

        <div className="bg-white p-4 sticky top-0 z-30 shadow-sm flex items-center justify-between no-print">
          <button onClick={() => navigate(-1)} className="text-slate-600 p-2" aria-label="Volver"><ChevronLeft size={24} /></button>
          <h1 className="font-bold text-lg text-slate-800">Gestión de OT</h1>
          <div className="flex gap-2">
            <button
              onClick={handleDeleteOrder}
              className="w-10 h-10 bg-white border border-slate-200 text-red-500 hover:bg-red-50 rounded-xl flex items-center justify-center shadow-sm transition-colors"
              title="Eliminar Orden"
            >
              <Trash2 size={20} />
            </button>
            {order.maintenancePlanId && (
              <button
                onClick={() => navigate('/maintenance/plans', { state: { targetPlanId: order.maintenancePlanId } })}
                className="w-10 h-10 bg-white border border-slate-200 text-slate-600 rounded-xl flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors"
                title="Ver Plan de Mantenimiento"
              >
                <CalendarDays size={20} />
              </button>
            )}
            <button onClick={handlePrint} className="w-10 h-10 bg-white border border-slate-200 text-slate-600 rounded-xl flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors" title="Imprimir"><Printer size={20} /></button>

            {order.status !== WorkOrderStatus.COMPLETED && (
              <button
                onClick={() => setIsClosingModalOpen(true)}
                className="px-4 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform font-bold text-xs uppercase"
              >
                <CheckCircle2 size={18} /> Cerrar Orden
              </button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Main Info Card */}
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden">
            <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl text-[10px] font-bold uppercase tracking-wider text-white no-print ${getStatusColor(order.status)}`}>
              {order.status}
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">{order.title}</h2>
            <div className="flex items-center gap-4 py-4 border-t border-slate-50 mt-4">
              <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 shrink-0"><Wrench size={24} /></div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Activo</p>
                <p className="text-sm font-black text-slate-700">{order.assetName}</p>
              </div>
            </div>

            {order.dueDate && (
              <div className="flex items-center gap-4 py-4 border-t border-slate-50 mt-2">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${new Date(order.dueDate) < new Date() ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                  <Calendar size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Vencimiento</p>
                  <p className={`text-sm font-black ${new Date(order.dueDate) < new Date() ? 'text-red-600 animate-pulse' : 'text-slate-700'}`}>
                    {new Date(order.dueDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                    {new Date(order.dueDate) < new Date() && " (VENCIDA)"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Tab Navigation (Reordered) */}
          <div className="flex bg-slate-200 p-1 rounded-2xl no-print overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all whitespace-nowrap px-4 ${activeTab === 'details' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
            >
              Detalles
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all whitespace-nowrap px-4 flex items-center justify-center gap-1.5 ${activeTab === 'activity' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
            >
              <MessageSquare size={14} /> Bitácora
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all whitespace-nowrap px-4 ${activeTab === 'expenses' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
            >
              Insumos
            </button>
            <button
              onClick={() => setActiveTab('environment')}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all whitespace-nowrap px-4 flex items-center justify-center gap-1.5 ${activeTab === 'environment' ? 'bg-emerald-600 text-white shadow-lg' : 'text-emerald-700 bg-emerald-50/50'}`}
            >
              <Leaf size={12} /> Ambiente
            </button>
          </div>

          {/* TAB CONTENT: DETAILS (Moved to first position) */}
          {activeTab === 'details' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-2 text-xs uppercase tracking-widest flex items-center gap-2"><FileText size={16} className="text-orange-500" /> Descripción</h3>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{order.description}</p>
              </div>

              {/* Outsourcing Logic */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2">
                    <Handshake size={16} className="text-orange-500" /> Ejecución
                  </h3>
                  <label className="flex items-center cursor-pointer relative">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={order.isOutsourced || false}
                      onChange={() => updateProviderSelection(order.isOutsourced ? '' : providers[0]?.id || '')}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                    <span className="ml-3 text-xs font-bold text-slate-600">Realizar con Tercero</span>
                  </label>
                </div>

                {order.isOutsourced && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Proveedor Asignado</label>
                    <div className="relative">
                      <select
                        value={order.providerId || ''}
                        aria-label="Proveedor Asignado"
                        onChange={(e) => updateProviderSelection(e.target.value)}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 appearance-none"
                      >
                        <option value="">Seleccionar Proveedor...</option>
                        {providers.map(prov => (
                          <option key={prov.id} value={prov.id}>{prov.companyName}</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                    </div>
                    <p className="text-[10px] text-slate-400 italic">
                      Se habilitará una hoja de ruta específica para el proveedor en la sección "Ambiente".
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB CONTENT: ACTIVITY (BITACORA) */}
          {activeTab === 'activity' && (
            <div className="space-y-6 animate-in slide-in-from-left-5 duration-300">
              {/* Add Update Input */}
              <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 no-print">
                <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Plus size={16} className="text-orange-500" /> Registrar Avance
                </h3>
                <textarea
                  value={newUpdateComment}
                  onChange={(e) => setNewUpdateComment(e.target.value)}
                  placeholder="Escribe una nota, avance o comentario..."
                  className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 min-h-[80px] resize-none mb-3"
                />
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <select
                      value={newUpdateStatus}
                      aria-label="Nuevo Estado"
                      onChange={(e) => setNewUpdateStatus(e.target.value as WorkOrderStatus)}
                      className="w-full p-3 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-600 appearance-none"
                    >
                      <option value="">Mantener Estado</option>
                      <option value={WorkOrderStatus.IN_PROGRESS}>En Proceso</option>
                      <option value={WorkOrderStatus.COMPLETED}>Completada</option>
                      <option value={WorkOrderStatus.PENDING}>Pendiente</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                  </div>
                  <button
                    onClick={handleAddUpdate}
                    disabled={!newUpdateComment && !newUpdateStatus}
                    className="bg-slate-800 text-white px-4 rounded-xl flex items-center gap-2 font-bold text-xs disabled:opacity-50"
                  >
                    <Send size={14} /> Guardar
                  </button>
                </div>
              </div>

              {/* Timeline */}
              <div className="relative pl-4 space-y-6 before:absolute before:left-[19px] before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-200">
                {order.updates.map((update, idx) => (
                  <div key={update.id} className="relative pl-6">
                    <div className={`absolute left-0 top-1.5 w-10 h-10 rounded-full border-4 border-[#F8F9FA] flex items-center justify-center z-10 ${update.comment.includes('Compra registrada') ? 'bg-emerald-500 text-white' :
                      update.comment.includes('REGULARIZACIÓN') ? 'bg-red-500 text-white' :
                        update.newStatus ? 'bg-orange-500 text-white' : 'bg-white text-slate-400 border-slate-200'
                      }`}>
                      {update.comment.includes('Compra registrada') ? <DollarSign size={16} /> :
                        update.comment.includes('REGULARIZACIÓN') ? <AlertTriangle size={16} /> :
                          update.newStatus ? <ArrowRightCircle size={16} /> : <MessageSquare size={16} />}
                    </div>

                    <div className={`p-4 rounded-2xl shadow-sm border ${update.comment.includes('REGULARIZACIÓN') ? 'bg-red-50 border-red-100' : 'bg-white border-slate-50'}`}>
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-xs font-black ${update.comment.includes('REGULARIZACIÓN') ? 'text-red-700' : 'text-slate-700'}`}>{update.user}</span>
                        <span className={`text-[10px] font-bold ${update.comment.includes('REGULARIZACIÓN') ? 'text-red-400' : 'text-slate-400'}`}>{update.date}</span>
                      </div>
                      <p className={`text-sm leading-relaxed whitespace-pre-line ${update.comment.includes('REGULARIZACIÓN') ? 'text-red-800' : 'text-slate-600'}`}>{update.comment}</p>
                      {update.newStatus && (
                        <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                          <span>Estado cambiado a:</span>
                          <span className="uppercase">{update.newStatus}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {order.updates.length === 0 && (
                  <div className="pl-6">
                    <p className="text-xs text-slate-400 italic">No hay actividad registrada en la bitácora.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB CONTENT: EXPENSES */}
          {activeTab === 'expenses' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-xl flex items-center justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500 opacity-20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <div className="relative z-10">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Costo Total Ejecutado</p>
                  <p className="text-3xl font-black">${totalExpenses.toLocaleString()}</p>
                </div>
                <button
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
                  aria-label="Cargar Gasto"
                >
                  <Plus size={28} />
                </button>
              </div>

              <div className="space-y-3">
                {order.expenses.length > 0 ? (
                  order.expenses.map(exp => (
                    <div key={exp.id} className="bg-white p-4 rounded-3xl border border-slate-50 flex items-center justify-between group shadow-sm hover:border-orange-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                          {exp.category === 'Repuesto' && <Cog size={18} />}
                          {exp.category === 'Consumible' && <ShoppingBag size={18} />}
                          {exp.category === 'Mano de Obra' && <HardHat size={18} />}
                          {exp.category === 'Servicio Externo' && <ExternalLink size={18} />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{exp.description}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{exp.category} • x{exp.quantity}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-black text-slate-800">${exp.totalCost.toLocaleString()}</p>
                          <p className="text-[9px] text-slate-400 font-bold tracking-tighter">${exp.unitCost.toLocaleString()} c/u</p>
                        </div>
                        <button
                          onClick={() => removeExpense(exp.id)}
                          className="p-2 text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 no-print"
                          aria-label="Eliminar gasto"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-[2.5rem]">
                    <Calculator size={48} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sin gastos cargados</p>
                    <button
                      onClick={() => setIsExpenseModalOpen(true)}
                      className="mt-4 text-orange-500 font-bold text-xs uppercase"
                    >
                      + Cargar primer gasto
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB CONTENT: ENVIRONMENT */}
          {activeTab === 'environment' && (
            <div className="space-y-6 animate-in slide-in-from-right-5 duration-300">
              {/* AI Section */}
              <div className="bg-emerald-900 text-white p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-emerald-400 opacity-20 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={20} className="text-emerald-300" />
                    <h3 className="font-bold text-emerald-100 uppercase text-xs tracking-widest">Protocolo Ambiental IA</h3>
                  </div>

                  {isGeneratingEnv ? (
                    <div className="flex flex-col items-center justify-center py-6 gap-3 animate-pulse">
                      <Loader2 size={32} className="animate-spin text-emerald-300" />
                      <p className="text-xs font-bold text-emerald-200">Generando protocolo y hoja de ruta...</p>
                    </div>
                  ) : order.environmentalNotes ? (
                    <div className="space-y-4">
                      <div className="text-sm text-emerald-50/90 leading-relaxed font-medium">
                        {order.environmentalNotes.split('\n').map((line, i) => (
                          <p key={i} className="mb-2">{line}</p>
                        ))}
                      </div>
                      <button
                        onClick={generateEnvironmentalTips}
                        className="text-[10px] font-bold text-emerald-300 flex items-center gap-1 hover:text-white transition-colors"
                      >
                        <History size={12} /> Regenerar análisis
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-xs text-emerald-200 mb-4 px-4">
                        Genera recomendaciones personalizadas para la gestión de residuos y la Hoja de Ruta Ambiental automáticamente.
                      </p>
                      <button
                        onClick={generateEnvironmentalTips}
                        className="bg-white text-emerald-900 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 mx-auto active:scale-95 transition-all shadow-lg"
                      >
                        <Sparkles size={16} /> Generar Protocolo & Checklist
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Provider Instructions (If Outsourced) */}
              {order.isOutsourced && order.providerInstructions && (
                <div className="bg-orange-50 p-6 rounded-[2.5rem] shadow-sm border border-orange-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h3 className="font-bold text-orange-800 mb-3 text-xs uppercase tracking-widest flex items-center gap-2">
                    <Briefcase size={18} className="text-orange-500" /> Solicitud al Proveedor: {order.providerName}
                  </h3>
                  <div className="text-sm text-orange-900/80 leading-relaxed font-medium bg-white/50 p-4 rounded-2xl border border-orange-100/50">
                    {order.providerInstructions}
                  </div>
                </div>
              )}

              {/* Checklist Section */}
              {(order.environmentalChecklist && order.environmentalChecklist.length > 0) && (
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h3 className="font-bold text-slate-800 mb-4 text-xs uppercase tracking-widest flex items-center gap-2">
                    <ShieldAlert size={18} className="text-emerald-500" /> Hoja de Ruta Ambiental
                  </h3>
                  <div className="space-y-3">
                    {order.environmentalChecklist.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => toggleChecklistItem(idx)}
                        className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all ${item.checked ? 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-sm' : 'bg-white border-slate-100 text-slate-400'}`}
                      >
                        <span className={`text-sm font-bold text-left leading-tight ${item.checked ? '' : 'opacity-80'}`}>{item.label}</span>
                        {item.checked ? <BadgeCheck size={20} className="text-emerald-500 shrink-0 ml-3" /> : <div className="w-5 h-5 rounded-full border-2 border-slate-100 shrink-0 ml-3"></div>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Certificates / Files Section */}
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2">
                    <FileText size={18} className="text-emerald-500" /> Certificados y Manifiestos
                  </h3>
                  <button
                    onClick={() => envFileInputRef.current?.click()}
                    className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-emerald-100 transition-colors"
                  >
                    <FileUp size={12} /> Adjuntar
                  </button>
                  <input
                    type="file"
                    ref={envFileInputRef}
                    className="hidden"
                    onChange={handleEnvFileUpload}
                    accept=".pdf,.jpg,.png"
                    aria-label="Adjuntar archivo ambiental"
                  />
                </div>

                <div className="space-y-3">
                  {order.environmentalFiles && order.environmentalFiles.length > 0 ? (
                    order.environmentalFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-emerald-200 transition-colors group bg-slate-50/50">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <FileText size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-700 truncate">{file.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{file.type} • {file.size} • {file.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="p-2 text-slate-300 hover:text-emerald-500 transition-colors" aria-label="Ver archivo"><Eye size={16} /></button>
                          <button onClick={() => removeEnvFile(idx)} className="p-2 text-slate-300 hover:text-red-500 transition-colors" aria-label="Eliminar archivo"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div
                      onClick={() => envFileInputRef.current?.click()}
                      className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 hover:border-emerald-200 transition-colors group"
                    >
                      <Upload size={24} className="mx-auto text-slate-300 mb-2 group-hover:text-emerald-500 transition-colors" />
                      <p className="text-xs font-bold text-slate-400 group-hover:text-emerald-600">Subir Manifiesto / Certificado</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PRINT ONLY: Technical Signature */}
          <div className="hidden print:grid grid-cols-2 gap-12 mt-20 pt-12">
            <div className="text-center border-t border-slate-300 pt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Firma Responsable Técnico</p>
              <p className="text-sm text-slate-800 font-bold mt-1">{order.responsible}</p>
            </div>
            <div className="text-center border-t border-slate-300 pt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Firma Control Ambiental</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkOrderDetail;
