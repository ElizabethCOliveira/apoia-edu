// Proteções aplicadas ao conteúdo gerado pela IA antes de ele chegar à folha do estudante.

export interface VisualAidCard {
  label: string;
  sublabel?: string;
  icon?: string;
}

// Quantidades no começo do rótulo ("3 MACACOS", "3x MACACOS", "03 - MACACOS").
const LEADING_QUANTITY = /^\s*\d+\s*(?:x|×|-|–|:|\.)?\s*/i;
// Sublegendas que dizem a resposta ("NÚMERO 3", "= 3", "TOTAL 3", "RESPOSTA: B").
const ANSWER_SUBLABEL = /\d|\b(?:resposta|gabarito|total|correta?|certo)\b/i;

/**
 * Os cartões aparecem embaixo da ilustração, na folha do estudante.
 * Eles servem como apoio visual e nunca podem entregar a resposta do exercício.
 * Ex.: numa atividade de contagem, "3 MACACOS · NÚMERO 3" vira só "MACACOS".
 */
export function stripAnswerHintsFromCards(cards: VisualAidCard[] | undefined): VisualAidCard[] | undefined {
  if (!cards) return cards;
  const seen = new Set<string>();
  const cleaned: VisualAidCard[] = [];
  for (const card of cards) {
    const label = String(card.label || '').replace(LEADING_QUANTITY, '').trim();
    if (!label || /^\d+$/.test(label)) continue;
    const key = label.toLocaleLowerCase('pt-BR');
    if (seen.has(key)) continue;
    seen.add(key);
    const sublabel = card.sublabel && !ANSWER_SUBLABEL.test(card.sublabel) ? card.sublabel : undefined;
    cleaned.push({ ...card, label, sublabel });
  }
  return cleaned;
}

// "MACACO → [ ] 2 BANANAS", "ARARA ⟶ 3 MANGAS", "TUCANO -> ( ) 1 CAJU", "SOL — ESTRELA"
const PAIRED_ITEM = /^(.+?)\s*(?:-{1,3}>|→|⟶|⇒|=>|—{1,3}>?|-{2,}|–{1,}>?)\s*(?:\[\s*\]|\(\s*\))?\s*(.+)$/;

/**
 * Em exercícios de ligar/parear, a IA às vezes devolve os itens já ligados à resposta
 * ("MACACO → [ ] 2 BANANAS"). Separa em duas colunas: os elementos com um espaço para
 * ligar e as opções num item à parte, em ordem diferente, para a resposta não vir pronta.
 */
export function unpairMatchingItems(items: string[]): string[] {
  const parsed = items.map((it) => {
    const m = String(it).trim().match(PAIRED_ITEM);
    return m ? { left: m[1].trim(), right: m[2].trim() } : null;
  });
  const paired = parsed.filter((p): p is { left: string; right: string } => Boolean(p && p.left && p.right));
  // Só mexe quando a lista inteira é de pares (é um exercício de ligar de verdade).
  if (paired.length < 2 || paired.length !== items.length) return items;

  // Gira as opções uma posição: nenhuma fica alinhada com o próprio par.
  const options = paired.map((p) => p.right);
  const rotated = options.slice(1).concat(options[0]);
  return [...paired.map((p) => `${p.left} ⟶ ______`), `OPÇÕES: ${rotated.join('   ·   ')}`];
}

/**
 * Acrescenta ao pedido da ilustração os elementos e quantidades exatos do exercício,
 * para o desenho corresponder ao que a folha pede (ex.: 2 bananas, 3 mangas, 1 caju).
 */
export function alignImagePromptWithItems(imagePrompt: string, items: string[]): string {
  const concrete = items
    .map((it) => String(it).replace(/\[\s*\]|\(\s*\)|_{2,}/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((it) => it && it.length <= 80);
  if (concrete.length === 0 || concrete.length > 6) return imagePrompt;
  return (
    `${imagePrompt}. The picture must show exactly these elements and quantities ` +
    `(Portuguese worksheet items), each group clearly separated and countable, and nothing else: ${concrete.join('; ')}`
  );
}
