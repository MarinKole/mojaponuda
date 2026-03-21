import { fetchAwardNoticesByIds, type EjnAwardNotice } from "@/lib/ejn-api";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AwardDecision,
  Company,
  ContractingAuthority,
  Database,
  MarketCompany,
  PlannedProcurement,
  Tender,
} from "@/types/database";

const DAY_MS = 24 * 60 * 60 * 1000;

export type AdminLeadOutreachStatus = "new" | "contacted" | "converted" | "dead";
export type AdminPortalLeadTemperature = "Vruć lead" | "Dobar lead" | "Pratiti";

type AdminPortalLeadNoteRow = Database["public"]["Tables"]["admin_portal_lead_notes"]["Row"];

export interface AdminPortalLeadWin {
  id: string;
  tenderId: string | null;
  tenderTitle: string;
  contractingAuthority: string | null;
  awardDate: string | null;
  winningPrice: number | null;
  procedureType: string | null;
  contractType: string | null;
  portalUrl: string | null;
}

export interface AdminPortalLead {
  jib: string;
  companyName: string;
  portalCompanyId: string | null;
  city: string | null;
  municipality: string | null;
  totalWinsCount: number;
  totalWonValue: number;
  recentAwards180d: number;
  recentAuthorityCount180d: number;
  recentWonValue180d: number;
  lastAwardDate: string | null;
  lastWinningPrice: number | null;
  averageBidders: number | null;
  lastContractType: string | null;
  lastProcedureType: string | null;
  mainAuthorityName: string | null;
  mainAuthorityJib: string | null;
  mainAuthorityLocation: string | null;
  authorityPlannedCount90d: number;
  authorityPlannedValue90d: number;
  score: number;
  temperature: AdminPortalLeadTemperature;
  rationale: string;
  reasons: string[];
  recommendedAction: string;
  note: string;
  outreachStatus: AdminLeadOutreachStatus;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  noteUpdatedAt: string | null;
  isTracked: boolean;
  recentWins: AdminPortalLeadWin[];
}

export interface AdminPortalLeadsData {
  generatedAt: string;
  totalCandidates: number;
  hotLeads: number;
  pipelineLeads: number;
  notContactedCount: number;
  leadsWithNotes: number;
  leads: AdminPortalLead[];
}

type AwardFallbackNotice = Pick<
  EjnAwardNotice,
  "AwardId" | "ProcedureName" | "NoticeUrl" | "ContractingAuthorityName" | "WinningPrice" | "ProcedureType" | "ContractType"
>;

function normalizeJib(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "").trim();
}

function normalizeEntityName(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikePublicEntity(name: string | null | undefined): boolean {
  const normalized = normalizeEntityName(name);

  if (!normalized) {
    return false;
  }

  return [
    "javno preduzece",
    "javno poduzece",
    "ministarstvo",
    "opcina",
    "opstina",
    "grad ",
    "vlada",
    "zavod",
    "dom zdravlja",
    "bolnica",
    "univerzitet",
    "skola",
  ].some((keyword) => normalized.includes(keyword));
}

function getAuthorityName(
  authorityByJib: Map<string, Pick<ContractingAuthority, "id" | "name" | "jib" | "city" | "municipality" | "canton" | "entity" | "authority_type" | "activity_type">>,
  authorityJib: string | null | undefined
): string | null {
  const normalizedAuthorityJib = normalizeJib(authorityJib);

  if (!normalizedAuthorityJib) {
    return null;
  }

  return authorityByJib.get(normalizedAuthorityJib)?.name ?? null;
}

function shouldIgnoreAward(
  award: Pick<AwardDecision, "winner_jib" | "winner_name">,
): boolean {
  return !normalizeJib(award.winner_jib) || looksLikePublicEntity(award.winner_name);
}

function needsAwardFallback(
  award: Pick<AwardDecision, "winning_price">,
  tender: Pick<Tender, "id" | "title" | "contracting_authority" | "portal_url"> | null,
  authorityName: string | null
): boolean {
  return !tender?.title?.trim() || !tender?.portal_url?.trim() || !authorityName || award.winning_price === null;
}

function getAwardDisplayTitle(
  tender: Pick<Tender, "title"> | null,
  awardFallback: AwardFallbackNotice | null,
  awardId: string
): string {
  const tenderTitle = tender?.title?.trim();

  if (tenderTitle) {
    return tenderTitle;
  }

  const fallbackTitle = awardFallback?.ProcedureName?.trim();

  if (fallbackTitle) {
    return fallbackTitle;
  }

  return `Portal dodjela #${awardId}`;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function formatCompactCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M KM`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K KM`;
  }

  return `${Math.round(value)} KM`;
}

function getLocationLabel(city: string | null, municipality: string | null): string | null {
  if (city && municipality) {
    return `${city} · ${municipality}`;
  }

  return city ?? municipality ?? null;
}

function getAwardBaseDate(award: Pick<AwardDecision, "award_date" | "created_at">): string {
  return award.award_date ?? award.created_at;
}

function isWithinDays(value: string | null | undefined, days: number): boolean {
  if (!value) {
    return false;
  }

  return Date.now() - new Date(value).getTime() <= days * DAY_MS;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeLeadStatus(value: string | null | undefined): AdminLeadOutreachStatus {
  switch ((value ?? "").trim().toLowerCase()) {
    case "contacted":
    case "kontaktiran":
    case "u_toku":
      return "contacted";
    case "converted":
    case "konvertovan":
      return "converted";
    case "dead":
    case "mrtav":
    case "pauza":
      return "dead";
    default:
      return "new";
  }
}

function getTemperature(score: number): AdminPortalLeadTemperature {
  if (score >= 72) {
    return "Vruć lead";
  }

  if (score >= 48) {
    return "Dobar lead";
  }

  return "Pratiti";
}

function hasBuyingFitVolume(totalWinsCount: number, totalWonValue: number): boolean {
  return totalWinsCount >= 2 && totalWinsCount <= 12 && totalWonValue >= 25_000 && totalWonValue <= 1_500_000;
}

function isTooSmallLead(input: {
  totalWinsCount: number;
  totalWonValue: number;
  recentAwards180d: number;
  authorityPlannedCount90d: number;
}): boolean {
  return input.totalWinsCount === 1 && input.totalWonValue < 25_000 && input.recentAwards180d === 0 && input.authorityPlannedCount90d === 0;
}

function isEnterpriseHeavyLead(totalWinsCount: number, totalWonValue: number): boolean {
  return totalWinsCount >= 15 || totalWonValue >= 2_000_000;
}

function getRecommendedAction(input: {
  temperature: AdminPortalLeadTemperature;
  hasPipeline: boolean;
  recentAwards: number;
  totalWinsCount: number;
  recentAuthorityCount180d: number;
  averageBidders: number | null;
  totalWonValue: number;
}): string {
  const { temperature, hasPipeline, recentAwards, totalWinsCount, recentAuthorityCount180d, averageBidders, totalWonValue } = input;
  const buyingFitVolume = hasBuyingFitVolume(totalWinsCount, totalWonValue);

  if (temperature === "Vruć lead") {
    if (hasPipeline) {
      return "Kontaktirati prioritetno: imaju aktivan tender ciklus i novi pipeline kod poznatog naručioca, pa je ovo pravi trenutak za poruku o boljoj kontroli narednih prijava.";
    }

    if (recentAwards >= 2 || recentAuthorityCount180d >= 2) {
      return "Kontaktirati prioritetno uz poruku o manje haosa oko rokova, dokumentacije i koordinacije kroz više aktivnih postupaka.";
    }

    if (averageBidders !== null && averageBidders >= 3) {
      return "Kontaktirati prioritetno uz fokus na kontrolu rizika i disciplinu prijave u konkurentnim postupcima.";
    }

    return buyingFitVolume
      ? "Kontaktirati prioritetno: djeluju kao firma koja ima dovoljno tender volumena da alat brzo opravda cijenu."
      : "Kontaktirati prioritetno uz referencu na potvrđene pobjede i potrebu za sigurnijom pripremom narednih ponuda.";
  }

  if (temperature === "Dobar lead") {
    if (hasPipeline) {
      return "Ubaciti u uži follow-up i javiti se prije narednog talasa planiranih nabavki kod poznatog naručioca.";
    }

    if (recentAwards > 0) {
      return "Poslati personalizovan outreach sa fokusom na njihove svježe dodjele i bolju kontrolu narednih prijava.";
    }

    return buyingFitVolume
      ? "Držati u užoj shortlisti: djeluju kao dobar fit za plaćeni alat i vrijedi ih aktivirati na sljedeći jasan tender signal."
      : "Držati u aktivnoj shortlisti i javiti se na sljedeći potvrđeni signal sa portala.";
  }

  return hasPipeline
    ? "Držati na radaru i aktivirati outreach prije narednog talasa planiranih nabavki kod poznatog naručioca."
    : recentAwards > 0 || totalWinsCount >= 3
      ? "Držati na radaru kao aktivnu tender firmu i javiti se kada se pojavi novi svježi povod ili veći postupak."
      : "Pratiti i aktivirati outreach na prvu narednu potvrđenu dodjelu ili novi pipeline signal.";
}

function buildLeadRationale(input: {
  totalWinsCount: number;
  recentAwards180d: number;
  recentAuthorityCount180d: number;
  authorityPlannedCount90d: number;
  totalWonValue: number;
  averageBidders: number | null;
}): string {
  const buyingFitVolume = hasBuyingFitVolume(input.totalWinsCount, input.totalWonValue);

  if (buyingFitVolume && input.recentAwards180d >= 2 && input.authorityPlannedCount90d > 0) {
    return `Firma je u aktivnom tender ciklusu i ispred sebe već ima novi pipeline — dobar trenutak za alat koji uvodi disciplinu prije narednih prijava.`;
  }

  if (input.recentAwards180d >= 2 && input.recentAuthorityCount180d >= 2) {
    return `Firma paralelno radi više svježih postupaka kod različitih naručilaca, što obično znači operativni pritisak oko rokova, dokumentacije i pripreme.`;
  }

  if (input.averageBidders !== null && input.averageBidders >= 3 && input.recentAwards180d > 0) {
    return `Firma je aktivna u konkurentnim postupcima, pa manji broj proceduralnih propusta i bolja kontrola pripreme imaju direktnu poslovnu vrijednost.`;
  }

  if (buyingFitVolume) {
    return `Djeluje kao firma koja ima dovoljno tender volumena da plati alat, ali i dalje dovoljno operativnog pritiska da joj disciplinovan sistem stvarno treba.`;
  }

  if (input.authorityPlannedCount90d > 0 && input.totalWinsCount >= 2) {
    return `Već dobija poslove kod poznatih naručilaca, a ispred sebe ima novi ciklus na kojem postoji jasan povod za pravovremen outreach.`;
  }

  if (input.recentAwards180d > 0) {
    return `Firma je svježe aktivna na portalu i ima potvrđene pobjede koje daju dobar povod za pravovremen prodajni kontakt.`;
  }

  if (input.totalWinsCount >= 2) {
    return `Firma ima dovoljno potvrđenog tender volumena da vrijedi ostati u užoj outreach projekciji.`;
  }

  return `Firma ima barem jedan jasan komercijalni signal iz javnih podataka i vrijedi je pratiti u ciljanoj outreach projekciji.`;
}

function buildLeadReasons(input: {
  recentAwards180d: number;
  recentAuthorityCount180d: number;
  totalWinsCount: number;
  totalWonValue: number;
  averageBidders: number | null;
  authorityPlannedCount90d: number;
  authorityPlannedValue90d: number;
  hasLocation: boolean;
  lastAwardDate: string | null;
}): string[] {
  const reasons: string[] = [];
  const buyingFitVolume = hasBuyingFitVolume(input.totalWinsCount, input.totalWonValue);

  if (input.recentAwards180d >= 3) {
    reasons.push(`Ima ${input.recentAwards180d} potvrđene dodjele u zadnjih 180 dana, što znači da tenderi nisu povremen izlet nego aktivan operativni tok.`);
  } else if (input.recentAwards180d > 0) {
    reasons.push(`Ima ${input.recentAwards180d} svježe dodjele u zadnjih 180 dana.`);
  }

  if (input.recentAuthorityCount180d >= 3) {
    reasons.push(`U svježem periodu radi sa ${input.recentAuthorityCount180d} različita naručioca, pa raste koordinacija rokova, dokumentacije i interne pripreme.`);
  } else if (input.recentAuthorityCount180d === 2) {
    reasons.push("U svježem periodu radi sa dva različita naručioca, što je dobar signal operativne kompleksnosti.");
  }

  if (input.totalWonValue >= 100_000) {
    reasons.push(`Ukupno dobijena vrijednost od oko ${formatCompactCurrency(input.totalWonValue)} sugeriše ozbiljan komercijalni potencijal.`);
  }

  if (input.totalWinsCount >= 10) {
    reasons.push(`Historijski ima ${input.totalWinsCount} dobijenih postupaka.`);
  } else if (input.totalWinsCount >= 3) {
    reasons.push(`Već ima dokazanu istoriju pobjeda na javnim nabavkama (${input.totalWinsCount}).`);
  } else if (input.totalWinsCount > 0) {
    reasons.push(`Ima bar ${input.totalWinsCount} potvrđenu pobjedu, što znači da nije slučajan ponuđač nego realna tender firma.`);
  }

  if (buyingFitVolume) {
    reasons.push("Po volumenu djeluje kao dobar fit za plaćeni alat: dovoljno tender aktivnosti da sistem ima ROI, bez signala da je riječ o prevelikom enterprise procesu.");
  }

  if (input.averageBidders !== null && input.averageBidders >= 3) {
    reasons.push(`Prosjek od ${input.averageBidders} ponuđača po dodjeli znači da djeluju u konkurentnom okruženju gdje manje proceduralnih grešaka i bolja disciplina prijave imaju direktan efekat.`);
  }

  if (input.authorityPlannedCount90d > 0) {
    reasons.push(
      input.authorityPlannedValue90d > 0
        ? `Najčešći naručilac ima ${input.authorityPlannedCount90d} planiranih nabavki u narednom periodu (${formatCompactCurrency(input.authorityPlannedValue90d)}).`
        : `Najčešći naručilac ima ${input.authorityPlannedCount90d} planiranih nabavki u narednom periodu.`
    );
  }

  if (input.hasLocation) {
    reasons.push("Portal već daje osnovne identifikacione podatke firme za početni outreach research.");
  }

  if (input.lastAwardDate && isWithinDays(input.lastAwardDate, 60)) {
    reasons.push("Vrlo svježa aktivnost na portalu daje dobar povod za javljanje sada.");
  }

  return reasons.slice(0, 4);
}

function scoreLead(input: {
  recentAwards180d: number;
  recentAuthorityCount180d: number;
  totalWinsCount: number;
  totalWonValue: number;
  averageBidders: number | null;
  authorityPlannedCount90d: number;
  authorityPlannedValue90d: number;
  hasLocation: boolean;
  lastAwardDate: string | null;
}): number {
  const buyingFitVolume = hasBuyingFitVolume(input.totalWinsCount, input.totalWonValue);
  const tooSmall = isTooSmallLead({
    totalWinsCount: input.totalWinsCount,
    totalWonValue: input.totalWonValue,
    recentAwards180d: input.recentAwards180d,
    authorityPlannedCount90d: input.authorityPlannedCount90d,
  });
  const enterpriseHeavy = isEnterpriseHeavyLead(input.totalWinsCount, input.totalWonValue);
  let score = 0;

  score += input.recentAwards180d >= 4 ? 20 : input.recentAwards180d >= 2 ? 14 : input.recentAwards180d > 0 ? 8 : 0;
  score += input.recentAuthorityCount180d >= 3 ? 10 : input.recentAuthorityCount180d === 2 ? 6 : input.recentAuthorityCount180d === 1 && input.recentAwards180d >= 2 ? 3 : 0;
  score += input.authorityPlannedCount90d >= 4 ? 16 : input.authorityPlannedCount90d >= 2 ? 11 : input.authorityPlannedCount90d > 0 ? 6 : 0;
  score += input.authorityPlannedValue90d >= 500_000 ? 6 : input.authorityPlannedValue90d >= 100_000 ? 4 : input.authorityPlannedCount90d > 0 && input.authorityPlannedValue90d > 0 ? 2 : 0;
  score += buyingFitVolume ? 14 : input.totalWonValue >= 25_000 ? (enterpriseHeavy ? 4 : 8) : input.totalWonValue > 0 ? 2 : 0;
  score += input.totalWinsCount >= 2 && input.totalWinsCount <= 8 ? 12 : input.totalWinsCount === 1 ? 5 : input.totalWinsCount <= 14 ? 8 : 4;
  score += input.averageBidders !== null && input.averageBidders >= 4 ? 10 : input.averageBidders !== null && input.averageBidders >= 3 ? 7 : input.averageBidders !== null && input.averageBidders >= 2 ? 4 : 0;
  score += input.hasLocation ? 3 : 0;
  score += input.lastAwardDate && isWithinDays(input.lastAwardDate, 45) ? 10 : input.lastAwardDate && isWithinDays(input.lastAwardDate, 120) ? 6 : input.lastAwardDate && isWithinDays(input.lastAwardDate, 240) ? 2 : 0;

  if (tooSmall) {
    score -= 18;
  }

  if (input.recentAwards180d === 0 && input.authorityPlannedCount90d === 0 && input.totalWinsCount >= 8) {
    score -= 8;
  }

  if (enterpriseHeavy && input.recentAwards180d <= 1 && input.authorityPlannedCount90d === 0) {
    score -= 8;
  }

  if (input.recentAuthorityCount180d === 1 && input.recentAwards180d === 0 && input.authorityPlannedCount90d === 0) {
    score -= 4;
  }

  return clamp(score, 0, 100);
}

export async function loadAdminPortalLeadsData(): Promise<AdminPortalLeadsData> {
  const admin = createAdminClient();
  const now = Date.now();
  const awardCutoff = new Date(now - 365 * 5 * DAY_MS).toISOString().slice(0, 10);
  const plannedEnd = new Date(now + 90 * DAY_MS).toISOString().slice(0, 10);
  const plannedStart = new Date(now).toISOString().slice(0, 10);

  const [companiesResult, marketCompaniesResult, awardsResult, authoritiesResult, plannedResult, notesResult] = await Promise.all([
    admin.from("companies").select("jib, name"),
    admin
      .from("market_companies")
      .select("portal_id, name, jib, city, municipality, total_wins_count, total_won_value")
      .order("total_won_value", { ascending: false })
      .limit(400),
    admin
      .from("award_decisions")
      .select(
        "portal_award_id, tender_id, winner_name, winner_jib, winning_price, estimated_value, total_bidders_count, procedure_type, contract_type, award_date, created_at, contracting_authority_jib"
      )
      .gte("award_date", awardCutoff)
      .order("award_date", { ascending: false })
      .limit(5000),
    admin.from("contracting_authorities").select("id, name, jib, city, municipality, canton, entity, authority_type, activity_type"),
    admin
      .from("planned_procurements")
      .select("contracting_authority_id, estimated_value, planned_date, contract_type")
      .gte("planned_date", plannedStart)
      .lte("planned_date", plannedEnd),
    admin.from("admin_portal_lead_notes").select("lead_jib, lead_name, note, outreach_status, last_contacted_at, next_follow_up_at, updated_at"),
  ]);

  if (companiesResult.error) {
    throw new Error(`Ne mogu učitati postojeće klijente: ${companiesResult.error.message}`);
  }

  if (marketCompaniesResult.error) {
    throw new Error(`Ne mogu učitati portal firme: ${marketCompaniesResult.error.message}`);
  }

  if (awardsResult.error) {
    throw new Error(`Ne mogu učitati javne dodjele: ${awardsResult.error.message}`);
  }

  if (authoritiesResult.error) {
    throw new Error(`Ne mogu učitati naručioce: ${authoritiesResult.error.message}`);
  }

  if (plannedResult.error) {
    throw new Error(`Ne mogu učitati planirane nabavke: ${plannedResult.error.message}`);
  }

  const customerCompanies = (companiesResult.data ?? []) as Pick<Company, "jib" | "name">[];
  const marketCompanies = (marketCompaniesResult.data ?? []) as Pick<
    MarketCompany,
    "portal_id" | "name" | "jib" | "city" | "municipality" | "total_wins_count" | "total_won_value"
  >[];
  const awards = (awardsResult.data ?? []) as Pick<
    AwardDecision,
    | "portal_award_id"
    | "tender_id"
    | "winner_name"
    | "winner_jib"
    | "winning_price"
    | "estimated_value"
    | "total_bidders_count"
    | "procedure_type"
    | "contract_type"
    | "award_date"
    | "created_at"
    | "contracting_authority_jib"
  >[];
  const authorities = (authoritiesResult.data ?? []) as Pick<
    ContractingAuthority,
    "id" | "name" | "jib" | "city" | "municipality" | "canton" | "entity" | "authority_type" | "activity_type"
  >[];
  const planned = (plannedResult.data ?? []) as Pick<
    PlannedProcurement,
    "contracting_authority_id" | "estimated_value" | "planned_date" | "contract_type"
  >[];
  const notes = notesResult.error ? [] : ((notesResult.data ?? []) as AdminPortalLeadNoteRow[]);
  const tenderIds = [...new Set(awards.map((award) => award.tender_id).filter((value): value is string => Boolean(value)))];
  const tenders: Array<
    Pick<Tender, "id" | "title" | "contracting_authority" | "portal_url"> 
  > = [];

  for (const batch of chunkArray(tenderIds, 250)) {
    const { data, error } = await admin
      .from("tenders")
      .select("id, title, contracting_authority, portal_url")
      .in("id", batch);

    if (error) {
      throw new Error(`Ne mogu učitati tendere za lead pregled: ${error.message}`);
    }

    tenders.push(...((data ?? []) as Pick<Tender, "id" | "title" | "contracting_authority" | "portal_url">[]));
  }

  const existingCustomerJibs = new Set(customerCompanies.map((company) => normalizeJib(company.jib)).filter(Boolean));
  const notesByJib = new Map(notes.map((note) => [normalizeJib(note.lead_jib), note]));
  const authorityByJib = new Map(authorities.map((authority) => [normalizeJib(authority.jib), authority]));
  const authorityById = new Map(authorities.map((authority) => [authority.id, authority]));
  const authorityJibs = new Set(authorities.map((authority) => normalizeJib(authority.jib)).filter(Boolean));
  const authorityNames = new Set(authorities.map((authority) => normalizeEntityName(authority.name)).filter(Boolean));
  const plannedByAuthorityJib = new Map<string, Array<Pick<PlannedProcurement, "contracting_authority_id" | "estimated_value" | "planned_date" | "contract_type">>>();
  const awardsByWinnerJib = new Map<string, typeof awards>();
  const tendersById = new Map(tenders.map((tender) => [tender.id, tender]));

  for (const item of planned) {
    const authority = item.contracting_authority_id ? authorityById.get(item.contracting_authority_id) : null;
    const authorityJib = normalizeJib(authority?.jib);

    if (!authorityJib) {
      continue;
    }

    const bucket = plannedByAuthorityJib.get(authorityJib) ?? [];
    bucket.push(item);
    plannedByAuthorityJib.set(authorityJib, bucket);
  }

  for (const award of awards) {
    const winnerJib = normalizeJib(award.winner_jib);

    if (!winnerJib) {
      continue;
    }

    const bucket = awardsByWinnerJib.get(winnerJib) ?? [];
    bucket.push(award);
    awardsByWinnerJib.set(winnerJib, bucket);
  }

  const candidateCompanies = marketCompanies.filter((company) => {
      const jib = normalizeJib(company.jib);
      const normalizedName = normalizeEntityName(company.name);
      const aggregateWinsCount = company.total_wins_count ?? 0;
      const totalWonValue = Number(company.total_won_value) || 0;

      if (
        !jib ||
        existingCustomerJibs.has(jib) ||
        authorityJibs.has(jib) ||
        (normalizedName && authorityNames.has(normalizedName)) ||
        looksLikePublicEntity(company.name)
      ) {
        return false;
      }

      return (
        aggregateWinsCount >= 1 ||
        totalWonValue >= 25_000
      );
    });

  const fallbackAwardIds = [...new Set(candidateCompanies.slice(0, 100).flatMap((company) => {
    const jib = normalizeJib(company.jib);
    const companyAwards = (awardsByWinnerJib.get(jib) ?? []).sort(
      (a, b) => new Date(getAwardBaseDate(b)).getTime() - new Date(getAwardBaseDate(a)).getTime()
    );

    return companyAwards
      .filter((award) => {
        if (shouldIgnoreAward(award)) {
          return false;
        }

        const tender = award.tender_id ? tendersById.get(award.tender_id) ?? null : null;
        const authorityName = getAuthorityName(authorityByJib, award.contracting_authority_jib);

        return needsAwardFallback(award, tender, authorityName);
      })
      .slice(0, 8)
      .map((award) => award.portal_award_id);
  }))];

  const fallbackAwards = await fetchAwardNoticesByIds(fallbackAwardIds);
  const fallbackAwardById = new Map(fallbackAwards.map((award) => [award.AwardId, award]));

  const rankedLeads = candidateCompanies.map<AdminPortalLead>((company) => {
      const jib = normalizeJib(company.jib);
      const companyAwards = (awardsByWinnerJib.get(jib) ?? []).sort(
        (a, b) => new Date(getAwardBaseDate(b)).getTime() - new Date(getAwardBaseDate(a)).getTime()
      );
      const confirmedWins = companyAwards
        .filter((award) => !shouldIgnoreAward(award))
        .map((award) => {
          const tender = award.tender_id ? tendersById.get(award.tender_id) ?? null : null;
          const authorityName = getAuthorityName(authorityByJib, award.contracting_authority_jib);
          const awardFallback = fallbackAwardById.get(award.portal_award_id) ?? null;
          const winningPrice = Number(award.winning_price) || awardFallback?.WinningPrice || null;

          return {
            award,
            win: {
              id: award.portal_award_id,
              tenderId: award.tender_id,
              tenderTitle: getAwardDisplayTitle(tender, awardFallback, award.portal_award_id),
              contractingAuthority:
                tender?.contracting_authority ?? authorityName ?? awardFallback?.ContractingAuthorityName ?? null,
              awardDate: getAwardBaseDate(award),
              winningPrice,
              procedureType: award.procedure_type ?? awardFallback?.ProcedureType ?? null,
              contractType: award.contract_type ?? awardFallback?.ContractType ?? null,
              portalUrl: tender?.portal_url ?? awardFallback?.NoticeUrl ?? null,
            },
          };
        });
      const totalWinsCount = confirmedWins.length;
      const recentAwards180d = confirmedWins.filter(({ award }) => isWithinDays(getAwardBaseDate(award), 180));
      const biddersWithValue = confirmedWins.filter(({ award }) => award.total_bidders_count !== null);
      const averageBidders = biddersWithValue.length
        ? Number(
            (
              biddersWithValue.reduce((sum, item) => sum + (item.award.total_bidders_count || 0), 0) / biddersWithValue.length
            ).toFixed(1)
          )
        : null;
      const lastAward = confirmedWins[0] ?? null;
      const recentWins: AdminPortalLeadWin[] = confirmedWins.map((item) => item.win);
      const authorityCounts = new Map<string, number>();
      const authorityNameCounts = new Map<string, number>();
      const recentAuthorityKeys = new Set<string>();

      for (const item of recentAwards180d) {
        const authorityJib = normalizeJib(item.award.contracting_authority_jib);
        if (!authorityJib) {
          const authorityName = item.win.contractingAuthority?.trim();
          if (authorityName) {
            recentAuthorityKeys.add(`name:${normalizeEntityName(authorityName)}`);
            authorityNameCounts.set(authorityName, (authorityNameCounts.get(authorityName) ?? 0) + 1);
          }
          continue;
        }

        recentAuthorityKeys.add(`jib:${authorityJib}`);
        authorityCounts.set(authorityJib, (authorityCounts.get(authorityJib) ?? 0) + 1);

        const authorityName = item.win.contractingAuthority?.trim();
        if (authorityName) {
          authorityNameCounts.set(authorityName, (authorityNameCounts.get(authorityName) ?? 0) + 1);
        }
      }

      const mainAuthorityJib = [...authorityCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      const mainAuthority = mainAuthorityJib ? authorityByJib.get(mainAuthorityJib) ?? null : null;
      const mainAuthorityNameFromAwards = [...authorityNameCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      const authorityPlanned = mainAuthorityJib ? plannedByAuthorityJib.get(mainAuthorityJib) ?? [] : [];
      const authorityPlannedCount90d = authorityPlanned.length;
      const authorityPlannedValue90d = authorityPlanned.reduce(
        (sum, item) => sum + (Number(item.estimated_value) || 0),
        0
      );
      const recentAuthorityCount180d = recentAuthorityKeys.size;
      const totalWonValue = confirmedWins.reduce((sum, item) => sum + (item.win.winningPrice ?? 0), 0);
      const rationale = buildLeadRationale({
        totalWinsCount,
        recentAwards180d: recentAwards180d.length,
        recentAuthorityCount180d,
        authorityPlannedCount90d,
        totalWonValue,
        averageBidders,
      });
      const score = scoreLead({
        recentAwards180d: recentAwards180d.length,
        recentAuthorityCount180d,
        totalWinsCount,
        totalWonValue,
        averageBidders,
        authorityPlannedCount90d,
        authorityPlannedValue90d,
        hasLocation: Boolean(company.city || company.municipality),
        lastAwardDate: lastAward?.win.awardDate ?? null,
      });
      const temperature = getTemperature(score);
      const reasons = buildLeadReasons({
        recentAwards180d: recentAwards180d.length,
        recentAuthorityCount180d,
        totalWinsCount,
        totalWonValue,
        averageBidders,
        authorityPlannedCount90d,
        authorityPlannedValue90d,
        hasLocation: Boolean(company.city || company.municipality),
        lastAwardDate: lastAward?.win.awardDate ?? null,
      });
      const noteRow = notesByJib.get(jib) ?? null;
      const outreachStatus = normalizeLeadStatus(noteRow?.outreach_status ?? null);

      return {
        jib,
        companyName: company.name,
        portalCompanyId: company.portal_id ?? null,
        city: company.city ?? null,
        municipality: company.municipality ?? null,
        totalWinsCount,
        totalWonValue,
        recentAwards180d: recentAwards180d.length,
        recentAuthorityCount180d,
        recentWonValue180d: recentAwards180d.reduce((sum, item) => sum + (item.win.winningPrice ?? 0), 0),
        lastAwardDate: lastAward?.win.awardDate ?? null,
        lastWinningPrice: lastAward?.win.winningPrice ?? null,
        averageBidders,
        lastContractType: lastAward?.win.contractType ?? null,
        lastProcedureType: lastAward?.win.procedureType ?? null,
        mainAuthorityName: mainAuthority?.name ?? mainAuthorityNameFromAwards,
        mainAuthorityJib,
        mainAuthorityLocation: mainAuthority ? getLocationLabel(mainAuthority.city, mainAuthority.municipality) : null,
        authorityPlannedCount90d,
        authorityPlannedValue90d,
        score,
        temperature,
        rationale,
        reasons,
        recommendedAction: getRecommendedAction({
          temperature,
          hasPipeline: authorityPlannedCount90d > 0,
          recentAwards: recentAwards180d.length,
          totalWinsCount,
          recentAuthorityCount180d,
          averageBidders,
          totalWonValue,
        }),
        note: noteRow?.note ?? "",
        outreachStatus,
        lastContactedAt: noteRow?.last_contacted_at ?? null,
        nextFollowUpAt: noteRow?.next_follow_up_at ?? null,
        noteUpdatedAt: noteRow?.updated_at ?? null,
        isTracked: Boolean(
          (noteRow?.note && noteRow.note.trim().length > 0) ||
            outreachStatus !== "new" ||
            noteRow?.last_contacted_at ||
            noteRow?.next_follow_up_at
        ),
        recentWins,
      };
    })
    .filter((lead) => lead.totalWinsCount > 0)
    .sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      const recentDiff = b.recentAwards180d - a.recentAwards180d;
      if (recentDiff !== 0) {
        return recentDiff;
      }

      const pipelineDiff = b.authorityPlannedCount90d - a.authorityPlannedCount90d;
      if (pipelineDiff !== 0) {
        return pipelineDiff;
      }

      const authorityCoverageDiff = b.recentAuthorityCount180d - a.recentAuthorityCount180d;
      if (authorityCoverageDiff !== 0) {
        return authorityCoverageDiff;
      }

      const bLastAwardTime = b.lastAwardDate ? new Date(b.lastAwardDate).getTime() : 0;
      const aLastAwardTime = a.lastAwardDate ? new Date(a.lastAwardDate).getTime() : 0;
      if (bLastAwardTime !== aLastAwardTime) {
        return bLastAwardTime - aLastAwardTime;
      }

      const winsDiff = b.totalWinsCount - a.totalWinsCount;
      if (winsDiff !== 0) {
        return winsDiff;
      }

      return b.totalWonValue - a.totalWonValue;
    })
  const leads = rankedLeads.slice(0, 100);

  return {
    generatedAt: new Date().toISOString(),
    totalCandidates: rankedLeads.length,
    hotLeads: rankedLeads.filter((lead) => lead.temperature === "Vruć lead").length,
    pipelineLeads: rankedLeads.filter((lead) => lead.authorityPlannedCount90d > 0).length,
    notContactedCount: rankedLeads.filter((lead) => lead.outreachStatus === "new").length,
    leadsWithNotes: rankedLeads.filter((lead) => lead.note.trim().length > 0).length,
    leads,
  };
}
