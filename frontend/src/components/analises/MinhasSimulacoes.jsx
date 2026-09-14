import { useState } from "react";
import { X, TrendingDown, TrendingUp, Minus, Sparkles } from "lucide-react";
import EmptyState from "../ui/EmptyState";

const RISCO_UI = {
  risco_reduzido: { label: "Risco reduzido", classes: "bg-brand-50 text-brand-700", Icon: TrendingDown },
  risco_aumentado: { label: "Risco aumentado", classes: "bg-red-50 text-red-600", Icon: TrendingUp },
  sem_alteracao: { label: "Sem alteração", classes: "bg-mist-strong text-ink-soft", Icon: Minus },
};

function calcularVariacaoRisco(item) {
  const antes = item?.scoreRiscoAntes;
  const depois = item?.scoreRiscoDepois;
  if (typeof antes === "number" && typeof depois === "number") {
    return Number((depois - antes).toFixed(1));
  }
  if (typeof item?.variacaoRiscoPP === "number") return item.variacaoRiscoPP;
  return null;
}

function calcularRotuloRisco(item) {
  const variacao = calcularVariacaoRisco(item);
  if (variacao == null) return null;
  if (variacao < 0) return "risco_reduzido";
  if (variacao > 0) return "risco_aumentado";
  return "sem_alteracao";
}

function RiscoTag({ item, chave }) {
  const chaveCalculada = calcularRotuloRisco(item) || chave;
  if (!chaveCalculada) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-mist-strong px-2.5 py-1 text-xs font-semibold text-ink-faint">
        Sem dados suficientes
      </span>
    );
  }
  const t = RISCO_UI[chaveCalculada] || RISCO_UI.sem_alteracao;
  const Icon = t.Icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${t.classes}`}>
      <Icon size={12} strokeWidth={2.5} /> {t.label}
    </span>
  );
}


export function MeusReplays({ replays, onAbrir }) {
  if (replays.length === 0) {
    return (
      <section>
        <h2 className="font-display text-lg font-semibold text-ink">Meus Replays</h2>
        <div className="mt-4">
          <EmptyState
            icon={Sparkles}
            titulo="Nenhum Replay salvo ainda"
            descricao='Abra uma negociação, clique em um momento e depois em "Simular" para começar.'
          />
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="font-display text-lg font-semibold text-ink">Meus Replays</h2>
      <div className="mt-4 flex flex-col gap-2.5">
        {replays.map((r) => (
          <button
            key={r.id}
            onClick={() => onAbrir(r)}
            className="flex items-center justify-between gap-4 rounded-xl border border-line bg-paper px-4 py-3 text-left hover:border-line-strong"
          >
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold text-ink">{r.empresa}</p>
              <p className="truncate text-xs text-ink-soft">{r.situacao} · {r.dataCall || r.criadoEm}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <RiscoTag item={r} chave={r.simulacao?.rotuloRisco} />
              {calcularVariacaoRisco(r) != null && (
                <span className={`text-sm font-semibold ${calcularVariacaoRisco(r) < 0 ? "text-brand-700" : calcularVariacaoRisco(r) > 0 ? "text-red-600" : "text-ink-soft"}`}>
                  {calcularVariacaoRisco(r) > 0 ? "+" : ""}
                  {calcularVariacaoRisco(r)}pp
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export function OriginalXSimulacaoModal({ replay, onFechar }) {
  const [aberta, setAberta] = useState(true);
  if (!replay || !aberta) return null;

  const historicoSimulado = replay.simulacao?.historico || [];
  const respostasCliente = historicoSimulado.filter((m) => m.role === "assistant");

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4">
      <div className="animate-rise flex max-h-[92vh] w-full max-w-lg flex-col overflow-y-auto rounded-t-2xl bg-paper p-5 shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Original × Simulação</h2>
          <button
            onClick={() => {
              setAberta(false);
              onFechar?.();
            }}
            className="text-ink-faint hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mt-0.5 text-sm text-ink-soft">{replay.empresa} · {replay.situacao}</p>

        <div className="mt-5 space-y-4">
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-faint">Call real</p>
            <div className="rounded-xl bg-mist-strong px-4 py-3 text-sm text-ink">“{replay.original?.texto}”</div>
            {replay.original?.objecaoReal && (
              <p className="mt-1 text-xs text-ink-faint">Objeção real: {replay.original.objecaoReal}</p>
            )}
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-faint">Sua nova abordagem</p>
            <div className="rounded-xl bg-brand-600 px-4 py-3 text-sm text-white">
              {replay.simulacao?.novaAbordagem || replay.novaAbordagem}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-faint">Cliente — Simulação</p>
            <div className="space-y-2">
              {respostasCliente.length === 0 ? (
                <p className="text-xs text-ink-faint">Sem histórico de conversa salvo para este Replay.</p>
              ) : (
                respostasCliente.map((m, i) => (
                  <div key={i} className="rounded-xl bg-mist-strong px-4 py-3 text-sm text-ink">
                    {m.content}
                  </div>
                ))
              )}
            </div>
            <div className="mt-2"><RiscoTag item={replay} chave={replay.simulacao?.rotuloRisco} /></div>
          </div>

          <div className="rounded-2xl bg-ink px-5 py-5 text-center text-white">
            {typeof replay.scoreRiscoAntes === "number" ? (
              <p className="font-display text-2xl font-semibold">
                {replay.scoreRiscoAntes}% → {replay.scoreRiscoDepois}%
              </p>
            ) : (
              <p className="font-display text-lg font-semibold">Sem dados suficientes</p>
            )}
            {calcularVariacaoRisco(replay) != null && (
              <p className="mt-1 text-sm text-white/70">
                {calcularVariacaoRisco(replay) > 0 ? "+" : ""}
                {calcularVariacaoRisco(replay)} p.p. de variação no risco ({replay.amostraHistorica} calls reais comparáveis)
              </p>
            )}
            <p className="mt-3 text-xs text-white/60">
              Evidência histórica de calls reais semelhantes — não é uma previsão garantida desta conversa simulada.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
