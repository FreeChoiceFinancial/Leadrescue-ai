import { crmLiveEnabled } from "@/lib/crm/mode";
import type { Workspace } from "@/lib/domain/types";

/**
 * After a lead change. Sandbox and CRM_LIVE=false return before any CRM call.
 * The live importer is loaded only when the flag is on, so demo runs do not touch it.
 */
export async function noteCrmSync(workspace: Workspace): Promise<void> {
  if (!crmLiveEnabled()) return;
  try {
    const { runLiveCrmSync } = await import("@/lib/crm/live-sync");
    await runLiveCrmSync(workspace);
  } catch {
    // Do not log the failure. It can contain a phone, a message, or a token.
  }
}
