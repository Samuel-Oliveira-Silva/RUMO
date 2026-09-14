import { Link } from "react-router-dom";
import { ArrowRight, X, Check } from "lucide-react";

function MiniConversa({ titulo, tom, cliente, vendedor, resultado }) {
  const corResultado = tom === "red" ? "text-red-600 bg-red-50" : "text-brand-700 bg-brand-50";
  const Icone = tom === "red" ? X : Check;
  return (
    <div className="w-full rounded-2xl border border-line bg-paper p-4 shadow-sm shadow-ink/[0.03] sm:p-5">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-faint">{titulo}</p>
      <div className="space-y-2">
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-mist px-3.5 py-2 text-sm text-ink-soft">
          {cliente}
        </div>
        <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-600 px-3.5 py-2 text-sm text-white">
          {vendedor}
        </div>
      </div>
      <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${corResultado}`}>
        <Icone size={12} strokeWidth={2.5} />
        {resultado}
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-8 lg:grid-cols-[1.05fr_0.95fr] lg:pt-16">
      <div>
        <h1 className="font-display text-4xl font-semibold leading-[1.12] tracking-tight text-ink sm:text-5xl">
          Volte para uma venda real. Revise o momento. Teste outro caminho.
        </h1>
        <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-soft">
          O RUMO parte de negociações reais para revisar um momento importante,
          simular uma nova abordagem e comparar com o que realmente aconteceu.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            to="/app/negociacoes"
            className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Começar agora <ArrowRight size={16} />
          </Link>
          <a
            href="#como-funciona"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
          >
            Ver como funciona
          </a>
        </div>
      </div>

      <div className="relative">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <MiniConversa
            titulo="Call real (exemplo ilustrativo)"
            tom="red"
            cliente="Esse investimento ficou acima do nosso orçamento."
            vendedor="Podemos oferecer 5% de desconto."
            resultado="Negociação perdida"
          />
          <MiniConversa
            titulo="Replay (exemplo ilustrativo)"
            tom="green"
            cliente="Esse investimento ficou acima do nosso orçamento."
            vendedor="Entendo — o que está pesando mais nessa decisão pra vocês?"
            resultado="Risco reduzido na simulação"
          />
        </div>
      </div>
    </section>
  );
}
