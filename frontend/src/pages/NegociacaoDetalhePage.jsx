import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "../lib/api";
import StatusBadge from "../components/ui/StatusBadge";
import Conversa from "../components/negociacao-detalhe/Conversa";
import SimulacaoPanel from "../components/simulacao/SimulacaoPanel";

export default function NegociacaoDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [conta, setConta] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [status, setStatus] = useState("carregando");
  const [callIdx, setCallIdx] = useState(0);
  const [momento, setMomento] = useState(null); // { call, mensagem } | null

  useEffect(() => {
    let ativo = true;
    setStatus("carregando");
    setCallIdx(0);
    setMomento(null);
    Promise.all([api.detalheConta(id), api.timelineConta(id)])
      .then(([c, t]) => {
        if (!ativo) return;
        setConta(c);
        setTimeline(t);
        setCallIdx(t.calls.length - 1);
        setStatus("pronto");
      })
      .catch(() => ativo && setStatus("erro"));
    return () => {
      ativo = false;
    };
  }, [id]);

  if (status === "carregando") {
    return <div className="px-8 py-10 text-sm text-ink-faint">Carregando negociação…</div>;
  }
  if (status === "erro" || !conta) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10 text-sm text-ink-soft">
        Negociação não encontrada.{" "}
        <button onClick={() => navigate("/app/negociacoes")} className="text-brand-600 underline">
          Voltar para a lista
        </button>
      </div>
    );
  }

  const call = timeline.calls[callIdx];

  return (
    <div className="mx-auto max-w-3xl px-5 py-6 sm:px-8">
      <button
        onClick={() => navigate("/app/negociacoes")}
        className="flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"
      >
        <ArrowLeft size={16} /> Voltar
      </button>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-line bg-paper p-5">
        <div>
          <p className="font-display text-lg font-semibold text-ink">{conta.empresa}</p>
          <p className="mt-0.5 text-sm text-ink-soft">
            {conta.segmento || "Segmento não informado"} · {conta.unidadeTotvs || "Unidade não informada"}{conta.uf ? ` · ${conta.uf}` : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusBadge status={conta.status} />
          {conta.status && conta.statusOrigem === "derivado" && (
            <p className="text-[11px] text-ink-faint">Status derivado (heurística, não confirmado pela base)</p>
          )}
          <p className="text-xs text-ink-faint">
            Faixa de faturamento: {conta.faixaFaturamento || "Não informada na base"}
          </p>
        </div>
      </div>

      {timeline.calls.length > 1 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {timeline.calls.map((c, i) => (
            <button
              key={c.uid}
              onClick={() => setCallIdx(i)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                i === callIdx ? "bg-ink text-white" : "bg-mist-strong text-ink-soft hover:bg-line"
              }`}
            >
              Call {i + 1} · {c.data || "Data não disponível"}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-line bg-paper p-5">
        <Conversa call={call} onSimular={(mensagem) => setMomento({ call, mensagem })} />
      </div>

      {momento && (
        <SimulacaoPanel
          codt={conta.id}
          call={momento.call}
          mensagem={momento.mensagem}
          onFechar={() => setMomento(null)}
        />
      )}
    </div>
  );
}
