import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";

async function database() {
  const db = new PGlite();
  const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/20261025120000_init.sql"), "utf8");
  await db.exec(sql);
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
});
