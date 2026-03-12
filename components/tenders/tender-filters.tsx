"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, RotateCcw } from "lucide-react";

const CONTRACT_TYPES = [
  { value: "all", label: "SVI_TIPOVI" },
  { value: "Robe", label: "ROBE" },
  { value: "Usluge", label: "USLUGE" },
  { value: "Radovi", label: "RADOVI" },
];

const PROCEDURE_TYPES = [
  { value: "all", label: "SVE_PROCEDURE" },
  { value: "Otvoreni postupak", label: "OTVORENI" },
  { value: "Ograničeni postupak", label: "OGRANIČENI" },
  { value: "Pregovarački postupak", label: "PREGOVARAČKI" },
  { value: "Konkurentski zahtjev", label: "KONKURENTSKI" },
  { value: "Direktni sporazum", label: "DIREKTNI" },
];

export function TenderFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

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
  const [deadlineTo, setDeadlineTo] = useState(
    searchParams.get("deadline_to") || ""
  );
  const [valueMin, setValueMin] = useState(
    searchParams.get("value_min") || ""
  );
  const [valueMax, setValueMax] = useState(
    searchParams.get("value_max") || ""
  );

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (keyword.trim()) params.set("q", keyword.trim());
    if (contractType !== "all") params.set("contract_type", contractType);
    if (procedureType !== "all") params.set("procedure_type", procedureType);
    if (deadlineFrom) params.set("deadline_from", deadlineFrom);
    if (deadlineTo) params.set("deadline_to", deadlineTo);
    if (valueMin) params.set("value_min", valueMin);
    if (valueMax) params.set("value_max", valueMax);
    params.set("page", "1");
    router.push(`/dashboard/tenders?${params.toString()}`);
  }, [keyword, contractType, procedureType, deadlineFrom, deadlineTo, valueMin, valueMax, router]);

  function resetFilters() {
    setKeyword("");
    setContractType("all");
    setProcedureType("all");
    setDeadlineFrom("");
    setDeadlineTo("");
    setValueMin("");
    setValueMax("");
    router.push("/dashboard/tenders");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") applyFilters();
  }

  return (
    <div className="space-y-4 border border-slate-800 bg-[#060b17] p-5">
      <div className="mb-2 flex items-center justify-between border-b border-slate-800 pb-2">
        <p className="font-mono text-[9px] text-slate-500">QUERY_PARAMETERS</p>
        <p className="font-mono text-[9px] text-blue-500">LIVE_SEARCH</p>
      </div>

      {/* Red 1: Keyword + tipovi */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1 space-y-1.5">
          <Label className="font-mono text-[9px] font-semibold uppercase tracking-widest text-slate-500">
            KLJUČNA_RIJEČ
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
            <Input
              placeholder="SEARCH_QUERY..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="rounded-none border-slate-800 bg-[#020611] pl-9 font-mono text-xs placeholder:text-slate-600 focus-visible:border-blue-500 focus-visible:ring-0"
            />
          </div>
        </div>
        <div className="w-[160px] space-y-1.5">
          <Label className="font-mono text-[9px] font-semibold uppercase tracking-widest text-slate-500">
            TIP_UGOVORA
          </Label>
          <Select value={contractType} onValueChange={setContractType}>
            <SelectTrigger className="rounded-none border-slate-800 bg-[#020611] font-mono text-xs focus:ring-0 focus:border-blue-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-none border-slate-800 bg-[#020611] font-mono text-xs">
              {CONTRACT_TYPES.map((ct) => (
                <SelectItem key={ct.value} value={ct.value} className="focus:bg-blue-500/20 focus:text-white">
                  {ct.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-[180px] space-y-1.5">
          <Label className="font-mono text-[9px] font-semibold uppercase tracking-widest text-slate-500">
            PROCEDURA
          </Label>
          <Select value={procedureType} onValueChange={setProcedureType}>
            <SelectTrigger className="rounded-none border-slate-800 bg-[#020611] font-mono text-xs focus:ring-0 focus:border-blue-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-none border-slate-800 bg-[#020611] font-mono text-xs">
              {PROCEDURE_TYPES.map((pt) => (
                <SelectItem key={pt.value} value={pt.value} className="focus:bg-blue-500/20 focus:text-white">
                  {pt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Red 2: Datumi + vrijednosti + dugmad */}
      <div className="flex flex-wrap items-end gap-3 pt-2">
        <div className="w-[140px] space-y-1.5">
          <Label className="font-mono text-[9px] font-semibold uppercase tracking-widest text-slate-500">
            ROK_OD
          </Label>
          <Input
            type="date"
            value={deadlineFrom}
            onChange={(e) => setDeadlineFrom(e.target.value)}
            className="rounded-none border-slate-800 bg-[#020611] font-mono text-xs text-slate-300 focus-visible:border-blue-500 focus-visible:ring-0 [&::-webkit-calendar-picker-indicator]:invert"
          />
        </div>
        <div className="w-[140px] space-y-1.5">
          <Label className="font-mono text-[9px] font-semibold uppercase tracking-widest text-slate-500">
            ROK_DO
          </Label>
          <Input
            type="date"
            value={deadlineTo}
            onChange={(e) => setDeadlineTo(e.target.value)}
            className="rounded-none border-slate-800 bg-[#020611] font-mono text-xs text-slate-300 focus-visible:border-blue-500 focus-visible:ring-0 [&::-webkit-calendar-picker-indicator]:invert"
          />
        </div>
        <div className="w-[130px] space-y-1.5">
          <Label className="font-mono text-[9px] font-semibold uppercase tracking-widest text-slate-500">
            VRIJEDNOST_MIN
          </Label>
          <Input
            type="number"
            placeholder="0"
            value={valueMin}
            onChange={(e) => setValueMin(e.target.value)}
            className="rounded-none border-slate-800 bg-[#020611] font-mono text-xs placeholder:text-slate-600 focus-visible:border-blue-500 focus-visible:ring-0"
          />
        </div>
        <div className="w-[130px] space-y-1.5">
          <Label className="font-mono text-[9px] font-semibold uppercase tracking-widest text-slate-500">
            VRIJEDNOST_MAX
          </Label>
          <Input
            type="number"
            placeholder="∞"
            value={valueMax}
            onChange={(e) => setValueMax(e.target.value)}
            className="rounded-none border-slate-800 bg-[#020611] font-mono text-xs placeholder:text-slate-600 focus-visible:border-blue-500 focus-visible:ring-0"
          />
        </div>
        <div className="flex gap-2 flex-1 justify-end">
          <Button 
            variant="outline" 
            onClick={resetFilters} 
            title="Resetuj filtere"
            className="rounded-none border-slate-700 bg-transparent hover:bg-slate-800 hover:text-white"
          >
            <RotateCcw className="size-4" />
          </Button>
          <Button 
            onClick={applyFilters} 
            className="rounded-none bg-blue-600 font-mono text-[10px] font-bold tracking-widest hover:bg-blue-500"
          >
            <Search className="mr-2 size-3.5" />
            EXECUTE_QUERY
          </Button>
        </div>
      </div>
    </div>
  );
}
