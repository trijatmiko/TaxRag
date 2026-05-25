// components/lesson/modals/SessionSummaryModal.tsx
'use client';
import { useRouter } from 'next/navigation';

interface SessionSummaryModalProps {
  summary: any;
  onClose: () => void;
}

export default function SessionSummaryModal({ summary, onClose }: SessionSummaryModalProps) {
  const router = useRouter();

  if (!summary) return null;

  const handleReturnDashboard = () => {
    onClose();
    router.push('/dashboard/profile');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-border w-full max-w-md rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl animate-card-in">
        <div className="w-16 h-16 rounded-full bg-green/10 text-green flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-3xl">verified</span>
        </div>
        
        <h2 className="font-syne font-bold text-2xl text-text mb-2">Session Completed!</h2>
        <p className="text-muted text-sm mb-8">
          Great job! Here is a quick summary of your lesson.
        </p>

        <div className="w-full grid grid-cols-2 gap-4 mb-8">
          <div className="bg-surface2 p-4 rounded-2xl flex flex-col items-center">
            <span className="text-2xl font-syne font-bold text-accent mb-1">{summary.total_turns || 0}</span>
            <span className="text-[11px] font-semibold tracking-[1px] uppercase text-muted">Turns</span>
          </div>
          <div className="bg-surface2 p-4 rounded-2xl flex flex-col items-center">
            <span className="text-2xl font-syne font-bold text-accent mb-1">{summary.grammar_score || '100%'}</span>
            <span className="text-[11px] font-semibold tracking-[1px] uppercase text-muted">Accuracy</span>
          </div>
        </div>

        <button
          onClick={handleReturnDashboard}
          className="w-full bg-accent text-bg py-3.5 rounded-xl font-bold text-sm hover:scale-[1.02] transition-transform shadow-btn-hover"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}
