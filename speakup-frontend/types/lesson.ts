// types/lesson.ts

export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type Topic = 'Free Talk' | 'Vocab' | 'Grammar' | 'Pronunciation' | 'Business' | 'Travel';
export type RecorderState = 'idle' | 'recording' | 'processing';

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai' | 'system';
  content: string;
  hasError?: boolean;
  timestamp: Date;
}

export interface VocabWord {
  word: string;
  achieved: boolean;
  sentence: string;
}

export interface UserProfile {
  id: string;
  name: string;
  avatarUrl?: string;
}
