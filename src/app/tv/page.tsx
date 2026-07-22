"use client";

import { useEffect, useState } from "react";
import { useIPTVStore } from "@/lib/iptv-store";
import { TVApp } from "@/components/iptv/TVApp";

export default function TVPage() {
  const { isAuthenticated } = useIPTVStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    document.body.style.backgroundColor = "#09090b";
    document.body.style.color = "#fff";
  }, []);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 text-lg">Conectando...</div>
      </div>
    );
  }

  return <TVApp />;
}
