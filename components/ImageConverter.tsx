
import React, { useState, useRef } from 'react';
import { DownloadIcon, FileTextIcon, TrashIcon } from './IconComponents';

export const ImageConverter: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isConverting, setIsConverting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name.split('.')[0]);
    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const convertToWebP = () => {
    if (!image || !canvasRef.current) return;
    setIsConverting(true);

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current!;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const webpData = canvas.toDataURL('image/webp', 0.8);
        const link = document.createElement('a');
        link.href = webpData;
        link.download = `${fileName || 'cosmonet-image'}.webp`;
        link.click();
      }
      setIsConverting(false);
    };
    img.src = image;
  };

  return (
    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 shadow-xl">
      <h3 className="text-sm font-bold uppercase text-slate-400 flex items-center gap-2 mb-4">
        <FileTextIcon className="w-4 h-4" /> Convertitore Immagini (WebP)
      </h3>
      
      {!image ? (
        <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-indigo-500/50 transition-all group">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id="image-upload"
          />
          <label htmlFor="image-upload" className="cursor-pointer">
            <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-indigo-600 transition-all">
              <DownloadIcon className="w-6 h-6 text-slate-400 group-hover:text-white" />
            </div>
            <p className="text-xs text-slate-400">Trascina o clicca per caricare un'immagine</p>
            <p className="text-[10px] text-slate-600 mt-1">PNG, JPG, SVG supportati</p>
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
            <img src={image} alt="Anteprima" className="max-h-48 mx-auto object-contain" />
            <button
              onClick={() => setImage(null)}
              className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg transition-all"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={convertToWebP}
              disabled={isConverting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              {isConverting ? 'Conversione...' : (
                <>
                  <DownloadIcon className="w-4 h-4" /> Scarica come WebP
                </>
              )}
            </button>
          </div>
          <p className="text-[10px] text-slate-500 text-center italic">
            Ottimizza le immagini per il web riducendo il peso senza perdere qualità.
          </p>
        </div>
      )}
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
