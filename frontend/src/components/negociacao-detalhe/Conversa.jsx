import Marcador from "../ui/Marcador";

function Bolha({ mensagem, onSimular }) {
  const doVendedor = mensagem.remetente === "vendedor";
  return (
    <div className={`flex flex-col ${doVendedor ? "items-end" : "items-start"}`}>
      <span className="px-1 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
        {doVendedor ? "Vendedor" : "Cliente"}
      </span>
      <div
        className={`mt-1 max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed sm:max-w-[65%] ${
          doVendedor
            ? "rounded-tr-sm bg-brand-600 text-white"
            : "rounded-tl-sm bg-mist-strong text-ink"
        }`}
      >
        {mensagem.texto}
      </div>
      {mensagem.marcador && (
        <div className={doVendedor ? "mr-1" : "ml-1"}>
          <Marcador marcador={mensagem.marcador} onSimular={() => onSimular(mensagem)} />
        </div>
      )}
    </div>
  );
}

function LinhaBruta({ mensagem, onSimular }) {
  return (
    <div className="rounded-xl border border-line bg-paper px-4 py-2.5">
      <p className="text-sm leading-relaxed text-ink-soft">“{mensagem.texto}”</p>
      {mensagem.marcador && (
        <div className="mt-1.5">
          <Marcador marcador={mensagem.marcador} onSimular={() => onSimular(mensagem)} />
        </div>
      )}
    </div>
  );
}

export default function Conversa({ call, onSimular }) {
  if (!call || call.mensagens.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-sm text-ink-faint">
        Sem trecho de transcrição disponível para esta call.
      </p>
    );
  }

  if (call.modoConversa === "dialogo") {
    return (
      <div className="space-y-4">
        {call.qualidade?.chave === "sem_momento_comercial" && (
          <p className="rounded-lg bg-mist-strong px-3 py-2 text-xs leading-relaxed text-ink-faint">
            Sem momento comercial identificável nesta call — nenhuma evidência suficiente de objeção,
            negociação ou interesse foi encontrada no trecho disponível.
          </p>
        )}
        {call.mensagens.map((m, i) => (
          <Bolha key={i} mensagem={m} onSimular={onSimular} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-600">
        Transcrição sem atribuição confiável — esta call teve mais de dois participantes identificados,
        não foi possível separar com confiança quem é vendedor e quem é cliente. Mostrando o trecho
        real da transcrição, sem atribuição de lado e sem detecção de objeção (para não atribuir uma
        fala à pessoa errada).
      </p>
      {call.mensagens.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong px-4 py-5 text-center text-sm text-ink-faint">
          Nenhum trecho comercial suficientemente claro foi identificado nesta call.
        </p>
      ) : (
        <div className="space-y-2.5">
          {call.mensagens.map((m, i) => (
            <LinhaBruta key={i} mensagem={m} onSimular={onSimular} />
          ))}
        </div>
      )}
    </div>
  );
}
