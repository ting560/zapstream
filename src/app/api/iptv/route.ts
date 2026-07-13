import { NextRequest, NextResponse } from "next/server";
import type { IPTVCredentials } from "@/lib/iptv-types";

/**
 * Helper para fazer chamadas ao Xtream Codes API do lado do servidor.
 * Esconde credenciais do cliente e evita problemas de CORS.
 */
export async function callXtreamAPI(
  credentials: IPTVCredentials,
  params: Record<string, string | undefined>
) {
  const url = new URL(
    credentials.server.replace(/\/$/, "") + "/player_api.php"
  );
  url.searchParams.set("username", credentials.username);
  url.searchParams.set("password", credentials.password);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") {
      url.searchParams.set(k, v);
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: new URL(credentials.server).origin + "/",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: `Servidor respondeu ${res.status}`,
      };
    }

    const text = await res.text();
    try {
      const json = JSON.parse(text);
      return { ok: true, data: json };
    } catch {
      return { ok: false, error: "Resposta inválida do servidor" };
    }
  } catch (e: any) {
    if (e?.name === "AbortError") {
      return { ok: false, error: "Timeout ao contatar servidor" };
    }
    return { ok: false, error: e?.message ?? "Erro desconhecido" };
  } finally {
    clearTimeout(timeout);
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
    return NextResponse.json(
      { ok: false, error: "Credenciais incompletas" },
      { status: 400 }
    );
  }

  const result = await callXtreamAPI(body.credentials, {
    action: body.action,
    category_id: body.category_id,
    stream_id: body.stream_id,
    series_id: body.series_id,
    vod_id: body.vod_id,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }

  return NextResponse.json(result);
}
