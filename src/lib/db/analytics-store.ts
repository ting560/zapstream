import { promises as fs } from "fs";
import path from "path";

export interface Visit {
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

function getCache(): Visit[] {
  if (typeof globalThis !== "undefined") {
    return ((globalThis as any).__analyticsCache as Visit[]) || [];
  }
  return [];
}

function setCache(visits: Visit[]) {
  if (typeof globalThis !== "undefined") {
    (globalThis as any).__analyticsCache = visits;
  }
}

export async function readVisits(): Promise<Visit[]> {
  const cached = getCache();
  if (cached.length > 0) return cached;

  const filePath = getFilePath();
  try {
    const data = await fs.readFile(filePath, "utf-8");
    const visits = JSON.parse(data);
    setCache(visits);
    return visits;
  } catch {
    return [];
  }
}

export async function writeVisits(visits: Visit[]): Promise<void> {
  setCache(visits);
  const filePath = getFilePath();
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(visits, null, 2), "utf-8");
  } catch {}
}

export async function addVisit(visit: Visit): Promise<void> {
  const visits = await readVisits();
  visits.unshift(visit);
  if (visits.length > MAX_VISITS) visits.length = MAX_VISITS;
  await writeVisits(visits);
}

export async function clearVisits(): Promise<void> {
  setCache([]);
  const filePath = getFilePath();
  try {
    await fs.writeFile(filePath, "[]", "utf-8");
  } catch {}
}
