import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, Inbox, X, RotateCcw } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import NegociacaoCard from "../components/negociacoes/NegociacaoCard";
import EmptyState from "../components/ui/EmptyState";

const STATUS_FILTROS = [
  { chave: "em_andamento", label: "Em andamento" },
  { chave: "aguardando", label: "Aguardando" },
  { chave: "ganha", label: "Ganhas" },
  { chave: "perdida", label: "Perdidas" },
];

const OBJECAO_FILTROS = [
  { chave: "PRECO", label: "Preço" },
  { chave: "CONCORRENCIA", label: "Concorrência" },
  { chave: "SEM_URGENCIA", label: "Sem urgência" },
  { chave: "PRAZO_CONTRATUAL", label: "Prazo contratual" },
  { chave: "DECISOR_AUSENTE", label: "Decisor ausente" },
  { chave: "ESCOPO_PLANO", label: "Escopo do plano" },
  { chave: "CONFIANCA_IMPLEMENTACAO", label: "Confiança na implementação" },
];

const TAMANHO_PAGINA = 20;

function lerLista(params, chave) {
  return (params.get(chave) || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export default function NegociacoesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [busca, setBusca] = useState(searchParams.get("busca") || "");
  const [buscaDebounced, setBuscaDebounced] = useState(searchParams.get("busca") || "");
  const [pagina, setPagina] = useState(1);
  const [itens, setItens] = useState([]);
  const [totais, setTotais] = useState(null);
  const [status, setStatus] = useState("carregando");
  const [erro, setErro] = useState(null);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  const statusSelecionados = useMemo(() => lerLista(searchParams, "status"), [searchParams]);
  const objecoesSelecionadas = useMemo(() => lerLista(searchParams, "objecao"), [searchParams]);

  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 300);
    return () => clearTimeout(t);
  }, [busca]);

  useEffect(() => {
    const urlBusca = searchParams.get("busca") || "";
    if (urlBusca !== buscaDebounced) {
      const t = setTimeout(() => {
        setSearchParams((atual) => {
          if (buscaDebounced) atual.set("busca", buscaDebounced);
          else atual.delete("busca");
          return atual;
        }, { replace: true });
      }, 0);
      return () => clearTimeout(t);
    }
  }, [buscaDebounced, searchParams, setSearchParams]);

  useEffect(() => {
    setPagina(1);
  }, [buscaDebounced, searchParams.toString()]);

  useEffect(() => {
    let ativo = true;
    setStatus("carregando");
    setErro(null);

    api
      .listarContas({
        busca: buscaDebounced,
        status: statusSelecionados,
        objecao: objecoesSelecionadas,
        pagina,
        tamanhoPagina: TAMANHO_PAGINA,
      })
      .then((dados) => {
        if (!ativo) return;
        setItens((atual) => (pagina === 1 ? dados.itens : [...atual, ...dados.itens]));
        setTotais({ total: dados.total, totalGeralContas: dados.totalGeralContas });
        setStatus("pronto");
      })
      .catch((e) => {
        if (!ativo) return;
        setErro(e.message);
        setStatus("erro");
      });

    return () => {
      ativo = false;
    };
  }, [buscaDebounced, statusSelecionados.join(","), objecoesSelecionadas.join(","), pagina]);

  function atualizarFiltro(chave, valores) {
    setPagina(1);
    setSearchParams((atual) => {
      if (valores.length) atual.set(chave, valores.join(","));
      else atual.delete(chave);
      return atual;
    });
  }

  function alternarStatus(chave) {
    const novo = statusSelecionados.includes(chave)
      ? statusSelecionados.filter((v) => v !== chave)
      : [...statusSelecionados, chave];
    atualizarFiltro("status", novo);
  }

  function alternarObjecao(chave) {
    const novo = objecoesSelecionadas.includes(chave)
      ? objecoesSelecionadas.filter((v) => v !== chave)
      : [...objecoesSelecionadas, chave];
    atualizarFiltro("objecao", novo);
  }

  function limparFiltros() {
    setPagina(1);
    setBusca("");
    setBuscaDebounced("");
    setSearchParams({}, { replace: true });
  }

  const quantidadeFiltros = statusSelecionados.length + objecoesSelecionadas.length;

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Negociações</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Acompanhe suas calls reais e encontre rapidamente os momentos que importam.
          </p>
        </div>
        {quantidadeFiltros > 0 && (
          <button
            type="button"
            onClick={limparFiltros}
            className="inline-flex items-center gap-1.5 self-start rounded-full bg-mist-strong px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-line sm:self-auto"
          >
            <RotateCcw size={13} /> Limpar filtros
          </button>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente, empresa ou CODT..."
            className="w-full rounded-xl border border-line bg-paper py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-ink-faint focus:border-brand-500"
          />
        </div>
        <button
          type="button"
          onClick={() => setFiltrosAbertos((v) => !v)}
          className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
            filtrosAbertos || quantidadeFiltros > 0
              ? "border-line-strong bg-mist-strong text-ink"
              : "border-line bg-paper text-ink-soft hover:border-line-strong"
          }`}
        >
          <SlidersHorizontal size={15} />
          Filtros
          {quantidadeFiltros > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1.5 text-[10px] font-semibold text-white">
              {quantidadeFiltros}
            </span>
          )}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => atualizarFiltro("status", [])}
          className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
            statusSelecionados.length === 0 ? "bg-ink text-white" : "bg-mist-strong text-ink-soft hover:bg-line"
          }`}
        >
          Todos os status
        </button>
        {STATUS_FILTROS.map((f) => (
          <button
            key={f.chave}
            type="button"
            onClick={() => alternarStatus(f.chave)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              statusSelecionados.includes(f.chave)
                ? "bg-ink text-white"
                : "bg-mist-strong text-ink-soft hover:bg-line"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtrosAbertos && (
        <div className="mt-3 rounded-2xl border border-line bg-paper p-4 animate-rise">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Filtros avançados</p>
              <p className="mt-0.5 text-xs text-ink-soft">Você pode combinar vários status e várias objeções.</p>
            </div>
            <button type="button" onClick={() => setFiltrosAbertos(false)} className="rounded-full p-1.5 text-ink-faint hover:bg-mist-strong hover:text-ink">
              <X size={15} />
            </button>
          </div>

          <div className="mt-5">
            <p className="text-xs font-medium text-ink">Objeções</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {OBJECAO_FILTROS.map((f) => {
                const selecionado = objecoesSelecionadas.includes(f.chave);
                return (
                  <label key={f.chave} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line px-3 py-2.5 hover:bg-mist">
                    <input
                      type="checkbox"
                      checked={selecionado}
                      onChange={() => alternarObjecao(f.chave)}
                      className="h-4 w-4 accent-brand-500"
                    />
                    <span className="text-sm text-ink-soft">{f.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {objecoesSelecionadas.length > 0 && (
            <p className="mt-3 text-[11px] text-ink-faint">
              As objeções são procuradas em qualquer call da conta. Status + objeção usam AND; múltiplos itens dentro do mesmo grupo usam OR.
            </p>
          )}
        </div>
      )}

      {objecoesSelecionadas.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {objecoesSelecionadas.map((chave) => {
            const item = OBJECAO_FILTROS.find((f) => f.chave === chave);
            return (
              <button key={chave} type="button" onClick={() => alternarObjecao(chave)} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700 hover:bg-brand-100">
                {item?.label || chave} <X size={12} />
              </button>
            );
          })}
        </div>
      )}

      {status === "erro" && (
        <p className="mt-6 text-sm text-red-600">Não foi possível carregar as negociações: {erro}</p>
      )}

      {status !== "erro" && (
        <>
          <p className="mt-4 text-xs text-ink-faint">
            {totais ? `${totais.total} conta(s) encontrada(s) de ${totais.totalGeralContas} na base real.` : "Carregando…"}
          </p>

          <div className={`mt-3 flex flex-col gap-2.5 transition-opacity ${status === "carregando" ? "opacity-60" : "opacity-100"}`}>
            {itens.map((n) => (
              <NegociacaoCard key={n.id} negociacao={n} />
            ))}
          </div>

          {status === "pronto" && itens.length === 0 && (
            <div className="mt-4">
              <EmptyState
                icon={Inbox}
                titulo="Nenhuma negociação encontrada"
                descricao="Tente outro termo de busca ou remova um dos filtros aplicados."
              />
            </div>
          )}

          {totais && totais.total > itens.length && (
            <button
              type="button"
              onClick={() => setPagina((p) => p + 1)}
              disabled={status === "carregando"}
              className="mt-5 w-full rounded-xl border border-line py-2.5 text-sm font-medium text-ink-soft hover:border-line-strong hover:text-ink disabled:opacity-50"
            >
              {status === "carregando" ? "Carregando…" : "Carregar mais negociações"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
