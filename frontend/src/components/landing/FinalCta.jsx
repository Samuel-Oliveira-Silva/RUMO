import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24 text-center">
      <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Comece a transformar suas negociações.
      </h2>
      <Link
        to="/app/negociacoes"
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-600 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
      >
        Entrar no RUMO <ArrowRight size={16} />
      </Link>
    </section>
  );
}
