import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';

interface PhotoGalleryProps {
    photos: string[];
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ photos = [] }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);

    if (!photos || photos.length === 0) {
        return (
            <div className="w-full h-48 bg-slate-100 rounded-[2rem] flex flex-col items-center justify-center text-slate-400 gap-2 border border-slate-200 border-dashed">
                <div className="p-3 bg-white rounded-2xl shadow-sm">
                    <ChevronRight size={20} className="text-slate-300" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest">Sin fotos</span>
            </div>
        );
    }

    const nextPhoto = (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveIndex((prev) => (prev + 1) % photos.length);
    };

    const prevPhoto = (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveIndex((prev) => (prev - 1 + photos.length) % photos.length);
    };

    return (
        <div className="space-y-4">
            {/* Main Preview */}
            <div
                className="relative h-64 rounded-[2.5rem] overflow-hidden bg-slate-900 group shadow-lg cursor-pointer"
                onClick={() => setIsFullscreen(true)}
            >
                <img
                    src={photos[activeIndex]}
                    alt={`Photo ${activeIndex + 1}`}
                    className="w-full h-full object-contain"
                />

                {/* Navigation Arrows */}
                {photos.length > 1 && (
                    <>
                        <button
                            onClick={prevPhoto}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/40 transition-all opacity-0 group-hover:opacity-100"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            onClick={nextPhoto}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/40 transition-all opacity-0 group-hover:opacity-100"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </>
                )}

                <div className="absolute bottom-4 right-4 p-2 bg-black/30 backdrop-blur-md rounded-xl text-white">
                    <Maximize2 size={16} />
                </div>

                <div className="absolute top-4 right-4 px-3 py-1 bg-black/30 backdrop-blur-md rounded-full text-white text-[10px] font-bold">
                    {activeIndex + 1} / {photos.length}
                </div>
            </div>

            {/* Thumbnails */}
            {photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {photos.map((photo, index) => (
                        <button
                            key={index}
                            onClick={() => setActiveIndex(index)}
                            className={`relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${activeIndex === index ? 'border-orange-500 scale-110' : 'border-transparent opacity-60'
                                }`}
                        >
                            <img src={photo} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            )}

            {/* Fullscreen Modal */}
            {isFullscreen && (
                <div
                    className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex flex-col"
                    onClick={() => setIsFullscreen(false)}
                >
                    <div className="flex justify-end p-6">
                        <button className="text-white p-2 hover:bg-white/10 rounded-full transition-colors">
                            <X size={32} />
                        </button>
                    </div>
                    <div className="flex-1 relative flex items-center justify-center p-4">
                        <img
                            src={photos[activeIndex]}
                            alt="Fullscreen Preview"
                            className="max-w-full max-h-full object-contain"
                        />

                        {photos.length > 1 && (
                            <>
                                <button
                                    onClick={prevPhoto}
                                    className="absolute left-8 p-4 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all"
                                >
                                    <ChevronLeft size={40} />
                                </button>
                                <button
                                    onClick={nextPhoto}
                                    className="absolute right-8 p-4 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all"
                                >
                                    <ChevronRight size={40} />
                                </button>
                            </>
                        )}
                    </div>
                    <div className="p-8 text-center text-white font-bold tracking-widest text-sm">
                        {activeIndex + 1} / {photos.length}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PhotoGallery;
