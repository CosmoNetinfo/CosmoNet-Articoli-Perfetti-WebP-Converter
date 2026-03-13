
import React, { useRef } from 'react';
// Fixed: Removed missing CloudArrowUpIcon import
import { SparklesIcon, ArchiveBoxIcon, CheckCircleIcon, CloudArrowDownIcon, BookmarkIcon } from './IconComponents';

interface ArticleInputProps {
    value: string;
    onChange: (value: string) => void;
    onOptimize: () => void;
    onResearch: (topic: string, mode: 'standard' | 'cosmonet') => void;
    isLoading: boolean;
    isResearching: boolean;
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
    onResearch,
    isLoading, 
    isResearching,
    savedCount, 
    onLoadClick, 
    lastAutoSave,
    onExportDB,
    onImportDB
}) => {
    const [topic, setTopic] = React.useState('');
    const [researchMode, setResearchMode] = React.useState<'standard' | 'cosmonet'>('standard');

    const handleResearch = () => {
        if (!topic.trim()) return;
        onResearch(topic, researchMode);
        setTopic('');
    };

    return (
        <div className="flex flex-col gap-4 bg-slate-800/50 p-6 rounded-2xl shadow-xl border border-slate-700 relative">
            <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400">Nuovo Articolo</h2>
                <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
                    <button 
                        onClick={() => setResearchMode('standard')}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${researchMode === 'standard' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        STANDARD
                    </button>
                    <button 
                        onClick={() => setResearchMode('cosmonet')}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${researchMode === 'cosmonet' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        COSMONET.INFO (TECH)
                    </button>
                </div>
            </div>

            <div className="flex gap-2">
                <input 
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder={researchMode === 'cosmonet' ? "Chiedi a Cosmonet.info (Linux, AI, Open Source)..." : "Ricerca un argomento (es: 'I benefici del WebP')..."}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleResearch()}
                />
                <button 
                    onClick={handleResearch}
                    disabled={isResearching || !topic.trim()}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                        researchMode === 'cosmonet' 
                        ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-500' 
                        : 'bg-slate-700 hover:bg-slate-600 text-indigo-400 border-slate-600'
                    }`}
                >
                    {isResearching ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <SparklesIcon className="w-4 h-4" />
                    )}
                    {researchMode === 'cosmonet' ? 'COSMONET.INFO' : 'RICERCA'}
                </button>
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
