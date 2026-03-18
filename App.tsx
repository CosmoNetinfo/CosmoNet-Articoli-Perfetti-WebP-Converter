import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ArticleInput } from './components/ArticleInput';
import { SeoOutput } from './components/SeoOutput';
import { optimizeArticleForSeo, enrichArticleDepth, researchTopicStream, researchWithCosmonetStream, qaAndFixHtml } from './services/geminiService';
import { SeoResult, SavedSeoResult, BatchItem } from './types';
import { SparklesIcon, ArchiveBoxIcon, TrashIcon } from './components/IconComponents';
import { LoadModal } from './components/LoadModal';
import { ImageConverter } from './components/ImageConverter';
import {
  signInWithGoogle, signOut, onAuthChange,
  saveArticleToCloud, loadArticlesFromCloud, deleteArticleFromCloud
} from './firebase';
import type { User } from 'firebase/auth';

// ✅ PIPELINE IMPORTS
import { listenForStatus, updateJobWithArticle, setJobError, PipelineJob } from './services/pipelineService';

const STORAGE_KEY = 'cosmonet-articoli-perfetti-v2';
const CONCURRENCY_LIMIT = 4;

// ─── LocalStorage utils ───────────────────────────────────────────────────────

function loadFromStorage(): SavedSeoResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveToStorage(articles: SavedSeoResult[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
  } catch (e: any) {
    if (e.name === 'QuotaExceededError') console.warn('⚠️ localStorage pieno.');
  }
}

// ─── App ──────────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const [articleText, setArticleText]     = useState<string>('');
  const [batchQueue, setBatchQueue]       = useState<BatchItem[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [isLoading, setIsLoading]         = useState<boolean>(false);
  const [isEnriching, setIsEnriching]     = useState<boolean>(false);
  const [isFixing, setIsFixing]           = useState<boolean>(false);
  const [isResearching, setIsResearching] = useState<boolean>(false);
  const [researchSources, setResearchSources] = useState<{ title: string; uri: string }[]>([]);
  const [error, setError]                 = useState<string | null>(null);
  const [savedArticles, setSavedArticles] = useState<SavedSeoResult[]>([]);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [storageWarning, setStorageWarning]   = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // ── Firebase Auth ──────────────────────────────────────────────────────────
  const [user, setUser]           = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [cloudStatus, setCloudStatus]   = useState<string | null>(null);

  // ✅ PIPELINE STATE
  const [pipelineJobs, setPipelineJobs]       = useState<PipelineJob[]>([]);
  const [pipelineAutoMode, setPipelineAutoMode] = useState(false);
  const [pipelineProcessingId, setPipelineProcessingId] = useState<string | null>(null);
  const [showPipelinePanel, setShowPipelinePanel] = useState(false);
  const pipelineProcessingIdRef = useRef<string | null>(null);

  // Selectors
  const currentBatchItem = selectedBatchId ? batchQueue.find(b => b.id === selectedBatchId) ?? null : null;
  const currentResult    = currentBatchItem?.result ?? null;
  const currentError     = currentBatchItem?.error ?? error;

  // ─── Auth listener ──────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthChange(async (u) => {
      setUser(u);
      setAuthLoading(false);
      if (u) {
        setCloudSyncing(true);
        setCloudStatus('☁️ Sincronizzazione in corso...');
        try {
          const cloud = await loadArticlesFromCloud(u.uid);
          const normalized = cloud.map(a => ({
            ...a,
            htmlContent: typeof a.htmlContent === 'string' ? a.htmlContent : '',
            seoChecklist: a.seoChecklist ?? [],
            readability:  a.readability  ?? [],
            social_posts: a.social_posts ?? [],
            groundingSources: a.groundingSources ?? [],
          }));
          setSavedArticles(normalized);
          saveToStorage(normalized);
          setCloudStatus(`✅ ${cloud.length} articoli sincronizzati`);
        } catch (e) {
          setCloudStatus('⚠️ Errore sync. Uso cache locale.');
          setSavedArticles(loadFromStorage());
        } finally {
          setCloudSyncing(false);
          setTimeout(() => setCloudStatus(null), 4000);
        }
      } else {
        setSavedArticles(loadFromStorage());
      }
    });
    return unsub;
  }, []);

  // ✅ PIPELINE LISTENER — ascolta job con status "brief_ready"
  useEffect(() => {
    const unsub = listenForStatus('brief_ready', (jobs) => {
      setPipelineJobs(jobs);
      // Mostra il pannello automaticamente se arrivano job
      if (jobs.length > 0) setShowPipelinePanel(true);
    });
    return () => unsub();
  }, []);

  // ✅ PIPELINE AUTO-PROCESSING — processa automaticamente se autoMode ON
  useEffect(() => {
    if (!pipelineAutoMode) return;
    if (pipelineJobs.length === 0) return;
    if (pipelineProcessingIdRef.current) return; // già in elaborazione

    const job = pipelineJobs[0];
    if (!job.id || !job.brief) return;

    pipelineProcessingIdRef.current = job.id;
    setPipelineProcessingId(job.id);

    const process = async () => {
      try {
        console.log(`[Pipeline] Avvio elaborazione job: ${job.id} - "${job.title}"`);

        // Usa optimizeArticleForSeo con il brief come testo di input
        const result = await optimizeArticleForSeo(job.brief);

        // Estrai l'HTML generato
        const htmlToSave = typeof result.htmlContent === 'string' && result.htmlContent
          ? result.htmlContent
          : '';

        if (!htmlToSave) {
          throw new Error('HTML generato vuoto');
        }

        // Aggiorna Firestore con l'HTML
        await updateJobWithArticle(job.id!, htmlToSave);

        // Aggiungi anche alla batch queue locale per visibilità
        const newItem: BatchItem = {
          id: `pipeline-${job.id}`,
          title: job.title || 'Articolo da Pipeline',
          text: job.brief,
          status: 'completed',
          result,
          progress: 100,
          createdAt: new Date().toISOString()
        };
        setBatchQueue(prev => [newItem, ...prev]);
        setSelectedBatchId(newItem.id);

        console.log(`[Pipeline] Job completato: ${job.id}`);
      } catch (err: any) {
        console.error(`[Pipeline] Errore job ${job.id}:`, err);
        if (job.id) await setJobError(job.id, err.message);
      } finally {
        pipelineProcessingIdRef.current = null;
        setPipelineProcessingId(null);
      }
    };

    process();
  }, [pipelineJobs, pipelineAutoMode]);

  // ✅ PIPELINE MANUAL PROCESS — processa un job manualmente
  const processPipelineJob = async (job: PipelineJob) => {
    if (!job.id || !job.brief || pipelineProcessingIdRef.current) return;

    pipelineProcessingIdRef.current = job.id;
    setPipelineProcessingId(job.id);

    try {
      const result = await optimizeArticleForSeo(job.brief);
      const htmlToSave = typeof result.htmlContent === 'string' ? result.htmlContent : '';

      if (!htmlToSave) throw new Error('HTML generato vuoto');

      await updateJobWithArticle(job.id, htmlToSave);

      const newItem: BatchItem = {
        id: `pipeline-${job.id}`,
        title: job.title || 'Articolo da Pipeline',
        text: job.brief,
        status: 'completed',
        result,
        progress: 100,
        createdAt: new Date().toISOString()
      };
      setBatchQueue(prev => [newItem, ...prev]);
      setSelectedBatchId(newItem.id);
    } catch (err: any) {
      await setJobError(job.id, err.message);
    } finally {
      pipelineProcessingIdRef.current = null;
      setPipelineProcessingId(null);
    }
  };

  // ─── Auth handlers ──────────────────────────────────────────────────────────
  const handleSignIn = async () => {
    try { await signInWithGoogle(); }
    catch (e) { setError('Accesso Google fallito. Riprova.'); }
  };

  const handleSignOut = async () => {
    await signOut();
    setSavedArticles(loadFromStorage());
    setCloudStatus(null);
  };

  // ─── Batch queue ────────────────────────────────────────────────────────────
  const addToQueue = () => {
    if (!articleText.trim()) return;
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
      const sources = await fn(topic, (text) => setArticleText(text));
      setResearchSources(sources);
    } catch {
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
          const progressInterval = setInterval(() => {
            setBatchQueue(prev => prev.map(b =>
              b.id === item.id && b.progress < 85
                ? { ...b, progress: b.progress + 5 } : b
            ));
          }, 800);
          const result = await optimizeArticleForSeo(item.text);
          clearInterval(progressInterval);
          updateItem(item.id, {
            status: 'completed', progress: 100, result,
            title: result.html_content.title || item.title
          });
        } catch {
          updateItem(item.id, { status: 'error', progress: 0, error: "Errore durante l'ottimizzazione." });
        }
      }));
    }
    setIsLoading(false);
  };

  // ─── Enrich / QA ────────────────────────────────────────────────────────────
  const handleEnrich = async () => {
    if (!selectedBatchId || !currentResult) return;
    setIsEnriching(true);
    try {
      const enriched = await enrichArticleDepth(currentResult, '');
      updateItem(selectedBatchId, { result: enriched });
    } catch {
      setError("Errore durante l'arricchimento con fonti.");
    } finally {
      setIsEnriching(false);
    }
  };

  const handleQaFix = async () => {
    if (!selectedBatchId || !currentResult) return;
    setIsFixing(true);
    try {
      const fixed = await qaAndFixHtml(currentResult);
      updateItem(selectedBatchId, { result: fixed });
    } catch {
      setError("Errore durante il QA & Fix strutturale.");
    } finally {
      setIsFixing(false);
    }
  };

  // ─── Save ────────────────────────────────────────────────────────────────────
  const handleSaveArticle = useCallback(async (finalHtml?: string) => {
    const item = batchQueue.find(b => b.id === selectedBatchId);
    if (!item?.result) return;

    const htmlToSave = finalHtml
      || (typeof item.result.htmlContent === 'string' && item.result.htmlContent ? item.result.htmlContent : '');

    if (!htmlToSave) {
      setError("Impossibile salvare: HTML articolo mancante. Rigenera l'articolo.");
      return;
    }

    const saved: SavedSeoResult = {
      ...item.result,
      htmlContent: htmlToSave,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      savedAt: new Date().toISOString(),
      originalArticleText: item.text,
    };

    const updated = [...savedArticles, saved];
    setSavedArticles(updated);

    if (user) {
      setCloudSyncing(true);
      setCloudStatus('☁️ Salvataggio su cloud...');
      try {
        const firebaseId = await saveArticleToCloud(user.uid, saved);
        const withId = updated.map(a => a.id === saved.id ? { ...a, firebaseId } : a);
        setSavedArticles(withId);
        saveToStorage(withId);
        setCloudStatus('✅ Salvato su Firebase');
      } catch {
        setCloudStatus('⚠️ Errore cloud, salvato solo in locale');
        saveToStorage(updated);
      } finally {
        setCloudSyncing(false);
        setTimeout(() => setCloudStatus(null), 3000);
      }
    } else {
      try { saveToStorage(updated); }
      catch { setStorageWarning('⚠️ Spazio localStorage esaurito.'); }
    }
  }, [selectedBatchId, batchQueue, savedArticles, user]);

  // ─── Load ────────────────────────────────────────────────────────────────────
  const handleLoadArticle = useCallback((article: SavedSeoResult) => {
    const { id, savedAt, originalArticleText, ...resultData } = article;
    const safeResult: SeoResult = {
      ...(resultData as SeoResult),
      htmlContent: typeof resultData.htmlContent === 'string' ? resultData.htmlContent : '',
      seoChecklist: resultData.seoChecklist ?? [],
      readability:  resultData.readability  ?? [],
      social_posts: resultData.social_posts ?? [],
      groundingSources: resultData.groundingSources ?? [],
    };
    const newItem: BatchItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: article.html_content?.title || 'Articolo caricato',
      text: originalArticleText || '',
      status: 'completed',
      result: safeResult,
      progress: 100,
      createdAt: savedAt || new Date().toISOString()
    };
    setBatchQueue(prev => [...prev, newItem]);
    setSelectedBatchId(newItem.id);
    setIsLoadModalOpen(false);
  }, []);

  // ─── Delete ──────────────────────────────────────────────────────────────────
  const handleDeleteSaved = useCallback(async (id: string) => {
    const article = savedArticles.find(a => a.id === id);
    const updated = savedArticles.filter(a => a.id !== id);
    setSavedArticles(updated);
    saveToStorage(updated);
    if (user && (article as any)?.firebaseId) {
      try { await deleteArticleFromCloud(user.uid, (article as any).firebaseId); }
      catch { console.warn('Errore cancellazione Firebase.'); }
    }
  }, [savedArticles, user]);

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
    reader.onload = async (ev) => {
      try {
        const imported: SavedSeoResult[] = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(imported)) throw new Error('Formato non valido');
        const existingIds = new Set(savedArticles.map(a => a.id));
        const newOnes = imported.filter(a => !existingIds.has(a.id));
        const merged = [...savedArticles, ...newOnes];
        setSavedArticles(merged);
        saveToStorage(merged);
        if (user && newOnes.length > 0) {
          setCloudSyncing(true);
          setCloudStatus(`☁️ Caricamento ${newOnes.length} articoli su Firebase...`);
          try {
            await Promise.all(newOnes.map(a => saveArticleToCloud(user.uid, a)));
            setCloudStatus(`✅ ${newOnes.length} articoli importati su Firebase`);
          } catch {
            setCloudStatus('⚠️ Import locale OK, errore Firebase');
          } finally {
            setCloudSyncing(false);
            setTimeout(() => setCloudStatus(null), 4000);
          }
        } else {
          alert(`✅ Importati ${newOnes.length} articoli.`);
        }
      } catch { alert('❌ File non valido.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [savedArticles, user]);

  // ─── Batch stats ─────────────────────────────────────────────────────────────
  const batchStats = {
    total:      batchQueue.length,
    pending:    batchQueue.filter(b => b.status === 'pending').length,
    processing: batchQueue.filter(b => b.status === 'processing').length,
    completed:  batchQueue.filter(b => b.status === 'completed').length,
    error:      batchQueue.filter(b => b.status === 'error').length,
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="bg-slate-900 min-h-screen text-slate-200 font-sans pb-20">

      {storageWarning && (
        <div className="bg-amber-900/80 border-b border-amber-600 text-amber-200 text-xs text-center py-2 px-4 flex items-center justify-center gap-3">
          {storageWarning}
          <button onClick={() => setStorageWarning(null)} className="underline">Chiudi</button>
          <button onClick={handleExportDB} className="bg-amber-600 px-3 py-1 rounded-lg font-bold">Esporta ora</button>
        </div>
      )}

      {cloudStatus && (
        <div className={`border-b text-xs text-center py-2 px-4 flex items-center justify-center gap-2 transition-all ${
          cloudStatus.startsWith('✅') ? 'bg-emerald-900/70 border-emerald-700 text-emerald-200' :
          cloudStatus.startsWith('⚠️') ? 'bg-amber-900/70 border-amber-700 text-amber-200' :
          'bg-indigo-900/70 border-indigo-700 text-indigo-200'
        }`}>
          {cloudSyncing && <span className="w-3 h-3 border-2 border-t-transparent border-current rounded-full animate-spin" />}
          {cloudStatus}
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
          <div className="flex gap-2 flex-wrap justify-end items-center">

            {/* ✅ PIPELINE BUTTON */}
            <button
              onClick={() => setShowPipelinePanel(!showPipelinePanel)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-bold uppercase transition-all relative ${
                pipelineJobs.length > 0
                  ? 'bg-cyan-900/40 border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/60'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              🔗 Pipeline
              {pipelineJobs.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-cyan-500 text-[9px] font-bold text-slate-900 rounded-full flex items-center justify-center">
                  {pipelineJobs.length}
                </span>
              )}
            </button>

            {authLoading ? (
              <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            ) : user ? (
              <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2">
                <img src={user.photoURL || ''} className="w-6 h-6 rounded-full" alt="" />
                <span className="text-xs text-slate-300 font-medium hidden md:block">{user.displayName}</span>
                <button onClick={handleSignOut} className="text-[10px] text-slate-500 hover:text-red-400 font-bold uppercase ml-1">Esci</button>
              </div>
            ) : (
              <button onClick={handleSignIn} className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-800 px-4 py-2 rounded-xl text-xs font-bold uppercase border border-slate-300 transition-all">
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Accedi con Google
              </button>
            )}

            <input ref={importInputRef} type="file" accept=".json" className="hidden" onChange={handleImportDB} />
            <button onClick={() => importInputRef.current?.click()} className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl text-xs font-bold uppercase border border-slate-700 transition-all">📥 Importa DB</button>
            <button onClick={handleExportDB} disabled={savedArticles.length === 0} className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 px-4 py-2 rounded-xl text-xs font-bold uppercase border border-slate-700 transition-all">📤 Esporta DB</button>
            <button onClick={() => setIsLoadModalOpen(true)} className="bg-indigo-700 hover:bg-indigo-600 px-4 py-2 rounded-xl text-xs font-bold uppercase border border-indigo-600 transition-all">🗂 Archivio ({savedArticles.length})</button>
          </div>
        </header>

        {/* ✅ PIPELINE PANEL */}
        {showPipelinePanel && (
          <div className="mb-6 bg-slate-800/80 border border-cyan-500/30 rounded-2xl p-5 shadow-lg shadow-cyan-900/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] animate-pulse" />
                <h3 className="text-sm font-bold text-cyan-300 uppercase tracking-wider">Pipeline in arrivo</h3>
                <span className="text-[10px] text-slate-500 font-mono">Brief Generator → Articoli Perfetti</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Auto</span>
                <button
                  onClick={() => setPipelineAutoMode(!pipelineAutoMode)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${pipelineAutoMode ? 'bg-cyan-500' : 'bg-slate-600'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${pipelineAutoMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <button onClick={() => setShowPipelinePanel(false)} className="text-slate-500 hover:text-slate-300 text-xs">✕</button>
              </div>
            </div>

            {pipelineJobs.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-3">Nessun brief in attesa di elaborazione.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {pipelineJobs.map(job => (
                  <div key={job.id} className="flex items-center justify-between gap-3 bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-200 truncate">{job.title || 'Senza titolo'}</p>
                      <p className="text-[10px] text-slate-500 font-mono truncate mt-0.5">{job.brief?.substring(0, 80)}...</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {pipelineProcessingId === job.id ? (
                        <span className="flex items-center gap-1.5 text-[10px] text-cyan-400 font-bold uppercase">
                          <span className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                          Elaborazione...
                        </span>
                      ) : (
                        !pipelineAutoMode && (
                          <button
                            onClick={() => processPipelineJob(job)}
                            disabled={!!pipelineProcessingId}
                            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-[10px] font-bold uppercase rounded-lg transition-colors"
                          >
                            Processa
                          </button>
                        )
                      )}
                      {pipelineAutoMode && pipelineProcessingId !== job.id && (
                        <span className="text-[10px] text-slate-500 uppercase font-bold">In coda</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[10px] text-slate-600 mt-3 text-center">
              {pipelineAutoMode
                ? '⚡ Auto ON — i brief verranno elaborati automaticamente non appena arrivano'
                : '⏸ Auto OFF — clicca "Processa" per elaborare manualmente ogni brief'}
            </p>
          </div>
        )}

        {/* Main grid */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
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
                  <button onClick={processBatch} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all">
                    {isLoading ? 'In corso...' : `OTTIMIZZA (${batchStats.pending})`}
                  </button>
                )}
              </div>

              {batchStats.total > 0 && (
                <div className="mb-4">
                  <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${(batchStats.completed / batchStats.total) * 100}%` }} />
                  </div>
                </div>
              )}

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {batchQueue.length === 0 ? (
                  <p className="text-xs text-slate-500 italic text-center py-4">Aggiungi articoli alla coda per iniziare.</p>
                ) : (
                  batchQueue.map((item, index) => (
                    <div
                      key={item.id || `batch-${index}`}
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
                            item.status === 'completed'  ? 'text-green-400' :
                            item.status === 'processing' ? 'text-indigo-400 animate-pulse' :
                            item.status === 'error'      ? 'text-red-400' : 'text-slate-500'
                          }`}>
                            {item.status === 'processing' ? `${item.progress}%` : item.status}
                          </span>
                          {/* Badge pipeline */}
                          {item.id.startsWith('pipeline-') && (
                            <span className="text-[9px] bg-cyan-900/40 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded-full font-bold uppercase">Pipeline</span>
                          )}
                        </div>
                        {item.status === 'processing' && (
                          <div className="mt-1.5 w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-400 transition-all duration-500" style={{ width: `${item.progress}%` }} />
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

          <div className="lg:col-span-7">
            <SeoOutput
              result={currentResult}
              isLoading={isLoading && currentBatchItem?.status === 'processing'}
              isEnriching={isEnriching}
              isFixing={isFixing}
              onIncreaseDepth={handleEnrich}
              onQaFix={handleQaFix}
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