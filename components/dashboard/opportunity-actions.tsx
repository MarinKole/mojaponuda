"use client";

import { useState, useEffect } from "react";
import { Heart, ClipboardList, Loader2, Check, X } from "lucide-react";

interface FollowButtonProps {
  opportunityId: string;
}

export function FollowButton({ opportunityId }: FollowButtonProps) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    fetch(`/api/opportunities/${opportunityId}/follow`)
      .then((r) => r.json())
      .then((d) => setFollowing(d.following))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [opportunityId]);

  const toggle = async () => {
    setToggling(true);
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/follow`, {
        method: following ? "DELETE" : "POST",
      });
      const data = await res.json();
      setFollowing(data.following);
    } catch {}
    setToggling(false);
  };

  if (loading) {
    return (
      <button disabled className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-slate-100 text-slate-400">
        <Loader2 className="size-4 animate-spin" />
        Učitavanje...
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={toggling}
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
        following
          ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
          : "bg-slate-900 text-white hover:bg-blue-700"
      }`}
    >
      {toggling ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Heart className={`size-4 ${following ? "fill-red-500" : ""}`} />
      )}
      {following ? "Prestani pratiti" : "Prati ovu priliku"}
    </button>
  );
}

interface ChecklistItem {
  label: string;
  category: string;
}

interface ChecklistModalProps {
  opportunityId: string;
}

export function ChecklistButton({ opportunityId }: ChecklistModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [title, setTitle] = useState("");
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const loadChecklist = async () => {
    setOpen(true);
    setLoading(true);
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/checklist`);
      const data = await res.json();
      setItems(data.items ?? []);
      setTitle(data.opportunity_title ?? "");
    } catch {}
    setLoading(false);
  };

  const toggleItem = (index: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const completedCount = checked.size;
  const totalCount = items.length;

  // Group items by category
  const grouped = items.reduce((acc, item, idx) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push({ ...item, idx });
    return acc;
  }, {} as Record<string, (ChecklistItem & { idx: number })[]>);

  return (
    <>
      <button
        onClick={loadChecklist}
        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <ClipboardList className="size-4" />
        Generiraj checklistu prijave
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[600px] mx-4">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="font-heading text-lg font-bold text-slate-900">Checklista prijave</h2>
                {title && <p className="text-xs text-slate-500 mt-0.5">{title}</p>}
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                <X className="size-5" />
              </button>
            </div>

            <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-6 animate-spin text-slate-400" />
                </div>
              ) : items.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">Nema stavki za checklistu.</p>
              ) : (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm text-slate-600">
                      {completedCount} / {totalCount} dovršeno
                    </p>
                    <div className="h-2 w-32 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all rounded-full"
                        style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-5">
                    {Object.entries(grouped).map(([category, categoryItems]) => (
                      <div key={category}>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{category}</p>
                        <div className="space-y-1.5">
                          {categoryItems.map((item) => (
                            <button
                              key={item.idx}
                              onClick={() => toggleItem(item.idx)}
                              className={`w-full flex items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                                checked.has(item.idx) ? "bg-emerald-50" : "hover:bg-slate-50"
                              }`}
                            >
                              <div className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border ${
                                checked.has(item.idx) ? "bg-emerald-500 border-emerald-500" : "border-slate-300"
                              }`}>
                                {checked.has(item.idx) && <Check className="size-3 text-white" />}
                              </div>
                              <span className={`text-sm ${checked.has(item.idx) ? "text-slate-400 line-through" : "text-slate-700"}`}>
                                {item.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => setOpen(false)}
                className="w-full px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Zatvori
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
