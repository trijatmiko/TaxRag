// components/lesson/chat/ChatBubble.tsx
'use client';

interface Correction {
  has_error: boolean;
  wrong?: string;
  right?: string;
  reason?: string;
}

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  correction?: Correction | null;
  patternToUse?: string | null;
  timestamp: Date;
}

function parseMarkdown(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

function nowTime(date: Date): string {
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatBubble({ role, content, correction, patternToUse, timestamp }: ChatBubbleProps) {
  const isUser = role === 'user';

  return (
    <div style={{
      display: 'flex', gap: '12px',
      flexDirection: isUser ? 'row-reverse' : 'row',
      animation: 'fadeUp 0.3s ease',
    }}>
      {/* Avatar */}
      <div style={{
        width: '36px', height: '36px', borderRadius: '10px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '16px', flexShrink: 0,
        background: isUser ? 'rgba(167,139,250,0.15)' : 'rgba(79,140,255,0.15)',
      }}>
        {isUser ? '🙂' : '🤖'}
      </div>

      {/* Bubble Wrap */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '8px',
        maxWidth: '70%',
        alignItems: isUser ? 'flex-end' : 'flex-start',
      }}>
        {/* Main bubble */}
        <div
          style={{
            padding: '12px 16px', borderRadius: '14px',
            fontSize: '14px', lineHeight: 1.6,
            ...(isUser ? {
              background: 'rgba(167,139,250,0.12)',
              border: '1px solid rgba(167,139,250,0.25)',
              borderTopRightRadius: '4px',
              color: '#d8d4f5',
            } : {
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderTopLeftRadius: '4px',
              color: 'var(--text)',
            }),
          }}
          dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
        />

        {/* Pattern card */}
        {!isUser && patternToUse && patternToUse !== 'NONE' && (
          <div style={{ background: 'rgba(79,140,255,0.06)', border: '1px solid rgba(79,140,255,0.2)', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              💡 Pattern to Use (Petunjuk Jawab)
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', background: 'var(--surface2)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              {patternToUse}
            </div>
          </div>
        )}

        {/* Correction card */}
        {isUser && correction?.has_error && (
          <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px', alignSelf: 'flex-end' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--yellow)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              📝 Grammar Correction
            </div>
            {correction.wrong && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', flexShrink: 0, marginTop: '2px', background: 'rgba(248,113,113,0.15)', color: 'var(--red)' }}>❌</span>
                <span style={{ color: 'var(--text)', lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: parseMarkdown(correction.wrong) }} />
              </div>
            )}
            {correction.right && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', flexShrink: 0, marginTop: '2px', background: 'rgba(52,211,153,0.15)', color: 'var(--green)' }}>✅</span>
                <span style={{ color: 'var(--text)', lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: parseMarkdown(correction.right) }} />
              </div>
            )}
            {correction.reason && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', flexShrink: 0, marginTop: '2px', background: 'rgba(79,140,255,0.15)', color: 'var(--accent)' }}>💡</span>
                <span style={{ color: 'var(--text)', lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: parseMarkdown(correction.reason) }} />
              </div>
            )}
          </div>
        )}

        <div style={{ fontSize: '11px', color: 'var(--muted)', padding: '0 4px' }}>
          {nowTime(timestamp)}
        </div>
      </div>
    </div>
  );
}
