// components/lesson/vocab/VocabInput.tsx
'use client';
import { PulledVocabItem } from '@/hooks/useVocabLesson';

interface VocabInputProps {
  value: string;
  onChange: (v: string) => void;
  pulledItems: PulledVocabItem[];
  showPullPreview: boolean;
  isPulling: boolean;
  onPullDashboard: () => void;
  onApplyPulled: () => void;
  onDiscardPulled: () => void;
  onRemoveChip: (idx: number) => void;
}

export default function VocabInput({
  value, onChange,
  pulledItems, showPullPreview, isPulling,
  onPullDashboard, onApplyPulled, onDiscardPulled, onRemoveChip,
}: VocabInputProps) {
  const activeCount = pulledItems.filter(v => !v.removed).length;
  const totalCount  = pulledItems.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted)' }}>
        Target Vocabulary
      </label>

      {/* Pull from Dashboard button */}
      <button
        onClick={onPullDashboard}
        disabled={isPulling}
        className="btn-pull-dashboard"
        type="button"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '16px', ...(isPulling && { animation: 'spin 1s linear infinite' }) }}>
          {isPulling ? 'sync' : 'download'}
        </span>
        {isPulling ? 'Pulling…' : 'Pull from Dashboard'}
      </button>

      {/* Pull Preview */}
      {showPullPreview && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Unmastered Vocab
            </span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', background: 'rgba(79,140,255,0.12)', border: '1px solid rgba(79,140,255,0.3)', borderRadius: '20px', padding: '1px 8px' }}>
              {activeCount} / {totalCount} kata
            </span>
          </div>

          {/* Chips */}
          <div style={{ maxHeight: '140px', overflowY: 'auto', overflowX: 'hidden', paddingRight: '2px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {pulledItems.map((v, idx) => v.removed ? null : (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: '6px', padding: '4px 8px',
                  fontSize: '12px', color: 'var(--text)', fontWeight: 500,
                  transition: 'all 0.15s',
                }}>
                  {v.level && (
                    <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--accent)', background: 'rgba(79,140,255,0.1)', borderRadius: '3px', padding: '1px 4px' }}>
                      {v.level}
                    </span>
                  )}
                  {v.word}
                  <button
                    onClick={() => onRemoveChip(idx)}
                    title="Hapus kata ini"
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px', borderRadius: '50%', background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '11px', lineHeight: 1, padding: 0, marginLeft: '2px', flexShrink: 0 }}
                  >✕</button>
                </div>
              ))}
            </div>
          </div>

          <button onClick={onApplyPulled} type="button" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--green)', background: 'rgba(52,211,153,0.08)', color: 'var(--green)', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.3px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>check_circle</span>
            Gunakan vocab ini
          </button>
          <button onClick={onDiscardPulled} type="button" style={{ width: '100%', padding: '5px', background: 'none', border: 'none', color: 'var(--muted)', fontSize: '11px', cursor: 'pointer', textAlign: 'center', textDecoration: 'underline', transition: 'color 0.2s' }}>
            Batalkan
          </button>
        </div>
      )}

      <span style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'lowercase', fontStyle: 'italic', marginTop: '2px' }}>
        atau ketik manual:
      </span>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="e.g. ubiquitous, plethora"
        autoComplete="off"
        style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text)', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', padding: '10px 14px', outline: 'none', cursor: 'text', transition: 'border-color 0.2s' }}
      />
    </div>
  );
}
