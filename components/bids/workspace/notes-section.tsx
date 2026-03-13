"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Save, StickyNote } from "lucide-react";

interface NotesSectionProps {
  bidId: string;
  initialNotes: string;
}

export function NotesSection({ bidId, initialNotes }: NotesSectionProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveNotes = useCallback(
    async (value: string) => {
      setSaving(true);
      setSaved(false);
      try {
        await fetch(`/api/bids/${bidId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: value }),
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (err) {
        console.error("Notes save error:", err);
      } finally {
        setSaving(false);
      }
    },
    [bidId]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleChange(value: string) {
    setNotes(value);
    setSaved(false);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      saveNotes(value);
    }, 1000);
  }

  return (
    <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-slate-900">
          <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <StickyNote className="size-5" />
          </div>
          <h3 className="font-heading font-bold text-lg">
            Interne bilješke
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium">
          {saving && (
            <span className="text-slate-400 animate-pulse">Snima se...</span>
          )}
          {saved && (
            <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
              <Save className="size-3" />
              Sačuvano
            </span>
          )}
        </div>
      </div>
      <div className="relative">
        <div className="absolute top-3 left-3 pointer-events-none">
          <div className="size-1 rounded-full bg-amber-200 shadow-sm" />
        </div>
        <textarea
          value={notes}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Unesite interne bilješke, strategiju ili podsjetnike za ovaj tender..."
          rows={6}
          className="w-full resize-y rounded-xl border border-slate-200 bg-yellow-50/30 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100 transition-all leading-relaxed"
        />
      </div>
      <p className="mt-2 text-xs text-slate-400 pl-1">
        Bilješke su vidljive samo vašem timu i automatski se snimaju.
      </p>
    </div>
  );
}
