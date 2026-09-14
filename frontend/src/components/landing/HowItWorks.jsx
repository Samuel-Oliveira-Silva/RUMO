const ETAPAS = [
  {
    numero: "01",
    titulo: "Revise",
    texto: "Volte para uma negociação real e encontre o momento que mais importa — uma objeção, uma dúvida, uma condição discutida.",
  },
  {
    numero: "02",
    titulo: "Simule",
    texto: "A partir desse momento real, teste uma nova abordagem em um Replay curto e contextual.",
  },
  {
    numero: "03",
    titulo: "Compare",
    texto: "Veja o original ao lado da simulação e leve o aprendizado para a próxima negociação.",
  },
];

export default function HowItWorks() {
  return (
    <section id="como-funciona" className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        Como funciona
      </h2>
      <div className="mt-10 grid gap-8 sm:grid-cols-3">
        {ETAPAS.map((etapa) => (
          <div key={etapa.numero}>
            <span className="font-display text-sm font-semibold text-brand-500">{etapa.numero}</span>
            <h3 className="mt-2 font-display text-lg font-semibold text-ink">{etapa.titulo}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{etapa.texto}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
