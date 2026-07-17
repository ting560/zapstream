"use client";

import type { ContentKind } from "./iptv-types";

const CACHE_KEY = "tmdb_poster_cache";
const TMDB_CDN = "https://image.tmdb.org/t/p/w500";

interface CacheEntry {
  poster: string | null;
  ts: number;
}

function readCache(): Record<string, CacheEntry> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, CacheEntry>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage cheio
  }
}

function cacheKey(name: string, kind: ContentKind): string {
  return `${kind}:${name.toLowerCase().trim()}`;
}

export async function getPosterUrl(
  name: string,
  kind: ContentKind
): Promise<string | null> {
  if (kind === "live") return null;

  const key = cacheKey(name, kind);
  const cache = readCache();

  // Cache válido por 7 dias
  const entry = cache[key];
  if (entry && Date.now() - entry.ts < 7 * 24 * 3600 * 1000) {
    return entry.poster ? `${TMDB_CDN}${entry.poster}` : null;
  }

  // Não está no cache: busca da API
  try {
    const res = await fetch(`/api/tmdb/search?name=${encodeURIComponent(name)}&kind=${kind}`);
    const json = await res.json();

    // Atualiza cache
    cache[key] = { poster: json.poster ? json.poster.replace(TMDB_CDN, "") : null, ts: Date.now() };
    writeCache(cache);

    return json.poster || null;
  } catch {
    return null;
  }
}
