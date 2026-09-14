const TONS = {
  em_andamento: { label: "Em negociação", classes: "bg-amber-50 text-amber-600" },
  aguardando: { label: "Aguardando retorno", classes: "bg-mist-strong text-ink-soft" },
  ganha: { label: "Ganha", classes: "bg-brand-50 text-brand-700" },
  perdida: { label: "Perdida", classes: "bg-red-50 text-red-600" },
};
const SEM_STATUS = { label: "Status não disponível na base", classes: "bg-mist-strong text-ink-faint" };

export default function StatusBadge({ status, size = "md" }) {
  const info = TONS[status] || SEM_STATUS;
  const padding = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs";
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${padding} ${info.classes}`}>
      {info.label}
    </span>
  );
}

export { TONS as STATUS_TONS };
