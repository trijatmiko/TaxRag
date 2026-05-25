// components/auth/PrimaryButton.tsx
import { cn } from "@/lib/utils";

interface PrimaryButtonProps {
    loading: boolean;
    onClick: () => void;
    children: React.ReactNode;
    disabled?: boolean;
}

export function PrimaryButton({ loading, onClick, children, disabled }: PrimaryButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={loading || disabled}
            className={cn(
                "w-full py-3.5 rounded-btn border-none bg-accent text-white",
                "font-syne text-[15px] font-bold cursor-pointer",
                "transition-all duration-200 tracking-[0.3px] relative overflow-hidden",
                "hover:bg-[#3a7aee] hover:-translate-y-px hover:shadow-btn-hover",
                "active:translate-y-0",
                "disabled:bg-surface2 disabled:text-muted disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none",
            )}
        >
            {loading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-fast mx-auto" />
                : children
            }
        </button>
    );
}