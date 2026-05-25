// hooks/useGlowEffect.ts
"use client";
import { useEffect, RefObject } from "react";

/**
 * Attach mouse-tracking glow effect ke semua .glass-card
 * di dalam containerRef (atau document jika null).
 */
export function useGlowEffect(containerRef?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = containerRef?.current ?? document;
    const cards = root.querySelectorAll<HTMLElement>(".glass-card");

    const handlers: Array<{ el: HTMLElement; fn: (e: MouseEvent) => void }> = [];

    cards.forEach(card => {
      const fn = (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
        card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
      };
      card.addEventListener("mousemove", fn);
      handlers.push({ el: card, fn });
    });

    return () => handlers.forEach(({ el, fn }) => el.removeEventListener("mousemove", fn));
  });
}
