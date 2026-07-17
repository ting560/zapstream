import type { ContentKind } from "./iptv-types";

export function cachedImg(url?: string, name?: string, kind?: ContentKind): string | undefined {
  if (!url && !name) return undefined;
  const params = new URLSearchParams();
  if (url && (url.startsWith("data:") || !url.startsWith("http"))) return url;
  if (url) params.set("url", url);
  if (name) params.set("name", name);
  if (kind) params.set("kind", kind);
  const qs = params.toString();
  if (!qs) return undefined;
  return `/api/img?${qs}`;
}
