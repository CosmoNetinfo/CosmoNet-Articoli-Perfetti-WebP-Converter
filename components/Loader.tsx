
import React from 'react';

export const Loader: React.FC = () => (
    <div className="flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-t-indigo-400 border-r-indigo-400 border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400">L'IA sta elaborando la tua richiesta...</p>
    </div>
);
