// Probes the EJN OData ProcurementNotices endpoint to discover which fields
// actually contain the CPV code (if any) for active procurement notices.

const BASE = "https://open.ejn.gov.ba";

async function probe() {
  const url = `${BASE}/ProcurementNotices?%24top=3&%24format=json`;
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  const d = await r.json();
  const rows = d.value ?? d ?? [];
  console.log("Sample count:", rows.length);
  if (!rows[0]) {
    console.log("Raw response keys:", Object.keys(d));
    console.log("First 500 chars:", JSON.stringify(d).slice(0, 500));
    return;
  }

  const row = rows[0];
  const allKeys = Object.keys(row).sort();
  console.log("\nAll fields (%d):", allKeys.length);
  for (const k of allKeys) {
    const v = row[k];
    const preview =
      v === null || v === undefined
        ? String(v)
        : typeof v === "object"
        ? JSON.stringify(v).slice(0, 120)
        : String(v).slice(0, 120);
    console.log(`  ${k.padEnd(40)} = ${preview}`);
  }

  console.log("\nCPV-ish fields across all sample rows:");
  for (const r of rows) {
    const cpvLike = {};
    for (const k of Object.keys(r)) {
      if (/cpv|classif|category|subject|area/i.test(k)) cpvLike[k] = r[k];
    }
    console.log("  row", r.Id || r.ProcedureId, ":", JSON.stringify(cpvLike));
  }
}

probe().catch((e) => {
  console.error("probe failed:", e);
  process.exitCode = 1;
});
