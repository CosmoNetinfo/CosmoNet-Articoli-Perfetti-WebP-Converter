
import { GoogleGenAI, Type } from "@google/genai";
import { SeoResult, GroundingSource } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
                        "headline": { type: Type.STRING },
                        "author": {
                            type: Type.OBJECT,
                            properties: {
                                "@type": { type: Type.STRING },
                                "name": { type: Type.STRING }
                            },
                            required: ["@type", "name"]
                        },
                        "datePublished": { type: Type.STRING },
                        "articleBody": { type: Type.STRING },
                        "keywords": { type: Type.STRING }
                    },
                    required: ["@context", "@type", "headline", "articleBody"]
                },
                faq_schema: { 
                    type: Type.ARRAY, 
                    items: { 
                        type: Type.OBJECT,
                        properties: {
                            "@type": { type: Type.STRING },
                            "name": { type: Type.STRING },
                            "acceptedAnswer": {
                                type: Type.OBJECT,
                                properties: {
                                    "@type": { type: Type.STRING },
                                    "text": { type: Type.STRING }
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
        social_post: {
            type: Type.OBJECT,
            properties: {
                platform: { type: Type.STRING },
                content: { type: Type.STRING },
                hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["platform", "content", "hashtags"]
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
    required: ["html_content", "schema_markup", "seo_metadata", "social_post", "seoChecklist", "readability"],
};

const slugify = (text: string) => text.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-').trim();

export const optimizeArticleForSeo = async (articleText: string): Promise<SeoResult> => {
    try {
        const prompt = `Agisci come Editor Tecnico Senior SEO per WordPress esperto in performance (WebP). 
Trasforma il testo fornito in codice HTML perfetto per l'AI Indexing.

REGOLE MANDATORIE "ZERO TOLERANCE":

1. INTEGRITÀ DEL CONTENUTO: 
   - NON accorciare mai il testo originale. Mantieni ogni paragrafo e dettaglio tecnico. 
   - È VIETATO fare riassunti.

2. NO INDICE (ToC): 
   - È ASSOLUTAMENTE VIETATO generare l'indice dei contenuti all'inizio dell'articolo.

3. STRUTTURA TITOLI & ANCORAGGI: 
   - Un solo tag <h1>. Ogni tag <h2> e <h3> DEVE avere un attributo 'id' descrittivo e semantico.

4. VINCOLO TECNICO DEFINITIVO SULLE TABELLE:
   - REGOLA D'ORO: Se il contenuto non è una lista di dati divisi in colonne, NON USARE <table>.
   - ESEMPIO DI ERRORE: <table><p>Descrizione...</p></table> (VIETATO).
   - ESEMPIO CORRETTO: <p style="border:1px solid #ddd; padding:10px;">Descrizione...</p><table>...</table>
   - BOX STILIZZATI: Usa <div> o <p> con stili inline per risaltare i box. MAI tabelle annidate.

5. PERFORMANCE IMMAGINI (WebP):
   - Inserisci suggerimenti (commenti HTML) per il posizionamento di immagini, raccomandando il formato .webp.

6. POST SOCIAL:
   - Genera un post social ottimizzato per LinkedIn/X (Twitter) che spinga al click, con hashtag e tono professionale.

Testo Sorgente:
${articleText}`;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                tools: [{ googleSearch: {} }],
            },
        });

        const result: SeoResult = JSON.parse(response.text.trim());
        
        let fullHtml = `<meta name="description" content="${result.seo_metadata.meta_description}">\n\n`;
        fullHtml += `<h1>${result.html_content.title}</h1>\n`;
        fullHtml += `<p>${result.html_content.intro}</p>\n\n`;
        
        result.html_content.sections.forEach(s => {
            const sId = slugify(s.heading);
            fullHtml += `<h2 id="${sId}">${s.heading}</h2>\n`;
            
            if (s.type === 'list') {
                fullHtml += `<ul>\n${s.content.split('\n').filter(l => l.trim()).map(li => `  <li>${li.replace(/^[*-]\s*/, '').trim()}</li>`).join('\n')}\n</ul>\n`;
            } else if (s.type === 'table') {
                const cleanTableContent = s.content.replace(/<p>|<\/p>/g, '').trim();
                fullHtml += `<div style="overflow-x:auto; margin-bottom:25px;">\n<table border="1" style="width:100%; border-collapse:collapse;">\n${cleanTableContent}\n</table>\n</div>\n`;
            } else {
                fullHtml += `<p>${s.content}</p>\n`;
            }

            if (s.subsections) {
                s.subsections.forEach(sub => {
                    fullHtml += `<h3 id="${slugify(sub.heading)}">${sub.heading}</h3>\n`;
                    fullHtml += `<p>${sub.content}</p>\n`;
                });
            }
        });
        
        if (result.html_content.faq.length > 0) {
            fullHtml += `<h2 id="faq-sezione-ottimizzata">Domande Frequenti (FAQ)</h2>\n`;
            result.html_content.faq.forEach(f => {
                fullHtml += `<div class="faq-item" style="margin-bottom:20px; border-bottom:1px solid #eee; padding-bottom:15px;">\n  <h3 id="${slugify(f.question)}">${f.question}</h3>\n  <p>${f.answer}</p>\n</div>\n`;
            });
        }
        
        fullHtml += `<p><strong>Conclusione:</strong> ${result.html_content.conclusion}</p>\n`;
        
        const fullSchema = {
            ...result.schema_markup.article,
            "description": result.seo_metadata.meta_description,
            "mainEntity": {
                "@type": "FAQPage",
                "mainEntity": result.schema_markup.faq_schema
            }
        };
        const schemaScript = `\n\n<script type="application/ld+json">\n${JSON.stringify(fullSchema)}\n</script>`;
        
        result.htmlContent = fullHtml + schemaScript;
        result.groundingSources = extractSources(response);
        return result;
    } catch (error) {
        console.error(error);
        throw new Error("Errore durante l'ottimizzazione SEO AI.");
    }
};

export const researchTopicStream = async (topic: string, onChunk: (text: string) => void): Promise<GroundingSource[]> => {
    try {
        const prompt = `Agisci come un Ricercatore e Copywriter esperto. 
        Effettua una ricerca approfondita sul seguente argomento: "${topic}".
        Genera un articolo dettagliato, strutturato in paragrafi, con dati reali e fonti aggiornate.
        L'articolo deve essere pronto per essere ottimizzato SEO successivamente.
        Usa un tono professionale e informativo.`;

        const response = await ai.models.generateContentStream({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: { 
                tools: [{ googleSearch: {} }] 
            },
        });

        let fullText = "";
        let sources: GroundingSource[] = [];

        for await (const chunk of response) {
            const text = chunk.text || "";
            fullText += text;
            onChunk(fullText);
            
            // Extract sources if available in this chunk
            const chunkSources = extractSources(chunk);
            if (chunkSources.length > 0) {
                sources = [...sources, ...chunkSources];
            }
        }

        return Array.from(new Map(sources.map(s => [s.uri, s])).values());
    } catch (error) {
        console.error(error);
        throw new Error("Errore durante la ricerca streaming.");
    }
};

export const researchWithCosmonetStream = async (topic: string, onChunk: (text: string) => void): Promise<GroundingSource[]> => {
    try {
        const prompt = `Agisci come 'Cosmonet.info', un esperto di informazione e giornalismo specializzato nel settore tecnologico. Il tuo compito è fornire approfondimenti dettagliati e articoli esaustivi su temi come Linux, open source e Intelligenza Artificiale.

Scopi e Obiettivi:
* Fornire analisi approfondite e ricerche dettagliate su argomenti tecnologici specifici richiesti dall'utente.
* Creare articoli completi, ricchi di dati e mai sintetici, adatti per un blog di informazione tech professionale.
* Esplorare le ultime tendenze nel mondo Linux, del software libero e dei modelli di AI, navigando nel web per raccogliere quante più informazioni possibili.

Comportamenti e Regole:
1) Ricerca Iniziale:
a) Quando l'utente propone un tema, effettua una ricerca estesa utilizzando fonti autorevoli.
b) Non limitarti alla superficie; cerca dettagli tecnici, contesti storici e implicazioni future del software o della tecnologia in questione.
c) Identifica le fonti più recenti per garantire l'attualità delle informazioni su AI e distribuzioni Linux.

2) Redazione dell'Articolo:
a) Struttura l'articolo in sezioni chiare: Introduzione, Analisi Approfondita, Casi d'Uso (se applicabile), e Conclusioni.
b) Evita la brevità; l'obiettivo è la completezza dell'informazione. Ogni punto deve essere spiegato in modo minuzioso.
c) Mantieni un rigore giornalistico, citando fatti e sviluppi tecnici reali.

3) Approfondimento Tecnico:
a) Se tratti di Linux o open source, discuti di licenze, community e architettura tecnica.
b) Se tratti di AI, spiega i concetti sottostanti, le implicazioni etiche e le prestazioni dei modelli citati.

Tono Generale:
* Professionale, autorevole e informativo.
* Appassionato di tecnologia ma oggettivo nell'analisi.
* Uno stile di scrittura coinvolgente che cattura l'interesse dei lettori esperti e dei neofiti del settore tech.

Argomento da trattare: ${topic}`;

        const response = await ai.models.generateContentStream({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: { 
                tools: [{ googleSearch: {} }] 
            },
        });

        let fullText = "";
        let sources: GroundingSource[] = [];

        for await (const chunk of response) {
            const text = chunk.text || "";
            fullText += text;
            onChunk(fullText);
            
            const chunkSources = extractSources(chunk);
            if (chunkSources.length > 0) {
                sources = [...sources, ...chunkSources];
            }
        }

        return Array.from(new Map(sources.map(s => [s.uri, s])).values());
    } catch (error) {
        console.error(error);
        throw new Error("Errore durante la ricerca Cosmonet streaming.");
    }
};

export const enrichArticleDepth = async (currentResult: SeoResult, originalText: string): Promise<SeoResult> => {
    try {
        const prompt = `Arricchisci l'HTML fornito con link autorevoli basati su fatti reali. 
        REGOLE: NON accorciare nulla. RISPETTA IL VINCOLO TABELLE.
        Contenuto attuale: ${currentResult.htmlContent}`;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] },
        });

        return { ...currentResult, htmlContent: response.text || currentResult.htmlContent };
    } catch (error) {
        return currentResult;
    }
};

const extractSources = (response: any): GroundingSource[] => {
    const sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
        chunks.forEach((chunk: any) => {
            if (chunk.web?.uri) {
                sources.push({ title: chunk.web.title || "Fonte", uri: chunk.web.uri });
            }
        });
    }
    return Array.from(new Map(sources.map(s => [s.uri, s])).values());
};
