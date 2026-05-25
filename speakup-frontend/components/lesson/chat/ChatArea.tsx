// components/lesson/chat/ChatArea.tsx
'use client';
import { useEffect, useRef } from 'react';
import ChatBubble from './ChatBubble';
import { ChatMessage } from '@/hooks/useLessonSession';

interface ChatAreaProps {
  messages: ChatMessage[];
  isLoading: boolean;
  ttsType: 'correction' | 'conversation' | null;
}

export default function ChatArea({ messages, isLoading, ttsType }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, ttsType]);

  return (
    <div
      id="chatArea"
      style={{
        flex: 1, overflowY: 'auto', padding: '28px',
        display: 'flex', flexDirection: 'column', gap: '20px',
        scrollBehavior: 'smooth',
        backgroundImage: 'radial-gradient(var(--border) 1px, transparent 0)',
        backgroundSize: '40px 40px',
        backgroundPosition: '-19px -19px',
      }}
    >
      {/* Empty state */}
      {messages.length === 0 && !isLoading && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', color: 'var(--muted)', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', opacity: 0.4 }}>🎙️</div>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '18px', fontWeight: 700, color: 'var(--text)', opacity: 0.5 }}>Ready to practice?</h3>
          <p style={{ fontSize: '13px', maxWidth: '280px' }}>Choose a topic and level, then click <strong>Start Session</strong> to begin.</p>
        </div>
      )}

      {/* Messages */}
      {messages.filter(m => m.role !== 'system').map(msg => (
        <ChatBubble
          key={msg.id}
          role={msg.role as 'user' | 'assistant'}
          content={msg.content}
          correction={msg.correction}
          patternToUse={msg.patternToUse}
          timestamp={msg.timestamp}
        />
      ))}

      {/* Typing indicator */}
      {isLoading && (
        <div style={{ display: 'flex', gap: '12px', flexDirection: 'row' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(79,140,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>🤖</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '70%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', borderTopLeftRadius: '4px', width: 'fit-content' }}>
              {[0, 0.2, 0.4].map((delay, i) => (
                <span key={i} style={{ width: '7px', height: '7px', background: 'var(--muted)', borderRadius: '50%', display: 'inline-block', animation: `blink 1.2s ease-in-out ${delay}s infinite` }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TTS badge */}
      {ttsType && (
        <div style={{ display: 'flex', gap: '12px', flexDirection: 'row', animation: 'fadeUp 0.3s ease' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(79,140,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0, opacity: 0 }} />
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 14px', borderRadius: '14px', fontSize: '13px', fontWeight: 500,
              width: 'fit-content', animation: 'fadeUp 0.3s ease', border: '1px solid',
              ...(ttsType === 'correction'
                ? { background: 'rgba(251,191,36,0.08)', borderColor: 'rgba(251,191,36,0.3)', color: 'var(--yellow)' }
                : { background: 'rgba(79,140,255,0.08)', borderColor: 'rgba(79,140,255,0.3)', color: 'var(--accent)' }
              ),
            }}>
              <span style={{ fontSize: '16px' }}>{ttsType === 'correction' ? '📝' : '🤖'}</span>
              <span>{ttsType === 'correction' ? 'Tutor memberikan koreksi…' : 'Tutor berbicara…'}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '4px' }}>
                {[{ h: '8px', d: '0s' }, { h: '14px', d: '0.1s' }, { h: '20px', d: '0.2s' }, { h: '12px', d: '0.15s' }].map((b, i) => (
                  <span key={i} style={{
                    display: 'block', width: '3px', borderRadius: '2px',
                    height: b.h,
                    background: ttsType === 'correction' ? 'var(--yellow)' : 'var(--accent)',
                    animation: `ttsWave 0.7s ease-in-out ${b.d} infinite`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} style={{ height: '4px' }} />
    </div>
  );
}
