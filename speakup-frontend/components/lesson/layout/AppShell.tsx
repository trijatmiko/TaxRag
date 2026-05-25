// components/lesson/layout/AppShell.tsx
'use client';

interface AppShellProps {
  sidebarOpen: boolean;
  sidebarContent: React.ReactNode;
  topBarContent: React.ReactNode;
  children: React.ReactNode;
}

export default function AppShell({ sidebarOpen, sidebarContent, topBarContent, children }: AppShellProps) {
  return (
    <div
      className={`
        grid h-screen overflow-hidden transition-[grid-template-columns] duration-300 bg-bg
        ${sidebarOpen
          ? 'grid-cols-[280px_1fr]'
          : 'grid-cols-[0px_1fr]'
        }
      `}
    >
      {/* Sidebar */}
      <aside
        className={`
          bg-surface border-r border-border flex flex-col
          overflow-y-auto overflow-x-hidden transition-all duration-300
          ${sidebarOpen ? 'opacity-100 p-6' : 'opacity-0 p-0 pointer-events-none w-0'}
        `}
      >
        {sidebarContent}
      </aside>

      {/* Main Panel */}
      <main className="flex flex-col overflow-hidden h-full relative">
        {topBarContent}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
