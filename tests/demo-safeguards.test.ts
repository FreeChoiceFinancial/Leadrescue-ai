import { afterEach, describe, expect, it } from "vitest";
import { assistantIsLive } from "@/lib/assistant/live";
import { completeWithAssistant } from "@/lib/assistant/openai";
import { sandboxViewResponse } from "@/lib/http/sandbox-view";
import { GET as health } from "@/app/api/health/route";
import { GET as sandboxView } from "@/app/api/sandbox/view/route";

const KEYS = ["OPENAI_API_KEY", "LLM_LIVE", "DEMO_MODE", "PUBLIC_DEMO"] as const;
const previous: Partial<Record<(typeof KEYS)[number], string | undefined>> = {};

function rememberEnv() {
  for (const key of KEYS) previous[key] = process.env[key];
}

function restoreEnv() {
  for (const key of KEYS) {
    if (previous[key] === undefined) delete process.env[key];
    else process.env[key] = previous[key];
  }
}

describe("public demo LLM safeguard", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("stays in sandbox when a key is present without LLM_LIVE", async () => {
    rememberEnv();
    process.env.OPENAI_API_KEY = "sk-injected-by-gateway";
    delete process.env.LLM_LIVE;
    delete process.env.DEMO_MODE;
    delete process.env.PUBLIC_DEMO;
    expect(assistantIsLive()).toBe(false);
    const fetchImpl = (() => {
      throw new Error("LLM should not be called");
    }) as typeof fetch;
    const decision = await completeWithAssistant(
      { tenantName: "Demo HVAC Co", history: [], latest: "furnace is broken", slotLabels: [] },
      "script",
      fetchImpl,
    );
    expect(decision.mode).toBe("sandbox");
    const payload = (await (await health()).json()) as { integrations: { assistant: string } };
    expect(payload.integrations.assistant).toBe("sandbox");
  });

  it("calls the model only when LLM_LIVE=true and demo mode is off", async () => {
    rememberEnv();
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.LLM_LIVE = "true";
    delete process.env.DEMO_MODE;
    delete process.env.PUBLIC_DEMO;
    expect(assistantIsLive()).toBe(true);
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ reply: "We can help.", service: "repair" }) } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })) as typeof fetch;
    const decision = await completeWithAssistant(
      { tenantName: "Demo HVAC Co", history: [], latest: "furnace is broken", slotLabels: [] },
      "script",
      fetchImpl,
    );
    expect(decision.mode).toBe("live");
    expect(decision.reply).toContain("We can help.");
  });

  it("refuses the model on the public demo even if LLM_LIVE and a key are set", async () => {
    rememberEnv();
    process.env.OPENAI_API_KEY = "sk-injected-by-gateway";
    process.env.LLM_LIVE = "true";
    process.env.DEMO_MODE = "true";
    const fetchImpl = (() => {
      throw new Error("public demo must not call the LLM");
    }) as typeof fetch;
    const decision = await completeWithAssistant(
      { tenantName: "Demo HVAC Co", history: [], latest: "furnace is broken", slotLabels: [] },
      "script",
      fetchImpl,
    );
    expect(decision.mode).toBe("sandbox");
    const payload = (await (await health()).json()) as { demoMode: boolean; integrations: { assistant: string } };
    expect(payload.demoMode).toBe(true);
    expect(payload.integrations.assistant).toBe("sandbox");
  });
});

describe("sandbox view redirect", () => {
  it("uses a relative Location so the browser stays on the public host", async () => {
    const direct = sandboxViewResponse("fresh");
    expect(direct.status).toBe(307);
    expect(direct.headers.get("location")).toBe("/dashboard");
    expect(direct.headers.get("set-cookie")).toContain("lr_sandbox_view=fresh");

    const response = await sandboxView(
      new Request("https://deploy-id--leadrescue-ai-demo.netlify.app/api/sandbox/view?mode=sample"),
    );
    expect(response.headers.get("location")).toBe("/dashboard");
    expect(response.headers.get("location")).not.toContain("netlify.app");
    expect(response.headers.get("set-cookie")).toContain("lr_sandbox_view=sample");
  });
});
