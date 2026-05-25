// components/auth/SignInForm.tsx
"use client";
import { useState, FormEvent } from "react";
import { InputField } from "./InputField";
import { cn } from "@/lib/utils";
import { PrimaryButton } from "./PrimaryButton";

interface SignInFormProps {
    onSubmit: (email: string, password: string) => Promise<void>;
    onForgot: (prefillEmail: string) => void;
    onSwitchSignup: () => void;
}

export function SignInForm({ onSubmit, onForgot, onSwitchSignup }: SignInFormProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
    const [loading, setLoading] = useState(false);

    const validate = () => {
        const e: typeof errors = {};
        if (!email) e.email = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email address";
        if (!password) e.password = "Password is required";
        return e;
    };

    const handleSubmit = async () => {
        const e = validate();
        if (Object.keys(e).length) { setErrors(e); return; }
        setLoading(true);
        try {
            await onSubmit(email, password);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-4 animate-fade-up">
            <InputField
                label="Email" icon="mail" type="email"
                placeholder="you@example.com" autoComplete="email"
                value={email} onChange={e => { setEmail(e.target.value); setErrors(v => ({ ...v, email: undefined })); }}
                error={errors.email}
            />

            <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                    <span className="text-[11px] font-semibold tracking-[1px] uppercase text-muted">Password</span>
                    <button
                        type="button"
                        onClick={() => onForgot(email)}
                        className="text-[13px] text-muted hover:text-text transition-colors font-dm bg-none border-none cursor-pointer"
                    >
                        Forgot password?
                    </button>
                </div>
                <InputField
                    label="" icon="lock" isPassword
                    placeholder="Your password" autoComplete="current-password"
                    value={password} onChange={e => { setPassword(e.target.value); setErrors(v => ({ ...v, password: undefined })); }}
                    error={errors.password}
                />
            </div>

            <PrimaryButton loading={loading} onClick={handleSubmit}>
                Sign In
            </PrimaryButton>

            <p className="text-[12px] text-muted text-center">
                Don&apos;t have an account?{" "}
                <button onClick={onSwitchSignup} className="text-accent hover:text-accent/80 hover:underline transition-colors font-dm bg-none border-none cursor-pointer text-[13px]">
                    Create one
                </button>
            </p>
        </div>
    );
}