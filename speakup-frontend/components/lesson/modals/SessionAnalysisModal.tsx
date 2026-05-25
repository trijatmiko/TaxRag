// components/lesson/modals/SessionAnalysisModal.tsx
'use client';
import { AnalysisScores } from '@/hooks/useLessonSession';

interface SessionAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: AnalysisScores | null;
  isLoading: boolean;
}

export default function SessionAnalysisModal({ isOpen, onClose, analysis, isLoading }: SessionAnalysisModalProps) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.2s',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: '480px',
        background: 'var(--surface)', borderRadius: '24px',
        border: '1px solid var(--border)', overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        animation: 'zoomIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>📊</span> Session Analysis
          </h2>
          <button
            onClick={onClose}
            style={{
              width: '32px', height: '32px', borderRadius: '50%',
              border: 'none', background: 'var(--surface2)', color: 'var(--text)',
              fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
              <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
              <p>Menganalisis performa Anda…</p>
            </div>
          ) : !analysis ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
              Belum ada analisis. Mulai sesi untuk mendapatkan nilai.
            </div>
          ) : (
            <>
              {/* Overall Score */}
              <div style={{
                textAlign: 'center', padding: '30px 20px',
                background: 'rgba(79,140,255,0.05)', borderRadius: '20px',
                border: '1px solid rgba(79,140,255,0.2)',
              }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                  Overall Level
                </div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '48px', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                  {analysis.overall}
                </div>
              </div>

              {/* Specific Scores */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: 'var(--surface2)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>Fluency</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{analysis.fluency}</div>
                </div>
                <div style={{ background: 'var(--surface2)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>Vocabulary</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{analysis.vocabulary}</div>
                </div>
                <div style={{ background: 'var(--surface2)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>Grammar</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{analysis.grammar}</div>
                </div>
                <div style={{ background: 'var(--surface2)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>Pronunciation</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{analysis.pronunciation}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
