"use client";

import { useEffect, useState } from "react";
import { useIPTVStore } from "@/lib/iptv-store";
import { LoginCard } from "@/components/iptv/LoginCard";
import { IPTVApp } from "@/components/iptv/IPTVApp";
import { Ads } from "@/components/Ads";
import { useTracking } from "@/hooks/useTracking";

export default function Home() {
  const { isAuthenticated, theme } = useIPTVStore();
  const [hydrated, setHydrated] = useState(false);

  useTracking();

  useEffect(() => {
    setHydrated(true);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    document.body.style.backgroundColor = "#09090b";
    document.body.style.color = "#fff";
  }, []);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 text-sm">Conectando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginCard />;
  }

  return (
    <>
      <IPTVApp />
      <Ads />
    </>
  );
}
