"use client";

import { useEffect } from "react";

export function Ads() {
  useEffect(() => {
    (window as any).atOptions = {
      key: "443dfd27df99ddf8dea113eceb887912",
      format: "iframe",
      height: 250,
      width: 300,
      params: {},
    };

    const s1 = document.createElement("script");
    s1.async = true;
    s1.setAttribute("data-cfasync", "false");
    s1.src = "https://pl30354693.effectivecpmnetwork.com/83db2da36f450d487d008356efe65b22/invoke.js";
    document.body.appendChild(s1);

    const s2 = document.createElement("script");
    s2.src = "https://www.highperformanceformat.com/443dfd27df99ddf8dea113eceb887912/invoke.js";
    document.body.appendChild(s2);

    return () => {
      s1.remove();
      s2.remove();
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div id="container-83db2da36f450d487d008356efe65b22" />
    </div>
  );
}
