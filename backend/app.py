"""
RUMO — backend (FastAPI)

Fluxo obrigatório do produto: ANON_transcricao.json -> processamento.py ->
esta API -> React. O frontend nunca lê o dataset diretamente.
"""
import json
import re
import os
import time
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from processamento import (
    BaseRumo, FRASE_ESTRATEGIA, LABELS_ESTRATEGIA, LABELS_OBJECAO,
    rotulo_risco, LABEL_ROTULO_RISCO,
)

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = FastAPI(
    title="RUMO — API",
    description="Replay de Vendas: negociações reais, momentos importantes e simulação de novas abordagens.",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

base = BaseRumo()

REPLAYS_PATH = Path(__file__).parent / "replays_salvos.json"


def carregar_replays() -> List[dict]:
    if REPLAYS_PATH.exists():
        with open(REPLAYS_PATH, encoding="utf-8") as f:
            return json.load(f)
    return []


def salvar_replays(replays: List[dict]):
    with open(REPLAYS_PATH, "w", encoding="utf-8") as f:
        json.dump(replays, f, ensure_ascii=False, indent=2)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class SimulacaoIniciarRequest(BaseModel):
    codt: str
    callUid: int
    marcadorTipo: str
    marcadorChave: str
    marcadorLabel: str
    estrategia: str  # chave de LABELS_ESTRATEGIA ou 'propria'
    textoProprio: Optional[str] = None


class SimulacaoMensagemRequest(BaseModel):
    sessaoId: str
    texto: str


class SimulacaoFinalizarRequest(BaseModel):
    sessaoId: str


class ReplaySalvo(BaseModel):
    codt: str
    empresa: str
    situacao: str
    callUid: int
    dataCall: Optional[str] = None
    # dados reais (nunca alterados pela simulação)
    original: dict
    # dados produzidos durante a simulação (estratégia, mensagens, respostas do Grok)
    simulacao: dict
    novaAbordagem: str
    impactoPP: Optional[float] = None
    variacaoRiscoPP: Optional[float] = None
    scoreRiscoAntes: Optional[float] = None
    scoreRiscoDepois: Optional[float] = None
    amostraHistorica: int = 0
    fonte: str = "estimativa"


class ChatRequest(BaseModel):
    prompt: str
    codt: Optional[str] = None
    callUid: Optional[int] = None


# ---------------------------------------------------------------------------
# Negociações
# ---------------------------------------------------------------------------
@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "modeloCarregado": base.model is not None,
        "totalCalls": len(base.calls),
        "totalContas": len(base.contas_info),
        "combinacoesImpacto": len(base.tabela_impacto),
    }


@app.get("/api/contas")
def listar_contas(busca: Optional[str] = None, status: Optional[str] = None,
                   objecao: Optional[str] = None, pagina: int = 1, tamanhoPagina: int = 30):
    """Lista contas com filtros combináveis.

    Vários valores do mesmo filtro são separados por vírgula (OR dentro do
    grupo). Grupos diferentes continuam combinados por AND.

    Ex.: status=aguardando,perdida&objecao=PRECO,CONCORRENCIA
    """
    itens = list(base.contas_info.values())

    if busca:
        termo = busca.lower().strip()
        itens = [
            c for c in itens
            if termo in c["empresa"].lower()
            or termo in c["codt"].lower()
            or (c["segmento"] and termo in c["segmento"].lower())
        ]

    status_filtros = {x.strip().lower() for x in (status or "").split(",") if x.strip() and x.strip().lower() != "todas"}
    if status_filtros:
        itens = [c for c in itens if (c.get("status") or "").lower() in status_filtros]

    def normalizar_objecao(valor):
        chave = str(valor or "").strip().upper()
        if chave.startswith("OBJEÇÃO — "):
            chave = chave.replace("OBJEÇÃO — ", "", 1)
        if chave.startswith("OBJECao — ".upper()):
            chave = chave.replace("OBJECAO — ", "", 1)
        # aceita tanto a chave técnica quanto o label exibido pela UI
        if chave in LABELS_OBJECAO:
            return chave
        for k, label in LABELS_OBJECAO.items():
            if chave == label.upper() or chave == label.replace("Objeção — ", "").upper():
                return k
        return chave

    objecao_filtros = {normalizar_objecao(x) for x in (objecao or "").split(",") if x.strip()}
    if objecao_filtros:
        # A conta entra se a objeção apareceu em QUALQUER call da conta.
        # Isso é importante para o radar/gargalos não perder históricos.
        itens = [
            c for c in itens
            if any(
                normalizar_objecao(o) in objecao_filtros
                for uid in c.get("uidsCalls", [])
                for o in base.calls[uid].get("objecoes", [])
            )
        ]

    itens.sort(key=lambda c: c["ultimaCallData"] or "", reverse=True)
    total = len(itens)
    inicio = (pagina - 1) * tamanhoPagina
    pagina_itens = itens[inicio: inicio + tamanhoPagina]
    return {"total": total, "pagina": pagina, "tamanhoPagina": tamanhoPagina,
            "totalGeralContas": len(base.contas_info), "itens": pagina_itens}


@app.get("/api/contas/{codt}")
def detalhe_conta(codt: str):
    conta = base.contas_info.get(codt)
    if not conta:
        raise HTTPException(status_code=404, detail="Negociação não encontrada.")
    return conta


@app.get("/api/contas/{codt}/timeline")
def timeline_conta(codt: str):
    conta = base.contas_info.get(codt)
    if not conta:
        raise HTTPException(status_code=404, detail="Negociação não encontrada.")
    calls = []
    for uid in conta["uidsCalls"]:
        c = base.calls[uid]
        calls.append({
            "uid": c["uid"], "idMeeting": c["idMeeting"], "data": c["dataFormatada"],
            "duracaoMin": c["duracaoMin"], "modoConversa": c["modoConversa"],
            "qualidade": c["qualidade"],
            "objecoes": c["objecoes"], "scoreSaude": c["scoreSaude"],
            "mensagens": c["mensagensRecorte"],
        })
    return {"codt": codt, "totalCalls": len(calls), "calls": calls}


@app.get("/api/contas/{codt}/calls/{uid}")
def detalhe_call(codt: str, uid: int, completa: bool = False):
    c = base.calls.get(uid)
    if not c or c["codt"] != codt:
        raise HTTPException(status_code=404, detail="Call não encontrada para esta conta.")
    mensagens = c["mensagensCompletas"] if completa else c["mensagensRecorte"]
    return {**{k: v for k, v in c.items() if k not in ("mensagensCompletas", "mensagensRecorte")},
            "mensagens": mensagens}


@app.get("/api/contas/{codt}/preparacao")
def preparar_proxima_negociacao(codt: str):
    conta = base.contas_info.get(codt)
    if not conta:
        raise HTTPException(status_code=404, detail="Negociação não encontrada.")
    ultima = base.calls[conta["ultimaCallUid"]]
    sugestoes = []
    for objecao in ultima["objecoes"]:
        for s in base.sugestoes_para_objecao(objecao):
            sugestoes.append({**s, "fraseSugerida": FRASE_ESTRATEGIA.get(s["estrategia"])})
    return {
        "codt": codt,
        "ultimaNegociacao": {
            "data": ultima["dataFormatada"],
            "objecoes": conta["objecoesUltimaCall"] or ["Sem objeção detectada na última call."],
            "scoreSaude": ultima["scoreSaude"],
            "pontoEmAberto": conta["pontoEmAberto"],
        },
        "simulacoesSugeridas": sugestoes,
    }


# ---------------------------------------------------------------------------
# Análises e Oportunidades
# ---------------------------------------------------------------------------
@app.get("/api/analises/resumo")
def resumo_analises():
    return {
        "funil": base.funil(),
        "tendencia": base.tendencia_analitica(),
        "kpis": base.kpis(),
        "ondeEstouPerdendo": base.onde_estou_perdendo(),
        "oQueEstaFuncionando": base.o_que_esta_funcionando(),
        "pontosDeAtencao": base.pontos_de_atencao(),
    }


@app.get("/api/oportunidades")
def oportunidades():
    onde_perdendo = base.onde_estou_perdendo()
    o_que_funciona = base.o_que_esta_funcionando()
    if not onde_perdendo:
        return {"itens": []}

    principal = onde_perdendo[0]
    melhor_estrategia = o_que_funciona[0] if o_que_funciona else None
    concorrencia = next((o for o in onde_perdendo if o["chave"] == "CONCORRENCIA"), None)
    contas_concorrencia = [c for c in base.contas_info.values()
                            if "Objeção — Concorrência" in c["objecoesUltimaCall"]]

    itens = [{
        "tipo": "objecao_principal", "titulo": principal["label"].replace("Objeção — ", ""),
        "descricao": f"Você encontra essa objeção em {principal['percentual']}% das negociações reais analisadas.",
        "melhorAbordagem": melhor_estrategia["estrategiaLabel"] if melhor_estrategia else None,
        "impactoPP": melhor_estrategia["impactoPP"] if melhor_estrategia else None,
    }]
    if concorrencia:
        itens.append({
            "tipo": "concorrencia", "titulo": "Concorrência",
            "descricao": "Negociações reais com objeção de concorrência em aberto.",
            "quantidade": len(contas_concorrencia),
        })
    if melhor_estrategia:
        itens.append({
            "tipo": "melhor_estrategia", "titulo": "Estratégia com melhor resultado real",
            "descricao": f"{melhor_estrategia['estrategiaLabel']} em objeções de "
                         f"{melhor_estrategia['objecaoLabel'].replace('Objeção — ', '').lower()}",
            "amostra": melhor_estrategia["amostra"], "impactoPP": melhor_estrategia["impactoPP"],
        })
    return {"itens": itens}


# ---------------------------------------------------------------------------
# Cliente virtual do Replay — Grok via GroqCloud (item 4-11 do briefing)
#
# A API Key já está configurada no .env; nunca é pedida, validada ou exposta
# aqui. O mesmo cliente `groq` é reaproveitado tanto para o cliente virtual
# quanto para o Co-Pilot (nenhuma integração de LLM duplicada) — o que muda é
# o system prompt e o modelo pode ser ajustado separadamente por env se
# necessário.
# ---------------------------------------------------------------------------
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_MODEL = os.getenv("GROQ_MODEL", os.getenv("GROQ_MODEL_CLIENTE", "llama-3.3-70b-versatile"))
groq_client = None
if GROQ_API_KEY:
    try:
        from groq import Groq
        groq_client = Groq(api_key=GROQ_API_KEY)
    except Exception as e:
        print(f"[RUMO] Groq indisponível ({e}); Replay e Co-Pilot ficarão em modo de erro amigável.")


def _linha_contexto(t):
    quem = t.get("remetente") or "participante"
    return f"{quem.upper()}: {t['texto']}"


def montar_prompt_sistema_cliente(ctx: dict, estrategia_label: str = None, fala_vendedor: str = None) -> str:
    """Prompt do cliente virtual (item 8) — nunca revela ser IA, nunca diz o
    que é 'certo', nunca sai do papel de cliente."""
    trecho_real = "\n".join(
        [_linha_contexto(t) for t in ctx["trechoAntes"]]
        + [_linha_contexto(ctx["falaMarcada"])]
        + [_linha_contexto(t) for t in ctx["trechoDepois"]]
    ) or "(sem trecho adicional disponível)"

    return f"""Você é o cliente desta negociação comercial (RUMO — Replay de Vendas).

DADOS REAIS DA CONTA (não invente nada além disto):
- Empresa: {ctx['conta']['empresa']}
- Segmento: {ctx['conta']['segmento']}
- Unidade: {ctx['conta']['unidade']}
- Faixa de faturamento: {ctx['conta']['faixaFaturamento']}
- Data da call original: {ctx['call']['data'] or 'não informada na base'}

TRECHO REAL DA CALL (isto aconteceu de verdade e não pode ser alterado):
{trecho_real}

OBJEÇÃO REAL IDENTIFICADA NESTE MOMENTO: {ctx['objecaoReal'] or 'não classificada como objeção específica'}

NOVA ABORDAGEM ESCOLHIDA PELO VENDEDOR: {estrategia_label or 'Resposta própria'}
FALA EXATA QUE O VENDEDOR VAI USAR AGORA: {fala_vendedor or '(não informada)'}

A PARTIR DE AGORA começa uma situação HIPOTÉTICA: o vendedor vai tentar uma
NOVA abordagem, diferente da que ele usou de verdade. Você deve reagir como
esse mesmo cliente reagiria a essa nova abordagem, considerando tudo o que
já aconteceu de real na call.

IMPORTANTE SOBRE A PRIMEIRA RESPOSTA:
- A nova fala do vendedor vem como a primeira mensagem da conversa simulada.
- Responda ao CONTEÚDO específico dessa fala, não apenas ao tema geral da call.
- Conecte sua reação à objeção real acima quando houver uma objeção real: preço -> orçamento/valor; prazo -> contrato/prazo; concorrência -> comparação; decisor -> aprovação; urgência -> prioridade; implementação -> risco/migração; escopo -> necessidade do pacote.
- Nunca use uma resposta genérica de adiamento (por exemplo, "vou levar para a equipe e te retorno") só para encerrar o turno. Essa reação só pode aparecer quando o contexto da negociação realmente justificar.
- Não repita a mesma reação entre abordagens diferentes; a reação deve variar conforme a nova fala do vendedor.

REGRAS ABSOLUTAS DE COMPORTAMENTO:
- Você é o CLIENTE. Não é treinador, assistente, analista, vendedor ou narrador.
- Nunca diga que é uma IA, que está em uma simulação, que está sendo avaliado,
  que está usando Grok ou RUMO, nem qual seria a resposta "correta" do vendedor.
- Reaja de forma realista e proporcional ao que o vendedor disse: você pode manter
  a objeção, trazer uma dúvida nova, demonstrar interesse, negociar, pedir tempo,
  aceitar uma condição ou insistir — depende do que fizer sentido dado o contexto.
  Não aceite tudo, não rejeite tudo, não repita frases prontas.
- Responda em português do Brasil, em 1 a 3 frases, como alguém falaria numa call
  real — não como um texto formal ou uma lista.
- Nunca invente fatos sobre a empresa que não estejam nos dados reais acima."""


FRASES_GENERICAS_CLIENTE = [
    "vou levar isso pra equipe e te retorno",
    "vou levar isso para a equipe e te retorno",
    "vou verificar internamente e te retorno",
    "vou alinhar com a equipe e te retorno",
    "vou conversar com a equipe e te retorno",
]

def resposta_cliente_generica(texto: str) -> bool:
    low = re.sub(r"\s+", " ", (texto or "").lower()).strip()
    return any(frase in low for frase in FRASES_GENERICAS_CLIENTE)


def chamar_grok_cliente(system_prompt: str, historico: list) -> str:
    if groq_client is None:
        raise RuntimeError("groq_indisponivel")
    completion = groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{"role": "system", "content": system_prompt}, *historico],
        max_tokens=300,
        temperature=0.8,
    )
    texto = (completion.choices[0].message.content or "").strip()
    if not texto:
        raise RuntimeError("resposta_vazia")
    return texto


# ---------------------------------------------------------------------------
# Replay (simulação multiturno) e persistência
#
# Sessões em memória: cada Replay em andamento vira uma sessão com o contexto
# real, o system prompt fixo do cliente virtual e o histórico da conversa
# simulada. Nada disso é escrito no dataset real.
# ---------------------------------------------------------------------------
SESSOES_SIMULACAO: dict = {}


@app.post("/api/simulacao")
def iniciar_simulacao(req: SimulacaoIniciarRequest):
    """Inicia um Replay: monta o contexto real, registra a primeira nova
    abordagem do vendedor e já chama o Grok — cliente virtual — pela primeira
    vez, contextualizado nessa negociação específica."""
    ctx = base.montar_contexto_replay(req.codt, req.callUid, req.marcadorTipo, req.marcadorChave)
    if ctx is None:
        raise HTTPException(status_code=404, detail="Negociação ou call não encontrada.")

    fala_vendedor = req.textoProprio.strip() if req.estrategia == "propria" and req.textoProprio else FRASE_ESTRATEGIA.get(req.estrategia)
    if not fala_vendedor:
        raise HTTPException(status_code=400, detail="Informe uma nova abordagem.")

    # Evidência histórica real (nunca é o "resultado" da simulação — item 26/27)
    hist = base.buscar_impacto(req.marcadorChave, req.estrategia) if req.marcadorTipo == "objecao" else None
    evidencia_historica = (
        {
            "amostra": hist["amostra"], "scoreRiscoAntes": hist["scoreRiscoAntes"],
            "scoreRiscoDepois": hist["scoreRiscoDepois"], "impactoPP": hist["impactoPP"],
            "rotuloRisco": rotulo_risco(hist["scoreRiscoAntes"], hist["scoreRiscoDepois"]),
        }
        if hist and hist["confiavel"] else
        {"amostra": hist["amostra"] if hist else 0, "scoreRiscoAntes": None, "scoreRiscoDepois": None,
         "impactoPP": None, "rotuloRisco": None}
    )

    estrategia_label = LABELS_ESTRATEGIA.get(req.estrategia, "Resposta própria")
    sistema = montar_prompt_sistema_cliente(ctx, estrategia_label=estrategia_label, fala_vendedor=fala_vendedor)
    historico = [{"role": "user", "content": fala_vendedor}]

    try:
        resposta_cliente = chamar_grok_cliente(sistema, historico)
        if resposta_cliente_generica(resposta_cliente):
            historico_reforco = [
                {
                    "role": "system",
                    "content": (
                        "Sua resposta anterior ficou genérica. Gere outra resposta curta e natural, "
                        "respondendo diretamente à última fala do vendedor e à objeção real desta call. "
                        "Não use nenhuma frase de adiamento como \"vou levar para a equipe e te retorno\". "
                        "Mostre uma reação comercial específica do cliente."
                    ),
                },
                *historico,
            ]
            resposta_cliente = chamar_grok_cliente(sistema, historico_reforco)
    except Exception as e:
        print(f"[RUMO] Erro Grok (iniciar simulação): {e}")
        raise HTTPException(
            status_code=503,
            detail="O cliente virtual não pôde responder agora. Tente novamente.",
        )

    historico.append({"role": "assistant", "content": resposta_cliente})

    sessao_id = str(uuid.uuid4())
    SESSOES_SIMULACAO[sessao_id] = {
        "codt": req.codt, "callUid": req.callUid,
        "marcadorTipo": req.marcadorTipo, "marcadorChave": req.marcadorChave, "marcadorLabel": req.marcadorLabel,
        "estrategia": req.estrategia,
        "estrategiaLabel": LABELS_ESTRATEGIA.get(req.estrategia, "Resposta própria"),
        "sistema": sistema,
        "contextoReal": ctx,
        "evidenciaHistorica": evidencia_historica,
        "historico": historico,
        "finalizada": False,
    }

    return {
        "sessaoId": sessao_id,
        "codt": req.codt, "callUid": req.callUid,
        "contextoReal": ctx,
        "momentoReal": ctx["falaMarcada"],
        "objecaoReal": ctx["objecaoReal"],
        "novaAbordagem": {"estrategia": req.estrategia,
                           "estrategiaLabel": LABELS_ESTRATEGIA.get(req.estrategia, "Resposta própria"),
                           "texto": fala_vendedor},
        "respostaClienteSimulada": resposta_cliente,
        "historicoSimulacao": historico,
        "evidenciaHistorica": evidencia_historica,
        "aviso": "A resposta do cliente é gerada pela simulação (Grok) e não é uma garantia de resultado real.",
    }


@app.post("/api/simulacao/mensagem")
def continuar_simulacao(req: SimulacaoMensagemRequest):
    """Continua a conversa multiturno: cada nova chamada ao Grok leva consigo
    o contexto real e todo o histórico simulado até aqui (item 11)."""
    sessao = SESSOES_SIMULACAO.get(req.sessaoId)
    if not sessao:
        raise HTTPException(status_code=404, detail="Sessão de Replay não encontrada ou expirada.")
    if sessao["finalizada"]:
        raise HTTPException(status_code=400, detail="Este Replay já foi finalizado.")
    if not req.texto.strip():
        raise HTTPException(status_code=400, detail="Mensagem vazia.")

    sessao["historico"].append({"role": "user", "content": req.texto.strip()})
    try:
        resposta_cliente = chamar_grok_cliente(sessao["sistema"], sessao["historico"])
    except Exception as e:
        print(f"[RUMO] Erro Grok (continuar simulação): {e}")
        sessao["historico"].pop()  # não deixa a fala do vendedor "pendurada" sem resposta
        raise HTTPException(
            status_code=503,
            detail="O cliente virtual não pôde responder agora. Tente novamente.",
        )

    sessao["historico"].append({"role": "assistant", "content": resposta_cliente})
    return {
        "sessaoId": req.sessaoId,
        "respostaClienteSimulada": resposta_cliente,
        "historicoSimulacao": sessao["historico"],
    }


@app.post("/api/simulacao/finalizar")
def finalizar_simulacao(req: SimulacaoFinalizarRequest):
    sessao = SESSOES_SIMULACAO.get(req.sessaoId)
    if not sessao:
        raise HTTPException(status_code=404, detail="Sessão de Replay não encontrada ou expirada.")
    sessao["finalizada"] = True

    ctx = sessao["contextoReal"]
    return {
        "sessaoId": req.sessaoId,
        "codt": sessao["codt"], "callUid": sessao["callUid"],
        "situacaoOriginal": {
            "texto": ctx["falaMarcada"]["texto"], "remetente": ctx["falaMarcada"]["remetente"],
            "objecaoReal": ctx["objecaoReal"],
        },
        "novaAbordagem": {"estrategia": sessao["estrategia"], "estrategiaLabel": sessao["estrategiaLabel"]},
        "historicoSimulacao": sessao["historico"],
        "evidenciaHistorica": sessao["evidenciaHistorica"],
        "variacaoRiscoPP": sessao["evidenciaHistorica"].get("variacaoRiscoPP"),
        "aviso": "A variação exibida é evidência histórica agregada de calls reais comparáveis; não é uma previsão garantida desta simulação.",
    }


@app.get("/api/replays")
def listar_replays():
    return {"itens": carregar_replays()}


@app.post("/api/replays")
def salvar_replay(replay: ReplaySalvo):
    replays = carregar_replays()
    registro = replay.model_dump()
    registro["id"] = f"replay-{int(time.time() * 1000)}"
    registro["criadoEm"] = time.strftime("%Y-%m-%d %H:%M")
    replays.insert(0, registro)
    salvar_replays(replays)
    return registro


@app.delete("/api/replays/{replay_id}")
def remover_replay(replay_id: str):
    replays = carregar_replays()
    restantes = [r for r in replays if r["id"] != replay_id]
    if len(restantes) == len(replays):
        raise HTTPException(status_code=404, detail="Replay não encontrado.")
    salvar_replays(restantes)
    return {"removido": replay_id}


# ---------------------------------------------------------------------------
# Co-Pilot (contextual) — papel separado do cliente virtual (item 31): aqui o
# Grok é o assistente do vendedor, nunca o cliente da negociação. Reaproveita
# o mesmo groq_client configurado acima, com um system prompt diferente.
# ---------------------------------------------------------------------------
def contexto_copilot(codt: Optional[str], call_uid: Optional[int]) -> str:
    if not codt:
        return "Nenhuma negociação selecionada no momento."
    conta = base.contas_info.get(codt)
    if not conta:
        return "Negociação não encontrada."
    call = base.calls.get(call_uid) if call_uid is not None else base.calls[conta["ultimaCallUid"]]
    status_txt = (
        f"{conta['status']} (status derivado por heurística, não confirmado pela base)"
        if conta["status"] else "não disponível na base"
    )
    return (
        f"Conta: {conta['empresa']} | Segmento: {conta['segmento'] or 'não informado na base'}\n"
        f"Status: {status_txt}\n"
        f"Risco estimado da call (score do modelo, não é probabilidade de sucesso): {call['scoreSaude']}\n"
        f"Objeções: {', '.join(LABELS_OBJECAO.get(o, o) for o in call['objecoes']) or 'nenhuma detectada'}\n"
    )


@app.post("/api/chat")
def copilot(req: ChatRequest):
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Mensagem vazia.")
    contexto = contexto_copilot(req.codt, req.callUid)

    if groq_client is not None:
        try:
            completion = groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": (
                        "Você é o Co-Pilot do RUMO. Ajude o vendedor a interpretar a "
                        "negociação real selecionada — objeções, contexto e simulações — "
                        "de forma objetiva, em português do Brasil. Nunca invente dados "
                        "que não estejam no contexto fornecido."
                    )},
                    {"role": "user", "content": f"CONTEXTO:\n{contexto}\n\nPERGUNTA: {req.prompt}"},
                ],
                max_tokens=500, temperature=0.4,
            )
            return {"resposta": completion.choices[0].message.content.strip(), "fonte": "groq"}
        except Exception as e:
            print(f"[RUMO] Erro Groq: {e}")

    return {"resposta": contexto, "fonte": "heuristico"}
