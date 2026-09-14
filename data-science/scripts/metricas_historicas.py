"""
Camada 2 — reaproveita o modelo REAL da Sprint 3 (TF-IDF + RF, treinado sobre
NOTA_NPS real) como "score de saúde da negociação" por call. É o único rótulo
verdadeiro disponível na base; não inventamos um novo alvo de "sucesso de
negociação" via keyword-matching (ver nota abaixo sobre por que essa via foi
descartada).

Camada 4 — usa esse score, real e comparável, para calcular o indicador
histórico "quando o vendedor menciona a estratégia X na call seguinte a uma
objeção, o score de risco sobe ou desce, em média, e com que amostra?".
Isso é o número real por trás de algo como "Alterar prazo -> +18%".
"""
import pickle
import warnings

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")

with open("modelo_totvs_sprint3.pkl", "rb") as f:
    artefato = pickle.load(f)
vectorizer, model = artefato["vectorizer"], artefato["model"]

df = pd.read_pickle("df_completo.pkl")


def score_risco(texto: str) -> float:
    if not texto or len(texto) < 20:
        return np.nan
    prob = model.predict_proba(vectorizer.transform([texto]))[0]
    return float(prob[1] if len(prob) > 1 else prob[0])


df["score_risco"] = df["TEXTO_LIMPO"].apply(score_risco)

# ---------------------------------------------------------------------------
# Camada 4: delta real de score entre call-com-objeção e a call seguinte,
# quebrado por estratégia mencionada na call seguinte.
# ---------------------------------------------------------------------------
linhas = []
for codt, grupo in df.groupby("CODT"):
    grupo = grupo.reset_index(drop=True)
    for i in range(len(grupo) - 1):
        atual, prox = grupo.loc[i], grupo.loc[i + 1]
        if not atual["objecoes"]:
            continue
        if pd.isna(atual["score_risco"]) or pd.isna(prox["score_risco"]):
            continue
        delta = atual["score_risco"] - prox["score_risco"]  # >0 = risco caiu
        estrategias_aplicadas = prox["estrategias"] or ["NENHUMA_ESTRATEGIA_DETECTADA"]
        for estrategia in estrategias_aplicadas:
            for objecao in atual["objecoes"]:
                linhas.append({
                    "objecao": objecao,
                    "estrategia": estrategia,
                    "delta_score_risco": delta,
                    "score_antes": atual["score_risco"],
                    "score_depois": prox["score_risco"],
                })

df_delta = pd.DataFrame(linhas)
print(f"Pares objeção -> estratégia com score comparável: {len(df_delta)}")

tabela_impacto = (
    df_delta.groupby(["objecao", "estrategia"])
    .agg(n=("delta_score_risco", "size"),
         delta_medio=("delta_score_risco", "mean"),
         score_antes_medio=("score_antes", "mean"),
         score_depois_medio=("score_depois", "mean"))
    .reset_index()
    .sort_values(["objecao", "delta_medio"], ascending=[True, False])
)
print(tabela_impacto.to_string(index=False))

tabela_impacto.to_pickle("tabela_impacto_historico.pkl")
df.to_pickle("df_completo_scored.pkl")
