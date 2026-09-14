import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Clock3, Flame, Trophy, XCircle, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import KpiCard from "../components/analises/KpiCard";
import OndeEstouPerdendo from "../components/analises/OndeEstouPerdendo";
import OQueEstaFuncionando from "../components/analises/OQueEstaFuncionando";
import { MeusReplays, OriginalXSimulacaoModal } from "../components/analises/MinhasSimulacoes";
import InfoNote from "../components/ui/InfoNote";

const ESTAGIOS = [
  { chave: "em_andamento", label: "Em andamento", descricao: "Últimos 14 dias", Icon: Flame },
  { chave: "aguardando", label: "Aguardando", descricao: "15 a 60 dias", Icon: Clock3 },
  { chave: "ganha", label: "Ganhas", descricao: "Convertidas", Icon: Trophy },
  { chave: "perdida", label: "Perdidas", descricao: "> 60 dias", Icon: XCircle },
];

function numero(valor) {
  return valor == null ? "—" : new Intl.NumberFormat("pt-BR").format(valor);
}

function GraficoTendencia({ dados }) {
  const validos = dados.filter((d) => d.riscoMedio != null);
  const max = Math.max(...validos.map((d) => d.riscoMedio), 1);
  const min = Math.min(...validos.map((d) => d.riscoMedio), 0);
  const range = Math.max(max - min, 1);
  const width = 760;
  const height = 250;
  const padX = 34;
  const padY = 24;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const pontos = validos.map((d, i) => {
    const x = padX + (validos.length <= 1 ? innerW / 2 : (i / (validos.length - 1)) * innerW);
    const y = padY + innerH - ((d.riscoMedio - min) / range) * innerH;
    return { ...d, x, y };
  });
  const path = pontos.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <section className="rounded-2xl border border-line bg-paper p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <TrendingUp size={17} />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Evolução do risco estimado</h2>
            <p className="mt-0.5 text-sm text-ink-soft">Risco médio das calls reais por mês.</p>
          </div>
        </div>
        <span className="text-xs text-ink-faint">Não é taxa de fechamento.</span>
      </div>

      {validos.length < 2 ? (
        <p className="mt-8 text-sm text-ink-faint">Dados insuficientes para montar uma série temporal.</p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-auto min-w-[620px] w-full" role="img" aria-label="Evolução mensal do risco estimado">
            {[0, 0.5, 1].map((t) => {
              const y = padY + innerH * t;
              const valor = max - (range * t);
              return (
                <g key={t}>
                  <line x1={padX} x2={width - padX} y1={y} y2={y} stroke="currentColor" className="text-line" strokeWidth="1" />
                  <text x="0" y={y + 4} className="fill-ink-faint text-[10px]">{Math.round(valor)}%</text>
                </g>
              );
            })}
            <path d={path} fill="none" stroke="currentColor" className="text-brand-500" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {pontos.map((p) => (
              <g key={p.mes}>
                <circle cx={p.x} cy={p.y} r="4" fill="currentColor" className="text-brand-500" />
                <text x={p.x} y={height - 4} textAnchor="middle" className="fill-ink-faint text-[10px]">{p.mes.slice(5)}/{p.mes.slice(0, 4)}</text>
              </g>
            ))}
          </svg>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {dados.slice(-4).map((d) => (
          <div key={d.mes} className="rounded-xl bg-mist px-3 py-2.5">
            <p className="text-[11px] text-ink-faint">{d.mes}</p>
            <p className="mt-0.5 text-sm font-semibold text-ink">{d.riscoMedio != null ? `${d.riscoMedio}%` : "—"}</p>
            <p className="text-[11px] text-ink-faint">{numero(d.calls)} calls</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function AnalisesPage() {
  const [resumo, setResumo] = useState(null);
  const [replays, setReplays] = useState([]);
  const [status, setStatus] = useState("carregando");
  const [replayAberto, setReplayAberto] = useState(null);

  useEffect(() => {
    let ativo = true;
    Promise.all([api.resumoAnalises(), api.listarReplays()])
      .then(([r, rep]) => {
        if (!ativo) return;
        setResumo(r);
        setReplays(rep.itens);
        setStatus("pronto");
      })
      .catch(() => ativo && setStatus("erro"));
    return () => {
      ativo = false;
    };
  }, []);

  if (status === "carregando") return <div className="px-8 py-10 text-sm text-ink-faint">Carregando análises…</div>;
  if (status === "erro" || !resumo) {
    return <div className="px-8 py-10 text-sm text-red-600">Não foi possível carregar as análises.</div>;
  }

  const { kpis, pontosDeAtencao = [], funil = {}, tendencia = [] } = resumo;
  const totalContas = funil.totalContas ?? kpis.contasAnalisadas ?? 0;
  const taxaConversao = kpis.taxaConversao;
  const maiorFunil = Math.max(...ESTAGIOS.map((e) => funil[e.chave] || 0), 1);

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Análises</h1>
      <p className="mt-1 text-sm text-ink-soft">Padrões, gargalos e evidências a partir das suas negociações reais.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Taxa de conversão" valor={kpis.taxaConversao ?? "Não calculado"} sufixo={kpis.taxaConversao != null ? "%" : ""} />
        <KpiCard label="Calls analisadas" valor={kpis.callsAnalisadas} />
        <KpiCard label="Padrões mapeados" valor={kpis.combinacoesHistoricasConfiaveis} />
        <KpiCard label="Melhoria média ponderada" valor={kpis.melhoriaMediaPonderadaPP != null ? `${kpis.melhoriaMediaPonderadaPP >= 0 ? "+" : ""}${kpis.melhoriaMediaPonderadaPP}` : "Não calculado"} sufixo={kpis.melhoriaMediaPonderadaPP != null ? "p.p." : ""} />
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-paper p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Funil executivo</h2>
            <p className="mt-1 text-sm text-ink-soft">Distribuição das {numero(totalContas)} contas por status derivado da recência e histórico real.</p>
          </div>
          {taxaConversao != null && (
            <div className="rounded-xl bg-mist px-4 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-ink-faint">Conversão estimada</p>
              <p className="font-display text-xl font-semibold text-ink">{taxaConversao}%</p>
            </div>
          )}
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {ESTAGIOS.map(({ chave, label, descricao, Icon }) => {
            const quantidade = funil[chave] || 0;
            return (
              <Link key={chave} to={`/app/negociacoes?status=${chave}`} className="group rounded-xl border border-line p-3.5 transition-colors hover:border-line-strong hover:bg-mist">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-mist-strong text-ink-soft"><Icon size={15} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-ink">{label}</p>
                      <p className="font-display text-lg font-semibold text-ink">{numero(quantidade)}</p>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-mist-strong">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max(3, (quantidade / maiorFunil) * 100)}%` }} />
                    </div>
                    <div className="mt-1 flex justify-between text-[11px] text-ink-faint"><span>{descricao}</span><span className="opacity-0 transition-opacity group-hover:opacity-100">Abrir →</span></div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        <p className="mt-4 text-[11px] leading-5 text-ink-faint">Os status acima são derivados por heurística e não substituem o status oficial de um CRM.</p>
      </div>

      <div className="mt-6"><GraficoTendencia dados={tendencia} /></div>

      <div className="mt-8"><InfoNote>
        Os números de impacto desta base são reais, mas modestos — a maior parte das combinações objeção↔estratégia mostra efeito pequeno ou próximo de zero no risco estimado. Todo cálculo vem do dataset real processado pelo backend. A taxa de conversão usa um status derivado por heurística (não confirmado pela base), por isso é tratada como aproximação, não como número oficial.
      </InfoNote></div>

      <div className="mt-8"><OndeEstouPerdendo itens={resumo.ondeEstouPerdendo} /></div>

      <div className="mt-10"><OQueEstaFuncionando itens={resumo.oQueEstaFuncionando} /></div>

      {pontosDeAtencao.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-lg font-semibold text-ink">Pontos de atenção</h2>
          <p className="mt-1 text-sm text-ink-soft">Combinações reais com amostra suficiente em que o risco estimado não caiu — inclui casos em que nenhuma estratégia clara foi identificada na call seguinte.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {pontosDeAtencao.map((it, i) => (
              <Link
                key={i}
                to={`/app/negociacoes?objecao=${encodeURIComponent(it.objecao)}`}
                className="group rounded-2xl border border-line bg-paper p-4 transition-colors hover:border-line-strong hover:bg-mist"
              >
                <p className="font-display text-sm font-semibold leading-snug text-ink">{it.estrategiaLabel || "Sem abordagem identificada"} <span className="font-normal text-ink-soft">— {it.objecaoLabel.replace("Objeção — ", "")}</span></p>
                <p className="mt-1 text-xs text-ink-faint">{it.amostra} calls reais comparadas</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="font-display text-lg font-semibold text-red-600">{it.impactoPP > 0 ? "+" : ""}{it.impactoPP} p.p.<span className="ml-1 text-xs font-normal text-ink-faint">no risco estimado</span></p>
                  <span className="text-[11px] font-semibold text-brand-700 opacity-0 transition-opacity group-hover:opacity-100">Ver negociações →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10"><MeusReplays replays={replays} onAbrir={setReplayAberto} /></div>

      {replayAberto && <OriginalXSimulacaoModal replay={replayAberto} onFechar={() => setReplayAberto(null)} />}
    </div>
  );
}
