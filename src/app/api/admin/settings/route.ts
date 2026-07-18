import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

interface AppSettings {
  adultCategories: string[];
  pin: string;
  disabledTabs: string[];
  adminPassword: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  adultCategories: ["Erótico", "Adultos", "XXX"],
  pin: "123456",
  disabledTabs: [],
  adminPassword: "Frenesi04",
};

function getFilePath() {
  if (process.env.VERCEL) {
    return path.join("/tmp", "settings.json");
  }
  return path.join(process.cwd(), "db", "settings.json");
}

async function readSettings(): Promise<AppSettings> {
  const filePath = getFilePath();
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch {
    await writeSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
}

async function writeSettings(settings: AppSettings): Promise<void> {
  const filePath = getFilePath();
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(settings, null, 2), "utf-8");
  } catch {}
}

export async function GET() {
  try {
    const settings = await readSettings();
    const { adminPassword, ...safe } = settings;
    return NextResponse.json(safe);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const settings = await readSettings();
    const valid = password === settings.adminPassword;
    return NextResponse.json({ valid });
  } catch (e: any) {
    return NextResponse.json({ valid: false, error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { adultCategories, pin, disabledTabs, adminPassword } = body;
    const settings = await readSettings();
    if (adultCategories !== undefined) {
      settings.adultCategories = Array.isArray(adultCategories) ? adultCategories : adultCategories.split(",").map((s: string) => s.trim()).filter(Boolean);
    }
    if (pin !== undefined) {
      settings.pin = String(pin);
    }
    if (disabledTabs !== undefined) {
      settings.disabledTabs = Array.isArray(disabledTabs) ? disabledTabs : [];
    }
    if (adminPassword !== undefined) {
      settings.adminPassword = String(adminPassword);
    }
    await writeSettings(settings);
    return NextResponse.json(settings);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
