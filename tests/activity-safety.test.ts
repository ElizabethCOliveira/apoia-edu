import { describe, expect, it } from 'vitest';
import { alignImagePromptWithItems, stripAnswerHintsFromCards, unpairMatchingItems } from '../server/activitySafety.ts';

describe('cartões da folha do estudante não entregam a resposta', () => {
  it('remove quantidades e o número correspondente numa atividade de contagem', () => {
    // Caso real observado na demo: "Conte os animais e ligue ao número correspondente".
    const cards = stripAnswerHintsFromCards([
      { label: '1 ARARA', sublabel: 'NÚMERO 1' },
      { label: '2 TUCANOS', sublabel: 'NÚMERO 2' },
      { label: '3 MACACOS', sublabel: 'NÚMERO 3' },
      { label: '4 ONÇAS', sublabel: 'NÚMERO 4' },
    ]);
    expect(cards).toEqual([
      { label: 'ARARA', sublabel: undefined },
      { label: 'TUCANOS', sublabel: undefined },
      { label: 'MACACOS', sublabel: undefined },
      { label: 'ONÇAS', sublabel: undefined },
    ]);
  });

  it('remove sublegendas que dizem a resposta, total ou alternativa correta', () => {
    const cards = stripAnswerHintsFromCards([
      { label: 'MAÇÃS', sublabel: 'TOTAL = 5' },
      { label: 'PLANETA', sublabel: 'Resposta: Terra' },
      { label: 'Sol', sublabel: 'Estrela central' },
    ]);
    expect(cards?.map((c) => c.sublabel)).toEqual([undefined, undefined, 'Estrela central']);
  });

  it('mantém cartões que não revelam nada', () => {
    const original = [
      { label: 'Borboleta', sublabel: 'Inseto com asas', icon: 'borboleta' },
      { label: 'Peixe', icon: 'peixe' },
    ];
    expect(stripAnswerHintsFromCards(original)).toEqual([
      { label: 'Borboleta', sublabel: 'Inseto com asas', icon: 'borboleta' },
      { label: 'Peixe', sublabel: undefined, icon: 'peixe' },
    ]);
  });

  it('descarta cartões que eram só o número e cartões repetidos', () => {
    const cards = stripAnswerHintsFromCards([
      { label: '5' },
      { label: '2 Gatos' },
      { label: '3 gatos' },
    ]);
    expect(cards).toEqual([{ label: 'Gatos', sublabel: undefined }]);
  });

  it('aceita ausência de cartões', () => {
    expect(stripAnswerHintsFromCards(undefined)).toBeUndefined();
    expect(stripAnswerHintsFromCards([])).toEqual([]);
  });
});

describe('exercícios de ligar não vêm com a resposta pronta', () => {
  it('separa os pares em duas colunas e embaralha as opções', () => {
    // Caso real observado na demo depois da primeira correção.
    const items = unpairMatchingItems(['MACACO ⟶ [ ] 2 BANANAS', 'ARARA ⟶ [ ] 3 MANGAS', 'TUCANO ⟶ [ ] 1 CAJU']);
    expect(items).toEqual([
      'MACACO ⟶ ______',
      'ARARA ⟶ ______',
      'TUCANO ⟶ ______',
      'OPÇÕES: 3 MANGAS   ·   1 CAJU   ·   2 BANANAS',
    ]);
  });

  it('nenhuma opção fica na mesma posição do seu par', () => {
    const pairs = ['A -> 1', 'B -> 2', 'C -> 3', 'D -> 4'];
    const items = unpairMatchingItems(pairs);
    const options = items[items.length - 1].replace('OPÇÕES: ', '').split('   ·   ');
    options.forEach((opt, i) => expect(opt).not.toBe(String(i + 1)));
  });

  it('aceita setas e marcadores diferentes', () => {
    const items = unpairMatchingItems(['SOL → ( ) ESTRELA', 'TERRA => PLANETA']);
    expect(items).toEqual(['SOL ⟶ ______', 'TERRA ⟶ ______', 'OPÇÕES: PLANETA   ·   ESTRELA']);
  });

  it('não mexe em listas que não são de ligar', () => {
    const normal = ['CIRCULE A FRUTA AMARELA', 'PINTE O MACACO'];
    expect(unpairMatchingItems(normal)).toBe(normal);
    const misto = ['MACACO → 2 BANANAS', 'PINTE O MACACO'];
    expect(unpairMatchingItems(misto)).toBe(misto);
  });
});

describe('ilustração alinhada ao exercício', () => {
  it('pede exatamente os elementos e quantidades dos itens', () => {
    const prompt = alignImagePromptWithItems('Monkey and fruits', ['MACACO ⟶ [ ] 2 BANANAS', 'ARARA ⟶ [ ] 3 MANGAS']);
    expect(prompt).toContain('Monkey and fruits');
    expect(prompt).toContain('exactly these elements and quantities');
    expect(prompt).toContain('MACACO ⟶ 2 BANANAS; ARARA ⟶ 3 MANGAS');
  });

  it('mantém o pedido original quando não há itens ou há itens demais', () => {
    expect(alignImagePromptWithItems('Solar system', [])).toBe('Solar system');
    expect(alignImagePromptWithItems('X', Array.from({ length: 7 }, (_, i) => `item ${i}`))).toBe('X');
  });
});
