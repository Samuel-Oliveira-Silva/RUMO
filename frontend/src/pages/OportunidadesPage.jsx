import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Users2, Sparkles } from "lucide-react";
import { api } from "../lib/api";

const TOM_POR_TIPO = {
  objecao_principal: { bg: "bg-red-50", text: "text-red-600", Icon: AlertCircle },
  concorrencia: { bg: "bg-amber-50", text: "text-amber-600", Icon: Users2 },
  melhor_estrategia: { bg: "bg-brand-50", text: "text-brand-700", Icon: Sparkles },
};

export default function OportunidadesPage() {
  const navigate = useNavigate();
  const [itens, setItens] = useState(null);
  const [status, setStatus] = useState("carregando");

  useEffect(() => {
    let ativo = true;
    api
      .oportunidades()
      .then((r) => ativo && (setItens(r.itens), setStatus("pronto")))
      .catch(() => ativo && setStatus("erro"));
    return () => {
      ativo = false;
    };
  }, []);

  if (status === "carregando") return <div className="px-8 py-10 text-sm text-ink-faint">Carregando oportunidades…</div>;
  if (status === "erro") return <div className="px-8 py-10 text-sm text-red-600">Não foi possível carregar as oportunidades.</div>;

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Oportunidades</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Situações identificadas a partir das suas negociações reais.
      </p>

      {itens.length === 0 ? (
        <p className="mt-6 text-sm text-ink-faint">Sem dados suficientes para sugerir oportunidades ainda.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {itens.map((item, i) => {
            const tom = TOM_POR_TIPO[item.tipo] || TOM_POR_TIPO.melhor_estrategia;
            const Icon = tom.Icon;
            return (
              <div key={i} className="rounded-2xl border border-line bg-paper p-5">
                <div className="flex items-center gap-2">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full ${tom.bg} ${tom.text}`}>
                    <Icon size={14} />
                  </span>
                  <p className="font-display text-base font-semibold text-ink">{item.titulo}</p>
                </div>

                <div className="mt-3">
                  <p className="text-sm text-ink-soft">{item.descricao}</p>

                  {item.tipo === "objecao_principal" && (
                    <>
                      {item.melhorAbordagem ? (
                        <>
                          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-ink-faint">
                            Melhor abordagem testada na base
                          </p>
                          <p className="text-sm font-medium text-ink">{item.melhorAbordagem}</p>
                          <p className={`mt-1 text-sm font-semibold ${item.impactoPP >= 0 ? "text-brand-700" : "text-red-600"}`}>
                            {item.impactoPP >= 0 ? "+" : ""}
                            {item.impactoPP} p.p. no risco estimado
                          </p>
                        </>
                      ) : (
                        <p className="mt-2 text-xs text-ink-faint">Sem dados suficientes para uma abordagem recomendada ainda.</p>
                      )}
                      <button
                        type="button"
                        onClick={() => navigate("/app/negociacoes")}
                        className="mt-4 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700"
                      >
                        Ver negociações
                      </button>
                    </>
                  )}

                  {item.tipo === "concorrencia" && (
                    <>
                      <p className="mt-2 text-sm font-medium text-ink">
                        {item.quantidade} negociações identificadas com essa objeção em aberto
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate("/app/negociacoes")}
                        className="mt-4 rounded-full border border-line px-4 py-2 text-xs font-semibold text-ink-soft hover:border-line-strong"
                      >
                        Ver negociações
                      </button>
                    </>
                  )}

                  {item.tipo === "melhor_estrategia" && (
                    <>
                      <p className="mt-1 text-xs text-ink-faint">{item.amostra} calls reais comparadas</p>
                      <p className="mt-2 text-sm font-semibold text-brand-700">
                        {item.impactoPP >= 0 ? "+" : ""}
                        {item.impactoPP} p.p. no risco estimado
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate("/app/analises")}
                        className="mt-4 rounded-full border border-line px-4 py-2 text-xs font-semibold text-ink-soft hover:border-line-strong"
                      >
                        Ver detalhes
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
