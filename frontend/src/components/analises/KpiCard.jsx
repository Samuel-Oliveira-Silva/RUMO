export default function KpiCard({ label, valor, sufixo }) {
  return (
    <div className="rounded-2xl border border-line bg-paper px-5 py-4">
      <p className="text-xs font-medium text-ink-faint">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-ink">
        {valor}
        {sufixo && <span className="ml-0.5 text-base font-medium text-ink-soft">{sufixo}</span>}
      </p>
    </div>
  );
}
