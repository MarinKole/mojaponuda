"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Terminal, ShieldAlert } from "lucide-react";

const errorMessages: Record<string, string> = {
  "User already registered": "SYS_ERROR // KORISNIK VEĆ POSTOJI",
  "Password should be at least 6 characters":
    "SEC_ALERT // LOZINKA MORA IMATI MINIMALNO 6 ZNAKOVA",
  "Too many requests": "SYS_BLOCK // PREVIŠE POKUŠAJA. RATE_LIMIT_ACTIVE",
  "Signup requires a valid password":
    "SEC_ALERT // UNESITE VALIDNU LOZINKU",
};

function translateError(message: string): string {
  return errorMessages[message] || "SYS_ERROR // GREŠKA PRI REGISTRACIJI";
}

export default function SignupPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password !== confirmPassword) {
      setError("SEC_ALERT // LOZINKE SE NE POKLAPAJU");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("SEC_ALERT // LOZINKA MORA IMATI MINIMALNO 6 ZNAKOVA");
      setLoading(false);
      return;
    }

    if (companyName.trim().length < 2) {
      setError("DATA_REQ // UNESITE NAZIV ENTITETA (FIRME)");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    // 1. Registruj korisnika, sačuvaj naziv firme u user_metadata
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          company_name: companyName.trim(),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });

    if (signUpError) {
      setError(translateError(signUpError.message));
      setLoading(false);
      return;
    }

    // 2. Ako je korisnik odmah autentificiran (email potvrda isključena),
    //    kreiraj zapis u companies tabeli i preusmjeri na /onboarding
    if (data.session && data.user) {
      const { error: companyError } = await supabase.from("companies").insert({
        user_id: data.user.id,
        name: companyName.trim(),
        jib: "",
      });

      if (companyError) {
        console.error("Greška pri kreiranju firme:", companyError.message);
      }

      router.push("/onboarding");
      router.refresh();
      return;
    }

    // 3. Ako je email potvrda uključena, prikaži poruku
    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="w-full border border-emerald-900/50 bg-[#060b17] shadow-[0_0_30px_rgba(16,185,129,0.1)]">
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#020611] px-4 py-3">
          <div className="flex items-center gap-3">
            <Terminal className="size-4 text-emerald-500" />
            <span className="font-mono text-xs font-bold text-emerald-500 tracking-widest">
              SYSTEM_MSG
            </span>
          </div>
        </div>
        <div className="p-8 text-center">
          <ShieldAlert className="mx-auto mb-4 size-12 text-emerald-500" />
          <h2 className="mb-4 font-mono text-lg font-bold text-white">
            VERIFIKACIJA_IDENTITETA
          </h2>
          <p className="mb-8 font-mono text-xs text-slate-400 leading-relaxed">
            Link za verifikaciju poslan na:<br/>
            <span className="text-emerald-400">{email}</span><br/><br/>
            Sistem zahtijeva potvrdu email adrese za aktivaciju.
          </p>
          <Link href="/login">
            <Button className="w-full rounded-none border border-slate-700 bg-transparent font-mono text-xs hover:bg-slate-800 hover:text-white">
              RETURN_TO_LOGIN
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full border border-slate-800 bg-[#060b17] shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 bg-[#020611] px-4 py-3">
        <div className="flex items-center gap-3">
          <Terminal className="size-4 text-blue-500" />
          <span className="font-mono text-xs font-bold text-white tracking-widest">
            NODE_REGISTRATION
          </span>
        </div>
        <div className="flex gap-1.5">
          <div className="size-2 rounded-sm bg-slate-700" />
          <div className="size-2 rounded-sm bg-slate-700" />
          <div className="size-2 rounded-sm bg-slate-700" />
        </div>
      </div>

      <div className="p-8">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-2xl font-bold tracking-tight text-white">
            MojaPonuda<span className="text-blue-500">.ba</span>
          </h1>
          <p className="mt-2 font-mono text-[10px] text-slate-500 uppercase tracking-widest">
            Aktivacija novog entiteta
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-6">
          {error && (
            <div className="border border-red-900/50 bg-red-950/20 p-3 font-mono text-xs font-bold text-red-500">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="companyName" className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
              ENTITY_NAME (NAZIV FIRME)
            </Label>
            <Input
              id="companyName"
              type="text"
              placeholder="Vaša firma d.o.o."
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              disabled={loading}
              className="rounded-none border-slate-800 bg-[#020611] font-mono text-xs text-white focus-visible:border-blue-500 focus-visible:ring-0"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email" className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
              COMM_CHANNEL (EMAIL)
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="vas@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="rounded-none border-slate-800 bg-[#020611] font-mono text-xs text-white focus-visible:border-blue-500 focus-visible:ring-0"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
              SECURE_KEY (LOZINKA)
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="rounded-none border-slate-800 bg-[#020611] font-mono text-xs text-white focus-visible:border-blue-500 focus-visible:ring-0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
              VERIFY_SECURE_KEY
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              className="rounded-none border-slate-800 bg-[#020611] font-mono text-xs text-white focus-visible:border-blue-500 focus-visible:ring-0"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full rounded-none bg-blue-600 font-mono text-xs font-bold uppercase tracking-widest text-white hover:bg-blue-500" 
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            EXECUTE_REGISTRATION
          </Button>

          <div className="border-t border-slate-800 pt-6 text-center">
            <p className="font-mono text-[10px] text-slate-500">
              ACTIVE_LICENSE_EXISTS?{" "}
              <Link href="/login" className="text-blue-500 hover:text-blue-400 font-bold transition-colors">
                INITIATE_LOGIN
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
