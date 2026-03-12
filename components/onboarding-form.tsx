"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface OnboardingFormProps {
  companyId: string;
  companyName: string;
}

export function OnboardingForm({ companyId, companyName }: OnboardingFormProps) {
  const router = useRouter();
  const [name, setName] = useState(companyName);
  const [jib, setJib] = useState("");
  const [pdv, setPdv] = useState("");
  const [address, setAddress] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (jib.trim().length < 12) {
      setError("DATA_ERR // JIB MORA IMATI NAJMANJE 12 CIFARA");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("companies")
      .update({
        name: name.trim(),
        jib: jib.trim(),
        pdv: pdv.trim() || null,
        address: address.trim() || null,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
      })
      .eq("id", companyId);

    if (updateError) {
      if (updateError.message.includes("duplicate key")) {
        setError("SYS_CONFLICT // FIRMA S OVIM JIB-OM VEĆ POSTOJI");
      } else {
        setError("SYS_ERROR // GREŠKA PRI SPREMANJU PODATAKA");
      }
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="border border-red-900/50 bg-red-950/20 p-3 font-mono text-xs font-bold text-red-500">
          {error}
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="name" className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
          LEGAL_ENTITY_NAME
        </Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={loading}
          className="rounded-none border-slate-800 bg-[#020611] font-mono text-xs text-white focus-visible:border-blue-500 focus-visible:ring-0"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="jib" className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
            JIB (ID_NUMBER) *
          </Label>
          <Input
            id="jib"
            type="text"
            placeholder="4200000000000"
            value={jib}
            onChange={(e) => setJib(e.target.value)}
            required
            disabled={loading}
            className="rounded-none border-slate-800 bg-[#020611] font-mono text-xs text-white focus-visible:border-blue-500 focus-visible:ring-0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pdv" className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
            VAT_NUMBER (PDV)
          </Label>
          <Input
            id="pdv"
            type="text"
            placeholder="200000000000"
            value={pdv}
            onChange={(e) => setPdv(e.target.value)}
            disabled={loading}
            className="rounded-none border-slate-800 bg-[#020611] font-mono text-xs text-white focus-visible:border-blue-500 focus-visible:ring-0"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="address" className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
          HQ_ADDRESS
        </Label>
        <Input
          id="address"
          type="text"
          placeholder="Ulica i broj, Grad"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={loading}
          className="rounded-none border-slate-800 bg-[#020611] font-mono text-xs text-white focus-visible:border-blue-500 focus-visible:ring-0"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="contactEmail" className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
            CONTACT_EMAIL
          </Label>
          <Input
            id="contactEmail"
            type="email"
            placeholder="info@firma.ba"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            disabled={loading}
            className="rounded-none border-slate-800 bg-[#020611] font-mono text-xs text-white focus-visible:border-blue-500 focus-visible:ring-0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactPhone" className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
            CONTACT_PHONE
          </Label>
          <Input
            id="contactPhone"
            type="tel"
            placeholder="+387 33 000 000"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            disabled={loading}
            className="rounded-none border-slate-800 bg-[#020611] font-mono text-xs text-white focus-visible:border-blue-500 focus-visible:ring-0"
          />
        </div>
      </div>
      
      <Button 
        type="submit" 
        className="w-full rounded-none bg-blue-600 font-mono text-xs font-bold uppercase tracking-widest text-white hover:bg-blue-500" 
        disabled={loading}
      >
        {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        INITIALIZE_WORKSPACE
      </Button>
    </form>
  );
}
