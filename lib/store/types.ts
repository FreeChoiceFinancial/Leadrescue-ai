import type { Workspace } from "@/lib/domain/types";

export type LeadStore = {
  mode: "live" | "sandbox";
  getBySmsNumber(to: string): Promise<Workspace | null>;
  getById(tenantId: string): Promise<Workspace | null>;
  save(workspace: Workspace): Promise<void>;
  list(): Promise<Workspace[]>;
};
