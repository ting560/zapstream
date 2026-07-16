import fs from "fs";
import https from "https";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGOS_DIR = path.resolve(__dirname, "../public/logos");

const WIKI = "https://upload.wikimedia.org/wikipedia/commons";
const TVLOGO = "https://raw.githubusercontent.com/tv-logo/tv-logos/main";
const CANAISTV = "https://raw.githubusercontent.com/Lucasczm/CanaisTV/master";

// Mapa: nome do canal -> array de URLs (tenta em ordem)
const LOGO_MAP = {
  // Esportes
  "Amazon Prime": [`${WIKI}/1/11/Amazon_Prime_Video_logo.svg`, `${TVLOGO}/countries/international/amazon-prime-video-int.png`],
  "Amazon Prime 02": "Amazon Prime",
  "Amazon Prime 03": "Amazon Prime",
  "Amazon Prime 04": "Amazon Prime",
  "Amazon Prime 05": "Amazon Prime",
  "Apple TV 01": [`${WIKI}/f/f8/Apple_TV_Plus_Logo.svg`],
  "Apple TV 02": "Apple TV 01",
  "Band Sports": `${TVLOGO}/countries/brazil/band-sports-br.png`,
  "Canal Off": `${TVLOGO}/countries/brazil/canal-off-br.png`,
  "CazéTV": `${WIKI}/4/44/Caz%C3%A9TV_logo.png`,
  "Combate": `${WIKI}/pt/9/93/Combate_logo.png`,
  "DAZN": [`${TVLOGO}/countries/international/dazn-int.png`, `${WIKI}/d/d6/DAZN_logo_2021.svg`],
  "Disney+": `${TVLOGO}/countries/international/disney-plus-int.png`,
  "Disney+ 02": "Disney+",
  "Disney+ 03": "Disney+",
  "Disney+ 04": "Disney+",
  "Disney+ 05": "Disney+",
  "Disney+ 06": "Disney+",
  "ESPN": [`${TVLOGO}/countries/international/espn-int.png`, `${TVLOGO}/countries/international/espn.png`],
  "ESPN 2": [`${TVLOGO}/countries/international/espn-2-int.png`, `${TVLOGO}/countries/international/espn-2.png`],
  "ESPN 3": [`${TVLOGO}/countries/international/espn-3-int.png`, `${TVLOGO}/countries/international/espn-3.png`],
  "ESPN 4": `${TVLOGO}/countries/brazil/espn-4-br.png`,
  "ESPN 5": `${TVLOGO}/countries/brazil/espn-5-br.png`,
  "ESPN 6": "ESPN",
  "GE TV": `${TVLOGO}/countries/brazil/ge-tv-br.png`,
  "Max": `${CANAISTV}/logos/max.png`,
  "Max 02": "Max",
  "Max 03": "Max",
  "Max 04": "Max",
  "Max 05": "Max",
  "Max 06": "Max",
  "Nosso Futebol": `${WIKI}/pt/6/67/Nosso_Futebol_logo.png`,
  "N Sports": `${WIKI}/8/8e/Nova_Logo_N_Sports_2024.png`,
  "Paramount +": [`${TVLOGO}/countries/international/paramount-plus-int.png`, `${TVLOGO}/countries/international/paramount-plus.png`],
  "Paramount + 02": "Paramount +",
  "Premiere Clubes": `${WIKI}/pt/c/cb/Premiere_FC_logo.png`,
  "Premiere 2": "Premiere Clubes",
  "Premiere 3": "Premiere Clubes",
  "Premiere 4": "Premiere Clubes",
  "Premiere 5": "Premiere Clubes",
  "Premiere 6": "Premiere Clubes",
  "Premiere 7": "Premiere Clubes",
  "Premiere 8": "Premiere Clubes",
  "SporTV": `${TVLOGO}/countries/brazil/sportv-br.png`,
  "SporTV 2": "SporTV",
  "SporTV 3": "SporTV",
  "TNT": `${CANAISTV}/logos/tnt.png`,
  "Xsports": `${WIKI}/6/6f/Xsports_logo.png`,

  // Casa do Patrão
  "Casa do Patrao 01": `${TVLOGO}/countries/brazil/casa-do-patrao-br.png`,
  "Casa do Patrao 02": "Casa do Patrao 01",
  "Casa do Patrao 03": "Casa do Patrao 01",
  "Casa do Patrao 04": "Casa do Patrao 01",
  "Casa do Patrao 05": "Casa do Patrao 01",
  "Casa do Patrao 06": "Casa do Patrao 01",
  "Casa do Patrao 07": "Casa do Patrao 01",
  "Casa do Patrao 08": "Casa do Patrao 01",

  // Filmes e Séries
  "A&amp;E": `${CANAISTV}/logos/a&e.png`,
  "AMC": `${CANAISTV}/logos/amc.png`,
  "AXN": `${CANAISTV}/logos/axn.png`,
  "Cinemax": `${CANAISTV}/logos/cinemax.png`,
  "Globoplay Novelas": `${TVLOGO}/countries/brazil/globoplay-novelas-br.png`,
  "HBO": `${CANAISTV}/logos/hbo.png`,
  "HBO 2": `${CANAISTV}/logos/hbo2.png`,
  "HBO Family": `${CANAISTV}/logos/hbo-family.png`,
  "HBO Mundi": `${TVLOGO}/countries/brazil/hbo-mundi-br.png`,
  "HBO Plus": `${CANAISTV}/logos/hbo-plus.png`,
  "HBO Pop": `${TVLOGO}/countries/brazil/hbo-pop-br.png`,
  "HBO Signature": `${CANAISTV}/logos/hbo-signature.png`,
  "HBO Xtreme": `${TVLOGO}/countries/brazil/hbo-xtreme-br.png`,
  "Megapix": `${CANAISTV}/logos/megapix.png`,
  "Paramount Network": `${WIKI}/1/14/Paramount_Network_Logo_2020.svg`,
  "Sony Channel": `${CANAISTV}/logos/sony.png`,
  "Space": `${CANAISTV}/logos/space.png`,
  "Studio Universal": `${CANAISTV}/logos/studio-universal.png`,
  "Telecine Action": `${CANAISTV}/logos/tc-action.png`,
  "Telecine Cult": `${CANAISTV}/logos/tc-cult.png`,
  "Telecine Fun": `${CANAISTV}/logos/tc-fun.png`,
  "Telecine Pipoca": `${CANAISTV}/logos/tc-pipoca.png`,
  "Telecine Premium": `${CANAISTV}/logos/tc-premium.png`,
  "Telecine Touch": `${CANAISTV}/logos/tc-touch.png`,
  "TNT Novelas": `${TVLOGO}/countries/brazil/tnt-novelas-br.png`,
  "TNT Series": `${CANAISTV}/logos/tnt-series.png`,
  "Universal TV": `${CANAISTV}/logos/universal.png`,
  "Warner Channel": `${CANAISTV}/logos/warner.png`,

  // Canais Abertos
  "Band SP": `${TVLOGO}/countries/brazil/band-br.png`,
  "Globo DF": `${TVLOGO}/countries/brazil/globo-br.png`,
  "Globo Espírito Santo": "Globo DF",
  "Globo Minas": "Globo DF",
  "Globo Rio": "Globo DF",
  "Globo Porto Alegre": "Globo DF",
  "Globo São Paulo": "Globo DF",
  "Record DF": `${TVLOGO}/countries/brazil/record-tv-br.png`,
  "Record Espírito Santo": "Record DF",
  "Record Minas": "Record DF",
  "Record Rio": "Record DF",
  "Record São Paulo": "Record DF",
  "RedeTV!": `${TVLOGO}/countries/brazil/redetv-br.png`,
  "SBT Rio": `${TVLOGO}/countries/brazil/sbt-br.png`,
  "SBT São Paulo": "SBT Rio",
  "TV Cultura": `${TVLOGO}/countries/brazil/tv-cultura-br.png`,

  // Variedades
  "Adult Swim": [`${TVLOGO}/countries/international/adult-swim-int.png`, `${TVLOGO}/countries/international/adult-swim.png`, `${WIKI}/1/1a/Adult_Swim_logo_2021.svg`],
  "Animal Planet": `${TVLOGO}/countries/international/animal-planet-int.png`,
  "Comedy Central": `${CANAISTV}/logos/comedy-central.png`,
  "Discovery Channel": `${TVLOGO}/countries/international/discovery-channel-int.png`,
  "Discovery Home &amp; Health": `${TVLOGO}/countries/international/discovery-home-health-int.png`,
  "Investigation Discovery": `${TVLOGO}/countries/international/investigation-discovery-int.png`,
  "Discovery Science": `${TVLOGO}/countries/international/discovery-science-int.png`,
  "Discovery Theater": "Discovery Channel",
  "Discovery Turbo": `${TVLOGO}/countries/brazil/discovery-turbo-br.png`,
  "Discovery World": "Discovery Channel",
  "Food Network": `${TVLOGO}/countries/international/food-network-int.png`,
  "GNT": `${TVLOGO}/countries/brazil/gnt-br.png`,
  "HGTV": `${TVLOGO}/countries/international/hgtv-int.png`,
  "History": `${TVLOGO}/countries/international/history-int.png`,
  "History 2": `${TVLOGO}/countries/international/history-2-int.png`,
  "MTV": `${TVLOGO}/countries/international/mtv-int.png`,
  "Multishow": `${TVLOGO}/countries/brazil/multishow-br.png`,

  // Notícias
  "BandNews": `${TVLOGO}/countries/brazil/band-news-br.png`,
  "CNN Brasil": `${TVLOGO}/countries/brazil/cnn-brasil-br.png`,
  "GloboNews": `${TVLOGO}/countries/brazil/globo-news-br.png`,
  "Jovem Pan News": `${TVLOGO}/countries/brazil/jovem-pan-news-br.png`,
  "Record News": `${TVLOGO}/countries/brazil/record-news-br.png`,

  // Infantil
  "Cartoonito": `${TVLOGO}/countries/brazil/cartoonito-br.png`,
  "Cartoon Network": `${TVLOGO}/countries/brazil/cartoon-network-br.png`,
  "Discovery Kids": `${TVLOGO}/countries/brazil/discovery-kids-br.png`,
  "DreamWorks": `${TVLOGO}/countries/brazil/dreamworks-channel-br.png`,
  "Gloob": `${TVLOGO}/countries/brazil/gloob-br.png`,
  "Gloobinho": `${TVLOGO}/countries/brazil/gloobinho-br.png`,
  "Nickelodeon": `${TVLOGO}/countries/international/nickelodeon-int.png`,
  "Nick Jr.": `${TVLOGO}/countries/international/nick-jr-int.png`,
  "Tooncast": `${WIKI}/6/6e/Tooncast_logo.png`,
};

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function resolveUrls(name, visited = new Set()) {
  if (visited.has(name)) return [];
  visited.add(name);
  const val = LOGO_MAP[name];
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string" && val.startsWith("http")) return [val];
  return resolveUrls(val, visited);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const handler = (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        const redirectUrl = new URL(res.headers.location, url).toString();
        return download(redirectUrl, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        return;
      }
      res.pipe(file);
      file.on("finish", () => {
        file.close(resolve);
      });
    };
    const mod = url.startsWith("https") ? https : http;
    const req = mod.get(url, { timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" } }, handler);
    req.on("error", (err) => { file.close(); fs.unlink(dest, () => {}); reject(err); });
    req.on("timeout", () => { req.destroy(); file.close(); fs.unlink(dest, () => {}); reject(new Error("Timeout")); });
  });
}

async function main() {
  if (!fs.existsSync(LOGOS_DIR)) fs.mkdirSync(LOGOS_DIR, { recursive: true });

  const canaisPath = path.resolve(__dirname, "../public/canais_cache.json");
  const canais = JSON.parse(fs.readFileSync(canaisPath, "utf8"));
  const results = [];
  let count = 0;

  for (const ch of canais) {
    const urls = resolveUrls(ch.nome);
    if (!urls.length) {
      results.push({ ...ch, logo: "" });
      continue;
    }
    const firstUrl = urls[0];
    const ext = path.extname(firstUrl).split("?")[0] || ".png";
    const filename = `${slug(ch.nome)}${ext}`;
    const dest = path.join(LOGOS_DIR, filename);

    if (!fs.existsSync(dest)) {
      let ok = false;
      for (const url of urls) {
        try {
          await download(url, dest);
          ok = true;
          count++;
          process.stdout.write(`✓ ${ch.nome}\n`);
          break;
        } catch (err) {
          process.stdout.write(`  ${ch.nome} fallback: ${err.message}\n`);
        }
        await sleep(800);
      }
      if (!ok) {
        process.stdout.write(`✗ ${ch.nome}: all URLs failed\n`);
      }
    }
    results.push({ ...ch, logo: `/logos/${filename}` });
    await sleep(300);
  }

  fs.writeFileSync(canaisPath, JSON.stringify(results));

  console.log(`\nDownloaded ${count} logos. Total: ${results.filter((r) => r.logo).length} channels with logos.`);
}

main().catch(console.error);
