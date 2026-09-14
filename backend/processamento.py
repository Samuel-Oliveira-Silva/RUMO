"""
RUMO — camada de dados e Data Science.

Único módulo que lê ANON_transcricao.json e o modelo real da Sprint 3.
Tudo que a API expõe vem daqui — nunca de dado inventado. Quando uma
informação não existe ou não pode ser calculada com segurança, as funções
devolvem None e a API traduz isso para "Não disponível" / "Sem dados
suficientes" / "Não calculado", nunca para um valor fabricado.
"""
import json
import pickle
import re
import warnings
from collections import Counter
from pathlib import Path

import pandas as pd

warnings.filterwarnings("ignore")

BASE_DIR = Path(__file__).parent
DATA_SCIENCE_DIR = BASE_DIR.parent / "data-science"
CAMINHO_DADOS = DATA_SCIENCE_DIR / "data" / "ANON_transcricao.json"
CAMINHO_MODELO = DATA_SCIENCE_DIR / "modelos" / "modelo_totvs_sprint3.pkl"

# ---------------------------------------------------------------------------
# Dicionários de negociação (objeção / estratégia / interesse) — a mesma
# metodologia de keyword-matching sobre texto real usada nas etapas
# anteriores do projeto, agora centralizada no backend.
# ---------------------------------------------------------------------------
OBJECOES = {
    "PRECO": ["preço", "caro", "valor tá alto", "valor está alto", "desconto",
              "orçamento apertado", "custo elevado", "muito caro", "investimento alto"],
    "PRAZO_CONTRATUAL": ["fidelidade", "12 meses", "24 meses", "prazo de contrato",
                          "tempo de contrato", "carência", "multa contratual"],
    "CONCORRENCIA": ["concorrente", "outra empresa", "outro fornecedor", "cotação",
                      "orçamento com outra", "comparando com"],
    "ESCOPO_PLANO": ["não precisa desse módulo", "plano muito completo",
                      "funcionalidade que não usamos", "pacote maior do que precisamos"],
    "DECISOR_AUSENTE": ["preciso conversar com", "não sou eu quem decide",
                         "vou levar para a diretoria", "aprovação superior",
                         "depende do financeiro", "depende da diretoria"],
    "SEM_URGENCIA": ["não é prioridade agora", "vamos deixar para depois",
                      "ano que vem", "não é o momento", "mais para frente"],
    "CONFIANCA_IMPLEMENTACAO": ["medo de trocar", "risco na migração",
                                 "receio da implantação", "medo de dar problema na troca"],
}

ESTRATEGIAS = {
    "DESCONTO": ["desconto", "redução no valor", "condição especial de preço",
                 "consigo baixar o valor", "fechar com valor menor"],
    "ALTERAR_PRAZO": ["prazo menor", "prazo maior", "sem fidelidade",
                       "flexibilizar o contrato", "6 meses", "contrato mais curto"],
    "TROCAR_PLANO": ["outro plano", "plano mais simples", "plano mais completo",
                      "plano de entrada", "reduzir o pacote", "ampliar o pacote"],
    "ADICIONAR_BENEFICIO": ["bônus", "módulo sem custo", "treinamento incluso",
                             "suporte prioritário", "cortesia", "brinde"],
    "MANTER_PRECO_EXPLORAR_OBJECAO": ["vamos entender melhor", "qual seria o cenário ideal",
                                       "o que faria sentido para vocês", "o que pesa mais aí"],
}

INTERESSE_KEYWORDS = [
    "gostamos muito", "ficamos confiantes", "gostei da solução", "gostei muito",
    "faz sentido pra gente", "isso ajudaria bastante", "combina com o que precisamos",
    "atende bem o que buscamos", "ficou muito bom", "é exatamente o que buscávamos",
]

LABELS_OBJECAO = {
    "PRECO": "Objeção — Preço",
    "PRAZO_CONTRATUAL": "Objeção — Prazo contratual",
    "CONCORRENCIA": "Objeção — Concorrência",
    "ESCOPO_PLANO": "Objeção — Escopo do plano",
    "DECISOR_AUSENTE": "Objeção — Decisor ausente",
    "SEM_URGENCIA": "Objeção — Sem urgência",
    "CONFIANCA_IMPLEMENTACAO": "Objeção — Confiança na implementação",
}
LABELS_ESTRATEGIA = {
    "DESCONTO": "Oferecer desconto",
    "ALTERAR_PRAZO": "Negociar prazo",
    "TROCAR_PLANO": "Alterar o plano",
    "ADICIONAR_BENEFICIO": "Adicionar benefício",
    "MANTER_PRECO_EXPLORAR_OBJECAO": "Explorar a objeção",
}
FRASE_ESTRATEGIA = {
    "DESCONTO": "podemos conversar sobre um desconto especial no valor",
    "ALTERAR_PRAZO": "podemos ajustar o prazo do contrato para um período mais curto",
    "TROCAR_PLANO": "podemos avaliar outro plano mais adequado ao que vocês precisam",
    "ADICIONAR_BENEFICIO": "posso incluir um benefício adicional sem custo extra",
    "MANTER_PRECO_EXPLORAR_OBJECAO": "antes de falar de valores, o que pesa mais nessa decisão pra vocês?",
}

LIMIAR_COBERTURA_DIALOGO = 0.70  # ver nota em parse_turnos

# ---------------------------------------------------------------------------
# Detecção contextual de objeção (Problema 4 e 5 do briefing).
#
# Regra: uma objeção só pode nascer de uma fala do CLIENTE (nunca do
# vendedor), e mesmo assim só quando a fala tem sinal de resistência —
# palavra-chave sozinha ("prazo", "preço") não basta. "Vamos falar sobre o
# prazo contratual" não é objeção; "o prazo contratual é muito longo" é.
# ---------------------------------------------------------------------------
SINAIS_RESISTENCIA = [
    "muito", "não ", "não é", "não dá", "não consigo", "não sei se", "difícil",
    "complicado", "preocupa", "preocupação", "receio", "medo", "demais",
    "apertado", "problema", "risco", " mas ", "só que", "ainda assim",
    "infelizmente", "pesa", "trava", "impede", "longo", "alto", "caro",
    "inviável", "complicado", "dúvida", "insegur",
]
PADROES_PROPOSTA_NEUTRA = [
    "vamos falar sobre", "podemos conversar sobre", "podemos falar sobre",
    "gostaria de entender", "queria entender melhor", "me explica sobre",
    "queremos saber mais sobre", "vou te explicar sobre", "posso te contar sobre",
]

PALAVROES_INTERFACE = [
    "caralho", "porra", "puta merda", "puta", "merda", "foda-se", "foda",
    "cacete", "bosta", "viado", "piranha", "idiota", "burro", "imbecil",
]

SINAIS_COMERCIAIS = [
    "preço", "valor", "caro", "orçamento", "desconto", "contrato", "prazo",
    "concorrente", "fornecedor", "cotação", "proposta", "proposta comercial",
    "comprar", "compra", "fechar", "fechamento", "negociação", "sistema",
    "solução", "plano", "módulo", "implantação", "migração", "decisão",
    "decisor", "diretoria", "financeiro", "aprovação", "urgência",
    "necessidade", "integração", "suporte", "investimento",
]
SINAIS_COMERCIAIS_FORTES = [
    "preço", "valor", "orçamento", "desconto", "contrato", "concorrente",
    "fornecedor", "cotação", "proposta", "negociação", "fechamento",
    "comprar", "implantação", "migração", "decisor", "diretoria",
    "aprovação", "investimento", "plano", "módulo",
]

def sanitizar_texto_interface(texto: str) -> str:
    """Redige ofensas explícitas na camada de apresentação sem alterar o dado
    bruto usado para scoring/modelagem. Retorna um texto legível para a UI."""
    if not texto:
        return texto
    out = texto
    for palavra in sorted(PALAVROES_INTERFACE, key=len, reverse=True):
        out = re.sub(rf"\b{re.escape(palavra)}\b", "[linguagem ofensiva]", out, flags=re.IGNORECASE)
    return out

def tem_valor_comercial(texto: str) -> bool:
    low = (texto or "").lower()
    fortes = sum(1 for t in SINAIS_COMERCIAIS_FORTES if t in low)
    gerais = sum(1 for t in SINAIS_COMERCIAIS if t in low)
    # Uma única menção genérica a "problema", "cliente" etc. não basta.
    return fortes >= 1 or gerais >= 2

def resumir_trecho_curto(texto: str, max_chars: int = 190) -> str:
    """Encurta um turno preservando o texto real, sem reescrever seu conteúdo."""
    texto = sanitizar_texto_interface(re.sub(r"\s+", " ", texto or "").strip())
    if len(texto) <= max_chars:
        return texto
    corte = texto[:max_chars]
    # prefere parar em pontuação ou espaço, evitando corte no meio de palavra.
    pontuacoes = [corte.rfind(p) for p in [".", "!", "?", ",", ";", ":"]]
    ponto = max(pontuacoes)
    if ponto >= max_chars * 0.55:
        return corte[:ponto + 1].strip() + "…"
    espaco = corte.rfind(" ")
    return (corte[:espaco] if espaco >= max_chars * 0.65 else corte).strip() + "…"


def _tem_sinal_resistencia(texto_low: str) -> bool:
    return any(s in texto_low for s in SINAIS_RESISTENCIA)


def _eh_proposta_neutra(texto_low: str) -> bool:
    return any(p in texto_low for p in PADROES_PROPOSTA_NEUTRA)


def normalizar_placeholders(texto: str) -> str:
    texto = re.sub(r"\[PESSOA\]", "[nome]", texto)
    texto = re.sub(r"\[EMPRESA\]", "[empresa]", texto)
    texto = re.sub(r"\[LOCAL\]", "[local]", texto)
    return texto


def limpar_ruido_asr(texto: str) -> str:
    """Camada de limpeza de ruído evidente de ASR (Problema 19). Só remove o
    que é claramente ruído mecânico — nunca reescreve ou remove palavras que
    fazem parte de uma fala real, mesmo que sejam palavrões: ruído evidente é
    "aaaaaaaaaaaaa", pontuação repetida sem sentido, ou caracteres de controle;
    a fala em si nunca é alterada de conteúdo."""
    if not texto:
        return texto
    # colapsa uma letra repetida 5+ vezes seguidas (ruído de áudio/transcrição,
    # ex: "nãaaaaaao" -> "nãaao"), sem apagar a palavra
    texto = re.sub(r"(.)\1{4,}", r"\1\1\1", texto)
    # colapsa pontuação repetida em excesso
    texto = re.sub(r"([!?.,]){3,}", r"\1\1\1", texto)
    # remove caracteres de controle/estranhos que não são pontuação de fala
    texto = re.sub(r"[^\S\n]*[\x00-\x08\x0b\x0c\x0e-\x1f]+", " ", texto)
    return texto


def parse_turnos(transcricao_bruta: str):
    """Quebra a transcrição real em turnos por locutor e classifica a
    confiabilidade da diarização.

    ACHADO SOBRE A BASE REAL: em 92,6% das calls (1087/1174) aparecem mais de
    2 IDs distintos de [LOCUTOR N] — não é uma diarização limpa vendedor/
    cliente, é ruído de diarização automática ou call com múltiplos
    participantes. Por isso NÃO assumimos "LOCUTOR 1 = vendedor" cegamente:
    contamos os turnos por locutor e só tratamos como diálogo de 2 partes
    quando os 2 IDs mais frequentes cobrem >=70% dos turnos (quem fala
    primeiro = vendedor, convenção de quem abre a call). Fora isso, a
    transcrição é devolvida sem atribuição de lado — mais honesto do que
    forçar uma estrutura que o dado não sustenta.

    Retorna (modo, turnos): modo é 'dialogo' | 'bruto' | 'vazio'.
    """
    partes = re.split(r"\[LOCUTOR (\d+)\]:?", transcricao_bruta or "")
    brutos = []
    for i in range(1, len(partes) - 1, 2):
        locutor_num = partes[i]
        texto = normalizar_placeholders(partes[i + 1]).strip()
        texto = limpar_ruido_asr(texto)
        texto = sanitizar_texto_interface(texto)
        texto = re.sub(r"\s+", " ", texto).strip()
        if texto:
            brutos.append((locutor_num, texto))

    if not brutos:
        return "vazio", []

    contagem = Counter(loc for loc, _ in brutos)
    top2_ids = [loc for loc, _ in contagem.most_common(2)]
    cobertura = sum(contagem[i] for i in top2_ids) / len(brutos)

    if len(top2_ids) == 2 and cobertura >= LIMIAR_COBERTURA_DIALOGO:
        vendedor_id = next(loc for loc, _ in brutos if loc in top2_ids)  # 1º a falar
        turnos = [
            {"remetente": "vendedor" if loc == vendedor_id else "cliente", "texto": texto}
            for loc, texto in brutos if loc in top2_ids
        ]
        return "dialogo", turnos

    turnos = [{"remetente": None, "texto": texto} for _, texto in brutos]
    return "bruto", turnos


def detectar_marcador(texto_low: str, remetente=None):
    """Classifica um turno em objeção / negociação / interesse.

    Correção do Problema 4 (objeção atribuída ao vendedor) e do Problema 16
    (detecção puramente por palavra-chave): uma objeção só é reconhecida numa
    fala do CLIENTE e só quando há sinal de resistência, não apenas a
    palavra-chave isolada. Uma estratégia de negociação só é reconhecida numa
    fala do VENDEDOR (é ele quem propõe desconto/prazo/plano). Quando o
    remetente não é conhecido com confiança (transcrição sem diarização
    confiável), não classificamos nada — não inventamos quem falou.
    """
    if remetente not in ("vendedor", "cliente"):
        return None

    if remetente == "cliente":
        for chave, termos in OBJECOES.items():
            if any(t in texto_low for t in termos):
                if _eh_proposta_neutra(texto_low) and not _tem_sinal_resistencia(texto_low):
                    continue
                return {"tipo": "objecao", "chave": chave, "label": LABELS_OBJECAO[chave]}
        if any(t in texto_low for t in INTERESSE_KEYWORDS):
            return {"tipo": "interesse", "chave": "INTERESSE", "label": "Interesse"}

    if remetente == "vendedor":
        for chave, termos in ESTRATEGIAS.items():
            if any(t in texto_low for t in termos):
                return {"tipo": "negociacao", "chave": chave, "label": f"Negociação — {LABELS_ESTRATEGIA[chave]}"}

    return None


def classificar_qualidade(modo: str, turnos: list) -> dict:
    """Qualidade da call orientada por valor comercial.

    Em transcrição bruta, não basta ter texto: só mostramos a call como relevante
    quando há sinais comerciais mínimos. Isso evita expor fragmentos de conversa
    casual como se fossem momentos importantes.
    """
    if modo == "vazio" or not turnos:
        return {"chave": "sem_transcricao", "label": "Sem transcrição disponível"}
    tem_sinal = any(t.get("marcador") for t in turnos)
    tem_comercial = any(tem_valor_comercial(t.get("texto", "")) for t in turnos)
    if modo == "bruto":
        if not tem_comercial:
            return {"chave": "sem_momento_comercial", "label": "Sem momento comercial relevante"}
        return {"chave": "sem_atribuicao", "label": "Trechos comerciais sem atribuição confiável"}
    if not tem_sinal:
        return {"chave": "sem_momento_comercial", "label": "Sem momento comercial identificável"}
    return {"chave": "confiavel", "label": "Conversa confiável"}


def rotulo_risco(antes, depois):
    """Classifica a variação usando o sentido do score: score menor = menos risco."""
    if antes is None or depois is None:
        return None
    if depois < antes:
        return "risco_reduzido"
    if depois > antes:
        return "risco_aumentado"
    return "sem_alteracao"


LABEL_ROTULO_RISCO = {
    "risco_reduzido": "Risco reduzido",
    "risco_aumentado": "Risco aumentado",
    "sem_alteracao": "Sem alteração no risco",
}


def montar_excerto(turnos, max_turnos=14, modo=None):
    """Recorte de leitura.

    Para diálogo confiável, preserva os momentos marcados e o contexto próximo.
    Para transcrição bruta, exibe somente trechos curtos com sinal comercial,
    evitando parágrafos enormes e conversas casuais/fragmentadas.
    """
    if modo == "bruto":
        candidatos = []
        for i, t in enumerate(turnos):
            texto = t.get("texto", "")
            if not texto or not tem_valor_comercial(texto):
                continue
            # Um pequeno contexto do turno anterior ajuda a não cortar a frase
            # no ponto errado, mas mantém cada bloco curto para leitura.
            anterior = turnos[i - 1].get("texto", "") if i > 0 else ""
            bloco = f"{anterior} {texto}".strip() if anterior and len(texto) < 95 else texto
            trecho = resumir_trecho_curto(bloco, 155)
            if len(trecho) >= 35:
                candidatos.append(trecho)
        vistos = set()
        saida = []
        for item in candidatos:
            chave = item.lower()
            if chave in vistos:
                continue
            vistos.add(chave)
            saida.append({"remetente": None, "texto": item})
            if len(saida) >= min(5, max_turnos):
                break
        return saida

    indices_marcados = [i for i, t in enumerate(turnos) if t.get("marcador")]
    if not indices_marcados:
        return [
            {**t, "texto": sanitizar_texto_interface(t.get("texto", ""))}
            for t in turnos[: min(8, len(turnos))]
        ]
    janela = set()
    for i in indices_marcados:
        for j in range(max(0, i - 1), min(len(turnos), i + 2)):
            janela.add(j)
        if len(janela) >= max_turnos:
            break
    indices_final = sorted(janela)[:max_turnos]
    return [
        {**turnos[i], "texto": sanitizar_texto_interface(turnos[i].get("texto", ""))}
        for i in indices_final
    ]


def parse_duracao_minutos(duracao_str):
    if not duracao_str:
        return None
    try:
        partes = [int(p) for p in str(duracao_str).strip().split(":")]
        while len(partes) < 3:
            partes.insert(0, 0)
        h, m, sec = partes[-3:]
        return round(h * 60 + m + sec / 60, 1)
    except Exception:
        return None


def limpar_para_modelo(texto_bruto: str) -> str:
    t = re.sub(r"\[LOCUTOR \d+\]:?", " ", texto_bruto or "")
    t = re.sub(r"\[(PESSOA|EMPRESA|LOCAL)\]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


class BaseRumo:
    """Carrega o dataset real e o modelo uma única vez e mantém, em memória,
    todas as estruturas processadas que a API vai servir."""

    def __init__(self):
        with open(CAMINHO_MODELO, "rb") as f:
            artefato = pickle.load(f)
        self.vectorizer = artefato["vectorizer"]
        self.model = artefato["model"]
        self.metricas_modelo = artefato.get("metricas_modelo_campeao", {})

        registros = []
        with open(CAMINHO_DADOS, encoding="utf-8") as f:
            for linha in f:
                linha = linha.strip()
                if linha:
                    registros.append(json.loads(linha))

        df = pd.DataFrame(registros).reset_index(drop=True)
        df["_uid"] = df.index
        df["DT_MEETING"] = pd.to_datetime(df["DT_MEETING"], errors="coerce")
        df["NOTA_NPS_NUM"] = pd.to_numeric(df["NOTA_NPS"], errors="coerce")
        df = df.sort_values(["CODT", "DT_MEETING"]).reset_index(drop=True)
        df["_uid"] = df.index
        self.data_referencia = df["DT_MEETING"].max()

        self.calls = {}          # uid -> call processada
        self.contas = {}         # codt -> lista de uids (ordem cronológica)
        n_dialogo = n_bruto = n_vazio = 0

        # Score de saúde em lote (uma única vetorização/predição para as 1174
        # calls, em vez de uma chamada ao modelo por call — muito mais rápido
        # no boot da API sem mudar o resultado calculado).
        textos_limpos = [limpar_para_modelo(str(t)) for t in df["ANON_TRANSCRICAO"]]
        scores_lote = self._score_saude_lote(textos_limpos)

        for pos, row in df.iterrows():
            bruta = str(row["ANON_TRANSCRICAO"])
            modo, turnos = parse_turnos(bruta)
            for t in turnos:
                t["marcador"] = detectar_marcador(t["texto"].lower(), t.get("remetente"))

            qualidade = classificar_qualidade(modo, turnos)

            objecoes = sorted({t["marcador"]["chave"] for t in turnos
                                if t.get("marcador") and t["marcador"]["tipo"] == "objecao"})
            estrategias = sorted({t["marcador"]["chave"] for t in turnos
                                   if t.get("marcador") and t["marcador"]["tipo"] == "negociacao"})

            if modo == "dialogo":
                n_dialogo += 1
            elif modo == "bruto":
                n_bruto += 1
            else:
                n_vazio += 1

            uid = int(row["_uid"])
            self.calls[uid] = {
                "uid": uid,
                "idMeeting": int(row["ID_MEETING"]) if pd.notna(row.get("ID_MEETING")) else None,
                "codt": row["CODT"],
                "data": row["DT_MEETING"].strftime("%Y-%m-%d") if pd.notna(row["DT_MEETING"]) else None,
                "dataFormatada": row["DT_MEETING"].strftime("%d/%m/%Y") if pd.notna(row["DT_MEETING"]) else None,
                "duracaoMin": parse_duracao_minutos(row.get("DURACAO_MEETING")),
                "tpRecurso": row["TP_RECURSO"] if pd.notna(row.get("TP_RECURSO")) else None,
                "notaNps": None if pd.isna(row.get("NOTA_NPS_NUM")) else float(row["NOTA_NPS_NUM"]),
                "objecoes": objecoes,
                "estrategias": estrategias,
                "scoreSaude": scores_lote[pos],
                "modoConversa": modo,
                "qualidade": qualidade,
                "mensagensCompletas": turnos,
                "mensagensRecorte": montar_excerto(turnos, modo=modo),
            }
            self.contas.setdefault(row["CODT"], []).append(uid)

        print(f"[RUMO] diálogo confiável: {n_dialogo} | múltiplos falantes: {n_bruto} | sem locutor: {n_vazio}")

        self._construir_contas(df)
        self._construir_tabela_impacto()
        print(f"[RUMO] {len(self.calls)} calls · {len(self.contas)} contas carregadas.")

    def _score_saude(self, texto_limpo):
        if not texto_limpo or len(texto_limpo) < 20:
            return None
        prob = self.model.predict_proba(self.vectorizer.transform([texto_limpo]))[0]
        return round(float(prob[1] if len(prob) > 1 else prob[0]) * 100, 1)

    def _score_saude_lote(self, textos_limpos):
        indices_validos = [i for i, t in enumerate(textos_limpos) if t and len(t) >= 20]
        scores = [None] * len(textos_limpos)
        if not indices_validos:
            return scores
        matriz = self.vectorizer.transform([textos_limpos[i] for i in indices_validos])
        probs = self.model.predict_proba(matriz)
        col_risco = 1 if probs.shape[1] > 1 else 0
        for pos, i in enumerate(indices_validos):
            scores[i] = round(float(probs[pos, col_risco]) * 100, 1)
        return scores

    def _construir_contas(self, df):
        self.contas_info = {}
        for codt, uids in self.contas.items():
            uids_ordenados = sorted(uids, key=lambda u: self.calls[u]["data"] or "")
            calls_conta = [self.calls[u] for u in uids_ordenados]
            ultima, primeira = calls_conta[-1], calls_conta[0]
            linhas_conta = df[df["CODT"] == codt]

            def _primeiro_valor_valido(coluna):
                """Problema 3: nunca inventa segmento/unidade/faturamento.
                Ordem: (1) já veio de row0 — coberto por essa mesma busca —
                (2) qualquer OUTRO registro da MESMA conta que tenha valor
                válido; nunca busca em outra conta; (3) ausência real (None)."""
                for _, r in linhas_conta.iterrows():
                    if pd.notna(r.get(coluna)) and str(r.get(coluna)).strip():
                        return r.get(coluna)
                return None

            virou_cliente = any(c["tpRecurso"] == "customer" for c in calls_conta)
            dias_desde_ultima = (
                (self.data_referencia - pd.to_datetime(ultima["data"])).days if ultima["data"] else None
            )
            # Status inferido por heurística (virou cliente / dias desde a última
            # call). Nunca é um status comercial confirmado pela base — por isso
            # carregamos "statusOrigem": "derivado" junto, e o frontend precisa
            # deixar isso explícito ao usuário (Problema 28).
            if virou_cliente:
                status, status_origem = "ganha", "derivado"
            elif dias_desde_ultima is not None and dias_desde_ultima <= 14:
                status, status_origem = "em_andamento", "derivado"
            elif dias_desde_ultima is not None and dias_desde_ultima <= 60:
                status, status_origem = "aguardando", "derivado"
            elif dias_desde_ultima is not None:
                status, status_origem = "perdida", "derivado"
            else:
                status, status_origem = None, None  # sem data confiável -> não inventa status

            objecoes_ultima = ultima["objecoes"]
            self.contas_info[codt] = {
                "id": codt,
                "codt": codt,
                "empresa": f"Conta {codt}",
                "unidadeTotvs": _primeiro_valor_valido("NOME_UNIDADE"),
                "segmento": _primeiro_valor_valido("NOME_SEGMENTO"),
                "faixaFaturamento": _primeiro_valor_valido("FAIXA_FATURAMENTO_CLIENTE_EC"),
                "uf": _primeiro_valor_valido("UF"),
                "perfilCadastroCompleto": all([
                    _primeiro_valor_valido("NOME_SEGMENTO"),
                    _primeiro_valor_valido("NOME_UNIDADE"),
                    _primeiro_valor_valido("FAIXA_FATURAMENTO_CLIENTE_EC"),
                ]),
                "status": status,
                "statusOrigem": status_origem,
                "totalCalls": len(calls_conta),
                "primeiraCallData": primeira["dataFormatada"],
                "ultimaCallData": ultima["dataFormatada"],
                "ultimaCallUid": ultima["uid"],
                "scoreSaudeAtual": ultima["scoreSaude"],
                "pontoEmAberto": LABELS_OBJECAO.get(objecoes_ultima[0]) if objecoes_ultima else None,
                "objecoesUltimaCall": [LABELS_OBJECAO.get(o, o) for o in objecoes_ultima],
                "uidsCalls": uids_ordenados,
            }

    def _construir_tabela_impacto(self):
        """Camada de impacto histórico: compara o score de saúde de uma call
        com objeção com o score da call seguinte da MESMA conta, quebrado por
        estratégia mencionada nessa call seguinte. 100% real, nada estimado
        por suposição."""
        linhas = []
        for codt, uids in self.contas.items():
            uids_ordenados = sorted(uids, key=lambda u: self.calls[u]["data"] or "")
            for i in range(len(uids_ordenados) - 1):
                atual, prox = self.calls[uids_ordenados[i]], self.calls[uids_ordenados[i + 1]]
                if not atual["objecoes"] or atual["scoreSaude"] is None or prox["scoreSaude"] is None:
                    continue
                delta = atual["scoreSaude"] - prox["scoreSaude"]  # >0 = risco caiu
                estrategias_aplicadas = prox["estrategias"] or ["NENHUMA_ESTRATEGIA_DETECTADA"]
                for estrategia in estrategias_aplicadas:
                    for objecao in atual["objecoes"]:
                        linhas.append({
                            "objecao": objecao, "estrategia": estrategia, "delta": delta,
                            "scoreAntes": atual["scoreSaude"], "scoreDepois": prox["scoreSaude"],
                        })

        df_delta = pd.DataFrame(linhas)
        if df_delta.empty:
            self.tabela_impacto = []
            return

        agrupado = (
            df_delta.groupby(["objecao", "estrategia"])
            .agg(n=("delta", "size"), deltaMedio=("delta", "mean"),
                 scoreAntesMedio=("scoreAntes", "mean"), scoreDepoisMedio=("scoreDepois", "mean"))
            .reset_index()
        )
        self.tabela_impacto = [
            {
                "objecao": r["objecao"], "objecaoLabel": LABELS_OBJECAO.get(r["objecao"], r["objecao"]),
                "estrategia": r["estrategia"],
                "estrategiaLabel": LABELS_ESTRATEGIA.get(r["estrategia"]) if r["estrategia"] != "NENHUMA_ESTRATEGIA_DETECTADA" else None,
                "amostra": int(r["n"]), "impactoPP": round(r["deltaMedio"], 1),
                "scoreRiscoAntes": round(r["scoreAntesMedio"], 1), "scoreRiscoDepois": round(r["scoreDepoisMedio"], 1),
                "confiavel": bool(r["n"] >= 10),
            }
            for _, r in agrupado.iterrows()
        ]

    # -- consultas usadas pela API -----------------------------------------
    def buscar_impacto(self, objecao, estrategia):
        for r in self.tabela_impacto:
            if r["objecao"] == objecao and r["estrategia"] == estrategia:
                return r
        return None

    def sugestoes_para_objecao(self, objecao, top=2):
        candidatos = [r for r in self.tabela_impacto if r["objecao"] == objecao]
        candidatos.sort(key=lambda r: r["impactoPP"], reverse=True)
        return candidatos[:top]

    def montar_contexto_replay(self, codt, call_uid, marcador_tipo, marcador_chave):
        """Monta o contexto REAL e específico de um Replay — nunca o dataset
        inteiro, nunca dados de outra conta (item 7 do briefing). Retorna None
        se a conta/call não existir."""
        conta = self.contas_info.get(codt)
        call = self.calls.get(call_uid)
        if not conta or not call or call["codt"] != codt:
            return None

        turnos = call["mensagensCompletas"]
        idx_marcado = next(
            (i for i, t in enumerate(turnos)
             if t.get("marcador") and t["marcador"]["tipo"] == marcador_tipo
             and t["marcador"]["chave"] == marcador_chave),
            None,
        )
        turno_marcado = turnos[idx_marcado] if idx_marcado is not None else None
        trecho_antes = turnos[max(0, idx_marcado - 2): idx_marcado] if idx_marcado is not None else []
        trecho_depois = turnos[idx_marcado + 1: idx_marcado + 3] if idx_marcado is not None else []

        objecao_label = LABELS_OBJECAO.get(marcador_chave) if marcador_tipo == "objecao" else None

        return {
            "conta": {
                "empresa": conta["empresa"],
                "segmento": conta["segmento"],
                "unidade": conta["unidadeTotvs"],
                "faixaFaturamento": conta["faixaFaturamento"],
                "uf": conta.get("uf"),
                "perfilCadastroCompleto": conta.get("perfilCadastroCompleto", False),
            },
            "call": {
                "data": call["dataFormatada"],
                "modoConversa": call["modoConversa"],
                "qualidade": call["qualidade"]["label"],
            },
            "trechoAntes": [{"remetente": t.get("remetente"), "texto": t["texto"]} for t in trecho_antes],
            "falaMarcada": {
                "remetente": turno_marcado.get("remetente") if turno_marcado else None,
                "texto": turno_marcado["texto"] if turno_marcado else marcador_chave,
            },
            "trechoDepois": [{"remetente": t.get("remetente"), "texto": t["texto"]} for t in trecho_depois],
            "objecaoReal": objecao_label,
            "objecoesDaCall": [LABELS_OBJECAO.get(o, o) for o in call["objecoes"]],
        }

    def funil(self):
        """Contagem de contas por status derivado da própria base."""
        contagens = Counter(
            c["status"] for c in self.contas_info.values() if c.get("status")
        )
        return {
            "em_andamento": int(contagens.get("em_andamento", 0)),
            "aguardando": int(contagens.get("aguardando", 0)),
            "ganha": int(contagens.get("ganha", 0)),
            "perdida": int(contagens.get("perdida", 0)),
            "totalContas": len(self.contas_info),
        }

    def tendencia_analitica(self):
        """Série mensal para o gráfico executivo, calculada somente das calls reais."""
        linhas = []
        for c in self.calls.values():
            if not c.get("data"):
                continue
            linhas.append({"mes": c["data"][:7], "risco": c.get("scoreSaude")})

        if not linhas:
            return []

        df = pd.DataFrame(linhas)
        agrupado = (
            df.groupby("mes")
            .agg(
                calls=("mes", "size"),
                riscoMedio=("risco", "mean"),
            )
            .reset_index()
            .sort_values("mes")
        )
        return [
            {
                "mes": r["mes"],
                "calls": int(r["calls"]),
                "riscoMedio": round(float(r["riscoMedio"]), 1) if pd.notna(r["riscoMedio"]) else None,
            }
            for _, r in agrupado.iterrows()
        ]

    def kpis(self):
        contas_com_status = [c for c in self.contas_info.values() if c["status"]]
        ganhas = sum(1 for c in contas_com_status if c["status"] == "ganha")
        confiaveis = [r for r in self.tabela_impacto if r["confiavel"]]
        soma_amostra = sum(r["amostra"] for r in confiaveis)
        melhoria_media = (
            round(sum(r["impactoPP"] * r["amostra"] for r in confiaveis) / soma_amostra, 2)
            if soma_amostra else None
        )
        return {
            "callsAnalisadas": len(self.calls),
            "contasAnalisadas": len(self.contas_info),
            "contasComStatusDeterminavel": len(contas_com_status),
            "contasGanhas": ganhas,
            "taxaConversao": round(ganhas / len(contas_com_status) * 100, 1) if contas_com_status else None,
            "combinacoesHistoricasConfiaveis": len(confiaveis),
            "totalParesAnalisados": sum(r["amostra"] for r in self.tabela_impacto),
            "melhoriaMediaPonderadaPP": melhoria_media,
        }

    def onde_estou_perdendo(self):
        todas = [o for c in self.calls.values() for o in c["objecoes"]]
        if not todas:
            return []
        freq = pd.Series(todas).value_counts()
        total_calls = len(self.calls)
        return [
            {"chave": chave, "label": LABELS_OBJECAO.get(chave, chave),
             "percentual": round(freq_n / total_calls * 100, 1), "ocorrencias": int(freq_n)}
            for chave, freq_n in freq.items()
        ]

    def o_que_esta_funcionando(self):
        """Problema 20/21: só mostra combinação com estratégia real (nunca
        'NENHUMA_ESTRATEGIA_DETECTADA') e com resultado positivo (risco caiu de
        fato). Resultado negativo ou neutro NÃO é 'o que está funcionando' —
        vai para pontos_de_atencao()."""
        confiaveis = [
            r for r in self.tabela_impacto
            if r["confiavel"] and r["estrategia"] != "NENHUMA_ESTRATEGIA_DETECTADA" and r["impactoPP"] > 0
        ]
        return sorted(confiaveis, key=lambda r: r["impactoPP"], reverse=True)

    def pontos_de_atencao(self):
        """Combinações com amostra confiável onde o risco NÃO caiu (piorou ou
        ficou igual) — inclui também casos sem estratégia identificada na call
        seguinte, mas aqui, honestamente, como 'sem abordagem', nunca como se
        fosse uma estratégia que funciona."""
        itens = [r for r in self.tabela_impacto if r["confiavel"] and r["impactoPP"] <= 0]
        return sorted(itens, key=lambda r: r["impactoPP"])
