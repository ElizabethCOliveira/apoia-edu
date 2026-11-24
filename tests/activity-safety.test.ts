import { describe, expect, it } from 'vitest';
import { stripAnswerHintsFromCards } from '../server/activitySafety.ts';

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
