
export interface ChecklistTemplateItem {
    id: string;
    category: string;
    label: string;
}

export interface ChecklistTemplate {
    id: string;
    name: string;
    description: string;
    type: 'Semanal' | 'Completo';
    assetType: 'Rodados' | 'Maquinaria' | 'Equipos de Informática' | 'Instalaciones en infraestructuras' | 'Mobiliario' | 'Otros';
    items: ChecklistTemplateItem[];
}

export const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
    {
        id: 'semanal-rodados',
        name: 'Checklist Semanal',
        description: 'Control rápido de niveles, luces y estado general para uso frecuente.',
        type: 'Semanal',
        assetType: 'Rodados',
        items: [
            { id: 'rs-1', category: 'Niveles', label: 'Nivel de Aceite de Motor' },
            { id: 'rs-2', category: 'Niveles', label: 'Nivel de Líquido Refrigerante' },
            { id: 'rs-3', category: 'Niveles', label: 'Nivel de Líquido de Frenos / Dirección' },
            { id: 'rs-4', category: 'Seguridad', label: 'Funcionamiento de Luces (Bajas, Altas, Giros)' },
            { id: 'rs-5', category: 'Seguridad', label: 'Funcionamiento de Limpiaparabrisas' },
            { id: 'rs-6', category: 'Estado General', label: 'Presión y Estado de Neumáticos' },
            { id: 'rs-7', category: 'Estado General', label: 'Limpieza Exterior e Interior' }
        ]
    },
    {
        id: 'completo-rodados',
        name: 'Inspección Completa',
        description: 'Control profundo técnico, de seguridad y documentación obligatoria.',
        type: 'Completo',
        assetType: 'Rodados',
        items: [
            { id: 'rc-1', category: 'Documentación', label: 'Tarjeta Verde / Azul Vigente' },
            { id: 'rc-2', category: 'Documentación', label: 'Seguro Obligatorio y Comprobante de Pago' },
            { id: 'rc-3', category: 'Documentación', label: 'VTV / ITV Vigente' },
            { id: 'rc-4', category: 'Equipamiento', label: 'Matafuego (Carga y Vencimiento)' },
            { id: 'rc-5', category: 'Equipamiento', label: 'Balizas Portátiles y Chaleco Reflejante' },
            { id: 'rc-6', category: 'Equipamiento', label: 'Neumático de Auxilio, Crique y Llave de Cruz' },
            { id: 'rc-7', category: 'Mecánica', label: 'Estado de Correas y Mangueras' },
            { id: 'rc-8', category: 'Mecánica', label: 'Estado de Frenos (Pastillas/Discos)' },
            { id: 'rc-9', category: 'Mecánica', label: 'Pérdidas de Fluidos' },
            { id: 'rc-10', category: 'Sistemas', label: 'Frenos de Aire (Pérdidas y Presión)' },
            { id: 'rc-11', category: 'Seguridad', label: 'Estado de Quinta Rueda / Enganche' },
            { id: 'rc-12', category: 'Documentación', label: 'RUTA y Habilitación de Carga (Pesados)' },
            { id: 'rc-13', category: 'Carrocería', label: 'Estado de Espejos y Cristales' }
        ]
    },
    {
        id: 'semanal-maquinaria',
        name: 'Checklist Semanal',
        description: 'Control de puntos críticos y engrase para maquinaria.',
        type: 'Semanal',
        assetType: 'Maquinaria',
        items: [
            { id: 'ms-1', category: 'Motor', label: 'Niveles de Aceite y Refrigerante' },
            { id: 'ms-2', category: 'Hidráulica', label: 'Nivel de Aceite Hidráulico' },
            { id: 'ms-3', category: 'Hidráulica', label: 'Verificación de Mangueras y Cilindros' },
            { id: 'ms-4', category: 'Engrase', label: 'Puntos de Engrase Críticos' },
            { id: 'ms-5', category: 'Estructura', label: 'Pernos, Chavetas y Protecciones' },
            { id: 'ms-6', category: 'Operación', label: 'Funcionamiento de Alarmas y Alarma de Retroceso' }
        ]
    },
    {
        id: 'completo-maquinaria',
        name: 'Inspección Completa',
        description: 'Revisión técnica profunda de componentes mayores y sistemas de seguridad.',
        type: 'Completo',
        assetType: 'Maquinaria',
        items: [
            { id: 'mc-1', category: 'Sistemas', label: 'Sistema Eléctrico (Carga y Baterías)' },
            { id: 'mc-2', category: 'Sistemas', label: 'Sistema de Frenos de Estacionamiento y Servicio' },
            { id: 'mc-3', category: 'Mecánica', label: 'Estado de Filtros (Aire, Aceite, Combustible)' },
            { id: 'mc-4', category: 'Mecánica', label: 'Transmisión / Mandos Finales' },
            { id: 'mc-5', category: 'Seguridad', label: 'Estructura ROPS/FOPS' },
            { id: 'mc-6', category: 'Seguridad', label: 'Estado de Cinturón de Seguridad y Asiento' }
        ]
    },
    {
        id: 'riguroso-rodados',
        name: 'Inspección Técnica Rigurosa',
        description: 'Control exhaustivo de taller incluyendo fluidos, sistema hidráulico y estado estructural.',
        type: 'Completo',
        assetType: 'Rodados',
        items: [
            { id: 'tr-1', category: 'Cabina y Seguridad', label: 'Limpieza General e Higiene' },
            { id: 'tr-2', category: 'Cabina y Seguridad', label: 'Cinturones de Seguridad y Anclajes' },
            { id: 'tr-3', category: 'Cabina y Seguridad', label: 'Extintor (Carga/Vencimiento)' },
            { id: 'tr-4', category: 'Cabina y Seguridad', label: 'Espejos Retrovisores y Cristales' },
            { id: 'tr-5', category: 'Cabina y Seguridad', label: 'Bocina y Alarma de Retroceso' },
            { id: 'tr-6', category: 'Motor y Fluidos', label: 'Nivel Aceite Motor' },
            { id: 'tr-7', category: 'Motor y Fluidos', label: 'Nivel Líquido Refrigerante' },
            { id: 'tr-8', category: 'Motor y Fluidos', label: 'Estado de Correas y Tensores' },
            { id: 'tr-9', category: 'Motor y Fluidos', label: 'Fugas Visibles (Agua/Aceite/Combustible)' },
            { id: 'tr-10', category: 'Motor y Fluidos', label: 'Filtro de Aire (Indicador de Restricción)' },
            { id: 'tr-11', category: 'Eléctrico', label: 'Batería (Bornes, Sujeción y Carga)' },
            { id: 'tr-12', category: 'Eléctrico', label: 'Luces Delanteras (Alta, Baja y Posición)' },
            { id: 'tr-13', category: 'Eléctrico', label: 'Luces Traseras (Giro, Freno y Reversa)' },
            { id: 'tr-14', category: 'Eléctrico', label: 'Tablero de Instrumentos y Testigos' },
            { id: 'tr-15', category: 'Estructura y Rodado', label: 'Presión y Estado de Neumáticos' },
            { id: 'tr-16', category: 'Estructura y Rodado', label: 'Ajuste de Pernos de Rueda' },
            { id: 'tr-17', category: 'Estructura y Rodado', label: 'Engrase General de Chasis' }
        ]
    },
    {
        id: 'riguroso-maquinaria',
        name: 'Inspección Técnica Rigurosa (Maquinaria)',
        description: 'Control técnico profundo de motor, hidráulica y elementos de desgaste.',
        type: 'Completo',
        assetType: 'Maquinaria',
        items: [
            { id: 'mr-1', category: 'Cabina y Seguridad', label: 'Limpieza y Estado de Cabina' },
            { id: 'mr-2', category: 'Cabina y Seguridad', label: 'Cinturones y Estructura ROPS/FOPS' },
            { id: 'mr-3', category: 'Cabina y Seguridad', label: 'Matafuego y Botiquín' },
            { id: 'mr-4', category: 'Cabina y Seguridad', label: 'Bocina, Alarma de Retroceso y Baliza' },
            { id: 'mr-5', category: 'Motor y Fluidos', label: 'Niveles de Aceite, Agua y Combustible' },
            { id: 'mr-6', category: 'Motor y Fluidos', label: 'Estado de Correas y Poleas' },
            { id: 'mr-7', category: 'Motor y Fluidos', label: 'Fugas en Block y Radiador' },
            { id: 'mr-8', category: 'Motor y Fluidos', label: 'Filtro de Aire - Control de Suciedad' },
            { id: 'mr-9', category: 'Sistema Hidráulico', label: 'Nivel Aceite Hidráulico' },
            { id: 'mr-10', category: 'Sistema Hidráulico', label: 'Estado Mangueras, Acoples y Válvulas' },
            { id: 'mr-11', category: 'Sistema Hidráulico', label: 'Fugas en Cilindros y Vástagos' },
            { id: 'mr-12', category: 'Eléctrico', label: 'Baterías, Bornes y Cortacorriente' },
            { id: 'mr-13', category: 'Eléctrico', label: 'Luces de Trabajo y Posición' },
            { id: 'mr-14', category: 'Eléctrico', label: 'Monitor de Operación y Códigos de Error' },
            { id: 'mr-15', category: 'Estructura y Rodado', label: 'Estado de Orugas / Neumáticos' },
            { id: 'mr-16', category: 'Estructura y Rodado', label: 'Estado de Balde, Uñas y Pernos' },
            { id: 'mr-17', category: 'Estructura y Rodado', label: 'Engrase General de Articulaciones' }
        ]
    }
];
