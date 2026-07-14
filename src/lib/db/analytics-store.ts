import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";

const DB_PATH = path.join("/tmp", "visits.json");

function ensureDir() {
  const dir = path.dirname(DB_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export interface VisitRecord {
  id: string;
  ip: string;
  city: string;
  region: string;
  country: string;
  page: string;
  user_agent: string;
  referrer: string;
  server_name: string;
  created_at: string;
}

function readVisits(): VisitRecord[] {
  try {
    if (!existsSync(DB_PATH)) return [];
    const raw = readFileSync(DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeVisits(visits: VisitRecord[]) {
  ensureDir();
  writeFileSync(DB_PATH, JSON.stringify(visits), "utf-8");
}

export function addVisit(record: Omit<VisitRecord, "created_at">) {
  const visits = readVisits();
  visits.push({ ...record, created_at: new Date().toISOString() });
  writeVisits(visits);
}

export function getAllVisits(): VisitRecord[] {
  return readVisits();
}

export function clearVisits() {
  ensureDir();
  writeFileSync(DB_PATH, "[]", "utf-8");
}
