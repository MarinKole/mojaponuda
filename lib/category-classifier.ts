import { AI_CATEGORY_VALUES } from "@/lib/opportunity-categories";

type AiCategory = (typeof AI_CATEGORY_VALUES)[number];

interface ClassifierRule {
  category: AiCategory;
  /** Tested against: title + " " + description (first 600 chars) */
  contentPattern?: RegExp;
  /** Tested against: issuer string */
  issuerPattern?: RegExp;
}

/**
 * Rules are evaluated in priority order — first match wins.
 *
 * Priority rationale:
 *   EU grantovi  (most specific — international programs)
 *   Zapošljavanje (FZZZ/FMRSP issuers are unambiguous)
 *   Poticaji za poljoprivredu (FMPVS issuer or agrar keywords)
 *   Poticaji za izvoznike (FIPA/MVTEO issuers)
 *   Energetika (energy keywords + FMERI issuer)
 *   Turizam (tourism keywords only — FMOIT also publishes env grants)
 *   Digitalizacija (IT/digital keywords)
 *   Inovacije (R&D / startup keywords)
 *   Poticaji za MSP (broad entrepreneurship — intentionally last specific)
 *   Fallback: "Poticaji i grantovi"
 */
const RULES: ClassifierRule[] = [
  // ── EU / International ─────────────────────────────────────────────────
  {
    category: "EU grantovi",
    contentPattern:
      /\bIPA(RD)?\b|\bUNDP\b|\bGIZ\b|\bUSAID\b|\bEU\s+(gran|fond|program|projekat|sredstv)|europsk[ai]\s+(fond|gran|program|projekt)|Horizon|COSME|\bbilateralni?\s+gran/i,
    issuerPattern: /UNDP|EU\s+Delegacij|Delegacija\s+EU|\bGIZ\b|\bUSAID\b/i,
  },

  // ── Zapošljavanje ──────────────────────────────────────────────────────
  {
    category: "Zapošljavanje",
    issuerPattern:
      /Zavod\s+za\s+zaposl|\bFZZZ\b|Federalni\s+zavod\s+za\s+zaposl|ministarstvo\s+rada\s+i\s+socijalne|\bFMRSP\b/i,
    contentPattern:
      /zaposl[a-z]+\s|zaposl[a-z]+$|sufinansiran\S+\s+plać|refundacij\S+\s+plać|stručno\s+osposoblj|pripravni[kc]|sezonski\s+radnik|subvencij\S+\s+plać|otvaranje\s+novih?\s+radnih?\s+mjes/i,
  },

  // ── Poljoprivreda ──────────────────────────────────────────────────────
  {
    category: "Poticaji za poljoprivredu",
    issuerPattern:
      /\bFMPVS\b|ministarstvo\s+poljopriv|ministarstvo\s+šumarst/i,
    contentPattern:
      /poljopriv|agroindustrij|agrar|ruralni\s+razvoj|\bfarme?r[a-z]*\b|voćar|vinogradar|stočar|pčelar|\bribarstvo\b|\bšumarstvo\b|\bIPARD\b/i,
  },

  // ── Izvoznike ──────────────────────────────────────────────────────────
  {
    category: "Poticaji za izvoznike",
    issuerPattern:
      /\bMVTEO\b|\bFIPA\b|Agencija\s+za\s+unapređenje\s+stranih/i,
    contentPattern:
      /\bizvoz\b|internacionali|stranih\s+investicij|plasman\s+na\s+strana?\s+tržišt|vanjskotrgovin/i,
  },

  // ── Energetika ─────────────────────────────────────────────────────────
  {
    category: "Energetika",
    issuerPattern:
      /\bFMERI\b|ministarstvo\s+energije|ministarstvo\s+rudarst/i,
    contentPattern:
      /energetsk\S+\s+efikasnost|obnovljiv\S+\s+izvor\S*|solarni?\s+panel|\bfotovoltai\b|vjetroelektran|\bbiomasa\b|toplotna\s+pumpa|energetska?\s+obnova|geotermalni|obnovljiva?\s+energij/i,
  },

  // ── Turizam ────────────────────────────────────────────────────────────
  {
    category: "Turizam",
    contentPattern:
      /\bturizam\b|\bturistič[a-z]|\bugostiteljstv[a-z]|\bagroturizam\b|turističk\S+\s+(razvoj|podrška|infrastruktura|destinacij)|nautički\s+turizam/i,
  },

  // ── Digitalizacija / IT ────────────────────────────────────────────────
  {
    category: "Digitalizacija",
    contentPattern:
      /digitali[zs]acij|digitalna?\s+transformacij|\bIKT\b|e-uprava|pametni\s+grad|\bIT\s+sekt|\bIT\s+preduzeć|softversk\S+\s+razvoj|mobiln\S+\s+aplikacij/i,
  },

  // ── Inovacije / R&D / Startupi ─────────────────────────────────────────
  {
    category: "Inovacije",
    contentPattern:
      /inovacij[a-z]*|\bR&D\b|istraži[vl][a-z]+|naučni\s+park|inkubator|akcelerator|\bstartup[a-z]*\b|\bpatent\b|naučno-?tehnološk/i,
  },

  // ── MSP / Preduzetništvo ───────────────────────────────────────────────
  {
    category: "Poticaji za MSP",
    issuerPattern:
      /\bFMRPO\b|RARS[-._ ]?MSP|\bRARS\b|razvojna\s+agencij|\bSERDA\b|\bREDAH\b|\bNERDA\b|\bZEDA\b|\bPREDA\b|\bLERDA\b/i,
    contentPattern:
      /\bMSP\b|mala\s+i\s+srednja\s+preduzeć|malo\s+i\s+srednje\s+preduzeć|poduzetništv[ao]|poduzetnic[ai]|\bobrtni[kc]\b|mikro\s+preduzeć|preduzetništvo|preduzetnic[ai]/i,
  },
];

/**
 * Classify an opportunity into one canonical AI_CATEGORY_VALUES entry.
 * Falls back to "Poticaji i grantovi" (the catch-all SEO category).
 */
export function categorizeOpportunity(
  title: string,
  issuer: string,
  description: string | null,
  eligibilitySignals?: string[] | null,
): AiCategory {
  const content = `${title} ${description?.slice(0, 600) ?? ""}`;

  for (const rule of RULES) {
    if (
      rule.contentPattern?.test(content) ||
      rule.issuerPattern?.test(issuer)
    ) {
      return rule.category;
    }
  }

  // Eligibility signals as a last-resort hint
  const sigText = (eligibilitySignals ?? []).join(" ");
  if (/poljopriv/i.test(sigText)) return "Poticaji za poljoprivredu";
  if (/zaposl/i.test(sigText)) return "Zapošljavanje";
  if (/\bizvoz\b/i.test(sigText)) return "Poticaji za izvoznike";
  if (/\bMSP\b/.test(sigText)) return "Poticaji za MSP";

  return "Poticaji i grantovi";
}
