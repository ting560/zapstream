import { NextRequest, NextResponse } from "next/server";
import { readVisits, clearVisits } from "@/lib/db/analytics-store";

function getWeekNumber(d: Date): number {
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - startOfYear.getTime();
  return Math.ceil((diff / 86400000 + startOfYear.getDay() + 1) / 7);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "today";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const visits = await readVisits();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let filtered = visits;
    if (period === "today") {
      filtered = visits.filter((v) => new Date(v.timestamp) >= startOfDay);
    } else if (period === "week") {
      filtered = visits.filter((v) => new Date(v.timestamp) >= startOfWeek);
    } else if (period === "month") {
      filtered = visits.filter((v) => new Date(v.timestamp) >= startOfMonth);
    }

    const totalVisits = filtered.length;
    const uniqueIPs = new Set(filtered.map((v) => v.ip)).size;

    const cityCount: Record<string, number> = {};
    const regionCount: Record<string, number> = {};
    const pageCount: Record<string, number> = {};
    const dayCount: Record<string, number> = {};
    const hourCount: Record<string, number> = {};
    const weekCount: Record<string, number> = {};

    for (const v of filtered) {
      const d = new Date(v.timestamp);

      const dayKey = d.toLocaleDateString("pt-BR");
      dayCount[dayKey] = (dayCount[dayKey] || 0) + 1;

      const hourKey = `${d.getHours()}h`;
      hourCount[hourKey] = (hourCount[hourKey] || 0) + 1;

      const weekKey = `Semana ${getWeekNumber(d)} (${d.getFullYear()})`;
      weekCount[weekKey] = (weekCount[weekKey] || 0) + 1;

      const city = v.city || "Desconhecida";
      cityCount[city] = (cityCount[city] || 0) + 1;

      const region = v.region || "Desconhecido";
      regionCount[region] = (regionCount[region] || 0) + 1;

      const p = v.page || "/";
      pageCount[p] = (pageCount[p] || 0) + 1;
    }

    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return NextResponse.json({
      totalVisits,
      uniqueIPs,
      visits: paginated,
      aggregation: {
        byCity: Object.entries(cityCount)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
        byRegion: Object.entries(regionCount)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
        byPage: Object.entries(pageCount)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
        byDay: Object.entries(dayCount)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => a.name.localeCompare(b.name)),
        byHour: Object.entries(hourCount)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => parseInt(a.name) - parseInt(b.name)),
        byWeek: Object.entries(weekCount)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      },
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE() {
  await clearVisits();
  return NextResponse.json({ ok: true });
}
