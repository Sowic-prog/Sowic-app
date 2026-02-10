
import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, X, FileSpreadsheet, CheckCircle, AlertTriangle, Loader2, Download } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { getNextInternalId } from '../utils/assetUtils';


interface AssetImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialAssetType?: string;
    forceAssetType?: boolean;
}

const AssetImportModal: React.FC<AssetImportModalProps> = ({ isOpen, onClose, onSuccess, initialAssetType, forceAssetType = false }) => {
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successCount, setSuccessCount] = useState(0);
    const [assetType, setAssetType] = useState<string>('Maquinaria');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize assetType based on prop when modal opens
    React.useEffect(() => {
        if (isOpen && initialAssetType) {
            setAssetType(initialAssetType);
        }
    }, [isOpen, initialAssetType]);


    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseFile(selectedFile);
        }
    };

    const parseFile = async (file: File) => {
        setUploading(true);
        setError(null);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            setPreviewData(jsonData);
        } catch (err) {
            setError('Error al leer el archivo. Asegúrate de que sea un Excel válido.');
            console.error(err);
        } finally {
            setUploading(false);
        }
    };

    const handleUpload = async () => {
        if (!previewData.length) return;

        setUploading(true);
        setError(null);
        let count = 0;

        try {
            // Determine table name based on asset type
            let tableName = 'machinery'; // Default
            let prefix = 'MAQ-';

            switch (assetType) {
                case 'Maquinaria':
                    tableName = 'machinery';
                    prefix = 'MAQ-';
                    break;
                case 'Rodados':
                    tableName = 'vehicles';
                    prefix = 'ROD-';
                    break;
                case 'Equipos de Informática':
                    tableName = 'it_equipment';
                    prefix = 'IT-';
                    break;
                case 'Instalaciones en infraestructuras':
                    tableName = 'infrastructure_installations';
                    prefix = 'INS-';
                    break;
                case 'Mobiliario':
                    tableName = 'mobiliario';
                    prefix = 'MOB-';
                    break;
            }

            // Get the last ID from DB once to start the sequence
            let currentIdNumber = 0;
            const lastIdStr = await getNextInternalId(assetType as any);
            // Parse the number part. getNextInternalId returns "PREFIX-NNN".
            const parts = lastIdStr.split('-');
            if (parts.length === 2 && !isNaN(parseInt(parts[1]))) {
                currentIdNumber = parseInt(parts[1]) - 1; // Subtract 1 because getNextInternalId returns the *next* available, so we start from previous
            }

            // Process each row
            for (const row of previewData) {
                // Generate Internal ID if not present
                let internalId = row['ID Interno'] || row['internal_id'];

                if (!internalId) {
                    currentIdNumber++;
                    internalId = `${prefix}${currentIdNumber.toString().padStart(3, '0')}`;
                }

                // Flexible header mapping
                const brand = row['Marca'] || row['brand'] || row['Brand'] || '';
                const model = row['Modelo'] || row['model'] || row['Model'] || '';
                const functionalDesc = row['Descripción Funcional'] || row['functional_description'] || '';

                // Generate name from Functional Description + Brand + Model
                let generatedName = '';
                if (functionalDesc && brand && model) {
                    generatedName = `${functionalDesc} ${brand} ${model}`;
                } else if (functionalDesc && brand) {
                    generatedName = `${functionalDesc} ${brand}`;
                } else if (brand && model) {
                    generatedName = `${brand} ${model}`;
                } else if (brand) {
                    generatedName = brand;
                } else if (functionalDesc) {
                    generatedName = functionalDesc;
                }

                const name = generatedName || row['Nombre'] || row['name'] || row['Title'] || `Activo ${internalId}`;
                const description = row['Descripción'] || row['Descripcion'] || row['description'] || row['Detalle'];
                const complementaryDescription = row['Descripción Complementaria'] || row['Descripcion Complementaria'] || row['complementary_description'] || '';
                const barcodeId = row['Código de Barra'] || row['Codigo de Barra'] || row['barcode_id'] || '';
                const status = row['Estado'] || row['status'] || 'Operativo';

                // Base mapping generic for all
                let newAsset: any = {
                    internal_id: internalId,
                    barcode_id: barcodeId, // Mapped generic
                    name: name,
                    description: description,
                    complementary_description: complementaryDescription,
                    status: status,
                    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=400', // Default image
                    functional_description: functionalDesc,
                };

                // Helper to safely parse numbers
                const parseNumber = (val: any): number | null => {
                    if (val === null || val === undefined || val === '') return null;
                    if (typeof val === 'number') return val;
                    const parsed = Number(val);
                    return isNaN(parsed) ? null : parsed;
                };

                const parseIntSafe = (val: any): number | null => {
                    const num = parseNumber(val);
                    return num === null ? null : Math.round(num);
                };

                // Specific mappings
                if (assetType === 'Maquinaria') {
                    newAsset = {
                        ...newAsset,
                        brand: row['Marca'] || row['brand'],
                        model: row['Modelo'] || row['model'],
                        serial: row['Serie'] || row['serial'],
                        year: parseIntSafe(row['Año'] || row['year']),
                        hours: parseNumber(row['Horas'] || 0),
                        location: row['Ubicación'] || row['location'],
                        ownership: row['Propiedad'] || row['ownership'] || 'Propio',
                        value: parseNumber(row['Valor'] || row['value'] || 0),
                        tti: parseNumber(row['TTI'] || row['tti'] || 0),
                        accounting_account: row['Cuenta Contable'] || row['accounting_account'],
                        origin_year: parseIntSafe(row['Año'] || row['year']),
                        useful_life_remaining: parseNumber(row['VUR'] || row['useful_life_remaining'] || 0),
                    };
                } else if (assetType === 'Rodados') {
                    newAsset = {
                        ...newAsset,
                        brand: row['Marca'] || row['brand'],
                        model: row['Modelo'] || row['model'],
                        domain_number: row['Dominio'] || row['domain_number'],
                        year: parseIntSafe(row['Año'] || row['year']),
                        origin_year: parseIntSafe(row['Año'] || row['year']), // Map to origin_year as well
                        location: row['Ubicación'] || row['location'],
                        ownership: row['Propiedad'] || row['ownership'] || 'Propio',
                        engine_number: row['Motor'] || row['engine_number'],
                        chassis_number: row['Chasis'] || row['chassis_number'],
                        hours: parseNumber(row['Horas'] || row['hours'] || 0),
                        value: parseNumber(row['Valor'] || row['value'] || 0),
                        tti: parseNumber(row['TTI'] || row['tti'] || 0),
                        accounting_account: row['Cuenta Contable'] || row['accounting_account'],
                        useful_life_remaining: parseNumber(row['VUR'] || row['useful_life_remaining'] || 0),
                    };
                } else if (assetType === 'Equipos de Informática') {
                    newAsset = {
                        ...newAsset,
                        type: assetType, // IT Equipment has 'type' column
                        brand: row['Marca'] || row['brand'],
                        model: row['Modelo'] || row['model'],
                        serial: row['Serie'] || row['serial'],
                        processor: row['Procesador'] || row['processor'],
                        ram: row['RAM'] || row['ram'],
                        storage: row['Almacenamiento'] || row['storage'],
                        assigned_to: row['Responsable'] || row['assigned_to']
                    };
                } else if (assetType === 'Mobiliario') {
                    newAsset = {
                        ...newAsset,
                        type: assetType, // Mobiliario has 'type' column
                        location: row['Ubicación'] || row['location'],
                    };
                } else if (assetType === 'Instalaciones en infraestructuras') {
                    newAsset = {
                        ...newAsset,
                        location: row['Ubicación'] || row['location'],
                    };
                }

                // Filter out undefined values to avoid DB errors
                const cleanedAsset = Object.fromEntries(
                    Object.entries(newAsset).filter(([_, v]) => v != null)
                );

                const { error: insertError } = await supabase
                    .from(tableName)
                    .insert([cleanedAsset]);

                if (insertError) throw insertError;
                count++;
            }

            setSuccessCount(count);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 2000);

        } catch (err: any) {
            setError(`Error al importar: ${err.message}`);
        } finally {
            setUploading(false);
        }
    };

    const downloadTemplate = () => {
        let headers: string[] = [];

        switch (assetType) {
            case 'Maquinaria':
                headers = ['Descripción Funcional', 'Marca', 'Modelo', 'Serie', 'Año', 'Horas', 'Ubicación', 'Estado', 'Descripción', 'Descripción Complementaria', 'Código de Barra', 'Propiedad', 'Valor', 'TTI', 'Cuenta Contable', 'VUR', 'Nombre'];
                break;
            case 'Rodados':
                headers = ['Descripción Funcional', 'Marca', 'Modelo', 'Dominio', 'Año', 'Motor', 'Chasis', 'Horas', 'Ubicación', 'Estado', 'Descripción', 'Descripción Complementaria', 'Código de Barra', 'Propiedad', 'Valor', 'TTI', 'Cuenta Contable', 'VUR', 'Nombre'];
                break;
            case 'Equipos de Informática':
                headers = ['Descripción Funcional', 'Marca', 'Modelo', 'Serie', 'Procesador', 'RAM', 'Almacenamiento', 'Responsable', 'Estado', 'Descripción', 'Descripción Complementaria', 'Código de Barra', 'Nombre'];
                break;
            case 'Mobiliario':
                headers = ['Descripción Funcional', 'Ubicación', 'Estado', 'Descripción', 'Descripción Complementaria', 'Código de Barra', 'ID Interno', 'Nombre'];
                break;
            case 'Instalaciones en infraestructuras':
                headers = ['Descripción Funcional', 'Ubicación', 'Estado', 'Descripción', 'Descripción Complementaria', 'Código de Barra', 'ID Interno', 'Nombre'];
                break;
            default:
                headers = ['Nombre', 'Marca', 'Modelo', 'Serie', 'Ubicación', 'Estado', 'Descripción', 'Descripción Complementaria', 'Código de Barra', 'Propiedad'];
        }

        const ws = XLSX.utils.aoa_to_sheet([headers]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
        XLSX.writeFile(wb, `plantilla_${assetType.replace(/\s+/g, '_').toLowerCase()}.xlsx`);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <FileSpreadsheet className="text-green-600" />
                        Importar Activos Masivamente
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {/* Step 1: Select Type */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">1. Tipo de Activo a Importar</label>
                        <select
                            value={assetType}
                            onChange={(e) => setAssetType(e.target.value)}
                            disabled={forceAssetType}
                            className={`w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none ${forceAssetType ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            <option value="Maquinaria">Maquinaria</option>
                            <option value="Rodados">Rodados</option>
                            <option value="Equipos de Informática">Equipos de Informática</option>
                            <option value="Instalaciones en infraestructuras">Instalaciones</option>
                            <option value="Mobiliario">Mobiliario</option>
                        </select>
                    </div>

                    {/* Step 2: Download Template */}
                    <div className="flex items-center justify-between bg-blue-50 p-4 rounded-2xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                <AlertTriangle size={20} />
                            </div>
                            <div className="text-sm">
                                <p className="font-bold text-blue-800">¿Necesitas el formato?</p>
                                <p className="text-blue-600/80">Descarga la plantilla para evitar errores.</p>
                            </div>
                        </div>
                        <button
                            onClick={downloadTemplate}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-xl text-sm font-bold shadow-sm hover:shadow-md transition-all"
                        >
                            <Download size={16} /> Descargar Plantilla
                        </button>
                    </div>

                    {/* Step 3: Upload File */}
                    {!file ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-200 rounded-[2rem] p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/10 transition-all group"
                        >
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Upload size={32} className="text-slate-400 group-hover:text-blue-500" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700">Sube tu archivo Excel</h3>
                            <p className="text-slate-400 text-sm mt-1">Arrastra o haz clic para seleccionar</p>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".xlsx, .xls, .csv"
                                onChange={handleFileChange}
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
                                        <FileSpreadsheet size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-700">{file.name}</p>
                                        <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(2)} KB</p>
                                    </div>
                                </div>
                                <button onClick={() => { setFile(null); setPreviewData([]); }} className="text-slate-400 hover:text-red-500">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Preview */}
                            <div className="bg-slate-50 rounded-2xl p-4 max-h-60 overflow-y-auto">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 sticky top-0 bg-slate-50 pb-2">Vista Previa ({previewData.length} filas)</h4>
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr>
                                            {previewData.length > 0 && Object.keys(previewData[0]).slice(0, 4).map(key => (
                                                <th key={key} className="text-[10px] font-bold text-slate-400 uppercase p-2 border-b border-slate-200">{key}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.slice(0, 5).map((row, i) => (
                                            <tr key={i} className="border-b border-slate-100 last:border-0">
                                                {Object.values(row).slice(0, 4).map((val: any, j) => (
                                                    <td key={j} className="text-xs text-slate-600 p-2 truncate max-w-[100px]">{String(val)}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {previewData.length > 5 && (
                                    <p className="text-center text-xs text-slate-400 mt-2">... y {previewData.length - 5} más</p>
                                )}
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm flex items-center gap-2">
                            <AlertTriangle size={16} />
                            {error}
                        </div>
                    )}

                    {successCount > 0 && (
                        <div className="p-4 bg-green-50 text-green-600 rounded-2xl text-sm flex items-center gap-2">
                            <CheckCircle size={16} />
                            ¡Éxito! Se han importado {successCount} activos correctamente.
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl text-slate-500 font-bold hover:bg-slate-200 transition-colors"
                        disabled={uploading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={!file || uploading || previewData.length === 0}
                        className={`px-6 py-3 rounded-xl font-bold text-white flex items-center gap-2 shadow-lg shadow-blue-500/20 ${!file || uploading ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:scale-105 transition-all'}`}
                    >
                        {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                        {uploading ? 'Importando...' : 'Importar Datos'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssetImportModal;
