import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

interface ServerItem {
  id: string;
  name: string;
  url: string;
  username: string;
  password: string;
  active: boolean;
  created_at: string;
}

function getFilePath() {
  if (process.env.VERCEL) {
    return path.join("/tmp", "servers.json");
  }
  return path.join(process.cwd(), "db", "servers.json");
}

let inMemoryServers: ServerItem[] | null = null;

const DEFAULT_SERVERS: ServerItem[] = [
  {
    id: "1",
    name: "ooo.fo",
    url: "https://ooo.fo",
    username: "josias.barbosa.costa@gmail.com",
    password: "123abc",
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    name: "srv.cldplay.in",
    url: "https://srv.cldplay.in",
    username: "lelezago",
    password: "lelezago@2021",
    active: true,
    created_at: new Date().toISOString(),
  },
];

async function readFromSupabase(): Promise<ServerItem[] | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;
  try {
    const { supabase } = await import("@/lib/supabase");
    const { data, error } = await supabase.from("servers").select("*").order("created_at", { ascending: true });
    if (error) throw error;
    return (data as ServerItem[]) || [];
  } catch {
    return null;
  }
}

async function writeToSupabase(servers: ServerItem[]): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return false;
  try {
    const { supabase } = await import("@/lib/supabase");
    const { error: delErr } = await supabase.from("servers").delete().neq("id", "");
    if (delErr) throw delErr;
    if (servers.length > 0) {
      const { error: insErr } = await supabase.from("servers").insert(servers);
      if (insErr) throw insErr;
    }
    return true;
  } catch {
    return false;
  }
}

async function readServers(): Promise<ServerItem[]> {
  if (inMemoryServers) return inMemoryServers;

  // Try Supabase first
  const fromSupabase = await readFromSupabase();
  if (fromSupabase !== null) {
    inMemoryServers = fromSupabase;
    return fromSupabase;
  }

  // Fallback to file
  const filePath = getFilePath();
  try {
    const data = await fs.readFile(filePath, "utf-8");
    const servers = JSON.parse(data);
    inMemoryServers = servers;
    return servers;
  } catch {
    await writeServers(DEFAULT_SERVERS);
    return DEFAULT_SERVERS;
  }
}

async function writeServers(servers: ServerItem[]): Promise<void> {
  inMemoryServers = servers;

  // Try Supabase first
  const wrote = await writeToSupabase(servers);
  if (wrote) return;

  // Fallback to file
  const filePath = getFilePath();
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(servers, null, 2), "utf-8");
  } catch {}
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export async function GET() {
  try {
    const servers = await readServers();
    // Map Supabase snake_case to camelCase for frontend compatibility
    return NextResponse.json(servers.map((s) => ({
      id: s.id,
      name: s.name,
      url: s.url,
      username: s.username,
      password: s.password,
      active: s.active,
      createdAt: s.created_at,
    })));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, url, username, password } = body;
    if (!name || !url || !username || !password) {
      return NextResponse.json({ error: "Todos os campos são obrigatórios" }, { status: 400 });
    }
    const servers = await readServers();
    const server: ServerItem = {
      id: generateId(),
      name,
      url,
      username,
      password,
      active: true,
      created_at: new Date().toISOString(),
    };
    servers.push(server);
    await writeServers(servers);
    return NextResponse.json({
      id: server.id,
      name: server.name,
      url: server.url,
      username: server.username,
      password: server.password,
      active: server.active,
      createdAt: server.created_at,
    }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, url, username, password, active } = body;
    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }
    const servers = await readServers();
    const index = servers.findIndex((s) => s.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "Servidor não encontrado" }, { status: 404 });
    }
    servers[index] = {
      ...servers[index],
      ...(name !== undefined && { name }),
      ...(url !== undefined && { url }),
      ...(username !== undefined && { username }),
      ...(password !== undefined && { password }),
      ...(active !== undefined && { active }),
    };
    await writeServers(servers);
    return NextResponse.json({
      id: servers[index].id,
      name: servers[index].name,
      url: servers[index].url,
      username: servers[index].username,
      password: servers[index].password,
      active: servers[index].active,
      createdAt: servers[index].created_at,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }
    const servers = await readServers();
    const filtered = servers.filter((s) => s.id !== id);
    if (filtered.length === servers.length) {
      return NextResponse.json({ error: "Servidor não encontrado" }, { status: 404 });
    }
    await writeServers(filtered);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
