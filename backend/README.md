# RUMO — Backend (FastAPI)

Única fonte de dados e de lógica do produto. O front-end nunca lê o dataset
diretamente — todo o fluxo é:

```
../data-science/data/ANON_transcricao.json → processamento.py → app.py (API) → React
```

## Estrutura de pastas (projeto RUMO completo)

Este backend espera rodar dentro da estrutura `RUMO/`, lendo o dataset e o
modelo de `../data-science/`:

```
RUMO/
├── backend/            <- você está aqui
├── data-science/
│   ├── data/ANON_transcricao.json
│   ├── modelos/modelo_totvs_sprint3.pkl
│   ├── scripts/        (preparar_dados.py, metricas_historicas.py, consolidar_artefato.py)
│   └── notebooks/       (sprint3_totvs_completo.ipynb)
└── frontend/
```

## O que mudou em relação ao projeto anterior

- **`processamento.py`** centraliza tudo que antes estava espalhado entre
  scripts (`preparar_dados.py`, `metricas_historicas.py`,
  `consolidar_artefato.py`) e o script de geração usado pelo front-end
  anterior. Agora é uma única classe (`BaseRumo`) carregada uma vez no boot
  da API.
- **Transcrição estruturada com speaker preservado**: cada mensagem vem como
  `{"remetente": "vendedor" | "cliente" | null, "texto": "..."}`. Quando a
  diarização da call não é confiável (mais de 2 locutores cobrindo menos de
  70% dos turnos — isso acontece em 92,6% da base real), `remetente` vem
  `null` e o front-end mostra a transcrição sem atribuir lado, em vez de
  inventar quem falou o quê.
- **Nada de status fabricado**: `status` da negociação só é preenchido
  quando dá para calcular (data da última call + `TP_RECURSO`); caso
  contrário vem `null` e a API/front tratam como "Não disponível".
- **Persistência real dos Replays** em `replays_salvos.json` (arquivo local,
  sem banco — mas é estado real da aplicação, não mockdata).

## Rodando

```bash
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

Variáveis de ambiente opcionais (arquivo `.env`):
- `GROQ_API_KEY` — habilita o Co-Pilot com IA (Groq). Sem ela, o Co-Pilot
  responde com o contexto estruturado da negociação (modo heurístico).
- `CORS_ORIGINS` — origens permitidas (padrão `*`).

O boot demora ~15-20s: a API processa as 1174 calls reais (parsing de
transcrição + score do modelo) uma única vez e mantém tudo em memória.

## Endpoints

```
GET    /api/health
GET    /api/contas?busca=&status=&objecao=&pagina=&tamanhoPagina=
GET    /api/contas/{codt}
GET    /api/contas/{codt}/timeline
GET    /api/contas/{codt}/calls/{uid}?completa=true|false
GET    /api/contas/{codt}/preparacao
GET    /api/analises/resumo
GET    /api/oportunidades
POST   /api/simulacao             # inicia um Replay (1ª fala do vendedor → 1ª resposta do Grok)
POST   /api/simulacao/mensagem    # continua a conversa multiturno com o cliente virtual
POST   /api/simulacao/finalizar   # encerra o Replay e devolve Original × Simulação + evidência histórica
GET    /api/replays
POST   /api/replays
DELETE /api/replays/{id}
POST   /api/chat                  # Co-Pilot — papel separado do cliente virtual do Replay
```

## Dados e Data Science preservados

- O modelo real da Sprint 3 (`../data-science/modelos/modelo_totvs_sprint3.pkl`, TF-IDF +
  Random Forest treinado sobre `NOTA_NPS` real) continua calculando o
  **risco estimado** da negociação — não foi substituído. Ele é um score de
  risco/churn, não uma probabilidade de sucesso ou "score de saúde"; a API e
  a interface tratam esse número como risco (quanto menor, melhor), nunca
  como taxa de conversão.
- A tabela de impacto histórico (objeção → estratégia → delta real de risco)
  é recalculada no boot a partir do dataset real, não de um pickle
  pré-calculado — mais transparente para auditar.
- Quando uma combinação objeção/estratégia não tem amostra confiável
  (`n < 10`), a API retorna `impactoPP: null` em vez de inventar um número.
- Uma queda no risco (`riscoDepois < riscoAntes`) é sempre rotulada como
  "risco reduzido"; nunca como "avançou" ou tratada como se fosse um ganho
  de conversão.

