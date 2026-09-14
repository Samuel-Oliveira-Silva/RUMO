"""
Preparação de dados para o novo escopo "Replay de Vendas".

Diferente da Sprint 3 (alvo = RISCO_CHURN via NOTA_NPS), aqui o alvo é um
PROXY DE SUCESSO DE NEGOCIAÇÃO, construído a partir de dois sinais reais
presentes na base (nenhum campo de desfecho de negociação existe na fonte,
então o proxy precisa ser derivado com regras explícitas e auditáveis):

  (1) Linguagem de resolução na call seguinte da MESMA conta (CODT), quando
      existe uma objeção detectada na call anterior.
  (2) Variação do NPS real entre duas pesquisas da mesma conta ao longo do
      tempo (quando existir).

Cada registro rotulado carrega a EVIDÊNCIA usada (não é um rótulo cego), para
permitir auditoria manual por amostragem — mesma exigência de honestidade
metodológica adotada na Sprint 3.
"""
import json
import re
from collections import defaultdict

import pandas as pd

# ---------------------------------------------------------------------------
# 1. Carga e limpeza textual (mesmo padrão da Sprint 3)
# ---------------------------------------------------------------------------
def limpar_transcricao(texto):
    if not isinstance(texto, str):
        return ""
    t = re.sub(r'\[LOCUTOR \d+\]:?', ' ', texto)
    t = re.sub(r'\[(PESSOA|EMPRESA|LOCAL)\]', ' ', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t


registros = []
with open("ANON_transcricao.json", encoding="utf-8") as f:
    for linha in f:
        linha = linha.strip()
        if linha:
            registros.append(json.loads(linha))

df = pd.DataFrame(registros)
df["TEXTO_LIMPO"] = df["ANON_TRANSCRICAO"].apply(limpar_transcricao)
df["NOTA_NPS_NUM"] = pd.to_numeric(df["NOTA_NPS"], errors="coerce")
df["DT_MEETING"] = pd.to_datetime(df["DT_MEETING"], errors="coerce")
df = df.sort_values(["CODT", "DT_MEETING"]).reset_index(drop=True)

print(f"Total de reuniões: {len(df)}")
print(f"Contas distintas (CODT): {df['CODT'].nunique()}")

# ---------------------------------------------------------------------------
# 2. Dicionários de negociação (substituem os dicionários de churn/suporte
#    do app.py atual, que eram voltados a pós-venda/atendimento)
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

RESOLUCAO_POSITIVA = ["fechamos", "vamos fechar", "vamos assinar", "combinado",
                       "aprovado", "de acordo", "pode enviar o contrato",
                       "vamos seguir", "confirma a proposta", "aceita a proposta",
                       "topa", "vamos avançar"]

RESOLUCAO_NEGATIVA = ["não vamos seguir", "vamos cancelar", "não é mais prioridade",
                       "decidimos não avançar", "outro fornecedor", "vamos pausar",
                       "sem previsão", "não faz sentido para nós agora",
                       "vamos encerrar", "não vamos renovar"]


def detectar_categorias(texto_low, dicionario):
    return sorted([cat for cat, termos in dicionario.items() if any(t in texto_low for t in termos)])


def detectar_sinal_resolucao(texto_low):
    pos = any(t in texto_low for t in RESOLUCAO_POSITIVA)
    neg = any(t in texto_low for t in RESOLUCAO_NEGATIVA)
    if pos and not neg:
        return 1
    if neg and not pos:
        return 0
    return None  # ambíguo/sem sinal — não rotula


df["texto_low"] = df["TEXTO_LIMPO"].str.lower()
df["objecoes"] = df["texto_low"].apply(lambda t: detectar_categorias(t, OBJECOES))
df["estrategias"] = df["texto_low"].apply(lambda t: detectar_categorias(t, ESTRATEGIAS))
df["sinal_resolucao"] = df["texto_low"].apply(detectar_sinal_resolucao)

# ---------------------------------------------------------------------------
# 3. Derivação do PROXY_SUCESSO por par de calls consecutivas da mesma conta
# ---------------------------------------------------------------------------
linhas_rotuladas = []
for codt, grupo in df.groupby("CODT"):
    grupo = grupo.reset_index(drop=True)
    for i in range(len(grupo) - 1):
        atual, proxima = grupo.loc[i], grupo.loc[i + 1]
        if not atual["objecoes"]:
            continue  # só rotulamos quando havia objeção explícita a resolver

        rotulo, evidencia = None, None
        if proxima["sinal_resolucao"] == 1:
            rotulo, evidencia = 1, "linguagem_positiva_call_seguinte"
        elif proxima["sinal_resolucao"] == 0:
            rotulo, evidencia = 0, "linguagem_negativa_call_seguinte"
        elif pd.notna(atual["NOTA_NPS_NUM"]) and pd.notna(proxima["NOTA_NPS_NUM"]):
            if proxima["NOTA_NPS_NUM"] > atual["NOTA_NPS_NUM"]:
                rotulo, evidencia = 1, "melhora_nps_entre_calls"
            elif proxima["NOTA_NPS_NUM"] < atual["NOTA_NPS_NUM"]:
                rotulo, evidencia = 0, "piora_nps_entre_calls"

        if rotulo is not None:
            linhas_rotuladas.append({
                "CODT": codt,
                "ID_MEETING": atual["ID_MEETING"],
                "ID_MEETING_SEGUINTE": proxima["ID_MEETING"],
                "TEXTO_LIMPO": atual["TEXTO_LIMPO"],
                "objecoes": atual["objecoes"],
                "estrategias_call_seguinte": proxima["estrategias"],
                "SUCESSO_NEGOCIACAO": rotulo,
                "evidencia": evidencia,
            })

df_rotulado = pd.DataFrame(linhas_rotuladas)
print(f"\nPares call-atual/call-seguinte rotulados: {len(df_rotulado)}")
if len(df_rotulado):
    print(df_rotulado["SUCESSO_NEGOCIACAO"].value_counts(normalize=True).rename("proporcao"))
    print("\nEvidência utilizada:")
    print(df_rotulado["evidencia"].value_counts())

df_rotulado.to_pickle("df_rotulado.pkl")
df.to_pickle("df_completo.pkl")
