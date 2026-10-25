import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { demoTenant } from "@/lib/demo/tenant";
import { buildSandboxWorkspace } from "@/lib/demo/fixture";
import type { Workspace } from "@/lib/domain/types";
import { blankWorkspace } from "@/lib/engine/workspace";
import { supabaseConfigured } from "@/lib/integrations/status";
import { buildWeeklyMetrics, startOfWeek } from "@/lib/reports/weekly";
import { loadTenantWorkspace } from "@/lib/store/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PortalModel = {
  mode: "sandbox" | "live";
  view: "sample" | "fresh";
  workspace: Workspace;
};

export const loadPortal = cache(async function loadPortal(): Promise<
  { kind: "ready"; model: PortalModel } | { kind: "auth" } | { kind: "onboarding" }
> {
  if (!supabaseConfigured()) {
    const jar = await cookies();
    const view = jar.get("lr_sandbox_view")?.value === "fresh" ? "fresh" : "sample";
    if (view === "fresh") {
      const workspace = blankFromCookie(jar.get("lr_sandbox_profile")?.value);
      return { kind: "ready", model: { mode: "sandbox", view, workspace } };
    }
    return { kind: "ready", model: { mode: "sandbox", view: "sample", workspace: buildSandboxWorkspace() } };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { kind: "auth" };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { kind: "auth" };
  const membership = await supabase.from("memberships").select("tenant_id").limit(1).maybeSingle();
  if (membership.error) throw membership.error;
  if (!membership.data?.tenant_id) return { kind: "onboarding" };
  const workspace = await loadTenantWorkspace(supabase, membership.data.tenant_id);
  if (!workspace) return { kind: "onboarding" };
  if (workspace.reports.length === 0) {
    const weekStart = startOfWeek(new Date());
    workspace.reports.push({
      id: crypto.randomUUID(),
      tenantId: workspace.tenant.id,
      weekStart: weekStart.toISOString().slice(0, 10),
      metrics: buildWeeklyMetrics(workspace, weekStart),
      generatedAt: new Date().toISOString(),
    });
  }
  return { kind: "ready", model: { mode: "live", view: "sample", workspace } };
});

export async function getPortalModel(): Promise<PortalModel> {
  const result = await loadPortal();
  if (result.kind === "auth") redirect("/login");
  if (result.kind === "onboarding") redirect("/onboarding");
  return result.model;
}

function blankFromCookie(raw: string | undefined): Workspace {
  const fallback = demoTenant();
  fallback.name = "Your HVAC Co";
  fallback.plan = "trial";
  fallback.subscriptionStatus = "sandbox";
  fallback.conversationsUsed = 0;
  fallback.a2pBrandStatus = "not_started";
  if (raw) {
    try {
      const profile = JSON.parse(raw) as {
        name?: string;
        timezone?: string;
        businessPhone?: string;
        ownerNotifyPhone?: string;
        ownerNotifyEmail?: string;
        quietHoursStart?: number;
        quietHoursEnd?: number;
        physicalAddress?: string;
        smsFromNumber?: string | null;
      };
      if (profile.name) fallback.name = profile.name;
      if (profile.timezone) fallback.timezone = profile.timezone;
      if (profile.businessPhone) fallback.businessPhone = profile.businessPhone;
      if (profile.ownerNotifyPhone) fallback.ownerNotifyPhone = profile.ownerNotifyPhone;
      if (profile.ownerNotifyEmail) fallback.ownerNotifyEmail = profile.ownerNotifyEmail;
      if (typeof profile.quietHoursStart === "number") fallback.quietHoursStart = profile.quietHoursStart;
      if (typeof profile.quietHoursEnd === "number") fallback.quietHoursEnd = profile.quietHoursEnd;
      if (profile.physicalAddress) fallback.physicalAddress = profile.physicalAddress;
      if (profile.smsFromNumber) fallback.smsFromNumber = profile.smsFromNumber;
    } catch {
      // Ignore a corrupt sandbox cookie and show an empty shop.
    }
  }
  const workspace = blankWorkspace(fallback);
  const weekStart = startOfWeek(new Date());
  workspace.reports.push({
    id: crypto.randomUUID(),
    tenantId: workspace.tenant.id,
    weekStart: weekStart.toISOString().slice(0, 10),
    metrics: buildWeeklyMetrics(workspace, weekStart),
    generatedAt: new Date().toISOString(),
  });
  return workspace;
}
