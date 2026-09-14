import { Info } from "lucide-react";

export default function InfoNote({ children }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-mist-strong px-3.5 py-2.5 text-xs leading-relaxed text-ink-soft">
      <Info size={14} className="mt-0.5 shrink-0 text-ink-faint" />
      <p>{children}</p>
    </div>
  );
}
