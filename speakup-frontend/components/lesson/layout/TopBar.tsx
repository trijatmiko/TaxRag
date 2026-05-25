// components/lesson/layout/TopBar.tsx
import ProfileAvatar from '@/components/lesson/profile/ProfileAvatar';

interface TopBarProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  userName: string;
  avatarUrl?: string;
  sessionId: string | null;
  onEndSession: () => void;
}

export default function TopBar({ 
  onToggleSidebar, 
  sidebarOpen, 
  userName, 
  avatarUrl,
  sessionId,
  onEndSession
}: TopBarProps) {
  return (
    <header className="h-[72px] border-b border-border bg-bg/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <button 
          onClick={onToggleSidebar}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface2 border border-border text-text hover:border-accent hover:text-accent transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">
            {sidebarOpen ? 'menu_open' : 'menu'}
          </span>
        </button>
        <div className="flex flex-col">
          <span className="font-syne font-bold text-base text-text">Fluent Co-pilot</span>
          <span className="text-xs text-muted">AI Tutor</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {sessionId && (
          <button 
            onClick={onEndSession}
            className="hidden sm:flex px-4 py-2 bg-red/10 border border-red/30 text-red hover:bg-red/20 rounded-lg text-sm font-semibold transition-colors"
          >
            End Session
          </button>
        )}
        <ProfileAvatar name={userName} avatarUrl={avatarUrl} />
      </div>
    </header>
  );
}
