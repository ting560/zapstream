"use client";

import type {
  IPTVCredentials,
  IPTVAuthResponse,
  IPTVCategory,
  IPTVLiveStream,
  IPTVVodStream,
  IPTVSeries,
  IPTVSeriesInfo,
  IPTVVodInfo,
  ContentKind,
} from "./iptv-types";

async function callApi(
  credentials: IPTVCredentials,
  action?: string,
  extra?: Record<string, string>
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  const base = credentials.server.replace(/\/$/, "");
  const url = new URL(base + "/player_api.php");
  url.searchParams.set("username", credentials.username);
  url.searchParams.set("password", credentials.password);
  if (action) url.searchParams.set("action", action);
  for (const [k, v] of Object.entries(extra || {})) {
    if (v) url.searchParams.set(k, v);
  }

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: "application/json, text/plain, */*" },
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Servidor respondeu ${res.status}`);
    return await res.json();
  } catch {
    clearTimeout(timeout);
    return callApiViaProxy(credentials, action, extra);
  }
}

async function callApiViaProxy(
  credentials: IPTVCredentials,
  action?: string,
  extra?: Record<string, string>
) {
  const res = await fetch("/api/iptv", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credentials, action, ...extra }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `Erro ${res.status}`);
  }
  const json = await res.json();
  if (!json.ok) {
    throw new Error(json.error || "Erro ao contatar o servidor");
  }
  return json.data;
}

export async function authenticate(
  credentials: IPTVCredentials
): Promise<IPTVAuthResponse> {
  const data = await callApi(credentials);
  if (data?.user_info?.auth !== 1) {
    throw new Error(data?.user_info?.message || "Credenciais inválidas");
  }
  return data as IPTVAuthResponse;
}

export async function getCategories(
  credentials: IPTVCredentials,
  kind: ContentKind
): Promise<IPTVCategory[]> {
  const action = kind === "live" ? "get_live_categories" : kind === "vod" ? "get_vod_categories" : "get_series_categories";
  const data = await callApi(credentials, action);
  return Array.isArray(data) ? data : [];
}

export async function getLiveStreams(
  credentials: IPTVCredentials,
  categoryId?: string
): Promise<IPTVLiveStream[]> {
  const data = await callApi(credentials, "get_live_streams", {
    ...(categoryId && categoryId !== "all" ? { category_id: categoryId } : {}),
  });
  return Array.isArray(data) ? data : [];
}

export async function getVodStreams(
  credentials: IPTVCredentials,
  categoryId?: string
): Promise<IPTVVodStream[]> {
  const data = await callApi(credentials, "get_vod_streams", {
    ...(categoryId && categoryId !== "all" ? { category_id: categoryId } : {}),
  });
  return Array.isArray(data) ? data : [];
}

export async function getSeries(
  credentials: IPTVCredentials,
  categoryId?: string
): Promise<IPTVSeries[]> {
  const data = await callApi(credentials, "get_series", {
    ...(categoryId && categoryId !== "all" ? { category_id: categoryId } : {}),
  });
  return Array.isArray(data) ? data : [];
}

export async function getVodInfo(
  credentials: IPTVCredentials,
  vodId: string
): Promise<IPTVVodInfo> {
  return callApi(credentials, "get_vod_info", { vod_id: vodId });
}

export async function getSeriesInfo(
  credentials: IPTVCredentials,
  seriesId: string
): Promise<IPTVSeriesInfo> {
  return callApi(credentials, "get_series_info", { series_id: seriesId });
}

export function buildStreamUrl(
  credentials: IPTVCredentials,
  kind: ContentKind,
  id: number | string,
  ext: string
): string {
  const base = credentials.server.replace(/\/$/, "");
  const u = encodeURIComponent(credentials.username);
  const p = encodeURIComponent(credentials.password);
  let direct: string;
  if (kind === "live") {
    direct = `${base}/live/${u}/${p}/${id}.m3u8`;
  } else if (kind === "vod") {
    direct = `${base}/movie/${u}/${p}/${id}.${ext}`;
  } else {
    direct = `${base}/series/${u}/${p}/${id}.${ext}`;
  }
  return direct.startsWith("https://") ? direct : `/api/stream?url=${encodeURIComponent(direct)}`;
}
