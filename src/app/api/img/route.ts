import { NextRequest, NextResponse } from "next/server";
import https from "https";
import http from "http";

const TMDB_KEY = process.env.TMDB_KEY || "8ac491f51024cd437403cd282cfe1004";
const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450">
  <rect fill="#1a1a2e" width="300" height="450"/>
  <circle cx="150" cy="200" r="50" fill="#2d2d5e" opacity="0.5"/>
  <text x="150" y="210" text-anchor="middle" fill="#666" font-size="32" font-family="sans-serif">?</text>
</svg>`;

const MEMORY_CACHE = new Map<string, { data: Buffer; type: string }>();
const MAX_CACHE = 500;
const IN_FLIGHT = new Map<string, Promise<{ data: Buffer; type: string }>>();
const TMDB_POSTER_CACHE = new Map<string, string | null>();

function cleanTitle(title: string): string {
  return title
    .replace(/\s*\(Dublado\)\s*/gi, "")
    .replace(/\s*\(Legendado\)\s*/gi, "")
    .replace(/\s*\(Original\)\s*/gi, "")
    .replace(/\s*-\s*\d{4}\s*-\s*\d+p\s*/g, "")
    .replace(/\s*-\s*\d{4}\s*/g, "")
    .replace(/\s*-\s*[^-]+$/, "")
    .trim();
}

async function searchTMDB(name: string, kind: string): Promise<string | null> {
  const cacheKey = `${kind}:${name}`;
  if (TMDB_POSTER_CACHE.has(cacheKey)) return TMDB_POSTER_CACHE.get(cacheKey);

  const clean = cleanTitle(name);
  if (!clean) return null;

  const endpoint = kind === "series" ? "tv" : "movie";
  const url = `https://api.themoviedb.org/3/search/${endpoint}?api_key=${TMDB_KEY}&query=${encodeURIComponent(clean)}&language=pt-BR`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 zapstream/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const poster = json?.results?.[0]?.poster_path;
    if (!poster) {
      TMDB_POSTER_CACHE.set(cacheKey, null);
      return null;
    }
    TMDB_POSTER_CACHE.set(cacheKey, poster);
    return poster;
  } catch {
    return null;
  }
}

function fetchRemote(url: string, signal?: AbortSignal): Promise<{ data: Buffer; type: string }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const mod = u.protocol === "https:" ? https : http;
    const req = mod.get(
      url,
      {
        timeout: 4000,
        signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, url).toString();
          resolve(fetchRemote(redirectUrl, signal));
          return;
        }
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const ct = res.headers["content-type"] || "";
          resolve({ data: Buffer.concat(chunks), type: ct });
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Timeout"));
    });
  });
}

async function getImage(target: string): Promise<{ data: Buffer; type: string }> {
  if (MEMORY_CACHE.has(target)) return MEMORY_CACHE.get(target)!;

  const inFlight = IN_FLIGHT.get(target);
  if (inFlight) return inFlight;

  const promise = fetchRemote(target).then(
    (result) => {
      if (MEMORY_CACHE.size >= MAX_CACHE) {
        const firstKey = MEMORY_CACHE.keys().next().value;
        if (firstKey) MEMORY_CACHE.delete(firstKey);
      }
      MEMORY_CACHE.set(target, result);
      IN_FLIGHT.delete(target);
      return result;
    },
    (err) => {
      IN_FLIGHT.delete(target);
      throw err;
    }
  );

  IN_FLIGHT.set(target, promise);
  return promise;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("url");
  const name = searchParams.get("name");
  const kind = searchParams.get("kind") || "vod";

  // Se não tem URL e não tem nome, não dá pra fazer nada
  if (!target && !name) {
    return new NextResponse("Missing url or name", { status: 400 });
  }

  const ext = target?.match(/\.(jpe?g|png|gif|webp|svg|ico|bmp)(\?|$)/i)?.[1]?.toLowerCase() || "jpg";
  const contentType =
    {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      ico: "image/x-icon",
      bmp: "image/bmp",
    }[ext] || "image/jpeg";

  // Tenta buscar a URL remota primeiro
  if (target) {
    try {
      const { data, type } = await getImage(target);
      return new NextResponse(data, {
        status: 200,
        headers: {
          "Content-Type": type || contentType,
          "Cache-Control": "public, max-age=86400, immutable",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch {
      // Fallback: tenta TMDB
    }
  }

  // Fallback TMDB
  if (name) {
    try {
      const poster = await searchTMDB(name, kind);
      if (poster) {
        const tmdbUrl = `${TMDB_IMG}${poster}`;
        try {
          const { data, type } = await getImage(tmdbUrl);
          return new NextResponse(data, {
            status: 200,
            headers: {
              "Content-Type": type || "image/jpeg",
              "Cache-Control": "public, max-age=86400, immutable",
              "Access-Control-Allow-Origin": "*",
            },
          });
        } catch {
          // TMDB fetch failed, fall through to placeholder
        }
      }
    } catch {
      // TMDB search failed
    }
  }

  return new NextResponse(PLACEHOLDER_SVG, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
