
export interface SeoChecklistItem {
  item: string;
  status: 'pass' | 'fail' | 'manual_action';
  details: string;
}

export interface ReadabilityItem {
  criteria: string; 
  status: 'good' | 'ok' | 'needs_improvement';
  score: string; 
  message: string; 
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface SeoResult {
  html_content: {
    title: string;
    intro: string;
    sections: { 
      heading: string; 
      content: string; 
      type: 'text' | 'list' | 'table';
      subsections?: { heading: string; content: string }[];
    }[];
    faq: { question: string; answer: string }[];
    conclusion: string;
  };
  schema_markup: {
    article: any;
    faq_schema: any[];
  };
  seo_metadata: {
    seo_title: string;
    yoast_focus_keyword: string;
    meta_description: string;
    slug: string;
    tags: string[];
    category: string;
  };
  social_post: {
    platform: string;
    content: string;
    hashtags: string[];
  };
  // Per compatibilità con UI esistente
  htmlContent: string; // Versione HTML renderizzata finale con script schema iniettato
  seoChecklist: SeoChecklistItem[];
  readability: ReadabilityItem[];
  groundingSources?: GroundingSource[];
}

export interface SavedSeoResult extends SeoResult {
    id: string;
    originalArticleText: string;
}

export interface BatchItem {
    id: string;
    text: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
    result?: SeoResult;
    error?: string;
    progress?: number;
}
