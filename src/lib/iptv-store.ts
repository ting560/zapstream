"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { IPTVCredentials, PlayItem, ContentKind } from "./iptv-types";

interface FavoriteItem {
  id: number | string;
  kind: ContentKind;
  name: string;
  logo?: string;
  addedAt: number;
}

interface IPTVState {
  // Credenciais (persistidas)
  credentials: IPTVCredentials;
  setCredentials: (c: IPTVCredentials) => void;

  // Estado de auth
  isAuthenticated: boolean;
  setAuthenticated: (v: boolean) => void;

  // Modo de exibição
  activeTab: ContentKind;
  setActiveTab: (t: ContentKind) => void;

  // Categoria selecionada ("all" = todas)
  activeCategory: string;
  setActiveCategory: (c: string) => void;

  // Busca
  search: string;
  setSearch: (s: string) => void;

  // Player
  currentPlay: PlayItem | null;
  setPlay: (p: PlayItem | null) => void;

  // Favoritos (persistidos)
  favorites: FavoriteItem[];
  toggleFavorite: (item: Omit<FavoriteItem, "addedAt">) => void;
  isFavorite: (id: number | string, kind: ContentKind) => boolean;

  // Tema
  theme: "dark" | "light";
  toggleTheme: () => void;
  setTheme: (t: "dark" | "light") => void;
}

// Credenciais padrão fornecidas pelo usuário
const DEFAULT_CREDENTIALS: IPTVCredentials = {
  server: "https://ooo.fo",
  username: "josias.barbosa.costa@gmail.com",
  password: "123abc",
};

export const useIPTVStore = create<IPTVState>()(
  persist(
    (set, get) => ({
      credentials: DEFAULT_CREDENTIALS,
      setCredentials: (c) => set({ credentials: c }),

      isAuthenticated: false,
      setAuthenticated: (v) => set({ isAuthenticated: v }),

      activeTab: "live",
      setActiveTab: (t) =>
        set({ activeTab: t, activeCategory: "all", search: "" }),

      activeCategory: "all",
      setActiveCategory: (c) => set({ activeCategory: c }),

      search: "",
      setSearch: (s) => set({ search: s }),

      currentPlay: null,
      setPlay: (p) => set({ currentPlay: p }),

      favorites: [],
      toggleFavorite: (item) => {
        const state = get();
        const exists = state.favorites.some(
          (f) => f.id === item.id && f.kind === item.kind
        );
        if (exists) {
          set({
            favorites: state.favorites.filter(
              (f) => !(f.id === item.id && f.kind === item.kind)
            ),
          });
        } else {
          set({
            favorites: [...state.favorites, { ...item, addedAt: Date.now() }],
          });
        }
      },
      isFavorite: (id, kind) =>
        get().favorites.some((f) => f.id === id && f.kind === kind),

      theme: "dark",
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
      setTheme: (t) => set({ theme: t }),
    }),
    {
      name: "iptv-store",
      partialize: (state) => ({
        credentials: state.credentials,
        favorites: state.favorites,
        theme: state.theme,
      }),
    }
  )
);
