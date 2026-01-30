
import { Asset, AssetStatus, InventoryItem, Project, Staff, WorkOrder, WorkOrderPriority, WorkOrderStatus, Provider, ServiceRequest, Transfer, AssetAllocation, MaintenancePlan, Checklist } from './types';

export const MOCK_ASSETS: Asset[] = [
  {
    id: '1',
    internalId: 'MAQ-NH-04',
    barcodeId: '1001',
    name: 'Retroexcavadora New Holland B90B',
    type: 'Maquinaria',
    description: 'Retroexcavadora 4x4 con brazo extensible',
    status: AssetStatus.OPERATIONAL,
    ownership: 'Propio',
    hours: 4250,
    location: 'Chubut - Parque Eólico',
    responsible: 'Operador Juan Ruiz',
    image: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&q=80&w=400',
    brand: 'New Holland',
    model: 'B90B',
    serial: 'NHB90B8892',
    year: 2021,
    dailyRate: 180000,
    value: 85000000, // Valor Razonable
    accountingAccount: '1.04.02.001 - Maquinaria Pesada',
    functionalDescription: 'Excavación, carga y zanjeo en obra civil.',
    complementaryDescription: 'Incluye kit de martillo hidráulico y aire acondicionado en cabina.',
    originYear: 2021,
    usefulLifeRemaining: 8,
    tti: 12.5,
    domainNumber: 'AE-123-BC',
    expirations: [
      { id: 'e1', type: 'Seguro', expirationDate: '2024-12-31', notes: 'Poliza Mercantil Andina' },
      { id: 'e2', type: 'Certificación', expirationDate: '2024-06-15', notes: 'Certificación de Izaje' }
    ],
    averageDailyUsage: 8 // Hours per day
  },
  {
    id: '2',
    internalId: 'VHL-TYT-12',
    barcodeId: '1002',
    name: 'Toyota Hilux SRX 4x4',
    type: 'Rodados',
    description: 'Camioneta Doble Cabina para supervisión',
    status: AssetStatus.ON_SITE,
    ownership: 'Propio',
    hours: 45000, // This is KM for vehicles
    location: 'San Juan - Barreal',
    responsible: 'Ing. Carlos Mendez',
    image: 'https://images.unsplash.com/photo-1566008885218-90abf9200ddb?auto=format&fit=crop&q=80&w=400',
    brand: 'Toyota',
    model: 'Hilux SRX',
    serial: 'TYT773829',
    year: 2023,
    dailyRate: 75000,
    value: 42000000,
    accountingAccount: '1.04.01.005 - Rodados',
    functionalDescription: 'Traslado de personal técnico y herramientas livianas.',
    complementaryDescription: 'Equipada con jaula antivuelco interna y sistema de seguimiento satelital.',
    originYear: 2023,
    usefulLifeRemaining: 4,
    tti: 15.0,
    domainNumber: 'AF-456-DD',
    expirations: [
      { id: 'e1', type: 'ITV', expirationDate: '2024-05-20', notes: 'Revisión técnica obligatoria' },
      { id: 'e2', type: 'Seguro', expirationDate: '2024-11-30', notes: 'Seguro contra todo riesgo' },
      { id: 'e3', type: 'Cédula Verde', expirationDate: '2025-01-15', notes: 'Vencimiento cédula autorizado' }
    ],
    averageDailyUsage: 120 // KM per day
  },
  {
    id: '3',
    internalId: 'ALQ-GEN-01',
    barcodeId: '', // No internal barcode for rented
    name: 'Generador Cummins 110kVA',
    type: 'Maquinaria',
    description: 'Generador Estacionario Alquilado',
    status: AssetStatus.ON_SITE,
    ownership: 'Alquilado',
    supplier: 'Sullair Argentina',
    hours: 1250,
    location: 'Obra Córdoba Capital',
    responsible: 'Jefe de Obra',
    image: 'https://images.unsplash.com/photo-1455386866442-7d22e0325493?auto=format&fit=crop&q=80&w=400',
    brand: 'Cummins',
    model: 'C110D5',
    serial: 'CUM-99283-RENT',
    year: 2022,
    dailyRate: 45000,
    value: 0,
    accountingAccount: '5.02.01.010 - Alquileres de Equipos',
    functionalDescription: 'Provisión de energía eléctrica temporal en obra.',
    complementaryDescription: 'Contrato marco #2023-992. Incluye mantenimiento por proveedor.',
    originYear: 2023,
    usefulLifeRemaining: 0,
    tti: 0,
    expirations: [],
    averageDailyUsage: 12
  },
  {
    id: '4',
    internalId: 'INF-NAV-01',
    barcodeId: '9001',
    name: 'Nave Industrial Central',
    type: 'Instalaciones en infraestructuras',
    description: 'Depósito principal y taller de reparaciones.',
    status: AssetStatus.OPERATIONAL,
    ownership: 'Propio',
    hours: 0,
    location: 'Base Operativa - Córdoba',
    responsible: 'Gerente de Mantenimiento',
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=400',
    brand: 'N/A',
    model: 'Infraestructura',
    serial: 'N/A',
    year: 2015,
    dailyRate: 0,
    value: 150000000,
    accountingAccount: '1.02.01.001 - Inmuebles',
    originYear: 2015,
    usefulLifeRemaining: 40,
    tti: 0,
    regulatoryData: {
      pat: { lastDate: '2023-12-10', expirationDate: '2024-12-10', value: '3.2 Ohm', status: 'Vigente' },
      lighting: { lastDate: '2023-06-15', expirationDate: '2024-06-15', avgLux: 450, status: 'Vigente' },
      ergonomics: { lastDate: '2022-03-01', expirationDate: '2024-03-01', riskLevel: 'Bajo', status: 'Vencido' }
    }
  }
];

export const MOCK_PROJECTS: Project[] = [
  { id: '1', internalId: 'PRJ-24-001', name: 'Parque Eólico Chubut', responsible: 'Ing. Roberto Gómez', status: 'Activa', location: 'Chubut, Argentina', assignedAssets: 12, assignedStaff: 45 },
  { id: '2', internalId: 'PRJ-24-003', name: 'Torre Central Córdoba', responsible: 'Arq. Laura Silva', status: 'Activa', location: 'Córdoba Capital', assignedAssets: 5, assignedStaff: 20 },
  { id: '3', internalId: 'PRJ-23-015', name: 'Ruta Provincial 12', responsible: 'Ing. Pedro Almunia', status: 'Cerrada', location: 'Santa Fe', assignedAssets: 0, assignedStaff: 0 },
];

export const MOCK_STAFF: Staff[] = [
  { id: '1', name: 'Juan Pérez', role: 'Operador Maquinaria', status: 'En Obra', location: 'Parque Eólico Chubut', avatar: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&q=80&w=100', assignedAssets: ['1'], email: 'juan.perez@sowic.com', phone: '+54 9 11 1234 5678' },
  { id: '2', name: 'Carlos Mendez', role: 'Supervisor de Obra', status: 'En Obra', location: 'San Juan - Barreal', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=100', assignedAssets: ['2'], email: 'carlos.mendez@sowic.com', phone: '+54 9 11 8765 4321' },
  { id: '3', name: 'Ana Lopez', role: 'Jefa de Taller', status: 'Disponible', location: 'Base Central', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100', assignedAssets: [], email: 'ana.lopez@sowic.com', phone: '+54 9 11 1122 3344' },
];

export const MOCK_INVENTORY: InventoryItem[] = [
  { id: '1', barcodeId: '2001', name: 'Filtro Aceite Motor NH', category: 'Consumibles', type: 'Consumible', quantity: 12, minThreshold: 5, location: 'Pañol Central', unitPrice: 15000, status: 'Disponible' },
  { id: '2', barcodeId: '3005', name: 'Taladro Percutor Dewalt', category: 'Herramientas', type: 'Serializado', quantity: 1, minThreshold: 0, location: 'Pañol Central', unitPrice: 120000, serialNumber: 'DW-99283-X', status: 'Disponible' },
  { id: '3', barcodeId: '2005', name: 'Casco Seguridad Amarillo', category: 'Seguridad', type: 'Consumible', quantity: 45, minThreshold: 10, location: 'Pañol Central', unitPrice: 8500, status: 'Disponible' },
];

export const MOCK_PROVIDERS: Provider[] = [
  { id: '1', companyName: 'Sullair Argentina', contactName: 'Marcos Ventas', serviceType: 'Alquiler de Maquinaria', rating: 5, status: 'Activo' },
  { id: '2', companyName: 'Mercantil Andina', contactName: 'Soporte Seguros', serviceType: 'Seguros', rating: 4, status: 'Activo' },
  { id: '3', companyName: 'Ferretería Industrial Norte', contactName: 'Luis', serviceType: 'Insumos', rating: 3, status: 'Activo' },
];

export const MOCK_WORK_ORDERS: WorkOrder[] = [
  {
    id: 'OT-2024-101',
    title: 'Service 500hs Retroexcavadora',
    assetId: '1',
    assetName: 'Retroexcavadora New Holland B90B',
    status: WorkOrderStatus.PENDING,
    priority: WorkOrderPriority.HIGH,
    dateStart: '2024-05-25',
    responsible: 'Ana Lopez',
    description: 'Realizar cambio de aceite motor, filtros de combustible y aire. Verificar sistema hidráulico.',
    updates: [
      { id: 'u1', date: '2024-05-24 10:00', user: 'Ana Lopez', comment: 'OT Creada. Esperando repuestos.', newStatus: WorkOrderStatus.PENDING }
    ],
    expenses: []
  },
  {
    id: 'OT-2024-098',
    title: 'Reparación Cubierta Delantera',
    assetId: '2',
    assetName: 'Toyota Hilux SRX 4x4',
    status: WorkOrderStatus.IN_PROGRESS,
    priority: WorkOrderPriority.MEDIUM,
    dateStart: '2024-05-24',
    responsible: 'Carlos Mendez',
    description: 'Pinchadura en cubierta delantera derecha. Enviar a gomería local.',
    updates: [],
    expenses: []
  }
];

export const MOCK_SERVICES: ServiceRequest[] = [
  { id: 'SR-001', title: 'Falla Aire Acondicionado', category: 'HVAC', priority: 'Media', status: 'Pendiente', location: 'Oficina Técnica', slaDeadline: '48hs', description: 'El equipo no enfría correctamente.' },
  { id: 'SR-002', title: 'Corte de Energía Sector B', category: 'Eléctrico', priority: 'Crítica', status: 'En Proceso', location: 'Taller Central', slaDeadline: '4hs', description: 'Tablero seccional saltó y no rearma.' }
];

export const MOCK_TRANSFERS: Transfer[] = [
  { id: 'TR-8821', assetName: 'Retroexcavadora New Holland B90B', fromLocation: 'Pañol Central', toLocation: 'Parque Eólico Chubut', date: '2024-05-10', status: 'Completado', meterReading: 4200 },
  { id: 'TR-8825', assetName: 'Generador Cummins 110kVA', fromLocation: 'Sullair Argentina', toLocation: 'Obra Córdoba Capital', date: '2024-05-15', status: 'Completado', meterReading: 1240 }
];

export const MOCK_ALLOCATIONS: AssetAllocation[] = [
  { id: 'AL-101', assetId: '1', assetName: 'Retroexcavadora New Holland B90B', projectId: '1', projectName: 'Parque Eólico Chubut', startDate: '2024-05-10', endDate: '2024-08-10', status: 'Activo' },
  { id: 'AL-102', assetId: '3', assetName: 'Generador Cummins 110kVA', projectId: '2', projectName: 'Torre Central Córdoba', startDate: '2024-05-15', endDate: '2024-09-15', status: 'Activo' }
];

export const MOCK_MAINTENANCE_PLANS: MaintenancePlan[] = [
  {
    id: 'MP-001',
    assetId: '1',
    assetName: 'Retroexcavadora New Holland B90B',
    title: 'Plan Anual Preventivo 2024',
    baseFrequency: 250,
    baseFrequencyUnit: 'Horas',
    frequencyTimeValue: 6,
    frequencyTimeUnit: 'Meses',
    dailyUsageEstimate: 8,
    events: [
      { id: 'evt-1', title: 'Service 250 Horas', estimatedDate: '2024-03-15', status: 'Completado', triggerValue: 250, tasks: [] },
      { id: 'evt-2', title: 'Service 500 Horas', estimatedDate: '2024-05-20', status: 'Programado', triggerValue: 500, tasks: [{ id: 't1', description: 'Cambio Aceite Motor', durationDays: 1, isCritical: true }] }
    ],
    notes: 'Plan estándar del fabricante.'
  }
];

export const MOCK_CHECKLISTS: Checklist[] = [
  {
    id: 'CHK-0042',
    assetId: '1',
    assetName: 'Retroexcavadora New Holland B90B',
    date: '2024-05-18',
    inspector: 'Juan Pérez',
    conformity: 92,
    items: []
  }
];
