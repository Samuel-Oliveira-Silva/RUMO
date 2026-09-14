const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function pedir(caminho, opcoes = {}) {
  const resp = await fetch(`${API_BASE}${caminho}`, {
    headers: { "Content-Type": "application/json" },
    ...opcoes,
  });
  if (!resp.ok) {
    const corpo = await resp.json().catch(() => ({}));
    throw new Error(corpo.detail || `Erro ao chamar ${caminho} (${resp.status})`);
  }
  return resp.json();
}

export const api = {
  health: () => pedir("/health"),

  listarContas: ({ busca, status, objecao, pagina = 1, tamanhoPagina = 30 } = {}) => {
    const params = new URLSearchParams();
    if (busca) params.set("busca", busca);
    if (Array.isArray(status)) {
      const valores = status.filter((v) => v && v !== "todas");
      if (valores.length) params.set("status", valores.join(","));
    } else if (status && status !== "todas") {
      params.set("status", status);
    }
    if (Array.isArray(objecao)) {
      const valores = objecao.filter(Boolean);
      if (valores.length) params.set("objecao", valores.join(","));
    } else if (objecao) {
      params.set("objecao", objecao);
    }
    params.set("pagina", pagina);
    params.set("tamanhoPagina", tamanhoPagina);
    return pedir(`/contas?${params.toString()}`);
  },

  detalheConta: (codt) => pedir(`/contas/${encodeURIComponent(codt)}`),
  timelineConta: (codt) => pedir(`/contas/${encodeURIComponent(codt)}/timeline`),
  preparacaoConta: (codt) => pedir(`/contas/${encodeURIComponent(codt)}/preparacao`),

  resumoAnalises: () => pedir("/analises/resumo"),
  oportunidades: () => pedir("/oportunidades"),

  // Replay multiturno com o cliente virtual (Grok via GroqCloud no backend)
  iniciarSimulacao: (payload) => pedir("/simulacao", { method: "POST", body: JSON.stringify(payload) }),
  enviarMensagemSimulacao: (payload) => pedir("/simulacao/mensagem", { method: "POST", body: JSON.stringify(payload) }),
  finalizarSimulacao: (payload) => pedir("/simulacao/finalizar", { method: "POST", body: JSON.stringify(payload) }),

  listarReplays: () => pedir("/replays"),
  salvarReplay: (payload) => pedir("/replays", { method: "POST", body: JSON.stringify(payload) }),
  removerReplay: (id) => pedir(`/replays/${id}`, { method: "DELETE" }),

  chat: (payload) => pedir("/chat", { method: "POST", body: JSON.stringify(payload) }),
};
