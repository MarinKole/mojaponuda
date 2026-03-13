"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, Mail, Shield, User, Trash2 } from "lucide-react";
import { PaywallModal } from "@/components/subscription/paywall-modal";
import type { SubscriptionStatus } from "@/lib/subscription";

interface TeamSettingsProps {
  status: SubscriptionStatus;
}

export function TeamSettings({ status }: TeamSettingsProps) {
  const [showPaywall, setShowPaywall] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  // Mock current members (since we don't have a backend table yet)
  const members = [
    { id: "1", email: "marin.kolenda@outlook.com", role: "vlasnik", name: "Marin Kolenda" },
  ];

  const maxMembers = status.plan.limits.maxTeamMembers || 1;
  const currentMembers = members.length;

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    if (currentMembers >= maxMembers) {
      setShowPaywall(true);
      return;
    }

    // Placeholder for invite logic
    alert("Funkcionalnost pozivanja članova tima uskoro stiže!");
    setInviteEmail("");
  }

  return (
    <div className="space-y-8">
      <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <User className="size-5" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg text-slate-900">Upravljanje Timom</h2>
              <p className="text-sm text-slate-500">
                {currentMembers} od {maxMembers} članova
              </p>
            </div>
          </div>
          {status.plan.id === "agency" && (
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100">
              Agencijski Tim
            </Badge>
          )}
        </div>

        {/* Invite Form */}
        <form onSubmit={handleInvite} className="flex gap-3 items-end mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex-1 space-y-2">
            <Label htmlFor="invite-email" className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pozovi novog člana
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input 
                id="invite-email"
                type="email" 
                placeholder="kolega@firma.ba" 
                className="pl-9 h-11 bg-white"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
          </div>
          <Button 
            type="submit" 
            className="h-11 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20"
          >
            <Plus className="mr-2 size-4" />
            Pozovi
          </Button>
        </form>

        {/* Members List */}
        <div className="space-y-4">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
              <div className="flex items-center gap-4">
                <Avatar className="size-10 border-2 border-white shadow-sm">
                  <AvatarImage src={`https://ui-avatars.com/api/?name=${member.name}&background=6366f1&color=fff`} />
                  <AvatarFallback>MK</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-bold text-slate-900">{member.name}</p>
                  <p className="text-xs text-slate-500">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="capitalize bg-slate-50 text-slate-600 border-slate-200">
                  {member.role}
                </Badge>
                {member.role !== "vlasnik" && (
                  <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600">
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        title="Dostigli ste limit tima"
        description={`Vaš trenutni paket omogućava maksimalno ${maxMembers} članova tima. Nadogradite paket za dodavanje više kolega.`}
        limitType="members"
      />
    </div>
  );
}
