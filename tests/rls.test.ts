import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";

async function database() {
  const db = new PGlite();
  const directory = path.join(process.cwd(), "supabase/migrations");
  const files = readdirSync(directory)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of files) {
    await db.exec(readFileSync(path.join(directory, file), "utf8"));
  }
  await db.exec(`select set_config('request.jwt.claim.sub', '${USER_A}', false)`);
  await db.exec(`
    select app.bootstrap_tenant(
      'Northwind HVAC', 'America/Chicago', '+15125551010', '+15125551011',
      'owner-a@example.com', 21, 8, '10 Fictional St, Austin, TX 78701'
    )
  `);
  await db.exec(`select set_config('request.jwt.claim.sub', '${USER_B}', false)`);
  await db.exec(`
    select app.bootstrap_tenant(
      'Southwind HVAC', 'America/Chicago', '+15125551020', '+15125551021',
      'owner-b@example.com', 21, 8, '20 Fictional St, Austin, TX 78702'
    )
  `);
  await db.exec(`
    insert into public.leads (tenant_id, phone, source)
    select id, '+15125551018', 'missed_call' from public.tenants where name = 'Northwind HVAC';
    insert into public.leads (tenant_id, phone, source)
    select id, '+15125551028', 'missed_call' from public.tenants where name = 'Southwind HVAC';
  `);
  const tenants = await db.query<{ id: string; name: string }>("select id, name from public.tenants");
  return {
    db,
    northId: tenants.rows.find((row) => row.name === "Northwind HVAC")?.id as string,
    southId: tenants.rows.find((row) => row.name === "Southwind HVAC")?.id as string,
  };
}

async function asUser(db: PGlite, userId: string) {
  await db.exec("reset role");
  await db.exec(`select set_config('request.jwt.claim.sub', '${userId}', false)`);
  await db.exec("set role authenticated");
}

describe("tenant row level security", () => {
  it("denies cross-tenant reads and writes", async () => {
    const { db, northId, southId } = await database();
    await asUser(db, USER_A);
    const leads = await db.query<{ phone: string }>("select phone from public.leads order by phone");
    expect(leads.rows.map((row) => row.phone)).toEqual(["+15125551018"]);
    const tenants = await db.query<{ name: string }>("select name from public.tenants");
    expect(tenants.rows.map((row) => row.name)).toEqual(["Northwind HVAC"]);

    await expect(
      db.query("insert into public.leads (tenant_id, phone, source) values ($1, '+15125551999', 'inbound_sms')", [southId]),
    ).rejects.toThrow(/row-level security/i);

    const updated = await db.query("update public.tenants set name = 'Stolen' where id = $1 returning id", [southId]);
    expect(updated.rows).toHaveLength(0);

    await expect(db.query("update public.subscriptions set conversation_allowance = 999999")).rejects.toThrow(/permission denied/i);

    await expect(
      db.query("update public.tenants set a2p_brand_status = 'approved' where id = $1", [northId]),
    ).rejects.toThrow(/a2p brand status/i);

    const renamed = await db.query<{ name: string }>(
      "update public.tenants set name = 'Northwind Heating' where id = $1 returning name",
      [northId],
    );
    expect(renamed.rows[0]?.name).toBe("Northwind Heating");

    const memberships = await db.query<{ user_id: string }>("select user_id from public.memberships");
    expect(memberships.rows.map((row) => row.user_id)).toEqual([USER_A]);

    await db.exec("reset role");
    await db.exec("set role anon");
    const anonLeads = await db.query("select * from public.leads");
    expect(anonLeads.rows).toHaveLength(0);
    const anonTenants = await db.query("select * from public.tenants");
    expect(anonTenants.rows).toHaveLength(0);

    await db.exec("reset role");
    await db.exec("set role service_role");
    const everything = await db.query("select phone from public.leads order by phone");
    expect(everything.rows).toHaveLength(2);

    await db.exec("reset role");
    await db.exec(`select set_config('request.jwt.claim.sub', '${USER_A}', false)`);
    await expect(
      db.query(`
        select app.bootstrap_tenant(
          'Second Shop', 'America/Chicago', '+15125551030', '+15125551031',
          'again@example.com', 21, 8, '30 Fictional St, Austin, TX 78703'
        )
      `),
    ).rejects.toThrow(/already has a business/i);
  });

  it("does not cap how many people can belong to one shop", async () => {
    const { db, northId } = await database();
    await db.exec("reset role");
    await db.exec("set role service_role");
    for (let index = 0; index < 25; index += 1) {
      const userId = `cccccccc-cccc-4ccc-8ccc-${String(index).padStart(12, "0")}`;
      await db.query("insert into public.memberships (tenant_id, user_id, role) values ($1, $2, 'staff')", [northId, userId]);
    }
    const count = await db.query<{ n: string }>("select count(*)::text as n from public.memberships where tenant_id = $1", [northId]);
    expect(Number(count.rows[0]?.n)).toBe(26);
  });

  it("keeps 10DLC registrations inside the shop and pending review", async () => {
    const { db, northId, southId } = await database();
    const insertSql = `
      insert into public.a2p_registrations (
        tenant_id, legal_business_name, ein, business_type,
        street, city, region, postal_code, website,
        contact_name, contact_email, contact_phone, vertical, use_case,
        campaign_description, sample_messages, opt_in_description, stop_message, help_message,
        attested, status
      ) values (
        $1, 'Northwind HVAC LLC', '12-3456789', 'Limited Liability Corporation',
        '10 Fictional St', 'Austin', 'TX', '78701', 'https://northwind.example',
        'Ada Owner', 'owner-a@example.com', '+15125551011', 'CONSTRUCTION', 'customer_care',
        'Customer care texts for people who called this HVAC shop and were not answered. Not a promotion.',
        array[
          'Northwind HVAC: We missed your call. Reply STOP to opt out. Reply HELP for help.',
          'Northwind HVAC: Reply with the HVAC issue and your ZIP. Reply STOP to opt out.'
        ]::text[],
        'The person called the shop, the call was missed, and the shop texts that caller about the missed call with STOP and HELP.',
        'Northwind HVAC: You are opted out. Reply START to opt back in.',
        'Northwind HVAC: Help for missed-call texts. Reply STOP to opt out. Help: the shop.',
        true,
        'approved'
      )
    `;
    await asUser(db, USER_A);
    await db.query(insertSql, [northId]);
    const own = await db.query<{ status: string; ein_last4: string }>(
      "select status, ein_last4 from public.a2p_registrations where tenant_id = $1",
      [northId],
    );
    expect(own.rows).toEqual([{ status: "pending_review", ein_last4: "6789" }]);
    await db.query("update public.a2p_registrations set status = 'approved' where tenant_id = $1", [northId]);
    const stillPending = await db.query<{ status: string }>("select status from public.a2p_registrations where tenant_id = $1", [northId]);
    expect(stillPending.rows[0]?.status).toBe("pending_review");
    await expect(db.query(insertSql, [southId])).rejects.toThrow(/row-level security/i);

    await asUser(db, USER_B);
    const other = await db.query("select ein, status from public.a2p_registrations");
    expect(other.rows).toHaveLength(0);

    await db.exec("reset role");
    await db.exec("set role service_role");
    await db.query("update public.a2p_registrations set status = 'submitted' where tenant_id = $1", [northId]);
    const filed = await db.query<{ status: string }>("select status from public.a2p_registrations where tenant_id = $1", [northId]);
    expect(filed.rows[0]?.status).toBe("submitted");
  });

  it("keeps CRM tokens and sync rows inside the shop", async () => {
    const { db, northId, southId } = await database();
    await db.exec("reset role");
    await db.exec("set role service_role");
    await expect(
      db.query(
        `insert into public.crm_connections (tenant_id, provider, status, refresh_token_encrypted)
         values ($1, 'hubspot', 'connected', 'plain-token')`,
        [northId],
      ),
    ).rejects.toThrow(/check constraint|violates check/i);
    await db.query(
      `insert into public.crm_connections (tenant_id, provider, status, region, refresh_token_encrypted, scopes)
       values ($1, 'hubspot', 'connected', null, 'v1.aa.bb.cc', 'crm.objects.contacts.read')`,
      [northId],
    );
    await db.query(
      `insert into public.crm_sync_log (tenant_id, provider, action, status, attempt, detail)
       values ($1, 'hubspot', 'contact', 'sandbox', 0, 'Not sent.')`,
      [northId],
    );
    await db.query(
      `insert into public.crm_sync_jobs (tenant_id, provider, idempotency_key, kind, stage, status, external_id)
       values ($1, 'hubspot', 'hubspot:lead:contact:new:0', 'contact', 'new', 'succeeded', 'c1')`,
      [northId],
    );
    await expect(
      db.query(
        `insert into public.crm_sync_jobs (tenant_id, provider, idempotency_key, kind, stage, last_error)
         values ($1, 'hubspot', 'bad', 'contact', 'new', $2)`,
        [northId, "failed for +15125550100"],
      ),
    ).rejects.toThrow(/check constraint|violates check/i);

    await asUser(db, USER_A);
    const visible = await db.query<{ status: string; provider: string }>(
      "select status, provider from public.crm_connections",
    );
    expect(visible.rows).toEqual([{ status: "connected", provider: "hubspot" }]);
    await expect(db.query("select refresh_token_encrypted from public.crm_connections")).rejects.toThrow(/permission denied/i);
    await expect(db.query("select * from public.crm_connections")).rejects.toThrow(/permission denied/i);
    await expect(db.query("update public.crm_connections set status = 'disconnected'")).rejects.toThrow(/permission denied/i);
    await expect(db.query("select * from public.crm_sync_jobs")).rejects.toThrow(/permission denied/i);
    const log = await db.query<{ detail: string }>("select detail from public.crm_sync_log");
    expect(log.rows).toEqual([{ detail: "Not sent." }]);
    const mapped = await db.query<{ field_mapping: { phone?: string } }>(
      "update public.crm_connections set field_mapping = '{\"phone\":\"mobile\"}'::jsonb where tenant_id = $1 returning field_mapping",
      [northId],
    );
    expect(mapped.rows[0]?.field_mapping.phone).toBe("mobile");
    const otherShop = await db.query("update public.crm_connections set field_mapping = '{}'::jsonb where tenant_id = $1 returning id", [southId]);
    expect(otherShop.rows).toHaveLength(0);

    await asUser(db, USER_B);
    expect((await db.query("select id from public.crm_connections")).rows).toHaveLength(0);
    expect((await db.query("select detail from public.crm_sync_log")).rows).toHaveLength(0);

    await db.exec("reset role");
    await db.exec("grant update (status, refresh_token_encrypted) on public.crm_connections to authenticated");
    await asUser(db, USER_A);
    await db.query(
      "update public.crm_connections set status = 'disconnected', refresh_token_encrypted = 'v1.hacked.tag.body' where tenant_id = $1",
      [northId],
    );
    await db.exec("reset role");
    await db.exec("set role service_role");
    const locked = await db.query<{ status: string; refresh_token_encrypted: string }>(
      "select status, refresh_token_encrypted from public.crm_connections where tenant_id = $1",
      [northId],
    );
    expect(locked.rows[0]).toEqual({ status: "connected", refresh_token_encrypted: "v1.aa.bb.cc" });
  });
});
