import { useState } from "react";
import { AlertCircle, Sparkles, Handshake, Bookmark, Tag, Target } from "lucide-react";

const TIPO_CONFIG = {
  objecao: { icon: AlertCircle, dot: "bg-red-600", text: "text-red-600" },
  interesse: { icon: Sparkles, dot: "bg-brand-500", text: "text-brand-700" },
  negociacao: { icon: Handshake, dot: "bg-amber-600", text: "text-amber-600" },
};

export default function Marcador({ marcador, onSimular }) {
  const [aberto, setAberto] = useState(false);
  const cfg = TIPO_CONFIG[marcador.tipo] || TIPO_CONFIG.negociacao;
  const Icon = cfg.icon;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 py-1 text-xs font-medium ${cfg.text} hover:border-line-strong transition-colors`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
        <Icon size={12} strokeWidth={2.2} />
        {marcador.label}
      </button>

      {aberto && (
        <div className="animate-pop absolute z-20 mt-1 grid grid-cols-2 gap-1 rounded-xl border border-line bg-paper p-1 shadow-lg shadow-ink/5">
          <button
            type="button"
            onClick={() => {
              setAberto(false);
              onSimular?.(marcador);
            }}
            className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            <Sparkles size={13} /> Simular
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-ink-soft hover:bg-mist transition-colors"
          >
            <Bookmark size={13} /> Salvar
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-ink-soft hover:bg-mist transition-colors"
          >
            <Tag size={13} /> Objeção
          </button>
          <button
            type="button"
            className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-ink-soft hover:bg-mist transition-colors"
          >
            <Target size={13} /> Adicionar às oportunidades
          </button>
        </div>
      )}
    </div>
  );
}
