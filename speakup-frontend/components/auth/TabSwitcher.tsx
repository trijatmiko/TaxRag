// components/auth/TabSwitcher.tsx
import { AuthTab } from "@/types/auth";
import { cn } from "@/lib/utils";

interface TabSwitcherProps {
    activeTab: AuthTab;
    onSwitch: (tab: AuthTab) => void;
}

const TABS: { id: AuthTab; label: string }[] = [
    { id: "signin", label: "Sign In" },
    { id: "signup", label: "Sign Up" },
];

export function TabSwitcher({ activeTab, onSwitch }: TabSwitcherProps) {
    return (
        <div className="flex bg-surface2 rounded-[10px] p-1 gap-1">
            {TABS.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onSwitch(tab.id)}
                    className={cn(
                        "flex-1 py-2 rounded-[7px] border-none text-sm font-medium font-dm",
                        "transition-all duration-200 cursor-pointer",
                        activeTab === tab.id
                            ? "bg-surface text-text shadow-tab-active"
                            : "bg-transparent text-muted hover:text-text",
                    )}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}