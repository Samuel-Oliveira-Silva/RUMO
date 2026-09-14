import pickle

import pandas as pd

from preparar_dados import OBJECOES, ESTRATEGIAS  # reaproveita os dicionários já validados

with open("modelo_totvs_sprint3.pkl", "rb") as f:
    art_sprint3 = pickle.load(f)

tabela_impacto = pd.read_pickle("tabela_impacto_historico.pkl")

# Filtra combinações com amostra mínima confiável (n >= 10) — abaixo disso,
# a API deve recorrer à simulação por perturbação textual (camada 3), não a
# este número histórico, e sinalizar "baixa confiança" ao vendedor.
tabela_impacto["confiavel"] = tabela_impacto["n"] >= 10

artefato_final = {
    "vectorizer": art_sprint3["vectorizer"],
    "model": art_sprint3["model"],
    "limiar_decisao": art_sprint3["limiar_decisao"],
    "metricas_modelo_saude": art_sprint3["metricas_modelo_campeao"],
    "objecoes_dicionario": OBJECOES,
    "estrategias_dicionario": ESTRATEGIAS,
    "tabela_impacto_historico": tabela_impacto.to_dict(orient="records"),
    "nota_metodologica": (
        "Score de saude reaproveita o modelo real da Sprint 3 (TF-IDF + Random "
        "Forest, alvo = NOTA_NPS<=6). A tabela de impacto historico e calculada "
        "a partir de pares reais de calls consecutivas da mesma conta (CODT) "
        "onde uma objecao foi detectada na call N e uma estrategia foi "
        "mencionada na call N+1; delta = score_risco(N) - score_risco(N+1). "
        "Combinacoes com n<10 sao marcadas como 'confiavel: False' e devem ser "
        "complementadas pela simulacao por perturbacao textual (ver simulador.py)."
    ),
}

with open("modelo_replay_vendas.pkl", "wb") as f:
    pickle.dump(artefato_final, f)

print("Artefato final salvo: modelo_replay_vendas.pkl")
print("Chaves:", list(artefato_final.keys()))
print("Combinações confiáveis (n>=10):", sum(1 for r in artefato_final["tabela_impacto_historico"] if r["confiavel"]))
print("Combinações de baixa confiança (n<10):", sum(1 for r in artefato_final["tabela_impacto_historico"] if not r["confiavel"]))
