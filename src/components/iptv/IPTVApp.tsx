"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Tv,
  Film,
  Star,
  Search,
  Heart,
  Loader2,
  Menu,
  X,
  LayoutGrid,
  ChevronRight,
  Play,
  RefreshCw,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useIPTVStore } from "@/lib/iptv-store";
import {
  getCategories,
  getLiveStreams,
  getVodStreams,
  getSeries,
  getVodInfo,
  getSeriesInfo,
} from "@/lib/iptv-client";
import type {
  ContentKind,
  PlayItem,
  IPTVCategory,
  IPTVLiveStream,
  IPTVVodStream,
  IPTVSeries,
  IPTVSeriesInfo,
  IPTVVodInfo,
} from "@/lib/iptv-types";
import { ContentCard } from "./ContentCard";
import { PlayerModal } from "./PlayerModal";
import { CanaisPlayerModal } from "./CanaisPlayerModal";
import { PinModal } from "./PinModal";
import { cachedImg } from "@/lib/img-cache";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TABS: { kind: ContentKind; label: string; icon: any }[] = [
  { kind: "live", label: "TV ao Vivo", icon: Tv },
  { kind: "vod", label: "Filmes", icon: Film },
  { kind: "series", label: "Séries", icon: Star },
];

export function IPTVApp() {
  const {
    credentials,
    setAuthenticated,
    activeTab,
    setActiveTab,
    activeCategory,
    setActiveCategory,
    search,
    setSearch,
    currentPlay,
    setPlay,
    favorites,
  } = useIPTVStore();

  const [showFavorites, setShowFavorites] = useState(false);
  const [showCanais, setShowCanais] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Canais (embed)
  const [canaisChannels, setCanaisChannels] = useState<any[]>([]);
  const [canaisCats, setCanaisCats] = useState<string[]>([]);
  const [canaisActiveCat, setCanaisActiveCat] = useState("all");
  const [canaisSearch, setCanaisSearch] = useState("");
  const [canaisPlayer, setCanaisPlayer] = useState<{ nome: string; id: string } | null>(null);
  const [loadingCanais, setLoadingCanais] = useState(false);

  const [categories, setCategories] = useState<IPTVCategory[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState("");

  // Series detail dialog
  const [seriesDialog, setSeriesDialog] = useState<{
    open: boolean;
    series?: IPTVSeries;
    info?: IPTVSeriesInfo;
    loading: boolean;
  }>({ open: false, loading: false });

  // VOD detail dialog
  const [vodDialog, setVodDialog] = useState<{
    open: boolean;
    item?: PlayItem;
    info?: IPTVVodInfo;
    loading: boolean;
  }>({ open: false, loading: false });

  // PIN parental
  const [adultCategories, setAdultCategories] = useState<string[]>([]);
  const [pin, setPin] = useState("123456");
  const [pinVerified, setPinVerified] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingPlay, setPendingPlay] = useState<PlayItem | null>(null);

  // Configuracoes
  const [disabledTabs, setDisabledTabs] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((settings) => {
        if (settings?.adultCategories) setAdultCategories(settings.adultCategories);
        if (settings?.pin) setPin(settings.pin);
        if (settings?.disabledTabs) setDisabledTabs(settings.disabledTabs);
      })
      .catch(() => {});
  }, []);

  // Carregar canais do JSON
  useEffect(() => {
    setLoadingCanais(true);
    fetch("/canais_cache.json")
      .then((r) => r.json())
      .then((data: any[]) => {
        setCanaisChannels(data);
        const cats = [...new Set(data.map((c) => c.cat))] as string[];
        setCanaisCats(cats);
      })
      .catch(() => {})
      .finally(() => setLoadingCanais(false));
  }, []);

  const handlePinUnlock = () => {
    setPinVerified(true);
    setShowPinModal(false);
    if (pendingPlay) {
      handlePlayContent(pendingPlay);
      setPendingPlay(null);
    }
  };

  // Cache helpers
  const cacheGet = (key: string) => {
    try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; } catch { return null; }
  };
  const cacheSet = (key: string, data: any) => {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
  };

  // Tentar carregar dados estáticos para cache (opcional)
  useEffect(() => {
    fetch("/data/iptv-data.json")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: any) => {
        try {
          if (Array.isArray(data.categoriesLive) && data.categoriesLive.length > 0)
            localStorage.setItem("cat_live", JSON.stringify(data.categoriesLive));
          if (Array.isArray(data.categoriesVod) && data.categoriesVod.length > 0)
            localStorage.setItem("cat_vod", JSON.stringify(data.categoriesVod));
          if (Array.isArray(data.categoriesSeries) && data.categoriesSeries.length > 0)
            localStorage.setItem("cat_series", JSON.stringify(data.categoriesSeries));
          if (Array.isArray(data.liveStreams) && data.liveStreams.length > 0)
            localStorage.setItem("items_live_all", JSON.stringify(data.liveStreams));
          if (Array.isArray(data.vodStreams) && data.vodStreams.length > 0)
            localStorage.setItem("items_vod_all", JSON.stringify(data.vodStreams));
          if (Array.isArray(data.series) && data.series.length > 0)
            localStorage.setItem("items_series_all", JSON.stringify(data.series));
        } catch {}
      })
      .catch(() => {});
  }, []);

  // Carregar categorias quando muda o tab (com cache)
  useEffect(() => {
    let cancelled = false;
    setShowFavorites(false);
    setShowCanais(false);
    setActiveCategory("all");
    setCategories([]);
    setItems([]);
    setError("");
    setLoadingCats(true);

    const cacheKey = `cat_${activeTab}`;
    const cached = cacheGet(cacheKey);
    if (cached && Array.isArray(cached)) {
      setCategories(cached);
      setLoadingCats(false);
    }

    getCategories(credentials, activeTab)
      .then((cats) => {
        if (!cancelled) {
          setCategories(cats);
          cacheSet(cacheKey, cats);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingCats(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, credentials, setActiveCategory]);

  // Carregar items quando muda categoria (ou tab) com cache
  useEffect(() => {
    if (showFavorites) return;
    let cancelled = false;
    setError("");

    const loader =
      activeTab === "live"
        ? getLiveStreams
        : activeTab === "vod"
        ? getVodStreams
        : getSeries;

    const cacheKey = `items_${activeTab}_${activeCategory}`;
    const cached = cacheGet(cacheKey);
    if (cached && Array.isArray(cached)) {
      setItems(cached);
      setLoadingItems(false);
      // Revalidate in background
      loader(credentials, activeCategory)
        .then((data) => {
          if (!cancelled) {
            setItems(data);
            cacheSet(cacheKey, data);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoadingItems(false);
        });
    } else {
      setLoadingItems(true);
      setItems([]);
      loader(credentials, activeCategory)
        .then((data) => {
          if (!cancelled) {
            setItems(data);
            cacheSet(cacheKey, data);
          }
        })
        .catch((e) => {
          if (!cancelled) setError(e.message);
        })
        .finally(() => {
          if (!cancelled) setLoadingItems(false);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [activeTab, activeCategory, credentials, showFavorites]);

  // Filtrar por busca
  const filteredItems = useMemo(() => {
    let list = items;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = items.filter((it) => (it.name || "").toLowerCase().includes(q));
    }
    // Deduplicar por nome (servidor IPTV retorna duplicatas)
    const seen = new Set<string>();
    return list.filter((it) => {
      const key = (it.name || "").toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [items, search]);

  // Favoritos do tipo atual
  const favItems = useMemo(() => {
    return favorites.filter((f) => f.kind === activeTab);
  }, [favorites, activeTab]);

  const handlePlayContent = useCallback(
    (item: PlayItem) => {
      if (item.kind === "series" && !item.episode) {
        setSeriesDialog({ open: true, series: item as any, loading: true });
        getSeriesInfo(credentials, String(item.id))
          .then((info) => {
            setSeriesDialog((s) => ({ ...s, info, loading: false }));
          })
          .catch((e) => {
            setSeriesDialog((s) => ({
              ...s,
              loading: false,
              open: false,
            }));
            setError(e.message);
          });
        return;
      }
      if (item.kind === "vod") {
        setVodDialog({ open: true, item, loading: true });
        getVodInfo(credentials, String(item.id))
          .then((info) => {
            setVodDialog((s) => ({ ...s, info, loading: false }));
          })
          .catch(() => {
            setVodDialog((s) => ({
              ...s,
              loading: false,
            }));
          });
        return;
      }
      setPlay(item);
    },
    [credentials, setPlay]
  );

  const handlePlay = useCallback(
    (item: PlayItem) => {
      // Verificar se é conteudo adulto
      if (adultCategories.length > 0) {
        const fullItem = items.find(
          (i) =>
            (i.stream_id === item.id || i.series_id === item.id) &&
            i.category_id
        );
        const catId = fullItem?.category_id;
        const cat = categories.find((c) => c.category_id === catId);
        const catName = (cat?.category_name || "").toLowerCase();

        const isAdult = adultCategories.some((ac) =>
          catName.includes(ac.toLowerCase())
        );

        if (isAdult) {
          if (!pinVerified) {
            setPendingPlay(item);
            setShowPinModal(true);
            return;
          }
        }
      }

      handlePlayContent(item);
    },
    [items, categories, adultCategories, pinVerified, handlePlayContent]
  );


  // Quantidade limite de items por busca (para não estourar o DOM com 50k items)
  const displayItems = showFavorites
    ? favItems.map((f) => ({
        num: 0,
        name: f.name,
        stream_id: f.id,
        stream_icon: f.logo,
        series_id: f.id,
        cover: f.logo,
        container_extension: "mp4",
        rating: "",
        category_id: "",
        added: "",
        rating_5based: 0,
        stream_type: "",
        custom_sid: "",
        direct_source: "",
      }))
    : filteredItems.slice(0, 100);

  const totalCount = showFavorites ? favItems.length : filteredItems.length;

  // Canais filtrados
  const canaisFiltrados = useMemo(() => {
    let list = canaisChannels;
    if (canaisActiveCat !== "all") {
      list = list.filter((c) => c.cat === canaisActiveCat);
    }
    if (canaisSearch.trim()) {
      const q = canaisSearch.toLowerCase();
      list = list.filter((c) => c.nome.toLowerCase().includes(q));
    }
    return list;
  }, [canaisChannels, canaisActiveCat, canaisSearch]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800">
        <div className="px-4 sm:px-6 py-3 flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center shadow-lg shadow-red-500/20">
              <Tv className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold hidden sm:block">FilmeStream</span>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-3 ml-2 sm:ml-4 text-sm font-medium">
            {TABS.filter((t) => !disabledTabs.includes(t.kind)).map((t) => (
              <button
                key={t.kind}
                onClick={() => {
                  setActiveTab(t.kind);
                  setShowCanais(false);
                }}
                className={cn(
                  "transition-colors",
                  activeTab === t.kind
                    ? "text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {t.label}
              </button>
            ))}
            {!disabledTabs.includes("canais") && (
              <button
                onClick={() => {
                  window.open("https://blueviolet-newt-188057.hostingersite.com/200/?c=sportv", "_blank");
                }}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Canais
              </button>
            )}
          </div>

          {/* Search (desktop only) */}
          <div className="hidden lg:block flex-1 max-w-md ml-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
              {showCanais ? (
                <Input
                  value={canaisSearch}
                  onChange={(e) => setCanaisSearch(e.target.value)}
                  placeholder="Buscar canais..."
                  className="bg-zinc-900 border-zinc-800 text-white pl-10 focus-visible:ring-red-500/30 text-lg h-11"
                />
              ) : (
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="bg-zinc-900 border-zinc-800 text-white pl-10 focus-visible:ring-red-500/30 text-lg h-11"
                />
              )}
            </div>
          </div>

        </div>

      </header>



      {/* Body: sidebar + content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar (categorias) */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-30 w-72 bg-zinc-900 border-r border-zinc-800 transform transition-transform lg:translate-x-0 top-[57px]",
            showMobileSidebar ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between lg:hidden">
            <span className="font-medium text-sm">Categorias</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMobileSidebar(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="h-[calc(100vh-57px)] lg:h-[calc(100vh-57px)]">
            <div className="p-3">
              {showCanais ? (
                <>
                  <button
                    onClick={() => {
                      setCanaisActiveCat("all");
                      setShowMobileSidebar(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors",
                      canaisActiveCat === "all"
                        ? "bg-red-600 text-white"
                        : "text-zinc-300 hover:bg-zinc-800"
                    )}
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Todos
                  </button>

                  <div className="mt-2 mb-1 px-3 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                    Categorias
                  </div>

                  {canaisCats.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setCanaisActiveCat(cat);
                        setShowMobileSidebar(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between gap-2 transition-colors group",
                        canaisActiveCat === cat
                          ? "bg-red-600 text-white"
                          : "text-zinc-300 hover:bg-zinc-800"
                      )}
                    >
                      <span className="truncate flex-1">{cat}</span>
                      <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ))}
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setActiveCategory("all");
                      setShowFavorites(false);
                      setShowMobileSidebar(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors",
                      activeCategory === "all" && !showFavorites
                        ? "bg-red-600 text-white"
                        : "text-zinc-300 hover:bg-zinc-800"
                    )}
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Todas
                  </button>

                  {showFavorites && (
                    <button
                      className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 bg-red-600 text-white"
                    >
                      <Heart className="h-4 w-4 fill-current" />
                      Favoritos ({favItems.length})
                    </button>
                  )}

                  <div className="mt-2 mb-1 px-3 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                    Categorias
                  </div>

                  {loadingCats ? (
                    <div className="space-y-2 px-3">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-8 w-full bg-zinc-800" />
                      ))}
                    </div>
                  ) : categories.length === 0 ? (
                    <p className="text-xs text-zinc-500 px-3 py-2">
                      Nenhuma categoria.
                    </p>
                  ) : (
                    <div className="space-y-0.5">
                      {categories.map((cat) => (
                        <button
                          key={cat.category_id}
                          onClick={() => {
                            setActiveCategory(cat.category_id);
                            setShowFavorites(false);
                            setShowMobileSidebar(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between gap-2 transition-colors group",
                            activeCategory === cat.category_id && !showFavorites
                              ? "bg-red-600 text-white"
                              : "text-zinc-300 hover:bg-zinc-800"
                          )}
                          title={cat.category_name}
                        >
                          <span className="truncate flex-1">
                            {cat.category_name}
                          </span>
                          <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Overlay mobile */}
        {showMobileSidebar && (
          <div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden top-[57px]"
            onClick={() => setShowMobileSidebar(false)}
          />
        )}

        {/* Content */}
        <main className="flex-1 overflow-hidden flex flex-col lg:ml-72">
          {/* Mobile sidebar toggle + search */}
          <div className="lg:hidden p-3 border-b border-zinc-800 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMobileSidebar(true)}
              className="bg-zinc-900 border-zinc-700 text-white shrink-0"
            >
              <Menu className="h-4 w-4 mr-2" />
              Categorias
            </Button>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              {showCanais ? (
                <Input
                  value={canaisSearch}
                  onChange={(e) => setCanaisSearch(e.target.value)}
                  placeholder="Buscar canais..."
                  className="bg-zinc-900 border-zinc-800 text-white pl-9 focus-visible:ring-red-500/30 text-sm h-9"
                />
              ) : (
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar filmes, séries..."
                  className="bg-zinc-900 border-zinc-800 text-white pl-9 focus-visible:ring-red-500/30 text-sm h-9"
                />
              )}
            </div>
          </div>



          {/* Grid */}
          <ScrollArea className="flex-1">
            <div className="p-4 sm:p-6">
              {showCanais ? (
                loadingCanais ? (
                  <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {Array.from({ length: 18 }).map((_, i) => (
                      <Skeleton key={i} className="bg-zinc-800 aspect-square rounded-xl" />
                    ))}
                  </div>
                ) : canaisFiltrados.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Radio className="h-12 w-12 text-zinc-700 mb-3" />
                    <p className="text-zinc-400 font-medium">
                      {canaisSearch ? `Nenhum canal para "${canaisSearch}"` : "Nenhum canal disponível."}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {canaisFiltrados.map((ch, idx) => (
                      <div
                        key={ch.id + idx}
                        className="group relative bg-card rounded-xl overflow-hidden border border-border hover:border-primary/60 transition-all cursor-pointer hover:shadow-xl hover:-translate-y-0.5"
                        onClick={() => setCanaisPlayer({ nome: ch.nome, id: ch.id })}
                      >
                        <div className="relative w-full aspect-square bg-zinc-800 flex items-center justify-center overflow-hidden">
                          {ch.logo ? (
                            <img
                              src={ch.logo}
                              alt=""
                              loading="lazy"
                              className="w-full h-full object-contain p-2"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden"); }}
                            />
                          ) : null}
                          <Radio className={`h-12 w-12 text-zinc-600 ${ch.logo ? "hidden" : ""}`} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                            <div className="bg-primary text-primary-foreground rounded-full h-11 w-11 flex items-center justify-center shadow-lg">
                              <Play className="h-5 w-5 fill-current ml-0.5" />
                            </div>
                          </div>
                        </div>
                        <div className="p-2.5">
                          <h3 className="text-sm font-medium truncate leading-tight" title={ch.nome}>
                            {ch.nome}
                          </h3>
                          <p className="text-[10px] text-muted-foreground uppercase mt-0.5">
                            {ch.cat}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <p className="text-red-400 mb-2">Erro ao carregar conteúdo</p>
                  <p className="text-sm text-zinc-500 max-w-md">{error}</p>
                </div>
              ) : loadingItems && !showFavorites ? (
                <div
                  className={cn(
                    "grid gap-3",
                    viewMode === "grid"
                      ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                  )}
                >
                  {Array.from({ length: 18 }).map((_, i) => (
                    <Skeleton
                      key={i}
                      className={cn(
                        "bg-zinc-800",
                        viewMode === "grid"
                          ? activeTab === "live"
                            ? "aspect-square rounded-xl"
                            : "aspect-[2/3] rounded-xl"
                          : "h-16 rounded-lg"
                      )}
                    />
                  ))}
                </div>
              ) : displayItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  {showFavorites ? (
                    <>
                      <Heart className="h-12 w-12 text-zinc-700 mb-3" />
                      <p className="text-zinc-400 font-medium">
                        Nenhum favorito ainda
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        Clique no coração de um canal ou filme para adicioná-lo
                        aqui.
                      </p>
                    </>
                  ) : search ? (
                    <>
                      <Search className="h-12 w-12 text-zinc-700 mb-3" />
                      <p className="text-zinc-400 font-medium">
                        Nenhum resultado para &quot;{search}&quot;
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-zinc-400">Nenhum item disponível.</p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div
                    className={cn(
                      "grid gap-3",
                      viewMode === "grid"
                        ? activeTab === "live"
                          ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                          : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                    )}
                  >
                    {displayItems.map((item, idx) => {
                      const id =
                        activeTab === "series"
                          ? item.series_id
                          : item.stream_id;
                      const name = item.name || `Item ${idx + 1}`;
                      const logo =
                        activeTab === "series"
                          ? item.cover
                          : item.stream_icon;
                      const rating =
                        item.rating_5based || item.rating || "";

                      return (
                        <ContentCard
                          key={`${activeTab}-${id}-${idx}`}
                          id={id}
                          kind={activeTab}
                          name={name}
                          logo={logo}
                          rating={rating}
                          containerExtension={item.container_extension}
                          onPlay={handlePlay}
                        />
                      );
                    })}
                  </div>

                  {!showFavorites &&
                    totalCount > displayItems.length && (
                      <div className="mt-6 text-center text-xs text-zinc-500">
                        Mostrando {displayItems.length} de{" "}
                        {totalCount.toLocaleString("pt-BR")} itens.
                        {search
                          ? " Refine a busca para ver mais."
                          : " Use a busca para encontrar itens específicos."}
                      </div>
                    )}
                </>
              )}
            </div>
          </ScrollArea>
        </main>
      </div>

      {/* Player */}
      {currentPlay && (
        <PlayerModal
          item={currentPlay}
          credentials={credentials}
          onClose={() => setPlay(null)}
        />
      )}

      {/* Canais Player */}
      {canaisPlayer && (
        <CanaisPlayerModal
          nome={canaisPlayer.nome}
          id={canaisPlayer.id}
          onClose={() => setCanaisPlayer(null)}
        />
      )}

      {/* PIN Modal */}
      <PinModal
        open={showPinModal}
        correctPin={pin}
        onUnlock={handlePinUnlock}
        onClose={() => { setShowPinModal(false); setPendingPlay(null); }}
      />

      {/* Dialog de informações para filmes */}
      <Dialog
        open={vodDialog.open}
        onOpenChange={(v) =>
          !v && setVodDialog({ open: false, loading: false })
        }
      >
        <DialogContent aria-describedby={undefined} className="w-full max-w-[95vw] sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] sm:max-h-[85vh] bg-zinc-900 border-zinc-800 text-white overflow-hidden flex flex-col p-4 sm:p-6">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              {vodDialog.item?.logo && (
                <img
                  src={cachedImg(vodDialog.item.logo)}
                  alt=""
                  className="h-8 w-6 sm:h-10 sm:w-8 object-cover rounded shrink-0"
                />
              )}
              <span className="truncate">{vodDialog.item?.name}</span>
            </DialogTitle>
          </DialogHeader>

          {vodDialog.loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : (
            <div className="overflow-y-auto flex flex-col gap-3 sm:gap-4 min-h-0 pr-1">
              {vodDialog.info?.info?.plot && (
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  {vodDialog.info.info.plot}
                </p>
              )}

              {vodDialog.info?.info && (
                <div className="flex flex-wrap gap-x-4 sm:gap-x-6 gap-y-1.5 sm:gap-y-2 text-xs sm:text-sm">
                  {vodDialog.info.info.genre && (
                    <div>
                      <span className="text-zinc-500">Gênero:</span>{" "}
                      <span className="text-zinc-300">{vodDialog.info.info.genre}</span>
                    </div>
                  )}
                  {vodDialog.info.info.duration && (
                    <div>
                      <span className="text-zinc-500">Duração:</span>{" "}
                      <span className="text-zinc-300">{vodDialog.info.info.duration}</span>
                    </div>
                  )}
                  {vodDialog.info.info.releasedate && (
                    <div>
                      <span className="text-zinc-500">Lançamento:</span>{" "}
                      <span className="text-zinc-300">{vodDialog.info.info.releasedate}</span>
                    </div>
                  )}
                  {vodDialog.info.info.rating && (
                    <div>
                      <span className="text-zinc-500">Rating:</span>{" "}
                      <span className="text-yellow-400 font-semibold">{vodDialog.info.info.rating}</span>
                    </div>
                  )}
                  {vodDialog.info.info.director && (
                    <div>
                      <span className="text-zinc-500">Diretor:</span>{" "}
                      <span className="text-zinc-300">{vodDialog.info.info.director}</span>
                    </div>
                  )}
                  {vodDialog.info.info.cast && (
                    <div className="w-full">
                      <span className="text-zinc-500">Elenco:</span>{" "}
                      <span className="text-zinc-300">{vodDialog.info.info.cast}</span>
                    </div>
                  )}
                </div>
              )}

              {!vodDialog.info && (
                <p className="text-sm text-zinc-500 text-center py-2">
                  Informações indisponíveis.
                </p>
              )}

              <Button
                onClick={() => {
                  if (vodDialog.item) {
                    setPlay(vodDialog.item);
                  }
                  setVodDialog({ open: false, loading: false });
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold shrink-0"
              >
                <Play className="h-4 w-4 mr-2" />
                Assistir
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de episódios para séries */}
      <Dialog
        open={seriesDialog.open}
        onOpenChange={(v) =>
          !v && setSeriesDialog({ open: false, loading: false })
        }
      >
        <DialogContent aria-describedby={undefined} className="w-full max-w-[95vw] sm:max-w-lg md:max-w-xl lg:max-w-3xl max-h-[90vh] sm:max-h-[85vh] bg-zinc-900 border-zinc-800 text-white overflow-hidden flex flex-col p-4 sm:p-6">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              {seriesDialog.series?.logo && (
                <img
                  src={cachedImg(seriesDialog.series.logo)}
                  alt=""
                  className="h-8 w-6 sm:h-10 sm:w-8 object-cover rounded shrink-0"
                />
              )}
              <span className="truncate">{seriesDialog.series?.name}</span>
            </DialogTitle>
          </DialogHeader>

          {seriesDialog.loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : seriesDialog.info ? (
            <div className="overflow-hidden flex flex-col gap-3 sm:gap-4 min-h-0">
              {seriesDialog.info.info?.plot && (
                <p className="text-xs sm:text-sm text-zinc-400 line-clamp-3">
                  {seriesDialog.info.info.plot}
                </p>
              )}

              {seriesDialog.info.info?.genre && (
                <div className="flex flex-wrap gap-1">
                  {seriesDialog.info.info.genre
                    .split(",")
                    .map((g) => g.trim())
                    .filter(Boolean)
                    .slice(0, 5)
                    .map((g, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="bg-zinc-800 text-zinc-300 text-[10px] sm:text-xs"
                      >
                        {g}
                      </Badge>
                    ))}
                </div>
              )}

              <ScrollArea className="flex-1 max-h-[50vh] sm:max-h-[55vh]">
                <div className="space-y-4 pr-2">
                  {(seriesDialog.info.seasons || []).length > 0 ? (
                    (seriesDialog.info.seasons || []).map((season) => {
                      const epsArr = seriesDialog.info?.episodes;
                      const eps = Array.isArray(epsArr)
                        ? epsArr.filter(
                            (e) =>
                              Number(e.season) === Number(season.season_number)
                          )
                        : epsArr?.[String(season.season_number)] || [];
                      if (eps.length === 0) return null;
                      return (
                        <div key={season.season_number}>
                          <h4 className="text-sm font-semibold mb-2 text-zinc-300">
                            Temporada {season.season_number}{" "}
                            <span className="text-zinc-500 text-xs">
                              ({eps.length} eps)
                            </span>
                          </h4>
                          <div className="space-y-1.5">
                            {eps.map((ep) => (
                              <button
                                key={ep.id}
                                onClick={() => {
                                  setPlay({
                                    kind: "series",
                                    id: ep.id,
                                    name: seriesDialog.series?.name || "",
                                    logo: seriesDialog.series?.logo,
                                    episode: {
                                      id: ep.id,
                                      title: `T${season.season_number}E${ep.episode_num} - ${ep.title}`,
                                      container_extension:
                                        ep.container_extension || "mp4",
                                    },
                                  });
                                  setSeriesDialog({
                                    open: false,
                                    loading: false,
                                  });
                                }}
                                className="w-full text-left px-3 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-sm flex items-center justify-between gap-3 group"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium truncate">
                                    Ep. {ep.episode_num}: {ep.title}
                                  </p>
                                  {ep.info?.duration && (
                                    <p className="text-xs text-zinc-500">
                                      {ep.info.duration}
                                    </p>
                                  )}
                                </div>
                                <div className="bg-primary text-primary-foreground rounded-full h-7 w-7 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                  <svg
                                    className="h-3 w-3 fill-current ml-0.5"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-zinc-500 text-center py-8">
                      Nenhum episódio disponível para esta série no servidor.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <p className="text-zinc-500 py-8 text-center">
              Não foi possível carregar informações da série.
            </p>
          )}
        </DialogContent>
      </Dialog>


    </div>
  );
}
