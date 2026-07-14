import { NextRequest, NextResponse } from "next/server";
import { getAllVisits, clearVisits } from "@/lib/db/analytics-store";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

function getWeekNumber(d: Date): number {
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - startOfYear.getTime();
  return Math.ceil((diff / 86400000 + startOfYear.getDay() + 1) / 7);
}

function getStartDate(period: string): Date | null {
  const now = new Date();
  if (period === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (period === "week") {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() - d.getDay());
    return d;
  }
  if (period === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "today";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Try Supabase first
    if (supabaseUrl) {
      const { supabase } = await import("@/lib/supabase");
      const startDate = getStartDate(period);

      let query = supabase
        .from("visits")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (startDate) {
        query = query.gte("created_at", startDate.toISOString());
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data: visits, count: totalVisits, error } = await query;
      if (error) throw error;

      const allQuery = supabase.from("visits").select("*");
      if (startDate) {
        allQuery.gte("created_at", startDate.toISOString());
      }
      const { data: allFiltered } = await allQuery;
      const filtered = allFiltered || [];

      const uniqueIPs = new Set(filtered.map((v: any) => v.ip)).size;

      const cityCount: Record<string, number> = {};
      const regionCount: Record<string, number> = {};
      const pageCount: Record<string, number> = {};
      const dayCount: Record<string, number> = {};
      const hourCount: Record<string, number> = {};
      const weekCount: Record<string, number> = {};

      for (const v of filtered) {
        const d = new Date(v.created_at);
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

      return NextResponse.json({
        totalVisits: totalVisits || 0,
        uniqueIPs,
        visits: (visits || []).map((v: any) => ({
          id: v.id, ip: v.ip, city: v.city, region: v.region,
          country: v.country, page: v.page, userAgent: v.user_agent,
          referrer: v.referrer, timestamp: v.created_at, serverName: v.server_name,
        })),
        aggregation: {
          byCity: Object.entries(cityCount).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
          byRegion: Object.entries(regionCount).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
          byPage: Object.entries(pageCount).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
          byDay: Object.entries(dayCount).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name)),
          byHour: Object.entries(hourCount).map(([name, count]) => ({ name, count })).sort((a, b) => parseInt(a.name) - parseInt(b.name)),
          byWeek: Object.entries(weekCount).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name)),
        },
        pagination: { page, limit, total: totalVisits || 0, totalPages: Math.ceil((totalVisits || 0) / limit) },
      });
    }

    // Fallback: file-based store
    const allVisits = getAllVisits();
    const startDate = getStartDate(period);

    let filtered = allVisits;
    if (startDate) {
      filtered = allVisits.filter((v) => new Date(v.created_at) >= startDate);
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
      const d = new Date(v.created_at);
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

    const from = (page - 1) * limit;
    const paginated = filtered.slice(from, from + limit);

    return NextResponse.json({
      totalVisits,
      uniqueIPs,
      visits: paginated.map((v) => ({
        id: v.id, ip: v.ip, city: v.city, region: v.region,
        country: v.country, page: v.page, userAgent: v.user_agent,
        referrer: v.referrer, timestamp: v.created_at, serverName: v.server_name,
      })),
      aggregation: {
        byCity: Object.entries(cityCount).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
        byRegion: Object.entries(regionCount).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
        byPage: Object.entries(pageCount).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
        byDay: Object.entries(dayCount).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name)),
        byHour: Object.entries(hourCount).map(([name, count]) => ({ name, count })).sort((a, b) => parseInt(a.name) - parseInt(b.name)),
        byWeek: Object.entries(weekCount).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name)),
      },
      pagination: { page, limit, total: totalVisits, totalPages: Math.ceil(totalVisits / limit) },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    if (supabaseUrl) {
      const { supabase } = await import("@/lib/supabase");
      const { error } = await supabase.from("visits").delete().neq("id", "");
      if (error) throw error;
    } else {
      clearVisits();
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
