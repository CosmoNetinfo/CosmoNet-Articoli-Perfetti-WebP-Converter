import React, { useState, useMemo } from 'react';
import { SavedSeoResult } from '../types';
import { TrashIcon, XMarkIcon, DocumentMagnifyingGlassIcon } from './IconComponents';

interface LoadModalProps {
    isOpen: boolean;
    onClose: () => void;
    articles: SavedSeoResult[];
    onLoad: (article: SavedSeoResult) => void;
    onDelete: (articleId: string) => void;
}

// ✅ FIX: usa savedAt se disponibile, altrimenti fallback su id (timestamp)
function formatDate(article: SavedSeoResult): string {
    try {
        const ts = article.savedAt || article.id;
        const d = new Date(isNaN(Number(ts)) ? ts : parseInt(ts));
        return d.toLocaleDateString('it-IT', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch {
        return '—';
    }
}

export const LoadModal: React.FC<LoadModalProps> = ({
    isOpen, onClose, articles, onLoad, onDelete
}) => {
    const [search, setSearch] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return [...articles].reverse();
        return [...articles].reverse().filter(a =>
            a.html_content.title.toLowerCase().includes(q) ||
            a.seo_metadata.yoast_focus_keyword.toLowerCase().includes(q) ||
            a.seo_metadata.category?.toLowerCase().includes(q)
        );
    }, [articles, search]);

    if (!isOpen) return null;

    const handleDelete = (id: string) => {
        if (confirmDeleteId === id) {
            onDelete(id);
            setConfirmDeleteId(null);
        } else {
            setConfirmDeleteId(id);
            setTimeout(() => setConfirmDeleteId(null), 3000);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div
                className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <header className="flex items-center justify-between p-5 border-b border-slate-700">
                    <div>
                        <h2 className="text-lg font-bold text-slate-100">Archivio Articoli</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {articles.length} articoli salvati
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-slate-700 transition-colors"
                        aria-label="Chiudi"
                    >
                        <XMarkIcon className="w-5 h-5 text-slate-400" />
                    </button>
                </header>

                {/* Search */}
                {articles.length > 3 && (
                    <div className="px-5 pt-4">
                        <div className="relative">
                            <DocumentMagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cerca per titolo, keyword o categoria..."
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>
                )}

                {/* Lista */}
                <div className="overflow-y-auto p-5 flex-1 space-y-3">
                    {filtered.length === 0 ? (
                        <p className="text-center text-slate-400 py-10 text-sm">
                            {search ? 'Nessun articolo trovato per questa ricerca.' : 'Non ci sono articoli salvati.'}
                        </p>
                    ) : (
                        filtered.map((article) => (
                            <div
                                key={article.id}
                                className="bg-slate-900/70 p-4 rounded-xl border border-slate-700 hover:border-slate-600 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                            >
                                <div className="flex-grow overflow-hidden">
                                    <p className="font-semibold text-indigo-400 truncate" title={article.html_content.title}>
                                        {article.html_content.title}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                                        <span className="font-mono text-slate-300">{article.seo_metadata.yoast_focus_keyword}</span>
                                        {article.seo_metadata.category && (
                                            <span className="ml-2 text-slate-500">· {article.seo_metadata.category}</span>
                                        )}
                                    </p>
                                    <p className="text-[10px] text-slate-600 mt-1">
                                        💾 {formatDate(article)}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                                    <button
                                        onClick={() => onLoad(article)}
                                        className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors uppercase"
                                    >
                                        Carica
                                    </button>
                                    <button
                                        onClick={() => handleDelete(article.id)}
                                        className={`p-2 rounded-xl transition-colors ${
                                            confirmDeleteId === article.id
                                                ? 'bg-red-500/30 text-red-300'
                                                : 'text-slate-500 hover:text-red-400 hover:bg-red-500/10'
                                        }`}
                                        title={confirmDeleteId === article.id ? 'Clicca ancora per confermare' : 'Elimina'}
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};