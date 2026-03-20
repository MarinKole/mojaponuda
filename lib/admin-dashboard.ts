import type { User } from "@supabase/supabase-js";
import { getAdminEmails } from "@/lib/admin";
import { isCompanyProfileComplete } from "@/lib/demo";
import { getPlanFromVariantId, PLANS, type PlanTier } from "@/lib/plans";
import { parseCompanyProfile, getProfileOptionLabel } from "@/lib/company-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Company,
  Subscription,
  Document,
  Bid,
  Tender,
  ContractingAuthority,
  AwardDecision,
  PlannedProcurement,
  Json,
  Database,
} from "@/types/database";

type SyncLogRow = Database["public"]["Tables"]["sync_log"]["Row"];

interface CompanyUsageSnapshot {
  documentsCount: number;
  storageBytes: number;
  expiringDocuments30d: number;
  totalBids: number;
  activeBids: number;
  submittedBids: number;
  wonBids: number;
  lostBids: number;
  lastActivityAt: string | null;
}

export interface AdminDashboardRow {
  userId: string;
  companyId: string | null;
  email: string;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  companyName: string | null;
  jib: string | null;
  onboardingStatus: string;
  primaryIndustryLabel: string | null;
  regionsLabel: string;
  planName: string;
  planId: PlanTier | "none";
  subscriptionStatus: string;
  subscriptionEndsAt: string | null;
  documentsCount: number;
  activeBids: number;
  totalBids: number;
  storageBytes: number;
  lastActivityAt: string | null;
  commercialSignal: string;
  healthScore: number;
  healthStatus: "Odličan" | "Pažnja" | "Rizik";
}

export interface AdminPlanDistributionItem {
  planId: PlanTier;
  planName: string;
  activeCount: number;
  pastDueCount: number;
  estimatedMrr: number;
}

export interface AdminSyncStatusItem {
  endpoint: string;
  ranAt: string | null;
  recordsAdded: number;
  recordsUpdated: number;
  freshness: "healthy" | "warning" | "stale" | "unknown";
}

export interface AdminDailyOverviewPoint {
  label: string;
  signups: number;
  companySetups: number;
  newPaying: number;
  activeUsers: number;
  newBids: number;
  submittedBids: number;
  newDocuments: number;
}

export interface AdminCohortPoint {
  label: string;
  signups: number;
  companySetups: number;
  onboarded: number;
  paying: number;
}

export type AdminCrmStage =
  | "Novi lead"
  | "Aktivacija"
  | "Retention"
  | "Ekspanzija"
  | "Stabilan račun";

export type AdminCrmPriority = "visok" | "srednji" | "nizak";

export interface AdminCrmAccount extends AdminDashboardRow {
  outreachStage: AdminCrmStage;
  outreachPriority: AdminCrmPriority;
  outreachReason: string;
  nextAction: string;
}

export interface AdminDashboardData {
  generatedAt: string;
  summary: {
    totalUsers: number;
    newUsers30d: number;
    companiesCount: number;
    completedProfiles: number;
    activeSubscriptions: number;
    pastDueSubscriptions: number;
    estimatedActiveMrr: number;
    estimatedAtRiskMrr: number;
    activeBids: number;
    openTenders: number;
  };
  funnel: {
    signedInLast7Days: number;
    companySetupRate: number;
    profileCompletionRate: number;
    payingConversionRate: number;
  };
  revenue: {
    estimatedActiveMrr: number;
    estimatedAtRiskMrr: number;
    projectedArr: number;
    renewalsNext30d: number;
    newPaying30d: number;
  };
  planDistribution: AdminPlanDistributionItem[];
  topIndustries: Array<{ label: string; companies: number }>;
  recentUsers: AdminDashboardRow[];
  portfolioAccounts: AdminDashboardRow[];
  businessSignals: {
    upgradeCandidates: number;
    reactivationTargets: number;
    onboardingStalls: number;
    highIntentAccounts: number;
  };
  dailyOverview: AdminDailyOverviewPoint[];
  cohorts: AdminCohortPoint[];
  financeAudit: {
    inactiveAccounts: number;
    cancelledSubscriptions: number;
    renewalsNext7d: number;
    renewalsNext30d: number;
    estimatedCollectionNext30d: number;
  };
  customerHealth: {
    healthyAccounts: number;
    attentionAccounts: number;
    riskAccounts: number;
    atRiskAccounts: AdminDashboardRow[];
    expansionAccounts: AdminDashboardRow[];
    recentlyActivatedAccounts: AdminDashboardRow[];
  };
  productUsage: {
    companiesWithDocuments: number;
    companiesWithBids: number;
    averageDocumentsPerCompany: number;
    averageBidsPerCompany: number;
    bidSubmissionRate: number;
    tenderCaptureRate: number;
  };
  crm: {
    totalAccounts: number;
    companiesWithContacts: number;
    missingContactChannels: number;
    newLeadsCount: number;
    activationQueueCount: number;
    retentionQueueCount: number;
    expansionQueueCount: number;
    accounts: AdminCrmAccount[];
    newLeads: AdminCrmAccount[];
    activationQueue: AdminCrmAccount[];
    retentionQueue: AdminCrmAccount[];
    expansionQueue: AdminCrmAccount[];
  };
  operations: {
    totalDocuments: number;
    totalStorageBytes: number;
    expiringDocuments30d: number;
    totalBids: number;
    submittedBids: number;
    wonBids: number;
    lostBids: number;
    winRate: number | null;
    totalTenders: number;
    openTenders: number;
    openTenderValue: number;
    missingTenderAreas: number;
    authoritiesMissingGeo: number;
    plannedProcurements90d: number;
    plannedValue90d: number;
    awards30d: number;
    averageBidders30d: number | null;
    realizedMarketValue30d: number;
    syncStatuses: AdminSyncStatusItem[];
  };
  roadmap: Array<{
    title: string;
    description: string;
    phase: string;
    priority: "high" | "medium";
  }>;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "past_due"]);

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toDateKey(value: string | Date): string {
  return new Date(value).toISOString().slice(0, 10);
}

function toMonthKey(value: string | Date): string {
  return new Date(value).toISOString().slice(0, 7);
}

function formatDayLabel(value: string | Date): string {
  return new Intl.DateTimeFormat("bs-BA", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function formatMonthLabel(value: string | Date): string {
  return new Intl.DateTimeFormat("bs-BA", {
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function isRecordWithinDays(dateValue: string | null | undefined, days: number): boolean {
  if (!dateValue) {
    return false;
  }

  return Date.now() - new Date(dateValue).getTime() <= days * DAY_MS;
}

function getLatestDate(...values: Array<string | null | undefined>): string | null {
  const valid = values.filter((value): value is string => Boolean(value));
  if (valid.length === 0) {
    return null;
  }

  return valid.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
}

function getSubscriptionPriority(status: string): number {
  switch (status) {
    case "active":
      return 5;
    case "past_due":
      return 4;
    case "on_trial":
      return 3;
    case "cancelled":
      return 2;
    default:
      return 1;
  }
}

function pickLatestSubscription(subscriptions: Subscription[]): Subscription | null {
  if (subscriptions.length === 0) {
    return null;
  }

  return [...subscriptions].sort((a, b) => {
    const priorityDiff = getSubscriptionPriority(b.status) - getSubscriptionPriority(a.status);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  })[0] ?? null;
}

function getPrimaryIndustryLabel(industry: string | null): string | null {
  const parsed = parseCompanyProfile(industry);
  return parsed.primaryIndustry ? getProfileOptionLabel(parsed.primaryIndustry) : null;
}

function getRegionsLabel(company: Pick<Company, "operating_regions"> | null): string {
  const regions = company?.operating_regions?.filter(Boolean) ?? [];
  if (regions.length === 0) {
    return "Nisu postavljene";
  }

  return regions.slice(0, 2).join(", ") + (regions.length > 2 ? ` +${regions.length - 2}` : "");
}

function scoreAccountHealth(input: {
  onboardingStatus: string;
  subscriptionStatus: string;
  lastActivityAt: string | null;
  lastSignInAt: string | null;
  documentsCount: number;
  activeBids: number;
  commercialSignal: string;
}): { score: number; status: "Odličan" | "Pažnja" | "Rizik" } {
  let score = 0;

  if (input.onboardingStatus === "Završen") {
    score += 25;
  } else if (input.onboardingStatus === "U toku") {
    score += 10;
  } else {
    score -= 10;
  }

  if (input.subscriptionStatus === "active") {
    score += 25;
  } else if (input.subscriptionStatus === "past_due") {
    score += 8;
  } else if (input.subscriptionStatus === "cancelled") {
    score -= 8;
  }

  const activityDate = input.lastActivityAt ?? input.lastSignInAt;
  if (isRecordWithinDays(activityDate, 7)) {
    score += 20;
  } else if (isRecordWithinDays(activityDate, 30)) {
    score += 10;
  } else {
    score -= 10;
  }

  if (input.activeBids > 0) {
    score += 15;
  }

  if (input.documentsCount >= 5) {
    score += 10;
  } else if (input.documentsCount > 0) {
    score += 5;
  }

  if (input.commercialSignal.includes("Kandidat")) {
    score += 5;
  }

  if (input.commercialSignal.includes("riziku")) {
    score -= 20;
  }

  if (input.commercialSignal.includes("Zastoj")) {
    score -= 15;
  }

  score = clampNumber(score, 0, 100);

  if (score >= 70) {
    return { score, status: "Odličan" };
  }

  if (score >= 40) {
    return { score, status: "Pažnja" };
  }

  return { score, status: "Rizik" };
}

function getCrmPriorityRank(priority: AdminCrmPriority): number {
  switch (priority) {
    case "visok":
      return 3;
    case "srednji":
      return 2;
    default:
      return 1;
  }
}

function getCrmStageRank(stage: AdminCrmStage): number {
  switch (stage) {
    case "Retention":
      return 5;
    case "Aktivacija":
      return 4;
    case "Ekspanzija":
      return 3;
    case "Novi lead":
      return 2;
    default:
      return 1;
  }
}

function deriveCrmProfile(row: AdminDashboardRow): Omit<AdminCrmAccount, keyof AdminDashboardRow> {
  if (!row.companyName) {
    return {
      outreachStage: "Novi lead",
      outreachPriority: isRecordWithinDays(row.createdAt, 14) ? "visok" : "srednji",
      outreachReason: "Korisnik je registrovan, ali još nije otvorio firmu niti ušao u pravi onboarding tok.",
      nextAction: "Kontaktirati i pomoći oko otvaranja firme i prvog profila.",
    };
  }

  if (row.subscriptionStatus === "past_due" || row.healthStatus === "Rizik" || row.commercialSignal === "Naplata u riziku") {
    return {
      outreachStage: "Retention",
      outreachPriority: "visok",
      outreachReason: "Račun pokazuje billing ili churn rizik i traži direktan follow-up.",
      nextAction: "Provjeriti razlog pada aktivnosti ili naplate i javiti se istog dana.",
    };
  }

  if (row.onboardingStatus !== "Završen") {
    return {
      outreachStage: "Aktivacija",
      outreachPriority: isRecordWithinDays(row.lastSignInAt ?? row.createdAt, 14) ? "visok" : "srednji",
      outreachReason: "Firma postoji, ali onboarding još nije završen pa račun nije došao do pune vrijednosti.",
      nextAction: "Voditi korisnika do završetka profila i prvog relevantnog tendera.",
    };
  }

  if (row.subscriptionStatus === "inactive" && row.commercialSignal === "Spreman za aktivaciju") {
    return {
      outreachStage: "Aktivacija",
      outreachPriority: "visok",
      outreachReason: "Profil je spreman, postoji signal korištenja, ali pretplata nije aktivirana.",
      nextAction: "Pokrenuti komercijalni follow-up za prvu aktivaciju pretplate.",
    };
  }

  if (row.commercialSignal.includes("Kandidat")) {
    return {
      outreachStage: "Ekspanzija",
      outreachPriority: row.healthStatus === "Odličan" ? "visok" : "srednji",
      outreachReason: "Račun pokazuje da izlazi iz okvira trenutnog plana i ima prostor za upgrade.",
      nextAction: "Otvoriti razgovor o jačem planu i dodatnoj podršci.",
    };
  }

  if (row.subscriptionStatus === "active" && isRecordWithinDays(row.createdAt, 30)) {
    return {
      outreachStage: "Aktivacija",
      outreachPriority: "srednji",
      outreachReason: "Novo aktiviran račun je u osjetljivoj fazi ranog retentiona i treba pažnju.",
      nextAction: "Provjeriti da li je korisnik stigao do prve konkretne poslovne vrijednosti.",
    };
  }

  return {
    outreachStage: "Stabilan račun",
    outreachPriority: "nizak",
    outreachReason: "Račun trenutno nema hitan komercijalni ili retention rizik.",
    nextAction: "Održavati odnos i pratiti promjene kroz health i usage signale.",
  };
}

function hasAreaLabel(aiAnalysis: Json | null): boolean {
  if (!aiAnalysis || typeof aiAnalysis !== "object" || Array.isArray(aiAnalysis)) {
    return false;
  }

  const geoEnrichment = "geo_enrichment" in aiAnalysis ? aiAnalysis.geo_enrichment : null;
  if (!geoEnrichment || typeof geoEnrichment !== "object" || Array.isArray(geoEnrichment)) {
    return false;
  }

  const areaLabel = "area_label" in geoEnrichment ? geoEnrichment.area_label : null;
  return typeof areaLabel === "string" && areaLabel.trim().length > 0;
}

function buildSyncStatuses(syncRows: SyncLogRow[]): AdminSyncStatusItem[] {
  const latestByEndpoint = new Map<string, SyncLogRow>();

  for (const row of syncRows) {
    const existing = latestByEndpoint.get(row.endpoint);
    if (!existing || new Date(row.ran_at).getTime() > new Date(existing.ran_at).getTime()) {
      latestByEndpoint.set(row.endpoint, row);
    }
  }

  const trackedEndpoints = [
    "MorningSync4AM",
    "ProcurementNotices",
    "ContractingAuthorities",
    "ContractingAuthorityMaintenance4AM",
    "TenderAreaMaintenance4AM",
    "Awards",
    "PlannedProcurements",
    "Suppliers",
  ];

  return trackedEndpoints.map((endpoint) => {
    const row = latestByEndpoint.get(endpoint) ?? null;

    if (!row) {
      return {
        endpoint,
        ranAt: null,
        recordsAdded: 0,
        recordsUpdated: 0,
        freshness: "unknown" as const,
      };
    }

    const ageHours = (Date.now() - new Date(row.ran_at).getTime()) / (1000 * 60 * 60);
    const freshness = ageHours <= 30 ? "healthy" : ageHours <= 54 ? "warning" : "stale";

    return {
      endpoint,
      ranAt: row.ran_at,
      recordsAdded: row.records_added,
      recordsUpdated: row.records_updated,
      freshness,
    };
  });
}

function getCommercialSignal(input: {
  subscription: Subscription | null;
  usage: CompanyUsageSnapshot;
  onboardingComplete: boolean;
  hasCompany: boolean;
  lastSignInAt: string | null;
  planId: PlanTier | "none";
}): string {
  if (!input.hasCompany) {
    return "Bez otvorene firme";
  }

  if (!input.onboardingComplete) {
    return "Zastoj u onboardingu";
  }

  if (input.subscription?.status === "past_due") {
    return "Naplata u riziku";
  }

  if (!input.subscription || !ACTIVE_SUBSCRIPTION_STATUSES.has(input.subscription.status)) {
    if (input.usage.activeBids > 0 || input.usage.documentsCount > 0 || isRecordWithinDays(input.lastSignInAt, 14)) {
      return "Spreman za aktivaciju";
    }

    return "Bez aktivne pretplate";
  }

  if (input.planId === "basic" && (input.usage.activeBids > 3 || input.usage.documentsCount > 30)) {
    return "Kandidat za Puni paket";
  }

  if (input.planId === "pro" && (input.usage.activeBids > 15 || input.usage.documentsCount > 120)) {
    return "Kandidat za Agencijski paket";
  }

  if (!isRecordWithinDays(input.usage.lastActivityAt ?? input.lastSignInAt, 30)) {
    return "Niska aktivnost";
  }

  return "Stabilan račun";
}

async function listAllUsers() {
  const admin = createAdminClient();
  const users: User[] = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw new Error(`Ne mogu učitati korisnike: ${error.message}`);
    }

    const batch = data.users ?? [];
    users.push(...batch);

    if (batch.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

export async function loadAdminDashboardData(): Promise<AdminDashboardData> {
  const admin = createAdminClient();
  const [users, companiesResult, subscriptionsResult, documentsResult, bidsResult, tendersResult, authoritiesResult, awardsResult, plannedResult, syncResult] = await Promise.all([
    listAllUsers(),
    admin
      .from("companies")
      .select("id, user_id, name, jib, contact_email, contact_phone, industry, keywords, operating_regions, created_at"),
    admin
      .from("subscriptions")
      .select("id, user_id, lemonsqueezy_variant_id, status, current_period_end, created_at"),
    admin
      .from("documents")
      .select("company_id, size, expires_at, created_at"),
    admin
      .from("bids")
      .select("company_id, status, created_at"),
    admin
      .from("tenders")
      .select("id, deadline, estimated_value, contract_type, status, ai_analysis, created_at"),
    admin
      .from("contracting_authorities")
      .select("id, city, municipality, canton, entity"),
    admin
      .from("award_decisions")
      .select("winning_price, estimated_value, total_bidders_count, award_date, created_at"),
    admin
      .from("planned_procurements")
      .select("estimated_value, planned_date, created_at"),
    admin
      .from("sync_log")
      .select("id, endpoint, last_sync_at, records_added, records_updated, ran_at")
      .order("ran_at", { ascending: false })
      .limit(200),
  ]);

  if (companiesResult.error) {
    throw new Error(`Ne mogu učitati firme: ${companiesResult.error.message}`);
  }
  if (subscriptionsResult.error) {
    throw new Error(`Ne mogu učitati pretplate: ${subscriptionsResult.error.message}`);
  }
  if (documentsResult.error) {
    throw new Error(`Ne mogu učitati dokumente: ${documentsResult.error.message}`);
  }
  if (bidsResult.error) {
    throw new Error(`Ne mogu učitati ponude: ${bidsResult.error.message}`);
  }
  if (tendersResult.error) {
    throw new Error(`Ne mogu učitati tendere: ${tendersResult.error.message}`);
  }
  if (authoritiesResult.error) {
    throw new Error(`Ne mogu učitati naručioce: ${authoritiesResult.error.message}`);
  }
  if (awardsResult.error) {
    throw new Error(`Ne mogu učitati odluke o dodjeli: ${awardsResult.error.message}`);
  }
  if (plannedResult.error) {
    throw new Error(`Ne mogu učitati planirane nabavke: ${plannedResult.error.message}`);
  }
  if (syncResult.error) {
    throw new Error(`Ne mogu učitati sync log: ${syncResult.error.message}`);
  }

  const adminEmailSet = new Set(getAdminEmails().map((email) => email.trim().toLowerCase()));
  const customerUsers = users.filter(
    (user) => !adminEmailSet.has((user.email ?? "").trim().toLowerCase())
  );
  const customerUserIdSet = new Set(customerUsers.map((user) => user.id));

  const companies = ((companiesResult.data ?? []) as Pick<Company, "id" | "user_id" | "name" | "jib" | "contact_email" | "contact_phone" | "industry" | "keywords" | "operating_regions" | "created_at">[]).filter(
    (company) => customerUserIdSet.has(company.user_id)
  );
  const companyIdSet = new Set(companies.map((company) => company.id));
  const subscriptions = ((subscriptionsResult.data ?? []) as Pick<Subscription, "id" | "user_id" | "lemonsqueezy_variant_id" | "status" | "current_period_end" | "created_at">[]).filter(
    (subscription) => customerUserIdSet.has(subscription.user_id)
  );
  const documents = ((documentsResult.data ?? []) as Pick<Document, "company_id" | "size" | "expires_at" | "created_at">[]).filter(
    (document) => companyIdSet.has(document.company_id)
  );
  const bids = ((bidsResult.data ?? []) as Pick<Bid, "company_id" | "status" | "created_at">[]).filter(
    (bid) => companyIdSet.has(bid.company_id)
  );
  const tenders = (tendersResult.data ?? []) as Pick<Tender, "id" | "deadline" | "estimated_value" | "contract_type" | "status" | "ai_analysis" | "created_at">[];
  const authorities = (authoritiesResult.data ?? []) as Pick<ContractingAuthority, "id" | "city" | "municipality" | "canton" | "entity">[];
  const awards = (awardsResult.data ?? []) as Pick<AwardDecision, "winning_price" | "estimated_value" | "total_bidders_count" | "award_date" | "created_at">[];
  const plannedProcurements = (plannedResult.data ?? []) as Pick<PlannedProcurement, "estimated_value" | "planned_date" | "created_at">[];
  const syncRows = (syncResult.data ?? []) as SyncLogRow[];

  const companyByUserId = new Map(companies.map((company) => [company.user_id, company]));
  const subscriptionsByUserId = new Map<string, Subscription[]>();
  const usageByCompanyId = new Map<string, CompanyUsageSnapshot>();
  const industryCounts = new Map<string, number>();
  const planDistributionMap = new Map<PlanTier, AdminPlanDistributionItem>(
    (Object.keys(PLANS) as PlanTier[]).map((planId) => [
      planId,
      {
        planId,
        planName: PLANS[planId].name,
        activeCount: 0,
        pastDueCount: 0,
        estimatedMrr: 0,
      },
    ])
  );

  for (const subscription of subscriptions) {
    const list = subscriptionsByUserId.get(subscription.user_id) ?? [];
    list.push(subscription as Subscription);
    subscriptionsByUserId.set(subscription.user_id, list);
  }

  for (const company of companies) {
    const industryLabel = getPrimaryIndustryLabel(company.industry);
    if (industryLabel) {
      industryCounts.set(industryLabel, (industryCounts.get(industryLabel) ?? 0) + 1);
    }

    usageByCompanyId.set(company.id, {
      documentsCount: 0,
      storageBytes: 0,
      expiringDocuments30d: 0,
      totalBids: 0,
      activeBids: 0,
      submittedBids: 0,
      wonBids: 0,
      lostBids: 0,
      lastActivityAt: null,
    });
  }

  const now = Date.now();
  const in30Days = now + 30 * DAY_MS;
  const in90Days = now + 90 * DAY_MS;

  for (const document of documents) {
    const snapshot = usageByCompanyId.get(document.company_id);
    if (!snapshot) {
      continue;
    }

    snapshot.documentsCount += 1;
    snapshot.storageBytes += Number(document.size) || 0;
    snapshot.lastActivityAt = getLatestDate(snapshot.lastActivityAt, document.created_at);

    if (document.expires_at) {
      const expiryTime = new Date(document.expires_at).getTime();
      if (expiryTime >= now && expiryTime <= in30Days) {
        snapshot.expiringDocuments30d += 1;
      }
    }
  }

  for (const bid of bids) {
    const snapshot = usageByCompanyId.get(bid.company_id);
    if (!snapshot) {
      continue;
    }

    snapshot.totalBids += 1;
    snapshot.lastActivityAt = getLatestDate(snapshot.lastActivityAt, bid.created_at);

    if (["draft", "in_review", "submitted"].includes(bid.status)) {
      snapshot.activeBids += 1;
    }
    if (bid.status === "submitted") {
      snapshot.submittedBids += 1;
    }
    if (bid.status === "won") {
      snapshot.wonBids += 1;
    }
    if (bid.status === "lost") {
      snapshot.lostBids += 1;
    }
  }

  const latestSubscriptionByUserId = new Map<string, Subscription | null>();
  const dashboardRows: AdminDashboardRow[] = customerUsers.map((user) => {
    const company = companyByUserId.get(user.id) ?? null;
    const usage = company ? usageByCompanyId.get(company.id) : null;
    const subscription = pickLatestSubscription(subscriptionsByUserId.get(user.id) ?? []);
    latestSubscriptionByUserId.set(user.id, subscription);
    const isSubscribed = Boolean(subscription && ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status));
    const plan = isSubscribed
      ? getPlanFromVariantId(subscription?.lemonsqueezy_variant_id || null)
      : null;
    const onboardingComplete = company ? isCompanyProfileComplete(company as Company) : false;
    const lastActivityAt = getLatestDate(usage?.lastActivityAt, user.last_sign_in_at ?? null);
    const commercialSignal = getCommercialSignal({
      subscription,
      usage: usage ?? {
        documentsCount: 0,
        storageBytes: 0,
        expiringDocuments30d: 0,
        totalBids: 0,
        activeBids: 0,
        submittedBids: 0,
        wonBids: 0,
        lostBids: 0,
        lastActivityAt: null,
      },
      onboardingComplete,
      hasCompany: Boolean(company),
      lastSignInAt: user.last_sign_in_at ?? null,
      planId: plan?.id ?? "none",
    });
    const { score: healthScore, status: healthStatus } = scoreAccountHealth({
      onboardingStatus: !company ? "Nema firme" : onboardingComplete ? "Završen" : "U toku",
      subscriptionStatus: subscription?.status ?? "inactive",
      lastActivityAt,
      lastSignInAt: user.last_sign_in_at ?? null,
      documentsCount: usage?.documentsCount ?? 0,
      activeBids: usage?.activeBids ?? 0,
      commercialSignal,
    });

    if (plan) {
      const bucket = planDistributionMap.get(plan.id);
      if (bucket) {
        if (subscription?.status === "active") {
          bucket.activeCount += 1;
          bucket.estimatedMrr += plan.price;
        } else if (subscription?.status === "past_due") {
          bucket.pastDueCount += 1;
        }
      }
    }

    return {
      userId: user.id,
      companyId: company?.id ?? null,
      email: user.email ?? "Bez emaila",
      contactEmail: company?.contact_email ?? null,
      contactPhone: company?.contact_phone ?? null,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at ?? null,
      companyName: company?.name ?? null,
      jib: company?.jib ?? null,
      onboardingStatus: !company ? "Nema firme" : onboardingComplete ? "Završen" : "U toku",
      primaryIndustryLabel: company ? getPrimaryIndustryLabel(company.industry) : null,
      regionsLabel: getRegionsLabel(company),
      planName: plan?.name ?? "Bez aktivne pretplate",
      planId: plan?.id ?? "none",
      subscriptionStatus: subscription?.status ?? "inactive",
      subscriptionEndsAt: subscription?.current_period_end ?? null,
      documentsCount: usage?.documentsCount ?? 0,
      activeBids: usage?.activeBids ?? 0,
      totalBids: usage?.totalBids ?? 0,
      storageBytes: usage?.storageBytes ?? 0,
      lastActivityAt,
      commercialSignal,
      healthScore,
      healthStatus,
    };
  });

  const totalUsers = customerUsers.length;
  const companiesCount = companies.length;
  const completedProfiles = companies.filter((company) => isCompanyProfileComplete(company as Company)).length;
  const activeSubscriptions = dashboardRows.filter((row) => row.subscriptionStatus === "active").length;
  const pastDueSubscriptions = dashboardRows.filter((row) => row.subscriptionStatus === "past_due").length;
  const estimatedActiveMrr = [...planDistributionMap.values()].reduce((sum, item) => sum + item.estimatedMrr, 0);
  const estimatedAtRiskMrr = dashboardRows.reduce((sum, row) => {
    if (row.subscriptionStatus !== "past_due") {
      return sum;
    }

    return sum + (row.planId !== "none" ? PLANS[row.planId].price : 0);
  }, 0);

  const totalDocuments = documents.length;
  const totalStorageBytes = documents.reduce((sum, document) => sum + (Number(document.size) || 0), 0);
  const expiringDocuments30d = [...usageByCompanyId.values()].reduce((sum, usage) => sum + usage.expiringDocuments30d, 0);
  const totalBids = bids.length;
  const activeBids = [...usageByCompanyId.values()].reduce((sum, usage) => sum + usage.activeBids, 0);
  const submittedBids = [...usageByCompanyId.values()].reduce((sum, usage) => sum + usage.submittedBids, 0);
  const wonBids = [...usageByCompanyId.values()].reduce((sum, usage) => sum + usage.wonBids, 0);
  const lostBids = [...usageByCompanyId.values()].reduce((sum, usage) => sum + usage.lostBids, 0);
  const winRate = wonBids + lostBids > 0 ? Math.round((wonBids / (wonBids + lostBids)) * 100) : null;

  const openTendersList = tenders.filter((tender) => {
    if (!tender.deadline) {
      return false;
    }

    return new Date(tender.deadline).getTime() >= now;
  });
  const openTenders = openTendersList.length;
  const openTenderValue = openTendersList.reduce((sum, tender) => sum + (Number(tender.estimated_value) || 0), 0);
  const missingTenderAreas = tenders.filter((tender) => !hasAreaLabel(tender.ai_analysis)).length;
  const authoritiesMissingGeo = authorities.filter(
    (authority) => !authority.city && !authority.municipality && !authority.canton && !authority.entity
  ).length;

  const plannedProcurements90d = plannedProcurements.filter((plan) => {
    if (!plan.planned_date) {
      return false;
    }

    const planTime = new Date(plan.planned_date).getTime();
    return planTime >= now && planTime <= in90Days;
  });
  const plannedValue90d = plannedProcurements90d.reduce(
    (sum, plan) => sum + (Number(plan.estimated_value) || 0),
    0
  );

  const awards30dRows = awards.filter((award) => {
    const baseDate = award.award_date ?? award.created_at;
    return isRecordWithinDays(baseDate, 30);
  });
  const awards30d = awards30dRows.length;
  const averageBidders30d = awards30dRows.filter((award) => award.total_bidders_count !== null).length > 0
    ? Number(
        (
          awards30dRows.reduce((sum, award) => sum + (award.total_bidders_count || 0), 0) /
          awards30dRows.filter((award) => award.total_bidders_count !== null).length
        ).toFixed(1)
      )
    : null;
  const realizedMarketValue30d = awards30dRows.reduce(
    (sum, award) => sum + (Number(award.winning_price) || 0),
    0
  );

  const newUsers30d = customerUsers.filter((user) => isRecordWithinDays(user.created_at, 30)).length;
  const signedInLast7Days = customerUsers.filter((user) => isRecordWithinDays(user.last_sign_in_at, 7)).length;
  const companySetupRate = totalUsers > 0 ? Math.round((companiesCount / totalUsers) * 100) : 0;
  const profileCompletionRate = companiesCount > 0 ? Math.round((completedProfiles / companiesCount) * 100) : 0;
  const payingConversionRate = totalUsers > 0 ? Math.round(((activeSubscriptions + pastDueSubscriptions) / totalUsers) * 100) : 0;
  const in7Days = now + 7 * DAY_MS;
  const renewalsNext30d = subscriptions.filter(
    (subscription) =>
      ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status) &&
      subscription.current_period_end &&
      new Date(subscription.current_period_end).getTime() >= now &&
      new Date(subscription.current_period_end).getTime() <= in30Days
  ).length;
  const renewalsNext7d = subscriptions.filter(
    (subscription) =>
      ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status) &&
      subscription.current_period_end &&
      new Date(subscription.current_period_end).getTime() >= now &&
      new Date(subscription.current_period_end).getTime() <= in7Days
  ).length;
  const newPaying30d = subscriptions.filter(
    (subscription) => ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status) && isRecordWithinDays(subscription.created_at, 30)
  ).length;
  const cancelledSubscriptions = dashboardRows.filter((row) => row.subscriptionStatus === "cancelled").length;
  const inactiveAccounts = dashboardRows.filter((row) => row.subscriptionStatus === "inactive").length;
  const estimatedCollectionNext30d = subscriptions.reduce((sum, subscription) => {
    if (
      subscription.status !== "active" ||
      !subscription.current_period_end ||
      new Date(subscription.current_period_end).getTime() < now ||
      new Date(subscription.current_period_end).getTime() > in30Days
    ) {
      return sum;
    }

    return sum + getPlanFromVariantId(subscription.lemonsqueezy_variant_id || null).price;
  }, 0);

  const upgradeCandidates = dashboardRows.filter((row) =>
    row.commercialSignal === "Kandidat za Puni paket" || row.commercialSignal === "Kandidat za Agencijski paket"
  ).length;
  const reactivationTargets = dashboardRows.filter(
    (row) =>
      row.commercialSignal === "Spreman za aktivaciju" &&
      row.onboardingStatus === "Završen" &&
      isRecordWithinDays(row.lastSignInAt, 30)
  ).length;
  const onboardingStalls = dashboardRows.filter(
    (row) => row.onboardingStatus !== "Završen" && isRecordWithinDays(row.createdAt, 30) === false
  ).length;
  const highIntentAccounts = dashboardRows.filter(
    (row) => row.activeBids > 0 || row.documentsCount >= 5
  ).length;

  const dailySeed = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now - (6 - index) * DAY_MS);
    return {
      key: toDateKey(date),
      label: formatDayLabel(date),
      signups: 0,
      companySetups: 0,
      newPaying: 0,
      activeUsers: 0,
      newBids: 0,
      submittedBids: 0,
      newDocuments: 0,
    };
  });
  const dailyMap = new Map(dailySeed.map((point) => [point.key, point]));

  for (const user of customerUsers) {
    const signupPoint = dailyMap.get(toDateKey(user.created_at));
    if (signupPoint) {
      signupPoint.signups += 1;
    }

    if (user.last_sign_in_at) {
      const activePoint = dailyMap.get(toDateKey(user.last_sign_in_at));
      if (activePoint) {
        activePoint.activeUsers += 1;
      }
    }
  }

  for (const company of companies) {
    const companyPoint = dailyMap.get(toDateKey(company.created_at));
    if (companyPoint) {
      companyPoint.companySetups += 1;
    }
  }

  for (const subscription of subscriptions) {
    if (!ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
      continue;
    }

    const payingPoint = dailyMap.get(toDateKey(subscription.created_at));
    if (payingPoint) {
      payingPoint.newPaying += 1;
    }
  }

  for (const bid of bids) {
    const bidPoint = dailyMap.get(toDateKey(bid.created_at));
    if (!bidPoint) {
      continue;
    }

    bidPoint.newBids += 1;
    if (bid.status === "submitted") {
      bidPoint.submittedBids += 1;
    }
  }

  for (const document of documents) {
    const documentPoint = dailyMap.get(toDateKey(document.created_at));
    if (documentPoint) {
      documentPoint.newDocuments += 1;
    }
  }

  const cohortSeed = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(new Date().getFullYear(), new Date().getMonth() - (5 - index), 1);
    return {
      key: toMonthKey(date),
      label: formatMonthLabel(date),
      signups: 0,
      companySetups: 0,
      onboarded: 0,
      paying: 0,
    };
  });
  const cohortMap = new Map(cohortSeed.map((point) => [point.key, point]));

  for (const user of customerUsers) {
    const point = cohortMap.get(toMonthKey(user.created_at));
    if (point) {
      point.signups += 1;
    }
  }

  for (const company of companies) {
    const point = cohortMap.get(toMonthKey(company.created_at));
    if (!point) {
      continue;
    }

    point.companySetups += 1;
    if (isCompanyProfileComplete(company as Company)) {
      point.onboarded += 1;
    }
  }

  for (const subscription of subscriptions) {
    if (!ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
      continue;
    }

    const point = cohortMap.get(toMonthKey(subscription.created_at));
    if (point) {
      point.paying += 1;
    }
  }

  const companiesWithDocuments = [...usageByCompanyId.values()].filter((usage) => usage.documentsCount > 0).length;
  const companiesWithBids = [...usageByCompanyId.values()].filter((usage) => usage.totalBids > 0).length;
  const averageDocumentsPerCompany = companiesCount > 0 ? Number((totalDocuments / companiesCount).toFixed(1)) : 0;
  const averageBidsPerCompany = companiesCount > 0 ? Number((totalBids / companiesCount).toFixed(1)) : 0;
  const bidSubmissionRate = totalBids > 0 ? Math.round((submittedBids / totalBids) * 100) : 0;
  const tenderCaptureRate = openTenders > 0 ? Math.round((activeBids / openTenders) * 100) : 0;

  const healthyAccounts = dashboardRows.filter((row) => row.healthStatus === "Odličan").length;
  const attentionAccounts = dashboardRows.filter((row) => row.healthStatus === "Pažnja").length;
  const riskAccounts = dashboardRows.filter((row) => row.healthStatus === "Rizik").length;

  const atRiskAccounts = [...dashboardRows]
    .filter(
      (row) =>
        row.subscriptionStatus === "past_due" ||
        row.healthStatus === "Rizik" ||
        row.commercialSignal === "Naplata u riziku"
    )
    .sort((a, b) => a.healthScore - b.healthScore || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(0, 8);

  const expansionAccounts = [...dashboardRows]
    .filter((row) => row.commercialSignal.includes("Kandidat"))
    .sort((a, b) => b.healthScore - a.healthScore || b.activeBids - a.activeBids || b.documentsCount - a.documentsCount)
    .slice(0, 8);

  const recentlyActivatedAccounts = [...dashboardRows]
    .filter((row) => {
      const latestSubscription = latestSubscriptionByUserId.get(row.userId);
      return Boolean(latestSubscription?.status === "active" && isRecordWithinDays(latestSubscription.created_at, 30));
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  const crmAccounts = dashboardRows
    .map<AdminCrmAccount>((row) => ({
      ...row,
      ...deriveCrmProfile(row),
    }))
    .sort((a, b) => {
      const priorityDiff = getCrmPriorityRank(b.outreachPriority) - getCrmPriorityRank(a.outreachPriority);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      const stageDiff = getCrmStageRank(b.outreachStage) - getCrmStageRank(a.outreachStage);
      if (stageDiff !== 0) {
        return stageDiff;
      }

      return new Date(b.lastActivityAt ?? b.createdAt).getTime() - new Date(a.lastActivityAt ?? a.createdAt).getTime();
    });

  const newLeads = crmAccounts.filter((account) => account.outreachStage === "Novi lead").slice(0, 12);
  const activationQueue = crmAccounts.filter((account) => account.outreachStage === "Aktivacija").slice(0, 12);
  const retentionQueue = crmAccounts.filter((account) => account.outreachStage === "Retention").slice(0, 12);
  const expansionQueue = crmAccounts.filter((account) => account.outreachStage === "Ekspanzija").slice(0, 12);
  const companiesWithContacts = crmAccounts.filter(
    (account) => Boolean(account.contactEmail || account.contactPhone)
  ).length;
  const missingContactChannels = crmAccounts.filter(
    (account) => account.companyName && !account.contactEmail && !account.contactPhone
  ).length;

  const recentUsers = [...dashboardRows]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 12);
  const portfolioAccounts = [...dashboardRows]
    .filter((row) => row.companyName)
    .sort((a, b) => {
      const activityDiff = (b.activeBids + b.documentsCount) - (a.activeBids + a.documentsCount);
      if (activityDiff !== 0) {
        return activityDiff;
      }

      return b.healthScore - a.healthScore || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 12);
  const topIndustries = [...industryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, companies]) => ({ label, companies }));

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalUsers,
      newUsers30d,
      companiesCount,
      completedProfiles,
      activeSubscriptions,
      pastDueSubscriptions,
      estimatedActiveMrr,
      estimatedAtRiskMrr,
      activeBids,
      openTenders,
    },
    funnel: {
      signedInLast7Days,
      companySetupRate,
      profileCompletionRate,
      payingConversionRate,
    },
    revenue: {
      estimatedActiveMrr,
      estimatedAtRiskMrr,
      projectedArr: estimatedActiveMrr * 12,
      renewalsNext30d,
      newPaying30d,
    },
    planDistribution: [...planDistributionMap.values()],
    topIndustries,
    recentUsers,
    portfolioAccounts,
    businessSignals: {
      upgradeCandidates,
      reactivationTargets,
      onboardingStalls,
      highIntentAccounts,
    },
    dailyOverview: dailySeed.map((point) => ({
      label: point.label,
      signups: point.signups,
      companySetups: point.companySetups,
      newPaying: point.newPaying,
      activeUsers: point.activeUsers,
      newBids: point.newBids,
      submittedBids: point.submittedBids,
      newDocuments: point.newDocuments,
    })),
    cohorts: cohortSeed.map((point) => ({
      label: point.label,
      signups: point.signups,
      companySetups: point.companySetups,
      onboarded: point.onboarded,
      paying: point.paying,
    })),
    financeAudit: {
      inactiveAccounts,
      cancelledSubscriptions,
      renewalsNext7d,
      renewalsNext30d,
      estimatedCollectionNext30d,
    },
    customerHealth: {
      healthyAccounts,
      attentionAccounts,
      riskAccounts,
      atRiskAccounts,
      expansionAccounts,
      recentlyActivatedAccounts,
    },
    productUsage: {
      companiesWithDocuments,
      companiesWithBids,
      averageDocumentsPerCompany,
      averageBidsPerCompany,
      bidSubmissionRate,
      tenderCaptureRate,
    },
    crm: {
      totalAccounts: crmAccounts.length,
      companiesWithContacts,
      missingContactChannels,
      newLeadsCount: newLeads.length,
      activationQueueCount: activationQueue.length,
      retentionQueueCount: retentionQueue.length,
      expansionQueueCount: expansionQueue.length,
      accounts: crmAccounts,
      newLeads,
      activationQueue,
      retentionQueue,
      expansionQueue,
    },
    operations: {
      totalDocuments,
      totalStorageBytes,
      expiringDocuments30d,
      totalBids,
      submittedBids,
      wonBids,
      lostBids,
      winRate,
      totalTenders: tenders.length,
      openTenders,
      openTenderValue,
      missingTenderAreas,
      authoritiesMissingGeo,
      plannedProcurements90d: plannedProcurements90d.length,
      plannedValue90d,
      awards30d,
      averageBidders30d,
      realizedMarketValue30d,
      syncStatuses: buildSyncStatuses(syncRows),
    },
    roadmap: [],
  };
}
