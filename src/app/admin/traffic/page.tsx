"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3, Users, Eye, Globe, MapPin, Clock,
  ArrowLeft, RefreshCw, Trash2, Loader2, Lock,
  Calendar, Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Visit {
  id: string;
  ip: string;
  city: string;
  region: string;
  country: string;
  page: string;
  userAgent: string;
  referrer: string;
  timestamp: string;
  serverName: string;
}

interface AggItem {
  name: string;
  count: number;
}

interface Aggregation {
  byCity: AggItem[];
  byRegion: AggItem[];
  byPage: AggItem[];
  byDay: AggItem[];
  byHour: AggItem[];
  byWeek: AggItem[];
}

interface AnalyticsData {
  totalVisits: number;
  uniqueIPs: number;
  visits: Visit[];
  aggregation: Aggregation;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

type Period = "today" | "week" | "month" | "all";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function BarChart({ data, title, icon: Icon }: { data: AggItem[]; title: string; icon: any; limit?: number }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <Card className="bg-zinc-900/70 backdrop-blur-xl border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <Icon className="h-4 w-4 text-zinc-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-zinc-600 text-sm py-4 text-center">Sem dados</p>
        ) : (
          <div className="space-y-1.5">
            {data.slice(0, 10).map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 w-24 truncate shrink-0" title={item.name}>
                  {item.name}
                </span>
                <div className="flex-1 h-5 bg-zinc-800 rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-500 rounded-sm transition-all duration-300"
                    style={{ width: `${(item.count / max) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-500 w-8 text-right shrink-0">{item.count}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function TrafficPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [passInput, setPassInput] = useState("");
  const [passError, setPassError] = useState("");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("today");
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/data?period=${period}&page=${page}&limit=100`);
      const json = await res.json();
      setData(json);
    } catch { setData(null); }
    setLoading(false);
  }, [period, page]);

  useEffect(() => {
    const auth = sessionStorage.getItem("admin_auth");
    if (auth !== "true") {
      router.replace("/admin");
    } else {
      setAuthenticated(true);
    }
    setChecking(false);
  }, [router]);

  useEffect(() => { if (authenticated) fetchData(); }, [authenticated, fetchData]);

  const handleClear = async () => {
    if (!confirm("Limpar todos os dados de tráfego?")) return;
    await fetch("/api/analytics/data", { method: "DELETE" });
    fetchData();
  };

  const periodLabel: Record<Period, string> = {
    today: "Hoje",
    week: "Esta Semana",
    month: "Este Mês",
    all: "Todo Período",
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/admin")} className="text-zinc-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Tráfego
              </h1>
              <p className="text-sm text-zinc-500">Análise de visitantes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => { setPeriod(e.target.value as Period); setPage(1); }}
              className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-2"
            >
              <option value="today">Hoje</option>
              <option value="week">Esta Semana</option>
              <option value="month">Este Mês</option>
              <option value="all">Todo Período</option>
            </select>
            <Button variant="ghost" size="icon" onClick={fetchData} className="text-zinc-400 hover:text-white" title="Atualizar">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleClear} className="text-zinc-400 hover:text-red-400" title="Limpar dados">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading && !data && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
          </div>
        )}

        {data && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-zinc-900/70 backdrop-blur-xl border-zinc-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Eye className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold text-white">{data.totalVisits}</p>
                      <p className="text-xs text-zinc-500">Visitas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900/70 backdrop-blur-xl border-zinc-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold text-white">{data.uniqueIPs}</p>
                      <p className="text-xs text-zinc-500">IPs Únicos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900/70 backdrop-blur-xl border-zinc-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-8 w-8 text-yellow-500" />
                    <div>
                      <p className="text-2xl font-bold text-white">{data.aggregation.byCity.length}</p>
                      <p className="text-xs text-zinc-500">Cidades</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900/70 backdrop-blur-xl border-zinc-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Globe className="h-8 w-8 text-purple-500" />
                    <div>
                      <p className="text-2xl font-bold text-white">{data.aggregation.byRegion.length}</p>
                      <p className="text-xs text-zinc-500">Estados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <BarChart data={data.aggregation.byCity} title="Cidades" icon={MapPin} />
              <BarChart data={data.aggregation.byRegion} title="Estados" icon={Globe} />
              <BarChart data={data.aggregation.byDay} title="Por Dia" icon={Calendar} />
              <BarChart data={data.aggregation.byHour} title="Por Hora" icon={Clock} />
              <BarChart data={data.aggregation.byWeek} title="Por Semana" icon={Calendar} />
              <BarChart data={data.aggregation.byPage} title="Páginas" icon={Monitor} />
            </div>

            {/* Visits Table */}
            <Card className="bg-zinc-900/70 backdrop-blur-xl border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-zinc-500" />
                  Últimas Visitas
                  <span className="text-zinc-600 font-normal ml-auto text-xs">
                    {data.pagination.total} registros
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.visits.length === 0 ? (
                  <p className="text-zinc-600 text-sm py-8 text-center">Nenhuma visita neste período</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-zinc-500 border-b border-zinc-800">
                          <th className="pb-2 pr-4 font-medium">Data/Hora</th>
                          <th className="pb-2 pr-4 font-medium">IP</th>
                          <th className="pb-2 pr-4 font-medium">Cidade</th>
                          <th className="pb-2 pr-4 font-medium">Estado</th>
                          <th className="pb-2 pr-4 font-medium">Página</th>
                          <th className="pb-2 font-medium">Navegador</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.visits.map((v) => {
                          const ua = v.userAgent || "";
                          const isMobile = /mobile|android|iphone|ipad/i.test(ua);
                          const browser = ua.includes("Chrome") ? "Chrome"
                            : ua.includes("Firefox") ? "Firefox"
                            : ua.includes("Safari") ? "Safari"
                            : ua.includes("Edge") ? "Edge"
                            : "Outro";
  if (checking) return null;

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-6 justify-center">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center shadow-lg shadow-red-500/30">
              <Lock className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Admin</h1>
          </div>
          <form onSubmit={async (e) => { e.preventDefault(); setPassError(""); try { const r = await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: passInput }) }); const d = await r.json(); if (d.valid) { sessionStorage.setItem("admin_auth", "true"); setAuthenticated(true); } else { setPassError("Senha incorreta"); } } catch { setPassError("Erro ao verificar senha"); } }} className="space-y-4">
            <Input
              type="password"
              value={passInput}
              onChange={(e) => setPassInput(e.target.value)}
              placeholder="Senha de administrador"
              className="bg-zinc-800/50 border-zinc-700 text-white text-center text-lg h-12"
              autoFocus
            />
            {passError && <p className="text-red-400 text-sm text-center">{passError}</p>}
            <Button type="submit" className="w-full bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white h-12 text-lg">
              <Lock className="h-4 w-4 mr-2" />
              Entrar
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
                            <tr key={v.id} className="border-b border-zinc-800/50 text-zinc-300 hover:bg-zinc-800/30">
                              <td className="py-2 pr-4 whitespace-nowrap">{formatDate(v.timestamp)}</td>
                              <td className="py-2 pr-4 font-mono text-xs">{v.ip}</td>
                              <td className="py-2 pr-4">{v.city}</td>
                              <td className="py-2 pr-4">{v.region}</td>
                              <td className="py-2 pr-4">{v.page}</td>
                              <td className="py-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${isMobile ? "bg-green-900/50 text-green-400" : "bg-blue-900/50 text-blue-400"}`}>
                                  {isMobile ? "Mobile" : browser}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
