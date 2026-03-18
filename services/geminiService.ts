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
      required: ["title", "intro", "sections", "faq", "conclusion"]
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

  if (result.html_content.faq.length > 0) {
    html += `<h2 id="faq-sezione-ottimizzata">Domande Frequenti (FAQ)</h2>\n`;
    result.html_content.faq.forEach(f => {
      const fId = slugify(f.question);
      html += `<div class="faq-item" style="margin-bottom:20px; border-bottom:1px solid #eee; padding-bottom:15px;">\n`;
      html += `  <h3 id="${fId}">${f.question}</h3>\n  <p>${f.answer}</p>\n</div>\n`;
    });
  }

  html += `<h2 id="conclusione">Conclusione</h2>\n<p>${result.html_content.conclusion}</p>\n`;

  const articleSchema = {
    ...result.schema_markup.article,
    "@type": "Article",
    datePublished: TODAY,
    dateModified: TODAY,
    description: result.geo_optimization.authoritative_claim || result.seo_metadata.meta_description,
    author: result.schema_markup.article.author.name === "Cosmonet.info"
      ? { "@type": "Organization", name: "Cosmonet.info" }
      : result.schema_markup.article.author,
    publisher: { "@type": "Organization", name: "Cosmonet.info" }
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": result.schema_markup.faq_schema
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
15. DATE SCHEMA: Includi sempre datePublished e dateModified 
    nello schema JSON-LD con la data ${TODAY} in formato ISO.
16. H2 COME DOMANDE: Ogni H2 deve rispondere a una domanda reale 
    che un utente potrebbe cercare su Google.
17. BLOCKQUOTE: Citazioni dirette da fonti esterne SEMPRE come 
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
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema,
        tools: [{ googleSearch: {} }],
      },
    });

    const result: SeoResult = JSON.parse(response.text.trim());

    result.schema_markup.article.datePublished = TODAY;
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

  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] },
    });

    let fullText = "";
    let sources: GroundingSource[] = [];

    for await (const chunk of stream) {
      fullText += chunk.text || "";
      onChunk(fullText);
      sources = [...sources, ...extractSources(chunk)];
    }

    return Array.from(new Map(sources.map(s => [s.uri, s])).values());
  } catch (error) {
    console.error("Error in researchTopicStream:", error);
    throw error;
  }
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

  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] },
    });

    let fullText = "";
    let sources: GroundingSource[] = [];

    for await (const chunk of stream) {
      fullText += chunk.text || "";
      onChunk(fullText);
      sources = [...sources, ...extractSources(chunk)];
    }

    return Array.from(new Map(sources.map(s => [s.uri, s])).values());
  } catch (error) {
    console.error("Error in researchWithCosmonetStream:", error);
    throw error;
  }
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

REGOLE ASSOLUTE:
- NON accorciare nulla
- NON aggiungere indice (ToC)
- Tabelle solo per dati tabulari (mai paragrafi dentro)
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
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] },
    });

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

9. DATE SCHEMA: Nel JSON-LD Article imposta esattamente:
   - "datePublished": "${TODAY}"
   - "dateModified": "${TODAY}"

10. FAQPAGE ANNIDATO: Se FAQPage è dentro l'Article come 
    "mainEntity", estrailo in uno <script> separato autonomo.

11. FAQ SCHEMA MANCANTE: Se manca il JSON-LD FAQPage ma 
    esiste una sezione FAQ nell'HTML, generalo estraendo 
    tutte le coppie domanda/risposta.

12. H2 DUPLICATE: Se due H2 consecutive trattano lo stesso 
    argomento, elimina la prima e mantieni quella con il 
    contenuto reale.

13. H1 UNICO: Se ci sono più <h1>, mantieni solo il primo 
    e converti gli altri in <h2>.

14. TABELLE CON PARAGRAFI: Se una <table> contiene paragrafi 
    o testo lungo nelle celle, convertila in <h3> + <p>.

15. DATI TABULARI SENZA TABELLA: Se una sezione confronta 
    più entità con gli stessi attributi tramite <h3>+<p> 
    con separatori "|", convertila in <table> strutturata.
    - SBAGLIATO: <h3>Linux Mint</h3>
      <p>RAM: 780MB | Desktop: Cinnamon</p>
    - GIUSTO: <table> con <th> e <td>

16. LINK INTERNI: Tutti gli href interni devono avere 
    formato /slug-articolo/ (slash iniziale e finale).

17. META DESCRIPTION: Se supera 155 caratteri, accorciala 
    mantenendo dato numerico e keyword principale.

18. DESCRIPTION SCHEMA: Il campo "description" nel JSON-LD 
    Article deve essere l'authoritative_claim: affermazione 
    originale, verificabile e citabile. Non una descrizione 
    generica.

19. AUTHOR TYPE: Se "author.name" è il nome del sito 
    (es. "Cosmonet.info") usa "@type": "Organization". 
    Usa "@type": "Person" solo per autori umani reali.

20. ANNO NEL CONTENUTO: Verifica che H1, H2, testo e 
    keywords nel JSON-LD usino l'anno ${YEAR}. 
    Sostituisci qualsiasi anno diverso da ${YEAR}.

21. LISTE CON SINGOLO ELEMENTO: Se una <ul> contiene un 
    solo <li>, convertila in <p> mantenendo il testo.
    - SBAGLIATO: <ul><li>Caso d'uso: testo</li></ul>
    - GIUSTO: <p>Caso d'uso: testo</p>

22. SLUG DUPLICATI: Se due o più link interni hanno lo stesso 
    href, sostituisci i duplicati con slug descrittivi e 
    pertinenti al contesto del paragrafo in cui si trovano.
    MAI usare slug generici come "/slug-articolo-correlato/".

23. CONFRONTO ANNO CORRENTE: Se nel testo compare una frase 
    tipo "rispetto alla versione del ${YEAR}" riferita allo 
    stesso software analizzato nell'articolo, correggi con 
    l'anno precedente (es. "rispetto alla versione del ${PREV_YEAR}").

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
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

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