import { useState } from "react";
import { X, Send, TrendingDown, TrendingUp, Minus, AlertTriangle } from "lucide-react";
import { api } from "../../lib/api";
import { OPCOES_ABORDAGEM } from "./reacoes";

// Rótulos honestos de variação de risco (nunca "avançou"/"perdida" — o score
// do modelo é risco, não taxa de sucesso; ver processamento.rotulo_risco).
const RISCO_UI = {
  risco_reduzido: { label: "Risco reduzido", classes: "bg-brand-50 text-brand-700", Icon: TrendingDown },
  risco_aumentado: { label: "Risco aumentado", classes: "bg-red-50 text-red-600", Icon: TrendingUp },
  sem_alteracao: { label: "Sem alteração no risco", classes: "bg-mist-strong text-ink-soft", Icon: Minus },
};

function RiscoTag({ chave }) {
  if (!chave) return <span className="mt-1 inline-block text-xs text-ink-faint">Sem dados suficientes</span>;
  const t = RISCO_UI[chave] || RISCO_UI.sem_alteracao;
  const Icon = t.Icon;
  return (
    <div className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${t.classes}`}>
      <Icon size={14} strokeWidth={2.5} />
      {t.label}
    </div>
  );
}

export default function SimulacaoPanel({ codt, call, mensagem, onFechar }) {
  const [etapa, setEtapa] = useState("opcoes"); // opcoes | chat | resultado
  const [textoProprio, setTextoProprio] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const [sessaoId, setSessaoId] = useState(null);
  const [contextoReal, setContextoReal] = useState(null);
  const [novaAbordagem, setNovaAbordagem] = useState(null); // { estrategia, estrategiaLabel, texto }
  const [historico, setHistorico] = useState([]); // [{role: 'user'|'assistant', content}]
  const [proximaMensagem, setProximaMensagem] = useState("");
  const [evidenciaHistorica, setEvidenciaHistorica] = useState(null);
  const [resultadoFinal, setResultadoFinal] = useState(null);

  const marcador = mensagem.marcador;

  async function iniciar(estrategia) {
    setCarregando(true);
    setErro(null);
    try {
      const resp = await api.iniciarSimulacao({
        codt,
        callUid: call.uid,
        marcadorTipo: marcador.tipo,
        marcadorChave: marcador.chave,
        marcadorLabel: marcador.label,
        estrategia,
        textoProprio: estrategia === "propria" ? textoProprio.trim() : null,
      });
      setSessaoId(resp.sessaoId);
      setContextoReal(resp.contextoReal);
      setNovaAbordagem(resp.novaAbordagem);
      setHistorico(resp.historicoSimulacao);
      setEvidenciaHistorica(resp.evidenciaHistorica);
      setEtapa("chat");
    } catch (e) {
      setErro(e.message || "O cliente virtual não pôde responder agora. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  async function enviarMensagem() {
    const texto = proximaMensagem.trim();
    if (!texto || carregando) return;
    setCarregando(true);
    setErro(null);
    // otimista: já mostra a fala do vendedor enquanto espera o Grok
    setHistorico((h) => [...h, { role: "user", content: texto }]);
    setProximaMensagem("");
    try {
      const resp = await api.enviarMensagemSimulacao({ sessaoId, texto });
      setHistorico(resp.historicoSimulacao);
    } catch (e) {
      setErro(e.message || "O cliente virtual não pôde responder agora. Tente novamente.");
      setHistorico((h) => h.slice(0, -1)); // desfaz a fala otimista, já que não houve resposta
      setProximaMensagem(texto);
    } finally {
      setCarregando(false);
    }
  }

  async function finalizar() {
    setCarregando(true);
    setErro(null);
    try {
      const resp = await api.finalizarSimulacao({ sessaoId });
      setResultadoFinal(resp);
      setEtapa("resultado");
    } catch (e) {
      setErro(e.message || "Não foi possível finalizar o Replay agora.");
    } finally {
      setCarregando(false);
    }
  }

  async function handleSalvar() {
    setSalvando(true);
    try {
      const rotulo = evidenciaHistorica?.rotuloRisco || null;
      await api.salvarReplay({
        codt,
        empresa: `Conta ${codt}`,
        situacao: marcador.label,
        callUid: call.uid,
        dataCall: call.data,
        original: {
          texto: resultadoFinal.situacaoOriginal.texto,
          objecaoReal: resultadoFinal.situacaoOriginal.objecaoReal,
        },
        simulacao: {
          novaAbordagem: novaAbordagem.texto,
          historico: historico,
          rotuloRisco: rotulo,
        },
        novaAbordagem: novaAbordagem.estrategiaLabel,
        impactoPP: evidenciaHistorica?.impactoPP ?? null,
        variacaoRiscoPP: evidenciaHistorica?.variacaoRiscoPP ?? null,
        scoreRiscoAntes: evidenciaHistorica?.scoreRiscoAntes ?? null,
        scoreRiscoDepois: evidenciaHistorica?.scoreRiscoDepois ?? null,
        amostraHistorica: evidenciaHistorica?.amostra ?? 0,
        fonte: evidenciaHistorica?.scoreRiscoAntes != null ? "historico_real" : "sem_evidencia_suficiente",
      });
      onFechar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4">
      <div className="animate-rise flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-paper shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-base font-semibold text-ink">
            {etapa === "resultado" ? "Original × Simulação" : "E se você tivesse feito diferente?"}
          </h2>
          <button type="button" onClick={onFechar} className="text-ink-faint hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {erro && (
            <div className="mb-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <p>{erro}</p>
            </div>
          )}

          {etapa === "opcoes" && (
            <>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
                Momento real da call
              </p>
              <div className="rounded-xl bg-mist-strong px-4 py-3 text-sm text-ink">
                <span className="font-medium text-ink-soft">
                  {mensagem.remetente === "vendedor" ? "Vendedor: " : mensagem.remetente === "cliente" ? "Cliente: " : ""}
                </span>
                “{mensagem.texto}”
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
                {marcador.label}
              </div>

              <p className="mb-2 mt-6 text-xs font-medium uppercase tracking-wide text-ink-faint">
                Sua nova abordagem
              </p>
              <div className="flex flex-col gap-2">
                {OPCOES_ABORDAGEM.map((o) => (
                  <button
                    key={o.chave}
                    type="button"
                    disabled={carregando}
                    onClick={() => o.chave !== "propria" && iniciar(o.chave)}
                    className="rounded-xl border border-line px-4 py-3 text-left text-sm font-medium text-ink transition-colors hover:border-brand-500 hover:bg-brand-50/40 disabled:opacity-50"
                  >
                    {o.label}
                  </button>
                ))}
                <div className="rounded-xl border border-line px-4 py-3">
                  <textarea
                    value={textoProprio}
                    onChange={(e) => setTextoProprio(e.target.value)}
                    placeholder="Ou escreva o que você diria..."
                    rows={2}
                    className="w-full resize-none text-sm text-ink placeholder:text-ink-faint focus:outline-none"
                  />
                  {textoProprio.trim() && (
                    <button
                      type="button"
                      disabled={carregando}
                      onClick={() => iniciar("propria")}
                      className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50"
                    >
                      Usar esta resposta <Send size={12} />
                    </button>
                  )}
                </div>
                {carregando && <p className="text-center text-xs text-ink-faint">Cliente está pensando…</p>}
              </div>
            </>
          )}

          {etapa === "chat" && (
            <div className="space-y-3">
              <div className="rounded-lg bg-mist-strong px-3 py-2 text-xs leading-relaxed text-ink-faint">
                {contextoReal?.objecaoReal || marcador.label} — o trecho real acima é da transcrição; tudo abaixo é
                a conversa simulada com o cliente virtual.
              </div>
              {historico.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === "user"
                      ? "ml-auto rounded-tr-sm bg-brand-600 text-white"
                      : "rounded-tl-sm bg-mist-strong text-ink"
                  }`}
                >
                  {m.content}
                </div>
              ))}
              {carregando && (
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-mist-strong px-4 py-2.5 text-sm text-ink-faint">
                  Cliente está pensando…
                </div>
              )}

              <div className="sticky bottom-0 mt-4 flex items-center gap-2 border-t border-line bg-paper pt-3">
                <input
                  value={proximaMensagem}
                  onChange={(e) => setProximaMensagem(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && enviarMensagem()}
                  disabled={carregando}
                  placeholder="Continuar conversa..."
                  className="flex-1 rounded-xl border border-line px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand-500 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={enviarMensagem}
                  disabled={carregando || !proximaMensagem.trim()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40"
                >
                  <Send size={15} />
                </button>
              </div>
              <button
                type="button"
                onClick={finalizar}
                disabled={carregando}
                className="w-full rounded-xl bg-ink py-2.5 text-sm font-semibold text-white hover:bg-ink/90 disabled:opacity-50"
              >
                Finalizar Replay
              </button>
            </div>
          )}

          {etapa === "resultado" && resultadoFinal && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Call real</p>
              <div className="mt-1 rounded-xl bg-mist-strong px-4 py-3 text-sm text-ink">
                “{resultadoFinal.situacaoOriginal.texto}”
              </div>
              {resultadoFinal.situacaoOriginal.objecaoReal && (
                <p className="mt-1 text-xs text-ink-faint">
                  Objeção real: {resultadoFinal.situacaoOriginal.objecaoReal}
                </p>
              )}

              <p className="mt-5 text-xs font-medium uppercase tracking-wide text-ink-faint">Sua nova abordagem</p>
              <div className="mt-1 rounded-xl bg-brand-600 px-4 py-3 text-sm text-white">
                {novaAbordagem?.texto}
              </div>

              <p className="mt-5 text-xs font-medium uppercase tracking-wide text-ink-faint">Cliente — Simulação</p>
              <div className="mt-1 space-y-2">
                {historico
                  .filter((m) => m.role === "assistant")
                  .map((m, i) => (
                    <div key={i} className="rounded-xl bg-mist-strong px-4 py-3 text-sm text-ink">
                      {m.content}
                    </div>
                  ))}
              </div>

              <div className="mt-6 rounded-2xl border border-line px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Evidência histórica</p>
                {evidenciaHistorica?.scoreRiscoAntes != null ? (
                  <>
                    <p className="mt-2 font-display text-lg font-semibold text-ink">
                      {evidenciaHistorica.scoreRiscoAntes}% → {evidenciaHistorica.scoreRiscoDepois}%
                    </p>
                    <RiscoTag chave={evidenciaHistorica.rotuloRisco} />
                    {typeof evidenciaHistorica.variacaoRiscoPP === "number" && (
                      <p className="mt-1 text-sm font-semibold text-ink">
                        {evidenciaHistorica.variacaoRiscoPP > 0 ? "+" : ""}
                        {evidenciaHistorica.variacaoRiscoPP} p.p. de variação no risco
                      </p>
                    )}
                    <p className="mt-2 text-xs text-ink-faint">
                      Baseado em {evidenciaHistorica.amostra} calls reais comparáveis nesta base — objeção +
                      estratégia semelhantes, não esta conversa simulada.
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-ink-soft">
                    Sem dados suficientes na base para estimar um impacto numérico nessa combinação.
                  </p>
                )}
                <p className="mt-3 text-xs italic text-ink-faint">{resultadoFinal.aviso}</p>
              </div>

              <div className="mt-6 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleSalvar}
                  disabled={salvando}
                  className="rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {salvando ? "Salvando…" : "Salvar Replay"}
                </button>
                <button
                  type="button"
                  onClick={onFechar}
                  className="rounded-xl border border-line py-2.5 text-sm font-medium text-ink-soft hover:border-line-strong"
                >
                  Voltar para negociação
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
