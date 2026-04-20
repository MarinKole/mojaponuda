// Discovers the full set of OData entity sets exposed by EJN and identifies
// those that carry CPV classification data for procurement notices.

const BASE = "https://open.ejn.gov.ba";

async function main() {
  const meta = await fetch(`${BASE}/$metadata`, {
    headers: { Accept: "application/xml" },
  }).then((r) => r.text());

  // Cheap XML grep — we only need entity set names + properties
  const entitySets = [...meta.matchAll(/<EntitySet\s+Name="([^"]+)"/g)].map((m) => m[1]);
  console.log("Entity sets (%d):", entitySets.length);
  for (const e of entitySets) console.log("  ", e);

  // Find any EntityType that has a CPV-related property
  console.log("\nCPV-bearing entity types:");
  const types = [...meta.matchAll(/<EntityType\s+Name="([^"]+)">([\s\S]*?)<\/EntityType>/g)];
  for (const [, name, body] of types) {
    const props = [...body.matchAll(/<Property\s+Name="([^"]+)"/g)].map((m) => m[1]);
    const cpvProps = props.filter((p) => /cpv|classif/i.test(p));
    if (cpvProps.length > 0) console.log("  ", name, "→", cpvProps.join(", "));
  }

  // Also show samples from the most-likely entity sets
  const probeTargets = entitySets.filter((e) =>
    /subject|cpv|lot|classif|category/i.test(e)
  );
  console.log("\nProbing likely CPV-carrying entity sets:");
  for (const ep of probeTargets) {
    try {
      const data = await fetch(`${BASE}/${ep}?%24top=2&%24format=json`, {
        headers: { Accept: "application/json" },
      }).then((r) => r.json());
      const sample = (data.value ?? data ?? [])[0];
      console.log(`\n  /${ep}:`);
      if (!sample) {
        console.log("    (no rows)");
      } else {
        for (const k of Object.keys(sample).sort()) {
          console.log(`    ${k.padEnd(36)} = ${JSON.stringify(sample[k]).slice(0, 120)}`);
        }
      }
    } catch (e) {
      console.log(`  /${ep} error:`, e.message);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
