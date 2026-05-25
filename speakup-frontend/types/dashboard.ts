// types/dashboard.ts

export type CefrStatus = "completed" | "current" | "locked";

export interface CefrStep {
  level:    string;          // "A1", "A2", dst.
  name:     string;          // "Beginner", dst.
  status:   CefrStatus;
  date?:    string;          // Tanggal completed
  progress?: number;         // 0-100, hanya untuk "current"
  xp?:      string;          // Label XP, hanya untuk "current"
}

export interface VocabItem {
  word:         string;
  definition:   string;
  type:         string;      // "VERB", "NOUN", dst.
  vocab_level?: string;      // "B1", dst.
  status?:      string;      // "Mastered", "Learning", dst.
  mastered:     boolean;
}

export interface DashboardStats {
  totalMessages:   number;
  totalCorrections: number;
  wordsMastered:   number;
}

export interface DashboardUser {
  name:        string;
  description: string;
  level:       string;       // "A1" – "C2"
  avatar_url?: string;
}

export interface DashboardData {
  user:   DashboardUser;
  stats:  DashboardStats;
  cefr:   CefrStep[];
  vocabs: VocabItem[];
}

export interface VocabStats {
  total:    number;
  mastered: number;
  learning: number;
}

export interface VocabListResponse {
  stats?: {
    total_words?:    number;
    total_mastered?: number;
    total_learning?: number;
  };
  vocabs?: VocabItem[];
}
