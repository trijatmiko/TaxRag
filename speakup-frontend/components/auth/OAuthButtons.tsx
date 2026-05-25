// components/auth/OAuthButtons.tsx
"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface OAuthButtonsProps {
    activeTab: "signin" | "signup";
    onGoogleSuccess: (accessToken: string) => Promise<void>;
    onError: (msg: string) => void;
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export function OAuthButtons({ activeTab, onGoogleSuccess, onError }: OAuthButtonsProps) {
    const [loading, setLoading] = useState(false);
    const label = activeTab === "signup" ? "Sign up with Google" : "Continue with Google";

    const handleGoogle = () => {
        if (!GOOGLE_CLIENT_ID) {
            onError("Google OAuth belum dikonfigurasi.");
            return;
        }
        if (typeof window === "undefined" || !(window as any).google) {
            onError("Google Sign-In tidak tersedia. Pastikan koneksi internet aktif.");
            return;
        }

        const client = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: "openid email profile",
            callback: async (tokenResponse: any) => {
                if (tokenResponse.error) {
                    onError("Google login gagal: " + tokenResponse.error);
                    return;
                }
                setLoading(true);
                try {
                    await onGoogleSuccess(tokenResponse.access_token);
                } catch (err: any) {
                    onError(err.message || "Google login gagal");
                } finally {
                    setLoading(false);
                }
            },
        });
        client.requestAccessToken();
    };

    return (
        <div className="flex flex-col gap-2.5">
            <button
                onClick={handleGoogle}
                disabled={loading}
                className={cn(
                    "flex items-center gap-3 w-full px-[18px] py-[13px] rounded-btn",
                    "border border-border bg-surface2 text-text font-dm text-sm font-medium",
                    "cursor-pointer transition-all duration-200 relative overflow-hidden",
                    "hover:border-muted hover:bg-[#20253a] hover:-translate-y-px",
                    "active:translate-y-0",
                    "disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0",
                )}
            >
                {loading ? (
                    <div className="w-5 h-5 border-2 border-text/20 border-t-text rounded-full animate-spin-fast mx-auto" />
                ) : (
                    <>
                        <GoogleIcon />
                        <span className="flex-1 text-center">{label}</span>
                    </>
                )}
            </button>
        </div>
    );
}

function GoogleIcon() {
    return (
        <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
    );
}