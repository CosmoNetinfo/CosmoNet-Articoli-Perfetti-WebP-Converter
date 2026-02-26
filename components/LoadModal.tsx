
import React from 'react';
import { SavedSeoResult } from '../types';
import { TrashIcon, XMarkIcon } from './IconComponents';

interface LoadModalProps {
    isOpen: boolean;
    onClose: () => void;
    articles: SavedSeoResult[];
    onLoad: (article: SavedSeoResult) => void;
    onDelete: (articleId: string) => void;
}

export const LoadModal: React.FC<LoadModalProps> = ({ isOpen, onClose, articles, onLoad, onDelete }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div 
                className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-slate-700">
                    <h2 className="text-xl font-semibold text-slate-100">Carica un Articolo Salvato</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700 transition-colors" aria-label="Chiudi modale">
                        <XMarkIcon className="w-6 h-6 text-slate-400" />
                    </button>
                </header>
                
                <div className="overflow-y-auto p-4">
                    {articles.length === 0 ? (
                        <p className="text-center text-slate-400 py-8">Non ci sono articoli salvati.</p>
                    ) : (
                        <ul className="space-y-3">
                            {articles.slice().reverse().map((article) => (
                                <li key={article.id} className="bg-slate-900/70 p-3 rounded-lg border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div className="flex-grow overflow-hidden">
                                        {/* Fixed property access to match SeoResult structure */}
                                        <p className="font-semibold text-indigo-400 truncate" title={article.html_content.title}>{article.html_content.title}</p>
                                        <p className="text-sm text-slate-400 truncate">
                                            Frase chiave: <span className="font-mono text-slate-300">{article.seo_metadata.yoast_focus_keyword}</span>
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Salvato il: {new Date(parseInt(article.id)).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                                        <button 
                                            onClick={() => onLoad(article)}
                                            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
                                        >
                                            Carica
                                        </button>
                                        <button 
                                            onClick={() => onDelete(article.id)}
                                            className="p-2 text-red-400 hover:bg-red-500/20 rounded-md transition-colors"
                                            title="Elimina articolo"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};
