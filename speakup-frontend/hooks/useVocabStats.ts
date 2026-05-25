// hooks/useVocabStats.ts
"use client";
import { useState, useEffect } from "react";
import { VocabStats } from "@/types/dashboard";
import { fetchVocabList } from "@/lib/api/vocab";

export function useVocabStats(userId: string) {
  const [stats,   setStats]   = useState<VocabStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetchVocabList(userId)
      .then(data => {
        const s = data.stats || {};
        const vocabs = Array.isArray(data.vocabs) ? data.vocabs : [];
        const total    = s.total_words    ?? vocabs.length;
        const mastered = s.total_mastered ?? 0;
        const learning = s.total_learning ?? 0;
        setStats({ total, mastered, learning });
      })
      .catch(err => {
        console.warn("[profile] fetchVocabStats error:", err);
        setStats(null);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  return { stats, loading };
}
