import { NextRequest, NextResponse } from "next/server";
import http from "http";
import https from "https";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function isAbsoluteUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

function resolveUrl(base: string, rel: string): string {
  if (isAbsoluteUrl(rel)) return rel;
  try { return new URL(rel, base).toString(); } catch { return rel; }
}

function rewriteManifest(manifest: string, finalUrl: string): string {
  return manifest.split("\n").map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;
    const absolute = resolveUrl(finalUrl, trimmed);
    return `/api/stream?url=${encodeURIComponent(absolute)}`;
  }).join("\n");
}

function fetchUrl(target: string, headers: Record<string, string>): Promise<{ status: number; body: Buffer; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const u = new URL(target);
    const mod = u.protocol === "https:" ? https : http;
    const options: http.RequestOptions = {
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
  const url = new URL(req.url);
  const target = url.searchParams.get("url");
  if (!target) return new NextResponse("Missing url param", { status: 400 });

  const headers: Record<string, string> = {
    "User-Agent": UA,
    Accept: "*/*",
    Referer: new URL(target).origin + "/",
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
  const isManifest = target.toLowerCase().endsWith(".m3u8") || contentType.includes("mpegurl") || contentType.includes("vnd.apple.mpegurl");

  if (isManifest) {
    const text = upstream.body.toString("utf-8");
    const rewritten = rewriteManifest(text, upstream.headers["x-final-url"] || target);
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

  const upstreamCT = (upstream.headers["content-type"] || "").toLowerCase();
  const urlPath = new URL(target).pathname.toLowerCase();
  const extMatch = urlPath.match(/\.([a-z0-9]{2,4})$/);
  const ext = extMatch?.[1] || "";

  const extContentType: Record<string, string> = {
    mp4: "video/mp4", m4v: "video/mp4", ts: "video/mp2t", mpegts: "video/mp2t",
    webm: "video/webm", ogg: "video/ogg", ogv: "video/ogg", mkv: "video/x-matroska",
    avi: "video/x-msvideo", mov: "video/quicktime", flv: "video/x-flv",
    wav: "audio/wav", mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac",
  };

  let finalCT = upstreamCT;
  if ((!finalCT || finalCT.includes("octet-stream") || finalCT.includes("text/html")) && extContentType[ext]) {
    finalCT = extContentType[ext];
  }
  if (!finalCT.startsWith("video/") && !finalCT.startsWith("audio/") && !finalCT.includes("mpegurl") && extContentType[ext] === undefined) {
    finalCT = "video/mp2t";
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
