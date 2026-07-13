import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy server-side para streams IPTV (HLS m3u8 + segments).
 *
 * Necessário porque:
 * 1. O servidor ooo.fo retorna 302 para outro host (Sucuri/CDN) - sem CORS
 * 2. O hls.js do navegador não consegue seguir esses redirects cross-origin
 * 3. Os segments HLS vêm com extensões "disfarcadas" (.jar, .woff, .php)
 *
 * Query params:
 *   url=<URL absoluta do stream>
 *
 * Para .m3u8: reescreve todas as URLs do manifest para passar por este proxy.
 * Para outros arquivos (.ts, .mp4, etc): faz stream com suporte a Range.
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function isAbsoluteUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

function resolveUrl(base: string, rel: string): string {
  if (isAbsoluteUrl(rel)) return rel;
  try {
    return new URL(rel, base).toString();
  } catch {
    return rel;
  }
}

function rewriteManifest(manifest: string, finalUrl: string): string {
  const lines = manifest.split("\n");
  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return line;
      // Linha é uma URL de segmento
      const absolute = resolveUrl(finalUrl, trimmed);
      return `/api/stream?url=${encodeURIComponent(absolute)}`;
    })
    .join("\n");
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const target = url.searchParams.get("url");
  if (!target) {
    return new NextResponse("Missing url param", { status: 400 });
  }

  // Headers que repassamos - importante para Sucuri/CDN
  const headers: Record<string, string> = {
    "User-Agent": UA,
    Accept: "*/*",
    Referer: new URL(target).origin + "/",
  };

  // Repassa Range para VOD seeking
  const range = req.headers.get("range");
  if (range) headers["Range"] = range;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      headers,
      redirect: "follow",
      // @ts-ignore - Next.js suporta essa option
      next: { revalidate: 0 },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Falha ao buscar stream", detail: e?.message },
      { status: 502 }
    );
  }

  if (!upstream.ok && upstream.status !== 206) {
    return new NextResponse(`Upstream error: ${upstream.status}`, {
      status: upstream.status,
    });
  }

  const contentType = (upstream.headers.get("content-type") || "").toLowerCase();
  const isManifest =
    target.toLowerCase().endsWith(".m3u8") ||
    contentType.includes("mpegurl") ||
    contentType.includes("vnd.apple.mpegurl");

  if (isManifest) {
    const text = await upstream.text();
    const rewritten = rewriteManifest(text, upstream.url || target);
    return new NextResponse(rewritten, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // Stream de segmento ou VOD - repassa com Range support
  const respHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-cache",
  };

  // Inferir content-type pela extensão quando o upstream não fornecer um útil
  const upstreamCT = (upstream.headers.get("content-type") || "").toLowerCase();
  const urlPath = new URL(target).pathname.toLowerCase();
  const extMatch = urlPath.match(/\.([a-z0-9]{2,4})$/);
  const ext = extMatch?.[1] || "";

  const extContentType: Record<string, string> = {
    mp4: "video/mp4",
    m4v: "video/mp4",
    m3u8: "application/vnd.apple.mpegurl",
    ts: "video/mp2t",
    mpegts: "video/mp2t",
    webm: "video/webm",
    ogg: "video/ogg",
    ogv: "video/ogg",
    mkv: "video/x-matroska",
    avi: "video/x-msvideo",
    mov: "video/quicktime",
    flv: "video/x-flv",
    wav: "audio/wav",
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    aac: "audio/aac",
    ogg_audio: "audio/ogg",
  };

  let finalCT = upstreamCT;
  // Se for octet-stream genérico ou vazio, tentar inferir pela extensão
  if (
    (!finalCT ||
      finalCT.includes("octet-stream") ||
      finalCT.includes("text/html")) &&
    extContentType[ext]
  ) {
    finalCT = extContentType[ext];
  }
  // Se for um segmento "disfarçado" (.jar, .woff, .php, .html, .xlsx, .js)
  // vindo de um host de CDN HLS, tratar como .ts
  if (
    !finalCT.startsWith("video/") &&
    !finalCT.startsWith("audio/") &&
    !finalCT.includes("mpegurl") &&
    extContentType[ext] === undefined
  ) {
    // Provavelmente segmento HLS disfarçado
    finalCT = "video/mp2t";
  }
  if (finalCT) respHeaders["content-type"] = finalCT;

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
  // Garante accept-ranges para VOD
  if (!respHeaders["accept-ranges"]) {
    respHeaders["accept-ranges"] = "bytes";
  }

  // Stream do body
  return new NextResponse(upstream.body, {
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
