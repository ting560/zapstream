import { NextRequest, NextResponse } from "next/server";
import type { IPTVCredentials } from "@/lib/iptv-types";
import http from "http";
import https from "https";

// Cache server-side para evitar chamadas repetidas à API externa
const proxyCache = new Map<string, { data: any; expiry: number }>();
const PROXY_CACHE_TTL = 30 * 60 * 1000; // 30 min

function getProxyCacheKey(credentials: IPTVCredentials, params: Record<string, string | undefined>): string {
  return `${credentials.server}|${credentials.username}|${params.action || ""}|${params.category_id || ""}`;
}

function httpRequest(url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const mod = u.protocol === "https:" ? https : http;
    const req = mod.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
          Referer: u.origin + "/",
          "Cache-Control": "no-cache",
        },
        timeout: 8000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => (data += chunk.toString()));
        res.on("end", () => resolve({ status: res.statusCode || 500, body: data }));
      }
    );
    req.on("error", (e) => reject(e));
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

export async function callXtreamAPI(
  credentials: IPTVCredentials,
  params: Record<string, string | undefined>
) {
  const url = new URL(credentials.server.replace(/\/$/, "") + "/player_api.php");
  url.searchParams.set("username", credentials.username);
  url.searchParams.set("password", credentials.password);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, v);
  }

  try {
    const { status, body } = await httpRequest(url.toString());
    if (status === 403 && url.protocol === "http:") {
      const httpsUrl = url.toString().replace(/^http:/, "https:").replace(/:80\//, ":443/");
      const { status: s2, body: b2 } = await httpRequest(httpsUrl);
      if (s2 === 200) {
        try { return { ok: true, data: JSON.parse(b2) }; } catch { return { ok: false, error: "Resposta inválida do servidor" }; }
      }
      return { ok: false, status: s2, error: `Servidor respondeu ${s2}` };
    }
    if (status !== 200) return { ok: false, status, error: `Servidor respondeu ${status}` };
    try {
      const json = JSON.parse(body);
      return { ok: true, data: json };
    } catch {
      return { ok: false, error: "Resposta inválida do servidor" };
    }
  } catch (e: any) {
    if (e?.message === "Timeout") return { ok: false, error: "Timeout ao contatar servidor" };
    return { ok: false, error: e?.message ?? "Erro desconhecido" };
  }
}

export async function POST(req: NextRequest) {
  let body: {
    credentials: IPTVCredentials;
    action?: string;
    category_id?: string;
    stream_id?: string;
    series_id?: string;
    vod_id?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  if (!body.credentials?.server || !body.credentials?.username || !body.credentials?.password) {
    return NextResponse.json({ ok: false, error: "Credenciais incompletas" }, { status: 400 });
  }

  const params = {
    action: body.action,
    category_id: body.category_id,
    stream_id: body.stream_id,
    series_id: body.series_id,
    vod_id: body.vod_id,
  };

  // Verificar cache
  const cacheKey = getProxyCacheKey(body.credentials, params);
  const cached = proxyCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) {
    return NextResponse.json({ ok: true, data: cached.data }, {
      headers: { "X-Cache": "HIT" },
    });
  }

  // Se for info de vod/serie (detalhes), não cachear no servidor
  if (body.vod_id || body.series_id || body.stream_id) {
    const result = await callXtreamAPI(body.credentials, params);
    if (!result.ok) return NextResponse.json(result, { status: 502 });
    return NextResponse.json(result);
  }

  const result = await callXtreamAPI(body.credentials, params);
  if (!result.ok) return NextResponse.json(result, { status: 502 });

  proxyCache.set(cacheKey, { data: result.data, expiry: Date.now() + PROXY_CACHE_TTL });
  return NextResponse.json({ ok: true, data: result.data }, {
    headers: { "X-Cache": "MISS" },
  });
}
