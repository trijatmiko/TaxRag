// components/lesson/vocab/VocabDrawer.tsx
'use client';
import { VocabWord } from '@/hooks/useVocabLesson';

interface VocabDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  vocabWords: VocabWord[];
  achievedCount: number;
  isSyncing: boolean;
  onSync: () => void;
}

export default function VocabDrawer({ isOpen, onClose, vocabWords, achievedCount, isSyncing, onSync }: VocabDrawerProps) {
  const syncReady = achievedCount > 0;
  const syncLabel = syncReady
    ? `Sync ${achievedCount} Achieved Word${achievedCount > 1 ? 's' : ''}`
    : 'Sync to Dashboard';

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'transparent' }}
        />
      )}

      <div style={{
        position: 'fixed', top: 0, right: 0, width: '340px', height: '100vh',
        background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        boxShadow: '-10px 0 40px rgba(0,0,0,0.6)',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        zIndex: 1000, display: 'flex', flexDirection: 'column', padding: '24px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--accent)' }}>target</span>
            Vocab Mission
          </div>
          <button onClick={onClose} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>
            ×
          </button>
        </div>

        {/* Word list */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
          {vocabWords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)', fontSize: '14px' }}>
              Input target vocabulary first in the left sidebar to track your mission.
            </div>
          ) : vocabWords.map((item, i) => (
            <div key={i} style={{
              background: item.achieved ? 'rgba(52,211,153,0.03)' : 'var(--surface2)',
              border: `1px solid ${item.achieved ? 'rgba(52,211,153,0.3)' : 'var(--border)'}`,
              borderRadius: '12px', padding: '12px 14px',
              display: 'flex', flexDirection: 'column', gap: '6px',
              transition: 'all 0.2s ease',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '15px', color: item.achieved ? 'var(--green)' : 'var(--text)' }}>
                  {item.word}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '2px 8px', borderRadius: '20px', background: item.achieved ? 'rgba(52,211,153,0.15)' : 'var(--border)', color: item.achieved ? 'var(--green)' : 'var(--muted)' }}>
                  {item.achieved ? 'Spoken' : 'Target'}
                </span>
              </div>
              {item.achieved && item.sentence && (
                <div style={{ fontSize: '12px', color: 'var(--text)', fontStyle: 'italic', lineHeight: 1.4, borderLeft: '2px solid var(--green)', paddingLeft: '8px' }}>
                  "{item.sentence}"
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Sync button */}
        <button
          onClick={onSync}
          disabled={isSyncing || !syncReady}
          style={{
            width: '100%', padding: '12px', borderRadius: '10px',
            border: '1px solid var(--green)', background: 'rgba(52,211,153,0.1)',
            color: 'var(--green)', fontFamily: "'DM Sans', sans-serif",
            fontSize: '13px', fontWeight: 700, cursor: syncReady ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            marginTop: 'auto', paddingTop: '12px',
            opacity: syncReady ? 1 : 0,
            transform: syncReady ? 'translateY(0)' : 'translateY(6px)',
            pointerEvents: syncReady ? 'auto' : 'none',
            transition: 'all 0.3s ease',
            boxShadow: '0 0 12px rgba(52,211,153,0.15)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px', ...(isSyncing && { animation: 'spin 1s linear infinite' }) }}>
            {isSyncing ? 'sync' : 'cloud_upload'}
          </span>
          {isSyncing ? 'Syncing…' : syncLabel}
        </button>
      </div>
    </>
  );
}
