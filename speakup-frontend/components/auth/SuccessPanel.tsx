// components/auth/SuccessPanel.tsx
interface SuccessPanelProps {
    title: string;
    description: string;
    onBack: () => void;
}

export function SuccessPanel({ title, description, onBack }: SuccessPanelProps) {
    return (
        <div className="flex flex-col items-center gap-4 text-center py-4 animate-fade-up">
            <div className="w-16 h-16 rounded-full bg-green/[0.12] border border-green/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-green text-[32px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}>
                    mark_email_read
                </span>
            </div>
            <div>
                <div className="font-syne font-bold text-[18px] mb-1.5">{title}</div>
                <div className="text-[13px] text-muted leading-relaxed">{description}</div>
            </div>
            <button onClick={onBack} className="text-accent hover:text-accent/80 hover:underline transition-colors font-dm bg-none border-none cursor-pointer text-[13px]">
                ← Back to Sign In
            </button>
        </div>
    );
}