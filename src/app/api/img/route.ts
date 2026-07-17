import { NextRequest, NextResponse } from "next/server";
import https from "https";
import http from "http";

const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450">
  <rect fill="#1a1a2e" width="300" height="450"/>
  <circle cx="150" cy="200" r="50" fill="#2d2d5e" opacity="0.5"/>
  <text x="150" y="210" text-anchor="middle" fill="#666" font-size="32" font-family="sans-serif">?</text>
  <text x="150" y="360" text-anchor="middle" fill="#444" font-size="14" font-family="sans-serif" max-width="280"></text>
</svg>`;

const MEMORY_CACHE = new Map<string, { data: Buffer; type: string }>();
const MAX_CACHE = 500;
const IN_FLIGHT = new Map<string, Promise<{ data: Buffer; type: string }>>();

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
  const target = new URL(req.url).searchParams.get("url");
  if (!target) return new NextResponse("Missing url", { status: 400 });

  const ext = target.match(/\.(jpe?g|png|gif|webp|svg|ico|bmp)(\?|$)/i)?.[1]?.toLowerCase() || "jpg";
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
    return new NextResponse(PLACEHOLDER_SVG, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
