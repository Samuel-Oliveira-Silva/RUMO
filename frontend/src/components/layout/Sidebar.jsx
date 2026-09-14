import { NavLink } from "react-router-dom";
import { Users, BarChart3, Target, Settings } from "lucide-react";

const ITENS = [
  { to: "/app/negociacoes", label: "Negociações", icon: Users },
  { to: "/app/analises", label: "Análises", icon: BarChart3 },
  { to: "/app/oportunidades", label: "Oportunidades", icon: Target },
];

export default function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-paper px-3 py-5 md:flex">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 font-display text-sm font-bold text-white">
          R
        </div>
        <span className="font-display text-lg font-semibold tracking-tight text-ink">RUMO</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {ITENS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-soft hover:bg-mist hover:text-ink"
              }`
            }
          >
            <Icon size={17} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-1 border-t border-line pt-3">
        <NavLink
          to="/app/configuracoes"
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive ? "bg-mist text-ink" : "text-ink-soft hover:bg-mist hover:text-ink"
            }`
          }
        >
          <Settings size={17} strokeWidth={2} />
          Configurações
        </NavLink>
        <div className="mt-2 flex items-center gap-2.5 rounded-xl px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 font-display text-xs font-semibold text-brand-700">
            VC
          </div>
          <div className="leading-tight">
            <p className="text-sm font-medium text-ink">Vendedor(a)</p>
            <p className="text-xs text-ink-faint">Equipe comercial</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
