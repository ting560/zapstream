import { NextRequest, NextResponse } from "next/server";

const CDN = "1007.cdn10embed.xyz";
const REFERER_BASE = "https://13embeddecanais.xyz/";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

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

  let upstream: Response;
  try {
    upstream = await fetch(target, { headers });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Falha ao buscar stream", detail: e?.message },
      { status: 502 }
    );
  }

  if (upstream.status !== 200 && upstream.status !== 206) {
    return new NextResponse(`Upstream error: ${upstream.status}`, {
      status: upstream.status,
    });
  }

  const contentType = (upstream.headers.get("content-type") || "").toLowerCase();
  const isManifest =
    file.toLowerCase().endsWith(".m3u8") ||
    contentType.includes("mpegurl") ||
    contentType.includes("vnd.apple.mpegurl");

  if (isManifest) {
    const text = await upstream.text();
    const selfUrl = `/api/canais/stream?c=${encodeURIComponent(canal)}&f=`;
    const rewritten = text
      .split("\n")
      .map((line) => {
        const t = line.trim();
        if (!t || t.startsWith("#")) return line;
        if (/^#EXT-X-MAP:URI="/i.test(t)) {
          return t.replace(
            /(#EXT-X-MAP:URI=")([^"]+)(".*)?/i,
            (_, pre, uri, post) => pre + selfUrl + encodeURIComponent(uri) + (post || "")
          );
        }
        if (/^[a-zA-Z0-9_.-]+\.(mp4|m4s|ts|m3u8)$/.test(t)) {
          return selfUrl + encodeURIComponent(t);
        }
        return line;
      })
      .join("\n");
    return new NextResponse(rewritten, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  const ext = file.split(".").pop()?.toLowerCase() || "";
  const extContentType: Record<string, string> = {
    mp4: "video/mp4",
    ts: "video/mp2t",
    m4s: "video/mp4",
    m3u8: "application/vnd.apple.mpegurl",
  };

  const upstreamCT = (upstream.headers.get("content-type") || "").toLowerCase();
  let finalCT = upstreamCT;
  if ((!finalCT || finalCT.includes("octet-stream")) && extContentType[ext]) {
    finalCT = extContentType[ext];
  }
  if (!finalCT.startsWith("video/") && !finalCT.startsWith("audio/")) {
    finalCT = extContentType[ext] || "video/mp2t";
  }

  const respHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-cache",
    "content-type": finalCT,
  };

  const passthrough = [
    "content-length",
    "content-range",
    "accept-ranges",
    "last-modified",
    "etag",
  ];
  for (const h of passthrough) {
    const v = upstream.headers.get(h);
    if (v) respHeaders[h] = v;
  }
  if (!respHeaders["accept-ranges"]) respHeaders["accept-ranges"] = "bytes";

  const body = await upstream.arrayBuffer();

  return new NextResponse(body, {
    status: upstream.status,
    headers: respHeaders,
  });
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
