import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";

const DB_PATH = path.join("/tmp", "visits.json");

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

let inMemoryVisits: VisitRecord[] | null = null;

function ensureDir() {
  const dir = path.dirname(DB_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function loadFromDisk(): VisitRecord[] {
  try {
    if (!existsSync(DB_PATH)) return [];
    const raw = readFileSync(DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveToDisk(visits: VisitRecord[]) {
  try {
    ensureDir();
    writeFileSync(DB_PATH, JSON.stringify(visits), "utf-8");
  } catch {}
}

function getVisits(): VisitRecord[] {
  if (inMemoryVisits === null) {
    inMemoryVisits = loadFromDisk();
  }
  return inMemoryVisits;
}

function persist(visits: VisitRecord[]) {
  inMemoryVisits = visits;
  saveToDisk(visits);
}

export function addVisit(record: Omit<VisitRecord, "created_at">) {
  const visits = getVisits();
  visits.push({ ...record, created_at: new Date().toISOString() });
  persist(visits);
}

export function getAllVisits(): VisitRecord[] {
  return [...getVisits()];
}

export function clearVisits() {
  persist([]);
}
