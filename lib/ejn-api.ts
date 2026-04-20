// ============================================================
// BiH e-Procurement (EJN) OData API Client
// https://open.ejn.gov.ba
// ============================================================

const BASE_URL = process.env.EJN_API_BASE_URL || "https://open.ejn.gov.ba";
const PAGE_SIZE = 50;
const MAX_PAGES = 10_000;

// --- Normalized types (what our sync module expects) ---

export interface EjnProcurementNotice {
  NoticeId: string;
  Title: string;
  ContractingAuthorityName: string | null;
  ContractingAuthorityJib: string | null;
  Deadline: string | null;
  EstimatedValue: number | null;
  ContractType: string | null;
  ProcedureType: string | null;
  Status: string | null;
  NoticeUrl: string | null;
  Description: string | null;
  /**
   * 8-digit CPV code derived from the main Lot of this procedure.
   * Populated by `enrichNoticesWithCpvCodes`; null when the notice has no
   * main-CPV link (EJN allows this for some legacy procedures).
   */
  CpvCode: string | null;
}

export interface EjnAwardNotice {
  AwardId: string;
  ProcedureId: string | null;
  NoticeId: string | null;
  ProcedureName: string | null;
  NoticeUrl: string | null;
  ContractingAuthorityName: string | null;
  ContractingAuthorityJib: string | null;
  WinnerName: string | null;
  WinnerJib: string | null;
  WinningPrice: number | null;
  EstimatedValue: number | null;
  TotalBiddersCount: number | null;
  ProcedureType: string | null;
  ContractType: string | null;
  AwardDate: string | null;
}

export interface EjnAwardedSupplierGroup {
  SupplierGroupId: string;
  LotId: string | null;
}

export interface EjnSupplierGroupSupplierLink {
  SupplierGroupId: string;
  SupplierId: string;
  IsLead: boolean;
}

export interface EjnContractingAuthority {
  AuthorityId: string;
  Name: string;
  Jib: string;
  City: string | null;
  Entity: string | null;
  Canton: string | null;
  Municipality: string | null;
  AuthorityType: string | null;
  ActivityType: string | null;
}

export interface EjnSupplier {
  SupplierId: string | null;
  Name: string;
  Jib: string;
  City: string | null;
  Municipality: string | null;
}

export interface EjnPlannedProcurement {
  PlanId: string;
  ContractingAuthorityId: string | null;
  Description: string | null;
  EstimatedValue: number | null;
  PlannedDate: string | null;
  ContractType: string | null;
  CpvCode: string | null;
}

// --- Retry helper ---

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxAttempts = 3,
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, options);

      // Don't retry client errors (4xx) — they won't resolve with a retry
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        return res;
      }

      // 5xx — save error and retry after backoff
      lastError = new Error(`EJN HTTP ${res.status}`);
    } catch (error) {
      // Network / DNS error
      lastError = error;
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** (attempt - 1)));
    }
  }

  throw lastError;
}

function normalizeNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value
      .replace(/\./g, "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, "")
      .trim();

    if (!normalized) {
      return null;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

// --- OData pagination helper ---

interface ODataResponse<T> {
  value: T[];
  "@odata.nextLink"?: string;
  "@odata.count"?: number;
}

async function fetchODataPages<T>(
  endpoint: string,
  orderBy: string = "Id desc",
  filter?: string,
): Promise<T[]> {
  const all: T[] = [];
  let nextUrl: string | null = null;
  let skip = 0;
  let pages = 0;

  while (pages < MAX_PAGES) {
    const url = nextUrl ?? (() => {
      const params = new URLSearchParams({
        $top: String(PAGE_SIZE),
        $skip: String(skip),
        $orderby: orderBy,
      });

      if (filter) {
        params.set("$filter", filter);
      }

      return `${BASE_URL}${endpoint}?${params.toString()}`;
    })();

    const res = await fetchWithRetry(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `EJN API error: ${res.status} ${res.statusText} — ${endpoint} — ${text.slice(0, 200)}`
      );
    }

    const data: ODataResponse<T> = await res.json();
    const items = data.value ?? [];
    all.push(...items);

    pages++;

    const nextLink = data["@odata.nextLink"];
    if (nextLink) {
      nextUrl = nextLink.startsWith("http") ? nextLink : `${BASE_URL}${nextLink}`;
      continue;
    }

    if (items.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  return all;
}

// --- Contract type / procedure type translation ---

const CONTRACT_TYPE_MAP: Record<string, string> = {
  Goods: "Robe",
  Services: "Usluge",
  Works: "Radovi",
};

const PROCEDURE_TYPE_MAP: Record<string, string> = {
  OpenProcedure: "Otvoreni postupak",
  RestrictedProcedure: "Ograničeni postupak",
  NegotiatedProcedure: "Pregovarački postupak",
  CompetitiveRequest: "Konkurentski zahtjev",
  DirectAgreement: "Direktni sporazum",
  CompetitiveDialogue: "Konkurentski dijalog",
};

function buildLastUpdatedFilter(lastSyncAt?: string | null): string | undefined {
  return lastSyncAt?.trim() ? `LastUpdated ge ${lastSyncAt}` : undefined;
}

function joinNonEmpty(parts: Array<string | null | undefined>): string | null {
  const normalized = parts.map((part) => part?.trim()).filter(Boolean);
  return normalized.length > 0 ? normalized.join("\n\n") : null;
}

function mapAwardNotice(r: Record<string, unknown>): EjnAwardNotice {
  const procedureOrNoticeId = r.ProcedureId ?? r.NoticeId ?? null;
  const procedureHref = procedureOrNoticeId ? `https://next.ejn.gov.ba/procedures/${String(procedureOrNoticeId)}/overview` : null;

  return {
    AwardId: String(r.Id ?? ""),
    ProcedureId: r.ProcedureId ? String(r.ProcedureId) : null,
    NoticeId: r.NoticeId ? String(r.NoticeId) : r.ProcedureId ? String(r.ProcedureId) : null,
    ProcedureName:
      typeof r.ProcedureName === "string"
        ? r.ProcedureName
        : typeof r.ProcedureNumber === "string"
          ? r.ProcedureNumber
          : null,
    NoticeUrl: procedureHref,
    ContractingAuthorityName: typeof r.ContractingAuthorityName === "string" ? r.ContractingAuthorityName : null,
    ContractingAuthorityJib: typeof r.ContractingAuthorityTaxNumber === "string" ? r.ContractingAuthorityTaxNumber : null,
    WinnerName: null,
    WinnerJib: null,
    WinningPrice: normalizeNullableNumber(r.Value),
    EstimatedValue: normalizeNullableNumber(
      r.EstimatedValueTotal ?? r.EstimatedValue ?? r.HighestAcceptableOfferValue ?? r.LowestAcceptableOfferValue
    ),
    TotalBiddersCount:
      typeof r.NumberOfReceivedOffers === "number"
        ? r.NumberOfReceivedOffers
        : typeof r.NumberOfAcceptableOffers === "number"
          ? r.NumberOfAcceptableOffers
          : null,
    ProcedureType: PROCEDURE_TYPE_MAP[String(r.ProcedureType ?? "")] || (typeof r.ProcedureType === "string" ? r.ProcedureType : null),
    ContractType: CONTRACT_TYPE_MAP[String(r.ContractType ?? "")] || (typeof r.ContractType === "string" ? r.ContractType : null),
    AwardDate:
      typeof r.ContractDate === "string"
        ? r.ContractDate
        : typeof r.AwardDate === "string"
          ? r.AwardDate
          : null,
  };
}

function buildNumericIdFilter(fieldName: string, ids: string[]): string | undefined {
  const normalizedIds = ids.filter((id) => /^\d+$/.test(id));

  if (normalizedIds.length === 0) {
    return undefined;
  }

  return normalizedIds.map((id) => `${fieldName} eq ${id}`).join(" or ");
}

// --- Public API functions ---

export async function fetchProcurementNotices(
  lastSyncAt?: string | null
): Promise<EjnProcurementNotice[]> {
  const nowIso = new Date().toISOString();

  // Always fetch ALL tenders with future deadlines so we never have gaps
  // in active tender coverage (~2K items ≈ 40 pages, well within budget).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeRaw = await fetchODataPages<any>(
    "/ProcurementNotices",
    "Id desc",
    `ApplicationDeadlineDateTime gt ${nowIso}`
  );

  // Additionally fetch anything updated since last sync (status changes,
  // extended deadlines, newly expired tenders, etc.).
  let incrementalRaw: Array<Record<string, unknown>> = [];
  if (lastSyncAt?.trim()) {
    incrementalRaw = await fetchODataPages<Record<string, unknown>>(
      "/ProcurementNotices",
      "Id desc",
      `LastUpdated ge ${lastSyncAt}`
    );
  }

  return mapAndEnrichNoticeRaws([...activeRaw, ...incrementalRaw]);
}

/**
 * Dohvata historijske tendere (expired) u datom opsegu po ApplicationDeadlineDateTime.
 * Koristi se iz backfill skripte da se popuni `tenders` tablica tenderima koji
 * su zavrsili prije pokretanja sinhronizacije. Date range se preporuča dijeliti
 * na kvartale (EJN OData MAX_PAGES budget ~500K items).
 *
 * @param fromIso ISO datum "from" (inclusive). null = bez donje granice
 * @param toIso   ISO datum "to" (exclusive). null = do sada
 */
export async function fetchProcurementNoticesInDateRange(
  fromIso: string | null,
  toIso: string | null
): Promise<EjnProcurementNotice[]> {
  const conditions: string[] = [];
  if (fromIso) conditions.push(`ApplicationDeadlineDateTime ge ${fromIso}`);
  if (toIso) conditions.push(`ApplicationDeadlineDateTime lt ${toIso}`);
  const filter = conditions.length > 0 ? conditions.join(" and ") : undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await fetchODataPages<any>("/ProcurementNotices", "Id desc", filter);
  return mapAndEnrichNoticeRaws(raw);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function mapAndEnrichNoticeRaws(raws: any[]): Promise<EjnProcurementNotice[]> {
  // Merge & deduplicate by Id
  const seenIds = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const merged: any[] = [];
  for (const item of raws) {
    const id = String(item.Id ?? item.ProcedureId ?? "");
    if (id && !seenIds.has(id)) {
      seenIds.add(id);
      merged.push(item);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapped: EjnProcurementNotice[] = merged.map((r: any) => ({
    NoticeId: String(r.Id ?? r.ProcedureId ?? ""),
    Title: r.ProcedureName || r.ProcedureNumber || "Bez naziva",
    ContractingAuthorityName: r.ContractingAuthorityName || null,
    ContractingAuthorityJib: r.ContractingAuthorityTaxNumber || null,
    Deadline: r.ApplicationDeadlineDateTime || null,
    EstimatedValue: normalizeNullableNumber(
      r.EstimatedValueTotal ?? r.EstimatedValue ?? r.HighestAcceptableOfferValue ?? r.LowestAcceptableOfferValue
    ),
    ContractType: CONTRACT_TYPE_MAP[r.ContractType] || r.ContractType || null,
    ProcedureType: PROCEDURE_TYPE_MAP[r.ProcedureType] || r.ProcedureType || null,
    Status: null,
    NoticeUrl: r.Id ? `https://next.ejn.gov.ba/procedures/${r.Id}/overview` : null,
    Description: joinNonEmpty([
      r.AdditionalInformation,
      r.ParticipationRestrictions,
      r.ProfessionalActivity,
      r.EconomicAbility,
      r.TechnicalAbility,
      r.PaymentRequirements,
    ]),
    CpvCode: null,
  }));

  // Populate CpvCode for every notice via Lots → LotCpvCodeLinks → CpvCodes
  await enrichNoticesWithCpvCodes(mapped);
  return mapped;
}

// ── CPV enrichment ────────────────────────────────────────────────────
//
// EJN OData does not expose a CPV code directly on `ProcurementNotices`.
// The relationship is:
//
//   ProcurementNotice.Id == Procedure.Id
//     └─ Lots (ProcedureId == Procedure.Id)
//         └─ LotCpvCodeLinks (LotId == Lot.Id, IsMain == true)
//             └─ CpvCodes (Id == CpvCodeId)  →  "45000000-7"
//
// $expand is NOT supported by the EJN OData endpoint, so we fetch the
// three auxiliary tables and join them in memory.
//
// Called once after `fetchProcurementNotices`; also usable standalone from
// a backfill script (`scripts/backfill-tender-cpv.mjs`).

async function fetchAllCpvCodes(): Promise<Map<number, string>> {
  // ~9000 rows, static reference data. One-shot paginated fetch.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await fetchODataPages<any>("/CpvCodes", "Id desc");
  const map = new Map<number, string>();
  for (const r of rows) {
    const id = typeof r.Id === "number" ? r.Id : Number(r.Id);
    const code = typeof r.Code === "string" ? r.Code : "";
    const digits = code.replace(/[^0-9]/g, "").slice(0, 8);
    if (Number.isFinite(id) && digits.length >= 5) map.set(id, digits);
  }
  return map;
}

async function fetchLotsByProcedureIds(
  procedureIds: number[]
): Promise<Array<{ Id: number; ProcedureId: number }>> {
  const out: Array<{ Id: number; ProcedureId: number }> = [];
  // EJN OData enforces MaxNodeCount=100 on $filter. Empirically 25 IDs
  // rejects with HTTP 400; 20 works. AST ≈ 4N−1 plus internal nodes.
  const chunkSize = 20;
  for (let i = 0; i < procedureIds.length; i += chunkSize) {
    const batch = procedureIds.slice(i, i + chunkSize);
    const filter = batch.map((id) => `ProcedureId eq ${id}`).join(" or ");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await fetchODataPages<any>("/Lots", "Id desc", filter);
    for (const r of rows) {
      const id = typeof r.Id === "number" ? r.Id : Number(r.Id);
      const pid = typeof r.ProcedureId === "number" ? r.ProcedureId : Number(r.ProcedureId);
      if (Number.isFinite(id) && Number.isFinite(pid)) out.push({ Id: id, ProcedureId: pid });
    }
  }
  return out;
}

async function fetchMainCpvLinksByLotIds(
  lotIds: number[]
): Promise<Array<{ LotId: number; CpvCodeId: number }>> {
  const out: Array<{ LotId: number; CpvCodeId: number }> = [];
  // Same MaxNodeCount=100 constraint plus an extra `and IsMain eq true`
  // (~4 nodes), so 18 IDs stays safely under the cap.
  const chunkSize = 18;
  for (let i = 0; i < lotIds.length; i += chunkSize) {
    const batch = lotIds.slice(i, i + chunkSize);
    const filter = `(${batch.map((id) => `LotId eq ${id}`).join(" or ")}) and IsMain eq true`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await fetchODataPages<any>("/LotCpvCodeLinks", "Id desc", filter);
    for (const r of rows) {
      const lotId = typeof r.LotId === "number" ? r.LotId : Number(r.LotId);
      const cpvId = typeof r.CpvCodeId === "number" ? r.CpvCodeId : Number(r.CpvCodeId);
      if (Number.isFinite(lotId) && Number.isFinite(cpvId)) {
        out.push({ LotId: lotId, CpvCodeId: cpvId });
      }
    }
  }
  return out;
}

/**
 * Fills `CpvCode` on each notice that does not already have one.
 * Exported so that backfill scripts can reuse it on arbitrary notice sets.
 */
export async function enrichNoticesWithCpvCodes(
  notices: Array<Pick<EjnProcurementNotice, "NoticeId"> & { CpvCode: string | null }>
): Promise<void> {
  const needCpv = notices.filter((n) => !n.CpvCode);
  if (needCpv.length === 0) return;

  const procedureIds = Array.from(
    new Set(
      needCpv
        .map((n) => Number(n.NoticeId))
        .filter((n) => Number.isFinite(n) && n > 0)
    )
  );
  if (procedureIds.length === 0) return;

  const [cpvCodeMap, lots] = await Promise.all([
    fetchAllCpvCodes(),
    fetchLotsByProcedureIds(procedureIds),
  ]);

  const lotIds = Array.from(new Set(lots.map((l) => l.Id)));
  if (lotIds.length === 0) return;

  const links = await fetchMainCpvLinksByLotIds(lotIds);

  // lotId → 8-digit CPV code (first IsMain link wins)
  const lotToCpv = new Map<number, string>();
  for (const l of links) {
    if (lotToCpv.has(l.LotId)) continue;
    const code = cpvCodeMap.get(l.CpvCodeId);
    if (code) lotToCpv.set(l.LotId, code);
  }

  // procedureId → first resolvable main CPV across its lots
  const procToCpv = new Map<number, string>();
  for (const lot of lots) {
    if (procToCpv.has(lot.ProcedureId)) continue;
    const code = lotToCpv.get(lot.Id);
    if (code) procToCpv.set(lot.ProcedureId, code);
  }

  for (const n of notices) {
    if (n.CpvCode) continue;
    const pid = Number(n.NoticeId);
    const cpv = Number.isFinite(pid) ? procToCpv.get(pid) : undefined;
    if (cpv) n.CpvCode = cpv;
  }
}

export async function fetchAwardNotices(
  lastSyncAt?: string | null
): Promise<EjnAwardNotice[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await fetchODataPages<any>(
    "/Awards",
    "Id desc",
    buildLastUpdatedFilter(lastSyncAt)
  );

  return raw.map((row) => mapAwardNotice(row as Record<string, unknown>));
}

export async function fetchAwardNoticesByIds(awardIds: string[]): Promise<EjnAwardNotice[]> {
  if (awardIds.length === 0) {
    return [];
  }

  const batches: string[][] = [];
  for (let index = 0; index < awardIds.length; index += 20) {
    batches.push(awardIds.slice(index, index + 20));
  }

  // OPT 6: Parallel batch requests instead of sequential for loop
  const batchResults = await Promise.all(
    batches.map(async (batch) => {
      const filter = buildNumericIdFilter("Id", batch);
      if (!filter) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = await fetchODataPages<any>("/Awards", "Id desc", filter);
      return raw.map((row) => mapAwardNotice(row as Record<string, unknown>));
    })
  );

  return batchResults.flat();
}

export async function fetchAwardedSupplierGroups(
  lastSyncAt?: string | null
): Promise<EjnAwardedSupplierGroup[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await fetchODataPages<any>(
    "/SupplierGroups",
    "Id desc",
    ["IsAwarded eq true", buildLastUpdatedFilter(lastSyncAt)].filter(Boolean).join(" and ")
  );

  return raw.map((r) => ({
    SupplierGroupId: String(r.Id ?? ""),
    LotId: r.LotId ? String(r.LotId) : null,
  }));
}

export async function fetchSupplierGroupSupplierLinks(
  supplierGroupIds: string[]
): Promise<EjnSupplierGroupSupplierLink[]> {
  if (supplierGroupIds.length === 0) {
    return [];
  }

  const batches: string[][] = [];
  for (let index = 0; index < supplierGroupIds.length; index += 10) {
    batches.push(supplierGroupIds.slice(index, index + 10));
  }

  // OPT 6: Parallel batch requests
  const batchResults = await Promise.all(
    batches.map(async (batch) => {
      const filter = batch
        .map((groupId) => `SupplierGroupId eq ${groupId}`)
        .join(" or ");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = await fetchODataPages<any>(
        "/SupplierGroupSupplierLinks",
        "Id desc",
        filter
      );

      return raw.map((r) => ({
        SupplierGroupId: String(r.SupplierGroupId ?? ""),
        SupplierId: String(r.SupplierId ?? ""),
        IsLead: Boolean(r.IsLead),
      }));
    })
  );

  return batchResults.flat();
}

export async function fetchContractingAuthorities(
  lastSyncAt?: string | null
): Promise<EjnContractingAuthority[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await fetchODataPages<any>(
    "/ContractingAuthorities",
    "Id desc",
    buildLastUpdatedFilter(lastSyncAt)
  );

  return raw.map((r) => ({
    AuthorityId: String(r.Id ?? ""),
    Name: r.Name || "Nepoznato",
    Jib: r.TaxNumber || "",
    City: r.CityName || null,
    Entity: r.AdministrativeUnitType || null,
    Canton: r.AdministrativeUnitName || null,
    Municipality: null,
    AuthorityType: r.AuthorityType || null,
    ActivityType: r.ActivityTypeName || null,
  }));
}

export async function fetchSuppliers(
  lastSyncAt?: string | null
): Promise<EjnSupplier[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await fetchODataPages<any>(
    "/Suppliers",
    "Id desc",
    buildLastUpdatedFilter(lastSyncAt)
  );

  return raw.map((r) => ({
    SupplierId: String(r.Id ?? ""),
    Name: r.Name || "Nepoznato",
    Jib: r.TaxNumber || r.Jib || "",
    City: r.CityName || null,
    Municipality: null,
  }));
}

export async function fetchSuppliersByIds(
  supplierIds: string[]
): Promise<EjnSupplier[]> {
  if (supplierIds.length === 0) {
    return [];
  }

  const batches: string[][] = [];
  for (let index = 0; index < supplierIds.length; index += 10) {
    batches.push(supplierIds.slice(index, index + 10));
  }

  // OPT 6: Parallel batch requests
  const batchResults = await Promise.all(
    batches.map(async (batch) => {
      const filter = batch.map((supplierId) => `Id eq ${supplierId}`).join(" or ");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = await fetchODataPages<any>(
        "/Suppliers",
        "Id desc",
        filter
      );

      return raw.map((r) => ({
        SupplierId: String(r.Id ?? ""),
        Name: r.Name || "Nepoznato",
        Jib: r.TaxNumber || r.Jib || "",
        City: r.CityName || null,
        Municipality: null,
      }));
    })
  );

  return batchResults.flat();
}

export async function fetchPlannedProcurements(
  lastSyncAt?: string | null
): Promise<EjnPlannedProcurement[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await fetchODataPages<any>(
    "/PlannedProcurements",
    "Id desc",
    buildLastUpdatedFilter(lastSyncAt)
  );

  return raw.map((r) => ({
    PlanId: String(r.Id ?? ""),
    ContractingAuthorityId: r.ContractingAuthorityId ? String(r.ContractingAuthorityId) : null,
    Description: r.Name || r.Description || r.ProcurementSubject || null,
    EstimatedValue: normalizeNullableNumber(r.EstimatedValueTotal ?? r.EstimatedValue),
    PlannedDate: r.EstimatedProcedureStartDate || r.InitiationDate || null,
    ContractType: CONTRACT_TYPE_MAP[r.ContractType] || r.ContractType || null,
    CpvCode: r.MainCpvCodeName?.split(" - ")?.[0] || r.CpvCode || null,
  }));
}
