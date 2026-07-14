import { NextRequest, NextResponse } from "next/server";
import http from "http";
import https from "https";

function getCache(): Map<string, { data: Buffer; type: string; etag: string }> {
  if (typeof globalThis !== "undefined") {
    if (!(globalThis as any).__imgCache) {
      (globalThis as any).__imgCache = new Map();
    }
    return (globalThis as any).__imgCache;
  }
  return new Map();
}

const MAX_CACHE = 500;

function getExtension(url: string): string {
  const match = url.match(/\.(jpe?g|png|gif|webp|svg|ico|bmp)(\?|$)/i);
  return match ? match[1].toLowerCase() : "jpg";
}

function getContentType(ext: string): string {
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
    ico: "image/x-icon", bmp: "image/bmp",
  };
  return map[ext] || "image/jpeg";
}

function fetchImage(url: string): Promise<{ data: Buffer; type: string }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const mod = u.protocol === "https:" ? https : http;
    const req = mod.get(url, { timeout: 15000 }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        const ct = res.headers["content-type"] || "";
        resolve({ data: Buffer.concat(chunks), type: ct });
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const target = url.searchParams.get("url");
    if (!target) return new NextResponse("Missing url", { status: 400 });

    const ext = getExtension(target);
    const contentType = getContentType(ext);

    const MEMORY_CACHE = getCache();

  // Check memory cache
    if (MEMORY_CACHE.has(target)) {
      const cached = MEMORY_CACHE.get(target)!;
      // Re-validate with If-None-Match
      const ifNoneMatch = req.headers.get("if-none-match");
      if (ifNoneMatch === cached.etag) {
        return new NextResponse(null, { status: 304 });
      }
      return new NextResponse(cached.data, {
        status: 200,
        headers: {
          "Content-Type": cached.type || contentType,
          "Cache-Control": "public, max-age=86400, immutable",
          "ETag": cached.etag,
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Fetch from remote
    const { data, type } = await fetchImage(target);
    const etag = `"${data.length.toString(36)}"`;

    // Store in memory cache
    if (MEMORY_CACHE.size >= MAX_CACHE) {
      const firstKey = MEMORY_CACHE.keys().next().value;
      if (firstKey) MEMORY_CACHE.delete(firstKey);
    }
    MEMORY_CACHE.set(target, { data, type: type || contentType, etag });

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": type || contentType,
        "Cache-Control": "public, max-age=86400, immutable",
        "ETag": etag,
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e: any) {
    // Fallback: redirect to original URL
    const target = new URL(req.url).searchParams.get("url");
    if (target) return NextResponse.redirect(target);
    return new NextResponse("Error", { status: 500 });
  }
}
