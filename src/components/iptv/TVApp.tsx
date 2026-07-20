"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useIPTVStore } from "@/lib/iptv-store";
import {
  getCategories,
  getLiveStreams,
  getVodStreams,
  getSeries,
  getVodInfo,
  getSeriesInfo,
  buildStreamUrl,
} from "@/lib/iptv-client";
import type {
  ContentKind,
  PlayItem,
  IPTVCategory,
} from "@/lib/iptv-types";
import Hls from "hls.js";
import { Loader2 } from "lucide-react";

const TABS: { kind: ContentKind; label: string }[] = [
  { kind: "live", label: "TV ao Vivo" },
  { kind: "vod", label: "Filmes" },
  { kind: "series", label: "Séries" },
];

type FocusArea = "tabs" | "categories" | "grid";

function useGridNavigation(
  cols: number,
  totalItems: number,
  focusArea: FocusArea,
  setFocusArea: (a: FocusArea) => void,
  focusIndex: number,
  setFocusIndex: (i: number) => void,
  onEnter: () => void,
  onBack: () => void,
  onTabChange: (dir: -1 | 1) => void,
  onCategoryChange: (dir: -1 | 1) => void,
) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          if (focusArea === "grid" && focusIndex < totalItems - 1) {
            const row = Math.floor(focusIndex / cols);
            const col = focusIndex % cols;
            if (col < cols - 1 && focusIndex + 1 < totalItems) {
              setFocusIndex(focusIndex + 1);
            } else {
              setFocusIndex(row * cols + Math.min(cols - 1, totalItems - row * cols - 1));
            }
          } else if (focusArea === "tabs") {
            onTabChange(1);
          } else if (focusArea === "categories") {
            onCategoryChange(1);
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (focusArea === "grid" && focusIndex > 0) {
            const col = focusIndex % cols;
            if (col > 0) {
              setFocusIndex(focusIndex - 1);
            } else {
              setFocusIndex(focusIndex);
            }
          } else if (focusArea === "tabs") {
            onTabChange(-1);
          } else if (focusArea === "categories") {
            onCategoryChange(-1);
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (focusArea === "grid") {
            const row = Math.floor(focusIndex / cols);
            if (row > 0) {
              setFocusIndex(focusIndex - cols);
            } else {
              setFocusArea("categories");
              setFocusIndex(0);
            }
          } else if (focusArea === "categories") {
            setFocusArea("tabs");
            setFocusIndex(0);
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          if (focusArea === "tabs") {
            setFocusArea("categories");
            setFocusIndex(0);
          } else if (focusArea === "categories") {
            setFocusArea("grid");
            setFocusIndex(0);
          } else if (focusArea === "grid") {
            const row = Math.floor(focusIndex / cols);
            const nextRowStart = (row + 1) * cols;
            if (nextRowStart < totalItems) {
              const col = focusIndex % cols;
              const target = Math.min(nextRowStart + col, totalItems - 1);
              setFocusIndex(target);
            }
          }
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          onEnter();
          break;
        case "Escape":
        case "Backspace":
          e.preventDefault();
          onBack();
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [focusArea, focusIndex, totalItems, cols, onEnter, onBack, onTabChange, onCategoryChange, setFocusArea, setFocusIndex]);
}

export function TVApp() {
  const {
    credentials,
    activeTab,
    setActiveTab,
    activeCategory,
    setActiveCategory,
    search,
    setSearch,
  } = useIPTVStore();

  const [focusArea, setFocusArea] = useState<FocusArea>("tabs");
  const [focusIndex, setFocusIndex] = useState(0);
  const [tabIndex, setTabIndex] = useState(0);
  const [catIndex, setCatIndex] = useState(0);

  const [categories, setCategories] = useState<IPTVCategory[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [screen, setScreen] = useState<"home" | "player">("home");
  const [playerItem, setPlayerItem] = useState<PlayItem | null>(null);

  const colsRef = useRef(5);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateCols = () => {
      const w = window.innerWidth;
      if (w >= 1600) colsRef.current = 6;
      else if (w >= 1200) colsRef.current = 5;
      else if (w >= 900) colsRef.current = 4;
      else colsRef.current = 3;
    };
    updateCols();
    window.addEventListener("resize", updateCols);
    return () => window.removeEventListener("resize", updateCols);
  }, []);

  useEffect(() => {
    setFocusArea("tabs");
    setFocusIndex(0);
    setTabIndex(0);
    setCatIndex(0);
    setActiveCategory("all");
  }, [activeTab]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setItems([]);

    getCategories(credentials, activeTab)
      .then((cats) => {
        if (!cancelled) {
          setCategories(cats);
        }
      })
      .catch(() => {});

    const loader = activeTab === "live"
      ? getLiveStreams
      : activeTab === "vod"
      ? getVodStreams
      : getSeries;

    loader(credentials, activeCategory === "all" ? undefined : activeCategory)
      .then((data) => {
        if (!cancelled) {
          const seen = new Set<string>();
          const deduped = (Array.isArray(data) ? data : []).filter((it: any) => {
            const key = (it.name || "").toLowerCase().trim();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          setItems(deduped);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [credentials, activeTab, activeCategory]);

  const displayItems = useMemo(() => items.slice(0, 100), [items]);

  const handleEnter = useCallback(() => {
    if (focusArea === "tabs") {
      const available = TABS;
      const t = available[tabIndex];
      if (t) setActiveTab(t.kind);
    } else if (focusArea === "categories") {
      const cats = categories;
      if (catIndex === 0) {
        setActiveCategory("all");
      } else {
        const c = cats[catIndex - 1];
        if (c) setActiveCategory(c.category_id);
      }
    } else if (focusArea === "grid") {
      const item = displayItems[focusIndex];
      if (!item) return;
      const id = activeTab === "series" ? item.series_id : item.stream_id;
      setPlayerItem({
        kind: activeTab,
        id,
        name: item.name || "",
        logo: activeTab === "series" ? item.cover : item.stream_icon,
        containerExtension: item.container_extension,
      });
      setScreen("player");
    }
  }, [focusArea, tabIndex, catIndex, categories, displayItems, focusIndex, activeTab, setActiveTab, setActiveCategory]);

  const handleBack = useCallback(() => {
    if (screen === "player") {
      setScreen("home");
      setPlayerItem(null);
    }
  }, [screen]);

  const handleTabChange = useCallback((dir: -1 | 1) => {
    const available = TABS;
    setTabIndex((i) => {
      const next = (i + dir + available.length) % available.length;
      return next;
    });
  }, []);

  const handleCategoryChange = useCallback((dir: -1 | 1) => {
    const total = categories.length + 1;
    setCatIndex((i) => {
      const next = (i + dir + total) % total;
      return next;
    });
  }, [categories]);

  useGridNavigation(
    colsRef.current,
    displayItems.length,
    focusArea,
    setFocusArea,
    focusIndex,
    setFocusIndex,
    handleEnter,
    handleBack,
    handleTabChange,
    handleCategoryChange,
  );

  if (screen === "player" && playerItem) {
    return (
      <TVPlayer
        item={playerItem}
        credentials={credentials}
        onClose={() => { setScreen("home"); setPlayerItem(null); }}
      />
    );
  }

  const availableTabs = TABS;
  const catList = [{ id: "all", name: "Todas" }, ...categories];

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col p-4 sm:p-6 select-none">
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">FilmeStream</h1>
        <p className="text-zinc-500 text-lg mt-1">Navegue com as setas do controle</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4" role="tablist">
        {availableTabs.map((t, i) => {
          const focused = focusArea === "tabs" && tabIndex === i;
          return (
            <button
              key={t.kind}
              onClick={() => { setActiveTab(t.kind); setFocusArea("tabs"); setTabIndex(i); }}
              className={`px-6 py-3 rounded-xl text-xl font-semibold transition-all ${
                activeTab === t.kind
                  ? "bg-red-600 text-white"
                  : "bg-zinc-800 text-zinc-400"
              } ${focused ? "ring-4 ring-white/60 scale-105" : ""}`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Categories */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2" ref={gridRef}>
        {catList.map((cat, i) => {
          const focused = focusArea === "categories" && catIndex === i;
          return (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); setFocusArea("categories"); setCatIndex(i); }}
              className={`px-5 py-2 rounded-full text-base whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? "bg-red-600/80 text-white"
                  : "bg-zinc-800/60 text-zinc-400"
              } ${focused ? "ring-4 ring-white/60 scale-105" : ""}`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${colsRef.current}, 1fr)` }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-zinc-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-red-400 text-xl">{error}</p>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-zinc-500 text-xl">Nenhum item disponível.</p>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${colsRef.current}, 1fr)` }}>
            {displayItems.map((item, idx) => {
              const id = activeTab === "series" ? item.series_id : item.stream_id;
              const name = item.name || "";
              const logo = activeTab === "series" ? item.cover : item.stream_icon;
              const focused = focusArea === "grid" && focusIndex === idx;
              const isLive = activeTab === "live";

              return (
                <div
                  key={`${id}-${idx}`}
                  onClick={() => {
                    setFocusArea("grid");
                    setFocusIndex(idx);
                    const pi = {
                      kind: activeTab as ContentKind,
                      id,
                      name,
                      logo,
                      containerExtension: item.container_extension,
                    };
                    setPlayerItem(pi);
                    setScreen("player");
                  }}
                  className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all bg-zinc-900 border-2 ${
                    focused
                      ? "border-red-500 scale-[1.02] shadow-xl shadow-red-500/20"
                      : "border-transparent hover:border-zinc-600"
                  }`}
                >
                  <div className={isLive ? "aspect-square" : "aspect-[2/3]"}>
                    {logo ? (
                      <img
                        src={logo}
                        alt={name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                        <span className="text-6xl font-bold text-zinc-700">
                          {name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {isLive && (
                      <div className="absolute top-2 left-2">
                        <span className="inline-flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                          <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                          AO VIVO
                        </span>
                      </div>
                    )}
                    {focused && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <div className="bg-red-600 rounded-full h-16 w-16 flex items-center justify-center shadow-lg">
                          <svg className="h-8 w-8 text-white fill-current ml-1" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="text-base font-medium truncate leading-tight">
                      {name}
                    </h3>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Help overlay */}
      <div className="mt-6 flex items-center justify-center gap-6 text-sm text-zinc-600 pb-4">
        <span>↑↓←→ Navegar</span>
        <span>Enter OK</span>
        <span>Esc Voltar</span>
      </div>
    </div>
  );
}

function TVPlayer({
  item,
  credentials,
  onClose,
}: {
  item: PlayItem;
  credentials: { server: string; username: string; password: string };
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [status, setStatus] = useState<"loading" | "playing" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setStatus("loading");
    setErrorMsg("");

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const ext = item.containerExtension || "mp4";
    const url = buildStreamUrl(credentials, item.kind, item.id, ext);

    const isHls = item.kind === "live" || url.endsWith(".m3u8");

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().then(() => setStatus("playing")).catch(() => setStatus("playing"));
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            setErrorMsg("Erro de rede. O canal pode estar offline.");
          } else {
            setErrorMsg("Erro ao reproduzir este conteúdo.");
          }
          setStatus("error");
        }
      });
    } else {
      video.src = url;
      video.addEventListener("loadedmetadata", () => {
        video.play().catch(() => {});
        setStatus("playing");
      }, { once: true });
      video.addEventListener("error", () => {
        setErrorMsg("Não foi possível carregar o vídeo.");
        setStatus("error");
      }, { once: true });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.removeAttribute("src");
      video.load();
    };
  }, [item, credentials]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Backspace") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={onClose}>
      <div className="relative w-full h-full max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <video
          ref={videoRef}
          className="w-full h-full"
          controls
          autoPlay
          playsInline
        />
        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 pointer-events-none">
            <Loader2 className="h-16 w-16 text-white animate-spin" />
            <p className="text-white/80 text-xl">Carregando...</p>
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80">
            <p className="text-red-400 text-2xl font-semibold">Falha ao reproduzir</p>
            <p className="text-white/70 text-lg">{errorMsg}</p>
            <button
              onClick={onClose}
              className="mt-4 px-8 py-3 bg-white/10 text-white rounded-xl text-lg hover:bg-white/20"
            >
              Voltar
            </button>
          </div>
        )}
        <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
          <h2 className="text-white text-2xl font-bold truncate">{item.name}</h2>
        </div>
        <div className="absolute bottom-6 left-6 text-white/50 text-sm">
          Pressione Esc para voltar
        </div>
      </div>
    </div>
  );
}
