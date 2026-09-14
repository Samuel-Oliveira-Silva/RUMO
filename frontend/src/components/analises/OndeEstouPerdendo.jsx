import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";

export default function OndeEstouPerdendo({ itens }) {
  const [aberto, setAberto] = useState(null);
  const [contasPorObjecao, setContasPorObjecao] = useState({});

  async function alternar(chave, label) {
    if (aberto === chave) {
      setAberto(null);
      return;
    }
    setAberto(chave);
    if (!contasPorObjecao[chave]) {
      const resp = await api.listarContas({ objecao: label, tamanhoPagina: 5 });
      setContasPorObjecao((atual) => ({ ...atual, [chave]: resp.itens }));
    }
  }

  if (!itens || itens.length === 0) {
    return (
      <section>
        <h2 className="font-display text-lg font-semibold text-ink">Onde estou perdendo</h2>
        <p className="mt-2 text-sm text-ink-faint">Sem dados suficientes para identificar objeções recorrentes.</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="font-display text-lg font-semibold text-ink">Radar de resistência</h2>
      <p className="mt-1 text-sm text-ink-soft">Frequência real das principais objeções nas calls analisadas. Clique em uma delas para abrir as contas relacionadas.</p>

      <div className="mt-4 flex flex-col gap-2">
        {itens.map((o) => {
          const estaAberto = aberto === o.chave;
          const contas = contasPorObjecao[o.chave] || [];
          return (
            <div key={o.chave} className="rounded-xl border border-line bg-paper">
              <button
                type="button"
                onClick={() => alternar(o.chave, o.label)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <span className="w-40 shrink-0 text-sm font-medium text-ink sm:w-52">{o.label}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-mist-strong">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${o.percentual}%` }} />
                </div>
                <span className="w-12 shrink-0 text-right text-sm font-semibold text-ink">{o.percentual}%</span>
                <ChevronDown
                  size={15}
                  className={`shrink-0 text-ink-faint transition-transform ${estaAberto ? "rotate-180" : ""}`}
                />
              </button>
              {estaAberto && (
                <div className="animate-rise border-t border-line px-4 py-3">
                  <p className="mb-2 text-xs text-ink-faint">
                    {o.ocorrencias} ocorrências reais na base · algumas contas com essa objeção em aberto:
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {contas.length === 0 && <p className="text-xs text-ink-faint">Carregando…</p>}
                    {contas.map((n) => (
                      <Link key={n.id} to={`/app/negociacoes/${n.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                        {n.empresa}
                      </Link>
                    ))}
                  </div>
                  <Link
                    to={`/app/negociacoes?objecao=${encodeURIComponent(o.chave)}`}
                    className="mt-3 inline-flex text-xs font-semibold text-brand-700 hover:underline"
                  >
                    Ver todas as negociações com esta objeção →
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
