"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { X, Loader2, AlertTriangle, Tv, Film, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PlayItem, IPTVCredentials } from "@/lib/iptv-types";
import { buildStreamUrl } from "@/lib/iptv-client";

interface PlayerModalProps {
  item: PlayItem | null;
  credentials: IPTVCredentials;
  onClose: () => void;
}

export function PlayerModal({ item, credentials, onClose }: PlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [status, setStatus] = useState<"loading" | "playing" | "error">(
    "loading"
  );
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!item) return;
    const video = videoRef.current;
    if (!video) return;

    setStatus("loading");
    setErrorMsg("");

    const ext =
      item.kind === "live"
        ? "m3u8"
        : item.episode?.container_extension || item.containerExtension || "mp4";

    const url = buildStreamUrl(credentials, item.kind, item.id, ext);

    // Cleanup anterior
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (item.kind === "live" || url.endsWith(".m3u8")) {
      // Stream HLS - usar hls.js
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: item.kind === "live",
          backBufferLength: 30,
        });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video
            .play()
            .then(() => setStatus("playing"))
            .catch(() => setStatus("playing"));
        });
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                setErrorMsg(
                  "Erro de rede ao carregar o stream. O canal pode estar offline ou o servidor bloqueou a conexão."
                );
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                setErrorMsg(
                  "Erro de mídia. Formato de stream incompatível com o navegador."
                );
                break;
              default:
                setErrorMsg(
                  "Não foi possível reproduzir este conteúdo. Tente outro canal."
                );
                break;
            }
            setStatus("error");
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari nativo
        video.src = url;
        video.addEventListener(
          "loadedmetadata",
          () => {
            video.play().catch(() => {});
            setStatus("playing");
          },
          { once: true }
        );
      } else {
        setErrorMsg("Seu navegador não suporta HLS.");
        setStatus("error");
      }
    } else {
      // VOD ou Series (mp4, mkv, etc) - tentar playback direto
      video.src = url;
      video.addEventListener(
        "loadedmetadata",
        () => {
          video.play().catch(() => {});
          setStatus("playing");
        },
        { once: true }
      );
      video.addEventListener(
        "error",
        () => {
          setErrorMsg(
            `Não foi possível reproduzir este arquivo (.${ext}). Navegadores só conseguem tocar .mp4/.webm nativamente; .mkv/.avi podem não funcionar.`
          );
          setStatus("error");
        },
        { once: true }
      );
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
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (!item) return null;

  const kindLabel =
    item.kind === "live" ? "AO VIVO" : item.kind === "vod" ? "FILME" : "SÉRIE";
  const KindIcon = item.kind === "live" ? Tv : item.kind === "vod" ? Film : Star;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 sm:p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl bg-black rounded-xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10">
          <div className="flex items-center gap-2 min-w-0">
            <Badge
              variant="destructive"
              className="bg-red-600 hover:bg-red-600 shrink-0"
            >
              <KindIcon className="h-3 w-3 mr-1" />
              {kindLabel}
            </Badge>
            <h3 className="text-white font-medium truncate text-sm sm:text-base">
              {item.name}
              {item.episode ? ` - ${item.episode.title}` : ""}
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

        {/* Vídeo */}
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

        {/* Footer info */}
        <div className="px-4 py-3 bg-zinc-900 border-t border-white/10 flex items-center gap-3">
          {item.logo && (
            <img
              src={item.logo}
              alt=""
              className="h-8 w-8 rounded object-contain bg-white/5"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-white/90 text-sm truncate">
              {item.name}
              {item.episode ? ` — ${item.episode.title}` : ""}
            </p>
            <p className="text-white/50 text-xs truncate">
              Servidor: {credentials.server}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
