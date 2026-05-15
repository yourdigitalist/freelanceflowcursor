import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/integrations/supabase/types";
import { clearSeedData } from "./clear";
import { runSeed } from "./run";

config({ path: ".env" });
config({ path: ".env.local", override: true });

async function resolveUserId(supabase: ReturnType<typeof createClient<Database>>): Promise<string> {
  const explicitId = process.env.SEED_USER_ID?.trim();
  if (explicitId) return explicitId;

  const email = process.env.SEED_USER_EMAIL?.trim();
  if (!email) {
    throw new Error(
      "Set SEED_USER_EMAIL (your Lance login email) or SEED_USER_ID in .env.local.\n" +
        "Example: SEED_USER_EMAIL=you@example.com",
    );
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("user_id, email")
    .ilike("email", email)
    .maybeSingle();

  if (error) throw error;
  if (!profile?.user_id) {
    throw new Error(`No profile found for SEED_USER_EMAIL=${email}. Sign in to Lance once so your profile exists.`);
  }
  return profile.user_id;
}

async function main() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("Missing VITE_SUPABASE_URL (or SUPABASE_URL) in .env / .env.local");
  }
  if (!serviceKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY in .env.local.\n" +
        "Supabase Dashboard → Project Settings → API → service_role (secret). Never commit this key.",
    );
  }

  const resetOnly = process.argv.includes("--reset-only");
  const skipReset = process.argv.includes("--no-reset");

  const supabase = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const userId = await resolveUserId(supabase);
  console.log(`Seeding for user ${userId}${process.env.SEED_USER_EMAIL ? ` (${process.env.SEED_USER_EMAIL})` : ""}`);

  if (!skipReset) {
    console.log("Clearing previous seed data (tag: lance-seed)…");
    await clearSeedData(supabase, userId);
  }

  if (resetOnly) {
    console.log("Done (reset only).");
    return;
  }

  console.log("Inserting demo data…");
  const summary = await runSeed(supabase, userId);

  console.log("\nSeed complete:\n");
  console.log(`  ${summary.services} services`);
  console.log(`  ${summary.clients} clients (includes 1 archived)`);
  console.log(`  ${summary.projects} projects`);
  console.log(`  ${summary.proposals} proposals (draft, sent, accepted)`);
  console.log(`  ${summary.contracts} contracts`);
  console.log(`  ${summary.invoices} invoices`);
  console.log("\nLook for names starting with [Seed] in the app.\n");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
