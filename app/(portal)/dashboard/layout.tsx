import { PortalShell } from "@/components/portal/PortalShell";
import { getPortalModel } from "@/lib/portal/load";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const model = await getPortalModel();
  return (
    <PortalShell tenantName={model.workspace.tenant.name} mode={model.mode} view={model.view} plan={model.workspace.tenant.plan}>
      {children}
    </PortalShell>
  );
}
