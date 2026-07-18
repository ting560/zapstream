"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { X, Loader2, AlertTriangle, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CanaisPlayerModalProps {
  nome: string;
  id: string;
  onClose: () => void;
}

export function CanaisPlayerModal({
  nome,
  id,
  onClose,
}: CanaisPlayerModalProps) {
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

    const src = `/api/canais/stream?c=${encodeURIComponent(id)}&f=index.m3u8`;

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
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setErrorMsg("Erro de rede ao carregar o stream. O canal pode estar offline.");
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setErrorMsg("Erro de mídia. Formato de stream incompatível.");
              break;
            default:
              setErrorMsg("Não foi possível reproduzir este conteúdo.");
              break;
          }
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
      setErrorMsg("Seu navegador não suporta HLS.");
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
  }, [id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 sm:p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl bg-black rounded-xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10">
          <div className="flex items-center gap-2 min-w-0">
            <Badge
              variant="destructive"
              className="bg-red-600 hover:bg-red-600 shrink-0"
            >
              <Tv className="h-3 w-3 mr-1" />
              CANAL
            </Badge>
            <h3 className="text-white font-medium truncate text-sm sm:text-base">
              {nome}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/10 shrink-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="relative aspect-video bg-black w-full">
          <video
            ref={videoRef}
            className="w-full h-full"
            controls
            autoPlay
            playsInline
          />

          {status === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 pointer-events-none">
              <Loader2 className="h-10 w-10 text-white animate-spin" />
              <p className="text-white/80 text-sm">Carregando stream...</p>
            </div>
          )}

          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-6 text-center">
              <AlertTriangle className="h-10 w-10 text-amber-400" />
              <p className="text-white font-medium">Falha ao reproduzir</p>
              <p className="text-white/70 text-sm max-w-md">{errorMsg}</p>
              <Button variant="secondary" onClick={onClose} className="mt-2">
                Fechar
              </Button>
            </div>
          )}
        </div>

        <div className="px-4 py-3 bg-zinc-900 border-t border-white/10">
          <p className="text-white/90 text-sm truncate">{nome}</p>
          <p className="text-white/50 text-xs truncate">embedcanaisdetv.xyz</p>
        </div>
      </div>
    </div>
  );
}
