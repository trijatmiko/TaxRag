// components/dashboard/Sidebar.tsx
import Link from "next/link";
import { useRouter } from "next/navigation";

const NAV_ITEMS = [
  { icon: "person",       label: "Profile",        href: "/dashboard/profile", active: true  },
  { icon: "exercise",     label: "Vocabulary Lab",  href: "/dashboard/vocabulary",   active: false },
  { icon: "auto_fix_high",label: "Corrections",     href: "/dashboard/corrections", active: false },
  { icon: "leaderboard",  label: "Progress",        href: "#",                  active: false },
  { icon: "settings",     label: "Settings",        href: "#",                  active: false },
];

interface SidebarProps {
  onStartLesson?: () => void;
  onLogout?:      () => void;
  isOpen?:        boolean;
}

export function Sidebar({ onStartLesson, onLogout, isOpen = true }: SidebarProps) {
  return (
    <aside className={`w-sidebar-width h-screen fixed left-0 top-0 border-r border-border-subtle bg-surface flex flex-col py-container-padding px-gutter z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Logo */}
      <div className="mb-10">
        <h1 className="font-display-brand text-display-brand text-primary tracking-tighter">
          SpeakUp AI
        </h1>
        <p className="font-section-label text-section-label text-on-surface-variant mt-1">
          Fluent Co-pilot
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group
              ${item.active
                ? "text-primary font-bold bg-secondary-container/20 scale-95"
                : "text-on-surface-variant hover:bg-surface-container"
              }`}
          >
            <span
              className="material-symbols-outlined"
              style={item.active ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {item.icon}
            </span>
            <span className="font-section-label text-section-label">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="mt-auto pt-6 border-t border-border-subtle">
        <button
          onClick={onStartLesson}
          className="w-full font-button-text text-button-text py-4 rounded-xl flex items-center justify-center gap-2 mb-6 hover:opacity-90 transition-opacity bg-white text-black"
        >
          Start Lesson
        </button>
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 w-full text-on-surface-variant hover:bg-surface-container transition-colors duration-200 rounded-lg"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="font-section-label text-section-label">Logout</span>
        </button>
      </div>
    </aside>
  );
}
