// components/dashboard/cefr/CefrPathway.tsx
import { GlassCard }  from "@/components/dashboard/ui/GlassCard";
import { CefrStep }   from "./CefrStep";
import { CefrStep as CefrStepType } from "@/types/dashboard";

interface CefrPathwayProps {
  steps:   CefrStepType[];
  loading: boolean;
}

export function CefrPathway({ steps, loading }: CefrPathwayProps) {
  return (
    <GlassCard className="p-component-padding">
      <h3 className="font-headline-modal text-headline-modal text-on-surface mb-6">
        CEFR Pathway
      </h3>
      <div className="space-y-4">
        {loading && (
          <p className="font-helper-text text-text-muted text-sm animate-pulse">
            Loading pathway...
          </p>
        )}
        {!loading && steps.length === 0 && (
          <p className="font-helper-text text-text-muted text-sm">No pathway data.</p>
        )}
        {steps.map((step, idx) => (
          <CefrStep key={step.level} step={step} isLast={idx === steps.length - 1} />
        ))}
      </div>
    </GlassCard>
  );
}
