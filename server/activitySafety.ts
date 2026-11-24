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
