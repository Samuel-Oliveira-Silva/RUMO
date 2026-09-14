import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function OQueEstaFuncionando({ itens }) {
  const [aberto, setAberto] = useState(null);

  return (
    <section>
      <h2 className="font-display text-lg font-semibold text-ink">O que está funcionando</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Evidências positivas com amostra ≥ 10: a objeção apareceu em uma call e uma abordagem real foi usada na call seguinte da mesma conta, com queda observada no risco estimado.
      </p>

      {itens.length === 0 ? (
        <p className="mt-4 text-sm text-ink-faint">
          Ainda não há combinações com amostra suficiente e resultado positivo para reportar com confiança.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {itens.map((it, i) => {
            const estaAberto = aberto === i;
            return (
              <div key={i} className="rounded-2xl border border-line bg-paper p-4">
                <p className="font-display text-sm font-semibold leading-snug text-ink">
                  {it.estrategiaLabel}{" "}
                  <span className="font-normal text-ink-soft">— {it.objecaoLabel.replace("Objeção — ", "")}</span>
                </p>
                <p className="mt-1 text-xs text-ink-faint">{it.amostra} calls reais comparadas</p>
                <p className="mt-2 font-display text-lg font-semibold text-brand-700">
                  −{Math.abs(it.impactoPP)} p.p.
                  <span className="ml-1 text-xs font-normal text-ink-faint">no risco estimado</span>
                </p>
                <button
                  type="button"
                  onClick={() => setAberto(estaAberto ? null : i)}
                  className="mt-3 flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  Ver detalhes
                  <ChevronDown size={13} className={`transition-transform ${estaAberto ? "rotate-180" : ""}`} />
                </button>
                {estaAberto && (
                  <div className="animate-rise mt-3 space-y-1.5 rounded-xl bg-mist-strong px-3 py-3 text-xs text-ink-soft">
                    <p><span className="font-medium text-ink">Objeção:</span> {it.objecaoLabel.replace("Objeção — ", "")}</p>
                    <p><span className="font-medium text-ink">Evidência:</span> {it.amostra} calls reais comparáveis</p>
                    <p>
                      <span className="font-medium text-ink">Variação observada:</span> risco caiu de{" "}
                      {it.scoreRiscoAntes}% para {it.scoreRiscoDepois}% em média
                    </p>
                    <p className="pt-1 italic">
                      Nas calls semelhantes desta base, essa abordagem esteve associada a uma redução do risco
                      estimado — isto não é uma garantia de causa e efeito nem de resultado futuro.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
