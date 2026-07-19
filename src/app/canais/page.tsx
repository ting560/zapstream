"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Search, Loader2, AlertTriangle, Tv, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Ads } from "@/components/Ads";
import { useRouter } from "next/navigation";

interface Canal {
  nome: string;
  id: string;
  cat: string;
}

export default function CanaisPage() {
  const router = useRouter();
  const [canais, setCanais] = useState<Canal[]>([]);
  const [cats, setCats] = useState<string[]>([]);
  const [activeCat, setActiveCat] = useState("all");
  const [search, setSearch] = useState("");
  const [playing, setPlaying] = useState<{ nome: string; id: string } | null>(null);

  useEffect(() => {
    fetch("/canais_cache.json")
      .then((r) => r.json())
      .then((data: Canal[]) => {
        setCanais(data);
        setCats([...new Set(data.map((c) => c.cat))]);
        if (data.length > 0) setPlaying({ nome: data[0].nome, id: data[0].id });
      });
  }, []);

  const filtrados = canais.filter((c) => {
    if (activeCat !== "all" && c.cat !== activeCat) return false;
    if (search && !c.nome.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <Ads />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-72 min-w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col">
          <div className="p-3 border-b border-zinc-800 flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="text-zinc-400 hover:text-white shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-sm font-bold text-zinc-300">Canais</h2>
          </div>
          <div className="p-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="bg-zinc-800 border-zinc-700 text-white h-8 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-1 px-3 pb-2">
            <button
              onClick={() => setActiveCat("all")}
              className={`text-xs px-2 py-1 rounded-full transition-colors ${activeCat === "all" ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}
            >
              Todas
            </button>
            {cats.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                className={`text-xs px-2 py-1 rounded-full transition-colors ${activeCat === cat ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5">
            {filtrados.map((c) => (
              <button
                key={c.id}
                onClick={() => setPlaying({ nome: c.nome, id: c.id })}
                className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${playing?.id === c.id ? "bg-red-600/20 text-red-400 border-l-2 border-red-500" : "text-zinc-300 hover:bg-zinc-800"}`}
              >
                {c.nome}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 bg-black flex flex-col">
          {playing ? (
            <Player canal={playing.id} nome={playing.nome} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-500">
              Selecione um canal
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Player({ canal, nome }: { canal: string; nome: string }) {
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

    const src = `/api/canais/stream?c=${encodeURIComponent(canal)}&f=index.m3u8`;

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().then(() => setStatus("playing")).catch(() => setStatus("playing"));
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          setErrorMsg(
            data.type === Hls.ErrorTypes.NETWORK_ERROR
              ? "Erro de rede. Canal pode estar offline."
              : "Erro ao reproduzir."
          );
          setStatus("error");
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.addEventListener("loadedmetadata", () => {
        video.play().catch(() => {});
        setStatus("playing");
      }, { once: true });
    } else {
      setErrorMsg("HLS não suportado.");
      setStatus("error");
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.removeAttribute("src");
      video.load();
    };
  }, [canal]);

  return (
    <div className="flex-1 flex flex-col bg-black relative">
      <div className="flex-1 flex items-center justify-center bg-black relative">
        <video ref={videoRef} className="w-full h-full max-h-screen" controls autoPlay playsInline />
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-none">
            <Loader2 className="h-10 w-10 text-white animate-spin" />
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6">
            <div className="text-center">
              <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto mb-2" />
              <p className="text-white font-medium">Erro</p>
              <p className="text-white/70 text-sm max-w-md">{errorMsg}</p>
            </div>
          </div>
        )}
      </div>
      <div className="px-4 py-2 bg-zinc-900 border-t border-zinc-800 flex items-center gap-2">
        <Tv className="h-4 w-4 text-red-500" />
        <span className="text-sm text-zinc-200">{nome}</span>
      </div>
    </div>
  );
}
