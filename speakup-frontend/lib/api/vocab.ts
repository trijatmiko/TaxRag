// lib/api/vocab.ts
import { VocabListResponse } from "@/types/dashboard";

const VOCAB_LIST_URL =
  process.env.NEXT_PUBLIC_N8N_BASE_URL
    ? `${process.env.NEXT_PUBLIC_N8N_BASE_URL}/vocabulary/list`
    : "http://localhost:5678/webhook/vocabulary/list";

export async function fetchVocabList(userId: string): Promise<VocabListResponse> {
  const res = await fetch(VOCAB_LIST_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ user_id: userId }),
  });
  if (!res.ok) throw new Error(`Vocab list fetch failed: HTTP ${res.status}`);
  return res.json();
}
