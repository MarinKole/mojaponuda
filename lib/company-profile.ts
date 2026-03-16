export interface ProfileOption {
  id: string;
  label: string;
  description: string;
}

export const PRIMARY_INDUSTRY_OPTIONS: ProfileOption[] = [
  {
    id: "construction",
    label: "Građevina i infrastruktura",
    description: "Niskogradnja, visokogradnja, rekonstrukcije i infrastrukturni projekti.",
  },
  {
    id: "it",
    label: "IT i digitalna rješenja",
    description: "Softver, licence, hardver, mreže, cloud i digitalizacija.",
  },
  {
    id: "equipment",
    label: "Oprema i roba",
    description: "Uredska, školska, industrijska i druga oprema za isporuku.",
  },
  {
    id: "medical",
    label: "Medicinska i laboratorijska oprema",
    description: "Medicinski uređaji, potrošni materijal i laboratorijska rješenja.",
  },
  {
    id: "maintenance",
    label: "Održavanje i servis",
    description: "Servisiranje opreme, održavanje sistema, podrška i interventni radovi.",
  },
  {
    id: "consulting",
    label: "Konsalting, projektovanje i nadzor",
    description: "Projektovanje, stručni nadzor, edukacije, pravne i savjetodavne usluge.",
  },
  {
    id: "logistics",
    label: "Transport, logistika i komunalne usluge",
    description: "Prevoz, komunalne usluge, zimsko održavanje, odvoz i logistika.",
  },
  {
    id: "security_energy",
    label: "Sigurnost, zaštita i energija",
    description: "Video nadzor, zaštitarske usluge, elektro i energetski sistemi.",
  },
];

export const OFFERING_CATEGORY_OPTIONS: ProfileOption[] = [
  {
    id: "software_licenses",
    label: "Softver i licence",
    description: "ERP, DMS, antivirus, licence, SaaS i aplikativna rješenja.",
  },
  {
    id: "it_hardware",
    label: "IT oprema i mreže",
    description: "Računari, serveri, printeri, mrežna oprema i periferija.",
  },
  {
    id: "construction_works",
    label: "Građevinski radovi",
    description: "Izvođenje radova, rekonstrukcije, sanacije i adaptacije.",
  },
  {
    id: "electro_mechanical",
    label: "Elektro i mašinski radovi",
    description: "Instalacije, mašinske pozicije, HVAC i tehnički sistemi.",
  },
  {
    id: "design_supervision",
    label: "Projektovanje i nadzor",
    description: "Glavni projekti, idejna rješenja, stručni nadzor i revizije.",
  },
  {
    id: "maintenance_support",
    label: "Održavanje i podrška",
    description: "Servis, helpdesk, održavanje opreme i ugovori o podršci.",
  },
  {
    id: "office_school_equipment",
    label: "Uredska i školska oprema",
    description: "Namještaj, učionička oprema, uredski materijal i enterijer.",
  },
  {
    id: "medical_supplies",
    label: "Medicinska oprema i potrošni materijal",
    description: "Medicinski uređaji, laboratorijski materijal i potrošna roba.",
  },
  {
    id: "vehicles_transport",
    label: "Vozila i transport",
    description: "Putnička i teretna vozila, rezervni dijelovi i transportne usluge.",
  },
  {
    id: "cleaning_hygiene",
    label: "Čišćenje i higijena",
    description: "Usluge čišćenja, hemija, higijenski i sanitarni program.",
  },
  {
    id: "food_catering",
    label: "Hrana i catering",
    description: "Prehrambeni artikli, catering, kantine i ugostiteljske usluge.",
  },
  {
    id: "security_video",
    label: "Sigurnost i video nadzor",
    description: "Alarmni sistemi, video nadzor, zaštitarske i sigurnosne usluge.",
  },
];

export const TENDER_TYPE_OPTIONS: ProfileOption[] = [
  {
    id: "goods",
    label: "Robe",
    description: "Isporuka opreme, potrošnog materijala i druge robe.",
  },
  {
    id: "services",
    label: "Usluge",
    description: "Održavanje, podrška, konsultantske i druge usluge.",
  },
  {
    id: "works",
    label: "Radovi",
    description: "Građevinski, infrastrukturni i izvedbeni radovi.",
  },
];

export interface StructuredCompanyProfile {
  version: 1;
  primaryIndustry: string | null;
  offeringCategories: string[];
  preferredTenderTypes: string[];
  companyDescription: string | null;
}

export interface ParsedCompanyProfile {
  primaryIndustry: string | null;
  offeringCategories: string[];
  preferredTenderTypes: string[];
  companyDescription: string | null;
  legacyIndustryText: string | null;
}

const optionLookup = new Map(
  [...PRIMARY_INDUSTRY_OPTIONS, ...OFFERING_CATEGORY_OPTIONS, ...TENDER_TYPE_OPTIONS].map((option) => [
    option.id,
    option,
  ])
);

export function serializeCompanyProfile(profile: ParsedCompanyProfile): string | null {
  const normalized: StructuredCompanyProfile = {
    version: 1,
    primaryIndustry: profile.primaryIndustry,
    offeringCategories: [...new Set(profile.offeringCategories)],
    preferredTenderTypes: [...new Set(profile.preferredTenderTypes)],
    companyDescription: profile.companyDescription?.trim() || null,
  };

  if (
    !normalized.primaryIndustry &&
    normalized.offeringCategories.length === 0 &&
    normalized.preferredTenderTypes.length === 0 &&
    !normalized.companyDescription &&
    !profile.legacyIndustryText?.trim()
  ) {
    return null;
  }

  return JSON.stringify(normalized);
}

export function parseCompanyProfile(industry: string | null | undefined): ParsedCompanyProfile {
  if (!industry?.trim()) {
    return {
      primaryIndustry: null,
      offeringCategories: [],
      preferredTenderTypes: [],
      companyDescription: null,
      legacyIndustryText: null,
    };
  }

  try {
    const parsed = JSON.parse(industry) as Partial<StructuredCompanyProfile>;
    if (parsed.version === 1) {
      return {
        primaryIndustry: parsed.primaryIndustry ?? null,
        offeringCategories: parsed.offeringCategories ?? [],
        preferredTenderTypes: parsed.preferredTenderTypes ?? [],
        companyDescription: parsed.companyDescription ?? null,
        legacyIndustryText: null,
      };
    }
  } catch {
    return {
      primaryIndustry: null,
      offeringCategories: [],
      preferredTenderTypes: [],
      companyDescription: null,
      legacyIndustryText: industry,
    };
  }

  return {
    primaryIndustry: null,
    offeringCategories: [],
    preferredTenderTypes: [],
    companyDescription: null,
    legacyIndustryText: industry,
  };
}

export function getProfileOptionLabel(optionId: string): string {
  return optionLookup.get(optionId)?.label ?? optionId;
}

export function getPreferredContractTypes(preferredTenderTypes: string[]): string[] {
  const mapping: Record<string, string> = {
    goods: "Robe",
    services: "Usluge",
    works: "Radovi",
  };

  return preferredTenderTypes
    .map((item) => mapping[item])
    .filter((item): item is string => Boolean(item));
}

export function buildProfileKeywordSeeds(profile: ParsedCompanyProfile): string[] {
  return [
    profile.primaryIndustry ? getProfileOptionLabel(profile.primaryIndustry) : null,
    ...profile.offeringCategories.map((item) => getProfileOptionLabel(item)),
    ...profile.preferredTenderTypes.map((item) => getProfileOptionLabel(item)),
  ].filter((item): item is string => Boolean(item));
}

export function buildProfileContextText({
  description,
  primaryIndustry,
  offeringCategories,
  preferredTenderTypes,
  regions,
}: {
  description: string;
  primaryIndustry: string | null;
  offeringCategories: string[];
  preferredTenderTypes: string[];
  regions: string[];
}): string {
  const lines = [
    primaryIndustry ? `Primarna djelatnost: ${getProfileOptionLabel(primaryIndustry)}` : null,
    offeringCategories.length > 0
      ? `Ponuda firme: ${offeringCategories.map((item) => getProfileOptionLabel(item)).join(", ")}`
      : null,
    preferredTenderTypes.length > 0
      ? `Vrste tendera: ${preferredTenderTypes.map((item) => getProfileOptionLabel(item)).join(", ")}`
      : null,
    regions.length > 0 ? `Regije rada: ${regions.join(", ")}` : "Regije rada: cijela Bosna i Hercegovina",
    `Opis firme: ${description}`,
  ];

  return lines.filter((line): line is string => Boolean(line)).join("\n");
}
