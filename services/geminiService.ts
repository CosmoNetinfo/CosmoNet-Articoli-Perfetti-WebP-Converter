import { GoogleGenAI, Type } from "@google/genai";
import { SeoResult, GroundingSource } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ✅ slugify con supporto caratteri italiani e accenti
const slugify = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

// ✅ FIX: funzioni dinamiche — ricalcolate a ogni chiamata, mai costanti statiche
const getToday = (): string => new Date().toISOString().split('T')[0];
const getYear = (): string => new Date().getFullYear().toString();

// ✅ SYSTEM INSTRUCTION — isolata dal Project AI Studio, vale solo per questo tool
const SYSTEM_INSTRUCTION = `## ⚠️ REGOLE ASSOLUTE — LEGGI PRIMA DI TUTTO

MAI inventare statistiche, percentuali o numeri non presenti nel brief.
MAI scrivere "nei nostri test" o "basandoci sulla nostra esperienza diretta".
MAI aggiungere funzionalità tecniche (CLI, Docker, GPU, Kubernetes) non citate nel brief.
MAI citare eventi futuri non confermati (es. Google I/O 2026).
Se un dato non è nel brief: OMETTILO o scrivi "secondo Google Labs".
Mettendolo in cima ha priorità molto più alta per il modello.

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
- Un solo <h1> per articolo
- H1 → H2 → H3: mai saltare livelli
- Un <h3> non può MAI stare dentro un <p>
  SBAGLIATO: <p><h3>Titolo</h3>testo</p>
  GIUSTO: chiudi </p> → <h3>Titolo</h3> → apri <p>testo</p>
- Ogni H2 e H3 deve avere attributo id= descrittivo

TABELLE:
- Struttura obbligatoria: <table> → <thead> → <tr> → <th> poi <tbody> → <tr> → <td>
- Nessun testo libero dentro <table> prima di <thead>
  SBAGLIATO: <table>Questa tabella confronta...<thead>
  GIUSTO: <p>Questa tabella confronta...</p><table><thead>
- Tabelle SOLO per dati comparativi strutturati. Mai paragrafi nelle celle.
- Se confronti più entità con gli stessi attributi: SEMPRE <table>, mai <h3>+<p> con "|"

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
- Tutto il codice da copiare va in <pre><code>
- Caratteri HTML dentro <pre><code> SEMPRE escaped: < → &lt;   > → &gt;   & → &amp;

REGOLE SEO:
- Focus keyword: in H1, primo paragrafo, almeno 2 H2, meta description
- Meta description: 140–155 caratteri. MAI punti esclamativi (!). Tono informativo.
- Ogni H2 risponde a una domanda reale che un utente cerca su Google
- Link interni: 2-3 per articolo, slug DESCRITTIVI e DIVERSI tra loro
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
- Se non verificabile: parafrasa nel testo, niente blockquote nominale

REGOLE JSON-LD — INVIOLABILI:
- articleBody: riassunto REALE 3-5 frasi. VIETATO qualsiasi placeholder.
- FAQ sync: numero Question in FAQPage = numero FAQ nell'HTML. Zero eccezioni.
- description nel JSON-LD = authoritative_claim, non descrizione generica
- FAQPage: sempre in <script> separato dall'Article

SEZIONE TUTORIAL E GUIDA (OBBLIGATORIA):
Alla fine di ogni articolo, prima della conclusione, inserisci questa sezione strutturata:
1. <h2>Guida Rapida</h2>: <p>Riassunto in 3-5 righe con i punti chiave per chi vuole la risposta immediata.</p>
2. <h2>Come fare: Guida Passo per Passo</h2>: <ol> con 4-10 step. Ogni step: <li><strong>Titolo step</strong> — Descrizione chiara dell'azione.</li>
3. <h2>Comandi e Snippet</h2>: <pre><code>...</code></pre> + <p>Spiegazione.</p> (Ometti se non pertinente).
4. <h2>Domande Frequenti (FAQ)</h2>: <details><summary>Domanda?</summary><p>Risposta.</p></details> (Esattamente 5 FAQ).`;


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

// ─── safeJsonParse ──────────────────────────────────────────────────────────

function safeJsonParse(text: string): any {
  let clean = text.trim();
  
  // Rimuovi eventuali blocchi di codice markdown se presenti
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
    
    // Rimuovi virgole finali prima di chiusure di oggetti o array
    // Esempio: { "a": 1, } -> { "a": 1 }
    // Rimuovi anche doppie virgole: { "a": 1,, "b": 2 } -> { "a": 1, "b": 2 }
    let aggressiveClean = clean
      .replace(/,\s*}/g, '}')
      .replace(/,\s*\]/g, ']')
      .replace(/,\s*,/g, ',');
    
    // Prova a correggere chiavi senza virgolette (es. { key: "val" } -> { "key": "val" })
    aggressiveClean = aggressiveClean.replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');
    
    try {
      return JSON.parse(aggressiveClean);
    } catch (e2) {
      console.error("Aggressive JSON cleaning failed.");
      throw new Error(`Invalid JSON from model: ${clean.substring(0, 100)}...`);
    }
  }
}

// ─── Costruttore HTML ─────────────────────────────────────────────────────────

function buildHtmlContent(result: SeoResult): string {
  const TODAY = getToday();

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

  let html = `<meta name="description" content="${result.seo_metadata.meta_description}">\n\n`;
  html += `<h1>${result.html_content.title}</h1>\n`;
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

  // ✅ SEZIONE TUTORIAL E GUIDA
  const tg = result.html_content.tutorial_guide;
  if (tg) {
    html += `\n<h2 id="guida-rapida">Guida Rapida</h2>\n`;
    html += wrapP(tg.quick_guide) + '\n';

    html += `\n<h2 id="guida-passo-passo">Come fare: Guida Passo per Passo</h2>\n`;
    html += `<ol>\n${tg.steps.map(s => `  <li><strong>${s.title}</strong> — ${s.description}</li>`).join('\n')}\n</ol>\n`;

    if (tg.commands) {
      html += `\n<h2 id="comandi-snippet">Comandi e Snippet</h2>\n`;
      html += `<pre><code>${tg.commands.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>\n`;
      if (tg.commands_description) {
        html += wrapP(tg.commands_description) + '\n';
      }
    }
  }

  if (result.html_content.faq.length > 0) {
    html += `\n<h2 id="faq-sezione-ottimizzata">Domande Frequenti (FAQ)</h2>\n`;
    result.html_content.faq.forEach(f => {
      html += `<details style="margin-bottom:10px; border:1px solid #eee; padding:10px; border-radius:8px;">\n`;
      html += `  <summary style="font-weight:bold; cursor:pointer;">${f.question}</summary>\n`;
      html += `  <div style="margin-top:10px;">${wrapP(f.answer)}</div>\n`;
      html += `</details>\n`;
    });
  }

  html += `\n<h2 id="conclusione">Conclusione</h2>\n<p>${result.html_content.conclusion}</p>\n`;

  // ✅ PATCH — datePublished: usa la data dell'AI se presente e diversa da oggi
  // (es. articolo su software rilasciato il 19 marzo, scritto il 20 marzo)
  // dateModified è sempre oggi (data di pubblicazione/aggiornamento dell'articolo)
  const aiDatePublished = result.schema_markup.article.datePublished;
  const finalDatePublished = (aiDatePublished && aiDatePublished !== TODAY)
    ? aiDatePublished  // rispetta la data dell'evento/rilascio impostata dall'AI
    : TODAY;

  const articleSchema = {
    ...result.schema_markup.article,
    "@type": "Article",
    datePublished: finalDatePublished,  // ✅ PATCH: non più sovrascritta sempre con TODAY
    dateModified: TODAY,
    description: result.geo_optimization.authoritative_claim || result.seo_metadata.meta_description,
    author: result.schema_markup.article.author.name === "Cosmonet.info"
      ? { "@type": "Organization", name: "Cosmonet.info" }
      : result.schema_markup.article.author,
    publisher: { "@type": "Organization", name: "Cosmonet.info" }
  };

  // ✅ PATCH — FAQ sync: faq_schema deve avere lo stesso numero di FAQ dell'HTML
  // Se il modello ne ha generate di meno, usa le FAQ dell'html_content come fallback
  const htmlFaqCount = result.html_content.faq.length;
  let faqSchemaItems = result.schema_markup.faq_schema;
  if (faqSchemaItems.length !== htmlFaqCount) {
    faqSchemaItems = result.html_content.faq.map(f => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer }
    }));
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqSchemaItems
  };

  html += `\n\n<script type="application/ld+json">\n${JSON.stringify(articleSchema, null, 2)}\n</script>`;
  html += `\n<script type="application/ld+json">\n${JSON.stringify(faqSchema, null, 2)}\n</script>`;
  return html;
}

// ─── extractSources ───────────────────────────────────────────────────────────

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
Trasforma il testo fornito in contenuto HTML perfetto sia per il 
ranking Google tradizionale che per l'indicizzazione nei motori AI 
(ChatGPT, Gemini, Perplexity).

═══════════════════════════════
REGOLE SEO — ZERO TOLERANCE
═══════════════════════════════

1. INTEGRITÀ: Non accorciare MAI il testo. Niente riassunti. 
   Mantieni ogni dettaglio tecnico.
2. NO ToC: Vietato generare l'indice dei contenuti.
3. TITOLI: Un solo <h1>. Ogni <h2> e <h3> deve avere attributo 
   'id' descrittivo.
4. TABELLE: Usale SOLO per dati tabulari. MAI <table> con 
   paragrafi dentro.
   - SBAGLIATO: usare table con paragrafi dentro
   - GIUSTO: usare paragrafi separati, poi eventuale table solo 
     per dati comparativi
5. DATI TABULARI SENZA TABELLA: Se una sezione confronta più 
   entità con gli stessi attributi, usa SEMPRE una <table>.
   - SBAGLIATO: <h3>Linux Mint</h3><p>RAM: 780MB | Desktop: Cinnamon</p>
   - GIUSTO: <table> con <th> e <td> strutturati
6. IMMAGINI: Inserisci commenti HTML nei punti strategici con 
   formato: <!-- IMMAGINE descrizione .webp -->
7. KEYWORD: La focus keyword deve apparire nel title, nel primo 
   paragrafo, in almeno 2 H2 e nella meta.
8. SCHEMA type: Usa SEMPRE "Article". Mai TechArticle o BlogPosting.
9. PRO/CONTRO: Separali SEMPRE in due blocchi distinti:
   - <h3 id="vantaggi">Vantaggi</h3> + <ul> solo pro
   - <h3 id="svantaggi">Svantaggi</h3> + <ul> solo contro
   - MAI pro e contro nella stessa <ul>
10. CONCLUSIONE: Il campo conclusion deve contenere SOLO il testo 
    del paragrafo finale, senza la parola "Conclusione".
11. LINK INTERNI: Aggiungi 2-3 link interni con slug DESCRITTIVI 
    e DIVERSI tra loro. Ogni href deve descrivere il contenuto 
    a cui punta (es. /guida-docker-linux-${YEAR}/).
    MAI usare lo stesso slug due volte.
    MAI usare slug generici come "/slug-articolo-correlato/".
12. E-E-A-T: Nel primo paragrafo includi sempre un riferimento 
    all'esperienza diretta ("Abbiamo testato", "In questa guida 
    pratica", "Basandoci su X anni di utilizzo").
13. KEYWORD SEMANTICA: Usa 3-5 termini LSI distribuiti nel testo.
14. META DESCRIPTION: Deve contenere un numero/dato concreto o 
    una promessa specifica. Max 155 caratteri.
    MAI usare punti esclamativi (!). Tono informativo, mai pubblicitario.
15. DATE SCHEMA: Includi sempre datePublished e dateModified 
    nello schema JSON-LD.
    - dateModified: sempre ${TODAY} (data di scrittura dell'articolo).
    - datePublished: usa la data reale dell'evento/rilascio trattato 
      nell'articolo se menzionata nel testo (es. "rilasciato il 19 marzo 
      2026" → datePublished: "2026-03-19"). 
      Se non è indicata una data specifica, usa ${TODAY}.
    - Formato ISO 8601 obbligatorio: "YYYY-MM-DD".
16. H2 COME DOMANDE: Ogni H2 deve rispondere a una domanda reale 
    che un utente potrebbe cercare su Google.
17. JSON VALIDITY: Assicurati che l'output sia un JSON valido al 100%. 
    - MAI usare virgole finali (trailing commas).
    - MAI usare commenti (// o /* */) nel JSON.
    - Assicurati che tutte le chiavi e i valori stringa siano tra doppie virgolette.
    - Escapa correttamente i caratteri speciali nelle stringhe (es. virgolette interne).
18. BLOCKQUOTE: Citazioni dirette da fonti esterne SEMPRE come 
    <blockquote> autonomo fuori da qualsiasi <p>, seguito da 
    <cite> separato. Se in lingua straniera, aggiungi subito dopo 
    <p><em>traduzione italiana sintetica</em></p>.
    La traduzione deve riportare l'anno della fonte originale,
    NON l'anno corrente ${YEAR}.
18. LISTE PULITE: MAI usare <ul> con un solo <li>.
    - SBAGLIATO: <ul><li>Caso d'uso: testo</li></ul>
    - GIUSTO: <p>Caso d'uso: testo</p>
19. LISTE NUMERATE: MAI usare <p> con "1. testo", "2. testo". 
    Usa sempre <ol> con <li>.
    - SBAGLIATO: <p>1. Primo passo...</p><p>2. Secondo passo</p>
    - GIUSTO: <ol><li>Primo passo</li><li>Secondo passo</li></ol>
20. ANNO: Usa SEMPRE l'anno ${YEAR} in H1, H2, testo e
    keywords JSON-LD. MAI anni diversi da ${YEAR}.
21. AUTHOR: Se l'autore è "Cosmonet.info" usa "@type": 
    "Organization". Usa "@type": "Person" solo per autori umani.

═══════════════════════════════
REGOLE HTML STRUTTURALI
═══════════════════════════════

22. NESTING VIETATO: Un <h3> non può MAI stare dentro un <p>.
    - SBAGLIATO: <p><h3>Titolo</h3>testo</p>
    - GIUSTO: </p> → <h3>Titolo</h3> → <p>testo</p>
    Stessa regola per <h2> dentro <p>.

23. TABLE TESTO LIBERO: Nessun testo o paragrafo può stare 
    dentro <table> prima di <thead>.
    - SBAGLIATO: <table>Questa tabella confronta...<thead>...
    - GIUSTO: <p>Questa tabella confronta...</p><table><thead>...

24. PRE/CODE ESCAPING: I payload tecnici (comandi, snippet, 
    codice da copiare) vanno sempre in <pre><code>.
    I caratteri HTML speciali dentro <pre><code> devono essere 
    escaped: < → &lt;   > → &gt;   & → &amp;
    - SBAGLIATO: <pre><code><script>alert('xss')</script></code></pre>
    - GIUSTO: <pre><code>&lt;script&gt;alert('xss')&lt;/script&gt;</code></pre>

═══════════════════════════════
REGOLE COPYRIGHT — ZERO TOLERANCE
═══════════════════════════════

25. LIMITE CITAZIONI DIRETTE: Massimo 14 parole consecutive da 
    qualsiasi fonte esterna (RFC, documentazione, articoli, paper).
    - SBAGLIATO: citare 20+ parole letterali da una RFC o doc ufficiale
    - GIUSTO: parafrasare e attribuire, oppure citare max 14 parole

26. UNA CITAZIONE PER FONTE: Dopo una citazione diretta da una 
    fonte, quella fonte è chiusa per le citazioni. 
    Qualsiasi ulteriore contenuto dalla stessa fonte va parafrasato.

27. CITAZIONI PERSONE REALI: Mai attribuire frasi a persone reali 
    con nome e cognome senza una URL pubblica verificabile che 
    contenga esattamente quelle parole.
    - FONTE ACCETTABILE: URL diretta a pagina pubblica, 
      paper con DOI, documentazione ufficiale con sezione specifica.
    - FONTE NON ACCETTABILE: "Documentation Archive 2024-2026", 
      "intervista non pubblicata", "comunicato interno".
    Se la citazione non è verificabile con URL reale, 
    parafrasa nel corpo del testo senza blockquote nominale.

═══════════════════════════════
REGOLE JSON-LD — ZERO TOLERANCE
═══════════════════════════════

28. ARTICLEBODY REALE: Il campo articleBody nel JSON-LD Article 
    deve contenere un riassunto reale dell'articolo (3-5 frasi).
    - VIETATO: "[Testo completo omesso per brevità]", "...", 
      testo di esempio o placeholder di qualsiasi tipo.
    - GIUSTO: sintesi autentica dei contenuti principali dell'articolo.

29. FAQ SYNC: Il numero di Question in FAQPage mainEntity deve 
    essere IDENTICO al numero di FAQ nell'HTML.
    - 6 FAQ nell'HTML = 6 mainEntity nel JSON-LD. Zero eccezioni.
    - Il testo di acceptedAnswer deve essere coerente con il <p> 
      della FAQ corrispondente nell'HTML.

═══════════════════════════════
REGOLE GEO (Generative Engine Optimization)
═══════════════════════════════

- direct_answer: risposta diretta alla domanda principale 
  (max 2 righe, stile featured snippet).
- entity_definitions: entità principali con categoria tassonomica 
  (es. "strumento open source", "distribuzione Linux").
- key_facts: 5 fatti chiave citabili, formato affermativo, 
  dati concreti e verificabili.
- authoritative_claim: affermazione originale e verificabile che 
  sintetizza la tesi principale. Autonoma e citabile senza 
  contesto aggiuntivo. Usala come "description" nel JSON-LD.
- faq_schema: 3-5 coppie domanda/risposta in JSON-LD FAQPage 
  separato dall'Article. Le domande devono rispecchiare 
  ricerche reali degli utenti.

═══════════════════════════════
SOCIAL POSTS (4 piattaforme)
═══════════════════════════════

Genera post ottimizzati per: LinkedIn, X (Twitter), 
Instagram, Telegram.
Tono e lunghezza adatti a ogni piattaforma, spingere al click.

Data di pubblicazione: ${TODAY}
Autore: Cosmonet.info

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
            // ✅ RIMOSSO googleSearch: l'ottimizzazione deve basarsi sul testo fornito
            // per evitare timeout e 500 RPC errors su risposte lunghe (2000+ parole)
            maxOutputTokens: 8192,
          },
        });
        break; // Successo!
      } catch (err: any) {
        retries--;
        if (retries === 0) throw err;
        console.warn(`Retrying optimizeArticleForSeo... (${retries} left). Error:`, err.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Backoff esponenziale
      }
    }

    if (!response) throw new Error("No response from Gemini API");

    const result: SeoResult = safeJsonParse(response.text);

    // ✅ PATCH — non sovrascrivere datePublished con TODAY se l'AI ha impostato
    // una data specifica dell'evento/rilascio trattato nell'articolo.
    // dateModified è sempre TODAY (data di pubblicazione dell'articolo sul sito).
    if (!result.schema_markup.article.datePublished) {
      result.schema_markup.article.datePublished = TODAY;
    }
    result.schema_markup.article.dateModified = TODAY;

    result.social_post = result.social_posts?.[0] ?? { platform: 'LinkedIn', content: '', hashtags: [] };
    result.htmlContent = buildHtmlContent(result);
    result.groundingSources = extractSources(response);

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
per Cosmonet.info (blog tech italiano su AI, Linux, Open Source, Gaming).
Effettua una ricerca approfondita su: "${topic}".
Genera un articolo dettagliato, strutturato in paragrafi, con dati reali 
e fonti aggiornate al ${YEAR}. Tono professionale.
L'articolo deve essere pronto per l'ottimizzazione SEO.
Usa SEMPRE l'anno ${YEAR} nei riferimenti temporali. MAI anni precedenti.

REGOLE ANTI-ERRORE DATE E DATI:
- L'anno corrente è ${YEAR}. NON confonderlo con anni di fondazione 
  o lancio di prodotti. Se una fonte dice "fondato nel 2024", 
  scrivi "2024", MAI ${YEAR}.
- Includi SOLO dati numerici trovati nelle fonti della ricerca.
- MAI inventare statistiche, benchmark o citazioni senza fonte.
- Se mancano dati verificati per una sezione, scrivi il contenuto 
  senza numeri inventati. Usa "secondo quanto dichiarato dalla 
  società..." invece di inventare valori specifici.`;

  let retries = 3;
  let delay = 2000;

  while (retries > 0) {
    try {
      const stream = await ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ googleSearch: {} }],
        },
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
      if (retries === 0) {
        console.error("Error in researchTopicStream after all retries:", error);
        throw error;
      }
      console.warn(`Retrying researchTopicStream... (${retries} left). Error:`, error.message);
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

  const prompt = `Agisci come 'Cosmonet.info', blog tech italiano specializzato 
in AI, Linux, Open Source e Gaming.

OBIETTIVI:
- Analisi approfondita, mai sintetica
- Dati tecnici reali con fonti recenti (priorità 2024-${YEAR})
- Copertura: contesto storico, stato attuale, implicazioni future

═══════════════════════════════
VERIFICA PRELIMINARE OBBLIGATORIA
═══════════════════════════════

PRIMA di scrivere qualsiasi contenuto, usa googleSearch 
per verificare cosa sia esattamente l'argomento richiesto.

REGOLE DI VERIFICA:
- Se il nome del topic è un brand, prodotto o acronimo 
  (es. "Venice AI", "n8n", "GIMP"), cerca prima la 
  definizione esatta su Google prima di procedere.
- MAI assumere il significato di un termine senza 
  averlo verificato con la ricerca.
- MAI inventare nomi di organizzazioni, partnership, 
  statistiche, versioni software o dati tecnici non 
  trovati nella ricerca.
- Se un termine ha più significati, cerca quello corretto 
  PRIMA di iniziare a scrivere.

═══════════════════════════════
REGOLE ANTI-ERRORE DATE E DATI
═══════════════════════════════

DATE STORICHE:
- L'anno corrente è ${YEAR}. NON confonderlo con l'anno 
  di fondazione, lancio o rilascio di prodotti/aziende.
- Se una fonte dice "fondato nel 2024", scrivi "2024". 
  MAI sostituire con ${YEAR}.
- Distingui sempre: anno di fondazione, anno di lancio 
  pubblico, anno di aggiornamento e anno corrente.
- ESEMPIO SBAGLIATO: "Venice AI, fondata nel ${YEAR}..."
  quando la fonte dice "lanciata nel maggio 2024".
- ESEMPIO GIUSTO: "Venice AI, lanciata nel maggio 2024..."

DATI NUMERICI:
- Includi SOLO dati trovati nelle fonti della ricerca web.
- MAI inventare latenze, percentuali, statistiche utenti 
  o benchmark senza fonte citabile esplicita.
- Se un dato numerico non è presente nelle fonti, omettilo 
  o scrivi esplicitamente "dato non disponibile".
- MAI estrapolare dati non verificati: se hai "400.000 
  utenti a febbraio 2025" non scrivere "1.6 milioni nel 
  ${YEAR}" senza fonte verificata.

QUANDO MANCANO DATI VERIFICATI:
- Se per una sezione non hai dati numerici dalla ricerca, 
  scrivi il contenuto senza numeri inventati.
- È preferibile un articolo senza benchmark falsi che uno 
  con dati non verificabili.
- In alternativa usa formule come:
  "secondo quanto dichiarato dalla società..."
  "i test interni indicano..."
  senza inventare valori specifici.
- MAI inventare: prezzi annuali, limiti del piano free, 
  numero di token per staking, latenze specifiche in ms, 
  percentuali di adozione, nodi di rete, eventi o keynote 
  non trovati nelle fonti.

CITAZIONI:
- Usa blockquote SOLO per citazioni testuali verificate 
  e attribuibili a persona o documento reale con URL.
- MAI inventare citazioni, manifesti, conferenze o 
  documenti inesistenti.
- Se non trovi una citazione verificabile con URL reale, 
  ometti il blockquote e parafrasa le informazioni trovate.
- Le traduzioni dei blockquote devono riportare l'anno 
  corretto della fonte originale, NON l'anno corrente ${YEAR}.
- LIMITE CITAZIONI DIRETTE: Massimo 14 parole consecutive 
  da qualsiasi fonte. Oltre: parafrasa obbligatoriamente.
- CITAZIONI PERSONE: Solo con URL pubblica verificabile 
  che contenga esattamente quelle parole. Se non verificabile, 
  ometti il blockquote nominale e parafrasa.

STRUTTURA ARTICOLO OBBLIGATORIA:
1. Introduzione coinvolgente con hook
   - Variante long-tail della keyword principale entro le prime 
     100 parole
   - Riferimento a esperienza diretta o test reali (E-E-A-T)
2. Analisi tecnica approfondita (sezione più lunga)
   - Ogni sottosezione deve contenere almeno un dato numerico 
     concreto (versione, percentuale, benchmark, data)
   - Usa SOLO dati verificati dalla ricerca
3. Casi d'uso pratici con esempi concreti
4. Pro e contro oggettivi — SEMPRE in due blocchi separati:
   <h3>Vantaggi</h3> + <ul> solo pro
   <h3>Svantaggi</h3> + <ul> solo contro
5. Confronto con alternative (tabella se applicabile)
6. FAQ — 3-5 domande reali con risposte brevi stile 
   featured snippet (max 3 righe per risposta)
7. Conclusioni con raccomandazione chiara

REGOLE STRUTTURA HTML:
- Ogni H2 deve rispondere a una domanda reale dell'utente
- Un <h3> non può MAI stare dentro un <p>
- Nessun testo libero dentro <table> prima di <thead>
- Citazioni autorevoli SEMPRE come <blockquote> autonomo 
  seguito da <cite> separato. MAI dentro un <p>
- Se il blockquote è in lingua straniera, aggiungi subito dopo 
  <p><em>sintesi tradotta in italiano</em></p>
- La traduzione deve usare l'anno della fonte, NON ${YEAR}
- MAI usare <ul> con un solo <li>: usa un <p> semplice
- Se confronti più entità con gli stessi attributi, usa SEMPRE 
  una <table> con <th> e <td>. MAI <h3>+<p> con separatori "|"
- Pro e contro NON vanno mai nella stessa lista <ul>
- Link interni con slug DESCRITTIVI e DIVERSI tra loro.
  MAI usare lo stesso slug due volte nello stesso articolo.
  MAI usare slug generici come "/slug-articolo-correlato/".
- Usa 3-5 termini semanticamente correlati (LSI)
- Includi almeno una fonte autorevole verificata
- Usa SEMPRE l'anno ${YEAR} in H1, testo e keyword.
  MAI anni diversi da ${YEAR}.

Argomento: ${topic}`;

  let retries = 3;
  let delay = 2000;

  while (retries > 0) {
    try {
      const stream = await ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ googleSearch: {} }],
        },
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
      if (retries === 0) {
        console.error("Error in researchWithCosmonetStream after all retries:", error);
        throw error;
      }
      console.warn(`Retrying researchWithCosmonetStream... (${retries} left). Error:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  throw new Error("Failed to complete researchWithCosmonetStream");
};

// ─── enrichArticleDepth ───────────────────────────────────────────────────────

export const enrichArticleDepth = async (
  currentResult: SeoResult,
  _originalText: string
): Promise<SeoResult> => {
  const YEAR = getYear();

  const prompt = `Sei un Editor SEO per Cosmonet.info. Arricchisci l'HTML 
seguente con:
1. Link autorevoli a fonti esterne reali e pertinenti
2. Statistiche e dati aggiornati dove mancano (2024-${YEAR})
3. Link interni con slug DESCRITTIVI e DIVERSI tra loro 
   (es. /guida-docker-linux-${YEAR}/, /confronto-modelli-ai-${YEAR}/).
   MAI usare lo stesso slug due volte.
   MAI usare slug generici come "/slug-articolo-correlato/".
4. Sezione FAQ JSON-LD separata alla fine del documento 
   se non già presente, con 3-5 domande reali e risposte 
   brevi stile featured snippet
5. Almeno un dato numerico concreto per ogni H2 che ne sia privo,
   SOLO se trovato in fonti verificate. MAI inventare numeri.
6. Almeno una citazione <blockquote> autonoma da fonte 
   autorevole (GitHub, documentazione ufficiale, paper) 
   per rafforzare l'E-E-A-T. Solo se verificabile con URL reale.

REGOLE TROVA FONTI:
- Sostituisci link generici (es. gnunet.org) con link diretti 
  alla pagina/sezione specifica (es. gnunet.org/en/philosophy.html).
- Non aggiungere MAI un link se la fonte non è stata trovata 
  nella ricerca: meglio un claim senza link che un link sbagliato.
- Aggiungi fonti istituzionali mancanti: RFC correlate, 
  repository ufficiali, pagine di finanziatori.
- Limite citazioni dirette: massimo 14 parole consecutive 
  da qualsiasi fonte. Oltre: parafrasa obbligatoriamente.
- MAI citare persone reali con blockquote nominale senza 
  URL pubblica verificabile che contenga esattamente quelle parole.

REGOLE ASSOLUTE:
- NON accorciare nulla
- NON aggiungere indice (ToC)
- Tabelle solo per dati tabulari (mai paragrafi dentro)
- Un <h3> non può MAI stare dentro un <p>
- Nessun testo libero dentro <table> prima di <thead>
- Fonti esterne con anno 2024-${YEAR} dove possibile
- Pro e contro in due <ul> separate con <h3> distinti
- <blockquote> sempre autonomo, mai dentro <p>, 
  seguito da <cite> separato
- MAI <ul> con un solo <li>: usa <p>
- Se ci sono dati comparativi strutturati, usa <table>
- MAI inventare dati numerici, eventi, citazioni o documenti
- Restituisci SOLO l'HTML modificato, senza wrapper 
  o commenti aggiuntivi

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
            systemInstruction: SYSTEM_INSTRUCTION, // ✅ PATCH: isolato dal Project AI Studio
            tools: [{ googleSearch: {} }],
            maxOutputTokens: 8192,
          },
        });
        break; // Successo!
      } catch (err: any) {
        retries--;
        if (retries === 0) throw err;
        console.warn(`Retrying enrichArticleDepth... (${retries} left). Error:`, err.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Backoff esponenziale
      }
    }

    if (!response) throw new Error("No response from Gemini API");

    const enrichedHtml = response.text?.trim() || currentResult.htmlContent;
    const newSources = extractSources(response);

    return {
      ...currentResult,
      htmlContent: enrichedHtml,
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

export const qaAndFixHtml = async (
  currentResult: SeoResult
): Promise<SeoResult> => {
  const TODAY = getToday();
  const YEAR = getYear();
  const PREV_YEAR = (parseInt(YEAR) - 1).toString();

  const prompt = `Sei un Editor HTML QA per Cosmonet.info. Analizza l'HTML 
fornito e correggi automaticamente tutti i problemi 
strutturali senza modificare il contenuto editoriale.

═══════════════════════════════
CORREZIONI OBBLIGATORIE
═══════════════════════════════

1. TYPO NEI TITOLI: Correggi errori grammaticali o 
   ortografici nei tag <h1>, <h2>, <h3>.

2. PRO/CONTRO: Se pro e contro sono in una <ul> unica, 
   separali in:
   <h3 id="vantaggi">Vantaggi</h3> + <ul> solo pro
   <h3 id="svantaggi">Svantaggi</h3> + <ul> solo contro

3. BLOCKQUOTE: Citazioni dirette devono essere 
   <blockquote> autonomo fuori da qualsiasi <p>, 
   seguito da <cite> separato.

4. BLOCKQUOTE IN LINGUA STRANIERA: Se un <blockquote> 
   è in lingua diversa dall'italiano, aggiungi subito dopo 
   <p><em>sintesi tradotta in italiano</em></p>.
   La traduzione deve riportare l'anno della fonte originale,
   NON l'anno corrente ${YEAR}.

5. LISTE IBRIDE: Rimuovi <ul> con un solo <li> introduttivo 
   seguito da <p> con trattini manuali. Sostituisci con 
   paragrafo + <ul> pulita.

6. LISTE NUMERATE MANUALI: Paragrafi <p> che iniziano con 
   "1.", "2.", "3." diventano <ol> con <li> strutturati.
   - SBAGLIATO: <p>1. Primo</p><p>2. Secondo</p>
   - GIUSTO: <ol><li>Primo</li><li>Secondo</li></ol>

7. LISTE ANNIDATE: Se esiste una <ul> esterna con un solo 
   <li> contenente una <p> + una <ul> interna, appiattisci:
   - Estrai la <p> fuori dalla lista
   - Porta i <li> interni al livello superiore
   - Elimina i wrapper inutili

8. TAG ANNIDATI: Rimuovi tutti i <p><p>testo</p></p>. 
   Mantieni solo il <p> esterno.

9. DATE SCHEMA: Nel JSON-LD Article:
   - "dateModified": "${TODAY}" (sempre oggi)
   - "datePublished": mantieni il valore impostato dall'AI 
     se è una data specifica dell'evento/rilascio trattato.
     Sostituisci con "${TODAY}" SOLO se è vuoto o mancante.

10. FAQPAGE ANNIDATO: Se FAQPage è dentro l'Article come 
    "mainEntity", estrailo in uno <script> separato autonomo.

11. FAQ SCHEMA MANCANTE: Se manca il JSON-LD FAQPage ma 
    esiste una sezione FAQ nell'HTML, generalo estraendo 
    tutte le coppie domanda/risposta.

12. FAQ SYNC: Conta le FAQ nell'HTML (ogni <div class="faq-item">).
    Il numero di Question in FAQPage mainEntity deve essere 
    IDENTICO. Se non coincidono, rigenera il FAQPage completo 
    usando tutte le coppie domanda/risposta dell'HTML.

13. H2 DUPLICATE: Se due H2 consecutive trattano lo stesso 
    argomento, elimina la prima e mantieni quella con il 
    contenuto reale.

14. H1 UNICO: Se ci sono più <h1>, mantieni solo il primo 
    e converti gli altri in <h2>.

15. TABELLE CON PARAGRAFI: Se una <table> contiene paragrafi 
    o testo lungo nelle celle, convertila in <h3> + <p>.

16. DATI TABULARI SENZA TABELLA: Se una sezione confronta 
    più entità con gli stessi attributi tramite <h3>+<p> 
    con separatori "|", convertila in <table> strutturata.
    - SBAGLIATO: <h3>Linux Mint</h3>
      <p>RAM: 780MB | Desktop: Cinnamon</p>
    - GIUSTO: <table> con <th> e <td>

17. LINK INTERNI: Tutti gli href interni devono avere 
    formato /slug-articolo/ (slash iniziale e finale).

18. META DESCRIPTION: 
    - Se supera 155 caratteri, accorciala mantenendo 
      dato numerico e keyword principale.
    - Rimuovi tutti i punti esclamativi (!).
      - SBAGLIATO: "Scopri GNUnet 0.27: P2P rivoluzionario! Bug-fix +15%!"
      - GIUSTO: "Scopri GNUnet 0.27: protocollo CADET e GNS RFC 9498."

19. DESCRIPTION SCHEMA: Il campo "description" nel JSON-LD 
    Article deve essere l'authoritative_claim: affermazione 
    originale, verificabile e citabile. Non una descrizione 
    generica.

20. AUTHOR TYPE: Se "author.name" è il nome del sito 
    (es. "Cosmonet.info") usa "@type": "Organization". 
    Usa "@type": "Person" solo per autori umani reali.

21. ANNO NEL CONTENUTO: Verifica che H1, H2, testo e 
    keywords nel JSON-LD usino l'anno ${YEAR}. 
    Sostituisci qualsiasi anno diverso da ${YEAR}.

22. LISTE CON SINGOLO ELEMENTO: Se una <ul> contiene un 
    solo <li>, convertila in <p> mantenendo il testo.
    - SBAGLIATO: <ul><li>Caso d'uso: testo</li></ul>
    - GIUSTO: <p>Caso d'uso: testo</p>

23. SLUG DUPLICATI: Se due o più link interni hanno lo stesso 
    href, sostituisci i duplicati con slug descrittivi e 
    pertinenti al contesto del paragrafo in cui si trovano.
    MAI usare slug generici come "/slug-articolo-correlato/".

24. CONFRONTO ANNO CORRENTE: Se nel testo compare una frase 
    tipo "rispetto alla versione del ${YEAR}" riferita allo 
    stesso software analizzato nell'articolo, correggi con 
    l'anno precedente (es. "rispetto alla versione del ${PREV_YEAR}").

25. H3 DENTRO P: Se un <h3> (o <h2>) si trova annidato dentro 
    un tag <p>, estrailo:
    - SBAGLIATO: <p><h3>Vantaggi</h3>testo del paragrafo</p>
    - GIUSTO: </p> (chiudi il paragrafo precedente se aperto)
              <h3>Vantaggi</h3>
              <p>testo del paragrafo</p>

26. TESTO LIBERO IN TABLE: Se esiste testo, frasi o paragrafi 
    dentro il tag <table> ma prima del tag <thead>, spostali 
    come <p> immediatamente sopra la tabella.
    - SBAGLIATO: <table>Questa tabella confronta...<thead>...
    - GIUSTO: <p>Questa tabella confronta...</p>
              <table><thead>...

27. ARTICLEBODY PLACEHOLDER: Se il campo articleBody nel 
    JSON-LD Article contiene placeholder, testo troncato 
    con "[...]", "[omesso]" o frasi generiche tipo 
    "Testo completo dell'articolo", sostituiscilo con un 
    riassunto reale di 3-5 frasi estratto dall'articolo.

28. CITAZIONE VERBATIM LUNGA: Se un <blockquote> contiene 
    più di 14 parole consecutive di testo che sembra copiato 
    letteralmente da una fonte (RFC, documentazione, paper), 
    convertilo in paragrafo con attribuzione inline:
    - SBAGLIATO: <blockquote>Il GNU Name System (GNS) è un 
      sistema di denominazione completamente decentralizzato 
      e resistente alla censura che fornisce...</blockquote>
    - GIUSTO: <p>Secondo la RFC 9498, il GNU Name System 
      fornisce un'alternativa decentralizzata al DNS tradizionale, 
      incentrata sulla privacy degli utenti.</p>

═══════════════════════════════
REGOLE ASSOLUTE
═══════════════════════════════
- NON modificare il contenuto testuale dei paragrafi
- NON aggiungere né rimuovere sezioni
- NON alterare i valori degli attributi 'id' negli heading
- NON modificare i link esterni esistenti
- Restituisci SOLO l'HTML corretto, senza wrapper o 
  commenti aggiuntivi

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
            systemInstruction: SYSTEM_INSTRUCTION, // ✅ PATCH: isolato dal Project AI Studio
            maxOutputTokens: 8192,
          },
        });
        break; // Successo!
      } catch (err: any) {
        retries--;
        if (retries === 0) throw err;
        console.warn(`Retrying qaAndFixHtml... (${retries} left). Error:`, err.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Backoff esponenziale
      }
    }

    if (!response) throw new Error("No response from Gemini API");

    const fixedHtml = response.text?.trim() || currentResult.htmlContent;

    return {
      ...currentResult,
      htmlContent: fixedHtml
    };
  } catch (error) {
    console.error("Error in qaAndFixHtml:", error);
    throw error;
  }
};