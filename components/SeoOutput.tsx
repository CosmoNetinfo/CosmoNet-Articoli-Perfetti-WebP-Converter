import React, { useState, useCallback, useMemo } from 'react';
import { SeoResult } from '../types';
import { Loader } from './Loader';
import {
  ClipboardIcon, CheckIcon, EyeIcon, CodeBracketIcon,
  SparklesIcon, DocumentMagnifyingGlassIcon, BookmarkIcon, ShareIcon
} from './IconComponents';

interface SeoOutputProps {
  result: SeoResult | null;
  isLoading: boolean;
  isEnriching?: boolean;
  onIncreaseDepth?: () => void;
  error: string | null;
  onSave: (finalHtml?: string) => void;
}

// ─── SeoDataItem ──────────────────────────────────────────────────────────────

const SeoDataItem: React.FC<{ label: string; value: string; mono?: boolean; badge?: string }> = ({
  label, value, mono = false, badge
}) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  const len = value.length;
  const isTitle = label.toLowerCase().includes('titolo') || label.toLowerCase().includes('title');
  const isMeta = label.toLowerCase().includes('meta');
  const tooLong = (isTitle && len > 60) || (isMeta && len > 160);
  const tooShort = (isTitle && len < 30) || (isMeta && len < 120);

  return (
    <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-700/30 group">
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] uppercase font-bold text-slate-500">{label}</label>
        <div className="flex items-center gap-2">
          {badge && <span className="text-[10px] text-slate-500">{badge}</span>}
          <span className={`text-[10px] font-bold ${tooLong ? 'text-red-400' : tooShort ? 'text-yellow-400' : 'text-green-400'}`}>
            {len}c
          </span>
        </div>
      </div>
      <div className="flex justify-between items-center gap-2">
        <p className={`text-slate-200 text-sm ${mono ? 'font-mono' : ''}`} title={value}>{value}</p>
        <button onClick={handleCopy} className="text-slate-500 hover:text-indigo-400 p-1 flex-shrink-0">
          {copied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <ClipboardIcon className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

// ─── ChecklistBadge ────────────────────────────────────────────────────────────

const statusColor = {
  pass: 'text-green-400 bg-green-400/10',
  fail: 'text-red-400 bg-red-400/10',
  manual_action: 'text-yellow-400 bg-yellow-400/10',
  good: 'text-green-400 bg-green-400/10',
  ok: 'text-yellow-400 bg-yellow-400/10',
  needs_improvement: 'text-red-400 bg-red-400/10',
};

// ─── SeoOutput ────────────────────────────────────────────────────────────────

export const SeoOutput: React.FC<SeoOutputProps> = ({
  result, isLoading, isEnriching, onIncreaseDepth, error, onSave
}) => {
  const [activeTab, setActiveTab] = useState<'seo' | 'geo' | 'readability' | 'schema' | 'content' | 'social' | 'sources'>('seo');
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [codeCopied, setCodeCopied] = useState(false);
  const [activeSocialPlatform, setActiveSocialPlatform] = useState(0);

  const wordCount = useMemo(() => {
    if (!result) return 0;
    return result.htmlContent
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .trim()
      .split(/\s+/).length;
  }, [result]);

  const seoScore = useMemo(() => {
    if (!result) return 0;
    const pass = result.seoChecklist.filter(c => c.status === 'pass').length;
    return Math.round((pass / result.seoChecklist.length) * 100);
  }, [result]);

  const handleCopyFullCode = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.htmlContent).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };

  // ✅ NUOVO: export come file .html scaricabile
  const handleExportHtml = () => {
    if (!result) return;
    const slug = result.seo_metadata.slug || 'articolo';
    const blob = new Blob([result.htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fullSchemaJson = useMemo(() => {
    if (!result) return '';
    return JSON.stringify({
      ...result.schema_markup.article,
      mainEntity: {
        "@type": "FAQPage",
        mainEntity: result.schema_markup.faq_schema
      }
    }, null, 2);
  }, [result]);

  const tabs = [
    { id: 'seo',          icon: DocumentMagnifyingGlassIcon, label: 'SEO & Meta' },
    { id: 'geo',          icon: SparklesIcon,                label: 'GEO / AI' },
    { id: 'readability',  icon: CheckIcon,                   label: 'Qualità' },
    { id: 'content',      icon: EyeIcon,                     label: 'Articolo HTML' },
    { id: 'social',       icon: ShareIcon,                   label: 'Social' },
    { id: 'schema',       icon: CodeBracketIcon,             label: 'Schema' },
    { id: 'sources',      icon: BookmarkIcon,                label: 'Fonti' },
  ];

  if (isLoading) return (
    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 h-full flex items-center justify-center">
      <Loader />
    </div>
  );

  if (error) return (
    <div className="bg-slate-800/50 p-6 rounded-2xl border border-red-900/20 text-red-400 flex items-center justify-center text-center">
      {error}
    </div>
  );

  if (!result) return (
    <div className="bg-slate-800/50 p-12 rounded-2xl border border-slate-700 h-full flex flex-col items-center justify-center text-center text-slate-500">
      <SparklesIcon className="w-16 h-16 mb-4 opacity-20" />
      <p className="text-lg font-medium">Nessuna analisi attiva</p>
      <p className="text-sm">Aggiungi un articolo alla coda e avvia l'ottimizzazione.</p>
    </div>
  );

  const socialPosts = result.social_posts?.length ? result.social_posts : [result.social_post];

  return (
    <div className="bg-slate-800/50 rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col h-full overflow-hidden">
      {/* Tab bar */}
      <div className="flex bg-slate-900/50 p-1 border-b border-slate-700/50 overflow-x-auto gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold uppercase transition-all rounded-xl whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* ── TAB: SEO & Meta ── */}
        {activeTab === 'seo' && (
          <div className="space-y-4">
            {/* Score cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-indigo-900/20 p-4 rounded-xl border border-indigo-500/20 text-center">
                <h4 className="text-[10px] uppercase font-bold text-indigo-300 mb-1">SEO Score</h4>
                <p className={`text-2xl font-bold ${seoScore >= 80 ? 'text-green-400' : seoScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {seoScore}%
                </p>
              </div>
              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-700/30 text-center">
                <h4 className="text-[10px] uppercase font-bold text-slate-400 mb-1">Parole</h4>
                <p className={`text-2xl font-bold ${wordCount >= 1000 ? 'text-green-400' : 'text-yellow-400'}`}>{wordCount}</p>
              </div>
              <button
                onClick={onIncreaseDepth}
                disabled={isEnriching}
                className="bg-indigo-600 text-white px-2 py-2 rounded-xl text-[10px] font-bold uppercase hover:bg-indigo-500 transition-colors"
              >
                {isEnriching ? '⏳ Cercando...' : '🔗 Trova Fonti'}
              </button>
            </div>

            <SeoDataItem label="Titolo SEO (H1 / CTR)" value={result.seo_metadata.seo_title} />
            <SeoDataItem label="Focus Keyword (Yoast)" value={result.seo_metadata.yoast_focus_keyword} mono />
            <SeoDataItem label="Slug URL" value={result.seo_metadata.slug} mono />
            <SeoDataItem label="Meta Description" value={result.seo_metadata.meta_description} />
            <div className="grid grid-cols-2 gap-4">
              <SeoDataItem label="Categoria" value={result.seo_metadata.category} />
              <SeoDataItem label="Tag SEO" value={result.seo_metadata.tags.join(', ')} />
            </div>

            {/* SEO Checklist */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Checklist SEO</h4>
              <div className="space-y-2">
                {result.seoChecklist.map((item, i) => (
                  <div key={i} className="bg-slate-900/30 p-3 rounded-xl border border-slate-700/30 flex items-start gap-3">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${statusColor[item.status] || 'text-slate-400 bg-slate-700'}`}>
                      {item.status === 'pass' ? '✓' : item.status === 'fail' ? '✗' : '⚠'}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-200">{item.item}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{item.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: GEO / AI ── */}
        {activeTab === 'geo' && (
          <div className="space-y-6">
            <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-4">
              <h4 className="text-xs font-bold text-indigo-300 uppercase mb-2 flex items-center gap-2">
                🤖 Risposta Diretta (Featured Snippet / AI Citation)
              </h4>
              <p className="text-slate-200 text-sm leading-relaxed">
                {result.geo_optimization?.direct_answer || 'Non disponibile'}
              </p>
              <button
                onClick={() => navigator.clipboard.writeText(result.geo_optimization?.direct_answer || '')}
                className="mt-2 text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase"
              >
                Copia
              </button>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Entità e Definizioni</h4>
              <div className="space-y-2">
                {result.geo_optimization?.entity_definitions?.map((e, i) => (
                  <div key={i} className="bg-slate-900/40 p-3 rounded-xl border border-slate-700/30">
                    <span className="text-indigo-400 font-bold text-xs">{e.entity}</span>
                    <p className="text-slate-300 text-sm mt-1">{e.definition}</p>
                  </div>
                )) || <p className="text-slate-500 text-sm italic">Nessuna entità rilevata.</p>}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Key Facts (citabili da AI)</h4>
              <div className="space-y-2">
                {result.geo_optimization?.key_facts?.map((fact, i) => (
                  <div key={i} className="flex items-start gap-2 bg-slate-900/40 p-3 rounded-xl border border-slate-700/30">
                    <span className="text-cyan-400 font-bold text-xs mt-0.5 flex-shrink-0">#{i + 1}</span>
                    <p className="text-slate-200 text-sm">{fact}</p>
                  </div>
                )) || <p className="text-slate-500 text-sm italic">Nessun fatto chiave rilevato.</p>}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: Qualità ── */}
        {activeTab === 'readability' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {result.readability.map((r, i) => (
              <div key={i} className="bg-slate-900/30 p-4 rounded-xl border border-slate-700/30">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-200">{r.criteria}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor[r.status] || 'text-slate-400 bg-slate-700'}`}>
                    {r.score}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">{r.message}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── TAB: Articolo HTML ── */}
        {activeTab === 'content' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
                <button
                  onClick={() => setViewMode('preview')}
                  className={`px-4 py-1.5 text-[10px] font-bold rounded-md transition-all ${viewMode === 'preview' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
                >
                  ANTEPRIMA
                </button>
                <button
                  onClick={() => setViewMode('code')}
                  className={`px-4 py-1.5 text-[10px] font-bold rounded-md transition-all ${viewMode === 'code' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
                >
                  CODICE HTML
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyFullCode}
                  className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-xl text-white text-[10px] font-bold uppercase transition-colors"
                >
                  {codeCopied ? <CheckIcon className="w-4 h-4" /> : <ClipboardIcon className="w-4 h-4" />}
                  Copia
                </button>
                {/* ✅ NUOVO: download file .html */}
                <button
                  onClick={handleExportHtml}
                  className="flex items-center gap-2 bg-cyan-700 hover:bg-cyan-600 px-3 py-2 rounded-xl text-white text-[10px] font-bold uppercase transition-colors"
                >
                  📥 Scarica .html
                </button>
                <button
                  onClick={() => onSave()}
                  title="Salva in archivio"
                  className="bg-emerald-600 p-2 rounded-xl text-white hover:bg-emerald-500 transition-colors"
                >
                  <BookmarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden min-h-[600px] border border-slate-300 shadow-inner">
              {viewMode === 'preview' ? (
                <iframe
                  srcDoc={`<html><head><style>
                    body{font-family:'Inter',sans-serif;line-height:1.8;color:#334155;padding:40px;max-width:850px;margin:0 auto;background:#fff;}
                    h1{color:#0f172a;border-bottom:4px solid #6366f1;padding-bottom:15px;font-size:2.2rem;margin-bottom:40px;font-weight:800;}
                    h2{color:#1e1b4b;margin-top:50px;padding-bottom:12px;border-bottom:1px solid #f1f5f9;font-weight:700;}
                    h3{color:#312e81;font-weight:700;margin-top:30px;}
                    p{margin-bottom:1.6em;text-align:justify;}
                    a{color:#4f46e5;text-decoration:none;font-weight:500;border-bottom:1px solid #c7d2fe;}
                    ul,ol{padding-left:35px;margin-bottom:1.6em;color:#475569;}
                    li{margin-bottom:0.8em;}
                    table{width:100%;border-collapse:collapse;margin:30px 0;}
                    th,td{border:1px solid #e2e8f0;padding:12px 15px;text-align:left;}
                    th{background:#f8fafc;font-weight:700;}
                    tr:nth-child(even){background:#fafafa;}
                    .faq-item{padding:20px;background:#fdfdfd;border-radius:12px;border:1px solid #f1f5f9;margin-bottom:20px;}
                    code{background:#f1f5f9;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:0.9em;}
                    pre{background:#1e293b;color:#e2e8f0;padding:20px;border-radius:12px;overflow-x:auto;}
                    script{display:none;}
                  </style></head><body>${result.htmlContent}</body></html>`}
                  className="w-full h-[600px]"
                  title="Anteprima articolo"
                />
              ) : (
                <div className="p-6 bg-slate-950 h-[600px] overflow-auto font-mono text-[11px] text-emerald-400 whitespace-pre-wrap leading-relaxed">
                  {result.htmlContent}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: Social ── */}
        {activeTab === 'social' && (
          <div className="space-y-4">
            {/* Platform selector */}
            <div className="flex gap-2 flex-wrap">
              {socialPosts.map((post, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSocialPlatform(i)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all border ${
                    activeSocialPlatform === i
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {post.platform}
                </button>
              ))}
            </div>

            {/* Active post */}
            {socialPosts[activeSocialPlatform] && (() => {
              const post = socialPosts[activeSocialPlatform];
              const fullText = `${post.content}\n\n${post.hashtags.join(' ')}`;
              return (
                <div className="space-y-4">
                  <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-700/50">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                          {post.platform.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-100">{post.platform}</p>
                          <p className="text-[10px] text-slate-500">Draft generato dall'AI</p>
                        </div>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(fullText)}
                        className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-xl text-white text-[10px] font-bold uppercase transition-colors"
                      >
                        <ClipboardIcon className="w-4 h-4" /> Copia
                      </button>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap mb-4">
                      {post.content}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {post.hashtags.map((tag, i) => (
                        <span key={i} className="text-indigo-400 text-xs font-medium hover:underline cursor-pointer">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 text-center">
                    {post.content.length} caratteri · {post.hashtags.length} hashtag
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── TAB: Schema JSON-LD ── */}
        {activeTab === 'schema' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-400 uppercase">Dati Strutturati JSON-LD</h4>
              <button
                onClick={() => navigator.clipboard.writeText(fullSchemaJson)}
                className="text-indigo-400 text-[10px] font-bold uppercase hover:text-indigo-300"
              >
                Copia Schema
              </button>
            </div>
            <pre className="bg-black/50 p-4 rounded-xl text-[10px] text-cyan-400 font-mono overflow-auto max-h-[500px] border border-slate-700">
              {fullSchemaJson}
            </pre>
          </div>
        )}

        {/* ── TAB: Fonti ── */}
        {activeTab === 'sources' && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-indigo-400 uppercase flex items-center gap-2">
              <BookmarkIcon className="w-5 h-5" /> Fonti e Riferimenti Web
            </h4>
            <p className="text-xs text-slate-500">
              Fonti autorevoli usate da Gemini per verificare fatti e arricchire il contenuto.
            </p>
            <div className="space-y-2">
              {result.groundingSources && result.groundingSources.length > 0 ? (
                result.groundingSources.map((source, i) => (
                  <a
                    key={i}
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 bg-slate-900/50 border border-slate-700 rounded-xl hover:border-indigo-500 transition-all group"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-200 font-medium group-hover:text-indigo-400 truncate pr-4">
                        {source.title}
                      </span>
                      <ShareIcon className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 flex-shrink-0" />
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-1">{source.uri}</p>
                  </a>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500 italic text-sm">
                  Nessuna fonte web rilevata per questo articolo.<br />
                  <span className="text-xs">Usa "Trova Fonti" per arricchire l'articolo.</span>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};