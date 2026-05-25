// lib/api/dashboard.ts
import { DashboardData } from "@/types/dashboard";

const DASHBOARD_URL =
  process.env.NEXT_PUBLIC_N8N_BASE_URL
    ? `${process.env.NEXT_PUBLIC_N8N_BASE_URL}/dashboard/profile`
    : "http://localhost:5678/webhook/dashboard/profile";

export async function fetchDashboardProfile(
  userId: string,
  signal?: AbortSignal
): Promise<DashboardData> {
  const res = await fetch(DASHBOARD_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ user_id: userId }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.substring(0, 100)}`);
  }

  const data = await res.json();
  // n8n kadang membungkus response dalam array
  return Array.isArray(data) ? data[0] : data;
}
