import React, { useRef } from 'react';
import { SparklesIcon, ArchiveBoxIcon, BookmarkIcon } from './IconComponents';
import { GroundingSource } from '../types';

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
    onImportDB: () => void; // ✅ FIX: ora è () => void, il click sull'input lo gestisce App.tsx
    researchSources?: GroundingSource[]; // ✅ NUOVO: fonti dalla ricerca
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
    onExportDB,
    onImportDB,
    researchSources = [],
}) => {
    const [topic, setTopic] = React.useState('');
    const [researchMode, setResearchMode] = React.useState<'standard' | 'cosmonet'>('cosmonet');
    const [showSources, setShowSources] = React.useState(false);

    const charCount = value.length;
    const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

    const handleResearch = () => {
        if (!topic.trim()) return;
        onResearch(topic, researchMode);
        setTopic('');
        setShowSources(false);
    };

    return (
        <div className="flex flex-col gap-4 bg-slate-800/50 p-6 rounded-2xl shadow-xl border border-slate-700">

            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400">
                    Nuovo Articolo
                </h2>
                {/* Modalità ricerca */}
                <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
                    <button
                        onClick={() => setResearchMode('cosmonet')}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                            researchMode === 'cosmonet'
                                ? 'bg-purple-600 text-white'
                                : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        COSMONET.INFO
                    </button>
                </div>
            </div>

            {/* Research bar */}
            <div className="flex gap-2">
                <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleResearch()}
                    placeholder={
                        researchMode === 'cosmonet'
                            ? 'Chiedi a Cosmonet.info (Linux, AI, Open Source)...'
                            : "Ricerca un argomento (es: 'I benefici del WebP')..."
                    }
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    disabled={isResearching}
                />
                <button
                    onClick={handleResearch}
                    disabled={isResearching || !topic.trim()}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                        researchMode === 'cosmonet'
                            ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-500 disabled:opacity-50'
                            : 'bg-slate-700 hover:bg-slate-600 text-indigo-400 border-slate-600 disabled:opacity-50'
                    }`}
                >
                    {isResearching ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <SparklesIcon className="w-4 h-4" />
                    )}
                    {researchMode === 'cosmonet' ? 'COSMONET' : 'RICERCA'}
                </button>
            </div>

            {/* ✅ NUOVO: fonti ricerca visibili sotto la barra */}
            {researchSources.length > 0 && (
                <div>
                    <button
                        onClick={() => setShowSources(s => !s)}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold uppercase flex items-center gap-1"
                    >
                        📎 {researchSources.length} fonti trovate {showSources ? '▲' : '▼'}
                    </button>
                    {showSources && (
                        <div className="mt-2 space-y-1 max-h-32 overflow-y-auto pr-1">
                            {researchSources.map((s, i) => (
                                <a
                                    key={i}
                                    href={s.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-[11px] text-slate-400 hover:text-indigo-400 truncate transition-colors"
                                    title={s.uri}
                                >
                                    🔗 {s.title || s.uri}
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Textarea */}
            <div className="relative">
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Incolla qui l'articolo da ottimizzare (o usa la ricerca sopra)..."
                    className="w-full h-80 p-4 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-slate-300 text-sm leading-relaxed resize-none outline-none"
                    disabled={isLoading || isResearching}
                />
                {/* Contatore parole/caratteri */}
                {value.trim() && (
                    <div className="absolute bottom-3 right-3 flex gap-2">
                        <span className="text-[10px] bg-slate-800/90 text-slate-500 px-2 py-0.5 rounded-md">
                            {wordCount} parole
                        </span>
                        <span className="text-[10px] bg-slate-800/90 text-slate-500 px-2 py-0.5 rounded-md">
                            {charCount} c
                        </span>
                    </div>
                )}
            </div>

            {/* CTA principale */}
            <button
                onClick={onOptimize}
                disabled={isLoading || isResearching || !value.trim()}
                className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
            >
                <SparklesIcon className="w-5 h-5" />
                AGGIUNGI ALLA CODA BATCH
            </button>
            <p className="text-[10px] text-slate-500 text-center">
                L'IA elaborerà fino a 4 testi simultaneamente dalla coda.
            </p>

            {/* ✅ FIX: Toolbar archivio / export / import */}
            <div className="flex gap-2 pt-1 border-t border-slate-700">
                <button
                    onClick={onLoadClick}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700/50 hover:bg-slate-700 px-3 py-2 rounded-xl text-[10px] font-bold uppercase text-slate-400 hover:text-slate-200 transition-all border border-slate-600"
                >
                    <ArchiveBoxIcon className="w-3.5 h-3.5" />
                    Archivio ({savedCount})
                </button>
                <button
                    onClick={onExportDB}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700/50 hover:bg-slate-700 px-3 py-2 rounded-xl text-[10px] font-bold uppercase text-slate-400 hover:text-slate-200 transition-all border border-slate-600"
                >
                    📤 Esporta
                </button>
                <button
                    onClick={onImportDB}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700/50 hover:bg-slate-700 px-3 py-2 rounded-xl text-[10px] font-bold uppercase text-slate-400 hover:text-slate-200 transition-all border border-slate-600"
                >
                    📥 Importa
                </button>
            </div>
        </div>
    );
};