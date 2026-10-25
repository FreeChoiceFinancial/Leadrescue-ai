import { normalizePhone } from "@/lib/domain/phone";
import type { Workspace } from "@/lib/domain/types";
import { buildSandboxWorkspace } from "@/lib/demo/fixture";
import type { LeadStore } from "@/lib/store/types";

export function createMemoryStore(initial: Workspace[] = []): LeadStore {
  const byId = new Map(initial.map((workspace) => [workspace.tenant.id, structuredClone(workspace)]));
  return {
    mode: "sandbox",
    async getBySmsNumber(to) {
      const phone = normalizePhone(to);
      const found = [...byId.values()].find((workspace) => normalizePhone(workspace.tenant.smsFromNumber) === phone);
      return found ? structuredClone(found) : null;
    },
    async getById(tenantId) {
      const found = byId.get(tenantId);
      return found ? structuredClone(found) : null;
    },
    async save(workspace) {
      byId.set(workspace.tenant.id, structuredClone(workspace));
    },
    async list() {
      return [...byId.values()].map((workspace) => structuredClone(workspace));
    },
  };
}

const globalStore = globalThis as unknown as { __leadrescueSandbox?: LeadStore };

export function getSandboxStore(): LeadStore {
  if (!globalStore.__leadrescueSandbox) {
    globalStore.__leadrescueSandbox = createMemoryStore([buildSandboxWorkspace()]);
  }
  return globalStore.__leadrescueSandbox;
}
