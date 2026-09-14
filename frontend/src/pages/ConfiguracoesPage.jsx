export default function ConfiguracoesPage() {
  const apiBase = import.meta.env.VITE_API_URL || "/api (proxy para o backend local)";
  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Configurações</h1>
      <p className="mt-1 text-sm text-ink-soft">Preferências da conta e da conexão com o backend.</p>

      <div className="mt-6 rounded-2xl border border-line bg-paper p-5">
        <p className="text-sm font-medium text-ink">Fonte de dados</p>
        <p className="mt-1 text-sm text-ink-soft">
          Todas as negociações, análises e oportunidades vêm da API do RUMO
          ({apiBase}), que processa o dataset real ANON_transcricao.json.
          O front-end não acessa o dataset diretamente.
        </p>
      </div>
    </div>
  );
}
