import { createDemoProvider } from "@/lib/booking/demo-provider";
import { DEMO_CALLER_PHONE, demoTenant } from "@/lib/demo/tenant";
import { handleInbound, handleMissedCall, type EngineRuntime } from "@/lib/engine/handle";
import { blankWorkspace } from "@/lib/engine/workspace";
import type { Workspace } from "@/lib/domain/types";

export function createDemoWorkspace(now = new Date()): Workspace {
  return blankWorkspace({ ...demoTenant(now), conversationsUsed: 0, plan: "trial", subscriptionStatus: "sandbox" });
}

export function demoRuntime(now: Date): EngineRuntime {
  const provider = createDemoProvider();
  return {
    channel: "demo",
    delivery: "sandbox_not_sent",
    now,
    useAssistant: false,
    async getSlots(workspace, from) {
      return provider.getSlots({ tenant: workspace.tenant, from });
    },
    async bookSlot(_workspace, slot, summary) {
      return provider.book({ tenant: demoTenant(now), slot, summary });
    },
  };
}

export async function demoMissedCall(workspace: Workspace, at = new Date(), from = DEMO_CALLER_PHONE) {
  return handleMissedCall(workspace, { from, at }, demoRuntime(at));
}

export async function demoCustomerReply(workspace: Workspace, body: string, at = new Date(), from = DEMO_CALLER_PHONE) {
  return handleInbound(workspace, { from, body, at }, demoRuntime(at));
}
