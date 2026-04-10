"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import {
  CalendarDays,
  Filter,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RegionMultiSelect } from "@/components/ui/region-multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CONTRACT_TYPES = [
  { value: "all", label: "Svi tipovi" },
  { value: "Robe", label: "Robe" },
  { value: "Usluge", label: "Usluge" },
  { value: "Radovi", label: "Radovi" },
];

const PROCEDURE_TYPES = [
  { value: "all", label: "Sve procedure" },
  { value: "Otvoreni postupak", label: "Otvoreni" },
  { value: "Ograni\u010deni postupak", label: "Ograni\u010deni" },
  { value: "Pregovara\u010dki postupak", label: "Pregovara\u010dki" },
  { value: "Konkurentski zahtjev", label: "Konkurentski" },
  { value: "Direktni sporazum", label: "Direktni" },
];

const RECOMMENDED_SORT_OPTIONS = [
  { value: "recommended", label: "Najrelevantniji" },
  { value: "nearest", label: "Najbli\u017ei lokaciji firme" },
  { value: "deadline_asc", label: "Rok najskoriji" },
  { value: "deadline_desc", label: "Rok najkasniji" },
  { value: "value_desc", label: "Najve\u0107a vrijednost" },
  { value: "value_asc", label: "Najmanja vrijednost" },
  { value: "newest", label: "Najnovije objavljeno" },
];

const ALL_TENDERS_SORT_OPTIONS = [
  { value: "deadline_asc", label: "Rok najskoriji" },
  { value: "deadline_desc", label: "Rok najkasniji" },
  { value: "value_desc", label: "Najve\u0107a vrijednost" },
  { value: "value_asc", label: "Najmanja vrijednost" },
  { value: "newest", label: "Najnovije objavljeno" },
];

export function TenderFilters({ basePath = "/dashboard/tenders" }: { basePath?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") === "all" ? "all" : "recommended";
  const sortOptions =
    activeTab === "recommended" ? RECOMMENDED_SORT_OPTIONS : ALL_TENDERS_SORT_OPTIONS;
  const defaultSort = activeTab === "recommended" ? "recommended" : "deadline_asc";

  const [keyword, setKeyword] = useState(searchParams.get("q") || "");
  const [contractType, setContractType] = useState(
    searchParams.get("contract_type") || "all"
  );
  const [procedureType, setProcedureType] = useState(
    searchParams.get("procedure_type") || "all"
  );
  const [deadlineFrom, setDeadlineFrom] = useState(
    searchParams.get("deadline_from") || ""
  );
  const [deadlineTo, setDeadlineTo] = useState(searchParams.get("deadline_to") || "");
  const [valueMin, setValueMin] = useState(searchParams.get("value_min") || "");
  const [valueMax, setValueMax] = useState(searchParams.get("value_max") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || defaultSort);
  const [locations, setLocations] = useState<string[]>(
    searchParams.getAll("location")
  );

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    const currentTab = searchParams.get("tab");

    if (currentTab) params.set("tab", currentTab);
    if (keyword.trim()) params.set("q", keyword.trim());
    if (contractType !== "all") params.set("contract_type", contractType);
    if (procedureType !== "all") params.set("procedure_type", procedureType);
    if (deadlineFrom) params.set("deadline_from", deadlineFrom);
    if (deadlineTo) params.set("deadline_to", deadlineTo);
    if (valueMin.trim()) params.set("value_min", valueMin.trim());
    if (valueMax.trim()) params.set("value_max", valueMax.trim());
    if (sort !== defaultSort) params.set("sort", sort);
    locations.forEach((location) => params.append("location", location));
    params.set("page", "1");
    router.push(`${basePath}?${params.toString()}`);
  }, [
    basePath,
    contractType,
    deadlineFrom,
    deadlineTo,
    defaultSort,
    keyword,
    locations,
    procedureType,
    router,
    searchParams,
    sort,
    valueMax,
    valueMin,
  ]);

  function resetFilters() {
    setKeyword("");
    setContractType("all");
    setProcedureType("all");
    setDeadlineFrom("");
    setDeadlineTo("");
    setValueMin("");
    setValueMax("");
    setSort(defaultSort);
    setLocations([]);

    const currentTab = searchParams.get("tab");
    const params = new URLSearchParams();
    if (currentTab) params.set("tab", currentTab);
    router.push(`${basePath}?${params.toString()}`);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter") applyFilters();
  }

  const compactTriggerClassName =
    "h-11 min-w-[140px] rounded-2xl border-white/10 bg-white/5 px-3 text-sm text-white hover:bg-white/8";
  const compactContentClassName =
    "rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 shadow-2xl";
  const compactItemClassName =
    "rounded-xl px-3 py-2 text-slate-100 data-[highlighted]:bg-white/10 data-[highlighted]:text-white";
  const locationContentClassName =
    "rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 shadow-2xl [&_[data-slot=command]]:bg-slate-950 [&_[data-slot=command]]:text-slate-100 [&_[data-slot=command-input-wrapper]]:border-b [&_[data-slot=command-input-wrapper]]:border-white/10 [&_[data-slot=command-input-wrapper]]:bg-slate-950 [&_[data-slot=command-group]]:text-slate-100 [&_[data-slot=command-group]_[cmdk-group-heading]]:text-slate-400 [&_[data-slot=command-input]]:text-slate-100 [&_[data-slot=command-input]::placeholder]:text-slate-500 [&_[data-slot=command-item]]:text-slate-100 [&_[data-slot=command-item][data-selected=true]]:bg-white/10 [&_[data-slot=command-item][data-selected=true]]:text-white";

  return (
    <section className="mb-6 rounded-[1.4rem] border border-slate-800 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] p-3.5 text-white shadow-[0_22px_50px_-38px_rgba(2,6,23,0.82)]">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-[1_1_340px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <Input
            placeholder="Pretra\u017ei naziv, naru\u010dioca ili opis tendera..."
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onKeyDown={handleKeyDown}
            className="h-11 rounded-2xl border-white/10 bg-white/5 pl-10 text-sm text-white placeholder:text-slate-500 focus-visible:border-sky-400/40 focus-visible:ring-sky-400/20"
          />
        </div>

        <div className="min-w-[240px] flex-[1_1_280px]">
          <RegionMultiSelect
            selectedRegions={locations}
            onChange={setLocations}
            placeholder="Lokacija tendera"
            triggerClassName="min-h-[44px] rounded-2xl border-white/10 bg-white/5 px-3 text-white hover:bg-white/8"
            contentClassName={locationContentClassName}
            chipClassName="border border-sky-500/20 bg-sky-500/10 text-sky-100"
            placeholderClassName="text-slate-400"
          />
        </div>

        <Select value={contractType} onValueChange={setContractType}>
          <SelectTrigger className={compactTriggerClassName}>
            <SelectValue placeholder="Tip ugovora" />
          </SelectTrigger>
          <SelectContent className={compactContentClassName}>
            {CONTRACT_TYPES.map((item) => (
              <SelectItem key={item.value} value={item.value} className={compactItemClassName}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={procedureType} onValueChange={setProcedureType}>
          <SelectTrigger className={compactTriggerClassName}>
            <SelectValue placeholder="Procedura" />
          </SelectTrigger>
          <SelectContent className={compactContentClassName}>
            {PROCEDURE_TYPES.map((item) => (
              <SelectItem key={item.value} value={item.value} className={compactItemClassName}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className={compactTriggerClassName}>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-3.5 text-slate-400" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent className={compactContentClassName}>
            {sortOptions.map((item) => (
              <SelectItem key={item.value} value={item.value} className={compactItemClassName}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex h-11 min-w-[172px] items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3">
          <CalendarDays className="size-3.5 text-slate-400" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Rok od
          </span>
          <Input
            type="date"
            value={deadlineFrom}
            onChange={(event) => setDeadlineFrom(event.target.value)}
            className="h-9 border-0 bg-transparent px-0 text-sm text-white focus-visible:border-0 focus-visible:ring-0"
          />
        </div>

        <div className="flex h-11 min-w-[172px] items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3">
          <CalendarDays className="size-3.5 text-slate-400" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Rok do
          </span>
          <Input
            type="date"
            value={deadlineTo}
            onChange={(event) => setDeadlineTo(event.target.value)}
            className="h-9 border-0 bg-transparent px-0 text-sm text-white focus-visible:border-0 focus-visible:ring-0"
          />
        </div>

        <div className="flex h-11 min-w-[146px] items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            KM od
          </span>
          <Input
            type="number"
            min="0"
            step="1000"
            value={valueMin}
            onChange={(event) => setValueMin(event.target.value)}
            placeholder="50000"
            className="h-9 border-0 bg-transparent px-0 text-sm text-white placeholder:text-slate-500 focus-visible:border-0 focus-visible:ring-0"
          />
        </div>

        <div className="flex h-11 min-w-[146px] items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            KM do
          </span>
          <Input
            type="number"
            min="0"
            step="1000"
            value={valueMax}
            onChange={(event) => setValueMax(event.target.value)}
            placeholder="500000"
            className="h-9 border-0 bg-transparent px-0 text-sm text-white placeholder:text-slate-500 focus-visible:border-0 focus-visible:ring-0"
          />
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={resetFilters}
            className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white"
          >
            <RotateCcw className="mr-2 size-4" />
            Resetuj
          </Button>
          <Button
            onClick={applyFilters}
            className="h-11 rounded-2xl bg-white px-5 text-sm font-semibold text-slate-950 hover:bg-slate-100"
          >
            <Filter className="mr-2 size-4" />
            Primijeni
          </Button>
        </div>
      </div>
    </section>
  );
}
