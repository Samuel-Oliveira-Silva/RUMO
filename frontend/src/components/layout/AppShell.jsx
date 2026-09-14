import { NavLink, Outlet } from "react-router-dom";
import { Users, BarChart3, Target } from "lucide-react";
import Sidebar from "./Sidebar";

const ITENS = [
  { to: "/app/negociacoes", label: "Negociações", icon: Users },
  { to: "/app/analises", label: "Análises", icon: BarChart3 },
  { to: "/app/oportunidades", label: "Oportunidades", icon: Target },
];

export default function AppShell() {
  return (
    <div className="flex min-h-screen bg-mist">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-line bg-paper px-4 py-3 md:hidden">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 font-display text-xs font-bold text-white">
            R
          </div>
          <span className="font-display text-base font-semibold text-ink">RUMO</span>
        </header>

        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <Outlet />
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-paper md:hidden">
          {ITENS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                  isActive ? "text-brand-700" : "text-ink-faint"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
