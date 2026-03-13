
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ArticleInput } from './components/ArticleInput';
import { SeoOutput } from './components/SeoOutput';
import { optimizeArticleForSeo, enrichArticleDepth, researchTopicStream, researchWithCosmonetStream } from './services/geminiService';
import { SeoResult, SavedSeoResult, BatchItem } from './types';
import { SparklesIcon, ArchiveBoxIcon, TrashIcon } from './components/IconComponents';
import { LoadModal } from './components/LoadModal';
import { ImageConverter } from './components/ImageConverter';

const App: React.FC = () => {
    const [articleText, setArticleText] = useState<string>('');
    const [batchQueue, setBatchQueue] = useState<BatchItem[]>([]);
    const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isEnriching, setIsEnriching] = useState<boolean>(false);
    const [isResearching, setIsResearching] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [savedArticles, setSavedArticles] = useState<SavedSeoResult[]>([]);
    const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
    
    const CONCURRENCY_LIMIT = 4;

    const currentResult = selectedBatchId ? batchQueue.find(b => b.id === selectedBatchId)?.result || null : null;
    const currentError = selectedBatchId ? batchQueue.find(b => b.id === selectedBatchId)?.error || null : error;

    useEffect(() => {
        const stored = localStorage.getItem('seo-optimizer-saved-articles');
        if (stored) setSavedArticles(JSON.parse(stored));
    }, []);

    const addToQueue = () => {
        if (!articleText.trim()) return;
        const newItem: BatchItem = {
            id: Date.now().toString(),
            text: articleText,
            status: 'pending'
        };
        setBatchQueue(prev => [...prev, newItem]);
        setArticleText('');
        if (!selectedBatchId) setSelectedBatchId(newItem.id);
    };

    const handleResearch = async (topic: string, mode: 'standard' | 'cosmonet') => {
        setIsResearching(true);
        setError(null);
        setArticleText(''); // Clear previous text
        try {
            if (mode === 'cosmonet') {
                await researchWithCosmonetStream(topic, (text) => {
                    setArticleText(text);
                });
            } else {
                await researchTopicStream(topic, (text) => {
                    setArticleText(text);
                });
            }
        } catch (e) {
            console.error(e);
            setError(`Errore durante la ricerca ${mode === 'cosmonet' ? 'Cosmonet.info' : 'standard'}.`);
        } finally {
            setIsResearching(false);
        }
    };

    const processBatch = async () => {
        setIsLoading(true);
        const queueCopy = [...batchQueue];
        const pending = queueCopy.filter(item => item.status === 'pending');
        
        for (let i = 0; i < pending.length; i += CONCURRENCY_LIMIT) {
            const chunk = pending.slice(i, i + CONCURRENCY_LIMIT);
            
            await Promise.all(chunk.map(async (item) => {
                setBatchQueue(prev => prev.map(b => b.id === item.id ? { ...b, status: 'processing' } : b));
                try {
                    const result = await optimizeArticleForSeo(item.text);
                    setBatchQueue(prev => prev.map(b => b.id === item.id ? { ...b, status: 'completed', result } : b));
                } catch (e) {
                    setBatchQueue(prev => prev.map(b => b.id === item.id ? { ...b, status: 'error', error: "Errore durante l'ottimizzazione." } : b));
                }
            }));
        }
        setIsLoading(false);
    };

    const handleEnrich = async () => {
        if (!selectedBatchId || !currentResult) return;
        setIsEnriching(true);
        try {
            const enrichedResult = await enrichArticleDepth(currentResult, "");
            setBatchQueue(prev => prev.map(b => b.id === selectedBatchId ? { ...b, result: enrichedResult } : b));
        } catch (e) {
            console.error(e);
            setError("Errore durante la ricerca delle fonti.");
        } finally {
            setIsEnriching(false);
        }
    };

    const removeFromQueue = (id: string) => {
        setBatchQueue(prev => prev.filter(b => b.id !== id));
        if (selectedBatchId === id) setSelectedBatchId(null);
    };

    const handleSaveArticle = useCallback((finalHtml?: string) => {
        const item = batchQueue.find(b => b.id === selectedBatchId);
        if (!item || !item.result) return;
        
        const newSavedArticle: SavedSeoResult = {
            ...item.result,
            htmlContent: finalHtml || item.result.htmlContent,
            id: Date.now().toString(),
            originalArticleText: item.text,
        };
        const updatedArticles = [...savedArticles, newSavedArticle];
        setSavedArticles(updatedArticles);
        localStorage.setItem('seo-optimizer-saved-articles', JSON.stringify(updatedArticles));
    }, [selectedBatchId, batchQueue, savedArticles]);

    const handleLoadArticle = useCallback((article: SavedSeoResult) => {
        const { id, originalArticleText, ...resultData } = article;
        const newItem: BatchItem = {
            id: Date.now().toString(),
            text: originalArticleText,
            status: 'completed',
            result: resultData as SeoResult
        };
        setBatchQueue(prev => [...prev, newItem]);
        setSelectedBatchId(newItem.id);
        setIsLoadModalOpen(false);
    }, []);

    return (
        <div className="bg-slate-900 min-h-screen text-slate-200 font-sans pb-20">
            <div className="container mx-auto p-4 md:p-8">
                <header className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                    <div className="flex items-center gap-3">
                        <SparklesIcon className="w-10 h-10 text-indigo-400" />
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 text-transparent bg-clip-text">
                            CosmoNet_Articoli_Perfetti
                        </h1>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setIsLoadModalOpen(true)}
                            className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl text-xs font-bold uppercase border border-slate-700 transition-all"
                        >
                            Archivio ({savedArticles.length})
                        </button>
                    </div>
                </header>

                <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-5 space-y-6">
                        <ArticleInput
                            value={articleText}
                            onChange={setArticleText}
                            onOptimize={addToQueue}
                            onResearch={handleResearch}
                            isLoading={isLoading}
                            isResearching={isResearching}
                            onLoadClick={() => {}}
                            savedCount={savedArticles.length}
                            lastAutoSave={null}
                            onExportDB={() => {}}
                            onImportDB={() => {}}
                        />

                        <ImageConverter />

                        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 shadow-xl">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold uppercase text-slate-400 flex items-center gap-2">
                                    <ArchiveBoxIcon className="w-4 h-4" /> Coda di Elaborazione
                                </h3>
                                {batchQueue.some(b => b.status === 'pending') && (
                                    <button 
                                        onClick={processBatch}
                                        disabled={isLoading}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all"
                                    >
                                        {isLoading ? 'In corso...' : 'OTTIMIZZA TUTTI (x4)'}
                                    </button>
                                )}
                            </div>
                            
                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {batchQueue.length === 0 ? (
                                    <p className="text-xs text-slate-500 italic text-center py-4">Aggiungi articoli alla coda per iniziare.</p>
                                ) : (
                                    batchQueue.map((item) => (
                                        <div 
                                            key={item.id}
                                            onClick={() => setSelectedBatchId(item.id)}
                                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${
                                                selectedBatchId === item.id 
                                                ? 'bg-indigo-600/20 border-indigo-500' 
                                                : 'bg-slate-900/50 border-slate-700 hover:border-slate-500'
                                            }`}
                                        >
                                            <div className="flex-1 truncate mr-4">
                                                <p className="text-xs font-bold text-slate-200 truncate">
                                                    {item.result?.html_content.title || item.text.substring(0, 40) + '...'}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-[10px] font-bold uppercase ${
                                                        item.status === 'completed' ? 'text-green-400' : 
                                                        item.status === 'processing' ? 'text-indigo-400 animate-pulse' : 
                                                        item.status === 'error' ? 'text-red-400' : 'text-slate-500'
                                                    }`}>
                                                        {item.status}
                                                    </span>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); removeFromQueue(item.id); }}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-7">
                        <SeoOutput
                            result={currentResult}
                            isLoading={isLoading && batchQueue.find(b => b.id === selectedBatchId)?.status === 'processing'}
                            isEnriching={isEnriching}
                            onIncreaseDepth={handleEnrich}
                            error={currentError}
                            onSave={handleSaveArticle}
                        />
                    </div>
                </main>
            </div>
            
            <LoadModal
                isOpen={isLoadModalOpen}
                onClose={() => setIsLoadModalOpen(false)}
                articles={savedArticles}
                onLoad={handleLoadArticle}
                onDelete={(id) => {
                    const updated = savedArticles.filter(a => a.id !== id);
                    setSavedArticles(updated);
                    localStorage.setItem('seo-optimizer-saved-articles', JSON.stringify(updated));
                }}
            />
        </div>
    );
};

export default App;
