import ExcelJS from 'exceljs';
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

function tableBorder() {
  return {
    top: { style: BorderStyle.SINGLE, size: 6, color: '334155' },
    bottom: { style: BorderStyle.SINGLE, size: 6, color: '334155' },
    left: { style: BorderStyle.SINGLE, size: 6, color: '334155' },
    right: { style: BorderStyle.SINGLE, size: 6, color: '334155' },
  };
}

export async function buildSampleEstudoDeCasoTemplateDocx(): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'TIMBRE DA UNIDADE ESCOLAR', bold: true, size: 22 })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: 'Documento institucional · Modelo de Estudo de Caso', size: 18, color: '64748B' })],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: 'ANEXO II – ESTUDO DE CASO', bold: true, size: 28 })],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    borders: tableBorder(),
                    children: [new Paragraph({ children: [new TextRun({ text: 'Estudante:', bold: true })] })],
                  }),
                  new TableCell({
                    borders: tableBorder(),
                    children: [new Paragraph({ children: [new TextRun({ text: '' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    borders: tableBorder(),
                    children: [new Paragraph({ children: [new TextRun({ text: 'Ano/Turma:', bold: true })] })],
                  }),
                  new TableCell({
                    borders: tableBorder(),
                    children: [new Paragraph({ children: [new TextRun({ text: '' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    borders: tableBorder(),
                    children: [new Paragraph({ children: [new TextRun({ text: 'Turno / Período:', bold: true })] })],
                  }),
                  new TableCell({
                    borders: tableBorder(),
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: '(  ) Manhã   (  ) Tarde   (X) Integral (exemplo)' }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    borders: tableBorder(),
                    children: [new Paragraph({ children: [new TextRun({ text: 'Município e Data:', bold: true })] })],
                  }),
                  new TableCell({
                    borders: tableBorder(),
                    children: [new Paragraph({ children: [new TextRun({ text: 'Município/SP, XX de fevereiro de 2026' })] })],
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({ spacing: { before: 240, after: 100 }, children: [new TextRun({ text: 'Eixo 1 – Contexto Escolar, Comunicação e Interação', bold: true, size: 24 })] }),
          new Paragraph({ children: [new TextRun({ text: 'Como o estudante se comunica em sala e nos espaços coletivos?' })] }),
          new Paragraph({ children: [new TextRun({ text: 'Quais barreiras foram observadas pela equipe escolar? A família?' })] }),
          new Paragraph({ spacing: { before: 200, after: 100 }, children: [new TextRun({ text: 'Eixo 2 – Potencialidades, Interesses e Aprendizagem', bold: true, size: 24 })] }),
          new Paragraph({ children: [new TextRun({ text: 'Quais interesses e habilidades se destacam no cotidiano escolar?' })] }),
          new Paragraph({ children: [new TextRun({ text: 'Quais estratégias pedagógicas já favoreceram a participação?' })] }),
          new Paragraph({ spacing: { before: 240, after: 100 }, children: [new TextRun({ text: 'Autorização de Contato e Assinaturas', bold: true, size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '(  ) Autorizo contato da equipe pedagógica com a família quando necessário.' })] }),
          new Paragraph({ spacing: { before: 280 }, children: [new TextRun({ text: '____________________________________          ____________________________________' })] }),
          new Paragraph({ children: [new TextRun({ text: 'Professor(a) / Equipe AEE                                  Responsável Legal' })] }),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}

export async function buildSampleFormsResponseDocx(): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            spacing: { after: 160 },
            children: [new TextRun({ text: 'RESPOSTA DO FORMS INSTITUCIONAL — COLETA ESTUDO DE CASO (EXEMPLO)', bold: true, size: 26 })],
          }),
          new Paragraph({ children: [new TextRun({ text: 'Identificação do estudante: Lucas M. (Código LM-4B) · 4º Ano B' })] }),
          new Paragraph({ children: [new TextRun({ text: 'Relato da família: A família relata que o estudante demonstra forte interesse por astronomia, mapas e organização visual de sequências; em casa prefere orientações passo a passo com apoio de imagens.' })] }),
          new Paragraph({ children: [new TextRun({ text: 'Relato da equipe docente: Em sala de aula, comunica-se oralmente com frases objetivas e responde melhor quando o enunciado é dividido em etapas curtas ou acompanhado de cartão visual.' })] }),
          new Paragraph({ children: [new TextRun({ text: 'Barreiras selecionadas no Forms: [x] Excesso de ruído sonoro em atividades em grupo; [x] Enunciados longos sem apoio visual; [ ] Necessidade de mobiliário adaptado.' })] }),
          new Paragraph({ children: [new TextRun({ text: 'Estratégias observadas pela equipe: Uso de roteiro visual na carteira e pausas programadas de 3 minutos entre tarefas extensas.' })] }),
          new Paragraph({ children: [new TextRun({ text: 'Relato do estudante: Gosta de explicar planetas para os colegas quando utiliza cartões ilustrados.' })] }),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}

export async function buildSamplePaeeTemplateDocx(): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'TIMBRE DA UNIDADE ESCOLAR', bold: true, size: 22 })],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: 'PLANO DE ATENDIMENTO EDUCACIONAL ESPECIALIZADO (PAEE)', bold: true, size: 26 })],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ borders: tableBorder(), children: [new Paragraph({ children: [new TextRun({ text: 'Síntese das potencialidades e barreiras:', bold: true })] })] }),
                  new TableCell({ borders: tableBorder(), children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ borders: tableBorder(), children: [new Paragraph({ children: [new TextRun({ text: 'Apoios, justificativas e acessibilidade:', bold: true })] })] }),
                  new TableCell({ borders: tableBorder(), children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ borders: tableBorder(), children: [new Paragraph({ children: [new TextRun({ text: 'Socialização e habilidades prioritárias:', bold: true })] })] }),
                  new TableCell({ borders: tableBorder(), children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ borders: tableBorder(), children: [new Paragraph({ children: [new TextRun({ text: 'Planejamento dos 4 bimestres (1º ao 4º Bimestre):', bold: true })] })] }),
                  new TableCell({ borders: tableBorder(), children: [new Paragraph({ children: [new TextRun({ text: '1º Bim: ___ | 2º Bim: ___ | 3º Bim: ___ | 4º Bim: ___' })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ borders: tableBorder(), children: [new Paragraph({ children: [new TextRun({ text: 'Orientações aos profissionais, materiais e aquisições:', bold: true })] })] }),
                  new TableCell({ borders: tableBorder(), children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ borders: tableBorder(), children: [new Paragraph({ children: [new TextRun({ text: 'Observações:', bold: true })] })] }),
                  new TableCell({ borders: tableBorder(), children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }),
                ],
              }),
            ],
          }),
          new Paragraph({ spacing: { before: 280 }, children: [new TextRun({ text: 'Ciência do Responsável: ___________________________   Professores: ___________________________' })] }),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}

export async function buildSamplePeiTemplateXlsx(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('PEI Bimestral');
  ws.columns = [
    { width: 28 },
    { width: 32 },
    { width: 22 },
    { width: 34 },
    { width: 28 },
    { width: 26 },
  ];

  ws.mergeCells('A1:F1');
  ws.getCell('A1').value = 'PLANO EDUCACIONAL INDIVIDUALIZADO (PEI) — MODELO INSTITUCIONAL';
  ws.getCell('A1').font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B1E3B' } };
  ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  ws.getCell('A2').value = 'Unidade Escolar (pré-preenchido):';
  ws.getCell('A2').font = { bold: true };
  ws.getCell('B2').value = 'E.M. Horizonte Inclusivo — Rede Municipal (Campo preservado)';
  ws.getCell('C2').value = 'Bimestre:';
  ws.getCell('D2').value = '';
  ws.getCell('E2').value = 'Componente:';
  ws.getCell('F2').value = '';

  ws.getCell('A3').value = 'Estudante:';
  ws.getCell('B3').value = '';
  ws.getCell('C3').value = 'Ano/Turma:';
  ws.getCell('D3').value = '';
  ws.getCell('E3').value = 'Ano Letivo:';
  ws.getCell('F3').value = '';

  ws.getCell('A5').value = 'Perfil Funcional Documentado:';
  ws.getCell('A5').font = { bold: true };
  ws.mergeCells('B5:F5');
  ws.getCell('B5').value = '';

  const headers = ['Código Habilidade', 'Descrição da Habilidade (Fonte)', 'AES / Código', 'Objetivo Individualizado', 'Estratégias e Recursos', 'Critério e Instrumento'];
  ws.getRow(7).values = headers;
  ws.getRow(7).font = { bold: true, color: { argb: 'FF0B1E3B' } };

  for (let r = 8; r <= 11; r++) {
    ws.getRow(r).height = 42;
    for (let c = 1; c <= 6; c++) {
      ws.getCell(r, c).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      ws.getCell(r, c).alignment = { wrapText: true, vertical: 'top' };
    }
  }

  ws.getCell('A12').value = 'Total de Objetivos Preenchidos:';
  ws.getCell('A12').font = { bold: true };
  ws.getCell('E12').value = { formula: 'COUNTA(D8:D11)' };
  ws.getCell('E12').font = { bold: true };

  ws.getCell('B8').dataValidation = {
    type: 'list',
    allowBlank: true,
    formulae: ['"Alcançado,Parcialmente alcançado,Ainda não alcançado"'],
  };

  ws.mergeCells('B14:F14');
  ws.getCell('A14').value = 'Observações / Pendências:';
  ws.getCell('B14').value = '';

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function buildSampleCurriculumDocx(): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            spacing: { after: 140 },
            children: [new TextRun({ text: 'CURRÍCULO PAULISTA — ESCOPO-SEQUÊNCIA (EXEMPLO) · MATEMÁTICA 4º ANO · 1º BIMESTRE', bold: true, size: 24 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: 'Habilidade: (EF04MA03) Resolver e elaborar situações-problema com números naturais envolvendo adição e subtração, utilizando estratégias diversas, como cálculo por estimativa, cálculo mental e algoritmos.' })],
          }),
          new Paragraph({
            children: [new TextRun({ text: 'Aprendizagem Essencial (AES): AES-MAT-4B1-01 — Resolver situações-problema cotidianas envolvendo adição e subtração com apoio de representações concretas ou visuais.' })],
          }),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}
