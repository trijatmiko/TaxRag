// components/dashboard/vocab/VocabCard.tsx
import { VocabItem } from "@/types/dashboard";
import { cn }        from "@/lib/utils";

interface VocabCardProps {
  vocab: VocabItem;
}

export function VocabCard({ vocab }: VocabCardProps) {
  const { word, definition, type, vocab_level, status, mastered } = vocab;

  return (
    <div className={cn(
      "vocab-word glass-card p-4 rounded-xl transition-all duration-300 group",
      !mastered && "ring-1 ring-primary/20"
    )}>
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <span className="font-stat-value text-lg text-on-surface">{word || "—"}</span>
          <p className="font-helper-text text-text-muted text-xs mt-1 leading-snug line-clamp-2">
            {definition || ""}
          </p>
        </div>
        <div className="flex-shrink-0">
          {mastered ? (
            <span
              className="material-symbols-outlined text-tertiary text-lg"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified
            </span>
          ) : (
            <button className="px-3 py-1 bg-primary text-on-primary font-button-text text-[10px] rounded hover:opacity-80 transition-opacity">
              Practice
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1">
          <span className="font-section-label text-[9px] bg-secondary-container/30 text-on-secondary-container px-2 py-0.5 rounded-full">
            {(type || "WORD").toUpperCase()}
          </span>
          {vocab_level && (
            <span className="font-section-label text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-1">
              {vocab_level.toUpperCase()}
            </span>
          )}
        </div>
        <span className={cn(
          "font-helper-text text-[11px]",
          mastered ? "text-tertiary" : "text-status-warning"
        )}>
          {status || ""}
        </span>
      </div>
    </div>
  );
}
