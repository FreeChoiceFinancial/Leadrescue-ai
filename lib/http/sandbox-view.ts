import { NextResponse } from "next/server";

export type SandboxView = "fresh" | "sample";

const COOKIE = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 14,
};

/** Relative Location so the browser stays on the public demo host, not a unique deploy URL. */
export function sandboxViewResponse(mode: SandboxView): NextResponse {
  const response = new NextResponse(null, {
    status: 307,
    headers: { Location: "/dashboard" },
  });
  response.cookies.set("lr_sandbox_view", mode, COOKIE);
  return response;
}
