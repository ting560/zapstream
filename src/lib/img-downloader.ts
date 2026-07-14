import { createHash } from "crypto";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import path from "path";

const COVERS_DIR = path.join("/tmp", "covers");

function ensureDir() {
  if (!existsSync(COVERS_DIR)) mkdirSync(COVERS_DIR, { recursive: true });
}

export function hashUrl(url: string): string {
  return createHash("md5").update(url).digest("hex");
}

export function getContentType(ext: string): string {
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
    ico: "image/x-icon", bmp: "image/bmp",
  };
  return map[ext] || "image/jpeg";
}

export function getExt(url: string): string {
  const match = url.match(/\.(jpe?g|png|gif|webp|svg|ico|bmp)(\?|$)/i);
  return match ? match[1].toLowerCase() : "jpg";
}

export function localPath(url: string): string {
  return path.join(COVERS_DIR, `${hashUrl(url)}.${getExt(url)}`);
}

export function imageExists(url: string): boolean {
  return existsSync(localPath(url));
}

export function readLocalImage(url: string): Buffer | null {
  const p = localPath(url);
  if (!existsSync(p)) return null;
  return readFileSync(p);
}

async function fetchImage(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch (e: any) {
    if (e?.name === "AbortError") throw new Error("Timeout");
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

export async function downloadImage(url: string): Promise<void> {
  ensureDir();
  const dest = localPath(url);
  if (existsSync(dest)) return;
  const data = await fetchImage(url);
  writeFileSync(dest, data);
}

export interface DownloadProgress {
  total: number;
  completed: number;
  current: string;
  status: "downloading" | "done" | "error";
  error?: string;
}

export async function downloadAll(
  urls: string[],
  onProgress?: (p: DownloadProgress) => void
): Promise<{ downloaded: number; skipped: number; errors: number }> {
  ensureDir();
  const unique = [...new Set(urls.filter(Boolean))];
  let downloaded = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < unique.length; i++) {
    const url = unique[i];
    const dest = localPath(url);
    if (existsSync(dest)) {
      skipped++;
      onProgress?.({ total: unique.length, completed: i + 1, current: url, status: "downloading" });
      continue;
    }
    try {
      const data = await fetchImage(url);
      writeFileSync(dest, data);
      downloaded++;
      onProgress?.({ total: unique.length, completed: i + 1, current: url, status: "downloading" });
    } catch (e: any) {
      errors++;
      const msg = e?.cause?.message || e?.message || JSON.stringify(e);
      onProgress?.({ total: unique.length, completed: i + 1, current: url, status: "error", error: msg });
    }
  }

  onProgress?.({ total: unique.length, completed: unique.length, current: "", status: "done" });
  return { downloaded, skipped, errors };
}
