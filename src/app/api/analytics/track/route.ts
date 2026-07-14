import { NextRequest, NextResponse } from "next/server";
import { addVisit } from "@/lib/db/analytics-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    const visit = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 9),
      ip,
      city: req.headers.get("x-vercel-ip-city") || "Desconhecida",
      region: req.headers.get("x-vercel-ip-country-region") || "Desconhecido",
      country: req.headers.get("x-vercel-ip-country") || "Desconhecido",
      page: body.page || "/",
      userAgent: req.headers.get("user-agent") || "unknown",
      referrer: req.headers.get("referer") || "",
      timestamp: new Date().toISOString(),
      serverName: body.serverName || "",
    };

    await addVisit(visit);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
