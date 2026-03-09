import React, { useRef } from 'react';
import { Camera, X, Plus, Image as ImageIcon } from 'lucide-react';
import { compressImage } from '../utils/imageCompression';

interface MultiPhotoUploadProps {
    photos: string[];
    onChange: (photos: string[]) => void;
    maxPhotos?: number;
}

const MultiPhotoUpload: React.FC<MultiPhotoUploadProps> = ({
    photos = [],
    onChange,
    maxPhotos = 10
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            const remainingSlots = maxPhotos - photos.length;
            const filesToProcess = filesArray.slice(0, remainingSlots);

            try {
                const compressedPhotos = await Promise.all(
                    filesToProcess.map(file => compressImage(file))
                );

                onChange([...photos, ...compressedPhotos]);
            } catch (error) {
                console.error("Error compressing images:", error);
                alert("Hubo un error al procesar las imágenes. Por favor, intenta de nuevo.");
            }
        }
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removePhoto = (index: number) => {
        const newPhotos = [...photos];
        newPhotos.splice(index, 1);
        onChange(newPhotos);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
                {photos.map((photo, index) => (
                    <div key={index} className="relative w-24 h-24 rounded-2xl overflow-hidden group shadow-sm border border-slate-100">
                        <img src={photo} alt={`Asset photo ${index + 1}`} className="w-full h-full object-cover" />
                        <button
                            onClick={() => removePhoto(index)}
                            className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            type="button"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}

                {photos.length < maxPhotos && (
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-orange-500 hover:text-orange-500 transition-all bg-slate-50/50"
                        type="button"
                    >
                        <Plus size={24} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Agregar</span>
                    </button>
                )}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleFileChange}
            />

            <p className="text-[10px] text-slate-400 font-medium">
                {photos.length} de {maxPhotos} fotos permitidas.
            </p>
        </div>
    );
};

export default MultiPhotoUpload;
