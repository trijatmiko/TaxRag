// app/dashboard/profile/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar }         from "@/components/dashboard/Sidebar";
import { TopAppBar }       from "@/components/dashboard/TopAppBar";
import { ErrorBanner }     from "@/components/dashboard/ErrorBanner";
import { StatsBentoGrid }  from "@/components/dashboard/stats/StatsBentoGrid";
import { ActivityGraph }   from "@/components/dashboard/activity/ActivityGraph";
import { CefrPathway }     from "@/components/dashboard/cefr/CefrPathway";
import { VocabMission }    from "@/components/dashboard/vocab/VocabMission";
import { useDashboard }    from "@/hooks/useDashboard";
import { useVocabStats }   from "@/hooks/useVocabStats";
import { useGlowEffect }   from "@/hooks/useGlowEffect";
import { getCurrentUserId } from "@/hooks/useSession";

export default function ProfileDashboardPage() {
  const router = useRouter();
  const userId = getCurrentUserId();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Guard: redirect ke login jika tidak ada session
  useEffect(() => {
    if (!userId) router.replace("/login");
  }, [userId, router]);

  const { data, loading, error, refetch }   = useDashboard(userId);
  const { stats: vocabStats, loading: vocabLoading } = useVocabStats(userId);

  // Attach glow effects setiap kali data berubah
  useGlowEffect();

  const handleLogout = () => {
    sessionStorage.clear();
    router.push("/login");
  };

  return (
    <div className="text-on-background font-body-large overflow-hidden dark">
      {/* Sidebar */}
      <Sidebar
        onStartLesson={() => router.push("/dashboard/lesson")}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
      />

      {/* Main wrapper */}
      <div className={`h-screen flex flex-col transition-all duration-300 ${isSidebarOpen ? 'ml-sidebar-width' : 'ml-0'}`}>
        <TopAppBar
          userName={data?.user?.name || (loading ? "Loading..." : "Learner")}
          userLevel={data?.user?.description || "—"}
          avatarUrl={data?.user?.avatar_url || (data?.user as any)?.photo_url || (data?.user as any)?.picture}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
        />

        <ErrorBanner message={error} />

        <main className="flex-1 overflow-y-auto custom-scrollbar p-container-padding">
          <div className="max-w-7xl mx-auto space-y-section-gap">

            {/* Quick Stats */}
            <StatsBentoGrid
              data={data}
              vocabStats={vocabStats}
              loading={loading || vocabLoading}
            />

            {/* Middle: Activity Graph + CEFR Pathway */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <ActivityGraph />
              <CefrPathway
                steps={data?.cefr || []}
                loading={loading}
              />
            </div>

            {/* Vocab Mission */}
            <VocabMission
              vocabs={data?.vocabs || []}
              loading={loading}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
