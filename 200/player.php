<?php
$canais = [
    'Esportes' => [
        ['Amazon Prime', 'amazonprimevideo'],
        ['Amazon Prime 02', 'amazonprimevideo02'],
        ['Amazon Prime 03', 'amazonprimevideo03'],
        ['Amazon Prime 04', 'amazonprimevideo04'],
        ['Amazon Prime 05', 'amazonprimevideo05'],
        ['Apple TV 01', 'appletv01'],
        ['Apple TV 02', 'appletv02'],
        ['Band Sports', 'bandsports'],
        ['Canal Off', 'canaloff'],
        ['CazéTV', 'cazetv'],
        ['Combate', 'combate'],
        ['DAZN', 'dazn'],
        ['Disney+', 'disneyplus'],
        ['Disney+ 02', 'disneyplus02'],
        ['Disney+ 03', 'disneyplus03'],
        ['Disney+ 04', 'disneyplus04'],
        ['Disney+ 05', 'disneyplus05'],
        ['Disney+ 06', 'disneyplus06'],
        ['ESPN', 'espn'],
        ['ESPN 2', 'espn2'],
        ['ESPN 3', 'espn3'],
        ['ESPN 4', 'espn4'],
        ['ESPN 5', 'espn5'],
        ['ESPN 6', 'espn6'],
        ['GE TV', 'getv'],
        ['Max', 'max'],
        ['Max 02', 'max02'],
        ['Max 03', 'max03'],
        ['Max 04', 'max04'],
        ['Max 05', 'max05'],
        ['Max 06', 'max06'],
        ['Nosso Futebol', 'nossofutebol'],
        ['N Sports', 'nsports'],
        ['Paramount+', 'paramountplus'],
        ['Paramount+ 02', 'paramountplus02'],
        ['Premiere Clubes', 'premiereclubes'],
        ['Premiere 2', 'premiere2'],
        ['Premiere 3', 'premiere3'],
        ['Premiere 4', 'premiere4'],
        ['Premiere 5', 'premiere5'],
        ['Premiere 6', 'premiere6'],
        ['Premiere 7', 'premiere7'],
        ['Premiere 8', 'premiere8'],
        ['SporTV', 'sportv'],
        ['SporTV 2', 'sportv2'],
        ['SporTV 3', 'sportv3'],
        ['TNT', 'tnt'],
        ['Xsports', 'xsports'],
    ],
    'Reality Show' => [
        ['Casa do Patrão 01', 'casadopatrao01'],
        ['Casa do Patrão 02', 'casadopatrao02'],
        ['Casa do Patrão 03', 'casadopatrao03'],
        ['Casa do Patrão 04', 'casadopatrao04'],
        ['Casa do Patrão 05', 'casadopatrao05'],
        ['Casa do Patrão 06', 'casadopatrao06'],
        ['Casa do Patrão 07', 'casadopatrao07'],
        ['Casa do Patrão 08', 'casadopatrao08'],
    ],
    'Filmes e Séries' => [
        ['A&E', 'aee'],
        ['AMC', 'amc'],
        ['AXN', 'axn'],
        ['Cinemax', 'cinemax'],
        ['Globoplay Novelas', 'globoplaynovelas'],
        ['HBO', 'hbo'],
        ['HBO 2', 'hbo2'],
        ['HBO Family', 'hbofamily'],
        ['HBO Mundi', 'hbomundi'],
        ['HBO Plus', 'hboplus'],
        ['HBO Pop', 'hbopop'],
        ['HBO Signature', 'hbosignature'],
        ['HBO Xtreme', 'hboxtreme'],
        ['Megapix', 'megapix'],
        ['Paramount Network', 'paramountnetwork'],
        ['Sony Channel', 'sonychannel'],
        ['Space', 'space'],
        ['Studio Universal', 'studiouniversal'],
        ['Telecine Action', 'tcaction'],
        ['Telecine Cult', 'tccult'],
        ['Telecine Fun', 'tcfun'],
        ['Telecine Pipoca', 'tcpipoca'],
        ['Telecine Premium', 'tcpremium'],
        ['Telecine Touch', 'tctouch'],
        ['TNT Novelas', 'tntnovelas'],
        ['TNT Series', 'tntseries'],
        ['Universal TV', 'universaltv'],
        ['Warner Channel', 'warner'],
    ],
    'Canais Abertos' => [
        ['Band SP', 'bandsp'],
        ['Globo DF', 'globodf'],
        ['Globo ES', 'globoes'],
        ['Globo MG', 'globomg'],
        ['Globo RJ', 'glorj'],
        ['Globo RS', 'globors'],
        ['Globo SP', 'globosp'],
        ['Record DF', 'recorddf'],
        ['Record ES', 'recordes'],
        ['Record MG', 'recordmg'],
        ['Record RJ', 'recordrj'],
        ['Record SP', 'recordsp'],
        ['RedeTV!', 'redetv'],
        ['SBT RJ', 'sbtrj'],
        ['SBT SP', 'sbtsp'],
        ['TV Cultura', 'tvcultura'],
    ],
    'Variedades' => [
        ['Adult Swim', 'adultswim'],
        ['Animal Planet', 'animalplanet'],
        ['Comedy Central', 'comedycentral'],
        ['Discovery Channel', 'discoverychannel'],
        ['Discovery Home & Health', 'discoveryhh'],
        ['Investigation Discovery', 'discoveryid'],
        ['Discovery Science', 'discoveryscience'],
        ['Discovery Theater', 'discoverytheater'],
        ['Discovery Turbo', 'discoveryturbo'],
        ['Discovery World', 'discoveryworld'],
        ['Food Network', 'foodnetwork'],
        ['GNT', 'gnt'],
        ['HGTV', 'hgtv'],
        ['History', 'history'],
        ['History 2', 'history2'],
        ['MTV', 'mtv'],
        ['Multishow', 'multishow'],
    ],
    'Notícias' => [
        ['BandNews', 'bandnews'],
        ['CNN Brasil', 'cnnbrasil'],
        ['GloboNews', 'globonews'],
        ['Jovem Pan News', 'jovempannews'],
        ['Record News', 'recordnews'],
    ],
    'Infantil' => [
        ['Cartoonito', 'cartoonito'],
        ['Cartoon Network', 'cartoonnetwork'],
        ['Discovery Kids', 'discoverykids'],
        ['DreamWorks', 'dreamworks'],
        ['Gloob', 'gloob'],
        ['Gloobinho', 'gloobinho'],
        ['Nickelodeon', 'nickelodeon'],
        ['Nick Jr.', 'nickjr'],
        ['Tooncast', 'tooncast'],
    ],
];

$canal = $_GET['c'] ?? 'combate';
$cdn = '1007.cdn10embed.xyz';

if (isset($_GET['f']) && $canal) {
    $base = "https://$cdn/$canal";
    $ref = "https://13embeddecanais.xyz/$canal/";
    $url = $base . '/' . $_GET['f'];
    $ctx = stream_context_create(['http' => ['header' => "Referer: $ref\r\n"]]);
    $data = file_get_contents($url, false, $ctx);
    if ($data === false) { http_response_code(502); exit; }
    $ext = pathinfo($_GET['f'], PATHINFO_EXTENSION);
    if (in_array($ext, ['m3u8', 'm3u'])) {
        header('Content-Type: application/vnd.apple.mpegurl');
        foreach (explode("\n", $data) as $line) {
            $t = trim($line);
            if (preg_match('/^(#EXT-X-MAP:URI=")([^"]+)(".*)?$/i', $t, $m))
                echo $m[1] . 'player.php?c=' . rawurlencode($canal) . '&f=' . rawurlencode($m[2]) . ($m[3] ?? '') . "\n";
            elseif (preg_match('/^([a-zA-Z0-9_.-]+\.(mp4|m4s|ts|m3u8))$/', $t, $m))
                echo 'player.php?c=' . rawurlencode($canal) . '&f=' . rawurlencode($m[1]) . "\n";
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
.wrapper{display:flex;height:100%}
.sidebar{width:260px;min-width:260px;background:#111;overflow-y:auto;border-right:1px solid #222;display:flex;flex-direction:column}
.sidebar h2{padding:14px 12px 8px;font-size:13px;color:#00f3ff;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #222}
.sidebar .cat{padding:6px 12px;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.8px;margin-top:4px}
.sidebar a{display:block;padding:7px 12px;font-size:13px;color:#ccc;text-decoration:none;border-left:3px solid transparent;transition:.15s}
.sidebar a:hover,.sidebar a.ativo{background:#1a1a1a;color:#fff;border-left-color:#00f3ff}
.content{flex:1;display:flex;flex-direction:column;background:#000}
.video-wrap{flex:1;display:flex;align-items:center;justify-content:center;position:relative}
video{width:100%;max-width:100%;max-height:100vh;display:block;outline:none}
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
<a href="?c=<?= rawurlencode($ch[1]) ?>"<?= $ch[1] === $canal ? ' class="ativo"' : '' ?>><?= htmlspecialchars($ch[0]) ?></a>
<?php endforeach; ?>
<?php endforeach; ?>
</div>
<div class="content">
<div class="video-wrap">
<div class="info"><?= htmlspecialchars($canal) ?></div>
<video id="v" controls autoplay playsinline></video>
</div>
</div>
</div>
<script>
const canal = <?= json_encode($canal) ?>;
const src = 'player.php?c=' + encodeURIComponent(canal) + '&f=index.m3u8';

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
</script>
</body>
</html>
