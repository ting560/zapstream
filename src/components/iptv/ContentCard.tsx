"use client";

import { useState } from "react";
import { Tv, Film, Star, Heart, Play, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContentKind, PlayItem } from "@/lib/iptv-types";
import { useIPTVStore } from "@/lib/iptv-store";
import { cachedImg } from "@/lib/img-cache";

interface ContentCardProps {
  id: number | string;
  kind: ContentKind;
  name: string;
  logo?: string;
  rating?: string | number;
  containerExtension?: string;
  onPlay: (item: PlayItem) => void;
}

export function ContentCard({
  id,
  kind,
  name,
  logo,
  rating,
  containerExtension,
  onPlay,
}: ContentCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const isFav = useIPTVStore((s) => s.isFavorite(id, kind));
  const toggleFavorite = useIPTVStore((s) => s.toggleFavorite);

  const Icon = kind === "live" ? Tv : kind === "vod" ? Film : Star;

  const showImage = logo && !imgError;
  const imgSrc = cachedImg(showImage ? logo : undefined);

  return (
    <div
      className="group relative bg-card rounded-xl overflow-hidden border border-border hover:border-primary/60 transition-all cursor-pointer hover:shadow-xl hover:-translate-y-0.5"
      onClick={() =>
        onPlay({
          kind,
          id,
          name,
          logo,
          containerExtension,
        })
      }
    >
      {/* Poster / Logo */}
      <div
        className={cn(
          "relative w-full bg-muted/30 overflow-hidden",
          kind === "live" ? "aspect-square" : "aspect-[2/3]"
        )}
      >
            {imgSrc ? (
              <>
                {!imgLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                )}
                <img
                  src={imgSrc}
              alt={name}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              className={cn(
                "w-full h-full object-cover transition-opacity duration-300 group-hover:scale-105",
                imgLoaded ? "opacity-100" : "opacity-0",
                kind === "live" && "object-contain p-3"
              )}
            />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}

        {/* Overlay com play */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
          <div className="bg-primary text-primary-foreground rounded-full h-11 w-11 flex items-center justify-center shadow-lg">
            <Play className="h-5 w-5 fill-current ml-0.5" />
          </div>
        </div>

        {/* Badge Live */}
        {kind === "live" && (
          <div className="absolute top-2 left-2">
            <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              Live
            </span>
          </div>
        )}

        {/* Rating */}
        {rating && Number(rating) > 0 && (
          <div className="absolute top-2 right-2 bg-black/70 text-yellow-400 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400" />
            {typeof rating === "number" ? rating.toFixed(1) : rating}
          </div>
        )}

        {/* Favorito */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite({ id, kind, name, logo });
          }}
          className={cn(
            "absolute bottom-2 right-2 h-8 w-8 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100",
            isFav
              ? "bg-red-600 text-white opacity-100"
              : "bg-black/60 text-white hover:bg-black/80"
          )}
          aria-label="Favoritar"
        >
          <Heart className={cn("h-4 w-4", isFav && "fill-current")} />
        </button>
      </div>

      {/* Nome */}
      <div className="p-2.5">
        <h3 className="text-sm font-medium truncate leading-tight" title={name}>
          {name}
        </h3>
        {kind !== "live" && containerExtension && (
          <p className="text-[10px] text-muted-foreground uppercase mt-0.5">
            {containerExtension}
          </p>
        )}
      </div>
    </div>
  );
}
