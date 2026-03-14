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

export interface SchemaArticle {
  "@context": string;
  "@type": string;
  headline: string;
  author: { "@type": string; name: string };
  datePublished: string;
  dateModified?: string;
  description?: string;
  articleBody: string;
  keywords?: string;
  publisher?: { "@type": string; name: string };
}

export interface SchemaFaqItem {
  "@type": "Question";
  name: string;
  acceptedAnswer: { "@type": "Answer"; text: string };
}

export interface SocialPost {
  platform: string;
  content: string;
  hashtags: string[];
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
    article: SchemaArticle;
    faq_schema: SchemaFaqItem[];
  };
  seo_metadata: {
    seo_title: string;
    yoast_focus_keyword: string;
    meta_description: string;
    slug: string;
    tags: string[];
    category: string;
  };
  geo_optimization: {
    direct_answer: string;
    entity_definitions: { entity: string; definition: string }[];
    key_facts: string[];
  };
  social_posts: SocialPost[];
  /** @deprecated use social_posts */
  social_post: SocialPost;
  htmlContent: string;
  seoChecklist: SeoChecklistItem[];
  readability: ReadabilityItem[];
  groundingSources?: GroundingSource[];
}

export interface SavedSeoResult extends SeoResult {
  id: string;
  uid?: string;
  createdAt?: any;
  savedAt?: string;
  originalArticleText: string;
}

export interface BatchItem {
  id: string;
  title: string;
  text: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: SeoResult;
  error?: string;
  progress: number;
  createdAt: string;
}