import { NextRequest, NextResponse } from "next/server";
import https from "https";
import http from "http";

const CDN = "1007.cdn10embed.xyz";
const REFERER_BASE = "https://13embeddecanais.xyz/";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

function isAbsoluteUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

function resolveUrl(base: string, rel: string): string {
  if (isAbsoluteUrl(rel)) return rel;
  try { return new URL(rel, base).toString(); } catch { return rel; }
}

function fetchUrl(target: string, headers: Record<string, string>): Promise<{ status: number; body: Buffer; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const u = new URL(target);
    const mod = u.protocol === "https:" ? https : http;
    const options = {
      hostname: u.hostname,
      port: u.port || (u.protocol === "https:" ? 443 : 80),
      path: u.pathname + u.search,
      method: "GET",
      headers,
      timeout: 30000,
    };
    const req = mod.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        const respHeaders: Record<string, string> = {};
        for (const [k, v] of Object.entries(res.headers)) {
          if (typeof v === "string") respHeaders[k] = v;
          else if (Array.isArray(v)) respHeaders[k] = v[0];
        }
        resolve({
          status: res.statusCode || 500,
          body: Buffer.concat(chunks),
          headers: respHeaders,
        });
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
    req.end();
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const canal = searchParams.get("c");
  const file = searchParams.get("f") || "index.m3u8";

  if (!canal) {
    return new NextResponse("Missing canal param", { status: 400 });
  }

  const target = `https://${CDN}/${canal}/${file}`;
  const referer = `${REFERER_BASE}${canal}/`;

  const headers: Record<string, string> = {
    "User-Agent": UA,
    Accept: "*/*",
    Referer: referer,
  };

  const range = req.headers.get("range");
  if (range) headers["Range"] = range;

  let upstream: { status: number; body: Buffer; headers: Record<string, string> };
  try {
    upstream = await fetchUrl(target, headers);
  } catch (e: any) {
    return NextResponse.json({ error: "Falha ao buscar stream", detail: e?.message }, { status: 502 });
  }

  if (upstream.status !== 200 && upstream.status !== 206) {
    return new NextResponse(`Upstream error: ${upstream.status}`, { status: upstream.status });
  }

  const contentType = (upstream.headers["content-type"] || "").toLowerCase();
  const isManifest = file.toLowerCase().endsWith(".m3u8") || contentType.includes("mpegurl") || contentType.includes("vnd.apple.mpegurl");

  if (isManifest) {
    const text = upstream.body.toString("utf-8");
    const selfUrl = `/api/canais/stream?c=${encodeURIComponent(canal)}&f=`;
    const rewritten = text.split("\n").map((line) => {
      const t = line.trim();
      if (!t || t.startsWith("#")) return line;
      if (/^#EXT-X-MAP:URI="/i.test(t)) {
        return t.replace(/(#EXT-X-MAP:URI=")([^"]+)(".*)?/i, (_, pre, uri, post) => {
          return pre + selfUrl + encodeURIComponent(uri) + (post || "");
        });
      }
      if (/^[a-zA-Z0-9_.-]+\.(mp4|m4s|ts|m3u8)$/.test(t)) {
        return selfUrl + encodeURIComponent(t);
      }
      return line;
    }).join("\n");
    return new NextResponse(rewritten, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  const respHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-cache",
  };

  const ext = file.split(".").pop()?.toLowerCase() || "";
  const extContentType: Record<string, string> = {
    mp4: "video/mp4", ts: "video/mp2t", m4s: "video/mp4", m3u8: "application/vnd.apple.mpegurl",
  };

  const upstreamCT = (upstream.headers["content-type"] || "").toLowerCase();
  let finalCT = upstreamCT;
  if ((!finalCT || finalCT.includes("octet-stream")) && extContentType[ext]) {
    finalCT = extContentType[ext];
  }
  if (!finalCT.startsWith("video/") && !finalCT.startsWith("audio/")) {
    finalCT = extContentType[ext] || "video/mp2t";
  }
  if (finalCT) respHeaders["content-type"] = finalCT;

  const passthrough = ["content-length", "content-range", "accept-ranges", "last-modified", "etag"];
  for (const h of passthrough) {
    const v = upstream.headers[h];
    if (v) respHeaders[h] = v;
  }
  if (!respHeaders["accept-ranges"]) respHeaders["accept-ranges"] = "bytes";

  return new NextResponse(upstream.body, { status: upstream.status, headers: respHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
