
import React, { useState, useCallback } from 'react';
import { PhotoIcon, ArrowDownTrayIcon, TrashIcon, CheckCircleIcon } from './IconComponents';

interface ConvertedImage {
    id: string;
    originalName: string;
    originalSize: number;
    newSize: number;
    webpUrl: string;
    progress: number;
    status: 'pending' | 'processing' | 'completed' | 'error';
}

export const ImageConverter: React.FC = () => {
    const [images, setImages] = useState<ConvertedImage[]>([]);

    const convertToWebP = (file: File) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newImg: ConvertedImage = {
            id,
            originalName: file.name,
            originalSize: file.size,
            newSize: 0,
            webpUrl: '',
            progress: 0,
            status: 'processing'
        };
        
        setImages(prev => [newImg, ...prev]);

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const url = URL.createObjectURL(blob);
                            setImages(prev => prev.map(item => item.id === id ? {
                                ...item,
                                status: 'completed',
                                webpUrl: url,
                                newSize: blob.size,
                                progress: 100
                            } : item));
                        }
                    }, 'image/webp', 0.85); // Qualità 85% per ottimo bilanciamento
                }
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            Array.from(e.target.files).forEach(convertToWebP);
        }
    };

    const removeImage = (id: string) => {
        setImages(prev => prev.filter(img => img.id !== id));
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase text-slate-400 flex items-center gap-2">
                    <PhotoIcon className="w-4 h-4 text-emerald-400" /> Convertitore WebP
                </h3>
                <span className="text-[10px] text-slate-500 font-bold uppercase bg-slate-900 px-2 py-1 rounded">Performance</span>
            </div>

            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-700 border-dashed rounded-xl cursor-pointer bg-slate-900/50 hover:bg-slate-900 transition-all group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <PhotoIcon className="w-8 h-8 mb-3 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                    <p className="mb-2 text-xs text-slate-400">
                        <span className="font-bold">Trascina o clicca</span> per convertire in WebP
                    </p>
                    <p className="text-[10px] text-slate-500">JPG, PNG, GIF</p>
                </div>
                <input type="file" className="hidden" multiple accept="image/*" onChange={handleFileChange} />
            </label>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {images.map(img => (
                    <div key={img.id} className="bg-slate-900 p-3 rounded-xl border border-slate-700 flex items-center justify-between group">
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-slate-200 truncate">{img.originalName}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-slate-500 line-through">{formatSize(img.originalSize)}</span>
                                <span className="text-[10px] text-emerald-400 font-bold">{formatSize(img.newSize)}</span>
                                {img.status === 'completed' && (
                                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                                        -{Math.round((1 - img.newSize / img.originalSize) * 100)}%
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                            {img.status === 'completed' ? (
                                <>
                                    <a 
                                        href={img.webpUrl} 
                                        download={img.originalName.split('.')[0] + '.webp'}
                                        className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
                                        title="Scarica WebP"
                                    >
                                        <ArrowDownTrayIcon className="w-4 h-4" />
                                    </a>
                                    <button onClick={() => removeImage(img.id)} className="p-2 text-slate-500 hover:text-red-400 rounded-lg transition-all">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </>
                            ) : (
                                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
