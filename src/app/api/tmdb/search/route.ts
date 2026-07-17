import { NextRequest, NextResponse } from "next/server";

const TMDB_KEY = process.env.TMDB_KEY || "8ac491f51024cd437403cd282cfe1004";
const TMDB_POSTER = "https://image.tmdb.org/t/p/w500";

function cleanTitle(title: string): string {
  return title
    .replace(/\s*\(Dublado\)\s*/gi, "")
    .replace(/\s*\(Legendado\)\s*/gi, "")
    .replace(/\s*\(Original\)\s*/gi, "")
    .replace(/\s*-\s*(Dublado|Legendado|Nacional|Original)\s*$/gi, "")
    .replace(/\s*S\d{1,2}\s*$/i, "")
    .replace(/\s*-\s*\d{4}\s*-\s*\d+p\s*/g, "")
    .replace(/\s*-\s*\d{4}\s*-\s*[^-]+$/, "")
    .replace(/\s*-\s*\d{4}\s*/g, "")
    .trim();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");
  const kind = searchParams.get("kind") || "vod";

  if (!name) {
    return NextResponse.json({ poster: null, error: "Missing name" }, { status: 400 });
  }

  const clean = cleanTitle(name);
  if (!clean) {
    return NextResponse.json({ poster: null });
  }

  const endpoint = kind === "series" ? "tv" : "movie";
  const url = `https://api.themoviedb.org/3/search/${endpoint}?api_key=${TMDB_KEY}&query=${encodeURIComponent(clean)}&language=pt-BR`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "zapstream/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return NextResponse.json({ poster: null });
    }
    const json: any = await res.json();
    const poster = json?.results?.[0]?.poster_path;
    if (!poster) {
      return NextResponse.json({ poster: null });
    }
    return NextResponse.json({ poster: `${TMDB_POSTER}${poster}` });
  } catch {
    return NextResponse.json({ poster: null });
  }
}
