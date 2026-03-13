
import React, { useState, useCallback, useMemo } from 'react';
import { SeoResult, GroundingSource } from '../types';
import { Loader } from './Loader';
// Fixed: Removed missing PrinterIcon import
import { ClipboardIcon, CheckIcon, EyeIcon, CodeBracketIcon, CheckCircleIcon, SparklesIcon, DocumentMagnifyingGlassIcon, BookmarkIcon, ShareIcon } from './IconComponents';

interface SeoOutputProps {
    result: SeoResult | null;
    isLoading: boolean;
    isEnriching?: boolean;
    onIncreaseDepth?: () => void;
    error: string | null;
    onSave: (finalHtml?: string) => void;
}

const SeoDataItem: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono = false }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    return (
        <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-700/30 group">
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">{label}</label>
            <div className="flex justify-between items-center gap-2">
                <p className={`text-slate-200 text-sm truncate ${mono ? 'font-mono' : ''}`} title={value}>{value}</p>
                <button onClick={handleCopy} className="text-slate-500 hover:text-indigo-400 p-1 flex-shrink-0">
                    {copied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <ClipboardIcon className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );
};

export const SeoOutput: React.FC<SeoOutputProps> = ({ result, isLoading, isEnriching, onIncreaseDepth, error, onSave }) => {
    const [activeTab, setActiveTab] = useState<'seo' | 'readability' | 'schema' | 'content' | 'social'>('seo');
    const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
    const [codeCopied, setCodeCopied] = useState(false);
    const [socialCopied, setSocialCopied] = useState(false);

    const wordCount = useMemo(() => {
        if (!result) return 0;
        const textOnly = result.htmlContent.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "").replace(/<[^>]*>/g, ' ');
        return textOnly.trim().split(/\s+/).length;
    }, [result]);

    const handleCopyFullCode = () => {
        if (!result) return;
        navigator.clipboard.writeText(result.htmlContent).then(() => {
            setCodeCopied(true);
            setTimeout(() => setCodeCopied(false), 2000);
        });
    };

    const handleCopySocialPost = () => {
        if (!result) return;
        const socialText = `${result.social_post.content}\n\n${result.social_post.hashtags.join(' ')}`;
        navigator.clipboard.writeText(socialText).then(() => {
            setSocialCopied(true);
            setTimeout(() => setSocialCopied(false), 2000);
        });
    };

    if (isLoading) return <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 h-full flex items-center justify-center"><Loader /></div>;
    if (error) return <div className="bg-slate-800/50 p-6 rounded-2xl border border-red-900/20 text-red-400 flex items-center justify-center text-center">{error}</div>;
    if (!result) return (
        <div className="bg-slate-800/50 p-12 rounded-2xl border border-slate-700 h-full flex flex-col items-center justify-center text-center text-slate-500">
            <SparklesIcon className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">Nessuna analisi attiva</p>
            <p className="text-sm">Seleziona un articolo dalla coda batch.</p>
        </div>
    );

    const fullSchemaJson = JSON.stringify({
        ...result.schema_markup.article,
        "mainEntity": {
            "@type": "FAQPage",
            "mainEntity": result.schema_markup.faq_schema
        }
    }, null, 2);

    return (
        <div className="bg-slate-800/50 rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col h-full overflow-hidden">
            <div className="flex bg-slate-900/50 p-1 border-b border-slate-700/50 overflow-x-auto">
                {[
                    { id: 'seo', icon: DocumentMagnifyingGlassIcon, label: 'SEO & Meta' },
                    { id: 'readability', icon: SparklesIcon, label: 'Qualità' },
                    { id: 'content', icon: EyeIcon, label: 'Articolo HTML' },
                    { id: 'social', icon: ShareIcon, label: 'Post Social' },
                    { id: 'schema', icon: CodeBracketIcon, label: 'Schema' },
                    { id: 'sources', icon: BookmarkIcon, label: 'Fonti' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 text-[10px] font-bold uppercase transition-all rounded-xl ${
                            activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" /> {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {activeTab === 'seo' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-indigo-900/20 p-4 rounded-xl border border-indigo-500/20">
                                <h4 className="text-[10px] uppercase font-bold text-indigo-300">Word Count</h4>
                                <p className="text-2xl font-bold text-white">{wordCount}</p>
                            </div>
                            <button onClick={onIncreaseDepth} disabled={isEnriching} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase hover:bg-indigo-500 transition-colors">
                                {isEnriching ? 'Cercando...' : 'Trova Fonti/Link'}
                            </button>
                        </div>
                        <SeoDataItem label="Titolo SEO (H1 / CTR)" value={result.seo_metadata.seo_title} />
                        <SeoDataItem label="Focus Keyword" value={result.seo_metadata.yoast_focus_keyword} mono />
                        <SeoDataItem label="Slug URL" value={result.seo_metadata.slug} mono />
                        <SeoDataItem label="Meta Description" value={result.seo_metadata.meta_description} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <SeoDataItem label="Categoria" value={result.seo_metadata.category} />
                            <SeoDataItem label="Tag SEO" value={result.seo_metadata.tags.join(', ')} />
                        </div>
                    </div>
                )}

                {activeTab === 'content' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                            <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
                                <button onClick={() => setViewMode('preview')} className={`px-4 py-1.5 text-[10px] font-bold rounded-md ${viewMode === 'preview' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>ANTEPRIMA</button>
                                <button onClick={() => setViewMode('code')} className={`px-4 py-1.5 text-[10px] font-bold rounded-md ${viewMode === 'code' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>CODICE HTML</button>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleCopyFullCode}
                                    className="flex items-center gap-2 bg-indigo-600 px-4 py-2 rounded-xl text-white text-[10px] font-bold uppercase hover:bg-indigo-500 transition-colors"
                                >
                                    {codeCopied ? <CheckIcon className="w-4 h-4" /> : <ClipboardIcon className="w-4 h-4" />}
                                    Copia Articolo Completo
                                </button>
                                <button onClick={() => onSave()} title="Salva" className="bg-emerald-600 p-2 rounded-xl text-white hover:bg-emerald-500 transition-colors"><BookmarkIcon className="w-5 h-5" /></button>
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-2xl overflow-hidden min-h-[600px] border border-slate-300 relative shadow-inner">
                            {viewMode === 'preview' ? (
                                <iframe 
                                    srcDoc={`<html><head><style>
                                        body{font-family:'Inter', sans-serif; line-height:1.8; color:#334155; padding:40px; max-width:850px; margin:0 auto; background:#fff;} 
                                        h1{color:#0f172a; border-bottom:4px solid #6366f1; padding-bottom:15px; font-size: 2.8rem; margin-bottom:40px; font-weight:800; letter-spacing:-0.025em;}
                                        h2{color:#1e1b4b; margin-top:50px; padding-bottom:12px; border-bottom:1px solid #f1f5f9; font-weight:700; scroll-margin-top:20px;}
                                        h3{color:#312e81; font-weight: 700; margin-top:30px; scroll-margin-top:20px;}
                                        p{margin-bottom:1.6em; text-align: justify;}
                                        a{color:#4f46e5; text-decoration:none; font-weight:500; border-bottom:1px solid #c7d2fe;}
                                        a:hover{background:#f5f3ff; color:#3730a3;}
                                        ul, ol{padding-left:35px; margin-bottom: 1.6em; color:#475569;}
                                        li{margin-bottom: 0.8em;}
                                        table{width:100%; border-collapse:collapse; margin:30px 0; font-size:0.95em;}
                                        th, td{border:1px solid #e2e8f0; padding:15px; text-align:left;}
                                        th{background:#f8fafc; color:#0f172a; font-weight:700;}
                                        tr:nth-child(even){background:#fafafa;}
                                        img{max-width:100%; height:auto; border-radius:12px; margin:20px 0; box-shadow:0 10px 15px -3px rgb(0 0 0 / 0.1);}
                                        .faq-item{padding:20px; background:#fdfdfd; border-radius:12px; border:1px solid #f1f5f9; margin-bottom:25px;}
                                        script{display:none;}
                                    </style></head><body>
                                        ${result.htmlContent}
                                    </body></html>`}
                                    className="w-full h-[600px]"
                                />
                            ) : (
                                <div className="p-6 bg-slate-950 h-[600px] overflow-auto font-mono text-[11px] text-emerald-400 whitespace-pre-wrap leading-relaxed">
                                    {result.htmlContent}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'social' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h4 className="text-sm font-bold text-indigo-400 uppercase flex items-center gap-2">
                                <ShareIcon className="w-5 h-5" /> Post Social Suggerito
                            </h4>
                            <button 
                                onClick={handleCopySocialPost}
                                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-xl text-white text-[10px] font-bold uppercase transition-colors"
                            >
                                {socialCopied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <ClipboardIcon className="w-4 h-4" />}
                                Copia Post
                            </button>
                        </div>
                        
                        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-700/50 relative">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                    {result.social_post.platform.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-100">{result.social_post.platform}</p>
                                    <p className="text-[10px] text-slate-500">Draft Generato dall'AI</p>
                                </div>
                            </div>
                            
                            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap mb-4">
                                {result.social_post.content}
                            </p>
                            
                            <div className="flex flex-wrap gap-2">
                                {result.social_post.hashtags.map((tag, i) => (
                                    <span key={i} className="text-indigo-400 text-xs font-medium hover:underline cursor-pointer">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                        
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                            <p className="text-xs text-slate-500">
                                Questo post è ottimizzato per massimizzare il CTR verso l'articolo. 
                                Copia e incolla sulla tua piattaforma preferita.
                            </p>
                        </div>
                    </div>
                )}

                {activeTab === 'schema' && (
                    <div className="space-y-4">
                         <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold text-slate-400 uppercase">Dati Strutturati JSON-LD</h4>
                            <button onClick={() => navigator.clipboard.writeText(fullSchemaJson)} className="text-indigo-400 text-[10px] font-bold uppercase">Copia Schema</button>
                        </div>
                        <pre className="bg-black/50 p-4 rounded-xl text-[10px] text-cyan-400 font-mono overflow-auto max-h-[500px] border border-slate-700">
                            {fullSchemaJson}
                        </pre>
                    </div>
                )}
                
                {activeTab === 'readability' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {result.readability.map((r, i) => (
                            <div key={i} className="bg-slate-900/30 p-4 rounded-xl border border-slate-700/30">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-bold text-slate-200">{r.criteria}</span>
                                    <span className={`text-[10px] font-bold ${r.status === 'good' ? 'text-green-400' : 'text-yellow-400'}`}>{r.score}</span>
                                </div>
                                <p className="text-[11px] text-slate-400 leading-snug">{r.message}</p>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'sources' && (
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-indigo-400 uppercase flex items-center gap-2">
                            <BookmarkIcon className="w-5 h-5" /> Fonti e Riferimenti Web
                        </h4>
                        <p className="text-xs text-slate-500 mb-4">
                            Queste sono le fonti autorevoli utilizzate dall'IA per verificare i fatti e arricchire il contenuto durante l'ottimizzazione.
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
                                            <ShareIcon className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
                                        </div>
                                        <p className="text-[10px] text-slate-500 truncate mt-1">{source.uri}</p>
                                    </a>
                                ))
                            ) : (
                                <div className="text-center py-8 text-slate-500 italic text-sm">
                                    Nessuna fonte web specifica rilevata per questo articolo.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
