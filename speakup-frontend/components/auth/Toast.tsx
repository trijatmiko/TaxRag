// components/auth/Toast.tsx
import { ToastState } from "@/types/auth";
import { cn } from "@/lib/utils";

interface ToastProps { toast: ToastState; }

export function Toast({ toast }: ToastProps) {
    const icon = toast.type === "error" ? "✕" : toast.type === "success" ? "✓" : "ℹ";

    return (
        <div
            className={cn(
                "fixed bottom-7 left-1/2 -translate-x-1/2 z-[999]",
                "bg-surface border border-border rounded-btn px-5 py-3",
                "flex items-center gap-2 text-sm text-text whitespace-nowrap max-w-[calc(100vw-40px)]",
                "pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                toast.visible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-5",
                toast.type === "error" && "border-red/40 bg-red/[0.08]",
                toast.type === "success" && "border-green/40 bg-green/[0.08]",
            )}
        >
            <span>{icon}</span>
            <span>{toast.message}</span>
        </div>
    );
}