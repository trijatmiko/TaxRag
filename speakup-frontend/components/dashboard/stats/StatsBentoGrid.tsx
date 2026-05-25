// components/dashboard/stats/StatsBentoGrid.tsx
import { StatCard }  from "./StatCard";
import { LevelCard } from "./LevelCard";
import { DashboardData } from "@/types/dashboard";
import { VocabStats }    from "@/types/dashboard";

interface StatsBentoGridProps {
  data:       DashboardData | null;
  vocabStats: VocabStats | null;
  loading:    boolean;
}

const fmt = (n?: number) => (typeof n === "number" ? n.toLocaleString() : "—");

const LEVEL_LABELS: Record<string, string> = {
  A1: "Beginner", A2: "Elementary", B1: "Intermediate",
  B2: "Upper Intermediate", C1: "Advanced", C2: "Mastery",
};

export function StatsBentoGrid({ data, vocabStats, loading }: StatsBentoGridProps) {
  const stats  = data?.stats;
  const user   = data?.user;
  const pct    = vocabStats && vocabStats.total > 0
    ? Math.round((vocabStats.mastered / vocabStats.total) * 100)
    : 0;

  const totalWordsSub = vocabStats
    ? `${vocabStats.mastered} mastered · ${pct}%`
    : "In your collection";

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
      {/* Total Words */}
      <StatCard
        label="TOTAL WORDS"
        value={vocabStats ? fmt(vocabStats.total) : "—"}
        icon="library_books"
        iconFill
        borderTop
        subText={
          <span className="flex items-center gap-1 text-secondary">
            <span className="material-symbols-outlined text-[14px]">auto_stories</span>
            <span>{totalWordsSub}</span>
          </span>
        }
      />

      {/* Total Messages */}
      <StatCard
        label="TOTAL MESSAGES"
        value={stats ? fmt(stats.totalMessages) : "—"}
        icon="chat"
        subText={
          <span className="flex items-center gap-1 text-tertiary">
            <span className="material-symbols-outlined text-[14px]">trending_up</span>
            12% from last month
          </span>
        }
      />

      {/* Corrections */}
      <StatCard
        label="CORRECTIONS"
        value={stats ? fmt(stats.totalCorrections) : "—"}
        icon="auto_fix_high"
        valueColor="text-secondary"
        subText={<span>Refining accuracy</span>}
      />

      {/* Words Mastered */}
      <StatCard
        label="WORDS MASTERED"
        value={stats ? fmt(stats.wordsMastered) : "—"}
        icon="menu_book"
        valueColor="text-tertiary"
        subText={<span className="text-on-surface-variant">92% retention rate</span>}
      />

      {/* Level Card */}
      <LevelCard
        level={user?.level || "—"}
        description={LEVEL_LABELS[user?.level || ""] || user?.description || "Loading..."}
      />
    </div>
  );
}
