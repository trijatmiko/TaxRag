// components/dashboard/stats/StatCard.tsx
import { GlassCard } from "@/components/dashboard/ui/GlassCard";
import { cn }        from "@/lib/utils";

interface StatCardProps {
  label:       string;
  value:       string | number;
  icon:        string;
  subText?:    React.ReactNode;
  iconFill?:   boolean;
  borderTop?:  boolean;
  valueColor?: string; // default: text-primary
}

export function StatCard({
  label, value, icon, subText, iconFill, borderTop,
  valueColor = "text-primary",
}: StatCardProps) {
  return (
    <GlassCard
      className={cn(
        "p-component-padding flex flex-col justify-between",
        borderTop && "border-t-2 border-t-primary/50"
      )}
    >
      <div className="flex items-center justify-between text-text-muted mb-4">
        <span className="font-section-label text-section-label">{label}</span>
        <span
          className="material-symbols-outlined text-[18px] text-primary"
          style={iconFill ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          {icon}
        </span>
      </div>
      <div>
        <span className={cn("font-stat-value text-3xl", valueColor)}>
          {value}
        </span>
        {subText && (
          <p className="font-helper-text text-helper-text text-text-muted mt-1 flex items-center gap-1">
            {subText}
          </p>
        )}
      </div>
    </GlassCard>
  );
}
