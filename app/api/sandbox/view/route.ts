import { sandboxViewResponse, type SandboxView } from "@/lib/http/sandbox-view";

export function GET(request: Request) {
  const mode: SandboxView = new URL(request.url).searchParams.get("mode") === "fresh" ? "fresh" : "sample";
  return sandboxViewResponse(mode);
}