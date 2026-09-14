# RUMO

**RUMO** é uma solução de inteligência para vendas baseada no conceito de
**Replay de Vendas**: o vendedor volta a uma negociação real, identifica um
momento importante e testa **"e se eu tivesse respondido de outra forma?"**
— comparando a simulação com o que realmente aconteceu.

Link do nosso site: https://rumo-alpha-eight.vercel.app/

```
Call real → Momento importante → Replay → Nova abordagem → Comparação → Aprendizado
```

## Estrutura do projeto

```
RUMO/
├── frontend/           React + Vite + Tailwind (JSX, sem TypeScript)
├── backend/             FastAPI — única fonte de dados/lógica servida ao front
├── data-science/
│   ├── data/             dataset real (ANON_transcricao.json)
│   ├── modelos/          modelo .pkl real (TF-IDF + Random Forest, Sprint 3)
│   ├── scripts/          scripts originais de preparação/treino/análise
│   └── notebooks/        notebook original da Sprint 3
└── .gitignore
```

Fluxo de dados obrigatório do produto — o React **nunca** lê o dataset
diretamente:

```
data-science/data/ANON_transcricao.json
        ↓
backend/processamento.py  (Data Science: parsing, objeções, score, impacto)
        ↓
backend/app.py  (API FastAPI)
        ↓
frontend/  (React)
```

## Como rodar o projeto completo

**1. Backend** (porta 8000):
```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```
O primeiro boot demora ~15-20s: a API processa as 1174 calls reais do
dataset uma única vez (parsing de transcrição + score do modelo) e mantém
tudo em memória.

**2. Frontend** (porta 5173):
```bash
cd frontend
npm install   # node_modules já vem no zip, mas rode caso precise reinstalar
npm run dev
```
Em desenvolvimento, o Vite já faz proxy de `/api/*` para
`http://localhost:8000` (ver `frontend/vite.config.js`). Para build de
produção servido em outro domínio, defina `VITE_API_URL` apontando para a
API pública.

## Sem MockData

Nenhuma negociação, call, transcrição, cliente ou métrica exibida é
inventada. Tudo vem do dataset real processado pelo backend. Quando uma
informação não existe ou não pode ser calculada com segurança, a API e a
interface mostram **"Não disponível"**, **"Sem dados suficientes"** ou
**"Não calculado"** — nunca um valor fabricado. Detalhes e achados sobre a
qualidade do dataset real (diarização de speakers não confiável em boa
parte das calls, ausência de campo de desfecho de negócio, etc.) estão
documentados em `backend/README.md`.

## Documentação específica

- `frontend/README.md` — estrutura de componentes, terminologia, como o
  front consome a API.
- `backend/README.md` — endpoints, metodologia de processamento dos dados,
  limitações conhecidas do dataset.

## Cliente virtual do Replay — Grok via GroqCloud

O cliente virtual da simulação usa a biblioteca `groq` (já presente no
projeto) apontando para o GroqCloud, com a API Key lida de `GROQ_API_KEY` no
`.env` do backend. A chave nunca é enviada ao navegador, nunca é logada e
nunca é retornada pela API — o fluxo é sempre `React → FastAPI → GroqCloud →
FastAPI → React`.

O modelo é configurado por `GROQ_MODEL` no `.env` (mesmo modelo usado tanto
pelo cliente virtual do Replay quanto pelo Co-Pilot, com prompts diferentes
para cada papel — não há duas integrações de LLM separadas).

**Nota importante:** o GroqCloud (Groq Inc.) hospeda modelos de peso aberto
(Llama, Gemma, GPT-OSS, Qwen etc.) — ele não hospeda o modelo Grok da xAI.
Não existe um `GROQ_MODEL=grok-...` real para usar. `GROQ_MODEL` deve
apontar para um modelo de fato disponível na sua conta GroqCloud; "Grok" no
RUMO é o nome do papel/persona do cliente virtual na negociação, não o nome
de um modelo específico do GroqCloud.

A cada Replay, o backend monta um contexto específico daquela negociação
(trecho real ao redor do momento selecionado, objeção real, dados da conta
com fallback só dentro da mesma conta) e o envia como *system prompt* fixo;
cada nova mensagem do vendedor é enviada junto com todo o histórico da
conversa simulada (`POST /api/simulacao` → `POST /api/simulacao/mensagem` →
`POST /api/simulacao/finalizar`), nunca como chamadas isoladas sem memória.
Se o GroqCloud falhar ou a resposta vier vazia, a API retorna erro 503 e a
interface mostra "O cliente virtual não pôde responder agora. Tente
novamente." — nunca uma resposta fabricada.

