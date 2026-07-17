import { NextRequest, NextResponse } from "next/server";

const TMDB_KEY = process.env.TMDB_KEY || "8ac491f51024cd437403cd282cfe1004";
const TMDB_POSTER = "https://image.tmdb.org/t/p/w500";

function cleanTitle(title: string): string {
  return title
    .replace(/\s*\(Dublado\)\s*/gi, "")
    .replace(/\s*\(Legendado\)\s*/gi, "")
    .replace(/\s*\(Original\)\s*/gi, "")
    .replace(/\s*-\s*(Dublado|Legendado|Nacional|Original|Dublado\s*-\s*Nacional)\s*$/gi, "")
    .replace(/\s*S\d{1,2}\s*$/i, "")
    .replace(/\s*-\s*\d{4}\s*-\s*\d+p\s*/g, "")
    .replace(/\s*-\s*\d{4}\s*-\s*[^-]+$/, "")
    .replace(/\s*-\s*\d{4}\s*/g, "")
    .trim();
}

async function searchTMDB(name: string, kind: string): Promise<string | null> {
  const clean = cleanTitle(name);
  if (!clean) return null;

  const endpoint = kind === "series" ? "tv" : "movie";
  const url = `https://api.themoviedb.org/3/search/${endpoint}?api_key=${TMDB_KEY}&query=${encodeURIComponent(clean)}&language=pt-BR`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "zapstream/1.0" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const json: any = await res.json();
    const poster = json?.results?.[0]?.poster_path;
    if (!poster) return null;
    return `${TMDB_POSTER}${poster}`;
  } catch {
    return null;
  }
}

async function fetchImage(url: string): Promise<{ data: Buffer; type: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 zapstream/1.0" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return {
      data: buf,
      type: res.headers.get("content-type") || "image/jpeg",
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");
  const kind = searchParams.get("kind") || "vod";

  if (!name) {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
  }

  // 1. Busca poster na TMDB
  const posterUrl = await searchTMDB(name, kind);
  if (!posterUrl) {
    return new NextResponse(null, { status: 404 });
  }

  // 2. Baixa a imagem do poster
  const img = await fetchImage(posterUrl);
  if (!img) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(img.data, {
    status: 200,
    headers: {
      "Content-Type": img.type,
      "Cache-Control": "public, max-age=86400, immutable",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
