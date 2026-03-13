import { GoogleGenAI, Type } from "@google/genai";
import { SeoResult, GroundingSource, SchemaArticle } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ✅ FIX: slugify con supporto caratteri italiani e accenti
const slugify = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // rimuove diacritici (è → e, à → a)
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

const TODAY = new Date().toISOString().split('T')[0]; // ✅ FIX: data reale

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
              definition: { type: Type.STRING }
            },
            required: ["entity", "definition"]
          }
        },
        key_facts: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["direct_answer", "entity_definitions", "key_facts"]
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
  let html = `<meta name="description" content="${result.seo_metadata.meta_description}">\n\n`;
  html += `<h1>${result.html_content.title}</h1>\n`;
  html += `<p>${result.html_content.intro}</p>\n\n`;

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
      html += `<p>${s.content}</p>\n`;
    }

    if (s.subsections?.length) {
      s.subsections.forEach(sub => {
        html += `<h3 id="${slugify(sub.heading)}">${sub.heading}</h3>\n`;
        html += `<p>${sub.content}</p>\n`;
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

  // ✅ FIX: Conclusione con H2 semantico invece di <strong>
  html += `<h2 id="conclusione">Conclusione</h2>\n<p>${result.html_content.conclusion}</p>\n`;

  // ✅ FIX: datePublished con data reale, non inventata da Gemini
  const fullSchema = {
    ...result.schema_markup.article,
    datePublished: TODAY,
    dateModified: TODAY,
    description: result.seo_metadata.meta_description,
    publisher: { "@type": "Organization", name: "Cosmonet.info" },
    mainEntity: {
      "@type": "FAQPage",
      mainEntity: result.schema_markup.faq_schema
    }
  };

  html += `\n\n<script type="application/ld+json">\n${JSON.stringify(fullSchema, null, 2)}\n</script>`;
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
  const prompt = `Agisci come Editor Tecnico Senior SEO+GEO per WordPress di Cosmonet.info (blog tech italiano su AI, Linux, Open Source, Gaming).
Trasforma il testo fornito in contenuto HTML perfetto sia per il ranking Google tradizionale che per l'indicizzazione nei motori AI (ChatGPT, Gemini, Perplexity).

═══════════════════════════════
REGOLE SEO — ZERO TOLERANCE
═══════════════════════════════

1. INTEGRITÀ: Non accorciare MAI il testo. Niente riassunti. Mantieni ogni dettaglio tecnico.
2. NO ToC: Vietato generare l'indice dei contenuti.
3. TITOLI: Un solo <h1>. Ogni <h2> e <h3> deve avere attributo 'id' descrittivo.
4. TABELLE: Usale SOLO per dati tabulari. MAI <table> con paragrafi dentro.
   - SBAGLIATO: usare table con paragrafi dentro
   - GIUSTO: usare paragrafi separati poi eventuale table solo per dati
5. IMMAGINI: Inserisci commenti HTML nei punti strategici con formato: IMMAGINE descrizione .webp
6. KEYWORD: La focus keyword deve apparire nel title, nel primo paragrafo, in almeno 2 H2 e nella meta.
7. SCHEMA type: Usa SEMPRE "Article" come valore per il campo type dello schema. Mai TechArticle o BlogPosting.
8. PRO/CONTRO: Sezioni con vantaggi e svantaggi devono usare type "list" con ogni voce su riga separata prefissata da "- ".
9. CONCLUSIONE: Il campo conclusion deve contenere SOLO il testo del paragrafo finale, senza la parola Conclusione.
10. LINK INTERNI: Aggiungi 2-3 link interni a cosmonet.info usando placeholder con href="/slug-articolo-correlato/" nei paragrafi pertinenti.

═══════════════════════════════
REGOLE GEO (Generative Engine Optimization)
═══════════════════════════════

Ottimizza per essere citato dai motori AI:
- Fornisci una risposta diretta alla domanda principale nel campo direct_answer (max 2 righe, stile featured snippet).
- Definisci le entità principali del testo (termini tecnici, tool, concetti) in entity_definitions.
- Elenca i 5 fatti chiave più citabili da un AI in key_facts (formato affermativo, dati concreti).

═══════════════════════════════
SOCIAL POSTS (4 piattaforme)
═══════════════════════════════

Genera post ottimizzati per: LinkedIn, X (Twitter), Instagram, Telegram.
Ogni post deve avere tono e lunghezza adatti alla piattaforma e spingere al click.

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
  const prompt = `Agisci come Ricercatore e Copywriter esperto di tecnologia.
Effettua una ricerca approfondita su: "${topic}".
Genera un articolo dettagliato, strutturato in paragrafi, con dati reali e fonti aggiornate.
Tono professionale. L'articolo deve essere pronto per l'ottimizzazione SEO.`;

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
  const prompt = `Agisci come 'Cosmonet.info', blog tech italiano specializzato in AI, Linux, Open Source e Gaming.

OBIETTIVI:
- Analisi approfondita, mai sintetica
- Dati tecnici reali con fonti recenti
- Copertura: contesto storico, stato attuale, implicazioni future

STRUTTURA ARTICOLO:
1. Introduzione coinvolgente con hook
2. Analisi tecnica approfondita (la sezione più lunga)
3. Casi d'uso pratici con esempi concreti
4. Pro e contro oggettivi
5. Confronto con alternative (se applicabile)
6. Conclusioni con raccomandazione chiara

REGOLE:
- Linux/Open Source: discuti licenze, community, architettura
- AI: spiega concetti, performance, implicazioni etiche
- Tono: professionale, appassionato, oggettivo
- Livello: accessibile sia ai neofiti che agli esperti

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
  const prompt = `Sei un Editor SEO per Cosmonet.info. Arricchisci l'HTML seguente con:
1. Link autorevoli a fonti esterne reali e pertinenti
2. Statistiche e dati aggiornati dove mancano
3. Link interni tra argomenti correlati (usa /slug-articolo/ come placeholder)

REGOLE ASSOLUTE:
- NON accorciare nulla
- NON aggiungere indice (ToC)
- Rispetta il vincolo tabelle
- Restituisci SOLO l'HTML modificato, senza wrapper o commenti

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