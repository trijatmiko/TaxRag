// components/dashboard/ui/GlassCard.tsx
import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function GlassCard({ children, className, ...props }: GlassCardProps) {
  return (
    <div
      className={cn("glass-card rounded-xl", className)}
      {...props}
    >
      {children}
    </div>
  );
}
