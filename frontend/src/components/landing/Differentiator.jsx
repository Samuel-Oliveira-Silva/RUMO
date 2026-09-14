import { ArrowRight } from "lucide-react";

const FLUXO = ["Call real", "Momento importante", "Replay", "Nova abordagem", "Comparação", "Aprendizado"];

export default function Differentiator() {
  return (
    <section className="bg-ink py-20">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <p className="font-display text-2xl font-semibold leading-snug tracking-tight text-white sm:text-3xl">
          Não analisamos apenas o que aconteceu.
          <br />
          Você pode testar o que poderia ter acontecido.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5 text-xs font-medium text-white/70 sm:gap-3 sm:text-sm">
          {FLUXO.map((etapa, i) => (
            <span key={etapa} className="flex items-center gap-2.5 sm:gap-3">
              <span
                className={`rounded-full px-3.5 py-2 ${
                  etapa === "Replay"
                    ? "border border-brand-500 bg-brand-500/10 text-brand-300"
                    : "border border-white/15"
                }`}
              >
                {etapa}
              </span>
              {i < FLUXO.length - 1 && <ArrowRight size={14} className="text-white/40" />}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
