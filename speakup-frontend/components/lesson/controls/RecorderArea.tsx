// components/lesson/controls/RecorderArea.tsx
'use client';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

interface RecorderAreaProps {
  sessionId: string | null;
  isSendingAudio: boolean;
  recorderStatus: string;
  recorderHint: string;
  onRecordingDone: (blob: Blob, mimeType: string) => Promise<void>;
}

export default function RecorderArea({
  sessionId, isSendingAudio, recorderStatus, recorderHint, onRecordingDone,
}: RecorderAreaProps) {
  const { state, barHeights, startRecording, stopRecording } = useAudioRecorder({
    onRecordingDone,
    barCount: 12,
  });

  const isRecording  = state === 'recording';
  const isProcessing = state === 'processing' || isSendingAudio;
  const disabled     = !sessionId || isProcessing;

  const handleClick = async () => {
    if (!sessionId) return;
    if (isRecording) stopRecording();
    else await startRecording();
  };

  return (
    <div style={{
      padding: '20px 28px',
      borderTop: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px',
      flexShrink: 0, background: 'var(--bg)', zIndex: 20,
    }}>
      {/* Record button */}
      <button
        onClick={handleClick}
        disabled={disabled}
        title={isRecording ? 'Stop recording' : 'Record'}
        style={{
          width: '56px', height: '56px', borderRadius: '50%',
          border: isRecording ? '2px solid var(--red)' : '2px solid var(--border)',
          background: isRecording ? 'rgba(248,113,113,0.12)' : 'var(--surface2)',
          color: isRecording ? 'var(--red)' : disabled ? 'var(--muted)' : 'var(--muted)',
          fontSize: '22px', cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, position: 'relative', zIndex: 30, pointerEvents: 'auto',
          boxShadow: isRecording ? '0 0 15px rgba(248,113,113,0.3)' : undefined,
          opacity: disabled ? 0.4 : 1,
          animation: isRecording
            ? 'pulse 1.2s ease-in-out infinite'
            : !disabled ? 'glowPulse 2s infinite' : 'none',
        }}
      >
        {isRecording ? '⏹️' : '🎤'}
      </button>

      {/* Status + Hint */}
      <div style={{ flex: '0 0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>
          {isProcessing && !isRecording ? 'Processing…' : recorderStatus}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
          {isProcessing && !isRecording ? 'Please wait' : recorderHint}
        </div>
      </div>

      {/* Waveform bars */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '3px',
        height: '32px', width: '80px', justifyContent: 'space-between',
        opacity: isRecording ? 1 : 0,
        transition: 'opacity 0.3s',
      }}>
        {barHeights.map((h, i) => (
          <div key={i} style={{
            width: '4px', background: 'var(--red)', borderRadius: '2px',
            height: `${h}px`, transition: 'height 0.1s ease',
          }} />
        ))}
      </div>
    </div>
  );
}
