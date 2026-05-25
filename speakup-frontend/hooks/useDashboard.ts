// hooks/useDashboard.ts
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { DashboardData } from "@/types/dashboard";
import { fetchDashboardProfile } from "@/lib/api/dashboard";

const MAX_RETRY = 3;
const RETRY_DELAYS = [800, 2500, 2500]; // ms per attempt
const TIMEOUT_MS  = 12000;

interface UseDashboardReturn {
  data:       DashboardData | null;
  loading:    boolean;
  error:      string | null;
  refetch:    () => void;
}

export function useDashboard(userId: string): UseDashboardReturn {
  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const attemptRef = useRef(0);
  const timerRef   = useRef<ReturnType<typeof setTimeout>>(null);

  const doFetch = useCallback(async () => {
    if (!userId) return;

    attemptRef.current += 1;
    const attempt = attemptRef.current;
    console.log(`[profile] fetch attempt ${attempt}/${MAX_RETRY}`);

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

    try {
      const result = await fetchDashboardProfile(userId, ctrl.signal);
      clearTimeout(timeout);
      setData(result);
      setError(null);
      setLoading(false);
      attemptRef.current = 0;
    } catch (err: any) {
      clearTimeout(timeout);
      console.warn(`[profile] attempt ${attempt} error:`, err.message);

      if (attempt < MAX_RETRY) {
        const delay = RETRY_DELAYS[attempt - 1] ?? 2500;
        console.log(`[profile] retrying in ${delay}ms...`);
        timerRef.current = setTimeout(doFetch, delay);
      } else {
        console.error("[profile] all retries failed");
        setError("Tidak dapat terhubung ke server. Periksa koneksi n8n.");
        setLoading(false);
      }
    }
  }, [userId]);

  const refetch = useCallback(() => {
    attemptRef.current = 0;
    setLoading(true);
    setError(null);
    setData(null);
    doFetch();
  }, [doFetch]);

  useEffect(() => {
    if (!userId) return;
    attemptRef.current = 0;
    doFetch();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [userId, doFetch]);

  return { data, loading, error, refetch };
}
