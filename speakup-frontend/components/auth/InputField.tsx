// components/auth/InputField.tsx
"use client";
import { useState, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    icon: string;   // Material Symbol name, e.g. "mail"
    error?: string;
    isPassword?: boolean;
    rightSlot?: React.ReactNode;
}

export function InputField({ label, icon, error, isPassword, rightSlot, ...props }: InputFieldProps) {
    const [showPw, setShowPw] = useState(false);

    const inputType = isPassword ? (showPw ? "text" : "password") : props.type;

    return (
        <div className="flex flex-col gap-1.5">
            <div className="text-[11px] font-semibold tracking-[1px] uppercase text-muted">
                {label}
            </div>
            <div className="relative">
                <input
                    {...props}
                    type={inputType}
                    className={cn(
                        "w-full bg-surface2 border border-border rounded-input",
                        "text-text font-dm text-sm pl-[42px] pr-[42px] py-[11px]",
                        "outline-none appearance-none transition-all duration-200",
                        "focus:border-accent focus:shadow-focus-ring",
                        "placeholder:text-muted/60",
                        error && "border-red/60",
                    )}
                />
                {/* Leading icon */}
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-muted pointer-events-none transition-colors duration-200 peer-focus:text-accent">
                    {icon}
                </span>
                {/* Password toggle */}
                {isPassword && (
                    <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors p-1 flex items-center"
                    >
                        <span className="material-symbols-outlined text-[18px]">
                            {showPw ? "visibility_off" : "visibility"}
                        </span>
                    </button>
                )}
                {rightSlot}
            </div>
            {error && (
                <div className="flex items-center gap-1 text-[12px] text-red animate-fade-up">
                    <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}>
                        error
                    </span>
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}