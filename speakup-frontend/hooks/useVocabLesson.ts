// hooks/useVocabLesson.ts
'use client';
import { useState, useCallback } from 'react';
import { pullVocabFromDashboard, syncVocabToDashboard } from '@/lib/api-lesson';
import { getCurrentUserId } from '@/hooks/useSession';

export interface VocabWord {
  word: string;
  achieved: boolean;
  sentence: string;
}

export interface PulledVocabItem {
  word: string;
  level?: string;
  removed: boolean;
}

export function useVocabLesson(sessionId: string | null, level: string, topic: string) {
  const [vocabInput, setVocabInput]             = useState('');
  const [vocabWords, setVocabWords]             = useState<VocabWord[]>([]);
  const [pulledItems, setPulledItems]           = useState<PulledVocabItem[]>([]);
  const [showPullPreview, setShowPullPreview]   = useState(false);
  const [isPulling, setIsPulling]               = useState(false);
  const [isSyncing, setIsSyncing]               = useState(false);
  const [showVocabDrawer, setShowVocabDrawer]   = useState(false);

  const userId = getCurrentUserId() || '86b04bfc-e6b7-4265-bcc9-3ef949eba7c3';

  // Parse vocab input into words array
  const parseWords = useCallback((input: string): VocabWord[] => {
    if (!input.trim()) return [];
    const words = input.split(',').map(w => w.trim()).filter(w => w.length > 0);
    return words.map(word => {
      const existing = vocabWords.find(v => v.word.toLowerCase() === word.toLowerCase());
      return existing ?? { word, achieved: false, sentence: '' };
    });
  }, [vocabWords]);

  // Called when vocabInput changes
  const onVocabInputChange = useCallback((val: string) => {
    setVocabInput(val);
    const words = val.trim()
      ? val.split(',').map(w => w.trim()).filter(Boolean).map(word => {
          const ex = vocabWords.find(v => v.word.toLowerCase() === word.toLowerCase());
          return ex ?? { word, achieved: false, sentence: '' };
        })
      : [];
    setVocabWords(words);
  }, [vocabWords]);

  // Check if user has spoken a vocab word
  const checkSpoken = useCallback((transcript: string, hasGrammarError: boolean): string | null => {
    if (topic !== 'Vocab' || vocabWords.length === 0 || hasGrammarError) return null;

    let achieved: string | null = null;
    setVocabWords(prev => {
      const next = prev.map(item => {
        if (item.achieved) return item;
        const escaped = item.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex   = new RegExp(`\\b${escaped}\\b`, 'i');
        if (regex.test(transcript)) {
          achieved = item.word;
          return { ...item, achieved: true, sentence: transcript };
        }
        return item;
      });
      return next;
    });
    return achieved;
  }, [topic, vocabWords]);

  // Pull from dashboard
  const pullDashboard = useCallback(async () => {
    setIsPulling(true);
    setShowPullPreview(false);
    setPulledItems([]);
    try {
      const data = await pullVocabFromDashboard(userId);
      if (!data.vocabulary_raw || data.vocab_list.length === 0) {
        throw new Error('Tidak ada vocab unmastered di dashboard');
      }
      const items: PulledVocabItem[] = data.vocab_list.map(v => ({
        word: v.word, level: v.level || '', removed: false,
      }));
      setPulledItems(items);
      setShowPullPreview(true);
      return `${data.vocab_list.length} vocab ditemukan — klik "Gunakan vocab ini" untuk apply ✅`;
    } catch (err: any) {
      throw err;
    } finally {
      setIsPulling(false);
    }
  }, [userId]);

  const applyPulledVocab = useCallback(() => {
    const active = pulledItems.filter(v => !v.removed);
    if (active.length === 0) throw new Error('Tidak ada vocab yang dipilih');
    const raw = active.map(v => v.word).join(', ');
    setVocabInput(raw);
    const words = active.map(v => ({ word: v.word, achieved: false, sentence: '' }));
    setVocabWords(words);
    setShowPullPreview(false);
    setPulledItems([]);
    return active.length;
  }, [pulledItems]);

  const discardPulled = useCallback(() => {
    setShowPullPreview(false);
    setPulledItems([]);
  }, []);

  const removeChip = useCallback((idx: number) => {
    setPulledItems(prev => prev.map((v, i) => i === idx ? { ...v, removed: true } : v));
  }, []);

  // Sync achieved vocab to dashboard
  const syncVocab = useCallback(async () => {
    const words = vocabWords;
    if (words.length === 0) throw new Error('Tambahkan kata vocab di Target Vocabulary terlebih dahulu');

    setIsSyncing(true);
    try {
      const payload = {
        user_id:         userId,
        session_id:      sessionId,
        level,
        topic,
        vocabulary_raw:  vocabInput.trim(),
        vocabulary:      words.map(item => ({ word: item.word, achieved: !!item.achieved, sentence: item.sentence || '' })),
        progress:        { total: words.length, achieved: words.filter(w => w.achieved).length },
        synced_at:       new Date().toISOString(),
      };
      await syncVocabToDashboard(payload);

      // Remove achieved words from the list
      const remaining = words.filter(w => !w.achieved);
      setVocabWords(remaining);
      setVocabInput(remaining.map(w => w.word).join(', '));
      return words.filter(w => w.achieved).length;
    } finally {
      setIsSyncing(false);
    }
  }, [vocabWords, vocabInput, sessionId, level, topic, userId]);

  const achievedCount = vocabWords.filter(w => w.achieved).length;
  const activeChips   = pulledItems.filter(v => !v.removed);

  return {
    vocabInput, vocabWords,
    pulledItems, showPullPreview, isPulling, isSyncing,
    showVocabDrawer, setShowVocabDrawer,
    achievedCount, activeChips,
    onVocabInputChange, checkSpoken,
    pullDashboard, applyPulledVocab, discardPulled, removeChip,
    syncVocab,
  };
}
