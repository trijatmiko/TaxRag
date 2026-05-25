// components/lesson/layout/Sidebar.tsx
'use client';
import TopicSelect from '@/components/lesson/controls/TopicSelect';
import LevelPills from '@/components/lesson/controls/LevelPills';
import VocabInput from '@/components/lesson/vocab/VocabInput';
import { PulledVocabItem } from '@/hooks/useVocabLesson';
import { Level } from '@/hooks/useLessonSession';

interface SidebarProps {
  topic: string;
  setTopic: (t: string) => void;
  level: Level;
  setLevel: (l: Level) => void;
  sessionId: string | null;
  isLoading: boolean;
  // Vocab
  vocabInput: string;
  onVocabInputChange: (v: string) => void;
  pulledItems: PulledVocabItem[];
  showPullPreview: boolean;
  isPulling: boolean;
  onPullDashboard: () => void;
  onApplyPulled: () => void;
  onDiscardPulled: () => void;
  onRemoveChip: (idx: number) => void;
  // Stats
  correctionCount: number;
  messageCount: number;
  achievedCount: number;
  totalVocab: number;
  onShowCorrections: () => void;
  onShowAnalysis: () => void;
  onShowVocabDrawer: () => void;
  // Session
  onStart: () => void;
}

export default function Sidebar({
  topic, setTopic, level, setLevel,
  sessionId, isLoading,
  vocabInput, onVocabInputChange,
  pulledItems, showPullPreview, isPulling,
  onPullDashboard, onApplyPulled, onDiscardPulled, onRemoveChip,
  correctionCount, messageCount, achievedCount, totalVocab,
  onShowCorrections, onShowAnalysis, onShowVocabDrawer,
  onStart,
}: SidebarProps) {
  const isVocab = topic === 'Vocab';
  const showVocabBox = isVocab && !sessionId;

  return (
    <aside style={{
      width: '340px', flexShrink: 0,
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      padding: '24px 18px', gap: '16px',
      overflowY: 'auto', overflowX: 'hidden',
      position: 'relative', zIndex: 10,
    }}>
      {/* Logo */}
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', letterSpacing: '-0.5px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexShrink: 0 }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 12px var(--accent)' }} />
        SpeakUp
      </div>

      {/* User greeting placeholder */}
      <div style={{ marginBottom: '2px', flexShrink: 0 }}>
        <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '20px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '-0.3px', lineHeight: 1.3 }}>
          Hi, …
        </p>
      </div>

      {/* Topic */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted)' }}>Topic</label>
        <TopicSelect value={topic} onChange={(v) => { setTopic(v); }} disabled={!!sessionId} />
      </div>

      {/* Vocab Input (visible only when Vocab topic and no active session) */}
      {showVocabBox && (
        <VocabInput
          value={vocabInput}
          onChange={onVocabInputChange}
          pulledItems={pulledItems}
          showPullPreview={showPullPreview}
          isPulling={isPulling}
          onPullDashboard={onPullDashboard}
          onApplyPulled={onApplyPulled}
          onDiscardPulled={onDiscardPulled}
          onRemoveChip={onRemoveChip}
        />
      )}

      {/* Level */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted)' }}>Level</label>
        <LevelPills value={level} onChange={setLevel} />
      </div>

      {/* Start button */}
      <button
        onClick={onStart}
        disabled={isLoading}
        style={{
          width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
          background: isLoading ? 'var(--surface2)' : 'var(--accent)',
          color: isLoading ? 'var(--muted)' : '#fff',
          fontFamily: "'Syne', sans-serif", fontSize: '15px', fontWeight: 700,
          cursor: isLoading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s', letterSpacing: '0.3px',
          position: 'relative', marginTop: '4px', flexShrink: 0,
          animation: !sessionId && !isLoading ? 'pulse-start-btn 2s infinite ease-in-out' : 'none',
        }}
      >
        {isLoading ? 'Starting…' : sessionId ? 'New Session' : 'Start Session'}
      </button>

      {/* Stats */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0, paddingTop: '10px' }}>
        {/* Corrections */}
        <div
          onClick={onShowCorrections}
          title="View Correction History"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface2)', borderRadius: '10px', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.background = 'rgba(79,140,255,0.05)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'; }}
        >
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Corrections</span>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '15px', color: 'var(--yellow)' }}>{correctionCount}</span>
        </div>

        {/* Analysis */}
        <div
          onClick={onShowAnalysis}
          title="View Performance Analysis"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface2)', borderRadius: '10px', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.background = 'rgba(79,140,255,0.05)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'; }}
        >
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Analysis</span>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '15px', color: 'var(--accent2)' }}>Detail</span>
        </div>

        {/* Vocab Mission (only shown for Vocab topic) */}
        {isVocab && (
          <div
            onClick={onShowVocabDrawer}
            title="View Vocab Mission Tracker"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface2)', borderRadius: '10px', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.background = 'rgba(79,140,255,0.05)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'; }}
          >
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>⚡ Vocab Mission</span>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '15px', color: 'var(--green)' }}>{achievedCount}/{totalVocab}</span>
          </div>
        )}

        {/* Messages */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface2)', borderRadius: '10px', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Messages</span>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '15px', color: 'var(--text)' }}>{messageCount}</span>
        </div>
      </div>
    </aside>
  );
}
