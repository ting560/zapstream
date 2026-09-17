<?php
$cacheFile = __DIR__ . '/canais_cache.json';
$origem = 'https://1.embedcanaisdetv.com/';
$expira = 7200; // 2 horas
$apiBase = 'https://api.reidoscanais.st';

// Funcao helper: buscar URL com SSL bypass (Windows PHP)
function fetchUrl($url, $options = []) {
    $defaults = [
        'timeout' => 8,
        'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    ];
    $opts = array_merge($defaults, $options);

    // Usar curl se disponivel (mais rapido e confiavel)
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        $curlOpts = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $opts['timeout'],
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_USERAGENT => $opts['user_agent'],
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
            CURLOPT_FOLLOWLOCATION => true,
        ];
        if (isset($opts['header'])) {
            $curlOpts[CURLOPT_HTTPHEADER] = explode("\r\n", trim($opts['header']));
        }
        curl_setopt_array($ch, $curlOpts);
        $data = curl_exec($ch);
        curl_close($ch);
        return $data;
    }

    // Fallback: stream_context
    $ctxOpts = [
        'http' => [
            'timeout' => $opts['timeout'],
            'user_agent' => $opts['user_agent'],
            'ignore_errors' => true,
        ],
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false,
        ],
    ];
    if (isset($opts['header'])) {
        $ctxOpts['http']['header'] = $opts['header'];
    }
    $ctx = stream_context_create($ctxOpts);
    return @file_get_contents($url, false, $ctx);
}

// Endpoint de refresh em background (chamado via JS para atualizar cache sem bloquear)
if (isset($_GET['refresh'])) {
    header('Content-Type: text/plain');
    header('Cache-Control: no-cache');
    // Atualizar cache em background
    $resp = fetchUrl("$apiBase/channels");
    if ($resp) {
        $json = json_decode($resp, true);
        if (isset($json['success']) && $json['success'] && !empty($json['data'])) {
            $canais = [];
            foreach ($json['data'] as $ch) {
                $embedUrl = $ch['embeds'][0]['embed_url'] ?? '';
                $canais[] = [
                    'nome' => $ch['name'] ?? $ch['id'],
                    'id' => $ch['id'],
                    'cat' => $ch['category'] ?? 'Geral',
                    'logo' => $ch['logo_url'] ?? '',
                    'embed' => $embedUrl,
                ];
            }
            file_put_contents($cacheFile, json_encode($canais));
        }
    }
    echo 'ok';
    exit;
}

// Buscar canais da API (fonte primaria, mais confiavel)
function listarCanaisApi() {
    global $apiBase, $cacheFile, $expira;

    // 1. Cache valido? Retornar instantaneamente
    if (file_exists($cacheFile)) {
        $dados = json_decode(file_get_contents($cacheFile), true);
        if ($dados && count($dados) > 5) {
            return $dados;
        }
    }

    // 2. Sem cache ou expirado? Buscar da API
    $resp = fetchUrl("$apiBase/channels");
    if ($resp) {
        $json = json_decode($resp, true);
        if (isset($json['success']) && $json['success'] && !empty($json['data'])) {
            $canais = [];
            foreach ($json['data'] as $ch) {
                $embedUrl = '';
                if (!empty($ch['embeds'][0]['embed_url'])) {
                    $embedUrl = $ch['embeds'][0]['embed_url'];
                }
                $canais[] = [
                    'nome' => $ch['name'] ?? $ch['id'],
                    'id' => $ch['id'],
                    'cat' => $ch['category'] ?? 'Geral',
                    'logo' => $ch['logo_url'] ?? '',
                    'embed' => $embedUrl,
                ];
            }
            file_put_contents($cacheFile, json_encode($canais));
            return $canais;
        }
    }

    // 3. API falhou? Tentar cache antigo mesmo expirado
    if (file_exists($cacheFile)) {
        $dados = json_decode(file_get_contents($cacheFile), true);
        if ($dados) return $dados;
    }

    return [['nome' => 'Combate', 'id' => 'combate', 'cat' => 'Esportes', 'logo' => '', 'embed' => '']];
}

$canais = listarCanaisApi();

$agrupado = [];
foreach ($canais as $ch) {
    $agrupado[$ch['cat']][] = $ch;
}

$canal = $_GET['c'] ?? ($canais[0]['id'] ?? 'combate');
$pg = $_GET['pg'] ?? 'canais';

// Multi-view: 1 a 4 canais simultaneos
$layout = max(1, min(4, (int)($_GET['v'] ?? 1)));
$slotsP = [];
for ($i = 0; $i < $layout; $i++) {
    $sc = $canais[$i] ?? $canais[0];
    if (!$sc) break;
    $slotsP[] = [
        'id' => $sc['id'],
        'nome' => $sc['nome'] ?? $sc['id'],
        'embed' => $sc['embed'] ?? '',
    ];
}

// Proxy de imagens (evita CORS/hotlink-block)
if (isset($_GET['img'])) {
    $url = base64_decode(str_replace(['-', '_'], ['+', '/'], $_GET['img']));
    if ($url && preg_match('/^https?:\/\/.+/i', $url)) {
        $ext = strtolower(pathinfo(parse_url($url, PHP_URL_PATH), PATHINFO_EXTENSION));
        $ctypes = ['jpg'=>'image/jpeg','jpeg'=>'image/jpeg','png'=>'image/png','gif'=>'image/gif','webp'=>'image/webp','svg'=>'image/svg+xml'];
        $ctype = $ctypes[$ext] ?? 'image/jpeg';
        $data = fetchUrl($url, [
            'timeout' => 8,
            'header' => "Referer: $origem\r\nAccept: image/*\r\n",
        ]);
        if ($data === false) { http_response_code(502); exit; }
        header("Content-Type: $ctype");
        header('Cache-Control: public, max-age=3600');
        echo $data;
    }
    exit;
}

// Proxy para a API do Rei dos Canais (evita CORS)
if (isset($_GET['api'])) {
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    $endpoint = preg_replace('/[^a-z0-9_\/?&=.\-]/i', '', $_GET['api']);
    $url = $apiBase . '/' . ltrim($endpoint, '/');
    $resp = fetchUrl($url, ['header' => "Accept: application/json\r\n"]);
    if ($resp === false) {
        http_response_code(502);
        echo '{"success":false,"error":"fetch_error"}';
    } else {
        echo $resp;
    }
    exit;
}
?>
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Player TV</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;background:#0a0a0a;color:#fff;font-family:Arial,sans-serif}
body{display:flex;flex-direction:column}

.header{display:flex;align-items:center;gap:10px;padding:8px 16px;background:#111;border-bottom:1px solid #222}
.header .logo{font-size:18px;font-weight:700;color:#00f3ff;white-space:nowrap}
.header nav{display:flex;gap:4px;margin-left:12px}
.header nav a{padding:6px 14px;border-radius:6px;text-decoration:none;color:#888;font-size:14px;transition:.15s}
.header nav a:hover,.header nav a.ativo{background:#1a1a1a;color:#fff}

.tabs{display:flex;gap:4px;padding:8px 16px;background:#111;border-bottom:1px solid #222;flex-wrap:wrap}
.tab{padding:6px 14px;border-radius:6px;background:#1a1a1a;color:#888;font-size:13px;cursor:pointer;border:1px solid #333;transition:.15s}
.tab:hover{color:#fff;border-color:#555}
.tab.ativo{background:#00f3ff;color:#000;border-color:#00f3ff;font-weight:600}

.wrapper{display:flex;flex:1;min-height:0}
.sidebar{width:320px;min-width:320px;background:#111;overflow-y:auto;border-right:1px solid #222;display:flex;flex-direction:column;transition:opacity .25s}
.sidebar.oculta{display:none}
.sidebar h2{padding:14px 12px 8px;font-size:13px;color:#00f3ff;text-transform:uppercase;letter-spacing:1px}
#busca{width:calc(100% - 16px);margin:8px;padding:8px 10px;border:1px solid #333;border-radius:6px;background:#1a1a1a;color:#fff;font-size:13px;outline:none}
#busca:focus{border-color:#00f3ff}
.cat{padding:6px 12px 3px;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.8px;margin-top:2px}
.sidebar a{display:flex;align-items:center;gap:10px;padding:8px 15px;font-size:22px;color:#eee;text-decoration:none;border-left:3px solid transparent;transition:.15s}
.sidebar a:hover,.sidebar a.ativo{background:#1a1a1a;color:#fff;border-left-color:#00f3ff}
.sidebar a img{width:26px;height:26px;border-radius:4px;object-fit:contain;background:#1a1a1a}
.sidebar a .ch-name{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.epg-now{display:block;padding:0;font-size:10px;color:#555;line-height:1.3;margin-top:1px}
.epg-now b{color:#aaa}
.escondido{display:none!important}
.content{flex:1;display:flex;flex-direction:column;background:#000;overflow:hidden;position:relative}
.player-frame{width:100%;flex:1;border:none}
.info{position:absolute;top:44px;left:14px;z-index:10;background:rgba(0,0,0,.7);padding:6px 12px;border-radius:6px;font-size:13px;color:#00f3ff;pointer-events:none}

.multibar{display:flex;align-items:center;gap:10px;padding:8px 16px;background:#111;border-bottom:1px solid #222;flex-shrink:0}
.multibar span{font-size:12px;color:#666;text-transform:uppercase;letter-spacing:.8px}
.multibar .lv{width:34px;height:34px;border-radius:6px;border:1px solid #333;background:#1a1a1a;color:#888;font-size:14px;cursor:pointer;transition:.15s}
.multibar .lv:hover{color:#fff;border-color:#555}
.multibar .lv.ativo{background:#00f3ff;color:#000;border-color:#00f3ff;font-weight:700}

.grid{flex:1;display:grid;gap:4px;padding:4px;min-height:0;overflow:hidden;grid-auto-rows:minmax(0,1fr)}
.grid.layout-1{grid-template-columns:1fr}
.grid.layout-2{grid-template-columns:repeat(2,1fr)}
.grid.layout-3{grid-template-columns:repeat(2,1fr)}
.grid.layout-3 .slot:first-child{grid-column:1/-1}
.grid.layout-4{grid-template-columns:repeat(2,1fr)}
.slot{position:relative;background:#000;min-height:0;border-radius:6px;overflow:hidden;border:2px solid #1f1f1f;cursor:pointer;transition:border-color .15s}
.slot.ativo{border-color:#00f3ff}
.slot:not(.ativo)::after{content:'';position:absolute;inset:0;z-index:4;cursor:pointer}
.slot iframe{width:100%;height:100%;border:none;display:block}
.slot .tag{position:absolute;top:6px;left:6px;display:flex;align-items:center;gap:8px;background:rgba(0,0,0,.75);padding:4px 10px;border-radius:6px;font-size:12px;color:#eee;z-index:5;pointer-events:none;max-width:calc(100% - 24px)}
.slot .tag .t-nome{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.slot .tag button{pointer-events:auto;background:none;border:none;color:#aaa;font-size:16px;line-height:1;cursor:pointer;padding:0 2px}
.slot .tag button:hover{color:#fff}
.grid.layout-1 .slot .tag button{display:none}

.agenda-wrap{padding:16px;overflow-y:auto;flex:1}
.agenda-search{width:100%;max-width:500px;margin:0 auto 16px;display:block}
.agenda-search input{width:100%;padding:10px 14px;border:1px solid #333;border-radius:8px;background:#1a1a1a;color:#fff;font-size:15px;outline:none}
.agenda-search input:focus{border-color:#00f3ff}

.eventos-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;max-width:1100px;margin:0 auto}
.evento{background:#141414;border:1px solid #222;border-radius:10px;overflow:hidden;cursor:pointer;transition:.2s;display:flex;flex-direction:column}
.evento:hover{border-color:#00f3ff;transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,243,255,.08)}
.evento .poster{height:150px;background:linear-gradient(135deg,#1a1a1a,#222);display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative}
.evento .poster::after{content:'';position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.55),transparent 45%);pointer-events:none}
.evento .poster img{width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .4s ease}
.evento .poster img.loaded{opacity:1}
.evento .poster img[src]{opacity:1}

.img-fallback{display:flex;align-items:center;justify-content:center;color:#333;opacity:.6}
.img-fallback.team{color:#555}
.img-fallback svg{filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))}

.evento .body{padding:10px 12px;flex:1;display:flex;flex-direction:column;gap:2px}
.evento .ev-title{font-size:15px;font-weight:600;line-height:1.3}
.evento .ev-comp{font-size:12px;color:#888;margin-top:2px}
.evento .ev-time{font-size:11px;color:#666;margin-top:auto;padding-top:4px;display:flex;align-items:center;gap:6px}
.evento .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase}
.badge-live{background:#e33;color:#fff;animation:pulse 1.5s infinite}
.badge-soon{background:#2a6;color:#fff}
.badge-done{background:#333;color:#888}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}

.evento .teams{display:flex;align-items:center;gap:6px;margin-top:6px}
.evento .team{display:flex;align-items:center;gap:6px;font-size:13px;min-width:0}
.evento .team span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.evento .team img,.evento .team .img-fallback{width:20px;height:20px;min-width:20px;border-radius:50%;overflow:hidden;background:#1a1a1a;display:flex;align-items:center;justify-content:center}
.evento .team .img-fallback{color:#444}
.evento .team .img-fallback svg{width:14px;height:14px}
.evento .team-logo-ph{display:inline-block;width:20px;height:20px;min-width:20px;border-radius:50%;background:#1a1a1a}
.evento .vs{color:#555;font-size:11px;flex-shrink:0}

.section-title{font-size:16px;font-weight:700;color:#00f3ff;margin:20px auto 10px;max-width:1100px;padding:0 4px;text-transform:uppercase;letter-spacing:.5px}
.section-title small{color:#666;font-weight:400;font-size:13px;margin-left:6px}

@media(max-width:768px){
 .wrapper{flex-direction:column}
 .sidebar{width:100%;min-width:0;max-height:35vh;border-right:none;border-bottom:1px solid #222}
 .header nav{margin-left:auto}
 .grid{overflow-y:auto;overflow-x:hidden;grid-auto-rows:auto;align-content:start}
 .grid .slot{aspect-ratio:16/9;min-height:100px;margin-bottom:2px}
 .grid.layout-1 .slot{aspect-ratio:16/9;min-height:0}
}
</style>
</head>
<body>
<div class="header">
  <span class="logo">TV Player</span>
  <nav>
    <a href="?pg=canais" class="<?= $pg === 'canais' ? 'ativo' : '' ?>">Canais</a>
    <a href="?pg=agenda" class="<?= $pg === 'agenda' ? 'ativo' : '' ?>">Agenda</a>
  </nav>
</div>

<?php if ($pg === 'agenda'): ?>
<!-- ====================== PÁGINA AGENDA ====================== -->
<div class="tabs" id="agendaTabs">
  <div class="tab ativo" data-filter="all">Todas</div>
  <div class="tab" data-filter="live">Ao vivo agora</div>
  <div class="tab" data-filter="upcoming">Em breve</div>
  <div class="tab" data-filter="finished">Encerrados</div>
</div>
<div class="agenda-wrap">
  <div class="agenda-search">
    <input id="agendaBusca" type="text" placeholder="Buscar evento, time ou competição...">
  </div>
  <div id="agendaContent">
    <p style="text-align:center;color:#555;padding:40px">Carregando agenda...</p>
  </div>
</div>

<script>
const API = '?api=';

async function carregarAgenda() {
  try {
    const resp = await fetch(API + 'sports');
    const json = await resp.json();
    if (!json.success || !json.data) {
      document.getElementById('agendaContent').innerHTML = '<p style="text-align:center;color:#f44;padding:40px">Falha ao carregar agenda</p>';
      return;
    }
    window.todosEventos = json.data;
    renderAgenda('all');
  } catch (e) {
    document.getElementById('agendaContent').innerHTML = '<p style="text-align:center;color:#f44;padding:40px">Erro: ' + e.message + '</p>';
  }
}

function fmtHora(ts) {
  const d = new Date(ts * 1000);
  const opts = { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' };
  return d.toLocaleString('pt-BR', opts);
}
function fmtData(ts) {
  const d = new Date(ts * 1000);
  const opts = { timeZone: 'America/Sao_Paulo', weekday: 'short', day: '2-digit', month: '2-digit' };
  return d.toLocaleString('pt-BR', opts).replace(',', '');
}

function badge(status) {
  if (status === 'live') return '<span class="badge badge-live">Ao vivo</span>';
  if (status === 'upcoming') return '<span class="badge badge-soon">Em breve</span>';
  return '<span class="badge badge-done">Encerrado</span>';
}

function proxyImg(url) {
  if (!url) return '';
  return '?img=' + btoa(url).replace(/[+/]/g, m => m === '+' ? '-' : '_').replace(/=+$/, '');
}

function imgFallback(el, kind = 'poster') {
  const wrap = el.parentNode;
  if (!wrap) return;
  const fb = document.createElement('div');
  fb.className = 'img-fallback ' + kind;
  fb.innerHTML = kind === 'team'
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>';
  el.replaceWith(fb);
}

function imgLoaded(el) { el.classList.add('loaded'); }

function eventoHtml(ev) {
  const home = ev.teams?.home, away = ev.teams?.away;
  const teams = (home || away)
    ? `<div class="teams">
         <div class="team">${home?.logo ? `<img src="${proxyImg(home.logo)}" loading="lazy" onload="imgLoaded(this)" onerror="imgFallback(this,'team')">` : '<span class="team-logo-ph"></span>'}<span>${home?.name || ''}</span></div>
         <span class="vs">x</span>
         <div class="team">${away?.logo ? `<img src="${proxyImg(away.logo)}" loading="lazy" onload="imgLoaded(this)" onerror="imgFallback(this,'team')">` : '<span class="team-logo-ph"></span>'}<span>${away?.name || ''}</span></div>
       </div>`
    : '';

  const poster = ev.poster
    ? `<div class="poster"><img src="${proxyImg(ev.poster)}" loading="lazy" onload="imgLoaded(this)" onerror="imgFallback(this)"></div>`
    : '<div class="poster"><div class="img-fallback"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg></div></div>';

  const competicao = ev.competition || ev.category || '';
  const horario = ev.status === 'live' ? 'Ao vivo' : `${fmtData(ev.start_timestamp)} · ${fmtHora(ev.start_timestamp)}`;

  const evUrl = (ev.embeds && ev.embeds[0] && ev.embeds[0].embed_url) || '';
  return `<div class="evento" data-status="${ev.status}" data-url="${evUrl}" data-title="${(ev.title + ' ' + competicao).toLowerCase()}">
    ${poster}
    <div class="body">
      <div class="ev-title">${ev.title}</div>
      ${competicao ? `<div class="ev-comp">${competicao}</div>` : ''}
      ${teams}
      <div class="ev-time">${badge(ev.status)} ${horario}</div>
    </div>
  </div>`;
}

function renderAgenda(filtro) {
  const busca = document.getElementById('agendaBusca').value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let eventos = window.todosEventos || [];
  if (filtro !== 'all') eventos = eventos.filter(e => e.status === filtro);
  if (busca) eventos = eventos.filter(e => e.title.toLowerCase().includes(busca) || (e.competition || '').toLowerCase().includes(busca));

  const live = eventos.filter(e => e.status === 'live');
  const soon = eventos.filter(e => e.status === 'upcoming');
  const done = eventos.filter(e => e.status === 'finished');

  let html = '';
  if (live.length) {
    html += `<div class="section-title">Ao vivo agora <small>(${live.length})</small></div><div class="eventos-grid">`;
    html += live.map(eventoHtml).join('');
    html += `</div>`;
  }
  if (soon.length) {
    html += `<div class="section-title">Em breve <small>(${soon.length})</small></div><div class="eventos-grid">`;
    html += soon.map(eventoHtml).join('');
    html += `</div>`;
  }
  if (done.length && filtro !== 'finished') {
    html += `<div class="section-title">Encerrados <small>(${done.length})</small></div><div class="eventos-grid">`;
    html += done.slice(0, 10).map(eventoHtml).join('');
    html += `</div>`;
  } else if (done.length && filtro === 'finished') {
    html += `<div class="section-title">Encerrados <small>(${done.length})</small></div><div class="eventos-grid">`;
    html += done.map(eventoHtml).join('');
    html += `</div>`;
  }
  if (!html) html = '<p style="text-align:center;color:#555;padding:40px">Nenhum evento encontrado</p>';

  document.getElementById('agendaContent').innerHTML = html;
}

document.querySelectorAll('#agendaTabs .tab').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('#agendaTabs .tab').forEach(x => x.classList.remove('ativo'));
    t.classList.add('ativo');
    renderAgenda(t.dataset.filter);
  });
});

document.getElementById('agendaBusca').addEventListener('input', () => {
  const filtro = document.querySelector('#agendaTabs .tab.ativo')?.dataset.filter || 'all';
  renderAgenda(filtro);
});

carregarAgenda();
setInterval(carregarAgenda, 300000);

document.getElementById('agendaContent').addEventListener('click', e => {
  const el = e.target.closest('.evento');
  if (!el) return;
  const status = el.dataset.status;
  if (status !== 'live' && status !== 'upcoming') return;
  const url = el.dataset.url;
  if (!url) { alert('Este evento não possui link disponível'); return; }
  window.open(url, '_blank', 'width=960,height=540,menubar=no,toolbar=no,location=no');
});

</script>

<?php else: ?>
<!-- ====================== PÁGINA CANAIS ====================== -->
<div class="wrapper">
  <div class="sidebar">
    <h2>Canais</h2>
    <input id="busca" type="text" placeholder="Pesquisar..." oninput="filtrar(this.value)">
    <div id="listaCanais">
    <?php foreach ($agrupado as $cat => $lista): ?>
      <div class="cat"><?= htmlspecialchars($cat) ?></div>
      <?php foreach ($lista as $ch): ?>
      <a href="?c=<?= rawurlencode($ch['id']) ?>" data-nome="<?= htmlspecialchars(strtolower($ch['nome'])) ?>" data-id="<?= htmlspecialchars($ch['id']) ?>" data-embed="<?= htmlspecialchars($ch['embed'] ?? '') ?>" <?= $ch['id'] === $canal ? 'class="ativo"' : '' ?>>
        <?php if (!empty($ch['logo'])): ?>
          <img src="<?= htmlspecialchars($ch['logo']) ?>" alt="" loading="lazy" onerror="this.style.display='none'">
        <?php endif; ?>
        <span class="ch-name">
          <?= htmlspecialchars($ch['nome']) ?>
          <span class="epg-now" data-epg="<?= htmlspecialchars($ch['id']) ?>"></span>
        </span>
      </a>
      <?php endforeach; ?>
    <?php endforeach; ?>
    </div>
  </div>
  <div class="content">
    <div class="multibar">
      <span>Multi-view</span>
      <button class="lv<?= $layout === 1 ? ' ativo' : '' ?>" data-layout="1" title="1 canal">1</button>
      <button class="lv<?= $layout === 2 ? ' ativo' : '' ?>" data-layout="2" title="2 canais">2</button>
      <button class="lv<?= $layout === 3 ? ' ativo' : '' ?>" data-layout="3" title="3 canais">3</button>
      <button class="lv<?= $layout === 4 ? ' ativo' : '' ?>" data-layout="4" title="4 canais">4</button>
    </div>
    <div class="info" id="infoAtual"><?= htmlspecialchars($slotsP[0]['nome'] ?? '') ?></div>
    <div class="grid layout-<?= $layout ?>" id="gridPlayers">
      <?php foreach ($slotsP as $i => $sc): ?>
      <div class="slot<?= $i === 0 ? ' ativo' : '' ?>" data-id="<?= htmlspecialchars($sc['id']) ?>" data-nome="<?= htmlspecialchars($sc['nome']) ?>" data-embed="<?= htmlspecialchars($sc['embed']) ?>">
        <iframe src="<?= htmlspecialchars($sc['embed']) ?>" allowfullscreen allow="autoplay; fullscreen; encrypted-media" frameborder="0"></iframe>
        <div class="tag"><span class="t-nome"><?= htmlspecialchars($sc['nome']) ?></span><button class="t-fechar" title="Fechar">&times;</button></div>
      </div>
      <?php endforeach; ?>
    </div>
  </div>
</div>

<script>
const CANAIS = <?= json_encode($canais, JSON_UNESCAPED_UNICODE) ?>;
const gridEl = document.getElementById('gridPlayers');
const infoEl = document.getElementById('infoAtual');
let slots = Array.from(gridEl.querySelectorAll('.slot')).map(el => ({ id: el.dataset.id, nome: el.dataset.nome, embed: el.dataset.embed }));
let ativo = 0;

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function marcarLayout() {
  document.querySelectorAll('.multibar .lv').forEach(b => b.classList.toggle('ativo', +b.dataset.layout === slots.length));
}

function render() {
  gridEl.className = 'grid layout-' + slots.length;
  gridEl.innerHTML = slots.map((s, i) =>
    `<div class="slot${i === ativo ? ' ativo' : ''}" data-id="${esc(s.id)}" data-nome="${esc(s.nome)}" data-embed="${esc(s.embed)}">
       <iframe src="${esc(s.embed)}" allowfullscreen allow="autoplay; fullscreen; encrypted-media" frameborder="0"></iframe>
       <div class="tag"><span class="t-nome">${esc(s.nome)}</span><button class="t-fechar" title="Fechar">&times;</button></div>
     </div>`).join('');
  marcarLayout();
  const s = slots[ativo];
  if (s) infoEl.textContent = s.nome;
}

function setLayout(n) {
  n = Math.max(1, Math.min(4, n | 0));
  while (slots.length < n) slots.push({ ...slots[ativo] });
  slots.length = n;
  if (ativo >= n) ativo = n - 1;
  render();
  syncUrl();
}

function setCanalAtivo(id) {
  const ch = CANAIS.find(c => c.id === id);
  if (!ch || !slots[ativo]) return;
  slots[ativo] = { id: ch.id, nome: ch.nome || ch.id, embed: ch.embed || '' };
  const el = gridEl.querySelectorAll('.slot')[ativo];
  if (el) {
    const f = el.querySelector('iframe');
    if (f) f.src = slots[ativo].embed;
    el.dataset.id = slots[ativo].id;
    el.dataset.nome = slots[ativo].nome;
    const t = el.querySelector('.t-nome');
    if (t) t.textContent = slots[ativo].nome;
  }
  infoEl.textContent = slots[ativo].nome;
  syncUrl();
}

function syncUrl() {
  const s = slots[ativo];
  try {
    history.replaceState(null, '', '?v=' + slots.length + (s ? '&c=' + encodeURIComponent(s.id) : ''));
  } catch (e) {}
}

gridEl.addEventListener('click', e => {
  const fr = e.target.closest('.t-fechar');
  if (fr) {
    if (slots.length > 1) {
      slots.splice(ativo, 1);
      if (ativo >= slots.length) ativo = slots.length - 1;
      render();
      syncUrl();
    }
    return;
  }
  const sl = e.target.closest('.slot');
  if (sl) {
    ativo = Array.from(gridEl.querySelectorAll('.slot')).indexOf(sl);
    gridEl.querySelectorAll('.slot').forEach(x => x.classList.toggle('ativo', x === sl));
    infoEl.textContent = sl.dataset.nome;
  }
});

document.querySelectorAll('.multibar .lv').forEach(b => b.addEventListener('click', () => setLayout(b.dataset.layout)));

document.getElementById('listaCanais').addEventListener('click', e => {
  const a = e.target.closest('a');
  if (!a) return;
  e.preventDefault();
  setCanalAtivo(a.dataset.id);
});

function filtrar(val) {
  val = val.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  document.querySelectorAll('#listaCanais a').forEach(a => {
    a.classList.toggle('escondido', !a.dataset.nome.includes(val));
  });
  document.querySelectorAll('#listaCanais .cat').forEach(c => {
    let el = c.nextElementSibling, any = false;
    while (el && el.tagName === 'A') { if (!el.classList.contains('escondido')) any = true; el = el.nextElementSibling; }
    c.classList.toggle('escondido', !any);
  });
}

// Carrega EPG (programação atual) da API do Rei dos Canais
(async function carregarEPG() {
  try {
    const resp = await fetch('?api=channels');
    const json = await resp.json();
    if (!json.success || !json.data) return;
    const epgMap = {};
    json.data.forEach(ch => {
      if (ch.epg && ch.epg.current) {
        epgMap[ch.id.toLowerCase()] = ch.epg.current.title;
      }
    });
    document.querySelectorAll('[data-epg]').forEach(el => {
      const titulo = epgMap[el.dataset.epg.toLowerCase()];
      if (titulo) {
        const span = el.querySelector('.epg-now');
        if (span) span.innerHTML = '<b>Agora:</b> ' + titulo.substring(0, 50);
      }
    });
  } catch(e) {}
})();

// Atualizar cache em background (nao bloqueia a pagina)
(async function refreshCache() {
  try {
    await fetch('?refresh=1');
  } catch(e) {}
})();

// Esconder a lista de canais apos 4s sem interacao (mouse/teclado/touch)
let timerOcultar = null;
function agendarOcultar() {
  clearTimeout(timerOcultar);
  timerOcultar = setTimeout(() => {
    const sb = document.querySelector('.sidebar');
    if (sb) sb.classList.add('oculta');
  }, 4000);
}
function mostrarSidebar() {
  const sb = document.querySelector('.sidebar');
  if (sb) sb.classList.remove('oculta');
}
['mousemove', 'keydown', 'touchstart', 'click', 'wheel'].forEach(ev => {
  document.addEventListener(ev, () => {
    mostrarSidebar();
    agendarOcultar();
  });
});
agendarOcultar();
</script>
<?php endif; ?>

</body>
</html>
