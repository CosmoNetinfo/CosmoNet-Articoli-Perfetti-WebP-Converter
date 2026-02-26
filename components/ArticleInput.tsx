
import React, { useRef } from 'react';
// Fixed: Removed missing CloudArrowUpIcon import
import { SparklesIcon, ArchiveBoxIcon, CheckCircleIcon, CloudArrowDownIcon, BookmarkIcon } from './IconComponents';

interface ArticleInputProps {
    value: string;
    onChange: (value: string) => void;
    onOptimize: () => void;
    isLoading: boolean;
    savedCount: number;
    onLoadClick: () => void;
    lastAutoSave: Date | null;
    onExportDB: () => void;
    onImportDB: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ArticleInput: React.FC<ArticleInputProps> = ({ 
    value, 
    onChange, 
    onOptimize, 
    isLoading, 
    savedCount, 
    onLoadClick, 
    lastAutoSave,
    onExportDB,
    onImportDB
}) => {
    return (
        <div className="flex flex-col gap-4 bg-slate-800/50 p-6 rounded-2xl shadow-xl border border-slate-700 relative">
            <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400">Nuovo Articolo</h2>
                <div className="flex gap-3">
                     <button className="text-slate-500 hover:text-slate-300" title="Backup"><CloudArrowDownIcon className="w-4 h-4" /></button>
                </div>
            </div>
            
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Incolla qui l'articolo da ottimizzare (es. da Perplexity)..."
                className="w-full h-80 p-4 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-slate-300 text-sm leading-relaxed custom-scrollbar resize-none"
                disabled={isLoading}
            />
            
            <button
                onClick={onOptimize}
                disabled={isLoading || !value.trim()}
                className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
            >
                <SparklesIcon className="w-5 h-5" />
                AGGIUNGI ALLA CODA BATCH
            </button>
            <p className="text-[10px] text-slate-500 text-center font-medium">L'IA elaborerà fino a 4 testi simultaneamente dalla coda.</p>
        </div>
    );
};
