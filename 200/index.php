<?php
$cacheFile = __DIR__ . '/canais_cache.json';
$origem = 'https://1.embedcanaisdetv.com/';
$expira = 3600;

function extrairCanais($html) {
    $canais = [];
    $catAtual = 'Geral';

    // Extrai categorias (H2) e cards
    // Cada card tem: <div class="card"> ... <div class="title">NOME</div> ... <input value='...canal=ID...'>
    // Categorias são <h2>texto</h2> antes dos cards

    // Primeiro, encontra todos H2s e seus textos
    preg_match_all('/<h2[^>]*>([\s\S]*?)<\/h2>/i', $html, $h2s);
    // Extrai posições dos H2
    $h2Pos = [];
    $lastPos = 0;
    while (($pos = strpos($html, '<h2', $lastPos)) !== false) {
        $end = strpos($html, '</h2>', $pos);
        if ($end === false) break;
        $content = strip_tags(substr($html, $pos, $end - $pos + 5));
        $content = trim(str_replace(['</h2>', '<h2>'], '', $content));
        // Remove atributos style etc
        $content = preg_replace('/<h2[^>]*>/i', '', $content);
        $content = trim(strip_tags($content));
        $h2Pos[] = ['pos' => $pos, 'cat' => $content];
        $lastPos = $end + 5;
    }

    // Extrai todos os cards com suas posições
    $cardPattern = '/<div\s+class="card"[^>]*>.*?<div\s+class="title">([\s\S]*?)<\/div>.*?<input[^>]*value=\'(?:.*?canal=([a-z0-9_]+)[^\']*)\'[^>]*\/>.*?<\/div>\s*<\/div>/si';
    preg_match_all($cardPattern, $html, $cards, PREG_SET_ORDER);

    $catIdx = 0;
    foreach ($cards as $card) {
        $nome = trim(strip_tags($card[1]));
        $id = $card[2];
        if (empty($nome) || empty($id)) continue;

        // Determina categoria baseada na posição aproximada
        // Pega a posição deste card no HTML
        $cardFull = $card[0];
        $cardPos = strpos($html, $cardFull);
        $cat = 'Geral';
        foreach ($h2Pos as $h) {
            if ($h['pos'] < $cardPos) $cat = $h['cat'];
        }

        $canais[] = ['nome' => $nome, 'id' => $id, 'cat' => $cat];
    }

    return $canais;
}

function listarCanais() {
    global $cacheFile, $expira, $origem;

    // Tenta cache
    if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < $expira) {
        $dados = json_decode(file_get_contents($cacheFile), true);
        if ($dados) return $dados;
    }

    // Baixa página
    $ctx = stream_context_create(['http' => [
        'timeout' => 10,
        'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    ]]);
    $html = @file_get_contents($origem, false, $ctx);

    if ($html) {
        $canais = extrairCanais($html);
        if (!empty($canais)) {
            file_put_contents($cacheFile, json_encode($canais));
            return $canais;
        }
    }

    // Fallback: busca no cache antigo mesmo que expirado
    if (file_exists($cacheFile)) {
        $dados = json_decode(file_get_contents($cacheFile), true);
        if ($dados) return $dados;
    }

    // Fallback hardcoded mínimo
    return [
        ['nome' => 'Combate', 'id' => 'combate', 'cat' => 'Esportes'],
    ];
}

$canais = listarCanais();

// Agrupa por categoria
$agrupado = [];
foreach ($canais as $ch) {
    $agrupado[$ch['cat']][] = $ch;
}

$canal = $_GET['c'] ?? ($canais[0]['id'] ?? 'combate');
$cdn = '1007.cdn10embed.xyz';

// Proxy
if (isset($_GET['f'])) {
    $base = "https://$cdn/$canal";
    $ref = "https://13embeddecanais.xyz/$canal/";
    $url = $base . '/' . $_GET['f'];
    $ctx = stream_context_create(['http' => ['header' => "Referer: $ref\r\n", 'timeout' => 10]]);
    $data = @file_get_contents($url, false, $ctx);
    if ($data === false) { http_response_code(502); exit; }
    $ext = pathinfo($_GET['f'], PATHINFO_EXTENSION);
    if (in_array($ext, ['m3u8', 'm3u'])) {
        header('Content-Type: application/vnd.apple.mpegurl');
        foreach (explode("\n", $data) as $line) {
            $t = trim($line);
            if (preg_match('/^(#EXT-X-MAP:URI=")([^"]+)(".*)?$/i', $t, $m))
                echo $m[1] . '?c=' . rawurlencode($canal) . '&f=' . rawurlencode($m[2]) . ($m[3] ?? '') . "\n";
            elseif (preg_match('/^([a-zA-Z0-9_.-]+\.(mp4|m4s|ts|m3u8))$/', $t, $m))
                echo '?c=' . rawurlencode($canal) . '&f=' . rawurlencode($m[1]) . "\n";
            else
                echo $line . "\n";
        }
    } else {
        $ctype = in_array($ext, ['mp4','m4s','ts']) ? 'video/mp4' : 'application/octet-stream';
        header("Content-Type: $ctype");
        header('Content-Length: ' . strlen($data));
        echo $data;
    }
    exit;
}
?>
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= htmlspecialchars($canal) ?> - Player</title>
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;background:#0a0a0a;color:#fff;font-family:Arial,sans-serif}
body{display:flex;flex-direction:column}
.wrapper{display:flex;flex:1;min-height:0}
#ad-bottom{flex-shrink:0;background:#0a0a0a;display:flex;justify-content:center;align-items:center;padding:2px 0}
.sidebar{width:250px;min-width:250px;background:#111;overflow-y:auto;border-right:1px solid #222;display:flex;flex-direction:column}
.sidebar h2{padding:14px 12px 8px;font-size:13px;color:#00f3ff;text-transform:uppercase;letter-spacing:1px}
#busca{width:calc(100% - 16px);margin:8px;padding:8px 10px;border:1px solid #333;border-radius:6px;background:#1a1a1a;color:#fff;font-size:13px;outline:none}
#busca:focus{border-color:#00f3ff}
.cat{padding:6px 12px 3px;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.8px;margin-top:2px}
.sidebar a{display:block;padding:5px 15px;font-size:19px;color:#ccc;text-decoration:none;border-left:3px solid transparent;transition:.15s}
.sidebar a:hover,.sidebar a.ativo{background:#1a1a1a;color:#fff;border-left-color:#00f3ff}
.escondido{display:none!important}
.content{flex:1;display:flex;flex-direction:column;background:#000}
.video-wrap{flex:1;display:flex;align-items:center;justify-content:center;position:relative}
video{width:100%;max-width:100%;max-height:100vh;display:block;outline:none}
.info{position:absolute;top:14px;left:14px;z-index:10;background:rgba(0,0,0,.7);padding:6px 12px;border-radius:6px;font-size:13px;color:#00f3ff;pointer-events:none}
@media(max-width:768px){
.wrapper{flex-direction:column}
.sidebar{width:100%;min-width:0;max-height:35vh;border-right:none;border-bottom:1px solid #222}
#ad-bottom iframe{max-width:100%}
}
</style>
</head>
<body>
<div class="wrapper">
<div class="sidebar">
<h2>Canais</h2>
<input id="busca" type="text" placeholder="Pesquisar..." oninput="filtrar(this.value)">
<div id="listaCanais">
<?php foreach ($agrupado as $cat => $lista): ?>
<div class="cat"><?= htmlspecialchars($cat) ?></div>
<?php foreach ($lista as $ch): ?>
<a href="?c=<?= rawurlencode($ch['id']) ?>" data-nome="<?= htmlspecialchars(strtolower($ch['nome'])) ?>"<?= $ch['id'] === $canal ? ' class="ativo"' : '' ?>><?= htmlspecialchars($ch['nome']) ?></a>
<?php endforeach; ?>
<?php endforeach; ?>
</div>
</div>
<div class="content">
<div class="video-wrap">
<div class="info"><?= htmlspecialchars($canal) ?></div>
<video id="v" controls autoplay playsinline></video>
</div>
</div>
</div>
<div id="ad-bottom"></div>
<script>
const src = '?c=<?= rawurlencode($canal) ?>&f=index.m3u8';

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

if (Hls.isSupported()) {
  const hls = new Hls({ enableWorker: true });
  hls.loadSource(src);
  hls.attachMedia(document.getElementById('v'));
  hls.on(Hls.Events.ERROR, (e, d) => {
    if (d.fatal) { hls.destroy();
      document.querySelector('.video-wrap').innerHTML += '<p style="color:#f44;padding:20px">Erro: '+d.details+'</p>'; }
  });
} else if (document.getElementById('v').canPlayType('application/vnd.apple.mpegurl')) {
  document.getElementById('v').src = src;
} else {
  document.querySelector('.video-wrap').innerHTML = '<p style="color:#f44;padding:20px">HLS não suportado</p>';
}

const adDiv = document.getElementById("ad-bottom");
if (adDiv) {
  atOptions = {
    'key' : '23a140354590022c1f365a94907191a0',
    'format' : 'iframe',
    'height' : 50,
    'width' : 320,
    'params' : {}
  };
  const s = document.createElement("script");
  s.src = "https://www.highperformanceformat.com/23a140354590022c1f365a94907191a0/invoke.js";
  adDiv.appendChild(s);
}
</script>
</body>
</html>
