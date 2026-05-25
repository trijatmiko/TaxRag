// hooks/useLessonSession.ts
'use client';
import { useState, useCallback, useRef } from 'react';
import {
  fetchUserProfile,
  startSession,
  presignAudioUpload,
  uploadAudioToMinIO,
  sendConversation,
  getSessionAnalysis,
} from '@/lib/api-lesson';
import { getCurrentUserId } from '@/hooks/useSession';

export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface Correction {
  has_error: boolean;
  wrong: string;
  right: string;
  reason: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  correction?: Correction | null;
  patternToUse?: string | null;
  timestamp: Date;
}

export interface AnalysisScores {
  fluency: string;
  vocabulary: string;
  grammar: string;
  pronunciation: string;
  overall: string;
}

export interface UserProfile {
  name: string;
  avatarUrl?: string;
}

// ── Audio playback helpers ───────────────────────────────────────────────────
let _audioCtx: AudioContext | null = null;
let _currentAudioSource: AudioBufferSourceNode | null = null;

function getAudioCtx(): AudioContext {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}

function stopCurrentAudio() {
  if (_currentAudioSource) {
    try { _currentAudioSource.stop(); } catch (_) {}
    _currentAudioSource.onended = null;
    _currentAudioSource = null;
  }
}

async function playAudio(audioData: string | ArrayBuffer, onEnd?: () => void): Promise<void> {
  stopCurrentAudio();
  return new Promise(async (resolve) => {
    try {
      let arrayBuffer: ArrayBuffer;

      if (typeof audioData === 'string' && (audioData.startsWith('http') || audioData.startsWith('/'))) {
        arrayBuffer = await new Promise<ArrayBuffer>((res, rej) => {
          const xhr = new XMLHttpRequest();
          xhr.open('GET', audioData, true);
          xhr.responseType = 'arraybuffer';
          xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? res(xhr.response) : rej(new Error(`XHR ${xhr.status}`));
          xhr.onerror = () => rej(new Error('XHR network error'));
          xhr.send();
        });
      } else if (typeof audioData === 'string') {
        const base64 = audioData.replace(/^data:audio\/[^;]+;base64,/, '').replace(/\s/g, '');
        const byteChars = atob(base64);
        const bytes = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
        arrayBuffer = bytes.buffer;
      } else {
        arrayBuffer = audioData;
      }

      const ctx    = getAudioCtx();
      const buffer = await ctx.decodeAudioData(arrayBuffer);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      _currentAudioSource = source;
      source.start(0);
      const durationMs = buffer.duration * 1200;
      source.onended = () => { if (_currentAudioSource === source) _currentAudioSource = null; onEnd?.(); };
      setTimeout(() => resolve(), durationMs + 300);
    } catch (e) {
      console.warn('Audio play error:', e);
      resolve();
    }
  });
}

async function playSoundEffect(url: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const audio = new Audio(url);
      audio.volume = 0.6;
      audio.onended = () => resolve();
      audio.onerror  = () => resolve();
      audio.play().catch(() => resolve());
    } catch (_) { resolve(); }
  });
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useLessonSession() {
  const [userProfile, setUserProfile]         = useState<UserProfile | null>(null);
  const [sessionId, setSessionId]             = useState<string | null>(null);
  const [messages, setMessages]               = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading]             = useState(false);
  const [isSendingAudio, setIsSendingAudio]   = useState(false);
  const [messageCount, setMessageCount]       = useState(0);
  const [correctionCount, setCorrectionCount] = useState(0);
  const [sessionCorrections, setSessionCorrections] = useState<Correction[]>([]);
  const [ttsType, setTtsType]                 = useState<'correction' | 'conversation' | null>(null);
  const [recorderStatus, setRecorderStatus]   = useState('Start a session first');
  const [recorderHint, setRecorderHint]       = useState('Select topic & level, then click Start Session');

  const pendingTokenRef = useRef(0);

  const userId = getCurrentUserId() || '86b04bfc-e6b7-4265-bcc9-3ef949eba7c3';

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage => {
    const full: ChatMessage = { ...msg, id: crypto.randomUUID(), timestamp: new Date() };
    setMessages(prev => [...prev, full]);
    setMessageCount(c => c + 1);
    return full;
  }, []);

  // ── Load user profile ────────────────────────────────────────────────────
  const loadUserProfile = useCallback(async () => {
    try {
      const data = await fetchUserProfile(userId);
      const user = data?.user || data || {};
      const name = user.display_name || user.first_name || user.name || data?.display_name || data?.name;
      if (!name || !String(name).trim()) throw new Error('No name');
      const avatarUrl = user.avatar_url || user.photo_url || user.picture || data?.avatar_url || undefined;
      setUserProfile({ name: String(name).trim(), avatarUrl });
      return { name: String(name).trim(), avatarUrl };
    } catch (_) {
      setUserProfile({ name: 'Learner' });
      return { name: 'Learner' };
    }
  }, [userId]);

  // ── Start session ────────────────────────────────────────────────────────
  const initSession = useCallback(async (topic: string, level: Level, targetVocab: string) => {
    setIsLoading(true);
    const profile = userProfile || await loadUserProfile();
    try {
      const data = await startSession({
        user_id:           userId,
        user_name:         profile.name || 'Friend',
        topic:             topic === 'Vocab' ? `Practice vocabulary: ${targetVocab}` : topic,
        level,
        target_vocabulary: topic === 'Vocab' ? targetVocab : undefined,
      });
      setSessionId(data.session_id);
      setMessages([]);
      setMessageCount(0);
      setCorrectionCount(0);
      setSessionCorrections([]);
      setRecorderStatus('Click to record your answer');
      setRecorderHint('Speak clearly in English');
      return data;
    } finally {
      setIsLoading(false);
    }
  }, [userId, userProfile, loadUserProfile]);

  // ── Send audio through MinIO presign flow ────────────────────────────────
  const sendAudio = useCallback(async (blob: Blob, topic: string, level: Level, vocabInput: string, onCheckVocab?: (text: string, hasError: boolean) => void) => {
    if (!sessionId || isSendingAudio) return;
    setIsSendingAudio(true);
    const myToken = ++pendingTokenRef.current;

    setTtsType(null);
    setRecorderStatus('Preparing upload…');

    try {
      // 1) Presigned URL
      const presign = await presignAudioUpload({ session_id: sessionId, user_id: userId, content_type: blob.type || 'audio/webm' });

      // 2) Upload to MinIO
      setRecorderStatus('Uploading audio…');
      await uploadAudioToMinIO(presign.presigned_url, blob);

      // 3) Process via n8n conversation
      setRecorderStatus('Processing…');
      const data = await sendConversation({
        session_id:        sessionId,
        user_id:           userId,
        user_name:         userProfile?.name || 'Friend',
        object_key:        presign.object_key,
        topic:             topic === 'Vocab' ? `Practice vocabulary: ${vocabInput}` : topic,
        level,
        target_vocabulary: topic === 'Vocab' ? vocabInput : undefined,
      });

      const userText   = (data.user_text || '').trim();
      const correction = (userText && data.correction) ? data.correction as Correction : null;
      const hasError   = !!(correction?.has_error);

      if (userText) {
        addMessage({ role: 'user', content: userText, correction });
        if (hasError) { setCorrectionCount(c => c + 1); setSessionCorrections(prev => [...prev, correction!]); }
      }

      if (userText && onCheckVocab) onCheckVocab(userText, hasError);

      if (myToken === pendingTokenRef.current) {
        // Play sound effect
        await playSoundEffect(hasError ? '/sounds/wrong.mp3' : '/sounds/correct.mp3');
      }

      if (myToken === pendingTokenRef.current && hasError && data.correction_audio_url) {
        setRecorderStatus('🔊 Mendengarkan koreksi…');
        setRecorderHint('Correction sedang dibacakan');
        setTtsType('correction');
        await playAudio(data.correction_audio_url);
        setTtsType(null);
      }

      if (myToken === pendingTokenRef.current) {
        addMessage({ role: 'assistant', content: data.conversation || '', patternToUse: data.pattern_to_use });

        if (data.audio_url || data.audio_base64) {
          setRecorderStatus('🔊 Tutor sedang berbicara…');
          setRecorderHint('Dengarkan pertanyaan berikutnya');
          setTtsType('conversation');
          await playAudio(data.audio_url || data.audio_base64);
          setTtsType(null);
        }
      }

    } catch (err: any) {
      console.error('sendAudio error:', err);
      setTtsType(null);
      throw err;
    } finally {
      setIsSendingAudio(false);
      setRecorderStatus('Click to record your answer');
      setRecorderHint('Speak clearly in English');
    }
  }, [sessionId, isSendingAudio, userId, userProfile, addMessage]);

  // ── Analysis ─────────────────────────────────────────────────────────────
  const loadAnalysis = useCallback(async (level: Level): Promise<AnalysisScores> => {
    if (!sessionId) {
      return { fluency: '--', vocabulary: '--', grammar: '--', pronunciation: '--', overall: 'Start a session first' };
    }
    try {
      const result = await getSessionAnalysis(sessionId, userId);
      if (result) return result as AnalysisScores;
    } catch (_) {}
    // Local estimate
    const userTurns    = Math.max(1, Math.floor(messageCount / 2));
    const errorRate    = correctionCount / userTurns;
    return {
      fluency:       `${Math.min(100, 50 + userTurns * 8)}/100`,
      vocabulary:    level,
      grammar:       `${Math.max(0, Math.round(100 - errorRate * 40))}/100`,
      pronunciation: '—',
      overall:       level,
    };
  }, [sessionId, userId, messageCount, correctionCount]);

  return {
    userProfile, loadUserProfile,
    sessionId, messages,
    isLoading, isSendingAudio,
    messageCount, correctionCount, sessionCorrections,
    ttsType, recorderStatus, recorderHint,
    setRecorderStatus, setRecorderHint,
    initSession, sendAudio, loadAnalysis,
    addMessage,
  };
}
