// components/dashboard/TopAppBar.tsx
interface TopAppBarProps {
  userName:    string;
  userLevel:   string;
  avatarUrl?:  string;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export function TopAppBar({ userName, userLevel, avatarUrl, onToggleSidebar, isSidebarOpen = true }: TopAppBarProps) {
  const displayName = userName || "User";
  const finalAvatarUrl = avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4f8cff&color=fff&bold=true&size=80&rounded=true`;
  return (
    <header className="flex items-center justify-between px-container-padding w-full sticky top-0 bg-surface/80 backdrop-blur-xl border-b border-border-subtle z-40 h-16 transition-all duration-300">
      <div className="flex items-center gap-4">
        {onToggleSidebar && (
          <button onClick={onToggleSidebar} className="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center p-1 rounded-md hover:bg-surface-container" title="Toggle Sidebar">
            <span className="material-symbols-outlined">{isSidebarOpen ? 'chevron_left' : 'chevron_right'}</span>
          </button>
        )}
        <div className="flex flex-col">
          <span className="font-headline-modal text-headline-modal text-primary">SpeakUp</span>
          <span className="font-body-large text-on-surface-variant -mt-1 text-[13px]">
            Language Mastery Dashboard
          </span>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <button className="text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <div className="flex items-center gap-3 pl-6 border-l border-border-subtle">
          <div className="text-right">
            <p className="font-button-text text-button-text text-on-surface">
              {userName || "Loading..."}
            </p>
            <p className="font-helper-text text-helper-text text-text-muted">
              {userLevel || "—"}
            </p>
          </div>
          {finalAvatarUrl && (
            <img
              src={finalAvatarUrl}
              alt="User avatar"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
              className="w-10 h-10 rounded-full border-2 border-primary object-cover bg-surface-container"
            />
          )}
        </div>
      </div>
    </header>
  );
}
