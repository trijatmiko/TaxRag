// components/dashboard/cefr/CefrStep.tsx
import { CefrStep as CefrStepType } from "@/types/dashboard";
import { cn } from "@/lib/utils";

interface CefrStepProps {
  step:   CefrStepType;
  isLast: boolean;
}

export function CefrStep({ step, isLast }: CefrStepProps) {
  const { level, name, status, date, progress, xp } = step;

  const icon = (() => {
    if (status === "completed") {
      return (
        <div className="w-8 h-8 rounded-full bg-tertiary flex items-center justify-center text-on-tertiary flex-shrink-0">
          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
            check
          </span>
        </div>
      );
    }
    if (status === "current") {
      return (
        <div className="w-8 h-8 rounded-full border-2 border-primary flex items-center justify-center text-primary glow-blue flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        </div>
      );
    }
    // locked
    return (
      <div className="w-8 h-8 rounded-full border-2 border-border-subtle flex items-center justify-center text-text-muted flex-shrink-0">
        <span className="material-symbols-outlined text-sm">lock</span>
      </div>
    );
  })();

  const content = (() => {
    if (status === "completed") {
      return (
        <>
          <p className="font-button-text text-on-surface">{level} · {name}</p>
          <p className="font-helper-text text-helper-text text-text-muted">{date || "Completed"}</p>
        </>
      );
    }
    if (status === "current") {
      return (
        <>
          <p className="font-button-text text-primary">{level} · {name}</p>
          <div className="w-full bg-surface-container-low h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-700"
              style={{ width: `${progress || 0}%` }}
            />
          </div>
          <p className="font-helper-text text-helper-text text-text-muted mt-1">{xp || ""}</p>
        </>
      );
    }
    return (
      <>
        <p className="font-button-text text-text-muted">{level} · {name}</p>
        <p className="font-helper-text text-helper-text text-text-muted">Locked</p>
      </>
    );
  })();

  return (
    <div className="flex items-start gap-4">
      <div className="flex flex-col items-center">
        {icon}
        {!isLast && <div className="w-0.5 h-8 bg-tertiary/20 mt-1" />}
      </div>
      <div className="flex-1 pb-1">{content}</div>
    </div>
  );
}
