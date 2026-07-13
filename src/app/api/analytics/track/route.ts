import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

interface Visit {
  id: string;
  ip: string;
  city: string;
  region: string;
  country: string;
  page: string;
  userAgent: string;
  referrer: string;
  timestamp: string;
  serverName: string;
}

const MAX_VISITS = 10000;

function getFilePath() {
  if (process.env.VERCEL) {
    return path.join("/tmp", "analytics.json");
  }
  return path.join(process.cwd(), "db", "analytics.json");
}

async function readVisits(): Promise<Visit[]> {
  const filePath = getFilePath();
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeVisits(visits: Visit[]): Promise<void> {
  const filePath = getFilePath();
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(visits, null, 2), "utf-8");
  } catch {}
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    const visit: Visit = {
      id: generateId(),
      ip,
      city: req.headers.get("x-vercel-ip-city") || body.city || "Desconhecida",
      region: req.headers.get("x-vercel-ip-country-region") || body.region || "Desconhecido",
      country: req.headers.get("x-vercel-ip-country") || body.country || "Desconhecido",
      page: body.page || "/",
      userAgent: req.headers.get("user-agent") || "unknown",
      referrer: req.headers.get("referer") || "",
      timestamp: new Date().toISOString(),
      serverName: body.serverName || "",
    };

    const visits = await readVisits();
    visits.unshift(visit);

    if (visits.length > MAX_VISITS) {
      visits.length = MAX_VISITS;
    }

    await writeVisits(visits);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
