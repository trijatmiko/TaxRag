// components/auth/ForgotPasswordForm.tsx
"use client";
import { useState } from "react";
import { InputField } from "./InputField";
import { AuthTab } from "@/types/auth";
import { PrimaryButton } from "./PrimaryButton";

interface ForgotPasswordFormProps {
    prefillEmail: string;
    onSubmit: (email: string) => Promise<string>;
    onSuccess: (desc: string) => void;
    onBack: () => void;
}

export function ForgotPasswordForm({ prefillEmail, onSubmit, onSuccess, onBack }: ForgotPasswordFormProps) {
    const [email, setEmail] = useState(prefillEmail);
    const [error, setError] = useState<string>();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError("Enter a valid email address");
            return;
        }
        setLoading(true);
        try {
            const desc = await onSubmit(email);
            onSuccess(desc);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-4 animate-fade-up">
            <InputField label="Email" icon="mail" type="email"
                placeholder="you@example.com" autoComplete="email"
                value={email} onChange={e => { setEmail(e.target.value); setError(undefined); }}
                error={error} />

            <PrimaryButton loading={loading} onClick={handleSubmit}>
                Send Reset Link
            </PrimaryButton>

            <p className="text-[12px] text-center">
                <button onClick={onBack} className="text-accent hover:text-accent/80 hover:underline transition-colors font-dm bg-none border-none cursor-pointer text-[13px]">
                    ← Back to Sign In
                </button>
            </p>
        </div>
    );
}