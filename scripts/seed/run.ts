import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../src/integrations/supabase/types";
import { SEED_CLIENT_NAMES, SEED_SERVICE_PREFIX, SEED_TAG } from "./constants";

type Db = SupabaseClient<Database>;

const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const daysAgo = (n: number) => daysFromNow(-n);

export async function runSeed(supabase: Db, userId: string) {
  const now = new Date().toISOString();

  const { data: services, error: servicesError } = await supabase
    .from("services")
    .insert([
      {
        user_id: userId,
        name: `${SEED_SERVICE_PREFIX}Brand Strategy`,
        description: "Positioning, messaging, and visual direction.",
        price: 2500,
        currency: "USD",
        is_recurring: false,
        recurrence_period: "monthly",
      },
      {
        user_id: userId,
        name: `${SEED_SERVICE_PREFIX}Website Design`,
        description: "UX/UI design for marketing site.",
        price: 5000,
        currency: "USD",
        is_recurring: false,
        recurrence_period: "monthly",
      },
      {
        user_id: userId,
        name: `${SEED_SERVICE_PREFIX}Monthly Retainer`,
        description: "Ongoing design and support.",
        price: 1200,
        currency: "USD",
        is_recurring: true,
        recurrence_period: "monthly",
      },
      {
        user_id: userId,
        name: `${SEED_SERVICE_PREFIX}Discovery Workshop`,
        description: "Half-day stakeholder workshop.",
        price: 800,
        currency: "USD",
        is_recurring: false,
        recurrence_period: "monthly",
      },
    ])
    .select("id, name, price, currency, is_recurring, recurrence_period");

  if (servicesError) throw servicesError;
  const [brandService, webService, retainerService, workshopService] = services!;

  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .insert([
      {
        user_id: userId,
        name: SEED_CLIENT_NAMES.acme,
        company: "Acme Studio LLC",
        email: "hello@acme-seed.test",
        phone: "+1 555 0101",
        status: "won",
        currency: "USD",
        tags: [SEED_TAG, "design"],
        avatar_color: "#8B5CF6",
        estimated_value: 18000,
      },
      {
        user_id: userId,
        name: SEED_CLIENT_NAMES.bright,
        company: "Bright Labs",
        email: "team@bright-seed.test",
        phone: "+1 555 0102",
        street: "200 Market Street",
        city: "San Francisco",
        state: "CA",
        postal_code: "94105",
        country: "United States",
        status: "proposal_sent",
        currency: "USD",
        tags: [SEED_TAG, "saas"],
        avatar_color: "#0EA5E9",
        estimated_value: 12000,
      },
      {
        user_id: userId,
        name: SEED_CLIENT_NAMES.archived,
        company: "Old Vendor Co",
        email: "billing@oldvendor.test",
        status: "inactive",
        currency: "USD",
        tags: [SEED_TAG],
        archived_at: now,
        avatar_color: "#94A3B8",
      },
    ])
    .select("id, name, company");

  if (clientsError) throw clientsError;

  const acme = clients!.find((c) => c.name === SEED_CLIENT_NAMES.acme)!;
  const bright = clients!.find((c) => c.name === SEED_CLIENT_NAMES.bright)!;
  const archived = clients!.find((c) => c.name === SEED_CLIENT_NAMES.archived)!;

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .insert([
      {
        user_id: userId,
        client_id: acme.id,
        name: "[Seed] Rebrand 2026",
        status: "active",
        budget: 15000,
        hourly_rate: 125,
        due_date: daysFromNow(45),
        description: "Full brand refresh and guidelines.",
        icon_color: "#8B5CF6",
        icon_emoji: "🎨",
      },
      {
        user_id: userId,
        client_id: acme.id,
        name: "[Seed] Website Refresh",
        status: "active",
        budget: 8000,
        hourly_rate: 125,
        due_date: daysFromNow(30),
        icon_color: "#A78BFA",
        icon_emoji: "🌐",
      },
      {
        user_id: userId,
        client_id: bright.id,
        name: "[Seed] Product Launch",
        status: "active",
        budget: 10000,
        due_date: daysFromNow(60),
        icon_color: "#0EA5E9",
        icon_emoji: "🚀",
      },
      {
        user_id: userId,
        client_id: bright.id,
        name: "[Seed] Onboarding Flow",
        status: "active",
        budget: 4500,
        icon_color: "#38BDF8",
      },
      {
        user_id: userId,
        client_id: archived.id,
        name: "[Seed] Legacy Site",
        status: "completed",
        budget: 2000,
        icon_color: "#94A3B8",
      },
    ])
    .select("id, name, client_id");

  if (projectsError) throw projectsError;

  const acmeRebrand = projects!.find((p) => p.name === "[Seed] Rebrand 2026")!;
  const brightLaunch = projects!.find((p) => p.name === "[Seed] Product Launch")!;

  const proposalBase = {
    user_id: userId,
    discount_type: "amount" as const,
    discount_value: 0,
    payment_methods: ["bank_transfer", "card"],
    payment_structure: "upfront" as const,
    validity_days: 30,
    availability_required: true,
    timeline_days: 21,
    identifier: "",
  };

  const { data: proposals, error: proposalsError } = await supabase
    .from("proposals")
    .insert([
      {
        ...proposalBase,
        client_id: bright.id,
        project_id: brightLaunch.id,
        client_name_snapshot: bright.name,
        client_company_snapshot: "Bright Labs",
        status: "draft",
        objective: "Launch creative for Q2 product release.",
        subtotal: 5800,
        total: 5800,
      },
      {
        ...proposalBase,
        client_id: acme.id,
        project_id: acmeRebrand.id,
        client_name_snapshot: acme.name,
        client_company_snapshot: "Acme Studio LLC",
        status: "sent",
        sent_at: daysAgo(3) + "T12:00:00Z",
        expires_at: daysFromNow(27),
        objective: "Brand strategy and identity system.",
        subtotal: 7500,
        total: 7500,
      },
      {
        ...proposalBase,
        client_id: acme.id,
        project_id: acmeRebrand.id,
        client_name_snapshot: acme.name,
        client_company_snapshot: "Acme Studio LLC",
        status: "accepted",
        sent_at: daysAgo(14) + "T12:00:00Z",
        accepted_at: daysAgo(7) + "T12:00:00Z",
        objective: "Website redesign package.",
        subtotal: 5000,
        total: 5000,
      },
    ])
    .select("id, status, identifier");

  if (proposalsError) throw proposalsError;

  const draftProposal = proposals!.find((p) => p.status === "draft")!;
  const sentProposal = proposals!.find((p) => p.status === "sent")!;
  const acceptedProposal = proposals!.find((p) => p.status === "accepted")!;

  await supabase.from("proposal_services").insert([
    {
      proposal_id: draftProposal.id,
      service_id: webService.id,
      name: webService.name.replace(SEED_SERVICE_PREFIX, ""),
      price: 5000,
      currency: "USD",
      quantity: 1,
      line_total: 5000,
      position: 0,
      is_recurring: false,
      recurrence_period: "monthly",
    },
    {
      proposal_id: draftProposal.id,
      service_id: workshopService.id,
      name: workshopService.name.replace(SEED_SERVICE_PREFIX, ""),
      price: 800,
      currency: "USD",
      quantity: 1,
      line_total: 800,
      position: 1,
      is_recurring: false,
      recurrence_period: "monthly",
    },
    {
      proposal_id: sentProposal.id,
      service_id: brandService.id,
      name: brandService.name.replace(SEED_SERVICE_PREFIX, ""),
      price: 2500,
      currency: "USD",
      quantity: 1,
      line_total: 2500,
      position: 0,
      is_recurring: false,
      recurrence_period: "monthly",
    },
    {
      proposal_id: sentProposal.id,
      service_id: retainerService.id,
      name: retainerService.name.replace(SEED_SERVICE_PREFIX, ""),
      price: 1200,
      currency: "USD",
      quantity: 2,
      line_total: 2400,
      position: 1,
      is_recurring: true,
      recurrence_period: "monthly",
    },
    {
      proposal_id: acceptedProposal.id,
      service_id: webService.id,
      name: webService.name.replace(SEED_SERVICE_PREFIX, ""),
      price: 5000,
      currency: "USD",
      quantity: 1,
      line_total: 5000,
      position: 0,
      is_recurring: false,
      recurrence_period: "monthly",
    },
  ]);

  const [{ data: profile }, { data: contractTemplates }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "full_name, email, business_name, business_phone, business_address, business_city, business_state, business_postal_code, business_country, business_street, business_street2, tax_id",
      )
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("contract_templates").select("id, name, is_default").eq("user_id", userId).order("created_at"),
  ]);

  const defaultTemplate =
    contractTemplates?.find((t) => t.name?.trim().toLowerCase() === "service agreement") ||
    contractTemplates?.find((t) => t.is_default) ||
    contractTemplates?.[0];
  const templateId = defaultTemplate?.id ?? null;

  const freelancerParty = {
    freelancer_name: profile?.full_name || "Seed Freelancer",
    freelancer_company: profile?.business_name || null,
    freelancer_email: profile?.email || null,
    freelancer_phone: profile?.business_phone || null,
    freelancer_address: profile?.business_address || null,
    freelancer_city: profile?.business_city || null,
    freelancer_state: profile?.business_state || null,
    freelancer_zip: profile?.business_postal_code || null,
    freelancer_country: profile?.business_country || null,
    freelancer_tax_id: profile?.tax_id || null,
    freelancer_street: profile?.business_street || profile?.business_address || null,
    freelancer_street2: profile?.business_street2 || null,
  };

  const acmeParty = {
    client_name: acme.name,
    client_company: "Acme Studio LLC",
    client_email: "hello@acme-seed.test",
    client_phone: "+1 555 0101",
    client_entity_type: "company" as const,
    client_street: "100 Design Ave",
    client_city: "Austin",
    client_state: "TX",
    client_zip: "78701",
    client_country: "United States",
  };

  const brightParty = {
    client_name: bright.name,
    client_company: "Bright Labs",
    client_email: "team@bright-seed.test",
    client_phone: "+1 555 0102",
    client_entity_type: "company" as const,
    client_street: "200 Market Street",
    client_city: "San Francisco",
    client_state: "CA",
    client_zip: "94105",
    client_country: "United States",
  };

  const { data: contracts, error: contractsError } = await supabase
    .from("contracts")
    .insert([
      {
        user_id: userId,
        client_id: acme.id,
        project_id: acmeRebrand.id,
        proposal_id: acceptedProposal.id,
        template_id: templateId,
        status: "draft",
        ...acmeParty,
        ...freelancerParty,
        subtotal: 5000,
        total: 5000,
        payment_methods: ["bank_transfer"],
        payment_structure: "upfront",
        timeline_days: 21,
        identifier: "",
      },
      {
        user_id: userId,
        client_id: bright.id,
        project_id: brightLaunch.id,
        template_id: templateId,
        status: "pending_signatures",
        ...brightParty,
        ...freelancerParty,
        sent_at: daysAgo(2) + "T10:00:00Z",
        subtotal: 3200,
        total: 3200,
        payment_methods: ["card"],
        payment_structure: "upfront",
        timeline_days: 14,
        identifier: "",
      },
    ])
    .select("id, status, identifier");

  if (contractsError) throw contractsError;

  const draftContract = contracts!.find((c) => c.status === "draft")!;

  await supabase.from("contract_services").insert([
    {
      contract_id: draftContract.id,
      service_id: brandService.id,
      name: "Brand Strategy",
      price: 2500,
      quantity: 1,
      sort_order: 0,
    },
    {
      contract_id: draftContract.id,
      service_id: workshopService.id,
      name: "Discovery Workshop",
      price: 800,
      quantity: 1,
      sort_order: 1,
    },
  ]);

  const { data: invoices, error: invoicesError } = await supabase
    .from("invoices")
    .insert([
      {
        user_id: userId,
        client_id: acme.id,
        project_id: acmeRebrand.id,
        invoice_number: `SEED-${Date.now().toString().slice(-6)}-1`,
        status: "draft",
        issue_date: daysAgo(0),
        due_date: daysFromNow(14),
        subtotal: 2500,
        tax_rate: 0,
        tax_amount: 0,
        total: 2500,
        notes: "Seed data — draft invoice for testing.",
      },
      {
        user_id: userId,
        client_id: bright.id,
        project_id: brightLaunch.id,
        invoice_number: `SEED-${Date.now().toString().slice(-6)}-2`,
        status: "sent",
        issue_date: daysAgo(5),
        due_date: daysFromNow(25),
        subtotal: 3200,
        tax_rate: 0,
        tax_amount: 0,
        total: 3200,
        notes: "Seed data — sent invoice for testing reminders.",
      },
    ])
    .select("id, status, invoice_number");

  if (invoicesError) throw invoicesError;

  const draftInvoice = invoices!.find((i) => i.status === "draft")!;
  const sentInvoice = invoices!.find((i) => i.status === "sent")!;

  await supabase.from("invoice_items").insert([
    {
      invoice_id: draftInvoice.id,
      description: "Brand strategy — milestone 1",
      unit_price: 2500,
      quantity: 1,
      amount: 2500,
    },
    {
      invoice_id: sentInvoice.id,
      description: "Product launch — design sprint",
      unit_price: 3200,
      quantity: 1,
      amount: 3200,
    },
  ]);

  return {
    services: services!.length,
    clients: clients!.length,
    projects: projects!.length,
    proposals: proposals!.length,
    contracts: contracts!.length,
    invoices: invoices!.length,
    highlights: {
      archivedClient: archived.name,
      draftProposal: draftProposal.identifier,
      sentProposal: sentProposal.identifier,
      acceptedProposal: acceptedProposal.identifier,
    },
  };
}
