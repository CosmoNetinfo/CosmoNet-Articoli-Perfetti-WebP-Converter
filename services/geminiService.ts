import { GoogleGenAI, Type } from "@google/genai";
import { SeoResult, GroundingSource } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

const getToday = (): string => new Date().toISOString().split('T')[0];
const getYear = (): string => new Date().getFullYear().toString();

const SYSTEM_INSTRUCTION = `## ⚠️ REGOLE ASSOLUTE — LEGGI PRIMA DI TUTTO

MAI inventare statistiche, percentuali o numeri non presenti nel brief.
MAI scrivere "nei nostri test" o "basandoci sulla nostra esperienza diretta".
MAI aggiungere funzionalità tecniche (CLI, Docker, GPU, Kubernetes) non citate nel brief.
MAI citare eventi futuri non confermati (es. Google I/O 2026).
MAI inventare percentuali di adozione di mercato o statistiche di utilizzo (es. "40% dei progetti", "75% di riduzione") anche se attribuite a fonti apparentemente reali.
MAI aggiungere funzionalità di export specifiche per piattaforme (GTK4, Qt6, framework nativi) non citate esplicitamente nel brief.
MAI inventare nomi di funzionalità, modalità o strumenti specifici di un prodotto (es. "Lightroom Mode", "Smart Export", "AI Enhance Pro") che non siano documentati ufficialmente.
MAI generare link interni con slug inventati: usa solo URL reali verificati di cosmonet.info oppure ometti il link.
Se un dato non è nel brief: OMETTILO o scrivi "secondo Google Labs".
Queste regole hanno priorità assoluta su qualsiasi altra istruzione in questo prompt.

Sei un Editor Tecnico Senior SEO+GEO per Cosmonet.info, blog tech italiano su AI, Linux, Open Source e Gaming. Sei un'Elite Web Agency specializzata in SaaS SEO di lusso. La tua missione è trasformare testi grezzi in articoli HTML perfetti per WordPress, ottimizzati per Google e per i motori AI (ChatGPT, Gemini, Perplexity). Non accetti compromessi sulla qualità. Zero placeholder. Zero dati inventati. Zero errori strutturali.

IDENTITÀ E MISSIONE
Ogni articolo che produci deve essere:
- Pronto per la pubblicazione su WordPress senza modifiche manuali
- Ottimizzato Yoast SEO (focus keyword, meta, slug, titolo)
- Strutturato per il ranking Google E-E-A-T
- Compatibile con l'indicizzazione GEO (featured snippet, FAQPage, entity)
- Corretto HTML5 valido, senza tag annidati illegali

LUNGHEZZA ARTICOLO (MANDATORIA):
Ogni articolo deve essere di almeno 2000 parole. Sviluppa ogni sezione in modo approfondito, con esempi pratici, contesto e dettagli tecnici. Non accorciare o riassumere: preferisci sempre la completezza alla brevità.

REGOLE HTML — ZERO TOLERANCE

STRUTTURA TITOLI:
- Il corpo dell'articolo NON deve contenere <h1>. WordPress genera H1 automaticamente dal titolo del post.
- H2 → H3: mai saltare livelli
- Un <h3> non può MAI stare dentro un <p>
- Ogni H2 e H3 deve avere attributo id= descrittivo

TABELLE:
- Struttura obbligatoria: <table> → <thead> → <tr> → <th> poi <tbody> → <tr> → <td>
- Nessun testo libero dentro <table> prima di <thead>
- Tabelle SOLO per dati comparativi strutturati. Mai paragrafi nelle celle.
- Se confronti più entità con gli stessi attributi: SEMPRE <table>

LISTE:
- <ul> e <ol> contengono solo <li>. Mai testo o heading direttamente.
- MAI <ul> con un solo <li>: usa un <p> semplice
- MAI <p> con "1. testo", "2. testo": usa <ol> con <li>

PRO/CONTRO:
- SEMPRE in due blocchi separati:
  <h3 id="vantaggi">Vantaggi</h3> + <ul> solo pro
  <h3 id="svantaggi">Svantaggi</h3> + <ul> solo contro
- MAI pro e contro nella stessa <ul>

BLOCKQUOTE:
- SEMPRE autonomo, fuori da qualsiasi <p>
- SEMPRE seguito da <cite> separato con fonte e link
- Se in lingua straniera: aggiungi <p><em>traduzione italiana</em></p> subito dopo
- La traduzione riporta l'anno della fonte originale, MAI l'anno corrente

CODICE E SNIPPET:
- Snippet brevi e comandi: usa <code> inline dentro <p>
- MAI usare <pre><code> nel corpo dell'articolo
- Caratteri HTML dentro <code> SEMPRE escaped

REGOLE SEO:
- Focus keyword: nel primo paragrafo, almeno 2 H2, meta description
- Meta description: 140–155 caratteri. MAI punti esclamativi (!). Tono informativo.
- Ogni H2 risponde a una domanda reale che un utente cerca su Google
- Link interni: 2-3 per articolo, usa SOLO questi slug verificati di cosmonet.info:
  /audit-sicurezza-web-ai-prompt-2026/
  /migliori-alternative-chatgpt-2026/
  /migliori-distribuzioni-linux-principianti-2026/
  /migliori-distribuzioni-linux-2025/
  /nobara-linux-distribuzione-fedora-gaming/
  /software-open-source-linux/
  /n8n-guida-workflow-automation-open-source-2026/
  /guida-fooocus-stable-diffusion-xl-locale/
  Se nessuno è pertinente: ometti il link interno, MAI inventare slug.
- Link esterni: solo fonti autorevoli con target="_blank" rel="noopener"
- E-E-A-T: nel primo paragrafo cita sempre fonti autorevoli o documentazione ufficiale
- Schema @type: SEMPRE "Article". Author "Cosmonet.info" → "@type": "Organization"

REGOLE DATE JSON-LD:
- dateModified: SEMPRE la data di oggi
- datePublished: usa la data reale dell'evento/rilascio se citata nel testo, altrimenti oggi
- Formato ISO 8601: "YYYY-MM-DD"

REGOLE COPYRIGHT — INVIOLABILI:
- Massimo 14 parole consecutive da qualsiasi fonte esterna
- Una sola citazione diretta per fonte. Poi: solo parafrasi.
- MAI attribuire citazioni a persone reali senza URL pubblica verificabile

REGOLE JSON-LD — INVIOLABILI:
- articleBody: riassunto REALE 3-5 frasi. VIETATO qualsiasi placeholder.
- FAQ sync: numero Question in FAQPage = numero FAQ nell'HTML. Zero eccezioni.
- description nel JSON-LD = authoritative_claim, non descrizione generica
- FAQPage: sempre in <script> separato dall'Article

SEZIONE TUTORIAL E GUIDA (OBBLIGATORIA):
1. <h2>Guida Rapida</h2>: <p>Riassunto in 3-5 righe.</p>
2. <h2>Come fare: Guida Passo per Passo</h2>: <ol> con 4-10 step.
3. <h2>Comandi e Snippet</h2>: <p><code>comando</code></p> (Ometti se non pertinente).
4. <h2>Domande Frequenti (FAQ)</h2>: <details> con esattamente 5 FAQ.`;


const responseSchema = {
  type: Type.OBJECT,
  properties: {
    html_content: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        intro: { type: Type.STRING },
        sections: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              heading: { type: Type.STRING },
              content: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["text", "list", "table"] },
              subsections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    heading: { type: Type.STRING },
                    content: { type: Type.STRING }
                  },
                  required: ["heading", "content"]
                }
              }
            },
            required: ["heading", "content", "type"]
          }
        },
        tutorial_guide: {
          type: Type.OBJECT,
          properties: {
            quick_guide: { type: Type.STRING },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["title", "description"]
              }
            },
            commands: { type: Type.STRING },
            commands_description: { type: Type.STRING }
          },
          required: ["quick_guide", "steps"]
        },
        faq: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              answer: { type: Type.STRING }
            },
            required: ["question", "answer"]
          }
        },
        conclusion: { type: Type.STRING }
      },
      required: ["title", "intro", "sections", "tutorial_guide", "faq", "conclusion"]
    },
    schema_markup: {
      type: Type.OBJECT,
      properties: {
        article: {
          type: Type.OBJECT,
          properties: {
            "@context": { type: Type.STRING },
            "@type": { type: Type.STRING },
            headline: { type: Type.STRING },
            author: {
              type: Type.OBJECT,
              properties: {
                "@type": { type: Type.STRING },
                name: { type: Type.STRING }
              },
              required: ["@type", "name"]
            },
            datePublished: { type: Type.STRING },
            articleBody: { type: Type.STRING },
            keywords: { type: Type.STRING }
          },
          required: ["@context", "@type", "headline", "articleBody", "author"]
        },
        faq_schema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              "@type": { type: Type.STRING },
              name: { type: Type.STRING },
              acceptedAnswer: {
                type: Type.OBJECT,
                properties: {
                  "@type": { type: Type.STRING },
                  text: { type: Type.STRING }
                },
                required: ["@type", "text"]
              }
            },
            required: ["@type", "name", "acceptedAnswer"]
          }
        }
      },
      required: ["article", "faq_schema"]
    },
    seo_metadata: {
      type: Type.OBJECT,
      properties: {
        seo_title: { type: Type.STRING },
        yoast_focus_keyword: { type: Type.STRING },
        meta_description: { type: Type.STRING },
        slug: { type: Type.STRING },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
        category: { type: Type.STRING }
      },
      required: ["seo_title", "yoast_focus_keyword", "meta_description", "slug", "tags", "category"]
    },
    geo_optimization: {
      type: Type.OBJECT,
      properties: {
        direct_answer: { type: Type.STRING },
        entity_definitions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              entity: { type: Type.STRING },
              definition: { type: Type.STRING },
              category: { type: Type.STRING }
            },
            required: ["entity", "definition", "category"]
          }
        },
        key_facts: { type: Type.ARRAY, items: { type: Type.STRING } },
        authoritative_claim: { type: Type.STRING }
      },
      required: ["direct_answer", "entity_definitions", "key_facts", "authoritative_claim"]
    },
    social_posts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          platform: { type: Type.STRING },
          content: { type: Type.STRING },
          hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["platform", "content", "hashtags"]
      }
    },
    seoChecklist: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          item: { type: Type.STRING },
          status: { type: Type.STRING },
          details: { type: Type.STRING }
        },
        required: ["item", "status", "details"]
      }
    },
    readability: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          criteria: { type: Type.STRING },
          status: { type: Type.STRING },
          score: { type: Type.STRING },
          message: { type: Type.STRING }
        },
        required: ["criteria", "status", "score", "message"]
      }
    }
  },
  required: [
    "html_content", "schema_markup", "seo_metadata",
    "geo_optimization", "social_posts", "seoChecklist", "readability"
  ]
};

function safeJsonParse(text: string): any {
  let clean = text.trim();
  if (clean.startsWith('```json')) {
    clean = clean.replace(/^```json\n?/, '').replace(/\n?```$/, '');
  } else if (clean.startsWith('```')) {
    clean = clean.replace(/^```\n?/, '').replace(/\n?```$/, '');
  }
  clean = clean.trim();
  try {
    return JSON.parse(clean);
  } catch (e) {
    console.warn("Standard JSON.parse failed, attempting aggressive cleaning...");
    let aggressiveClean = clean
      .replace(/,\s*}/g, '}')
      .replace(/,\s*\]/g, ']')
      .replace(/,\s*,/g, ',');
    aggressiveClean = aggressiveClean.replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');
    try {
      return JSON.parse(aggressiveClean);
    } catch (e2) {
      console.error("Aggressive JSON cleaning failed.");
      throw new Error(`Invalid JSON from model: ${clean.substring(0, 100)}...`);
    }
  }
}

function buildHtmlContent(result: SeoResult): string {
  const wrapP = (text: string) => {
    const trimmed = text.trim();
    if (
      trimmed.startsWith('<p') ||
      trimmed.startsWith('<ul') ||
      trimmed.startsWith('<ol') ||
      trimmed.startsWith('<div')
    ) {
      return trimmed;
    }
    return `<p>${trimmed}</p>`;
  };

  let html = `<!-- TITOLO WORDPRESS: ${result.html_content.title} -->\n`;
  html += `<!-- KEYPHRASE FOCUS YOAST: ${result.seo_metadata.yoast_focus_keyword} -->\n\n`;
  html += wrapP(result.html_content.intro) + '\n\n';

  result.html_content.sections.forEach(s => {
    const sId = slugify(s.heading);
    html += `<h2 id="${sId}">${s.heading}</h2>\n`;
    if (s.type === 'list') {
      const items = s.content.split('\n').filter(l => l.trim());
      html += `<ul>\n${items.map(li => `  <li>${li.replace(/^[*\-•]\s*/, '').trim()}</li>`).join('\n')}\n</ul>\n`;
    } else if (s.type === 'table') {
      const clean = s.content.replace(/<\/?p>/g, '').trim();
      html += `<div style="overflow-x:auto; margin-bottom:25px;">\n<table border="1" style="width:100%; border-collapse:collapse;">\n${clean}\n</table>\n</div>\n`;
    } else {
      html += wrapP(s.content) + '\n';
    }
    if (s.subsections?.length) {
      s.subsections.forEach(sub => {
        html += `<h3 id="${slugify(sub.heading)}">${sub.heading}</h3>\n`;
        html += wrapP(sub.content) + '\n';
      });
    }
  });

  const tg = result.html_content.tutorial_guide;
  if (tg) {
    html += `\n<h2 id="guida-rapida">Guida Rapida</h2>\n`;
    html += wrapP(tg.quick_guide) + '\n';
    html += `\n<h2 id="guida-passo-passo">Come fare: Guida Passo per Passo</h2>\n`;
    html += `<ol>\n${tg.steps.map(s => `  <li><strong>${s.title}</strong> — ${s.description}</li>`).join('\n')}\n</ol>\n`;
    if (tg.commands) {
      html += `\n<h2 id="comandi-snippet">Comandi e Snippet</h2>\n`;
      html += `<p><code>${tg.commands.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></p>\n`;
      if (tg.commands_description) {
        html += wrapP(tg.commands_description) + '\n';
      }
    }
  }

  if (result.html_content.faq.length > 0) {
    html += `\n<h2 id="faq-sezione-ottimizzata">Domande Frequenti (FAQ)</h2>\n`;
    result.html_content.faq.forEach(f => {
      html += `<details>\n`;
      html += `  <summary><strong>${f.question}</strong></summary>\n`;
      html += `  ${wrapP(f.answer)}\n`;
      html += `</details>\n`;
    });
  }

  html += `\n<h2 id="conclusione">Conclusione</h2>\n<p>${result.html_content.conclusion}</p>\n`;

  return html;
}

function extractSources(response: any): GroundingSource[] {
  const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const sources: GroundingSource[] = chunks
    .filter((c: any) => c.web?.uri)
    .map((c: any) => ({ title: c.web.title || 'Fonte', uri: c.web.uri }));
  return Array.from(new Map(sources.map(s => [s.uri, s])).values());
}

// ─── optimizeArticleForSeo ────────────────────────────────────────────────────

export const optimizeArticleForSeo = async (articleText: string): Promise<SeoResult> => {
  const TODAY = getToday();
  const YEAR = getYear();

  const prompt = `Agisci come Editor Tecnico Senior SEO+GEO per WordPress di 
Cosmonet.info (blog tech italiano su AI, Linux, Open Source, Gaming).
Trasforma il testo fornito in contenuto HTML perfetto.

REGOLE SEO — ZERO TOLERANCE:
1. Non accorciare MAI il testo.
2. No ToC.
3. Nessun <h1> nel corpo. Ogni <h2> e <h3> con attributo 'id'.
4. Tabelle SOLO per dati tabulari.
5. Se confronta più entità con stessi attributi: SEMPRE <table>.
6. Immagini: <!-- IMMAGINE descrizione .webp -->
7. Focus keyword nel primo paragrafo, almeno 2 H2 e nella meta.
8. Schema type: SEMPRE "Article".
9. PRO/CONTRO: due blocchi distinti con <h3> separati.
10. Link interni: SOLO slug verificati dal SYSTEM_INSTRUCTION.
11. E-E-A-T: riferimento autorevole reale nel primo paragrafo.
12. Meta description: max 155 caratteri, MAI (!).
13. dateModified: ${TODAY}. datePublished: data reale evento o ${TODAY}.
14. H2 come domande reali Google.
15. STATISTICHE SOLO DAL BRIEF: MAI numeri non presenti nel testo sorgente.
16. Author "Cosmonet.info" → "@type": "Organization".
17. Blockquote: autonomo fuori da <p>, seguito da <cite>.
18. Anno: SEMPRE ${YEAR}.

Data: ${TODAY} | Autore: Cosmonet.info

Testo Sorgente:
${articleText}`;

  try {
    let response;
    let retries = 3;
    let delay = 2000;
    while (retries > 0) {
      try {
        response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseSchema,
            maxOutputTokens: 16384,
          },
        });
        break;
      } catch (err: any) {
        retries--;
        if (retries === 0) throw err;
        console.warn(`Retrying optimizeArticleForSeo... (${retries} left). Error:`, err.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
    if (!response) throw new Error("No response from Gemini API");
    const result: SeoResult = safeJsonParse(response.text);
    if (!result.schema_markup.article.datePublished) {
      result.schema_markup.article.datePublished = TODAY;
    }
    result.schema_markup.article.dateModified = TODAY;
    result.social_post = result.social_posts?.[0] ?? { platform: 'LinkedIn', content: '', hashtags: [] };
    result.htmlContent = buildHtmlContent(result);
    result.groundingSources = extractSources(response);
    // ✅ FLAG iniziali
    result.troviFontiApplied = false;
    result.qaFixApplied = false;
    return result;
  } catch (error) {
    console.error("Error in optimizeArticleForSeo:", error);
    throw error;
  }
};

// ─── researchTopicStream ──────────────────────────────────────────────────────

export const researchTopicStream = async (
  topic: string,
  onChunk: (text: string) => void
): Promise<GroundingSource[]> => {
  const YEAR = getYear();
  const prompt = `Agisci come Ricercatore e Copywriter esperto di tecnologia 
per Cosmonet.info. Effettua una ricerca approfondita su: "${topic}".
Genera un articolo dettagliato con dati reali e fonti aggiornate al ${YEAR}.
MAI inventare statistiche, benchmark o citazioni senza fonte.
Se mancano dati verificati: scrivi senza numeri inventati.`;

  let retries = 3;
  let delay = 2000;
  while (retries > 0) {
    try {
      const stream = await ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { systemInstruction: SYSTEM_INSTRUCTION, tools: [{ googleSearch: {} }] },
      });
      let fullText = "";
      let sources: GroundingSource[] = [];
      for await (const chunk of stream) {
        fullText += chunk.text || "";
        onChunk(fullText);
        sources = [...sources, ...extractSources(chunk)];
      }
      return Array.from(new Map(sources.map(s => [s.uri, s])).values());
    } catch (error: any) {
      retries--;
      if (retries === 0) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  throw new Error("Failed to complete researchTopicStream");
};

// ─── researchWithCosmonetStream ───────────────────────────────────────────────

export const researchWithCosmonetStream = async (
  topic: string,
  onChunk: (text: string) => void
): Promise<GroundingSource[]> => {
  const YEAR = getYear();
  const prompt = `Agisci come 'Cosmonet.info', blog tech italiano su AI, Linux, Open Source e Gaming.
Analisi approfondita su: ${topic}
Dati tecnici reali con fonti recenti (priorità 2024-${YEAR}).
MAI inventare statistiche, percentuali, latenze o benchmark.
MAI inventare nomi di funzionalità non documentate ufficialmente.
Se mancano dati: usa "secondo quanto dichiarato dalla società" senza inventare valori.
Struttura: Introduzione E-E-A-T → Analisi tecnica → Casi d'uso → Pro/Contro → Confronto → FAQ → Conclusioni.`;

  let retries = 3;
  let delay = 2000;
  while (retries > 0) {
    try {
      const stream = await ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { systemInstruction: SYSTEM_INSTRUCTION, tools: [{ googleSearch: {} }] },
      });
      let fullText = "";
      let sources: GroundingSource[] = [];
      for await (const chunk of stream) {
        fullText += chunk.text || "";
        onChunk(fullText);
        sources = [...sources, ...extractSources(chunk)];
      }
      return Array.from(new Map(sources.map(s => [s.uri, s])).values());
    } catch (error: any) {
      retries--;
      if (retries === 0) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  throw new Error("Failed to complete researchWithCosmonetStream");
};

// ─── enrichArticleDepth ───────────────────────────────────────────────────────
// ✅ PATCH v2: rimossa regola "almeno un dato numerico per ogni H2" — era la causa
// principale di allucinazioni numeriche (30%, 45%, 1.2M, 500k righe).
// Trova Fonti ora aggiunge SOLO link verificati, MAI numeri inventati.

export const enrichArticleDepth = async (
  currentResult: SeoResult,
  _originalText: string
): Promise<SeoResult> => {
  const YEAR = getYear();

  const prompt = `Sei un Editor SEO per Cosmonet.info. Arricchisci l'HTML 
seguente SOLO con link verificati a fonti esterne reali e link interni pertinenti.

═══════════════════════════════
⛔ VIETATO ASSOLUTO
═══════════════════════════════

- MAI aggiungere numeri, percentuali, cifre, statistiche o benchmark 
  non presenti nel testo originale. Nemmeno se "plausibili" o 
  "attribuiti a fonti reali". Zero numeri nuovi = regola assoluta.
- MAI aggiungere dati operativi inventati: righe di codice, 
  budget, tempi di conversione, quote di mercato.
- MAI aggiungere nomi di librerie, framework o tool non già 
  presenti nel testo (es. Qt, Skia, vcpkg, LLVM).
- MAI "legittimare" retroattivamente numeri già presenti trovando 
  fonti che li supportino. Se un numero non era nel brief 
  originale, segnalalo con <!-- ⚠️ NUMERO NON VERIFICATO --> 
  invece di confermarlo.
- MAI aggiungere blockquote senza URL istituzionale verificabile 
  (github.com, docs.*, blog.google, w3.org, arxiv.org, ladybird.org).

═══════════════════════════════
OPERAZIONI CONSENTITE
═══════════════════════════════

1. LINK ESTERNI: Sostituisci link generici con link diretti 
   alla pagina specifica. Solo fonti istituzionali verificate.
   Non aggiungere link se la fonte non è stata trovata.

2. LINK INTERNI: SOLO questi slug verificati di cosmonet.info:
   /audit-sicurezza-web-ai-prompt-2026/
   /migliori-alternative-chatgpt-2026/
   /migliori-distribuzioni-linux-principianti-2026/
   /migliori-distribuzioni-linux-2025/
   /nobara-linux-distribuzione-fedora-gaming/
   /software-open-source-linux/
   /n8n-guida-workflow-automation-open-source-2026/
   /guida-fooocus-stable-diffusion-xl-locale/
   MAI inventare slug.

3. BLOCKQUOTE: Aggiungi SOLO se hai trovato URL istituzionale 
   reale. Zero blockquote è preferibile a blockquote inventato.

4. FAQ JSON-LD: Aggiungi sezione FAQ JSON-LD se non già presente.

REGOLE STRUTTURALI:
- NON accorciare nulla
- Nessun <h1> nel corpo
- MAI <pre><code>: usa <p><code>comando</code></p>
- Restituisci SOLO l'HTML modificato, senza wrapper o commenti

HTML da arricchire:
${currentResult.htmlContent}`;

  try {
    let response;
    let retries = 3;
    let delay = 2000;
    while (retries > 0) {
      try {
        response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            tools: [{ googleSearch: {} }],
            maxOutputTokens: 16384,
          },
        });
        break;
      } catch (err: any) {
        retries--;
        if (retries === 0) throw err;
        console.warn(`Retrying enrichArticleDepth... (${retries} left). Error:`, err.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
    if (!response) throw new Error("No response from Gemini API");
    const enrichedHtml = response.text?.trim() || currentResult.htmlContent;
    const newSources = extractSources(response);
    return {
      ...currentResult,
      htmlContent: enrichedHtml,
      troviFontiApplied: true, // ✅ FLAG: Trova Fonti applicato
      groundingSources: Array.from(
        new Map([
          ...(currentResult.groundingSources ?? []),
          ...newSources
        ].map(s => [s.uri, s])).values()
      )
    };
  } catch (error) {
    console.error("Error in enrichArticleDepth:", error);
    throw error;
  }
};

// ─── qaAndFixHtml ─────────────────────────────────────────────────────────────
// ✅ PATCH v2: aggiunte regole 36-38 per rimuovere percentuali, cifre budget
// e conteggi di righe di codice inventati non presenti nel brief originale.

export const qaAndFixHtml = async (
  currentResult: SeoResult
): Promise<SeoResult> => {
  const TODAY = getToday();
  const YEAR = getYear();
  const PREV_YEAR = (parseInt(YEAR) - 1).toString();

  const prompt = `Sei un Editor HTML QA per Cosmonet.info. Analizza l'HTML 
fornito e correggi automaticamente tutti i problemi strutturali.

═══════════════════════════════
CORREZIONI STRUTTURALI (1-35)
═══════════════════════════════

1. TYPO NEI TITOLI: Correggi errori grammaticali in <h1>, <h2>, <h3>.
2. PRO/CONTRO: Separa in <h3 id="vantaggi"> + <ul> e <h3 id="svantaggi"> + <ul>.
3. BLOCKQUOTE: Autonomo fuori da <p>, seguito da <cite>.
4. BLOCKQUOTE STRANIERO: Aggiungi <p><em>traduzione</em></p> con anno originale.
5. LISTE IBRIDE: Rimuovi <ul> con un solo <li>. Sostituisci con <p> + <ul>.
6. LISTE NUMERATE MANUALI: <p> "1.", "2." → <ol> con <li>.
7. LISTE ANNIDATE: Appiattisci <ul> esterna con un solo <li>.
8. TAG ANNIDATI: Rimuovi <p><p>testo</p></p>.
9. DATE SCHEMA: dateModified: "${TODAY}". datePublished: mantieni se ${YEAR}+.
10. FAQPAGE ANNIDATO: Estrailo in <script> separato autonomo.
11. FAQ SCHEMA MANCANTE: Generalo se esiste sezione FAQ nell'HTML.
12. FAQ SYNC: Numero Question = numero FAQ nell'HTML.
13. H2 DUPLICATE: Elimina la prima se due H2 trattano lo stesso argomento.
14. H1 NEL CORPO: Rimuovi e sostituisci con <!-- TITOLO WORDPRESS: ... -->.
15. TABELLE CON PARAGRAFI: Converti in <h3> + <p>.
16. DATI TABULARI SENZA TABELLA: Converti separatori "|" in <table>.
17. LINK INTERNI: Formato /slug/. Se slug inventato → <!-- VERIFICARE URL -->.
18. META DESCRIPTION: Max 155 caratteri. Rimuovi (!). Rimuovi claim non verificabili.
19. DESCRIPTION SCHEMA: = authoritative_claim.
20. AUTHOR TYPE: "Cosmonet.info" → "@type": "Organization".
21. ANNO: Usa ${YEAR} in H1, H2, testo e keywords.
22. LISTE SINGOLO ELEMENTO: <ul> con un solo <li> → <p>.
23. SLUG DUPLICATI: Sostituisci con slug pertinenti dalla lista verificata.
24. H3 DENTRO P: Estrai heading annidati dentro <p>.
25. TESTO LIBERO IN TABLE: Sposta prima di <thead> come <p>.
26. ARTICLEBODY PLACEHOLDER: Sostituisci con riassunto reale 3-5 frasi.
27. CITAZIONE VERBATIM LUNGA: >14 parole letterali → converti in <p>.
28. BLOCKQUOTE URL NON VERIFICABILE: Converti in paragrafo inline.
29. PRE NEL CORPO: <pre><code> → <p><code>.
30. META NEL CORPO: Rimuovi tag <meta>.
31. SCRIPT NEL CORPO: Rimuovi tag <script> nel content editor.
32. INLINE STYLE SU DETAILS: Rimuovi style="" da <details>, <summary>.
33. VERIFICARE URL RESIDUO: Aggiungi <!-- ⚠️ LINK DA RISOLVERE -->.
34. MIDJOURNEY: "--v latest" → "--v 8".
35. ANNO CONFRONTO: Correggi ${PREV_YEAR} se tratta dati correnti.

═══════════════════════════════
⛔ NUOVE REGOLE ANTI-ALLUCINAZIONE NUMERICA (36-38)
═══════════════════════════════

36. PERCENTUALI NON VERIFICABILI:
    Se nel testo è presente una percentuale (es. "70%", "30%", "45%", "500%") 
    NON accompagnata da un link <a href="URL-reale"> verso la fonte 
    istituzionale che la contiene nell'HTML stesso → rimuovi la percentuale 
    e riscrivi la frase in forma qualitativa.
    SBAGLIATO: "ha ridotto i tempi del 45%"
    GIUSTO: "ha ridotto significativamente i tempi"
    SBAGLIATO: "circa il 70% delle vulnerabilità"
    GIUSTO: "la maggior parte delle vulnerabilità"

37. CIFRE BUDGET E COSTI INVENTATE:
    Se nel testo sono presenti stime di costo, budget annuali o cifre 
    finanziarie (es. "1,2 milioni di dollari annui", "costo stimato di X", 
    "budget operativo di Y") non attribuibili a una fonte con link 
    verificabile nell'HTML → rimuovile e sostituisci con linguaggio qualitativo.
    SBAGLIATO: "il costo annuale stimato è di 1,2 milioni"
    GIUSTO: "il modello di finanziamento si basa interamente su donazioni"

38. RIGHE DI CODICE INVENTATE:
    Se nel testo sono presenti conteggi di righe di codice 
    (es. "500.000 righe", "30 milioni di righe", "oltre X righe") 
    non attribuibili a fonte con link verificabile → rimuovili 
    e sostituisci con linguaggio qualitativo.
    SBAGLIATO: "una codebase di circa 500.000 righe altamente ottimizzato"
    GIUSTO: "una codebase moderna e snella"

═══════════════════════════════
REGOLE ASSOLUTE
═══════════════════════════════
- NON modificare il contenuto testuale corretto dei paragrafi
- NON aggiungere né rimuovere sezioni
- NON alterare i valori degli attributi 'id' negli heading
- NON modificare i link esterni verificabili
- Restituisci SOLO l'HTML corretto, senza wrapper o commenti

HTML da revisionare:
${currentResult.htmlContent}`;

  try {
    let response;
    let retries = 3;
    let delay = 2000;
    while (retries > 0) {
      try {
        response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            maxOutputTokens: 16384,
          },
        });
        break;
      } catch (err: any) {
        retries--;
        if (retries === 0) throw err;
        console.warn(`Retrying qaAndFixHtml... (${retries} left). Error:`, err.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
    if (!response) throw new Error("No response from Gemini API");
    const fixedHtml = response.text?.trim() || currentResult.htmlContent;
    return {
      ...currentResult,
      htmlContent: fixedHtml,
      qaFixApplied: true, // ✅ FLAG: QA&Fix applicato
    };
  } catch (error) {
    console.error("Error in qaAndFixHtml:", error);
    throw error;
  }
};