// hooks/useSession.ts
import { SessionData } from "@/types/auth";

const KEYS = {
    TOKEN: "speakup_token",
    USER_ID: "speakup_user_id",
    NAME: "speakup_name",
    LEVEL: "speakup_level",
} as const;

export function useSession() {
    const saveSession = (data: SessionData) => {
        if (typeof window === "undefined") return;
        sessionStorage.setItem(KEYS.TOKEN, data.token || "");
        sessionStorage.setItem(KEYS.USER_ID, data.userId || "");
        sessionStorage.setItem(KEYS.NAME, data.name || "");
        sessionStorage.setItem(KEYS.LEVEL, data.level || "A1");
    };

    const getSession = (): SessionData | null => {
        if (typeof window === "undefined") return null;
        const userId = sessionStorage.getItem(KEYS.USER_ID);
        if (!userId) return null;
        return {
            token: sessionStorage.getItem(KEYS.TOKEN) || "",
            userId,
            name: sessionStorage.getItem(KEYS.NAME) || "",
            level: sessionStorage.getItem(KEYS.LEVEL) || "A1",
        };
    };

    const clearSession = () => {
        if (typeof window === "undefined") return;
        Object.values(KEYS).forEach(k => sessionStorage.removeItem(k));
    };

    return { saveSession, getSession, clearSession };
}

export function getCurrentUserId(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(KEYS.USER_ID) || "";
}