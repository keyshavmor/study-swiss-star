/** Frontend utility or server adapter used by the local Alim application. */
export interface ContextSourceSnippet {
  source_id: string;
  material_id: string | null;
  material_name: string | null;
  section: string | null;
  page: number | null;
  chapter?: string | null;
  snippet: string;
  score: number;
  url: string | null;
}

export interface ContextChatResponse {
  thread_id: string;
  message_id: string;
  answer: string;
  sources: ContextSourceSnippet[];
  exam_tip: string | null;
  used_model: string;
  retrieval_summary: {
    chunks_considered: number;
    chunks_used: number;
    collections: string[];
  };
  language: string | null;
  created_at: string;
}

export interface ContextResponseMetadata {
  sources: ContextSourceSnippet[];
  examTip: string | null;
  usedModel: string;
  retrievalSummary: ContextChatResponse["retrieval_summary"];
}
