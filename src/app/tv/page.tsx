"use client";

import { useEffect, useState } from "react";
import { useIPTVStore } from "@/lib/iptv-store";
import { TVApp } from "@/components/iptv/TVApp";
import { authenticate } from "@/lib/iptv-client";

export default function TVPage() {
  const { isAuthenticated, setAuthenticated, setCredentials } = useIPTVStore();
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<"loading" | "login" | "app">("loading");

  useEffect(() => {
    setHydrated(true);
    document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    document.body.style.backgroundColor = "#09090b";
    document.body.style.color = "#fff";
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (isAuthenticated) { setState("app"); return; }
    fetch("/api/admin/servers")
      .then((r) => r.json())
      .then((servers) => {
        if (!Array.isArray(servers)) throw new Error();
        const active = servers.filter((s: any) => s.active);
        if (active.length === 0) { setState("login"); return; }
        const server = active[0];
        const creds = { server: server.url, username: server.username, password: server.password };
        setCredentials(creds);
        return authenticate(creds);
      })
      .then((data) => {
        if (data?.user_info?.auth === 1) {
          setAuthenticated(true);
          setState("app");
        } else {
          setState("login");
        }
      })
      .catch(() => setState("login"));
  }, [hydrated]);

  if (!hydrated || state === "loading") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 text-lg">Conectando...</div>
      </div>
    );
  }

  return <TVApp />;
}
