import { NextRequest, NextResponse } from "next/server";
import { readLocalImage, imageExists, getExt, getContentType } from "@/lib/img-downloader";

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

async function fetchImage(url: string): Promise<{ data: Buffer; type: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ct = res.headers.get("content-type") || "";
    const ab = await res.arrayBuffer();
    return { data: Buffer.from(ab), type: ct };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const target = url.searchParams.get("url");
    if (!target) return new NextResponse("Missing url", { status: 400 });

    // Check local /tmp/covers/ first
    if (imageExists(target)) {
      const data = readLocalImage(target);
      if (data) {
        const ext = getExt(target);
        const contentType = getContentType(ext);
        return new NextResponse(data, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=86400, immutable",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
    }

    const ext = getExt(target);
    const contentType = getContentType(ext);
    const MEMORY_CACHE = getCache();

    if (MEMORY_CACHE.has(target)) {
      const cached = MEMORY_CACHE.get(target)!;
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

    const { data, type } = await fetchImage(target);
    const etag = `"${data.length.toString(36)}"`;

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
    const target = new URL(req.url).searchParams.get("url");
    if (target) return NextResponse.redirect(target);
    return new NextResponse("Error", { status: 500 });
  }
}
