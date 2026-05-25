// components/auth/SignUpForm.tsx
"use client";
import { useState } from "react";
import { InputField } from "./InputField";
import { cn } from "@/lib/utils";
import { PrimaryButton } from "./PrimaryButton";

interface SignUpFormProps {
    onSubmit: (firstName: string, lastName: string, email: string, password: string) => Promise<void>;
    onSwitchSignin: () => void;
}

export function SignUpForm({ onSubmit, onSwitchSignin }: SignUpFormProps) {
    const [fields, setFields] = useState({ firstName: "", lastName: "", email: "", password: "" });
    const [errors, setErrors] = useState<Partial<typeof fields>>({});
    const [loading, setLoading] = useState(false);

    const set = (key: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setFields(v => ({ ...v, [key]: e.target.value }));
        setErrors(v => ({ ...v, [key]: undefined }));
    };

    const validate = () => {
        const e: typeof errors = {};
        if (!fields.firstName) e.firstName = "First name is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) e.email = "Enter a valid email address";
        if (fields.password.length < 8) e.password = "Password must be at least 8 characters";
        return e;
    };

    const handleSubmit = async () => {
        const e = validate();
        if (Object.keys(e).length) { setErrors(e); return; }
        setLoading(true);
        try {
            await onSubmit(fields.firstName, fields.lastName, fields.email, fields.password);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-4 animate-fade-up">
            {/* Name row — 2 col on desktop, 1 col on mobile */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 max-sm:grid-cols-1">
                <InputField label="First Name" icon="person" type="text"
                    placeholder="John" autoComplete="given-name"
                    value={fields.firstName} onChange={set("firstName")} error={errors.firstName} />
                <InputField label="Last Name" icon="person" type="text"
                    placeholder="Doe" autoComplete="family-name"
                    value={fields.lastName} onChange={set("lastName")} />
            </div>

            <InputField label="Email" icon="mail" type="email"
                placeholder="you@example.com" autoComplete="email"
                value={fields.email} onChange={set("email")} error={errors.email} />

            <InputField label="Password" icon="lock" isPassword
                placeholder="Min. 8 characters" autoComplete="new-password"
                value={fields.password} onChange={set("password")} error={errors.password} />

            <PrimaryButton loading={loading} onClick={handleSubmit}>
                Create Account
            </PrimaryButton>

            <p className="text-[12px] text-muted text-center leading-relaxed">
                By signing up you agree to our{" "}
                <a href="#" className="text-muted underline hover:text-text transition-colors">Terms of Service</a>
                {" "}and{" "}
                <a href="#" className="text-muted underline hover:text-text transition-colors">Privacy Policy</a>
            </p>
        </div>
    );
}