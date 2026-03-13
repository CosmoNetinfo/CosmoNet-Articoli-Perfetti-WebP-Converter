# ✨ CosmoNet Articoli Perfetti

> Ottimizzatore SEO + GEO per WordPress alimentato da Gemini AI — pensato per [cosmonet.info](https://www.cosmonet.info)

![Versione](https://img.shields.io/badge/versione-2.0-indigo) ![Stack](https://img.shields.io/badge/stack-Vite%20%2B%20React%20%2B%20TypeScript-blue) ![AI](https://img.shields.io/badge/AI-Gemini%202.0%20Flash-orange) ![Licenza](https://img.shields.io/badge/licenza-privato-red)

---

## Cos'è

CosmoNet Articoli Perfetti è un'applicazione desktop/web per la produzione di articoli WordPress ottimizzati per i motori di ricerca tradizionali (SEO) e per i motori di ricerca generativi basati su AI (GEO — Generative Engine Optimization).

Incolla il testo grezzo di un articolo, imposta la keyword principale, e l'app genera automaticamente HTML pronto per WordPress, schema markup JSON-LD, meta Yoast, post social per 4 piattaforme e un'analisi completa di leggibilità.

---

## Funzionalità

### SEO
- Generazione HTML strutturato con heading H1–H3 semantici
- Title tag e meta description ottimizzati per Yoast
- Slug SEO-friendly con normalizzazione caratteri italiani (è→e, à→a)
- Schema markup `Article` e `FAQPage` in JSON-LD
- Checklist SEO con stato pass/fail per ogni criterio
- Analisi leggibilità (frasi Flesch, parole di transizione, lunghezza paragrafi)
- SEO Score calcolato dalla checklist

### GEO (Generative Engine Optimization)
- Risposta diretta estratta dall'articolo (per snippet AI)
- Entity definitions per entità nominate nell'articolo
- Key facts in formato bullet estraibile da AI indexer

### Produzione contenuti
- Export dell'articolo come file `.html` scaricabile
- Post social pre-scritti per **LinkedIn**, **X (Twitter)**, **Instagram**, **Telegram**
- Fonti di ricerca web visibili e cliccabili (Google Grounding)
- Modalità preview e modalità codice sorgente

### Archivio
- Salvataggio articoli in localStorage
- Export del database articoli come file JSON
- Import con merge anti-duplicati
- Ricerca articoli salvati per titolo, keyword o categoria
- Conferma doppio click per eliminazione

### Batch
- Elaborazione multipla di articoli in coda
- Barra progresso per singolo item e globale
- Stato visivo: pending → processing → completed / error

### Convertitore WebP
- Conversione drag & drop di immagini JPG/PNG/GIF in WebP
- Qualità 85%, download diretto, indicatore risparmio percentuale

---

## Stack tecnologico

| Componente | Tecnologia |
|---|---|
| Frontend | React 19 + TypeScript |
| Build tool | Vite 6 |
| Styling | Tailwind CSS (CDN) |
| AI | Google Gemini 2.0 Flash (`@google/genai`) |
| Ricerca web | Gemini Grounding (Google Search) |
| Storage | localStorage |
| Runtime target | Google AI Studio / locale |

---

## Struttura del progetto

```
├── App.tsx                        # Root: stato globale, tab, export/import DB
├── types.ts                       # Tutti i tipi TypeScript (SeoResult, BatchItem...)
├── index.tsx                      # Entry point React
├── index.html                     # HTML con import map AI Studio
├── index.css                      # Scrollbar personalizzata
├── vite.config.ts                 # Config Vite (solo @vitejs/plugin-react)
├── package.json
├── services/
│   └── geminiService.ts           # Chiamate Gemini API, prompt SEO+GEO, slugify
└── components/
    ├── ArticleInput.tsx            # Textarea input + fonti ricerca + contatore
    ├── SeoOutput.tsx              # Output tabellare: SEO / Leggibilità / Schema / Content
    ├── LoadModal.tsx              # Modal archivio con ricerca
    ├── Loader.tsx                 # Spinner animato con messaggi rotativi
    ├── IconComponents.tsx         # Icone SVG inline (zero dipendenze)
    └── ImageConverter.tsx         # Convertitore WebP canvas-based
```

---

## Installazione locale

```bash
# Clona il repository
git clone https://github.com/CosmoNetinfo/CosmoNet-Articoli-Perfetti-WebP-Converter.git
cd CosmoNet-Articoli-Perfetti-WebP-Converter

# Installa le dipendenze
npm install

# Crea il file .env con la tua API key Gemini
echo "VITE_GEMINI_API_KEY=la_tua_chiave" > .env

# Avvia in sviluppo
npm run dev
```

> Su **Google AI Studio** la API key viene iniettata automaticamente — non serve `.env`.

---

## Utilizzo

1. **Incolla** il testo grezzo dell'articolo nel campo di input
2. **Imposta** keyword focus, autore e categoria WordPress
3. **Clicca** "Genera" — Gemini analizza e ottimizza il contenuto
4. Dalla tab **SEO**: copia title, meta, slug, tag
5. Dalla tab **Content**: copia l'HTML pronto per l'editor WordPress
6. Dalla tab **Schema**: incolla il JSON-LD nel plugin SEO
7. Dalla tab **GEO**: verifica la risposta diretta per AI indexing
8. Copia i **post social** per LinkedIn, X, Instagram e Telegram
9. **Salva** l'articolo nell'archivio locale per ricaricarlo in futuro

### Modalità Batch

Carica più articoli contemporaneamente dalla sezione **Batch**. Ogni articolo viene elaborato in sequenza con barra di avanzamento dedicata.

---

## Note tecniche

- **Tailwind CSS** viene caricato via CDN nell'`index.html` — non installare `@tailwindcss/vite` come dipendenza npm
- **`package-lock.json`** non va committato — AI Studio lo rigenera ad ogni sync
- Il campo `name` nel `package.json` deve rimanere `cosmonet-articoli-perfetti-+-webp-converter` per compatibilità con AI Studio
- Lo **slugify** gestisce correttamente i caratteri italiani tramite `String.normalize('NFD')`
- La `datePublished` nello schema JSON-LD viene iniettata dal codice con la data corrente — non viene mai inventata dall'AI

---

## Changelog v2.0

- Fix modello Gemini: `gemini-3-flash-preview` → `gemini-2.0-flash`
- Fix slugify per caratteri italiani (è, à, ù, ì, ò)
- Aggiunta ottimizzazione GEO (direct answer, entity definitions, key facts)
- Post social per 4 piattaforme (LinkedIn, X, Instagram, Telegram)
- Export articolo come file `.html`
- Export / Import database articoli (JSON) con merge anti-duplicati
- Fonti ricerca web visibili nell'input
- Barra progresso batch per singolo item
- SEO Score calcolato dalla checklist
- Contatore caratteri colorato su title e meta description
- Loader animato con messaggi rotativi contestuali
- Ricerca full-text nell'archivio articoli salvati
- Fix `datePublished` non più generata da Gemini

---

## Autore

Sviluppato da **Daniele — CosmoNet.info**  
Blog tech italiano su AI, Linux, Open Source e produttività digitale.

🌐 [cosmonet.info](https://www.cosmonet.info)
