// hooks/useToast.ts
import { useState, useCallback, useRef } from "react";
import { ToastState } from "@/types/auth";

export function useToast() {
    const [toast, setToast] = useState<ToastState>({
        message: "", type: "info", visible: false,
    });
    const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

    const showToast = useCallback(
        (message: string, type: ToastState["type"] = "info") => {
            if (timerRef.current) clearTimeout(timerRef.current);
            setToast({ message, type, visible: true });
            timerRef.current = setTimeout(
                () => setToast(t => ({ ...t, visible: false })),
                3500
            );
        },
        []
    );

    return { toast, showToast };
}