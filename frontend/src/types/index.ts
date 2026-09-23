export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  created_at?: string;
  two_factor_enabled?: boolean;
  recovery_codes_remaining?: number;
}

export interface UserSession {
  id: string;
  browser: string;
  os: string;
  device_type: 'desktop' | 'mobile' | 'tablet';
  ip_address: string | null;
  created_at: string | null;
  last_seen_at: string | null;
  current: boolean;
}

export type SessionStatus = 'active' | 'expired' | 'revoked';

export interface AdminSession extends Omit<UserSession, 'current'> {
  current: boolean;
  status: SessionStatus;
  revoked_at: string | null;
  user: { id: number; name: string; email: string; role: string; two_factor_enabled: boolean };
}

export interface AdminOverview {
  total_users: number;
  active_sessions: number;
  active_users: number;
  sign_ins_24h: number;
  users_with_2fa: number;
}

export interface ActivityItem {
  id: string;
  type: string;
  target: string | null;
  timestamp: string;
}

export type AnalyticsRange = '7d' | '30d' | '12m';

export interface GrowthStat {
  current: number;
  previous: number;
  change_pct: number | 'new' | null;
}

export interface DocumentMetadata {
  language?: string;
  title?: string;
  topics?: string[];
  keywords?: { keyword: string; score: number }[];
  entities?: { text: string; type: string }[];
  classification?: string;
  sentiment?: number;
  summary?: string;
}

export interface Document {
  id: number;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  status: string;
  page_count: number;
  word_count: number;
  created_at: string;
  metadata?: DocumentMetadata;
}

export interface Citation {
  document_name: string;
  document_id: number;
  page_number: number;
  similarity_score: number;
  confidence: number;
  chunk_id: number;
  excerpt?: string;
}

export interface Message {
  id: number;
  chat_id: number;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  confidence?: number;
  created_at: string;
}

export interface Chat {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  messages?: Message[];
}

export interface AnalyticsData {
  overview: {
    total_documents: number;
    total_chunks: number;
    total_chats: number;
    total_messages: number;
    avg_sentiment: number;
    total_pages: number;
    total_words: number;
  };
  top_keywords: { keyword: string; count: number }[];
  top_entities: { entity: string; count: number }[];
  entity_types: { type: string; count: number }[];
  topic_distribution: { topic: string; count: number }[];
  document_status: Record<string, number>;
  documents: {
    id: number;
    name: string;
    status: string;
    pages: number;
    words: number;
    classification?: string;
    sentiment?: number;
  }[];
}

export interface KGNode {
  id: string;
  label: string;
  type: string;
  document_id?: number;
  properties?: Record<string, unknown>;
}

export interface KGEdge {
  source: string;
  target: string;
  relationship: string;
  weight: number;
}

export interface KnowledgeGraph {
  nodes: KGNode[];
  edges: KGEdge[];
  stats: {
    total_nodes: number;
    total_edges: number;
    node_types: Record<string, number>;
  };
}

export interface SearchResult {
  chunk_id: number;
  content: string;
  page_number: number;
  document_id: number;
  document_name: string;
  similarity_score: number;
  rerank_score?: number;
}
