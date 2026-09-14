import { Link } from "react-router-dom";
import { Building2, ChevronRight } from "lucide-react";
import StatusBadge from "../ui/StatusBadge";

export default function NegociacaoCard({ negociacao }) {
  return (
    <Link
      to={`/app/negociacoes/${negociacao.id}`}
      className="group flex items-center gap-4 rounded-2xl border border-line bg-paper px-5 py-4 transition-colors hover:border-line-strong hover:shadow-sm hover:shadow-ink/[0.03]"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mist-strong text-ink-faint">
        <Building2 size={18} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display text-sm font-semibold text-ink">{negociacao.empresa}</p>
          <StatusBadge status={negociacao.status} size="sm" />
        </div>
        <p className="mt-0.5 truncate text-xs text-ink-soft">
          {negociacao.segmento || negociacao.unidadeTotvs
            ? `${negociacao.segmento || "Segmento não informado"} · ${negociacao.unidadeTotvs || "Unidade não informada"}`
            : "Dados cadastrais incompletos na base"}
        </p>
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-xs text-ink-faint">Última call</p>
        <p className="text-sm font-medium text-ink">{negociacao.ultimaCallData || "Não disponível"}</p>
      </div>

      <div className="hidden shrink-0 text-right md:block md:w-44">
        <p className="text-xs text-ink-faint">Ponto em aberto</p>
        <p className="truncate text-sm font-medium text-ink">
          {negociacao.pontoEmAberto || "Nenhuma objeção pendente"}
        </p>
      </div>

      <ChevronRight size={18} className="shrink-0 text-ink-faint transition-colors group-hover:text-ink-soft" />
    </Link>
  );
}
