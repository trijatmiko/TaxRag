// components/lesson/profile/ProfileAvatar.tsx
'use client';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface ProfileAvatarProps {
  name: string;
  avatarUrl?: string;
}

export default function ProfileAvatar({ name, avatarUrl }: ProfileAvatarProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const photoUrl = avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4f8cff&color=fff&bold=true&size=80&rounded=true`;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleLogout = () => {
    sessionStorage.clear();
    router.push('/login');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setOpen(o => !o)}
        className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-all ${open ? 'border-accent' : 'border-border'}`}
      >
        <Image src={photoUrl} alt={name} width={36} height={36} className="object-cover" />
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-56 bg-surface border border-border rounded-2xl shadow-xl z-[100] animate-fade-in">
          <div className="px-4 py-3 border-b border-border">
            <p className="font-syne font-bold text-sm text-text">{name}</p>
          </div>
          <div className="p-2">
            <button 
              onClick={() => router.push('/dashboard/profile')}
              className="w-full flex items-center px-3 py-2 rounded-lg text-sm text-muted hover:bg-surface2 hover:text-text transition-colors"
            >
              <span className="material-symbols-outlined text-base mr-3">dashboard</span>
              Dashboard
            </button>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2 rounded-lg text-sm text-red hover:bg-surface2 transition-colors mt-1"
            >
              <span className="material-symbols-outlined text-base mr-3">logout</span>
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
