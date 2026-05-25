// components/lesson/ui/Toast.tsx
'use client';
import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  isError?: boolean;
  onDone: () => void;
}

export default function Toast({ message, isError, onDone }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); onDone(); }, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  if (!visible) return null;

  return (
    <div
      className={`
        fixed bottom-6 left-1/2 -translate-x-1/2 z-50
        px-5 py-3 rounded-xl text-sm font-medium
        shadow-lg animate-slide-up
        ${isError
          ? 'bg-red/10 border border-red text-red'
          : 'bg-green/10 border border-green text-green'
        }
      `}
    >
      {message}
    </div>
  );
}
