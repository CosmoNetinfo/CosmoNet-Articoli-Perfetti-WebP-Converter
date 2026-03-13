
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ArticleInput } from './components/ArticleInput';
import { SeoOutput } from './components/SeoOutput';
import { optimizeArticleForSeo, enrichArticleDepth, researchTopicStream, researchWithCosmonetStream } from './services/geminiService';
import { SeoResult, SavedSeoResult, BatchItem } from './types';
import { SparklesIcon, ArchiveBoxIcon, TrashIcon } from './components/IconComponents';
import { LoadModal } from './components/LoadModal';
import { ImageConverter } from './components/ImageConverter';

const STORAGE_KEY = 'cosmonet-articoli-perfetti-v2';
const CONCURRENCY_LIMIT = 4;

// ─── Utils ────────────────────────────────────────────────────────────────────

function loadFromStorage(): SavedSeoResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(articles: SavedSeoResult[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
  } catch (e: any) {
    if (e.name === 'QuotaExceededError') {
      console.warn('⚠️ localStorage pieno. Esporta il DB per liberare spazio.');
    }
  }
}

// ─── App ──────────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const [articleText, setArticleText] = useState<string>('');
  const [batchQueue, setBatchQueue] = useState<BatchItem[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isEnriching, setIsEnriching] = useState<boolean>(false);
  const [isResearching, setIsResearching] = useState<boolean>(false);
  const [researchSources, setResearchSources] = useState<{ title: string; uri: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedArticles, setSavedArticles] = useState<SavedSeoResult[]>([]);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Selectors
  const currentBatchItem = selectedBatchId ? batchQueue.find(b => b.id === selectedBatchId) ?? null : null;
  const currentResult = currentBatchItem?.result ?? null;
  const currentError = currentBatchItem?.error ?? error;

  // Carica da localStorage all'avvio
  useEffect(() => {
    const stored = loadFromStorage();
    setSavedArticles(stored);
  }, []);

  // ─── Batch queue ────────────────────────────────────────────────────────────

  const addToQueue = () => {
    if (!articleText.trim()) return;
    const id = Date.now().toString();
    const preview = articleText.substring(0, 60).trim();
    const newItem: BatchItem = {
      id,
      title: preview + (preview.length >= 60 ? '...' : ''),
      text: articleText,
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString()
    };
    setBatchQueue(prev => [...prev, newItem]);
    setArticleText('');
    setSelectedBatchId(id);
  };

  const removeFromQueue = (id: string) => {
    setBatchQueue(prev => prev.filter(b => b.id !== id));
    if (selectedBatchId === id) setSelectedBatchId(null);
  };

  const updateItem = (id: string, patch: Partial<BatchItem>) => {
    setBatchQueue(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
  };

  // ─── Research ───────────────────────────────────────────────────────────────

  const handleResearch = async (topic: string, mode: 'standard' | 'cosmonet') => {
    setIsResearching(true);
    setError(null);
    setArticleText('');
    setResearchSources([]);
    try {
      const fn = mode === 'cosmonet' ? researchWithCosmonetStream : researchTopicStream;
      // ✅ FIX: salviamo le fonti restituite dalla ricerca
      const sources = await fn(topic, (text) => setArticleText(text));
      setResearchSources(sources);
    } catch (e) {
      setError(`Errore durante la ricerca ${mode === 'cosmonet' ? 'Cosmonet' : 'standard'}.`);
    } finally {
      setIsResearching(false);
    }
  };

  // ─── Process batch ──────────────────────────────────────────────────────────

  const processBatch = async () => {
    setIsLoading(true);
    setError(null);
    const pending = batchQueue.filter(b => b.status === 'pending');

    for (let i = 0; i < pending.length; i += CONCURRENCY_LIMIT) {
      const chunk = pending.slice(i, i + CONCURRENCY_LIMIT);

      await Promise.all(chunk.map(async (item) => {
        updateItem(item.id, { status: 'processing', progress: 10 });
        try {
          // Simula progresso visivo mentre Gemini lavora
          const progressInterval = setInterval(() => {
            setBatchQueue(prev => prev.map(b =>
              b.id === item.id && b.progress < 85
                ? { ...b, progress: b.progress + 5 }
                : b
            ));
          }, 800);

          const result = await optimizeArticleForSeo(item.text);
          clearInterval(progressInterval);
          // ✅ Aggiorna anche il titolo con quello generato da Gemini
          updateItem(item.id, {
            status: 'completed',
            progress: 100,
            result,
            title: result.html_content.title || item.title
          });
        } catch (e) {
          updateItem(item.id, {
            status: 'error',
            progress: 0,
            error: "Errore durante l'ottimizzazione."
          });
        }
      }));
    }
    setIsLoading(false);
  };

  // ─── Enrich ─────────────────────────────────────────────────────────────────

  const handleEnrich = async () => {
    if (!selectedBatchId || !currentResult) return;
    setIsEnriching(true);
    try {
      const enriched = await enrichArticleDepth(currentResult, '');
      updateItem(selectedBatchId, { result: enriched });
    } catch {
      setError('Errore durante l\'arricchimento con fonti.');
    } finally {
      setIsEnriching(false);
    }
  };

  // ─── Save / Load ─────────────────────────────────────────────────────────────

  const handleSaveArticle = useCallback((finalHtml?: string) => {
    const item = batchQueue.find(b => b.id === selectedBatchId);
    if (!item?.result) return;

    const saved: SavedSeoResult = {
      ...item.result,
      htmlContent: finalHtml || item.result.htmlContent,
      id: Date.now().toString(),
      savedAt: new Date().toISOString(),
      originalArticleText: item.text,
    };

    const updated = [...savedArticles, saved];
    setSavedArticles(updated);
    try {
      saveToStorage(updated);
    } catch {
      setStorageWarning('⚠️ Spazio localStorage esaurito. Esporta il DB per fare spazio.');
    }
  }, [selectedBatchId, batchQueue, savedArticles]);

  const handleLoadArticle = useCallback((article: SavedSeoResult) => {
    const { id, savedAt, originalArticleText, ...resultData } = article;
    const newItem: BatchItem = {
      id: Date.now().toString(),
      title: article.html_content.title,
      text: originalArticleText,
      status: 'completed',
      result: resultData as SeoResult,
      progress: 100,
      createdAt: savedAt || new Date().toISOString()
    };
    setBatchQueue(prev => [...prev, newItem]);
    setSelectedBatchId(newItem.id);
    setIsLoadModalOpen(false);
  }, []);

  // ─── Export / Import DB ─────────────────────────────────────────────────────

  const handleExportDB = useCallback(() => {
    if (savedArticles.length === 0) return;
    const blob = new Blob([JSON.stringify(savedArticles, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cosmonet-articoli-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [savedArticles]);

  const handleImportDB = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported: SavedSeoResult[] = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(imported)) throw new Error('Formato non valido');
        // Merge: evita duplicati per id
        const existingIds = new Set(savedArticles.map(a => a.id));
        const newOnes = imported.filter(a => !existingIds.has(a.id));
        const merged = [...savedArticles, ...newOnes];
        setSavedArticles(merged);
        saveToStorage(merged);
        alert(`✅ Importati ${newOnes.length} articoli. ${imported.length - newOnes.length} già presenti.`);
      } catch {
        alert('❌ File non valido. Assicurati di importare un file .json esportato da questa app.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset
  }, [savedArticles]);

  const handleDeleteSaved = useCallback((id: string) => {
    const updated = savedArticles.filter(a => a.id !== id);
    setSavedArticles(updated);
    saveToStorage(updated);
  }, [savedArticles]);

  // ─── Batch stats ─────────────────────────────────────────────────────────────

  const batchStats = {
    total: batchQueue.length,
    pending: batchQueue.filter(b => b.status === 'pending').length,
    processing: batchQueue.filter(b => b.status === 'processing').length,
    completed: batchQueue.filter(b => b.status === 'completed').length,
    error: batchQueue.filter(b => b.status === 'error').length,
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="bg-slate-900 min-h-screen text-slate-200 font-sans pb-20">
      {/* Storage warning banner */}
      {storageWarning && (
        <div className="bg-amber-900/80 border-b border-amber-600 text-amber-200 text-xs text-center py-2 px-4 flex items-center justify-center gap-3">
          {storageWarning}
          <button onClick={() => setStorageWarning(null)} className="underline">Chiudi</button>
          <button onClick={handleExportDB} className="bg-amber-600 px-3 py-1 rounded-lg font-bold">Esporta ora</button>
        </div>
      )}

      <div className="container mx-auto p-4 md:p-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <SparklesIcon className="w-10 h-10 text-indigo-400" />
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 text-transparent bg-clip-text">
                CosmoNet_Articoli_Perfetti
              </h1>
              <p className="text-xs text-slate-500">SEO + GEO Optimizer · Cosmonet.info</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {/* Import DB */}
            <input
              ref={importInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportDB}
            />
            <button
              onClick={() => importInputRef.current?.click()}
              className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl text-xs font-bold uppercase border border-slate-700 transition-all"
            >
              📥 Importa DB
            </button>
            {/* Export DB */}
            <button
              onClick={handleExportDB}
              disabled={savedArticles.length === 0}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 px-4 py-2 rounded-xl text-xs font-bold uppercase border border-slate-700 transition-all"
            >
              📤 Esporta DB
            </button>
            {/* Archivio */}
            <button
              onClick={() => setIsLoadModalOpen(true)}
              className="bg-indigo-700 hover:bg-indigo-600 px-4 py-2 rounded-xl text-xs font-bold uppercase border border-indigo-600 transition-all"
            >
              🗂 Archivio ({savedArticles.length})
            </button>
          </div>
        </header>

        {/* Main grid */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left column */}
          <div className="lg:col-span-5 space-y-6">
            <ArticleInput
              value={articleText}
              onChange={setArticleText}
              onOptimize={addToQueue}
              onResearch={handleResearch}
              isLoading={isLoading}
              isResearching={isResearching}
              onLoadClick={() => setIsLoadModalOpen(true)}
              savedCount={savedArticles.length}
              lastAutoSave={null}
              onExportDB={handleExportDB}
              onImportDB={() => importInputRef.current?.click()}
              researchSources={researchSources}
            />

            <ImageConverter />

            {/* Batch queue */}
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-sm font-bold uppercase text-slate-400 flex items-center gap-2">
                    <ArchiveBoxIcon className="w-4 h-4" /> Coda di Elaborazione
                  </h3>
                  {batchStats.total > 0 && (
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {batchStats.completed}/{batchStats.total} completati
                      {batchStats.error > 0 && ` · ${batchStats.error} errori`}
                    </p>
                  )}
                </div>
                {batchStats.pending > 0 && (
                  <button
                    onClick={processBatch}
                    disabled={isLoading}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all"
                  >
                    {isLoading ? `In corso...` : `OTTIMIZZA (${batchStats.pending})`}
                  </button>
                )}
              </div>

              {/* Progress bar globale */}
              {batchStats.total > 0 && (
                <div className="mb-4">
                  <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-500"
                      style={{ width: `${(batchStats.completed / batchStats.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {batchQueue.length === 0 ? (
                  <p className="text-xs text-slate-500 italic text-center py-4">
                    Aggiungi articoli alla coda per iniziare.
                  </p>
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
                        <p className="text-xs font-bold text-slate-200 truncate">{item.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-bold uppercase ${
                            item.status === 'completed' ? 'text-green-400' :
                            item.status === 'processing' ? 'text-indigo-400 animate-pulse' :
                            item.status === 'error' ? 'text-red-400' : 'text-slate-500'
                          }`}>
                            {item.status === 'processing' ? `${item.progress}%` : item.status}
                          </span>
                        </div>
                        {/* ✅ Barra progresso per singolo item */}
                        {item.status === 'processing' && (
                          <div className="mt-1.5 w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-400 transition-all duration-500"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        )}
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

          {/* Right column */}
          <div className="lg:col-span-7">
            <SeoOutput
              result={currentResult}
              isLoading={isLoading && currentBatchItem?.status === 'processing'}
              isEnriching={isEnriching}
              onIncreaseDepth={handleEnrich}
              error={currentError ?? null}
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
        onDelete={handleDeleteSaved}
      />
    </div>
  );
};

export default App;