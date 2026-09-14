import { Link } from "react-router-dom";

export default function LandingHeader() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 font-display text-sm font-bold text-white">
          R
        </div>
        <span className="font-display text-lg font-semibold tracking-tight text-ink">RUMO</span>
      </div>
      <Link
        to="/app/negociacoes"
        className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
      >
        Entrar no RUMO
      </Link>
    </header>
  );
}
