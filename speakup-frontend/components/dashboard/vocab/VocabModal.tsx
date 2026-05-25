// components/dashboard/vocab/VocabModal.tsx
"use client";
import { useEffect, useRef } from "react";
import { VocabItem } from "@/types/dashboard";
import { VocabCard } from "./VocabCard";

interface VocabModalProps {
  vocabs:   VocabItem[];
  onClose:  () => void;
}

export function VocabModal({ vocabs, onClose }: VocabModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  // Tutup modal saat klik backdrop
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  // Tutup modal saat Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div className="glass-card w-full max-w-4xl max-h-[80vh] rounded-2xl flex flex-col overflow-hidden border border-border-subtle shadow-2xl">
        {/* Modal header */}
        <div className="p-6 border-b border-border-subtle flex items-center justify-between">
          <div>
            <h2 className="font-headline-modal text-headline-modal text-on-surface">
              Your Vocabulary Bank
            </h2>
            <p className="font-helper-text text-text-muted">
              Comprehensive list of words from your learning journey.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Modal body — scrollable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vocabs.map((v, i) => (
            <VocabCard key={`${v.word}-${i}`} vocab={v} />
          ))}
        </div>
      </div>
    </div>
  );
}
