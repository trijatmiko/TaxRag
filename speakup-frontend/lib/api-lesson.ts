// lib/api-lesson.ts
const BASE = process.env.NEXT_PUBLIC_N8N_BASE_URL ?? 'http://localhost:5678/webhook';
const VOCAB_SYNC_URL   = `${BASE}/vocab/sync-dashboard`;
const VOCAB_PULL_URL   = `${BASE}/vocab/pull-dashboard`;
const PROFILE_URL      = `${BASE}/user/profile`;

// ── User Profile ──────────────────────────────────────────────────────────────
export async function fetchUserProfile(userId: string) {
  const res = await fetch(PROFILE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  });
  const rawText = await res.text();
  let data: any = null;
  try { data = rawText ? JSON.parse(rawText) : null; } catch (_) {}
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  if (data && data.success === false) throw new Error(data.error || 'Profile load failed');
  return data;
}

// ── Session ───────────────────────────────────────────────────────────────────
export async function startSession(payload: {
  user_id: string;
  user_name: string;
  topic: string;
  level: string;
  target_vocabulary?: string;
}) {
  const res = await fetch(`${BASE}/session/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const rawText = await res.text();
  let data: any;
  try { data = JSON.parse(rawText); } catch (_) { throw new Error('Invalid JSON response'); }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${rawText.slice(0, 200)}`);
  if (!data.success) throw new Error(data.error || 'Session failed');
  return data;
}

// ── Audio: Presigned Upload ───────────────────────────────────────────────────
export async function presignAudioUpload(payload: {
  session_id: string;
  user_id: string;
  content_type: string;
}) {
  const res = await fetch(`${BASE}/upload/presign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Presign failed: ${res.status}`);
  return res.json() as Promise<{ presigned_url: string; object_key: string }>;
}

export async function uploadAudioToMinIO(presignedUrl: string, blob: Blob) {
  const res = await fetch(presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': blob.type || 'audio/webm' },
    body: blob,
  });
  if (!res.ok) throw new Error(`MinIO upload failed: ${res.status}`);
}

// ── Conversation ──────────────────────────────────────────────────────────────
export async function sendConversation(payload: {
  session_id: string;
  user_id: string;
  user_name: string;
  object_key: string;
  topic: string;
  level: string;
  target_vocabulary?: string;
}) {
  const res = await fetch(`${BASE}/conversation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const rawText = await res.text();
  let data: any;
  try { data = JSON.parse(rawText); } catch (_) { throw new Error(rawText); }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${rawText.slice(0, 200)}`);
  if (!data.success) throw new Error(data.error || 'Unknown error');
  return data;
}

// ── Analysis ──────────────────────────────────────────────────────────────────
export async function getSessionAnalysis(sessionId: string, userId: string) {
  const res = await fetch(`${BASE}/session/analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, user_id: userId }),
  });
  const rawText = await res.text();
  let data: any;
  try { data = JSON.parse(rawText); } catch (_) { data = null; }
  if (res.ok && data && data.success !== false) {
    const a = data.analysis || data;
    return {
      fluency:       a.fluency       ?? a.fluency_score,
      vocabulary:    a.vocabulary    ?? a.vocab_score,
      grammar:       a.grammar       ?? a.grammar_score,
      pronunciation: a.pronunciation ?? a.pronunciation_score,
      overall:       a.overall       ?? a.cefr_level ?? a.level,
    };
  }
  return null;
}

// ── Vocab ─────────────────────────────────────────────────────────────────────
export async function pullVocabFromDashboard(userId: string) {
  const res = await fetch(VOCAB_PULL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  });
  const rawText = await res.text();
  let data: any = null;
  try { data = rawText ? JSON.parse(rawText) : null; } catch (_) {}
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  if (data && data.success === false) throw new Error(data.error || 'Tidak ada vocab');
  return data as { vocab_list: { word: string; level?: string }[]; vocabulary_raw: string };
}

export async function syncVocabToDashboard(payload: object) {
  const res = await fetch(VOCAB_SYNC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const rawText = await res.text();
  let data: any = null;
  try { data = rawText ? JSON.parse(rawText) : null; } catch (_) {}
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  if (data && data.success === false) throw new Error(data.error || 'Sync failed');
  return data;
}
