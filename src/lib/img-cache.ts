export function cachedImg(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("/api/img")) return url;
  if (url.startsWith("data:")) return url;
  if (url.startsWith("/covers/")) return url;
  if (!url.startsWith("http")) return url;
  return `/api/img?url=${encodeURIComponent(url)}`;
}
