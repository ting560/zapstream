"use client";

import { useEffect, useState } from "react";
import { useIPTVStore } from "@/lib/iptv-store";
import { LoginCard } from "@/components/iptv/LoginCard";
import { IPTVApp } from "@/components/iptv/IPTVApp";
import { authenticate } from "@/lib/iptv-client";

export default function Home() {
  const { isAuthenticated, setAuthenticated, theme, setTheme, credentials } = useIPTVStore();
  const [hydrated, setHydrated] = useState(false);
  const [autoLogging, setAutoLogging] = useState(false);

  useEffect(() => {
    setHydrated(true);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme, setTheme]);

  useEffect(() => {
    document.body.style.backgroundColor = "#09090b";
    document.body.style.color = "#fff";
  }, []);

  useEffect(() => {
    if (hydrated && !isAuthenticated && !autoLogging) {
      setAutoLogging(true);
      authenticate(credentials)
        .then((data) => {
          if (data?.user_info?.auth === 1) {
            setAuthenticated(true);
          }
        })
        .catch(() => {});
    }
  }, [hydrated, isAuthenticated, autoLogging, credentials, setAuthenticated]);

  if (!hydrated || (autoLogging && !isAuthenticated)) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 text-sm">Conectando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginCard />;
  }

  return <IPTVApp />;
}
