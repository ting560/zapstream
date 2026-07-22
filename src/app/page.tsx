"use client";

import { useEffect, useState } from "react";
import { useIPTVStore } from "@/lib/iptv-store";
import { IPTVApp } from "@/components/iptv/IPTVApp";
import { authenticate } from "@/lib/iptv-client";
import { useTracking } from "@/hooks/useTracking";

export default function Home() {
  const { isAuthenticated, setAuthenticated, setCredentials, theme } = useIPTVStore();
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

  useEffect(() => {
    if (!hydrated || isAuthenticated) return;
    fetch("/api/admin/servers")
      .then((r) => r.json())
      .then((servers) => {
        if (!Array.isArray(servers)) throw new Error();
        const active = servers.filter((s: any) => s.active);
        if (active.length === 0) return;
        const server = active[0];
        const creds = { server: server.url, username: server.username, password: server.password };
        setCredentials(creds);
        return authenticate(creds);
      })
      .then((data) => {
        if (data?.user_info?.auth === 1) {
          setAuthenticated(true);
        }
      })
      .catch(() => {});
  }, [hydrated, isAuthenticated]);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 text-sm">Conectando...</div>
      </div>
    );
  }

  return <IPTVApp />;
}
