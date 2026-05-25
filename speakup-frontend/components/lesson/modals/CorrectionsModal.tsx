// components/lesson/modals/CorrectionsModal.tsx
'use client';
import { Correction } from '@/hooks/useLessonSession';

interface CorrectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  corrections: Correction[];
}

function parseMarkdown(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

export default function CorrectionsModal({ isOpen, onClose, corrections }: CorrectionsModalProps) {
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
        position: 'relative', width: '100%', maxWidth: '600px',
        background: 'var(--surface)', borderRadius: '24px',
        border: '1px solid var(--border)', overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        animation: 'zoomIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        display: 'flex', flexDirection: 'column',
        maxHeight: '80vh',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>📝</span> Grammar Corrections
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
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          {corrections.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
              No corrections yet. Great job!
            </div>
          ) : (
            corrections.map((c, i) => (
              <div key={i} style={{ background: 'var(--surface2)', borderRadius: '16px', padding: '20px', border: '1px solid var(--border)' }}>
                {c.wrong && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                    <span style={{ background: 'rgba(248,113,113,0.15)', color: 'var(--red)', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, marginTop: '2px' }}>YOU SAID</span>
                    <span style={{ color: 'var(--text)', lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: parseMarkdown(c.wrong) }} />
                  </div>
                )}
                {c.right && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--green)', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, marginTop: '2px' }}>BETTER</span>
                    <span style={{ color: 'var(--text)', lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: parseMarkdown(c.right) }} />
                  </div>
                )}
                {c.reason && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ background: 'rgba(79,140,255,0.15)', color: 'var(--accent)', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, marginTop: '2px' }}>WHY?</span>
                    <span style={{ color: 'var(--muted)', lineHeight: 1.5, fontSize: '13px' }} dangerouslySetInnerHTML={{ __html: parseMarkdown(c.reason) }} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
