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
  createdAt: string;
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
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "srv.cldplay.in",
    url: "http://srv.cldplay.in:80",
    username: "lelezago",
    password: "lelezago@2021",
    active: true,
    createdAt: new Date().toISOString(),
  },
];

async function readServers(): Promise<ServerItem[]> {
  if (inMemoryServers) return inMemoryServers;
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
    return NextResponse.json(servers);
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
      createdAt: new Date().toISOString(),
    };
    servers.push(server);
    await writeServers(servers);
    return NextResponse.json(server, { status: 201 });
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
    servers[index] = { ...servers[index], ...(name !== undefined && { name }), ...(url !== undefined && { url }), ...(username !== undefined && { username }), ...(password !== undefined && { password }), ...(active !== undefined && { active }) };
    await writeServers(servers);
    return NextResponse.json(servers[index]);
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
