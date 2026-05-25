// components/dashboard/stats/LevelCard.tsx
import { GlassCard } from "@/components/dashboard/ui/GlassCard";

interface LevelCardProps {
  level:       string;
  description: string;
}

export function LevelCard({ level, description }: LevelCardProps) {
  return (
    <GlassCard className="p-component-padding border-l-4 border-l-primary flex items-center gap-4">
      {/* Circular progress SVG — identik dengan HTML asli */}
      <div className="w-16 h-16 rounded-full border-4 border-primary/20 flex items-center justify-center relative flex-shrink-0">
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx="32" cy="32" r="28"
            fill="transparent"
            stroke="currentColor"
            strokeDasharray="175"
            strokeDashoffset="40"
            strokeWidth="4"
            className="text-primary"
          />
        </svg>
        <span className="font-display-brand text-xl text-primary z-10">{level || "—"}</span>
      </div>
      <div>
        <p className="font-section-label text-section-label text-text-muted">CURRENT LEVEL</p>
        <p className="font-button-text text-on-surface">{description || "Loading..."}</p>
      </div>
    </GlassCard>
  );
}
