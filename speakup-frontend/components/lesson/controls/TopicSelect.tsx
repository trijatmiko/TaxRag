// components/lesson/controls/TopicSelect.tsx
'use client';

const TOPICS = [
  { value: 'Daily Life',            label: '🌅 Daily Life' },
  { value: 'Food & Cooking',        label: '🍜 Food & Cooking' },
  { value: 'Travel & Places',       label: '✈️ Travel & Places' },
  { value: 'Work & Career',         label: '💼 Work & Career' },
  { value: 'Hobbies & Interests',   label: '🎨 Hobbies & Interests' },
  { value: 'Technology',            label: '💻 Technology' },
  { value: 'Movies & Entertainment',label: '🎬 Movies & Entertainment' },
  { value: 'Health & Fitness',      label: '🏃 Health & Fitness' },
  { value: 'Family & Relationships',label: '❤️ Family & Relationships' },
  { value: 'Current Events',        label: '🌍 Current Events' },
  { value: 'Vocab',                 label: '📖 Vocab' },
  { value: 'Quiz',                  label: '📝 Quiz' },
];

interface TopicSelectProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export default function TopicSelect({ value, onChange, disabled }: TopicSelectProps) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      style={{
        width: '100%',
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        color: 'var(--text)',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '14px',
        padding: '10px 14px',
        outline: 'none',
        appearance: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'border-color 0.2s',
      }}
    >
      {TOPICS.map(t => (
        <option key={t.value} value={t.value}>{t.label}</option>
      ))}
    </select>
  );
}
