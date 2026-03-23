export type PlanTier = "basic" | "starter" | "pro" | "agency";

export const PRICING = {
  starter: Number(process.env.NEXT_PUBLIC_PRICE_STARTER) || 49,
  pro: Number(process.env.NEXT_PUBLIC_PRICE_PRO) || 99,
  agency: Number(process.env.NEXT_PUBLIC_PRICE_AGENCY) || 149,
  tenderUnlock: Number(process.env.NEXT_PUBLIC_PRICE_TENDER_UNLOCK) || 15,
  agencyExtraCompany: Number(process.env.NEXT_PUBLIC_PRICE_AGENCY_EXTRA) || 25,
};

export interface PlanLimits {
  maxActiveTenders: number; // For freemium/starter this might be high if we just let them 'save' for feed purposes
  maxTeamMembers: number;
  maxCompanies: number;
  maxStorageBytes: number;
  features: {
    advancedAnalysis: boolean;
    multiCompany: boolean;
    teamCollaboration: boolean;
    vaultAutoSuggest: boolean;
    submissionPackage: boolean;
  };
}

export interface Plan {
  id: PlanTier;
  name: string;
  price: number;
  description: string;
  limits: PlanLimits;
  features: string[]; // For UI display
  cta?: string;
  lemonSqueezyVariantId?: string;
}

// 1GB = 1024 * 1024 * 1024 bytes
const GB = 1073741824;

export const PLANS: Record<PlanTier, Plan> = {
  // Basic = Freemium now (Signal only)
  basic: {
    id: "basic",
    name: "Besplatni",
    price: 0,
    description: "Provjerite da li postoje poslovi za vašu firmu.",
    limits: {
      maxActiveTenders: 0,
      maxTeamMembers: 1,
      maxCompanies: 1,
      maxStorageBytes: 0,
      features: {
        advancedAnalysis: false,
        multiCompany: false,
        teamCollaboration: false,
        vaultAutoSuggest: false,
        submissionPackage: false,
      },
    },
    features: ["Dokaz da prilike postoje"],
    cta: "Provjeri prilike",
  },
  starter: {
    id: "starter",
    name: "Osnovni",
    price: PRICING.starter,
    description: "Za firme koje žele pratiti prilike i reagovati na vrijeme.",
    limits: {
      maxActiveTenders: 50,
      maxTeamMembers: 1,
      maxCompanies: 1,
      maxStorageBytes: 1 * GB,
      features: {
        advancedAnalysis: false,
        multiCompany: false,
        teamCollaboration: false,
        vaultAutoSuggest: true,
        submissionPackage: false,
      },
    },
    features: [
      "Vidite sve tendere za vašu firmu",
      "Dobijate email kad izađe novi tender",
      "Vidite zašto je tender za vas",
      `Priprema ponude po potrebi (${PRICING.tenderUnlock} KM po tenderu)`,
    ],
    cta: "Odaberi paket",
    lemonSqueezyVariantId: process.env.NEXT_PUBLIC_LS_VARIANT_STARTER || "",
  },
  pro: {
    id: "pro",
    name: "Puni Paket",
    price: PRICING.pro,
    description: "Za firme koje žele uzimati tendere bez greške.",
    limits: {
      maxActiveTenders: 1000,
      maxTeamMembers: 3,
      maxCompanies: 1,
      maxStorageBytes: 10 * GB,
      features: {
        advancedAnalysis: true,
        multiCompany: false,
        teamCollaboration: true,
        vaultAutoSuggest: true,
        submissionPackage: true,
      },
    },
    features: [
      "Sve iz Osnovnog paketa +",
      "Neograničena priprema ponuda (bez dodatnog plaćanja)",
      "Ne plaćate po tenderu – sve je uključeno",
      "Vidite šta nedostaje prije predaje",
      "Svi dokumenti i rokovi na jednom mjestu",
      "Pregled tržišta i konkurencije",
    ],
    cta: "Počni bez ograničenja",
    lemonSqueezyVariantId: process.env.NEXT_PUBLIC_LS_VARIANT_PRO || "",
  },
  agency: {
    id: "agency",
    name: "Agencijski",
    price: PRICING.agency,
    description: "Za agencije koje vode više firmi.",
    limits: {
      maxActiveTenders: 5000,
      maxTeamMembers: 10,
      maxCompanies: 10,
      maxStorageBytes: 100 * GB,
      features: {
        advancedAnalysis: true,
        multiCompany: true,
        teamCollaboration: true,
        vaultAutoSuggest: true,
        submissionPackage: true,
      },
    },
    features: [
      "Sve iz Punog paketa +",
      "Vodite više firmi sa jednog mjesta",
      "Poseban profil za svakog klijenta",
      "Pregled tržišta i konkurencije",
      "Brža podrška kad vam treba",
      `Dodatna firma samo ${PRICING.agencyExtraCompany} KM`,
    ],
    cta: "Kontaktirajte nas",
    lemonSqueezyVariantId: process.env.NEXT_PUBLIC_LS_VARIANT_AGENCY || "",
  },
};

export const DEFAULT_PLAN = PLANS.basic;

export function getPlanFromVariantId(variantId: string | null): Plan {
  if (!variantId) return DEFAULT_PLAN;

  if (variantId in PLANS) {
    return PLANS[variantId as PlanTier];
  }
  
  const plan = Object.values(PLANS).find(
    (p) => p.lemonSqueezyVariantId === variantId
  );
  
  return plan || DEFAULT_PLAN;
}
