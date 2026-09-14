export default function EmptyState({ icon: Icon, titulo, descricao }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong px-8 py-16 text-center">
      {Icon && (
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-mist-strong text-ink-faint">
          <Icon size={20} />
        </div>
      )}
      <p className="font-display text-base font-semibold text-ink">{titulo}</p>
      {descricao && <p className="mt-1 max-w-sm text-sm text-ink-soft">{descricao}</p>}
    </div>
  );
}
