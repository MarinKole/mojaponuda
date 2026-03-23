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
    description: "Pregled signala da postoje potencijalni tenderi.",
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
  },
  starter: {
    id: "starter",
    name: "Starter",
    price: PRICING.starter,
    description: `Puni pristup personaliziranom feedu tendera. Priprema ponuda se plaća ${PRICING.tenderUnlock} KM po tenderu.`,
    limits: {
      maxActiveTenders: 50, // Pustimo im da saveaju za feed/tracking
      maxTeamMembers: 1,
      maxCompanies: 1,
      maxStorageBytes: 1 * GB,
      features: {
        advancedAnalysis: false, // Execution ide po pay-per-tender (Započni pripremu)
        multiCompany: false,
        teamCollaboration: false,
        vaultAutoSuggest: true,
        submissionPackage: false,
      },
    },
    features: [
      "Stvarni nazivi tendera",
      "Naručioci, vrijednosti i rokovi",
      "Napredni filteri",
      "Email notifikacije",
      "Objašnjenje relevatnosti",
    ],
    lemonSqueezyVariantId: process.env.NEXT_PUBLIC_LS_VARIANT_STARTER || "",
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: PRICING.pro,
    description: "Za firme koje redovno pripremaju ponude. Neograničena AI priprema.",
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
      "Sve iz Starter paketa",
      "Neograničen broj Započni pripremu ponude (AI analiza, dokumenti)",
      "Timski rad (3 korisnika)",
      "Analitika naručioca",
    ],
    lemonSqueezyVariantId: process.env.NEXT_PUBLIC_LS_VARIANT_PRO || "",
  },
  agency: {
    id: "agency",
    name: "Agencijski",
    price: PRICING.agency,
    description: `Uslužne agencije i holding kompanije. 2 firme besplatno (ostale ${PRICING.agencyExtraCompany} KM).`,
    limits: {
      maxActiveTenders: 5000,
      maxTeamMembers: 10,
      maxCompanies: 10,  // We'll handle billing per dynamic company in future LS API
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
      "Više profilisanih firmi (multitenancy)",
      "Upravljanje desetinama klijenata sa jednog mjesta",
      "Svi AI benefiti bez ograničenja",
      `Dodatna firma samo ${PRICING.agencyExtraCompany} KM`,
      "Prioritetna podrška",
    ],
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
