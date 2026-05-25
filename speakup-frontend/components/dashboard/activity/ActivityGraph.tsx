// components/dashboard/activity/ActivityGraph.tsx
import { GlassCard } from "@/components/dashboard/ui/GlassCard";
import { cn }        from "@/lib/utils";

// Data statis sesuai HTML asli — nanti bisa dijadikan props dari API
const BARS = [
  { day: "MON", height: "40%",  label: "45m",  active: false },
  { day: "TUE", height: "65%",  label: "72m",  active: false },
  { day: "WED", height: "55%",  label: "",      active: false },
  { day: "THU", height: "90%",  label: "110m", active: true  },
  { day: "FRI", height: "45%",  label: "",      active: false },
  { day: "SAT", height: "60%",  label: "",      active: false },
  { day: "SUN", height: "30%",  label: "",      active: false },
];

export function ActivityGraph() {
  return (
    <GlassCard className="p-component-padding lg:col-span-2">
      <div className="flex items-center justify-between mb-8">
        <h3 className="font-headline-modal text-headline-modal text-on-surface">
          Learning Activity
        </h3>
        <div className="flex gap-4">
          <span className="flex items-center gap-2 font-helper-text text-helper-text text-text-muted">
            <span className="w-2 h-2 rounded-full bg-primary" /> Practice
          </span>
          <span className="flex items-center gap-2 font-helper-text text-helper-text text-text-muted">
            <span className="w-2 h-2 rounded-full bg-tertiary" /> Target
          </span>
        </div>
      </div>

      {/* Bar chart */}
      <div className="flex items-end justify-between gap-4 px-2 h-32">
        {BARS.map(bar => (
          <div
            key={bar.day}
            style={{ height: bar.height }}
            className={cn(
              "flex-1 rounded-t-lg relative group transition-colors",
              bar.active
                ? "bg-primary shadow-[0_0_15px_rgba(175,198,255,0.3)]"
                : "bg-surface-container hover:bg-primary/20"
            )}
          >
            {bar.label && (
              <div className={cn(
                "absolute bottom-full left-1/2 -translate-x-1/2 mb-2",
                "bg-primary text-on-primary text-[10px] px-2 py-1 rounded",
                bar.active ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity"
              )}>
                {bar.label}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Day labels */}
      <div className="flex justify-between mt-4 text-text-muted font-section-label text-section-label px-2">
        {BARS.map(b => <span key={b.day}>{b.day}</span>)}
      </div>
    </GlassCard>
  );
}
