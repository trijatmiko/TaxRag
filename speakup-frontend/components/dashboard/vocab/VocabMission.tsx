// components/dashboard/vocab/VocabMission.tsx
"use client";
import { useState } from "react";
import { VocabItem } from "@/types/dashboard";
import { VocabCard }  from "./VocabCard";
import { VocabModal } from "./VocabModal";

interface VocabMissionProps {
  vocabs:  VocabItem[];
  loading: boolean;
}

export function VocabMission({ vocabs, loading }: VocabMissionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const preview = vocabs.slice(0, 3);

  return (
    <section>
      <div className="flex items-center justify-between mb-gutter">
        <h3 className="font-headline-modal text-headline-modal text-on-surface">Vocab Mission</h3>
        <button
          onClick={() => setModalOpen(true)}
          className="font-section-label text-section-label text-primary hover:underline transition-all"
        >
          VIEW ALL RECENT WORDS
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {loading && (
          <p className="font-helper-text text-text-muted text-sm col-span-3 animate-pulse">
            Loading vocab...
          </p>
        )}
        {!loading && preview.map((v, i) => (
          <VocabCard key={`${v.word}-${i}`} vocab={v} />
        ))}
      </div>

      {modalOpen && (
        <VocabModal vocabs={vocabs} onClose={() => setModalOpen(false)} />
      )}
    </section>
  );
}
