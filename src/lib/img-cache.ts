import type { ContentKind } from "./iptv-types";

export function cachedImg(
  url?: string,
  name?: string,
  kind?: ContentKind
): string | undefined {
  // Chamada antiga (só URL): retorna a URL direto
  if (!name || !kind) {
    return url || undefined;
  }
  // Canais ao vivo: usa a URL original (sem proxy)
  if (kind === "live") {
    return url || undefined;
  }
  // Filmes e séries: busca capa pelo nome via TMDB
  return `/api/img?name=${encodeURIComponent(name)}&kind=${kind}`;
}
