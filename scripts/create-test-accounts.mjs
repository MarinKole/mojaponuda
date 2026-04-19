/**
 * Kreira auth korisnike i dodijeljuje im Puni Paket (pro) direktnim
 * upisom u subscriptions tabelu. Bez plaćanja, bez LemonSqueezy webhook-a.
 *
 * Korisnici: test1@tendersistem.com, test2@tendersistem.com,
 *            test3@tendersistem.com
 * Password:  testing123
 *
 *   node scripts/create-test-accounts.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const projectRoot = process.cwd();

function loadEnvFile(name) {
  const p = path.join(projectRoot, name);
  if (!fs.existsSync(p)) return;
  for (const raw of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i === -1) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ACCOUNTS = [
  { email: "test1@tendersistem.com", password: "testing123" },
  { email: "test2@tendersistem.com", password: "testing123" },
  { email: "test3@tendersistem.com", password: "testing123" },
];

async function findUserByEmail(email) {
  let page = 1;
  const perPage = 200;
  const normalized = email.toLowerCase();
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = (data?.users ?? []).find((u) => (u.email ?? "").toLowerCase() === normalized);
    if (match) return match;
    if ((data?.users ?? []).length < perPage) return null;
    page += 1;
  }
}

async function ensureUser({ email, password }) {
  const existing = await findUserByEmail(email);
  if (existing) {
    console.log(`  exists: ${email} (${existing.id})`);
    // reset password + confirm email defensively
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (error) throw error;
    return existing.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  console.log(`  created: ${email} (${data.user.id})`);
  return data.user.id;
}

async function ensureProSubscription(userId, email) {
  const oneYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await admin
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const { error } = await admin
      .from("subscriptions")
      .update({
        lemonsqueezy_variant_id: "pro",
        status: "active",
        current_period_end: oneYear,
      })
      .eq("id", existing.id);
    if (error) throw error;
    console.log(`    → updated subscription → pro/active (${email})`);
    return;
  }

  const { error } = await admin.from("subscriptions").insert({
    user_id: userId,
    lemonsqueezy_variant_id: "pro",
    status: "active",
    current_period_end: oneYear,
  });
  if (error) throw error;
  console.log(`    → inserted subscription → pro/active (${email})`);
}

async function main() {
  for (const acc of ACCOUNTS) {
    const uid = await ensureUser(acc);
    await ensureProSubscription(uid, acc.email);
  }
  console.log("\nDone. Login with password: testing123");
}

main().catch((e) => {
  console.error("Failed:", e);
  process.exitCode = 1;
});
