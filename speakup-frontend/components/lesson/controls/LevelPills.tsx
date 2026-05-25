// components/lesson/controls/LevelPills.tsx
import { Level } from '@/types/lesson';

const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export default function LevelPills({
  value, onChange
}: { value: Level; onChange: (v: Level) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {LEVELS.map(lvl => (
        <button
          key={lvl}
          onClick={() => onChange(lvl)}
          className={`
            py-2 rounded-lg text-xs font-semibold transition-all duration-200
            ${value === lvl
              ? 'bg-accent text-bg shadow-accent-glow'
              : 'bg-surface2 border border-border text-muted hover:border-accent/50 hover:text-accent'
            }
          `}
        >
          {lvl}
        </button>
      ))}
    </div>
  );
}
