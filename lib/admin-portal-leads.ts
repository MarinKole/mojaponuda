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
  totalBidsCount: number;
  totalWinsCount: number;
  lostTendersCount: number;
  totalWonValue: number;
  winRate: number | null;
  lossRate: number | null;
  recentAwards180d: number;
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

type AwardFallbackNotice = Pick<EjnAwardNotice, "AwardId" | "ProcedureName" | "NoticeUrl" | "ContractingAuthorityName" | "WinningPrice">;

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

function hasReliableAwardContext(
  award: Pick<AwardDecision, "winner_jib" | "winner_name">,
  tender: Pick<Tender, "id" | "title" | "contracting_authority" | "portal_url"> | null,
  authorityName: string | null
): boolean {
  if (!normalizeJib(award.winner_jib) || looksLikePublicEntity(award.winner_name)) {
    return false;
  }

  return Boolean(tender || authorityName);
}

function getAwardDisplayTitle(
  tender: Pick<Tender, "title"> | null,
  awardFallback: AwardFallbackNotice | null
): string {
  const tenderTitle = tender?.title?.trim();

  if (tenderTitle) {
    return tenderTitle;
  }

  const fallbackTitle = awardFallback?.ProcedureName?.trim();

  if (fallbackTitle) {
    return fallbackTitle;
  }

  return "Naziv tendera nije dostupan";
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

function getLostTendersCount(totalBidsCount: number, totalWinsCount: number): number {
  return Math.max(totalBidsCount - totalWinsCount, 0);
}

function getLossRate(totalBidsCount: number, totalWinsCount: number): number | null {
  if (totalBidsCount <= 0) {
    return null;
  }

  return Number(((getLostTendersCount(totalBidsCount, totalWinsCount) / totalBidsCount) * 100).toFixed(1));
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

function getRecommendedAction(input: {
  temperature: AdminPortalLeadTemperature;
  hasPipeline: boolean;
  recentAwards: number;
  lostTendersCount: number;
  lossRate: number | null;
}): string {
  const { temperature, hasPipeline, recentAwards, lostTendersCount, lossRate } = input;

  if (temperature === "Vruć lead") {
    if (lostTendersCount >= 4) {
      return hasPipeline
        ? "Kontaktirati prioritetno: imaju dokazanu aktivnost, signal učešća bez pobjede u dostupnom portalu i novi pipeline kod poznatih naručilaca."
        : "Kontaktirati prioritetno uz poruku da alat smanjuje propuste i podiže disciplinu pripreme na narednim postupcima.";
    }

    return hasPipeline
      ? "Kontaktirati prioritetno uz referencu na njihove svježe dodjele i planirane nabavke kod istih naručilaca."
      : "Kontaktirati prioritetno uz referencu na svježe dodjele i potrebu za boljom pripremom narednih ponuda.";
  }

  if (temperature === "Dobar lead") {
    if (lossRate !== null && lossRate >= 40) {
      return "Poslati personalizovan outreach sa fokusom na kontrolu rizika, kvalitetniju pripremu i manje postupaka bez pobjede.";
    }

    return recentAwards > 0
      ? "Poslati personalizovan outreach sa fokusom na konkurentsku pripremu i kontrolu rizika prijave."
      : "Ubaciti u follow-up listu i javiti se kada dobiju novu svježu aktivnost na portalu.";
  }

  return hasPipeline
    ? "Držati na radaru i aktivirati outreach prije narednog talasa planiranih nabavki kod poznatog naručioca."
    : "Držati na radaru i aktivirati outreach kada se pojavi nova dodjela ili jači signal učešća bez pobjede.";
}

function buildLeadRationale(input: {
  totalBidsCount: number;
  totalWinsCount: number;
  lostTendersCount: number;
  lossRate: number | null;
  recentAwards180d: number;
  authorityPlannedCount90d: number;
  totalWonValue: number;
}): string {
  if (input.lostTendersCount >= 6 && input.totalWinsCount >= 2) {
    return `Aktivan ponuđač sa ${input.totalWinsCount} pobjeda i snažnim signalom učešća bez pobjede u dostupnim portal agregatima — dobar spoj budžeta i potrebe za boljom pripremom.`;
  }

  if (input.lostTendersCount >= 4 && input.authorityPlannedCount90d > 0) {
    return `Redovno učestvuje na tenderima, ne zatvara sve postupke i već ima novi pipeline kod naručilaca gdje je aktivan.`;
  }

  if (input.recentAwards180d >= 2 && input.totalWonValue >= 100_000) {
    return `Ozbiljan komercijalni igrač sa svježim pobjedama i dovoljno velikim portfeljem da alat za kontrolu rizika ima jasan ROI.`;
  }

  if (input.lossRate !== null && input.lossRate >= 50 && input.totalBidsCount >= 6) {
    return `Ima vidljiv intenzitet učešća, ali i visok udio nastupa bez pobjede prema dostupnim portal podacima, što ga čini dobrim kandidatom za pristup zasnovan na smanjenju rizika.`;
  }

  return `Firma ima dovoljno javnog tender volumena da vrijedi ući u ciljanu outreach listu i pratiti naredni signal za prodaju.`;
}

function buildLeadReasons(input: {
  lostTendersCount: number;
  lossRate: number | null;
  recentAwards180d: number;
  totalWinsCount: number;
  totalWonValue: number;
  averageBidders: number | null;
  authorityPlannedCount90d: number;
  authorityPlannedValue90d: number;
  totalBidsCount: number;
  hasLocation: boolean;
  lastAwardDate: string | null;
}): string[] {
  const reasons: string[] = [];

  if (input.lostTendersCount >= 8) {
    reasons.push(`Dostupni portal agregati pokazuju najmanje ${input.lostTendersCount} postupaka bez pobjede, što je snažan signal za alat koji smanjuje greške i podiže kvalitet prijave.`);
  } else if (input.lostTendersCount >= 3) {
    reasons.push(`Dostupni portal agregati pokazuju signal učešća bez pobjede (${input.lostTendersCount}), pa postoji realan prostor za bolju pripremu narednih ponuda.`);
  }

  if (input.lossRate !== null && input.lossRate >= 45 && input.totalBidsCount >= 6) {
    reasons.push(`Oko ${input.lossRate}% dostupnog portal volumena završava bez pobjede (${input.lostTendersCount} od ${input.totalBidsCount}), što je jasan pain signal.`);
  }

  if (input.recentAwards180d >= 3) {
    reasons.push(`Ima ${input.recentAwards180d} dodjele u zadnjih 180 dana, što pokazuje aktivno prisustvo na portalu.`);
  } else if (input.recentAwards180d > 0) {
    reasons.push(`Ima ${input.recentAwards180d} svježe dodjele u zadnjih 180 dana.`);
  }

  if (input.totalWinsCount >= 10) {
    reasons.push(`Historijski ima ${input.totalWinsCount} dobijenih postupaka.`);
  } else if (input.totalWinsCount >= 3) {
    reasons.push(`Već ima dokazanu istoriju pobjeda na javnim nabavkama (${input.totalWinsCount}).`);
  } else if (input.totalWinsCount > 0) {
    reasons.push(`Ima bar ${input.totalWinsCount} potvrđenu pobjedu, što znači da nije slučajan ponuđač nego realna tender firma.`);
  }

  if (input.totalWonValue >= 100_000) {
    reasons.push(`Ukupno dobijena vrijednost od oko ${formatCompactCurrency(input.totalWonValue)} sugeriše ozbiljan komercijalni potencijal.`);
  }

  if (input.averageBidders !== null && input.averageBidders >= 3) {
    reasons.push(`Prosjek od ${input.averageBidders} ponuđača po dodjeli znači da djeluju u konkurentnom okruženju gdje risk-control alat ima smisla.`);
  }

  if (input.authorityPlannedCount90d > 0) {
    reasons.push(
      input.authorityPlannedValue90d > 0
        ? `Najčešći naručilac ima ${input.authorityPlannedCount90d} planiranih nabavki u narednom periodu (${formatCompactCurrency(input.authorityPlannedValue90d)}).`
        : `Najčešći naručilac ima ${input.authorityPlannedCount90d} planiranih nabavki u narednom periodu.`
    );
  }

  if (input.totalBidsCount >= 8) {
    reasons.push(`Ima široku aktivnost na portalu (${input.totalBidsCount} evidentiranih postupaka).`);
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
  lostTendersCount: number;
  lossRate: number | null;
  recentAwards180d: number;
  totalWinsCount: number;
  totalWonValue: number;
  averageBidders: number | null;
  authorityPlannedCount90d: number;
  totalBidsCount: number;
  hasLocation: boolean;
  lastAwardDate: string | null;
}): number {
  let score = 0;

  score += input.totalBidsCount >= 18 ? 18 : input.totalBidsCount >= 10 ? 12 : input.totalBidsCount >= 6 ? 8 : input.totalBidsCount >= 4 ? 4 : 0;
  score += input.lostTendersCount >= 12 ? 22 : input.lostTendersCount >= 6 ? 16 : input.lostTendersCount >= 3 ? 10 : input.lostTendersCount > 0 ? 4 : 0;
  score += input.lossRate !== null && input.totalBidsCount >= 5
    ? input.lossRate >= 75
      ? 10
      : input.lossRate >= 50
        ? 8
        : input.lossRate >= 30
          ? 5
          : 0
    : 0;
  score += input.totalWinsCount >= 10 ? 12 : input.totalWinsCount >= 5 ? 9 : input.totalWinsCount > 0 ? 4 : 0;
  score += input.totalWonValue >= 500_000 ? 14 : input.totalWonValue >= 100_000 ? 10 : input.totalWonValue >= 25_000 ? 6 : 0;
  score += input.recentAwards180d >= 3 ? 10 : input.recentAwards180d > 0 ? 5 : 0;
  score += input.averageBidders !== null && input.averageBidders >= 4 ? 8 : input.averageBidders !== null && input.averageBidders >= 2 ? 4 : 0;
  score += Math.min(10, input.authorityPlannedCount90d * 2.5);
  score += input.hasLocation ? 4 : 0;
  score += input.lastAwardDate && isWithinDays(input.lastAwardDate, 60) ? 6 : input.lastAwardDate && isWithinDays(input.lastAwardDate, 180) ? 3 : 0;

  if (input.lossRate !== null && input.lossRate < 20 && input.totalWinsCount >= 5) {
    score -= 6;
  }

  if (input.totalBidsCount < 5 && input.totalWinsCount === 0) {
    score -= 10;
  }

  return clamp(score, 0, 100);
}

export async function loadAdminPortalLeadsData(): Promise<AdminPortalLeadsData> {
  const admin = createAdminClient();
  const now = Date.now();
  const awardCutoff = new Date(now - 365 * DAY_MS).toISOString().slice(0, 10);
  const plannedEnd = new Date(now + 90 * DAY_MS).toISOString().slice(0, 10);
  const plannedStart = new Date(now).toISOString().slice(0, 10);

  const [companiesResult, marketCompaniesResult, awardsResult, authoritiesResult, plannedResult, notesResult] = await Promise.all([
    admin.from("companies").select("jib, name"),
    admin
      .from("market_companies")
      .select("portal_id, name, jib, city, municipality, total_bids_count, total_wins_count, total_won_value, win_rate, created_at")
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
    "portal_id" | "name" | "jib" | "city" | "municipality" | "total_bids_count" | "total_wins_count" | "total_won_value" | "win_rate" | "created_at"
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
      const totalBidsCount = company.total_bids_count ?? 0;
      const totalWinsCount = company.total_wins_count ?? 0;
      const lostTendersCount = getLostTendersCount(totalBidsCount, totalWinsCount);
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
        (totalBidsCount >= 5 && (lostTendersCount >= 2 || totalWinsCount >= 2)) ||
        totalWinsCount >= 3 ||
        lostTendersCount >= 4 ||
        (totalWonValue >= 100_000 && totalBidsCount >= 3)
      );
    });

  const fallbackAwardIds = [...new Set(candidateCompanies.slice(0, 80).flatMap((company) => {
    const jib = normalizeJib(company.jib);
    const companyAwards = (awardsByWinnerJib.get(jib) ?? []).sort(
      (a, b) => new Date(getAwardBaseDate(b)).getTime() - new Date(getAwardBaseDate(a)).getTime()
    );

    return companyAwards
      .filter((award) => {
        const tender = award.tender_id ? tendersById.get(award.tender_id) ?? null : null;
        const authorityName = getAuthorityName(authorityByJib, award.contracting_authority_jib);

        return hasReliableAwardContext(award, tender, authorityName) && !tender?.title?.trim();
      })
      .slice(0, 4)
      .map((award) => award.portal_award_id);
  }))];

  const fallbackAwards = await fetchAwardNoticesByIds(fallbackAwardIds);
  const fallbackAwardById = new Map(fallbackAwards.map((award) => [award.AwardId, award]));

  const rankedLeads = candidateCompanies.map<AdminPortalLead>((company) => {
      const jib = normalizeJib(company.jib);
      const totalBidsCount = company.total_bids_count ?? 0;
      const totalWinsCount = company.total_wins_count ?? 0;
      const lostTendersCount = getLostTendersCount(totalBidsCount, totalWinsCount);
      const lossRate = getLossRate(totalBidsCount, totalWinsCount);
      const companyAwards = (awardsByWinnerJib.get(jib) ?? []).sort(
        (a, b) => new Date(getAwardBaseDate(b)).getTime() - new Date(getAwardBaseDate(a)).getTime()
      );
      const reliableAwards = companyAwards.filter((award) => {
        const tender = award.tender_id ? tendersById.get(award.tender_id) ?? null : null;
        const authorityName = getAuthorityName(authorityByJib, award.contracting_authority_jib);

        return hasReliableAwardContext(award, tender, authorityName);
      });
      const recentAwards180d = reliableAwards.filter((award) => isWithinDays(getAwardBaseDate(award), 180));
      const biddersWithValue = reliableAwards.filter((award) => award.total_bidders_count !== null);
      const averageBidders = biddersWithValue.length
        ? Number(
            (
              biddersWithValue.reduce((sum, award) => sum + (award.total_bidders_count || 0), 0) / biddersWithValue.length
            ).toFixed(1)
          )
        : null;
      const lastAward = reliableAwards[0] ?? null;
      const recentWins: AdminPortalLeadWin[] = reliableAwards.slice(0, 6).map((award) => {
        const tender = award.tender_id ? tendersById.get(award.tender_id) ?? null : null;
        const authorityName = getAuthorityName(authorityByJib, award.contracting_authority_jib);
        const awardFallback = fallbackAwardById.get(award.portal_award_id) ?? null;

        return {
          id: award.portal_award_id,
          tenderId: award.tender_id,
          tenderTitle: getAwardDisplayTitle(tender, awardFallback),
          contractingAuthority: tender?.contracting_authority ?? authorityName ?? awardFallback?.ContractingAuthorityName ?? null,
          awardDate: getAwardBaseDate(award),
          winningPrice: Number(award.winning_price) || awardFallback?.WinningPrice || null,
          procedureType: award.procedure_type ?? null,
          contractType: award.contract_type ?? null,
          portalUrl: tender?.portal_url ?? awardFallback?.NoticeUrl ?? null,
        };
      });
      const authorityCounts = new Map<string, number>();

      for (const award of recentAwards180d) {
        const authorityJib = normalizeJib(award.contracting_authority_jib);
        if (!authorityJib) {
          continue;
        }

        authorityCounts.set(authorityJib, (authorityCounts.get(authorityJib) ?? 0) + 1);
      }

      const mainAuthorityJib = [...authorityCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      const mainAuthority = mainAuthorityJib ? authorityByJib.get(mainAuthorityJib) ?? null : null;
      const authorityPlanned = mainAuthorityJib ? plannedByAuthorityJib.get(mainAuthorityJib) ?? [] : [];
      const authorityPlannedCount90d = authorityPlanned.length;
      const authorityPlannedValue90d = authorityPlanned.reduce(
        (sum, item) => sum + (Number(item.estimated_value) || 0),
        0
      );
      const totalWonValue = Number(company.total_won_value) || 0;
      const rationale = buildLeadRationale({
        totalBidsCount,
        totalWinsCount,
        lostTendersCount,
        lossRate,
        recentAwards180d: recentAwards180d.length,
        authorityPlannedCount90d,
        totalWonValue,
      });
      const score = scoreLead({
        lostTendersCount,
        lossRate,
        recentAwards180d: recentAwards180d.length,
        totalWinsCount,
        totalWonValue,
        averageBidders,
        authorityPlannedCount90d,
        totalBidsCount,
        hasLocation: Boolean(company.city || company.municipality),
        lastAwardDate: lastAward ? getAwardBaseDate(lastAward) : null,
      });
      const temperature = getTemperature(score);
      const reasons = buildLeadReasons({
        lostTendersCount,
        lossRate,
        recentAwards180d: recentAwards180d.length,
        totalWinsCount,
        totalWonValue,
        averageBidders,
        authorityPlannedCount90d,
        authorityPlannedValue90d,
        totalBidsCount,
        hasLocation: Boolean(company.city || company.municipality),
        lastAwardDate: lastAward ? getAwardBaseDate(lastAward) : null,
      });
      const noteRow = notesByJib.get(jib) ?? null;
      const outreachStatus = normalizeLeadStatus(noteRow?.outreach_status ?? null);

      return {
        jib,
        companyName: company.name,
        portalCompanyId: company.portal_id ?? null,
        city: company.city ?? null,
        municipality: company.municipality ?? null,
        totalBidsCount,
        totalWinsCount,
        lostTendersCount,
        totalWonValue,
        winRate: company.win_rate ?? null,
        lossRate,
        recentAwards180d: recentAwards180d.length,
        recentWonValue180d: recentAwards180d.reduce((sum, award) => sum + (Number(award.winning_price) || 0), 0),
        lastAwardDate: lastAward ? getAwardBaseDate(lastAward) : null,
        lastWinningPrice: lastAward ? Number(lastAward.winning_price) || 0 : null,
        averageBidders,
        lastContractType: lastAward?.contract_type ?? null,
        lastProcedureType: lastAward?.procedure_type ?? null,
        mainAuthorityName: mainAuthority?.name ?? null,
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
          lostTendersCount,
          lossRate,
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
    .sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      const lossDiff = b.lostTendersCount - a.lostTendersCount;
      if (lossDiff !== 0) {
        return lossDiff;
      }

      const pipelineDiff = b.authorityPlannedCount90d - a.authorityPlannedCount90d;
      if (pipelineDiff !== 0) {
        return pipelineDiff;
      }

      const recentDiff = b.recentAwards180d - a.recentAwards180d;
      if (recentDiff !== 0) {
        return recentDiff;
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
