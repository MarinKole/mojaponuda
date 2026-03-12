"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Terminal } from "lucide-react";

const errorMessages: Record<string, string> = {
  "Invalid login credentials": "AUTH_FAILED // POGREŠAN EMAIL ILI LOZINKA",
  "Email not confirmed": "AUTH_FAILED // EMAIL NIJE POTVRĐEN",
  "Invalid email or password": "AUTH_FAILED // POGREŠAN EMAIL ILI LOZINKA",
  "Too many requests": "SYS_BLOCK // PREVIŠE POKUŠAJA. RATE_LIMIT_ACTIVE",
  "User not found": "AUTH_FAILED // KORISNIK NE POSTOJI",
};

function translateError(message: string): string {
  return errorMessages[message] || "SYS_ERROR // GREŠKA PRI PRIJAVI";
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(translateError(error.message));
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full border border-slate-800 bg-[#060b17] shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 bg-[#020611] px-4 py-3">
        <div className="flex items-center gap-3">
          <Terminal className="size-4 text-blue-500" />
          <span className="font-mono text-xs font-bold text-white tracking-widest">
            SECURE_LOGIN
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
            Autentifikacija korisnika
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="border border-red-900/50 bg-red-950/20 p-3 font-mono text-xs font-bold text-red-500">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email" className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
              USER_IDENTIFIER (EMAIL)
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
                ACCESS_KEY (PASSWORD)
              </Label>
              <Link
                href="/reset-password"
                className="font-mono text-[9px] text-slate-500 hover:text-blue-400 transition-colors"
              >
                RECOVERY_PROTOCOL
              </Link>
            </div>
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

          <Button 
            type="submit" 
            className="w-full rounded-none bg-blue-600 font-mono text-xs font-bold uppercase tracking-widest text-white hover:bg-blue-500" 
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            INITIATE_SESSION
          </Button>

          <div className="border-t border-slate-800 pt-6 text-center">
            <p className="font-mono text-[10px] text-slate-500">
              NO_ACTIVE_LICENSE?{" "}
              <Link href="/signup" className="text-blue-500 hover:text-blue-400 font-bold transition-colors">
                REQUEST_ACCESS
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
