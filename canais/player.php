<?php
$apiBase = 'https://api.reidoscanais.st';

// Funcao helper: buscar URL com SSL bypass
function fetchUrl($url, $options = []) {
    $defaults = [
        'timeout' => 15,
        'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    ];
    $opts = array_merge($defaults, $options);

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
    $data = @file_get_contents($url, false, $ctx);
    if ($data !== false) return $data;

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        $curlOpts = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $opts['timeout'],
            CURLOPT_USERAGENT => $opts['user_agent'],
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
        ];
        if (isset($opts['header'])) {
            $curlOpts[CURLOPT_HTTPHEADER] = explode("\r\n", trim($opts['header']));
        }
        curl_setopt_array($ch, $curlOpts);
        $data = curl_exec($ch);
        curl_close($ch);
        return $data;
    }
    return false;
}

// Buscar canais da API
$canais = [];
$resp = fetchUrl("$apiBase/channels");
if ($resp) {
    $json = json_decode($resp, true);
    if (isset($json['success']) && $json['success'] && !empty($json['data'])) {
        $agrupado = [];
        foreach ($json['data'] as $ch) {
            $cat = $ch['category'] ?? 'Geral';
            $embedUrl = $ch['embeds'][0]['embed_url'] ?? '';
            $agrupado[$cat][] = [
                'nome' => $ch['name'] ?? $ch['id'],
                'id' => $ch['id'],
                'embed' => $embedUrl,
            ];
        }
        $canais = $agrupado;
    }
}

// Fallback se API falhar
if (empty($canais)) {
    $canais = [
        'Esportes' => [
            ['nome' => 'Combate', 'id' => 'combate', 'embed' => ''],
            ['nome' => 'ESPN', 'id' => 'espn', 'embed' => ''],
            ['nome' => 'SporTV', 'id' => 'sportv', 'embed' => ''],
        ],
    ];
}

$canal = $_GET['c'] ?? 'combate';

// Buscar embed URL do canal
$embedUrl = '';
foreach ($canais as $cat => $lista) {
    foreach ($lista as $ch) {
        if ($ch['id'] === $canal) {
            $embedUrl = $ch['embed'];
            break 2;
        }
    }
}
?>
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= htmlspecialchars($canal) ?> - Player</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;background:#0a0a0a;color:#fff;font-family:Arial,sans-serif}
.wrapper{display:flex;height:100%}
.sidebar{width:260px;min-width:260px;background:#111;overflow-y:auto;border-right:1px solid #222;display:flex;flex-direction:column}
.sidebar h2{padding:14px 12px 8px;font-size:13px;color:#00f3ff;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #222}
.sidebar .cat{padding:6px 12px;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.8px;margin-top:4px}
.sidebar a{display:block;padding:7px 12px;font-size:13px;color:#ccc;text-decoration:none;border-left:3px solid transparent;transition:.15s}
.sidebar a:hover,.sidebar a.ativo{background:#1a1a1a;color:#fff;border-left-color:#00f3ff}
.content{flex:1;display:flex;flex-direction:column;background:#000;overflow:hidden}
.player-frame{width:100%;flex:1;border:none}
.info{position:absolute;top:14px;left:14px;z-index:10;background:rgba(0,0,0,.7);padding:6px 12px;border-radius:6px;font-size:13px;color:#00f3ff;pointer-events:none}
@media(max-width:768px){
.wrapper{flex-direction:column}
.sidebar{width:100%;min-width:0;max-height:40vh;border-right:none;border-bottom:1px solid #222}
}
</style>
</head>
<body>
<div class="wrapper">
<div class="sidebar">
<h2>📺 Canais</h2>
<?php foreach ($canais as $cat => $lista): ?>
<div class="cat"><?= htmlspecialchars($cat) ?></div>
<?php foreach ($lista as $ch): ?>
<a href="?c=<?= rawurlencode($ch['id']) ?>"<?= $ch['id'] === $canal ? ' class="ativo"' : '' ?>><?= htmlspecialchars($ch['nome']) ?></a>
<?php endforeach; ?>
<?php endforeach; ?>
</div>
<div class="content">
<div class="info"><?= htmlspecialchars($canal) ?></div>
<?php if ($embedUrl): ?>
  <iframe class="player-frame" src="<?= htmlspecialchars($embedUrl) ?>" allowfullscreen allow="autoplay; fullscreen; encrypted-media" frameborder="0"></iframe>
<?php else: ?>
  <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#555">
    <p>Canal não disponível</p>
  </div>
<?php endif; ?>
</div>
</div>
</body>
</html>
