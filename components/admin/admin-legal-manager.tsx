"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Pencil,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  Loader2,
  Filter,
  Scale,
  FileText,
  Newspaper,
} from "lucide-react";

interface LegalUpdate {
  id: string;
  type: "zakon" | "izmjena" | "vijest";
  title: string;
  summary: string | null;
  source: string;
  source_url: string | null;
  published_date: string | null;
  relevance_tags: string[] | null;
  external_id: string | null;
  created_at: string;
}

const TYPE_CONFIG = {
  zakon: { label: "Zakon", icon: Scale, color: "bg-blue-100 text-blue-800" },
  izmjena: { label: "Izmjena", icon: FileText, color: "bg-amber-100 text-amber-800" },
  vijest: { label: "Vijest", icon: Newspaper, color: "bg-slate-100 text-slate-700" },
};

export function AdminLegalManager() {
  const [items, setItems] = useState<LegalUpdate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<LegalUpdate>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const limit = 25;

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (search) params.set("search", search);
      if (typeFilter) params.set("type", typeFilter);

      const res = await fetch(`/api/admin/legal-updates?${params}`);
      const data = await res.json();
      if (res.ok) {
        setItems(data.items);
        setTotal(data.total);
      }
    } catch {
      showToast("Greška pri učitavanju", "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleEdit = (item: LegalUpdate) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/legal-updates/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        showToast("Spremljeno", "success");
        setEditingId(null);
        fetchItems();
      } else {
        const data = await res.json();
        showToast(data.error || "Greška", "error");
      }
    } catch {
      showToast("Greška pri spremanju", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Jeste li sigurni da želite obrisati ovu stavku?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/legal-updates/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Obrisano", "success");
        fetchItems();
      } else {
        const data = await res.json();
        showToast(data.error || "Greška", "error");
      }
    } catch {
      showToast("Greška pri brisanju", "error");
    } finally {
      setDeleting(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
        }`}>
          {toast.message}
        </div>
      )}

      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900">Zakon i izmjene</h1>
        <p className="mt-1.5 text-sm text-slate-500">Pregledajte, uređujte i brišite zakone, izmjene i vijesti. Ukupno: {total}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Pretraži po naslovu..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-slate-400" />
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Svi tipovi</option>
            <option value="zakon">Zakon</option>
            <option value="izmjena">Izmjena</option>
            <option value="vijest">Vijest</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-6 animate-spin text-slate-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-slate-400">Nema rezultata.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Naslov</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 w-[100px]">Tip</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 w-[160px]">Izvor</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 w-[120px]">Datum</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 w-[120px]">Akcije</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const config = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.vijest;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-900 line-clamp-2">{item.title}</p>
                        {item.summary && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.summary}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full ${config.color}`}>
                          {config.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{item.source}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {item.published_date ? new Date(item.published_date).toLocaleDateString("bs-BA") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {item.source_url && (
                            <a href={item.source_url} target="_blank" rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Otvori izvor">
                              <ExternalLink className="size-4" />
                            </a>
                          )}
                          <button onClick={() => handleEdit(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Uredi">
                            <Pencil className="size-4" />
                          </button>
                          <button onClick={() => handleDelete(item.id)} disabled={deleting === item.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50" title="Obriši">
                            {deleting === item.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-slate-500">Stranica {page} od {totalPages} ({total} ukupno)</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="size-4" />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[700px] mx-4">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="font-heading text-lg font-bold text-slate-900">Uredi zakon/izmjenu</h2>
              <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                <X className="size-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Naslov</label>
                <input type="text" value={editForm.title ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Tip</label>
                  <select value={editForm.type ?? "zakon"}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value as "zakon" | "izmjena" | "vijest" })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                    <option value="zakon">Zakon</option>
                    <option value="izmjena">Izmjena</option>
                    <option value="vijest">Vijest</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Datum objave</label>
                  <input type="date" value={editForm.published_date ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, published_date: e.target.value || null })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Sažetak</label>
                <textarea value={editForm.summary ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, summary: e.target.value || null })}
                  rows={4}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-y" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Izvor</label>
                  <input type="text" value={editForm.source ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Izvorni URL</label>
                  <input type="url" value={editForm.source_url ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, source_url: e.target.value || null })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button onClick={() => setEditingId(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
                Odustani
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Spremi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
