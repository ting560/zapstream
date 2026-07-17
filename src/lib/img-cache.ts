import type { ContentKind } from "./iptv-types";

export function cachedImg(url: string | undefined, name: string, kind: ContentKind): string | undefined {
  // Canais ao vivo: usa a URL original direto (sem proxy)
  if (kind === "live") {
    return url || undefined;
  }
  // Filmes e séries: busca capa pelo nome via TMDB
  if (!name) return undefined;
  return `/api/img?name=${encodeURIComponent(name)}&kind=${kind}`;
}
