import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") === "fresh" ? "fresh" : "sample";
  const jar = await cookies();
  jar.set("lr_sandbox_view", mode, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 14 });
  return NextResponse.redirect(new URL("/dashboard", url.origin));
}
