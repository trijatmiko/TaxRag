// components/auth/LoginCard.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { AuthTab } from "@/types/auth";
import { TabSwitcher } from "./TabSwitcher";
import { OAuthButtons } from "./OAuthButtons";
import { SignInForm } from "./SignInForm";
import { SignUpForm } from "./SignUpForm";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { SuccessPanel } from "./SuccessPanel";
import { Toast } from "./Toast";
import { useAuth } from "@/hooks/useAuth";

const CARD_TITLES: Record<AuthTab, string> = {
    signin: "Welcome back",
    signup: "Create account",
    forgot: "Reset password",
    success: "Email sent!",
};

const CARD_SUBTITLES: Record<AuthTab, string> = {
    signin: "Sign in to continue your English journey",
    signup: "Start your English learning journey today",
    forgot: "Enter your email and we'll send a reset link",
    success: "",
};

export function LoginCard() {
    const [tab, setTab] = useState<AuthTab>("signin");
    const [prefillEmail, setPrefillEmail] = useState("");
    const [successDesc, setSuccessDesc] = useState("We sent a reset link to your email address.");
    const { handleSignIn, handleSignUp, handleGoogleToken, handleForgotPassword, toast, showToast } = useAuth();

    // Keyboard submit shortcut
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key !== "Enter") return;
            // Forms handle their own submit via onKeyDown or button focus
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [tab]);

    const goForgot = (email: string) => {
        setPrefillEmail(email);
        setTab("forgot");
    };

    const handleForgot = async (email: string) => {
        const desc = await handleForgotPassword(email);
        setSuccessDesc(desc);
        setTab("success");
        return desc;
    };

    const showOAuth = tab === "signin" || tab === "signup";

    return (
        <>
            <div className="relative z-[1] h-screen flex items-center justify-center p-6">
                <div className="card-accent-line bg-surface border border-border rounded-card p-12 w-full max-w-[420px] flex flex-col gap-8 relative overflow-hidden animate-card-in max-sm:px-6 max-sm:py-9">

                    {/* Logo */}
                    <div className="font-syne font-extrabold text-[22px] tracking-[-0.5px] text-text flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-accent shadow-accent-glow" />
                        SpeakUp
                    </div>

                    {/* Header */}
                    <div className="flex flex-col gap-2">
                        <h1 className="font-syne font-bold text-[26px] tracking-[-0.5px] text-text leading-tight">
                            {CARD_TITLES[tab]}
                        </h1>
                        {CARD_SUBTITLES[tab] && (
                            <p className="text-sm text-muted leading-relaxed">{CARD_SUBTITLES[tab]}</p>
                        )}
                    </div>

                    {/* Tab switcher — hidden on forgot/success */}
                    {(tab === "signin" || tab === "signup") && (
                        <TabSwitcher activeTab={tab} onSwitch={setTab} />
                    )}

                    {/* OAuth — hidden on forgot/success */}
                    {showOAuth && (
                        <>
                            <OAuthButtons
                                activeTab={tab as "signin" | "signup"}
                                onGoogleSuccess={handleGoogleToken}
                                onError={msg => showToast(msg, "error")}
                            />
                            <div className="divider-line flex items-center gap-3 text-muted text-[12px] tracking-[0.5px]">
                                or
                            </div>
                        </>
                    )}

                    {/* Form panels */}
                    {tab === "signin" && (
                        <SignInForm
                            onSubmit={async (e, p) => { try { await handleSignIn(e, p); } catch (err: any) { showToast(err.message, "error"); throw err; } }}
                            onForgot={goForgot}
                            onSwitchSignup={() => setTab("signup")}
                        />
                    )}
                    {tab === "signup" && (
                        <SignUpForm
                            onSubmit={async (f, l, e, p) => { try { await handleSignUp(f, l, e, p); } catch (err: any) { showToast(err.message, "error"); throw err; } }}
                            onSwitchSignin={() => setTab("signin")}
                        />
                    )}
                    {tab === "forgot" && (
                        <ForgotPasswordForm
                            prefillEmail={prefillEmail}
                            onSubmit={handleForgot}
                            onSuccess={() => { }}
                            onBack={() => setTab("signin")}
                        />
                    )}
                    {tab === "success" && (
                        <SuccessPanel
                            title="Check your inbox"
                            description={successDesc}
                            onBack={() => setTab("signin")}
                        />
                    )}
                </div>
            </div>

            <Toast toast={toast} />
        </>
    );
}