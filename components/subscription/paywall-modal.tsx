"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Zap } from "lucide-react";
import { useRouter } from "next/navigation";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  limitType: "tenders" | "storage" | "members" | "feature";
  isPerTenderUnlock?: boolean;
  tenderId?: string;
}

export function PaywallModal({
  isOpen,
  onClose,
  title,
  description,
  limitType,
  isPerTenderUnlock,
  tenderId,
}: PaywallModalProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    if (isPerTenderUnlock && tenderId) {
      router.push(`/dashboard/subscription/checkout-tender?tenderId=${tenderId}`);
    } else {
      router.push("/dashboard/subscription");
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-blue-100">
            <Zap className="size-6 text-blue-600" />
          </div>
          <DialogTitle className="text-center text-xl font-bold">
            {title}
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        {!isPerTenderUnlock && (
          <div className="my-4 rounded-xl bg-slate-50 p-4 border border-slate-100">
            <h4 className="mb-3 font-semibold text-sm text-slate-900">
              Uz Puni paket dobijate:
            </h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="size-4 text-emerald-500" />
                <span>Profesionalnu pripremu ponude kada odlučite aplicirati</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="size-4 text-emerald-500" />
                <span>Početnu listu dokumenata i koraka za rad</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="size-4 text-emerald-500" />
                <span>Pregled šta još nedostaje prije slanja</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="size-4 text-emerald-500" />
                <span>Manje propuštenih detalja i više kontrole nad ponudom</span>
              </li>
            </ul>
          </div>
        )}

        {isPerTenderUnlock && (
          <div className="my-4 rounded-xl bg-blue-50/50 p-4 border border-blue-100">
            <h4 className="mb-3 font-semibold text-sm text-slate-900">
              Plaćanje po tenderu uključuje:
            </h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="size-4 text-blue-500" />
                <span>AI analizu kompletne tenderske dokumentacije</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="size-4 text-blue-500" />
                <span>Automatsko kreiranje zadataka i liste zahtjeva</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="size-4 text-blue-500" />
                <span>Trajni pristup ponudi u vašem profilu</span>
              </li>
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            className="w-full font-bold bg-primary hover:bg-blue-700"
            onClick={handleUpgrade}
          >
            {isPerTenderUnlock ? "Otključaj pripremu za ovaj tender" : "Pogledaj Puni paket"}
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full text-slate-500">
            Možda kasnije
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
