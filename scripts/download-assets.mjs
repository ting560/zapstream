// Script para baixar dados estáticos do servidor IPTV
// Uso: node scripts/download-assets.mjs

import fs from "fs";
import path from "path";
import https from "https";
import http from "http";

const SERVER = "https://ooo.fo";
const USERNAME = "josias.barbosa.costa@gmail.com";
const PASSWORD = "123abc";
const DATA_DIR = path.resolve("public/data");

const AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const mod = u.protocol === "https:" ? https : http;
    mod.get(url, { timeout: 30000, headers: { "User-Agent": AGENT, Accept: "application/json" } }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString();
        if (res.statusCode >= 400) reject(new Error(`HTTP ${res.statusCode}`));
        else resolve(body);
      });
    }).on("error", reject).on("timeout", function() { this.destroy(); reject(new Error("Timeout")); });
  });
}

async function callApi(action, extra = {}, retries = 3) {
  const url = new URL(SERVER + "/player_api.php");
  url.searchParams.set("username", USERNAME);
  url.searchParams.set("password", PASSWORD);
  url.searchParams.set("action", action);
  for (const [k, v] of Object.entries(extra)) {
    if (v) url.searchParams.set(k, v);
  }
  for (let i = 0; i < retries; i++) {
    try {
      const text = await httpGet(url.toString());
      return JSON.parse(text);
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

async function main() {
  console.log("=== Download de Dados Estáticos IPTV ===\n");
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const data = {};

  // Categorias
  console.log("[1] Categorias...");
  data.categoriesLive = (await callApi("get_live_categories")) || [];
  data.categoriesVod = (await callApi("get_vod_categories")) || [];
  data.categoriesSeries = (await callApi("get_series_categories")) || [];
  console.log(`    Live: ${data.categoriesLive.length} | VOD: ${data.categoriesVod.length} | Séries: ${data.categoriesSeries.length}`);

  // Canais ao vivo
  console.log("[2] Canais ao vivo...");
  data.liveStreams = (await callApi("get_live_streams")) || [];
  console.log(`    ${data.liveStreams.length} canais`);

  // Filmes (VOD)
  console.log("[3] Filmes...");
  data.vodStreams = (await callApi("get_vod_streams")) || [];
  console.log(`    ${data.vodStreams.length} filmes`);

  // Séries
  console.log("[4] Séries...");
  data.series = (await callApi("get_series")) || [];
  console.log(`    ${data.series.length} séries`);

  // Salvar tudo em um arquivo único
  fs.writeFileSync(path.join(DATA_DIR, "iptv-data.json"), JSON.stringify(data));
  console.log("\n✓ Dados salvos em public/data/iptv-data.json");

  const totalMB = (Buffer.byteLength(JSON.stringify(data)) / 1024 / 1024).toFixed(1);
  console.log(`  Tamanho total: ${totalMB} MB`);
  console.log("\n=== Concluído! ===");
}

main().catch(console.error);
