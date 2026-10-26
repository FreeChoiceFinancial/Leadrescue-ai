"use client";

import { useState } from "react";
import { CRM_SANDBOX_LABEL } from "@/lib/crm/mode";
import { defaultFieldMapping, ZOHO_REGIONS, type CrmProvider, type FieldMapping, type ZohoRegion } from "@/lib/crm/mapping";

export type CrmLogRow = {
  id: string;
  provider: string;
  action: string;
  status: string;
  attempt: number;
  detail: string;
  createdAt: string;
};

export function CrmSettings({ live, logs }: { live: boolean; logs: CrmLogRow[] }) {
  const [notice, setNotice] = useState<string | null>(null);
  const [region, setRegion] = useState<ZohoRegion>("com");
  const [provider, setProvider] = useState<CrmProvider>("hubspot");
  const [mapping, setMapping] = useState<FieldMapping>(defaultFieldMapping("hubspot"));
  const [pending, setPending] = useState(false);

  function chooseProvider(next: CrmProvider) {
    setProvider(next);
    setMapping(defaultFieldMapping(next));
  }

  async function connect(next: CrmProvider) {
    if (!live) {
      setNotice(CRM_SANDBOX_LABEL);
      return;
    }
    window.location.href = next === "hubspot" ? "/api/crm/hubspot/connect" : `/api/crm/zoho/connect?region=${region}`;
  }

  async function disconnect(next: CrmProvider) {
    setPending(true);
    const response = await fetch("/api/crm/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: next }),
    });
    const payload = (await response.json()) as { detail?: string; label?: string; revoked?: boolean };
    setNotice(payload.detail ?? payload.label ?? CRM_SANDBOX_LABEL);
    setPending(false);
  }

  async function saveMapping() {
    setPending(true);
    const response = await fetch("/api/crm/mapping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, mapping }),
    });
    const payload = (await response.json()) as { label?: string; saved?: boolean };
    setNotice(payload.saved ? "Mapping stored for this shop." : (payload.label ?? CRM_SANDBOX_LABEL));
    setPending(false);
  }

  return (
    <section className="rounded-3xl bg-cream p-5 lg:col-span-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl">HubSpot and Zoho</h2>
          <p className="mt-2 text-sm font-semibold">{live ? "CRM sync is enabled on this server." : CRM_SANDBOX_LABEL}</p>
        </div>
        <p className="max-w-xl text-sm leading-relaxed text-ink/70">
          Every plan includes these CRMs. Nothing is sent to HubSpot or Zoho from this screen unless CRM sync is turned on for the server. This page does not report a live sync.
        </p>
      </div>
      {notice ? <p className="mt-4 text-sm font-semibold">{notice}</p> : null}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-ink/10 p-4">
          <h3 className="font-display text-2xl">HubSpot</h3>
          <p className="mt-2 text-sm text-ink/70">Contacts, deals, notes, and timeline. OAuth stays off in sandbox.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn btn-ink" type="button" onClick={() => connect("hubspot")}>
              Connect HubSpot
            </button>
            <button className="btn btn-ghost" type="button" disabled={pending} onClick={() => disconnect("hubspot")}>
              Disconnect HubSpot
            </button>
          </div>
        </article>
        <article className="rounded-2xl border border-ink/10 p-4">
          <h3 className="font-display text-2xl">Zoho CRM</h3>
          <label className="mt-3 block text-sm font-semibold">
            Accounts region
            <select className="field mt-1" value={region} onChange={(event) => setRegion(event.target.value as ZohoRegion)}>
              {ZOHO_REGIONS.map((item) => (
                <option key={item} value={item}>
                  .{item}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn btn-ink" type="button" onClick={() => connect("zoho")}>
              Connect Zoho
            </button>
            <button className="btn btn-ghost" type="button" disabled={pending} onClick={() => disconnect("zoho")}>
              Disconnect Zoho
            </button>
          </div>
        </article>
      </div>
      <div className="mt-6">
        <div className="flex flex-wrap gap-2">
          {(["hubspot", "zoho"] as const).map((item) => (
            <button key={item} className={`btn ${provider === item ? "btn-ink" : "btn-ghost"}`} type="button" onClick={() => chooseProvider(item)}>
              {item === "hubspot" ? "HubSpot fields" : "Zoho fields"}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <MapField label="Phone field" value={mapping.phone} onChange={(phone) => setMapping({ ...mapping, phone })} />
          <MapField label="Email field" value={mapping.email} onChange={(email) => setMapping({ ...mapping, email })} />
          <MapField label="Name field" value={mapping.name} onChange={(name) => setMapping({ ...mapping, name })} />
          <MapField label="Deal name field" value={mapping.dealName} onChange={(dealName) => setMapping({ ...mapping, dealName })} />
          <MapField label="Stage: new" value={mapping.stageNew} onChange={(stageNew) => setMapping({ ...mapping, stageNew })} />
          <MapField label="Stage: qualified" value={mapping.stageQualified} onChange={(stageQualified) => setMapping({ ...mapping, stageQualified })} />
          <MapField label="Stage: booked" value={mapping.stageBooked} onChange={(stageBooked) => setMapping({ ...mapping, stageBooked })} />
          <MapField label="Stage: lost" value={mapping.stageLost} onChange={(stageLost) => setMapping({ ...mapping, stageLost })} />
          <MapField label="Note field" value={mapping.note} onChange={(note) => setMapping({ ...mapping, note })} />
          <MapField label="Appointment field" value={mapping.appointment} onChange={(appointment) => setMapping({ ...mapping, appointment })} />
        </div>
        {provider === "zoho" ? (
          <label className="mt-3 block text-sm font-semibold">
            Zoho record
            <select
              className="field mt-1"
              value={mapping.zohoModule}
              onChange={(event) => setMapping({ ...mapping, zohoModule: event.target.value === "Leads" ? "Leads" : "Deals" })}
            >
              <option value="Deals">Deal</option>
              <option value="Leads">Lead</option>
            </select>
          </label>
        ) : null}
        <button className="btn btn-primary mt-4" type="button" disabled={pending} onClick={saveMapping}>
          Save field mapping
        </button>
      </div>
      <div className="mt-8">
        <h3 className="font-display text-2xl">Sync log</h3>
        {logs.length === 0 ? (
          <p className="mt-2 text-sm text-ink/70">No sync attempts yet. {CRM_SANDBOX_LABEL}.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-ink/45">
                <tr>
                  <th className="py-2">When</th>
                  <th>CRM</th>
                  <th>Action</th>
                  <th>Status</th>
                  <th>Attempt</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((row) => (
                  <tr key={row.id} className="border-t border-ink/10">
                    <td className="py-2">{row.createdAt}</td>
                    <td>{row.provider}</td>
                    <td>{row.action}</td>
                    <td>{row.status}</td>
                    <td>{row.attempt}</td>
                    <td>{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function MapField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input className="field mt-1" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
