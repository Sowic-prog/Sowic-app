
import React, { useState } from 'react';
import {
    ChevronLeft, Info, HelpCircle, BookOpen, Send, Wrench,
    Plus, CheckCircle2, AlertTriangle, FileText, Layout, Bot, Truck,
    MousePointer2, ArrowRightCircle, Smartphone, Search, Calendar, Sparkles,
    Users, Target, Compass, Layers, ArrowRight, ArrowDown, Settings, Clock, Package,
    TrendingUp, Timer
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TutorialStep {
    title: string;
    content: string;
    graphicId: string;
}

interface FlowStep {
    label: string;
    color: string;
    desc?: string;
}

interface Tutorial {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    // Process Metadata
    objectives: string;
    responsible: string;
    scope: string;
    involvedAreas: string[];
    inputs: string[];
    outputs: string[];
    flowchart: FlowStep[];
    fullDescription: string;
    steps: TutorialStep[];
}

const HelpPage: React.FC = () => {
    const navigate = useNavigate();
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'estructura' | 'logistica' | 'guia'>('estructura');

    const tutorials: Tutorial[] = [
        {
            id: 'services',
            title: 'Solicitudes de Servicio',
            description: 'Canal único para cualquier requerimiento operativo o técnico.',
            icon: <Send className="text-orange-500" />,
            objectives: 'Centralizar el 100% de las necesidades de mantenimiento, reparaciones o servicios de los activos de la compañía para garantizar trazabilidad y cumplimiento de SLAs.',
            responsible: 'Servicios Generales',
            scope: 'Desde la detección de una anomalía o necesidad por parte de cualquier colaborador hasta la resolución y conformidad final.',
            involvedAreas: ['Mantenimiento', 'Operaciones', 'Logística', 'Pañol'],
            inputs: [
                'Reporte de falla en terreno',
                'Necesidad de insumos',
                'Solicitud de traslado de activos',
                'Detección de riesgo en infraestructura'
            ],
            outputs: [
                'Solicitud Documentada (Ticket)',
                'Orden de Trabajo (en caso de reparaciones)',
                'Conformidad de Cierre del usuario'
            ],
            flowchart: [
                { label: 'Detección de Necesidad', color: 'bg-slate-100 text-slate-600' },
                { label: 'Apertura de Solicitud en App', color: 'bg-orange-500 text-white' },
                { label: 'Asignación de Prioridad/SLA', color: 'bg-orange-100 text-orange-700' },
                { label: 'Gestión Técnica (Derivación)', color: 'bg-blue-500 text-white' },
                { label: 'Cierre y Conformidad', color: 'bg-green-500 text-white' }
            ],
            fullDescription: 'Este proceso es el corazón operativo de la plataforma. Ninguna tarea de reparación o servicio debe iniciarse si no existe una Solicitud de Servicio previa. Esto permite medir indicadores de gestión (KPIs) y asegurar que los tiempos de respuesta pactados (SLA) se cumplan según la criticidad (Critica, Alta, Media, Baja).',
            steps: [
                {
                    title: 'Paso 1: Inicio del Proceso',
                    content: 'Toda solicitud debe ingresar obligatoriamente por el módulo de "Servicios" para asignar un responsable y un tiempo límite.',
                    graphicId: 'step1_services'
                },
                {
                    title: 'Paso 2: Crear Solicitud',
                    content: 'Presiona el botón "+" naranja. Selecciona el activo afectado, la ubicación, prioridad y describe el problema detalladamente.',
                    graphicId: 'step2_create'
                },
                {
                    title: 'Paso 3: Seguimiento y SLA',
                    content: 'El sistema asigna un tiempo máximo. Puedes ver el estado (Pendiente, En Proceso, Resuelto) en tiempo real.',
                    graphicId: 'step3_track'
                }
            ]
        },
        {
            id: 'maintenance',
            title: 'Gestión de Taller (OT)',
            description: 'Gestión técnica, planeamiento y ejecución de reparaciones.',
            icon: <Wrench className="text-slate-600" />,
            objectives: 'Ejecutar las intervenciones técnicas asegurando la disponibilidad de activos y el registro detallado de costos y recursos.',
            responsible: 'Servicios Generales',
            scope: 'Desde la recepción de una Solicitud de Servicio (Correctivo) o Plan de Mantenimiento (Preventivo) hasta la entrega del activo operativo.',
            involvedAreas: ['Mantenimiento', 'Pañol (Repuestos)', 'Compras'],
            inputs: [
                'Solicitud de Servicio derivada',
                'Plan de Mantenimiento Anual',
                'Checklist de inspección diaria'
            ],
            outputs: [
                'Orden de Trabajo (OT) Ejecutada',
                'Registro de Consumo de Repuestos',
                'Historial de Vida del Activo actualizado'
            ],
            flowchart: [
                { label: 'Generación de OT', color: 'bg-slate-800 text-white' },
                { label: 'Asignación de Recursos/Personal', color: 'bg-slate-200 text-slate-700' },
                { label: 'Carga de Gastos y Repuestos', color: 'bg-orange-500 text-white' },
                { label: 'Finalización Técnico-Administrativa', color: 'bg-green-600 text-white' }
            ],
            fullDescription: 'La Orden de Trabajo (OT) es el documento técnico legal de la reparación. En ella se deben volcar todos los costos asociados (mano de obra, repuestos, servicios externos) para obtener el costo total de operación por activo.',
            steps: [
                {
                    title: 'Derivación Técnica',
                    content: 'Si una solicitud requiere trabajo técnico, se deriva a una Orden de Trabajo desde el detalle de la solicitud.',
                    graphicId: 'step1_ot'
                },
                {
                    title: 'Ejecución y Repuestos',
                    content: 'En la OT se registran los repuestos, insumos y el tiempo de mano de obra para costeo.',
                    graphicId: 'step2_execute'
                }
            ]
        },
        {
            id: 'inventory',
            title: 'Control de Inventario',
            description: 'Gestión de stock, pañol y reposición de materiales.',
            icon: <BookOpen className="text-blue-500" />,
            objectives: 'Asegurar la disponibilidad de repuestos e insumos críticos minimizando el capital inmovilizado.',
            responsible: 'Servicios Generales',
            scope: 'Recepción de mercadería, gestión de stock mínimo y entrega de insumos para órdenes de trabajo.',
            involvedAreas: ['Pañol', 'Compras', 'Mantenimiento'],
            inputs: [
                'Remitos de Proveedores',
                'Vales de salida (pedidos de taller)',
                'Auditorías periódicas'
            ],
            outputs: [
                'Inventario Actualizado',
                'Alertas de Pedido de Reposición',
                'Reporte de Valorización de Almacén'
            ],
            flowchart: [
                { label: 'Ingreso de Material (Remito)', color: 'bg-blue-600 text-white' },
                { label: 'Almacenamiento y Categorización', color: 'bg-blue-100 text-blue-800' },
                { label: 'Salida por OT/Mantenimiento', color: 'bg-slate-800 text-white' },
                { label: 'Control de Stock Crítico', color: 'bg-red-500 text-white' }
            ],
            fullDescription: 'El inventario debe estar sincronizado con el uso real en taller. Cada repuesto que sale debe estar vinculado a una OT para asegurar que el sistema actualice los niveles de stock automáticamente.',
            steps: [
                {
                    title: 'Stock Crítico',
                    content: 'Los items con bajo stock se resaltan automáticamente en la lista de inventario.',
                    graphicId: 'step1_stock'
                }
            ]
        },
        {
            id: 'logistics',
            title: 'Logística y Remitos de Salida',
            description: 'Gestión de asignación de activos a obras y generación de remitos.',
            icon: <Truck className="text-blue-600" />,
            objectives: 'Controlar de forma precisa el movimiento de activos desde la base hacia los diferentes proyectos/obras, documentando la salida mediante remitos legales y técnicos.',
            responsible: 'Servicios Generales',
            scope: 'Comprende desde la selección de activos para una obra hasta la generación, impresión y firma del remito de salida.',
            involvedAreas: ['Logística', 'Operaciones', 'Seguridad e Higiene'],
            inputs: [
                'Solicitud de activos de obra',
                'Plan de movilización',
                'Listado de activos en base (libres)'
            ],
            outputs: [
                'Remito de Salida (Formato Estandar)',
                'Activo asignado a locación destino',
                'Registro histórico de movimientos'
            ],
            flowchart: [
                { label: 'Selección de Activos en Stock', color: 'bg-blue-50 text-blue-700' },
                { label: 'Definición de Obra Destino', color: 'bg-slate-100 text-slate-600' },
                { label: 'Generación del Remito', color: 'bg-blue-600 text-white' },
                { label: 'Impresión y Firma Comprobante', color: 'bg-slate-800 text-white' },
                { label: 'Actualización en Tiempo Real', color: 'bg-green-500 text-white' }
            ],
            fullDescription: 'El proceso de Remitos de Salida asegura que ningún activo abandone la base sin un destino definido y un responsable asignado. Al generar un remito, el sistema actualiza automáticamente la ubicación del activo y genera el documento legal simplificado para el transporte.',
            steps: [
                {
                    title: 'Selección de Activos',
                    content: 'En el módulo de Logística, utiliza el formulario para añadir múltiples activos de la lista de equipos disponibles.',
                    graphicId: 'step1_logistics'
                },
                {
                    title: 'Generar Remito de Salida',
                    content: 'Completa los datos de la obra, transporte y personal. El sistema generará el remito con un ID único.',
                    graphicId: 'step2_remito'
                }
            ]
        },
        {
            id: 'mantenimiento',
            title: 'Planes de Mantenimiento',
            description: 'Programación preventiva, proyecciones por uso y generación automática de OTs.',
            icon: <Calendar className="text-indigo-600" />,
            objectives: 'Maximizar la disponibilidad de los activos mediante una programación técnica rigurosa basada en el tiempo o el uso real (km/horas).',
            responsible: 'Servicios Generales',
            scope: 'Desde la creación del plan anual para un activo hasta el seguimiento de eventos y la regularización de mantenimientos vencidos.',
            involvedAreas: ['Mantenimiento', 'Operaciones', 'Compras'],
            inputs: [
                'Manual del fabricante',
                'Uso acumulado del activo (Km/Horas)',
                'Frecuencia de base (ej: cada 250h)'
            ],
            outputs: [
                'Cronograma Anual de Eventos',
                'Alertas de Vencimiento Proactivo',
                'Órdenes de Trabajo de Preventivo'
            ],
            flowchart: [
                { label: 'Configuración de Activo y Frecuencia', color: 'bg-indigo-50 text-indigo-700' },
                { label: 'Generación de Proyección (IA/Manual)', color: 'bg-indigo-600 text-white' },
                { label: 'Monitoreo de Vencimientos', color: 'bg-slate-100 text-slate-600' },
                { label: 'Ejecución (Generar OT)', color: 'bg-orange-500 text-white' }
            ],
            fullDescription: 'El sistema permite crear planes inteligentes que "predicen" cuándo el activo necesitará servicio basándose en su ritmo de uso diario. Incluye un motor de IA para generar automáticamente las tareas técnicas según el modelo del equipo.',
            steps: [
                {
                    title: 'Definir Plan y Frecuencia',
                    content: 'Ingresa la frecuencia de corte (ej: cada 10.000 km) y el uso estimado diario. El sistema calculará las fechas probables de parada.',
                    graphicId: 'step1_plans'
                },
                {
                    title: 'Generar Proyección Técnica',
                    content: 'Utiliza el botón de IA o plantillas para cargar automáticamente la lista de servicios recomendados para ese modelo específico.',
                    graphicId: 'step2_projection'
                },
                {
                    title: 'Seguimiento y Ejecución',
                    content: 'El dashboard mostrará eventos "Programados" o "Vencidos". Al vencer, puedes generar la OT directamente para regularizar.',
                    graphicId: 'step3_execution'
                }
            ]
        },
        {
            id: 'assets',
            title: 'Alta de Activos',
            description: 'Registro de nuevos equipos, maquinaria e infraestructura en el sistema.',
            icon: <Plus className="text-green-600" />,
            objectives: 'Estandarizar el ingreso de información técnica y administrativa de los activos para asegurar su correcto seguimiento y mantenimiento.',
            responsible: 'Servicios Generales',
            scope: 'Desde la adquisición física del activo hasta su registro completo con código de barras y plan de mantenimiento inicial.',
            involvedAreas: ['Servicios Generales', 'Contabilidad', 'Operaciones'],
            inputs: [
                'Factura de compra / Documento de origen',
                'Manual técnico del fabricante',
                'Datos de garantía y seguros'
            ],
            outputs: [
                'Activo registrado con ID único',
                'Etiqueta de Código de Barras generada',
                'Ficha técnica digitalizada'
            ],
            flowchart: [
                { label: 'Recepción Física e Inspección', color: 'bg-slate-100 text-slate-600' },
                { label: 'Carga de Datos en App', color: 'bg-green-600 text-white' },
                { label: 'Asignación de Categoría/Obra', color: 'bg-green-100 text-green-800' },
                { label: 'Generación Códig. Barras', color: 'bg-slate-800 text-white' }
            ],
            fullDescription: 'El alta de un activo es el paso fundamental para la trazabilidad. Permite categorizar el equipo (Maquinaria, Vehículo, Instalación) y disparar los planes de mantenimiento preventivo desde el día cero.',
            steps: [
                {
                    title: 'Nuevo Registro',
                    content: 'Navega al panel de Activos y presiona el botón "+" para abrir el formulario de alta.',
                    graphicId: 'step1_new_asset'
                },
                {
                    title: 'Información Técnica',
                    content: 'Completa los campos de Marca, Modelo, Serie y Horas/Km iniciales para el seguimiento de vida útil.',
                    graphicId: 'step2_tech_sheet'
                },
                {
                    title: 'Identificación Visual',
                    content: 'Asigna la categoría y sube una foto. El sistema generará automáticamente el código de barras único.',
                    graphicId: 'step3_category_photo'
                }
            ]
        },
        {
            id: 'suppliers',
            title: 'Gestión de Proveedores',
            description: 'Registro técnico y evaluación de performance de prestadores externos.',
            icon: <Users className="text-blue-500" />,
            objectives: 'Centralizar la base de datos de proveedores y medir su calidad de servicio mediante evaluaciones periódicas.',
            responsible: 'Servicios Generales',
            scope: 'Desde el alta administrativa del proveedor hasta el seguimiento de su cumplimiento en las órdenes de trabajo.',
            involvedAreas: ['Servicios Generales', 'Compras', 'Mantenimiento'],
            inputs: [
                'Datos fiscales (CUIT/Razón Social)',
                'Certificaciones técnicas / Seguros',
                'Tarifarios de servicios'
            ],
            outputs: [
                'Legajo Digital de Proveedor',
                'Ranking de Performance (KPI)',
                'Historial de servicios realizados'
            ],
            flowchart: [
                { label: 'Alta en Base de Datos', color: 'bg-blue-50 text-blue-700' },
                { label: 'Asignación de Rubro/Servicio', color: 'bg-slate-100 text-slate-600' },
                { label: 'Ejecución de Trabajos', color: 'bg-orange-500 text-white' },
                { label: 'Evaluación post-Servicio', color: 'bg-green-600 text-white' }
            ],
            fullDescription: 'La gestión de proveedores no es solo una agenda; es una herramienta de auditoría. Permite calificar a cada proveedor en base a Calidad, Tiempo y Costo para optimizar la cadena de suministros.',
            steps: [
                {
                    title: 'Registro de Proveedor',
                    content: 'Ingresa los datos de contacto y rubro. Sube los documentos de seguros y ART para garantizar el ingreso a planta.',
                    graphicId: 'step1_supplier_reg'
                },
                {
                    title: 'Evaluación de Performance',
                    content: 'Al finalizar cada servicio o de forma mensual, completa el formulario de evaluación de 1 a 5 estrellas.',
                    graphicId: 'step2_supplier_eval'
                },
                {
                    title: 'Ranking y Decisiones',
                    content: 'Visualiza el promedio de satisfacción. Los mejores puntuados aparecerán resaltados para futuras contrataciones.',
                    graphicId: 'step3_supplier_ranking'
                }
            ]
        },
        {
            id: 'staff',
            title: 'Personal y Accesos',
            description: 'Gestión de colaboradores, permisos modulares y asignación de roles.',
            icon: <Users className="text-orange-600" />,
            objectives: 'Administrar el acceso seguro de los colaboradores a la plataforma según sus responsabilidades específicas.',
            responsible: 'Servicios Generales',
            scope: 'Desde el alta del colaborador hasta la configuración de sus permisos por módulo y obra asignada.',
            involvedAreas: ['Servicios Generales', 'Recursos Humanos', 'IT'],
            inputs: [
                'Datos personales y contacto',
                'Definición de rol operativo',
                'E-mail institucional'
            ],
            outputs: [
                'Usuario habilitado en App',
                'Matriz de permisos configurada',
                'Registro de actividad por usuario'
            ],
            flowchart: [
                { label: 'Alta de Colaborador', color: 'bg-orange-50 text-orange-700' },
                { label: 'Definición de Perfil/Rol', color: 'bg-slate-100 text-slate-600' },
                { label: 'Configuración Permisos', color: 'bg-orange-600 text-white' },
                { label: 'Acceso a la Plataforma', color: 'bg-green-600 text-white' }
            ],
            fullDescription: 'El módulo de Personal permite un control granular. Puedes definir quién ve qué módulos y en qué obras tiene permiso para operar, garantizando la seguridad de la información corporativa.',
            steps: [
                {
                    title: 'Ficha de Colaborador',
                    content: 'Completa los datos base y activa el switch de "Acceso a Sowic" para permitir el login.',
                    graphicId: 'step1_staff_card'
                },
                {
                    title: 'Matriz de Permisos',
                    content: 'Activa o desactiva módulos por cada usuario (Inventario, OT, Logística, etc.). El sistema aplicará los cambios al instante.',
                    graphicId: 'step2_staff_perms'
                }
            ]
        },
        {
            id: 'projects',
            title: 'Gestión de Obras',
            description: 'Control de locaciones operativas, centros de costo y trazabilidad de equipos.',
            icon: <Target className="text-red-500" />,
            objectives: 'Organizar los activos y el mantenimiento en base a proyectos específicos con seguimiento en tiempo real.',
            responsible: 'Servicios Generales',
            scope: 'Creación de obras, asignación de activos a locación y reportes de rentabilidad por centro de costo.',
            involvedAreas: ['Operaciones', 'Servicios Generales', 'Planeamiento'],
            inputs: [
                'Nombre y ubicación del proyecto',
                'Fechas de contrato',
                'Presupuesto de mantenimiento'
            ],
            outputs: [
                'Dashboard de Obra Activa',
                'Historial de costos por proyecto',
                'Certificación de servicios'
            ],
            flowchart: [
                { label: 'Alta de Obra/Proyecto', color: 'bg-red-50 text-red-700' },
                { label: 'Asignación de Equipos', color: 'bg-slate-100 text-slate-600' },
                { label: 'Control de Costos Directos', color: 'bg-red-600 text-white' },
                { label: 'Cierre y Auditoría', color: 'bg-slate-800 text-white' }
            ],
            fullDescription: 'Las "Obras" funcionan como el eje organizativo de Sowic. Permiten agrupar activos geográficamente y obtener reportes detallados de cuánto cuesta mantener la flota en cada proyecto específico.',
            steps: [
                {
                    title: 'Gestión de Proyectos',
                    content: 'Crea la ficha de la obra con su ubicación y estado. Esto habilitará la obra en los formularios de OT y Logística.',
                    graphicId: 'step1_project_card'
                }
            ]
        },
        {
            id: 'calendar',
            title: 'Calendario Operativo',
            description: 'Cronograma visual de mantenimientos, inspecciones y eventos programados.',
            icon: <Calendar className="text-indigo-600" />,
            objectives: 'Visualizar proactivamente la carga de trabajo técnica para evitar colisiones operativas y garantizar el preventivo.',
            responsible: 'Servicios Generales',
            scope: 'Seguimiento de fechas de mantenimiento, vencimientos de documentación y eventos de logística.',
            involvedAreas: ['Mantenimiento', 'Servicios Generales', 'Operaciones'],
            inputs: [
                'Planes de Mantenimiento activos',
                'Órdenes de Trabajo programadas',
                'Alertas de sistema'
            ],
            outputs: [
                'Cronograma Mensual/Semanal',
                'Planificación de paradas de equipo',
                'Optimización de recursos técnicos'
            ],
            flowchart: [
                { label: 'Sincronización de Planes', color: 'bg-indigo-50 text-indigo-700' },
                { label: 'Vista de Calendario', color: 'bg-slate-100 text-slate-600' },
                { label: 'Programación de Parada', color: 'bg-indigo-600 text-white' },
                { label: 'Confirmación de Ejecución', color: 'bg-green-600 text-white' }
            ],
            fullDescription: 'El Calendario es la "torre de control". Permite ver de un vistazo qué equipos están próximos a servicio y qué OTs están pendientes por cada obra o base.',
            steps: [
                {
                    title: 'Visión Calendario',
                    content: 'Visualiza de forma mensual o semanal todas las OTs programadas y vencimientos de mantenimiento.',
                    graphicId: 'step2_calendar_view'
                }
            ]
        }
    ];

    const currentTutorial = tutorials.find(t => t.id === selectedCategory);

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans">
            {/* Header */}
            <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex items-center justify-between">
                <button
                    onClick={() => selectedCategory ? setSelectedCategory(null) : navigate(-1)}
                    className="text-slate-600 p-2 -ml-2 rounded-full hover:bg-slate-50 transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
                <div className="flex items-center gap-2">
                    <HelpCircle size={20} className="text-orange-500" />
                    <h1 className="font-bold text-lg text-slate-800">Centro de Capacitación</h1>
                </div>
                <div className="w-10"></div>
            </div>

            <div className="p-6 max-w-4xl mx-auto">
                {!selectedCategory ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Hero Section */}
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                            <div className="relative z-10">
                                <h1 className="text-3xl font-black mb-2 tracking-tight">Manual de Procesos</h1>
                                <p className="text-slate-400 text-sm max-w-md">Estandarización de operaciones, responsabilidades y guías paso a paso para el uso profesional de Sowic App.</p>
                            </div>
                            <div className="absolute top-[-20%] right-[-10%] opacity-15">
                                <FileText size={180} />
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Busca un manual o proceso..."
                                className="w-full pl-12 pr-4 py-4 bg-white border-none rounded-2xl shadow-sm text-sm font-medium focus:ring-2 focus:ring-orange-200 outline-none"
                            />
                        </div>

                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pt-4 pl-2">Índice Operativo</h3>

                        <div className="grid md:grid-cols-2 gap-4">
                            {tutorials.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => { setSelectedCategory(item.id); setActiveTab('estructura'); }}
                                    className="bg-white p-6 rounded-3xl border border-slate-50 shadow-sm flex items-start gap-4 text-left hover:border-orange-200 hover:shadow-lg active:scale-[0.98] transition-all group relative overflow-hidden"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 group-hover:bg-orange-50 transition-colors">
                                        {item.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-800 text-base">{item.title}</h4>
                                        <p className="text-slate-500 text-[11px] mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
                                    </div>
                                    <ArrowRightCircle size={20} className="text-slate-300 absolute bottom-6 right-6 group-hover:text-orange-500 transition-colors" />
                                </button>
                            ))}
                        </div>

                        {/* Banner Obligatorio */}
                        <div className="bg-orange-50 p-6 rounded-[2rem] border border-orange-100 flex gap-4 items-center">
                            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white shrink-0 shadow-lg shadow-orange-200">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <p className="text-xs font-black text-orange-800 uppercase tracking-widest mb-1">Regla de Oro Operativa</p>
                                <p className="text-[13px] text-orange-700 font-medium italic">
                                    "Todo requerimiento debe nacer en Servicios. La trazabilidad es nuestro mayor activo."
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in slide-in-from-right-10 duration-500">
                        {/* Tutorial Header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-orange-500">
                                    {currentTutorial?.icon && React.cloneElement(currentTutorial.icon as React.ReactElement<any>, { size: 32 })}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 leading-none">{currentTutorial?.title}</h2>
                                    <p className="text-slate-400 text-xs mt-2 uppercase font-bold tracking-widest">Manual de Operación</p>
                                </div>
                            </div>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 sticky top-[72px] z-10 overflow-x-auto no-scrollbar">
                            <button
                                onClick={() => setActiveTab('estructura')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'estructura' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400'}`}
                            >
                                <Settings size={16} /> Estructura
                            </button>
                            <button
                                onClick={() => setActiveTab('logistica')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'logistica' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400'}`}
                            >
                                <Layers size={16} /> Logística
                            </button>
                            <button
                                onClick={() => setActiveTab('guia')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'guia' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400'}`}
                            >
                                <Smartphone size={16} /> Guía Visual
                            </button>
                        </div>

                        {/* Tab Content: Estructura */}
                        {activeTab === 'estructura' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Target size={20} className="text-orange-500" />
                                            <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Objetivos del Proceso</h4>
                                        </div>
                                        <p className="text-sm text-slate-600 leading-relaxed">{currentTutorial?.objectives}</p>
                                    </div>
                                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Users size={20} className="text-blue-500" />
                                            <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Responsable</h4>
                                        </div>
                                        <p className="text-sm text-slate-800 font-bold">{currentTutorial?.responsible}</p>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Compass size={20} className="text-green-500" />
                                        <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Alcance</h4>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed font-medium">{currentTutorial?.scope}</p>
                                </div>

                                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Layers size={20} className="text-purple-500" />
                                        <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Áreas Involucradas</h4>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {currentTutorial?.involvedAreas.map((area, i) => (
                                            <span key={i} className="px-3 py-1 bg-slate-50 text-slate-600 rounded-full text-[11px] font-bold border border-slate-100">{area}</span>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-slate-800 text-white p-8 rounded-[2rem] shadow-xl">
                                    <h4 className="font-bold text-sm uppercase tracking-widest mb-4 opacity-50">Descripción Detallada</h4>
                                    <p className="text-sm leading-relaxed opacity-90">{currentTutorial?.fullDescription}</p>
                                </div>
                            </div>
                        )}

                        {/* Tab Content: Logística */}
                        {activeTab === 'logistica' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="bg-orange-50/50 p-6 rounded-[2rem] border border-orange-100">
                                        <h4 className="font-bold text-orange-800 text-xs uppercase tracking-widest mb-4">Entradas del Proceso</h4>
                                        <ul className="space-y-3">
                                            {currentTutorial?.inputs.map((input, i) => (
                                                <li key={i} className="flex gap-2 text-xs font-semibold text-orange-900 leading-snug">
                                                    <span className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-1 shrink-0"></span> {input}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="bg-green-50/50 p-6 rounded-[2rem] border border-green-100">
                                        <h4 className="font-bold text-green-800 text-xs uppercase tracking-widest mb-4">Salidas del Proceso</h4>
                                        <ul className="space-y-3">
                                            {currentTutorial?.outputs.map((output, i) => (
                                                <li key={i} className="flex gap-2 text-xs font-semibold text-green-900 leading-snug">
                                                    <CheckCircle2 size={14} className="text-green-500 shrink-0" /> {output}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm overflow-x-auto no-scrollbar">
                                    <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-8 text-center">Diagrama de Flujo Informativo</h4>
                                    <div className="flex flex-col items-center min-w-[300px]">
                                        {currentTutorial?.flowchart.map((step, i) => (
                                            <React.Fragment key={i}>
                                                <div className={`p-4 rounded-2xl shadow-sm border border-slate-100 text-center font-bold text-xs max-w-xs w-full ${step.color}`}>
                                                    {step.label}
                                                </div>
                                                {i < currentTutorial.flowchart.length - 1 && (
                                                    <div className="py-2 text-slate-300">
                                                        <ArrowDown size={24} />
                                                    </div>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab Content: Guía Visual */}
                        {activeTab === 'guia' && (
                            <div className="space-y-12 pb-12 animate-in fade-in duration-300">
                                {currentTutorial?.steps.map((step, idx) => (
                                    <div key={idx} className="relative">
                                        {idx < currentTutorial.steps.length - 1 && (
                                            <div className="absolute left-[19px] top-10 bottom-[-40px] w-0.5 bg-slate-200"></div>
                                        )}
                                        <div className="flex gap-6">
                                            <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-black text-sm shrink-0 z-10 shadow-lg border-4 border-white">
                                                {idx + 1}
                                            </div>
                                            <div className="space-y-4 flex-1">
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-lg tracking-tight">{step.title}</h4>
                                                    <p className="text-sm text-slate-600 leading-relaxed mt-1">{step.content}</p>
                                                </div>
                                                <div className="bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                                                    <div className="aspect-video bg-slate-50 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden">
                                                        {/* High-Fidelity UI Mockups */}
                                                        {step.graphicId === 'step1_services' && (
                                                            <div className="w-full h-full flex items-center justify-center p-4">
                                                                <div className="w-full max-w-[240px] bg-slate-100 rounded-3xl p-4 shadow-inner space-y-3">
                                                                    <div className="flex justify-between items-center px-1">
                                                                        <div className="w-20 h-3 bg-slate-300 rounded-full"></div>
                                                                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-400"><Search size={14} /></div>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <div className="flex-1 bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
                                                                            <div className="flex items-center gap-1 mb-1"><Clock size={10} className="text-orange-500" /> <span className="text-[8px] font-bold text-slate-400">Pares</span></div>
                                                                            <div className="text-lg font-black text-slate-800 leading-none">12</div>
                                                                        </div>
                                                                        <div className="flex-1 bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
                                                                            <div className="flex items-center gap-1 mb-1"><CheckCircle2 size={10} className="text-green-500" /> <span className="text-[8px] font-bold text-slate-400">Hoy</span></div>
                                                                            <div className="text-lg font-black text-slate-800 leading-none">05</div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {step.graphicId === 'step2_create' && (
                                                            <div className="w-full h-full flex items-center justify-center p-6 relative">
                                                                <div className="w-full max-w-[200px] bg-white rounded-2xl shadow-xl border border-slate-100 p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                                                    <div className="w-full h-2 bg-slate-100 rounded"></div>
                                                                    <div className="space-y-1">
                                                                        <div className="w-full h-8 bg-slate-50 border border-slate-100 rounded-lg flex items-center px-2"><div className="w-16 h-1.5 bg-slate-200 rounded"></div></div>
                                                                        <div className="w-full h-8 bg-slate-50 border border-slate-100 rounded-lg flex items-center px-2"><div className="w-24 h-1.5 bg-slate-200 rounded"></div></div>
                                                                    </div>
                                                                    <div className="w-full h-8 bg-orange-500 rounded-lg flex items-center justify-center"><div className="w-12 h-1.5 bg-orange-200 rounded"></div></div>
                                                                </div>
                                                                <div className="absolute bottom-4 right-4 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-200 animate-pulse">
                                                                    <Plus size={24} />
                                                                </div>
                                                            </div>
                                                        )}

                                                        {step.graphicId === 'step3_track' && (
                                                            <div className="w-full h-full flex items-center justify-center p-4">
                                                                <div className="w-full max-w-[260px] bg-white p-4 rounded-3xl border border-orange-100 shadow-md relative overflow-hidden">
                                                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500"></div>
                                                                    <div className="flex justify-between items-start mb-2 pl-2">
                                                                        <div className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter">En Proceso</div>
                                                                        <div className="bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-full text-[8px] font-black flex items-center gap-1"><AlertTriangle size={8} /> CRÍTICA</div>
                                                                    </div>
                                                                    <div className="pl-2 mb-4">
                                                                        <div className="w-32 h-3 bg-slate-800 rounded mb-1"></div>
                                                                        <div className="w-24 h-2 bg-slate-400 rounded"></div>
                                                                    </div>
                                                                    <div className="pl-2">
                                                                        <div className="flex justify-between text-[8px] font-black text-slate-400 mb-1">
                                                                            <span>SLA TIME</span>
                                                                            <span className="text-orange-500">02:15 HS</span>
                                                                        </div>
                                                                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                                            <div className="h-full w-2/3 bg-orange-500 rounded-full"></div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {step.graphicId === 'step1_ot' && (
                                                            <div className="w-full h-full flex items-center justify-center p-4">
                                                                <div className="w-full max-w-[220px] bg-slate-900 rounded-3xl p-5 shadow-2xl space-y-4">
                                                                    <div className="flex justify-between items-start">
                                                                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white"><Wrench size={20} /></div>
                                                                        <div className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-[8px] font-black uppercase">Activa</div>
                                                                    </div>
                                                                    <div className="space-y-2 text-white">
                                                                        <div className="w-full h-3 bg-white/20 rounded"></div>
                                                                        <div className="w-2/3 h-2 bg-white/10 rounded"></div>
                                                                    </div>
                                                                    <div className="flex gap-2 pt-2">
                                                                        <div className="flex-1 h-6 bg-white/10 rounded-lg flex items-center justify-center"><div className="w-8 h-1 bg-white/20 rounded"></div></div>
                                                                        <div className="flex-1 h-6 bg-orange-500 rounded-lg flex items-center justify-center"><div className="w-8 h-1 bg-white/40 rounded"></div></div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {step.graphicId === 'step2_execute' && (
                                                            <div className="w-full h-full flex items-center justify-center p-4">
                                                                <div className="w-full max-w-[240px] space-y-3">
                                                                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                                                                        <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center"><Package size={20} /></div>
                                                                        <div className="flex-1">
                                                                            <div className="w-20 h-2 bg-slate-800 rounded mb-1"></div>
                                                                            <div className="w-12 h-1.5 bg-slate-400 rounded"></div>
                                                                        </div>
                                                                        <div className="text-xs font-black text-slate-800">x5</div>
                                                                    </div>
                                                                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 border-dashed border-2">
                                                                        <div className="w-10 h-10 bg-slate-50 text-slate-300 rounded-xl flex items-center justify-center"><Plus size={20} /></div>
                                                                        <div className="w-24 h-2 bg-slate-100 rounded"></div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {step.graphicId === 'step1_stock' && (
                                                            <div className="w-full h-full flex items-center justify-center p-4">
                                                                <div className="w-full max-w-[240px] bg-white p-5 rounded-3xl border border-red-50 shadow-lg relative animate-in zoom-in duration-300">
                                                                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"><AlertTriangle size={16} /></div>
                                                                    <div className="flex items-center gap-4 mb-4">
                                                                        <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center"><Layers size={24} /></div>
                                                                        <div>
                                                                            <div className="w-24 h-3 bg-slate-800 rounded mb-1"></div>
                                                                            <div className="w-16 h-2 bg-slate-400 rounded"></div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex justify-between items-center bg-red-50 p-3 rounded-2xl border border-red-100">
                                                                        <span className="text-[10px] font-black text-red-800">STOCK DISPONIBLE</span>
                                                                        <span className="text-lg font-black text-red-600">02</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {step.graphicId === 'step1_logistics' && (
                                                            <div className="w-full h-full flex items-center justify-center p-4">
                                                                <div className="w-full max-w-[260px] space-y-3">
                                                                    <div className="bg-white p-4 rounded-3xl border-2 border-orange-500 flex items-center gap-4 shadow-xl shadow-orange-100 relative translate-y-[-4px]">
                                                                        <div className="absolute top-[-8px] right-4 bg-orange-500 text-white px-2 py-0.5 rounded-full text-[6px] font-black shadow-lg">SELECCIONADO</div>
                                                                        <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center"><Truck size={20} /></div>
                                                                        <div className="flex-1"><div className="w-20 h-2.5 bg-slate-800 rounded mb-1"></div><div className="w-12 h-1.5 bg-slate-400 rounded"></div></div>
                                                                        <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white"><CheckCircle2 size={14} /></div>
                                                                    </div>
                                                                    <div className="bg-white p-4 rounded-3xl border border-slate-100 flex items-center gap-4 opacity-60">
                                                                        <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center"><Truck size={20} /></div>
                                                                        <div className="flex-1"><div className="w-24 h-2.5 bg-slate-800 rounded mb-1"></div><div className="w-16 h-1.5 bg-slate-400 rounded"></div></div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {step.graphicId === 'step2_remito' && (
                                                            <div className="w-full h-full flex items-center justify-center p-4">
                                                                <div className="w-full max-w-[220px] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden scale-110">
                                                                    <div className="bg-slate-800 p-3 flex justify-between items-center">
                                                                        <div className="w-12 h-1.5 bg-white/20 rounded"></div>
                                                                        <div className="w-4 h-4 bg-orange-500 rounded"></div>
                                                                    </div>
                                                                    <div className="p-4 space-y-3">
                                                                        <div className="flex gap-2"><div className="w-1/3 h-2 bg-slate-100 rounded"></div><div className="w-2/3 h-2 bg-slate-200 rounded"></div></div>
                                                                        <div className="flex gap-2"><div className="w-1/2 h-2 bg-slate-100 rounded"></div><div className="w-1/2 h-2 bg-slate-200 rounded"></div></div>
                                                                        <div className="h-[1px] w-full bg-slate-100 my-2"></div>
                                                                        <div className="space-y-1.5">
                                                                            <div className="w-full h-4 bg-slate-50 rounded border border-slate-100 flex items-center px-1"><div className="w-16 h-1 bg-slate-300 rounded"></div></div>
                                                                            <div className="w-full h-4 bg-slate-50 rounded border border-slate-100 flex items-center px-1"><div className="w-20 h-1 bg-slate-300 rounded"></div></div>
                                                                        </div>
                                                                        <div className="pt-2 flex justify-end">
                                                                            <div className="w-12 h-4 bg-blue-600 rounded flex items-center justify-center"><div className="w-6 h-1 bg-white/40 rounded"></div></div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {step.graphicId === 'step1_plans' && (
                                                            <div className="w-full h-full flex items-center justify-center p-4">
                                                                <div className="w-full max-w-[240px] bg-white p-5 rounded-3xl border border-indigo-100 shadow-xl space-y-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center"><Calendar size={20} /></div>
                                                                        <div className="flex-1">
                                                                            <div className="w-16 h-2 bg-indigo-200 rounded mb-1"></div>
                                                                            <div className="w-24 h-3 bg-slate-800 rounded"></div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-2 mt-4">
                                                                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                                                            <div className="text-[7px] font-black text-slate-400 mb-1 uppercase tracking-tighter leading-none">Último Service</div>
                                                                            <div className="text-[10px] font-black text-slate-700">12.500 KM</div>
                                                                        </div>
                                                                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                                                            <div className="text-[7px] font-black text-slate-400 mb-1 uppercase tracking-tighter leading-none">Frecuencia</div>
                                                                            <div className="text-[10px] font-black text-indigo-600">5.000 KM</div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {step.graphicId === 'step2_projection' && (
                                                            <div className="w-full h-full flex items-center justify-center p-4">
                                                                <div className="w-full max-w-[260px] space-y-2">
                                                                    <div className="bg-white p-3 rounded-2xl border border-indigo-50 shadow-sm flex items-center justify-between">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                                                                            <div className="w-24 h-2.5 bg-slate-800 rounded"></div>
                                                                        </div>
                                                                        <div className="w-12 h-1.5 bg-slate-200 rounded"></div>
                                                                    </div>
                                                                    <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg flex items-center justify-between translate-x-2">
                                                                        <div className="flex items-center gap-3">
                                                                            <Sparkles size={16} className="text-white animate-pulse" />
                                                                            <div className="w-20 h-2 bg-white/40 rounded"></div>
                                                                        </div>
                                                                        <div className="bg-white/20 px-2 py-1 rounded-lg text-[8px] font-black text-white uppercase">Sugerido</div>
                                                                    </div>
                                                                    <div className="bg-white p-3 rounded-2xl border border-indigo-50 shadow-sm flex items-center justify-between opacity-60">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                                                                            <div className="w-32 h-2.5 bg-slate-800 rounded"></div>
                                                                        </div>
                                                                        <div className="w-12 h-1.5 bg-slate-200 rounded"></div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {step.graphicId === 'step3_execution' && (
                                                            <div className="w-full h-full flex items-center justify-center p-4 relative">
                                                                <div className="w-full max-w-[240px] bg-red-50 p-5 rounded-3xl border border-red-100 shadow-md">
                                                                    <div className="flex justify-between items-start mb-4">
                                                                        <div className="bg-red-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase shadow-sm">Vencido</div>
                                                                        <div className="text-[10px] font-black text-red-600">Hace 12 días</div>
                                                                    </div>
                                                                    <div className="w-40 h-3 bg-red-900/10 rounded mb-2"></div>
                                                                    <div className="flex items-center gap-2 text-[10px] font-medium text-red-500 mb-6">
                                                                        <Timer size={12} /> <div className="w-20 h-1.5 bg-red-200 rounded"></div>
                                                                    </div>
                                                                    <div className="w-full h-10 bg-slate-900 rounded-2xl flex items-center justify-center gap-2 text-white shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-700">
                                                                        <Wrench size={16} className="text-orange-500" />
                                                                        <span className="text-[10px] font-black uppercase tracking-widest">Generar OT</span>
                                                                    </div>
                                                                </div>
                                                                <div className="absolute top-4 right-8 w-1 h-32 bg-indigo-500/10 rounded-full"></div>
                                                            </div>
                                                        )}

                                                        {step.graphicId === 'step1_new_asset' && (
                                                            <div className="w-full h-full flex items-center justify-center p-4">
                                                                <div className="w-full max-w-[220px] bg-white rounded-3xl p-6 shadow-xl border border-slate-100 relative">
                                                                    <div className="space-y-4">
                                                                        <div className="flex justify-between items-center">
                                                                            <div className="w-16 h-2 bg-slate-200 rounded"></div>
                                                                            <div className="w-6 h-6 bg-green-50 text-green-500 rounded-full flex items-center justify-center"><Search size={12} /></div>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <div className="w-full h-10 bg-slate-50 rounded-xl"></div>
                                                                            <div className="w-full h-10 bg-slate-50 rounded-xl"></div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-green-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-100 animate-bounce">
                                                                        <Plus size={24} />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {step.graphicId === 'step2_tech_sheet' && (
                                                            <div className="w-full h-full flex items-center justify-center p-4">
                                                                <div className="w-full max-w-[240px] bg-white rounded-[2rem] p-5 shadow-2xl border border-slate-100 space-y-4">
                                                                    <div className="w-24 h-3 bg-slate-800 rounded mb-6"></div>
                                                                    <div className="space-y-3">
                                                                        <div className="space-y-1">
                                                                            <div className="w-10 h-1.5 bg-slate-300 rounded ml-1"></div>
                                                                            <div className="w-full h-8 bg-slate-50 rounded-lg border border-slate-200 flex items-center px-2">
                                                                                <div className="w-20 h-2 bg-slate-400 rounded"></div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="space-y-1 text-green-600">
                                                                            <div className="w-10 h-1.5 bg-green-200 rounded ml-1"></div>
                                                                            <div className="w-full h-8 bg-green-50 rounded-lg border border-green-200 flex items-center px-2">
                                                                                <div className="w-24 h-2 bg-green-400 rounded"></div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="w-full h-10 bg-slate-900 rounded-xl mt-4"></div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {step.graphicId === 'step3_category_photo' && (
                                                            <div className="w-full h-full flex items-center justify-center p-4">
                                                                <div className="w-full max-w-[200px] bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-100">
                                                                    <div className="aspect-square bg-slate-200 flex items-center justify-center text-slate-400 relative">
                                                                        <Bot size={48} />
                                                                        <div className="absolute top-3 left-3 bg-green-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase">Maquinaria</div>
                                                                    </div>
                                                                    <div className="p-4 space-y-3 text-center">
                                                                        <div className="w-full h-6 bg-slate-100 rounded-lg flex items-center justify-center gap-1 overflow-hidden">
                                                                            <div className="w-0.5 h-4 bg-slate-800"></div><div className="w-1 h-4 bg-slate-800"></div><div className="w-0.5 h-4 bg-slate-800"></div><div className="w-1.5 h-4 bg-slate-800"></div><div className="w-0.5 h-4 bg-slate-800"></div><div className="w-1 h-4 bg-slate-800"></div>
                                                                        </div>
                                                                        <div className="text-[10px] font-black text-slate-800 tracking-tighter">ID: ASSET-7729</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {step.graphicId === 'step1_supplier_reg' && (
                                                            <div className="w-full h-full flex items-center justify-center p-4">
                                                                <div className="w-full max-w-[240px] bg-white rounded-3xl p-5 shadow-lg border border-slate-100 space-y-4">
                                                                    <div className="flex items-center gap-3 mb-2">
                                                                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Users size={20} /></div>
                                                                        <div className="w-24 h-3 bg-slate-800 rounded"></div>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <div className="h-2 w-3/4 bg-slate-100 rounded"></div>
                                                                        <div className="h-2 w-full bg-slate-50 rounded"></div>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <div className="flex-1 h-8 bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-center"><FileText size={12} className="text-blue-400" /></div>
                                                                        <div className="flex-1 h-8 bg-blue-600 rounded-lg flex items-center justify-center"><div className="w-8 h-1 bg-white/40 rounded"></div></div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {step.graphicId === 'step2_supplier_eval' && (
                                                            <div className="w-full h-full flex items-center justify-center p-4">
                                                                <div className="w-full max-w-[260px] bg-slate-50 p-6 rounded-[2.5rem] shadow-inner space-y-4">
                                                                    <div className="text-center space-y-1">
                                                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Post-Servicio</div>
                                                                        <div className="text-xs font-bold text-slate-800">¿Cómo calificaría al proveedor?</div>
                                                                    </div>
                                                                    <div className="flex justify-center gap-2">
                                                                        {[1, 2, 3, 4, 5].map(i => (
                                                                            <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center ${i <= 4 ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                                                                <Sparkles size={14} />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    <div className="bg-white p-3 rounded-2xl border border-slate-200 text-[8px] italic text-slate-400">Excelente predisposición y tiempo...</div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {step.graphicId === 'step3_supplier_ranking' && (
                                                            <div className="w-full h-full flex items-center justify-center p-4">
                                                                <div className="w-full max-w-[240px] space-y-3">
                                                                    <div className="bg-white p-4 rounded-3xl border-2 border-green-500 shadow-xl shadow-green-50 flex items-center gap-4 relative animate-in slide-in-from-left duration-500">
                                                                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg font-black text-[10px]">#1</div>
                                                                        <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center font-black">P1</div>
                                                                        <div className="flex-1">
                                                                            <div className="w-20 h-2.5 bg-slate-800 rounded mb-1"></div>
                                                                            <div className="flex gap-1 text-orange-400"><Sparkles size={8} /><Sparkles size={8} /><Sparkles size={8} /><Sparkles size={8} /><Sparkles size={8} /></div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="bg-white p-4 rounded-3xl border border-slate-100 flex items-center gap-4 opacity-70">
                                                                        <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center font-black">P2</div>
                                                                        <div className="flex-1">
                                                                            <div className="w-24 h-2.5 bg-slate-800 rounded mb-1"></div>
                                                                            <div className="flex gap-1 text-orange-400 opacity-40"><Sparkles size={8} /><Sparkles size={8} /><Sparkles size={8} /></div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {step.graphicId === 'step1_staff_card' && (
                                                            <div className="w-full h-full flex items-center justify-center p-4">
                                                                <div className="w-full max-w-[240px] bg-white rounded-3xl p-5 shadow-lg border border-slate-100 space-y-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400"><Users size={24} /></div>
                                                                        <div className="space-y-1">
                                                                            <div className="w-24 h-3 bg-slate-800 rounded"></div>
                                                                            <div className="w-16 h-2 bg-slate-400 rounded"></div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl">
                                                                        <div className="w-20 h-2 bg-slate-300 rounded"></div>
                                                                        <div className="w-8 h-4 bg-orange-500 rounded-full relative">
                                                                            <div className="absolute right-1 top-1 w-2 h-2 bg-white rounded-full"></div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {step.graphicId === 'step2_staff_perms' && (
                                                            <div className="w-full h-full flex items-center justify-center p-4">
                                                                <div className="w-full max-w-[220px] bg-white rounded-2xl shadow-xl border border-slate-100 p-4 space-y-2">
                                                                    {[1, 2, 3].map(i => (
                                                                        <div key={i} className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-50">
                                                                            <div className="w-16 h-2 bg-slate-700 rounded"></div>
                                                                            <div className={`w-3 h-3 rounded ${i < 3 ? 'bg-orange-500' : 'bg-slate-200'}`}></div>
                                                                        </div>
                                                                    ))}
                                                                    <div className="pt-2 border-top border-slate-100">
                                                                        <div className="w-full h-8 bg-slate-900 rounded-lg flex items-center justify-center"><div className="w-12 h-1 bg-white/30 rounded"></div></div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {step.graphicId === 'step1_project_card' && (
                                                            <div className="w-full h-full flex items-center justify-center p-4">
                                                                <div className="w-full max-w-[260px] bg-white rounded-3xl border border-red-100 shadow-xl overflow-hidden">
                                                                    <div className="h-2 w-full bg-red-500"></div>
                                                                    <div className="p-5 space-y-4">
                                                                        <div className="flex justify-between items-center">
                                                                            <div className="w-24 h-4 bg-slate-800 rounded font-black uppercase text-[10px] flex items-center px-1">Obra Norte II</div>
                                                                            <div className="bg-green-50 text-green-600 px-2 py-0.5 rounded text-[8px] font-black uppercase">Activa</div>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <div className="flex gap-2"><div className="w-4 h-4 rounded bg-slate-100"></div><div className="w-32 h-2 bg-slate-300 rounded self-center"></div></div>
                                                                            <div className="flex gap-2"><div className="w-4 h-4 rounded bg-slate-100"></div><div className="w-20 h-2 bg-slate-300 rounded self-center"></div></div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {step.graphicId === 'step2_calendar_view' && (
                                                            <div className="w-full h-full flex items-center justify-center p-4">
                                                                <div className="w-full max-w-[240px] bg-white rounded-3xl p-4 shadow-xl border border-slate-100">
                                                                    <div className="flex justify-between items-center mb-4">
                                                                        <div className="w-12 h-2 bg-slate-800 rounded"></div>
                                                                        <div className="flex gap-1"><div className="w-4 h-2 bg-slate-100 rounded"></div><div className="w-4 h-2 bg-slate-100 rounded"></div></div>
                                                                    </div>
                                                                    <div className="grid grid-cols-7 gap-1">
                                                                        {Array.from({ length: 14 }).map((_, i) => (
                                                                            <div key={i} className={`aspect-square rounded-lg flex flex-col items-center justify-center relative ${i === 8 ? 'bg-orange-100' : 'bg-slate-50'}`}>
                                                                                <div className="w-2 h-0.5 bg-slate-300 rounded mb-1"></div>
                                                                                {i === 8 && <div className="absolute bottom-1 w-1 h-1 bg-orange-500 rounded-full animate-ping"></div>}
                                                                                {i === 3 && <div className="absolute bottom-1 w-1 h-1 bg-red-500 rounded-full"></div>}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest absolute bottom-4">
                                                            <MousePointer2 size={12} /> Sowic Interactive Guide
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Back Button */}
                        <div className="pt-8 pb-12">
                            <button
                                onClick={() => setSelectedCategory(null)}
                                className="w-full bg-white text-slate-800 py-4 rounded-[1.5rem] font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors border border-slate-100 shadow-sm"
                            >
                                <ChevronLeft size={18} /> Volver al Índice Principal
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HelpPage;
