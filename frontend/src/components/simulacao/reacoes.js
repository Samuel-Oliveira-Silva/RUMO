// Opções de nova abordagem oferecidas ao vendedor no Replay. A reação do
// cliente NÃO vem mais daqui — ela é sempre gerada pelo cliente virtual
// (Grok, via GroqCloud) no backend, com base no contexto real da negociação.
// Um banco de respostas fixas por estratégia contradiria o próprio conceito
// do RUMO, então não existe mais aqui.
export const OPCOES_ABORDAGEM = [
  { chave: "MANTER_PRECO_EXPLORAR_OBJECAO", label: "Explorar a objeção" },
  { chave: "TROCAR_PLANO", label: "Alterar condição" },
  { chave: "ALTERAR_PRAZO", label: "Negociar prazo" },
  { chave: "DESCONTO", label: "Oferecer desconto" },
  { chave: "propria", label: "Escrever minha própria resposta" },
];
