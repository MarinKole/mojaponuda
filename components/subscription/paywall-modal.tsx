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
}

export function PaywallModal({
  isOpen,
  onClose,
  title,
  description,
  limitType,
}: PaywallModalProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    router.push("/dashboard/subscription");
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

        <div className="my-4 rounded-xl bg-slate-50 p-4 border border-slate-100">
          <h4 className="mb-3 font-semibold text-sm text-slate-900">
            Nadogradnjom na Pro paket dobijate:
          </h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <CheckCircle className="size-4 text-emerald-500" />
              <span>Neograničen broj tendera</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="size-4 text-emerald-500" />
              <span>10GB prostora za dokumente</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="size-4 text-emerald-500" />
              <span>Napredna AI analiza</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="size-4 text-emerald-500" />
              <span>Automatska priprema ponude</span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            className="w-full font-bold bg-primary hover:bg-blue-700"
            onClick={handleUpgrade}
          >
            Nadogradi na Pro
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full text-slate-500">
            Možda kasnije
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
