# Guia: GitHub + Vercel — Fluxo de Trabalho

## Visão Geral

```
[Você edita localmente] → git push → [GitHub] → Vercel detecta → build + deploy automático
```

Qualquer alteração enviada para o GitHub (`main`) aciona automaticamente um novo deploy na Vercel.

---

## 1. Credenciais

### GitHub
- **Email:** grupoting@gmail.com
- **Repositório:** https://github.com/ting560/zapstream
- **Token:** usar o token salvo na URL remota do git (ver com `git remote -v`)

### Vercel
- **Projeto:** https://vercel.com/marcosmdc545s-projects/zapstream
- **Token:** gerar em https://vercel.com/account/tokens (já foi usado: `vcp_...Kty`)
- **Domínio:** https://zapstream-three.vercel.app

---

## 2. Fluxo para Fazer Alterações

### A) Pelo terminal (recomendado)

```bash
# 1. Verificar o estado atual
git status

# 2. Ver as últimas alterações
git log --oneline -5

# 3. Fazer alterações nos arquivos...

# 4. Adicionar e commitar
git add -A
git commit -m "Descrição clara do que foi alterado"

# 5. Enviar para o GitHub (já aciona deploy automático na Vercel)
git push
```

Após o `git push`, aguarde ~1-2 minutos e o site estará atualizado em:
https://zapstream-three.vercel.app

### B) Verificar se o deploy funcionou

```powershell
# Ver status do deploy (coloque SEU token Vercel)
$token = "SEU_TOKEN_VERCEL"
$headers = @{ Authorization = "Bearer $token" }
$deployments = Invoke-RestMethod -Uri "https://api.vercel.com/v1/deployments?projectId=prj_QfW4j9O8OII9cldFxmmhPFxfQivP&limit=3" -Headers $headers
$deployments.deployments | ForEach-Object { Write-Output "$($_.uid) - $($_.readyState)" }
```

O campo `readyState` mostrará:
- `BUILDING` — está construindo
- `READY` — deploy concluído
- `ERROR` — falhou

```powershell
# Ver logs do último deploy
$token = "SEU_TOKEN_VERCEL"
$headers = @{ Authorization = "Bearer $token" }
$depId = (Invoke-RestMethod -Uri "https://api.vercel.com/v1/deployments?projectId=prj_QfW4j9O8OII9cldFxmmhPFxfQivP&limit=1" -Headers $headers).deployments[0].uid
$events = Invoke-RestMethod -Uri "https://api.vercel.com/v1/deployments/$depId/events?limit=50" -Headers $headers
$events | ForEach-Object { Write-Output "$($_.text)" }
```

---

## 3. Para Editar Direto pelo GitHub (sem terminal)

1. Acesse https://github.com/ting560/zapstream
2. Navegue até o arquivo desejado
3. Clique no ícone ✏️ (lápis) para editar
4. Faça as alterações
5. Role até "Commit changes"
6. Escreva uma mensagem descritiva
7. Clique em "Commit changes"

A Vercel detecta o push e faz deploy automático.

---

## 4. Estrutura do Projeto (Diretórios Principais)

| Diretório | Função |
|-----------|--------|
| `src/app/` | Rotas e páginas (Next.js App Router) |
| `src/components/iptv/` | Componentes do player IPTV |
| `src/lib/` | Utilitários (iptv-client, img-cache, etc.) |
| `src/app/api/` | Endpoints de API (proxy IPTV, imagens, etc.) |
| `public/` | Arquivos estáticos (favicon, etc.) |
| `prisma/` | Schema do banco SQLite |
| `.env` | Variáveis de ambiente locais |

---

## 5. Arquivos Importantes

- **`src/components/iptv/IPTVApp.tsx`** — Componente principal (header, botões, grid)
- **`src/components/iptv/ContentCard.tsx`** — Card de conteúdo com imagem
- **`src/components/iptv/LoginCard.tsx`** — Tela de login
- **`src/app/layout.tsx`** — Layout raiz (metadados, título)
- **`src/lib/img-cache.ts`** — Cache de imagens (local → proxy)
- **`src/lib/img-downloader.ts`** — Download de capas para `/tmp/covers/`

---

## 6. Solução de Problemas

| Problema | Solução |
|----------|---------|
| Deploy falhou | Ver logs: comando curl acima ou dashboard Vercel |
| Site não atualizou | Aguardar 2 min, limpar cache do navegador |
| Erro "supabaseUrl is required" | Setar NEXT_PUBLIC_SUPABASE_URL no Vercel ou deixar vazio (usa mock) |
| Download de capas falha | Verificar se há itens carregados (navegar até uma categoria) |
| Botão de download desabilitado | Navegar em canais/filmes/séries primeiro para carregar itens |
