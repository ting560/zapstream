"use client";

import { useEffect } from "react";
import { X, Tv } from "lucide-react";
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
  const url = `https://embedcanaisdetv.xyz/e/index.php?canal=${id}`;

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
          <iframe
            src={url}
            className="w-full h-full"
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture"
          />
        </div>

        <div className="px-4 py-3 bg-zinc-900 border-t border-white/10">
          <p className="text-white/90 text-sm truncate">{nome}</p>
          <p className="text-white/50 text-xs truncate">
            embedcanaisdetv.xyz
          </p>
        </div>
      </div>
    </div>
  );
}
