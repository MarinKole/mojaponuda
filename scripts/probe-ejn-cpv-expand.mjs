const BASE = "https://open.ejn.gov.ba";

async function tryUrl(url) {
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  console.log(`\n${url}\n  → ${r.status}`);
  if (!r.ok) {
    const text = await r.text();
    console.log("  body[0..300]:", text.slice(0, 300));
    return;
  }
  const d = await r.json();
  const sample = (d.value ?? d ?? [])[0];
  if (!sample) {
    console.log("  (no rows)");
    return;
  }
  console.log("  keys:", Object.keys(sample).sort().join(", "));
  console.log("  sample:", JSON.stringify(sample, null, 2).slice(0, 2000));
}

const now = new Date().toISOString();
// 1) Can we $expand Lots on a ProcurementNotice?
await tryUrl(
  `${BASE}/ProcurementNotices?%24top=1&%24format=json&%24expand=Lots&%24filter=ApplicationDeadlineDateTime%20gt%20${now}`
);
// 2) Can we $expand Lots + LotCpvCodeLinks + CpvCode in one shot?
await tryUrl(
  `${BASE}/ProcurementNotices?%24top=1&%24format=json&%24expand=Lots(%24expand%3DLotCpvCodeLinks(%24expand%3DCpvCode))&%24filter=ApplicationDeadlineDateTime%20gt%20${now}`
);
// 3) Fallback: fetch Lots filtered by ProcedureId directly
await tryUrl(`${BASE}/Lots?%24top=2&%24format=json`);
// 4) Fetch LotCpvCodeLinks with expand to CpvCode
await tryUrl(
  `${BASE}/LotCpvCodeLinks?%24top=2&%24format=json&%24expand=CpvCode`
);
