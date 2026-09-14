# RUMO — Frontend (React + Vite + Tailwind)

Front-end do **RUMO**. Não lê dataset algum diretamente — todos os dados
(negociações, transcrições, análises, oportunidades, replays) vêm da API do
backend (`../rumo-backend`).

## Rodando

```bash
npm install
npm run dev       # http://localhost:5173 — proxy /api -> http://localhost:8000
npm run build     # gera dist/
```

Suba o backend antes (`uvicorn app:app --reload --port 8000` em
`rumo-backend/`). Em dev, o Vite já faz proxy de `/api/*` para
`http://localhost:8000` (ver `vite.config.js`). Em produção, aponte
`VITE_API_URL` para a URL pública da API (variável de ambiente do build).

## O que mudou em relação à versão anterior (Replay)

- Removido `public/dados-replay.json` e todo o carregamento de dataset no
  cliente. `src/lib/api.js` é o único ponto de acesso a dados — cada página
  busca só o que precisa (`GET /api/contas`, `/timeline`, `/preparacao`,
  `/analises/resumo`, `/oportunidades`, `/replays`).
- Removidos `DataContext`/`SimulacoesContext` (liam o dataset inteiro no
  front). A simulação agora chama `POST /api/simulacao` no backend, que
  calcula o impacto real; salvar um Replay chama `POST /api/replays`
  (persistido no backend, não em memória do navegador).
- Identidade renomeada de "Replay" (produto) para **RUMO** — "Replay"
  continua existindo como o nome da funcionalidade central (o que o
  briefing pede), não mais como marca.
- Terminologia da conversa: **Vendedor / Cliente** (antes "comprador"),
  espelhando o campo `remetente` que a API já devolve estruturado.
- Simulador continua **contextual** (abre a partir de um momento marcado
  dentro de uma negociação) — não é uma aba principal.
- Removidos arquivos mortos do template Vite (`react.svg`, `vite.svg`,
  `hero.png`, `icons.svg`, hook `useApiQuery` sem uso).

Tailwind aqui é v4 (config "CSS-first"): não há `tailwind.config.js` — os
tokens de cor/fonte ficam no bloco `@theme` de `src/index.css`, e
`postcss.config.js` é quem registra o plugin `@tailwindcss/postcss`.

## Estrutura

```
src/
  lib/api.js            único cliente HTTP — fala com o backend RUMO
  components/
    layout/              Sidebar, AppShell
    ui/                  StatusBadge, Marcador, InfoNote, EmptyState
    landing/              Hero, HowItWorks, Differentiator, FinalCta
    negociacoes/          Card da lista
    negociacao-detalhe/   Conversa (modo diálogo/bruto, vendedor/cliente)
    simulacao/            SimulacaoPanel (fluxo completo via API) + reações
    analises/             KPIs, Onde estou perdendo, O que está funcionando, Meus Replays
    oportunidades/
  pages/                 Uma página por rota
```
