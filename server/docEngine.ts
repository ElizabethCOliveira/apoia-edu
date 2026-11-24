import AdmZip from 'adm-zip';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import ExcelJS from 'exceljs';
import mammoth from 'mammoth';
import { extractText } from 'unpdf';
import type {
  ActivityContent,
  DocType,
  DocumentContentPayload,
  ParsedTemplateField,
  ParsedTemplateStructure,
  PedagogicalActivity,
  Student,
} from '../src/types.ts';

function getTextFromXmlNode(node: any): string {
  if (!node) return '';
  if (node.nodeType === 3) return node.nodeValue || '';
  let out = '';
  const children = node.childNodes || [];
  for (let i = 0; i < children.length; i++) {
    out += getTextFromXmlNode(children[i]);
  }
  return out;
}

function createStyledParagraph(doc: any, text: string, templatePPr?: any, templateRPr?: any): any {
  const wNs = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const p = doc.createElementNS(wNs, 'w:p');
  if (templatePPr) {
    p.appendChild(templatePPr.cloneNode(true));
  }
  const r = doc.createElementNS(wNs, 'w:r');
  if (templateRPr) {
    r.appendChild(templateRPr.cloneNode(true));
  }
  const t = doc.createElementNS(wNs, 'w:t');
  t.setAttribute('xml:space', 'preserve');
  t.appendChild(doc.createTextNode(text));
  r.appendChild(t);
  p.appendChild(r);
  return p;
}

function setCellParagraphTextPreservingStyle(xmlDoc: any, tcNode: any, newText: string): boolean {
  const wNs = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const paragraphs = tcNode.getElementsByTagNameNS(wNs, 'p');
  let firstP = paragraphs.length > 0 ? paragraphs[0] : null;
  let templatePPr: any = null;
  let templateRPr: any = null;

  if (firstP) {
    const pPrs = firstP.getElementsByTagNameNS(wNs, 'pPr');
    if (pPrs.length > 0) templatePPr = pPrs[0].cloneNode(true);
    const rPrs = firstP.getElementsByTagNameNS(wNs, 'rPr');
    if (rPrs.length > 0) templateRPr = rPrs[0].cloneNode(true);
  }

  // Remove existing paragraphs inside cell (keep w:tcPr intact!)
  const toRemove: any[] = [];
  for (let i = 0; i < tcNode.childNodes.length; i++) {
    const ch = tcNode.childNodes[i];
    if (ch.localName === 'p') toRemove.push(ch);
  }
  for (const node of toRemove) {
    tcNode.removeChild(node);
  }

  const lines = newText.split(/\n+/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    tcNode.appendChild(createStyledParagraph(xmlDoc, '', templatePPr, templateRPr));
  } else {
    for (const line of lines) {
      tcNode.appendChild(createStyledParagraph(xmlDoc, line, templatePPr, templateRPr));
    }
  }
  return true;
}

export async function extractSourceContent(
  buffer: Buffer,
  ext: string,
  mimeType: string
): Promise<{
  extractedText: string;
  parsedStructure: ParsedTemplateStructure;
  isEditableTemplate: boolean;
}> {
  const lowerExt = ext.toLowerCase().replace(/^\./, '');

  if (lowerExt === 'docx') {
    const rawResult = await mammoth.extractRawText({ buffer });
    const rawText = (rawResult.value || '').trim();

    const zip = new AdmZip(buffer);
    const docEntry = zip.getEntry('word/document.xml');
    let headerFooterText = '';
    for (const entry of zip.getEntries()) {
      if (/^word\/(header|footer)\d*\.xml$/.test(entry.entryName)) {
        headerFooterText += ' ' + entry.getData().toString('utf8');
      }
    }

    const fields: ParsedTemplateField[] = [];
    const axes: ParsedTemplateStructure['axes'] = [];
    const wNs = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

    if (docEntry) {
      const xmlStr = docEntry.getData().toString('utf8');
      const xmlDoc = new DOMParser().parseFromString(xmlStr, 'text/xml');
      const body = xmlDoc.getElementsByTagNameNS(wNs, 'body')[0];

      let currentAxis: NonNullable<ParsedTemplateStructure['axes']>[number] | null = null;
      let pIdx = 0;
      let tIdx = 0;

      if (body) {
        for (let i = 0; i < body.childNodes.length; i++) {
          const node = body.childNodes[i] as any;
          if (node.localName === 'p') {
            pIdx++;
            const pText = getTextFromXmlNode(node).trim();
            if (!pText) continue;

            const axisMatch = pText.match(/^(Eixo\s*\d+|[IVX]+\s*[-–.]\s*Eixo|EIXO\s*\d+)\s*[-–:.]?\s*(.*)$/i);
            if (axisMatch) {
              currentAxis = {
                axisNumber: axisMatch[1].trim(),
                title: pText,
                guidingQuestions: [],
                hasAFamiliaFragment: false,
              };
              axes.push(currentAxis);
              fields.push({
                key: `axis_${axes.length}`,
                label: pText,
                location: `Parágrafo ${pIdx}`,
                currentValue: '',
                isPrefilled: false,
                kind: 'axis_narrative',
              });
            } else if (
              currentAxis &&
              (pText.endsWith('?') ||
                /A família\?/i.test(pText) ||
                /^(Como|Quais|Qual|Descreva|Relate|O estudante)/i.test(pText))
            ) {
              currentAxis.guidingQuestions.push(pText);
              if (/A família\?/i.test(pText)) {
                currentAxis.hasAFamiliaFragment = true;
              }
            }
          } else if (node.localName === 'tbl') {
            tIdx++;
            const rows = node.getElementsByTagNameNS(wNs, 'tr');
            for (let r = 0; r < rows.length; r++) {
              const cells = rows[r].getElementsByTagNameNS(wNs, 'tc');
              if (cells.length >= 2) {
                const labelText = getTextFromXmlNode(cells[0]).trim();
                const valueText = getTextFromXmlNode(cells[1]).trim();
                const isPlaceholder =
                  !valueText ||
                  /^_+$/.test(valueText) ||
                  /XX de fevereiro/i.test(valueText) ||
                  /1º Bim:\s*___/i.test(valueText) ||
                  /exemplo/i.test(valueText);
                if (labelText) {
                  fields.push({
                    key: `tbl_${tIdx}_r${r + 1}`,
                    label: labelText.replace(/:$/, ''),
                    location: `Tabela ${tIdx}, Linha ${r + 1}, Coluna 2`,
                    currentValue: valueText,
                    isPrefilled: !isPlaceholder && valueText.length > 0,
                    kind: 'table_cell',
                  });
                }
              }
            }
          }
        }
      }
    }

    const fullDetectText = `${rawText}\n${headerFooterText}`;
    const parsedStructure: ParsedTemplateStructure = {
      format: 'docx',
      editable: true,
      axes,
      markersDetected: {
        hasAnexoIIEstudoDeCaso: /ANEXO II\s*[-–]\s*ESTUDO DE CASO/i.test(fullDetectText),
        hasTimbrePlaceholder: /TIMBRE DA UNIDADE ESCOLAR/i.test(fullDetectText),
        hasSampleDateXX: /XX de fevereiro de 2026/i.test(fullDetectText),
        hasIntegralCheckbox: /\(X\)\s*Integral|\[\s*x\s*\]\s*Integral|Integral\s*\(exemplo\)/i.test(fullDetectText),
        hasSignatureBlocks: /Assinatura|Responsável|Ciência do Responsável/i.test(fullDetectText),
        hasFourBimesters: /1º.*2º.*3º.*4º|quatro bimestres/i.test(fullDetectText),
      },
      fields,
    };

    return {
      extractedText: rawText,
      parsedStructure,
      isEditableTemplate: true,
    };
  }

  if (lowerExt === 'xlsx') {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as any);
    const sheets: NonNullable<ParsedTemplateStructure['sheets']> = [];
    const fields: ParsedTemplateField[] = [];
    const textLines: string[] = [];

    wb.eachSheet((ws) => {
      const merges: string[] = Array.isArray((ws.model as any)?.merges)
        ? [...(ws.model as any).merges]
        : [];
      const formulaCells: { address: string; formula: string }[] = [];
      const prefilledCells: { address: string; value: string }[] = [];
      const validations: { address: string; rule: string }[] = [];

      textLines.push(`[Aba: ${ws.name}]`);
      ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        const rowTexts: string[] = [];
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const val: any = cell.value;
          const isFormula = Boolean(val && typeof val === 'object' && 'formula' in val);
          const formulaStr = isFormula ? String(val.formula || '') : '';
          const displayStr = isFormula
            ? `=${formulaStr}`
            : val && typeof val === 'object' && 'richText' in val
            ? val.richText.map((rt: any) => rt.text).join('')
            : val !== null && val !== undefined
            ? String(val).trim()
            : '';

          if (cell.dataValidation && cell.dataValidation.type) {
            validations.push({
              address: cell.address,
              rule: `${cell.dataValidation.type}: ${(cell.dataValidation.formulae || []).join(', ')}`,
            });
          }

          if (isFormula) {
            formulaCells.push({ address: cell.address, formula: formulaStr });
            fields.push({
              key: `${ws.name}!${cell.address}`,
              label: `Fórmula preservada (${cell.address})`,
              location: `Aba "${ws.name}", Célula ${cell.address}`,
              currentValue: displayStr,
              isPrefilled: true,
              hasFormula: true,
              formulaText: formulaStr,
              isMerged: cell.isMerged,
              kind: 'xlsx_cell',
            });
          } else if (displayStr.length > 0) {
            prefilledCells.push({ address: cell.address, value: displayStr });
            // Check if previous left cell is a label and this is an editable target or prefilled content
            const leftCell = colNumber > 1 ? row.getCell(colNumber - 1).value : null;
            const leftLabel = leftCell ? String(leftCell).trim() : '';
            if (leftLabel.endsWith(':') || rowNumber >= 2) {
              fields.push({
                key: `${ws.name}!${cell.address}`,
                label: leftLabel ? leftLabel.replace(/:$/, '') : `Célula ${cell.address}`,
                location: `Aba "${ws.name}", Célula ${cell.address}`,
                currentValue: displayStr,
                isPrefilled: true,
                isMerged: cell.isMerged,
                kind: 'xlsx_cell',
              });
            }
          }
          if (displayStr) rowTexts.push(`${cell.address}: ${displayStr}`);
        });
        if (rowTexts.length > 0) textLines.push(rowTexts.join(' | '));
      });

      // Also scan empty bordered cells in rows 2..20 that look like fillable slots
      for (let r = 2; r <= Math.min(25, ws.rowCount + 2); r++) {
        const row = ws.getRow(r);
        for (let c = 1; c <= Math.min(10, ws.columnCount || 6); c++) {
          const cell = row.getCell(c);
          const hasBorder = Boolean(cell.border && (cell.border.top || cell.border.bottom || cell.border.left));
          const val = cell.value;
          const isEmpty = val === null || val === undefined || String(val).trim() === '';
          if (isEmpty && (hasBorder || (c > 1 && String(row.getCell(c - 1).value || '').trim().endsWith(':')))) {
            const leftVal = c > 1 ? String(row.getCell(c - 1).value || '').trim() : '';
            const colHeader = String(ws.getRow(7).getCell(c).value || '').trim();
            const label = leftVal.endsWith(':')
              ? leftVal.replace(/:$/, '')
              : colHeader || `Célula ${cell.address}`;
            const key = `${ws.name}!${cell.address}`;
            if (!fields.some((f) => f.key === key)) {
              fields.push({
                key,
                label,
                location: `Aba "${ws.name}", Célula ${cell.address}`,
                currentValue: '',
                isPrefilled: false,
                isMerged: cell.isMerged,
                kind: 'xlsx_cell',
              });
            }
          }
        }
      }

      sheets.push({ name: ws.name, merges, formulaCells, prefilledCells, validations });
    });

    const extractedText = textLines.join('\n');
    const parsedStructure: ParsedTemplateStructure = {
      format: 'xlsx',
      editable: true,
      sheets,
      markersDetected: {
        hasAnexoIIEstudoDeCaso: /ANEXO II/i.test(extractedText),
        hasTimbrePlaceholder: /TIMBRE/i.test(extractedText),
        hasSampleDateXX: /XX de fevereiro/i.test(extractedText),
        hasIntegralCheckbox: /Integral/i.test(extractedText),
        hasSignatureBlocks: /Assinatura|Responsável/i.test(extractedText),
        hasFourBimesters: /1º.*2º.*3º.*4º/i.test(extractedText),
      },
      fields,
    };

    return {
      extractedText,
      parsedStructure,
      isEditableTemplate: true,
    };
  }

  if (lowerExt === 'pdf') {
    let extractedText = '';
    try {
      const pdfRes = await extractText(new Uint8Array(buffer), { mergePages: false });
      const pages = Array.isArray(pdfRes.text) ? pdfRes.text : [String(pdfRes.text || '')];
      extractedText = pages
        .map((pText, idx) => `[Página ${idx + 1}]\n${pText.trim()}`)
        .filter((s) => s.length > 12)
        .join('\n\n');
    } catch (err: any) {
      extractedText = `[Aviso: não foi possível extrair texto automático deste PDF (${err?.message || 'arquivo protegido ou escaneado'}). Trechos ilegíveis não foram completados por inferência.]`;
    }

    const parsedStructure: ParsedTemplateStructure = {
      format: 'pdf',
      editable: false,
      nonEditableReason:
        'O arquivo enviado está em formato PDF. Modelos em PDF servem apenas como referência e não podem ser editados mantendo fidelidade nativa. Solicite à escola a versão editável em DOCX (ou XLSX para PEI).',
      markersDetected: {
        hasAnexoIIEstudoDeCaso: /ANEXO II\s*[-–]\s*ESTUDO DE CASO/i.test(extractedText),
        hasTimbrePlaceholder: /TIMBRE DA UNIDADE ESCOLAR/i.test(extractedText),
        hasSampleDateXX: /XX de fevereiro de 2026/i.test(extractedText),
        hasIntegralCheckbox: /Integral/i.test(extractedText),
        hasSignatureBlocks: /Assinatura|Responsável/i.test(extractedText),
        hasFourBimesters: /1º.*2º.*3º.*4º/i.test(extractedText),
      },
      fields: [
        {
          key: 'pdf_ref_1',
          label: 'Conteúdo consultado do PDF',
          location: 'PDF (somente leitura)',
          currentValue: extractedText.slice(0, 600),
          isPrefilled: true,
          kind: 'paragraph',
        },
      ],
    };

    return {
      extractedText,
      parsedStructure,
      isEditableTemplate: false,
    };
  }

  if (['png', 'jpg', 'jpeg', 'webp'].includes(lowerExt) || mimeType.startsWith('image/')) {
    const parsedStructure: ParsedTemplateStructure = {
      format: 'image',
      editable: false,
      nonEditableReason:
        'O arquivo enviado é uma imagem. Pode ser consultado como referência visual, mas o preenchimento fiel exige a versão editável em DOCX ou XLSX.',
      markersDetected: {
        hasAnexoIIEstudoDeCaso: false,
        hasTimbrePlaceholder: false,
        hasSampleDateXX: false,
        hasIntegralCheckbox: false,
        hasSignatureBlocks: false,
        hasFourBimesters: false,
      },
      fields: [],
    };
    return {
      extractedText: '[Imagem cadastrada como fonte visual. Conteúdo não transcrito automaticamente sem processamento autorizado.]',
      parsedStructure,
      isEditableTemplate: false,
    };
  }

  // Fallback plain text / csv / md
  const text = buffer.toString('utf8').trim();
  return {
    extractedText: text,
    parsedStructure: {
      format: 'text',
      editable: false,
      nonEditableReason: 'Arquivo de texto simples utilizado como fonte documental.',
      markersDetected: {
        hasAnexoIIEstudoDeCaso: /ANEXO II/i.test(text),
        hasTimbrePlaceholder: /TIMBRE/i.test(text),
        hasSampleDateXX: /XX de fevereiro/i.test(text),
        hasIntegralCheckbox: /Integral/i.test(text),
        hasSignatureBlocks: /Assinatura/i.test(text),
        hasFourBimesters: /1º.*2º.*3º.*4º/i.test(text),
      },
      fields: [],
    },
    isEditableTemplate: false,
  };
}

export async function fillDocxTemplate(params: {
  templateBuffer: Buffer;
  docType: DocType;
  payload: DocumentContentPayload;
  student: Student;
  confirmIntegral?: boolean;
  confirmedDate?: string;
}): Promise<{
  outputBuffer: Buffer;
  comparisonReport: NonNullable<DocumentContentPayload['comparisonReport']>;
}> {
  const { templateBuffer, docType, payload, student, confirmIntegral, confirmedDate } = params;
  const zip = new AdmZip(templateBuffer);
  const docEntry = zip.getEntry('word/document.xml');
  if (!docEntry) {
    throw new Error('Arquivo DOCX inválido: word/document.xml ausente.');
  }

  const xmlStr = docEntry.getData().toString('utf8');
  const xmlDoc = new DOMParser().parseFromString(xmlStr, 'text/xml');
  const wNs = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const body = xmlDoc.getElementsByTagNameNS(wNs, 'body')[0];

  let preservedPrefilledCount = 0;
  let filledFieldsCount = 0;
  let pendingFieldsCount = 0;
  let preservedTablesCount = 0;
  const details: string[] = [];

  if (body) {
    const tables = body.getElementsByTagNameNS(wNs, 'tbl');
    preservedTablesCount = tables.length;

    // 1. Update authorized table cells (preserving already filled ones unless explicitly in payload)
    for (let t = 0; t < tables.length; t++) {
      const rows = tables[t].getElementsByTagNameNS(wNs, 'tr');
      for (let r = 0; r < rows.length; r++) {
        const cells = rows[r].getElementsByTagNameNS(wNs, 'tc');
        if (cells.length < 2) continue;
        const labelText = getTextFromXmlNode(cells[0]).trim();
        const currentCellText = getTextFromXmlNode(cells[1]).trim();
        const lowerLabel = labelText.toLowerCase();

        // Check Integral checkbox rule
        if (/turno|período/i.test(lowerLabel) && /\(X\)\s*Integral/i.test(currentCellText)) {
          if (!confirmIntegral) {
            const unchecked = currentCellText
              .replace(/\(X\)\s*Integral(\s*\(exemplo\))?/i, '(  ) Integral')
              .trim();
            setCellParagraphTextPreservingStyle(xmlDoc, cells[1], unchecked);
            details.push('Marcação de exemplo "(X) Integral" desmarcada por falta de confirmação e listada em pendências.');
            pendingFieldsCount++;
          }
          continue;
        }

        // Check XX de fevereiro de 2026 sample date
        if (/município e data|data/i.test(lowerLabel) && /XX de fevereiro/i.test(currentCellText)) {
          if (confirmedDate && confirmedDate.trim()) {
            setCellParagraphTextPreservingStyle(xmlDoc, cells[1], confirmedDate.trim());
            filledFieldsCount++;
          } else {
            details.push('Data de exemplo "XX de fevereiro de 2026" mantida sem data falsa; pendência registrada.');
            pendingFieldsCount++;
          }
          continue;
        }

        // Match payload field by label or location
        const matchedField = payload.fields.find(
          (f) =>
            f.location.includes(`Tabela ${t + 1}, Linha ${r + 1}`) ||
            (labelText && f.label.toLowerCase() === labelText.replace(/:$/, '').toLowerCase())
        );

        const isPlaceholder =
          !currentCellText ||
          /^_+$/.test(currentCellText) ||
          /1º Bim:\s*___/i.test(currentCellText);

        if (!isPlaceholder && currentCellText.length > 0 && matchedField?.status === 'preservado') {
          preservedPrefilledCount++;
          continue;
        }

        if (matchedField && matchedField.status === 'preenchido' && matchedField.value.trim()) {
          if (isPlaceholder || matchedField.confirmedByTeam) {
            setCellParagraphTextPreservingStyle(xmlDoc, cells[1], matchedField.value.trim());
            filledFieldsCount++;
            details.push(`Campo preenchido em ${matchedField.location}: "${matchedField.label}"`);
          } else {
            preservedPrefilledCount++;
          }
        } else if (lowerLabel.includes('estudante') && isPlaceholder) {
          const val = student.codeOrInitials
            ? `${student.displayName} (${student.codeOrInitials})`
            : student.displayName;
          setCellParagraphTextPreservingStyle(xmlDoc, cells[1], val);
          filledFieldsCount++;
        } else if ((lowerLabel.includes('ano/turma') || lowerLabel.includes('turma')) && isPlaceholder) {
          const val = [student.gradeLevel, student.classroom].filter(Boolean).join(' · ') || 'Não informado';
          setCellParagraphTextPreservingStyle(xmlDoc, cells[1], val);
          filledFieldsCount++;
        }
      }
    }

    // 2. Estudo de Caso specific rule: replace narrative guiding questions under each Eixo with connected narrative paragraphs
    if (docType === 'estudo_de_caso' && payload.axes && payload.axes.length > 0) {
      const childrenArray: any[] = [];
      for (let i = 0; i < body.childNodes.length; i++) {
        childrenArray.push(body.childNodes[i]);
      }

      let currentAxisIdx = -1;
      let templateBodyPPr: any = null;
      let templateBodyRPr: any = null;
      const nodesToRemove: any[] = [];
      const insertAfterMap = new Map<any, string[]>();
      let lastAxisHeadingNode: any = null;

      for (const node of childrenArray) {
        if (node.localName !== 'p') continue;
        const pText = getTextFromXmlNode(node).trim();
        if (!pText) continue;

        const isAxisHeading = /^(Eixo\s*\d+|[IVX]+\s*[-–.]\s*Eixo|EIXO\s*\d+)/i.test(pText);
        if (isAxisHeading) {
          const foundIdx = payload.axes.findIndex(
            (a) =>
              pText.toLowerCase().includes(a.axisNumber.toLowerCase()) ||
              pText.toLowerCase() === a.title.toLowerCase()
          );
          currentAxisIdx = foundIdx >= 0 ? foundIdx : currentAxisIdx + 1;
          lastAxisHeadingNode = node;
          const targetAxis = payload.axes[currentAxisIdx];
          if (targetAxis && targetAxis.narrativeParagraphs.length > 0) {
            insertAfterMap.set(node, targetAxis.narrativeParagraphs);
          }
          continue;
        }

        // Stop replacing when reaching authorization or signature block
        if (/Autorização|Assinatura|Responsável Legal|Ciência/i.test(pText)) {
          currentAxisIdx = -1;
          lastAxisHeadingNode = null;
          continue;
        }

        // Inside an axis: detect guiding question paragraphs (including "A família?")
        if (
          currentAxisIdx >= 0 &&
          lastAxisHeadingNode &&
          (pText.endsWith('?') ||
            /A família\?/i.test(pText) ||
            /^(Como|Quais|Qual|Descreva|Relate|O estudante)/i.test(pText))
        ) {
          if (!templateBodyPPr) {
            const pPrs = node.getElementsByTagNameNS(wNs, 'pPr');
            if (pPrs.length > 0) templateBodyPPr = pPrs[0].cloneNode(true);
            const rPrs = node.getElementsByTagNameNS(wNs, 'rPr');
            if (rPrs.length > 0) templateBodyRPr = rPrs[0].cloneNode(true);
          }
          nodesToRemove.push(node);
        }
      }

      // Insert connected narrative paragraphs right after each axis heading
      for (const [headingNode, paragraphsText] of insertAfterMap.entries()) {
        let anchor = headingNode;
        for (const paraText of paragraphsText) {
          const newP = createStyledParagraph(xmlDoc, paraText, templateBodyPPr, templateBodyRPr);
          body.insertBefore(newP, anchor.nextSibling);
          anchor = newP;
          filledFieldsCount++;
        }
      }

      // Remove ONLY the narrative guiding question paragraphs
      for (const rem of nodesToRemove) {
        if (rem.parentNode === body) {
          body.removeChild(rem);
        }
      }
      details.push(
        `Estudo de Caso: ${nodesToRemove.length} perguntas orientadoras removidas (incluindo "A família?" quando presente) e substituídas por relatórios pedagógicos por eixo. Cabeçalhos, timbre, tabelas e assinaturas preservados.`
      );
    }
  }

  pendingFieldsCount += payload.fields.filter((f) => f.status === 'pendente').length;

  const updatedXml = new XMLSerializer().serializeToString(xmlDoc);
  zip.updateFile('word/document.xml', Buffer.from(updatedXml, 'utf8'));

  const comparisonReport: NonNullable<DocumentContentPayload['comparisonReport']> = {
    originalFormat: 'DOCX',
    outputGenerated: true,
    preservedPrefilledCount,
    preservedFormulasCount: 0,
    preservedMergesCount: 0,
    preservedTablesOrSheetsCount: preservedTablesCount,
    filledFieldsCount,
    pendingFieldsCount,
    visualInspectionNote:
      'Estrutura XML do DOCX preservada (estilos, margens, cabeçalhos, timbre, tabelas e blocos de assinatura). Não há renderizador visual headless nesta instância para inspeção gráfica de quebras de página; recomenda-se conferência visual ao abrir no editor DOCX.',
    details,
  };

  return {
    outputBuffer: zip.toBuffer(),
    comparisonReport,
  };
}

export async function fillXlsxTemplate(params: {
  templateBuffer: Buffer;
  payload: DocumentContentPayload;
  student: Student;
  bimester: string;
  subject: string;
  schoolYear: string;
}): Promise<{
  outputBuffer: Buffer;
  comparisonReport: NonNullable<DocumentContentPayload['comparisonReport']>;
}> {
  const { templateBuffer, payload, student, bimester, subject, schoolYear } = params;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(templateBuffer as any);

  let preservedPrefilledCount = 0;
  let preservedFormulasCount = 0;
  let preservedMergesCount = 0;
  let filledFieldsCount = 0;
  let pendingFieldsCount = 0;
  const details: string[] = [];

  const firstSheet = wb.worksheets[0];
  wb.eachSheet((ws) => {
    const merges: string[] = Array.isArray((ws.model as any)?.merges)
      ? (ws.model as any).merges
      : [];
    preservedMergesCount += merges.length;

    ws.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        const val: any = cell.value;
        if (val && typeof val === 'object' && 'formula' in val) {
          preservedFormulasCount++;
        }
      });
    });
  });

  if (firstSheet) {
    // Helper to safely write only if cell is empty and has NO formula
    const safeWriteEmptyCell = (address: string, textValue: string, labelForLog: string): boolean => {
      if (!textValue || !textValue.trim()) return false;
      const cell = firstSheet.getCell(address);
      const targetCell = cell.isMerged && cell.master ? cell.master : cell;
      const cur: any = targetCell.value;
      if (cur && typeof cur === 'object' && 'formula' in cur) {
        details.push(`Fórmula preservada em ${targetCell.address} (=${cur.formula}).`);
        return false;
      }
      const curStr = cur !== null && cur !== undefined ? String(cur).trim() : '';
      if (curStr.length > 0) {
        preservedPrefilledCount++;
        details.push(`Célula já preenchida preservada em ${targetCell.address}: "${curStr}"`);
        return false;
      }
      targetCell.value = textValue.trim();
      filledFieldsCount++;
      details.push(`Célula ${targetCell.address} preenchida (${labelForLog}).`);
      return true;
    };

    // Match explicit field mappings from payload
    for (const field of payload.fields) {
      const cellMatch = field.location.match(/Célula\s+([A-Z]+\d+)/i);
      if (!cellMatch) continue;
      const addr = cellMatch[1].toUpperCase();
      const cell = firstSheet.getCell(addr);
      const target = cell.isMerged && cell.master ? cell.master : cell;
      const cur: any = target.value;

      if (cur && typeof cur === 'object' && 'formula' in cur) {
        continue;
      }
      const curStr = cur !== null && cur !== undefined ? String(cur).trim() : '';
      if (curStr.length > 0 && field.status === 'preservado') {
        preservedPrefilledCount++;
        details.push(`Célula pré-preenchida preservada (${addr}): "${curStr}"`);
        continue;
      }
      if (field.status === 'preenchido' && field.value.trim() && curStr.length === 0) {
        target.value = field.value.trim();
        filledFieldsCount++;
        details.push(`Célula ${addr} preenchida: "${field.label}"`);
      } else if (field.status === 'pendente') {
        pendingFieldsCount++;
      }
    }

    // Fill standard header cells if empty in sample/institutional layout
    const scanHeaderLabels = [
      { match: /^estudante/i, value: student.codeOrInitials ? `${student.displayName} (${student.codeOrInitials})` : student.displayName, label: 'Estudante' },
      { match: /^bimestre/i, value: bimester, label: 'Bimestre' },
      { match: /^componente/i, value: subject, label: 'Componente' },
      { match: /^ano\/turma/i, value: [student.gradeLevel, student.classroom].filter(Boolean).join(' · '), label: 'Ano/Turma' },
      { match: /^ano letivo/i, value: schoolYear, label: 'Ano Letivo' },
    ];

    for (let r = 1; r <= Math.min(10, firstSheet.rowCount); r++) {
      const row = firstSheet.getRow(r);
      for (let c = 1; c <= 6; c++) {
        const labelStr = String(row.getCell(c).value || '').trim();
        for (const item of scanHeaderLabels) {
          if (item.match.test(labelStr) && c < 6 && item.value) {
            const nextAddr = row.getCell(c + 1).address;
            safeWriteEmptyCell(nextAddr, item.value, item.label);
          }
        }
      }
    }

    // Fill PEI objectives rows if table rows 8..11 exist and are empty
    if (payload.peiObjectives && payload.peiObjectives.length > 0) {
      let rowCursor = 8;
      for (const obj of payload.peiObjectives) {
        if (rowCursor > 11) break;
        const r = firstSheet.getRow(rowCursor);
        const isRowHeaderEmpty = !String(r.getCell(1).value || '').trim() && !String(r.getCell(4).value || '').trim();
        if (isRowHeaderEmpty) {
          safeWriteEmptyCell(r.getCell(1).address, obj.skillCode, 'Código da Habilidade');
          safeWriteEmptyCell(r.getCell(2).address, obj.skillDescription, 'Descrição da Habilidade');
          safeWriteEmptyCell(
            r.getCell(3).address,
            [obj.aesCode, obj.aesDescription].filter(Boolean).join(' — '),
            'AES'
          );
          safeWriteEmptyCell(r.getCell(4).address, obj.adaptedObjective, 'Objetivo Individualizado');
          safeWriteEmptyCell(
            r.getCell(5).address,
            `${obj.strategies} | Recursos: ${obj.resources}`,
            'Estratégias e Recursos'
          );
          safeWriteEmptyCell(
            r.getCell(6).address,
            `${obj.monitoringInstruments} | Critério: ${obj.successCriteria}`,
            'Critério e Instrumento'
          );
        }
        rowCursor++;
      }
    }

    // Preserve B2 if already prefilled in sample
    const b2Val = String(firstSheet.getCell('B2').value || '').trim();
    if (b2Val) {
      details.push(`Verificação B2: valor original "${b2Val}" integralmente preservado.`);
    }
  }

  pendingFieldsCount += payload.fields.filter((f) => f.status === 'pendente').length;

  const outBuf = Buffer.from(await wb.xlsx.writeBuffer());
  const comparisonReport: NonNullable<DocumentContentPayload['comparisonReport']> = {
    originalFormat: 'XLSX',
    outputGenerated: true,
    preservedPrefilledCount,
    preservedFormulasCount,
    preservedMergesCount,
    preservedTablesOrSheetsCount: wb.worksheets.length,
    filledFieldsCount,
    pendingFieldsCount,
    visualInspectionNote:
      'Abas, ordem, endereços de células, fórmulas, validações de dados, bordas e mesclagens preservados na cópia XLSX. Recomenda-se conferência visual da largura/quebra de linha ao abrir no Excel ou LibreOffice Calc.',
    details,
  };

  return {
    outputBuffer: outBuf,
    comparisonReport,
  };
}

export async function buildActivityDocx(
  activity: PedagogicalActivity,
  includeAnswerKey: boolean
): Promise<Buffer> {
  const c: ActivityContent = activity.content;
  const children: (Paragraph | Table)[] = [];

  const headerBorder = {
    top: { style: BorderStyle.SINGLE, size: 6, color: '0B1E3B' },
    bottom: { style: BorderStyle.SINGLE, size: 6, color: '0B1E3B' },
    left: { style: BorderStyle.SINGLE, size: 6, color: '0B1E3B' },
    right: { style: BorderStyle.SINGLE, size: 6, color: '0B1E3B' },
  };

  // Student A4 Worksheet Header
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 140 },
      children: [new TextRun({ text: activity.title.toUpperCase(), bold: true, size: 28, color: '0B1E3B' })],
    })
  );

  const isNonLiterate = activity.literacyStage === 'alfabetizacao_inicial';
  const fmt = (txt: string) => (isNonLiterate ? txt.toUpperCase() : txt);

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: headerBorder,
              children: [new Paragraph({ children: [new TextRun({ text: fmt(`Escola: ${c.schoolHeader || '________________________'}`), size: 22 })] })],
            }),
            new TableCell({
              borders: headerBorder,
              children: [new Paragraph({ children: [new TextRun({ text: fmt(`Componente Curricular: ${c.subjectHeader}`), size: 22 })] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              borders: headerBorder,
              children: [new Paragraph({ children: [new TextRun({ text: fmt(`Professor(a): ${c.teacherHeader || '________________________'}`), size: 22 })] })],
            }),
            new TableCell({
              borders: headerBorder,
              children: [new Paragraph({ children: [new TextRun({ text: fmt(`Aluno(a): ${c.studentHeader}`), size: 22 })] })],
            }),
          ],
        }),
      ],
    })
  );

  if (c.brailleOrLibrasNote) {
    children.push(
      new Paragraph({
        spacing: { before: 180, after: 100 },
        children: [
          new TextRun({ text: fmt('Nota de Acessibilidade: '), bold: true, size: 22 }),
          new TextRun({ text: fmt(c.brailleOrLibrasNote), size: 22 }),
        ],
      })
    );
  }

  if (activity.kind === 'atividade' && c.exercises) {
    for (const ex of c.exercises) {
      children.push(
        new Paragraph({
          spacing: { before: 220, after: 80 },
          children: [new TextRun({ text: fmt(`${ex.number}. ${ex.title}`), bold: true, size: 24, color: '0B1E3B' })],
        })
      );
      children.push(
        new Paragraph({
          spacing: { after: 100 },
          children: [new TextRun({ text: fmt(ex.instruction), size: 22 })],
        })
      );
      if (ex.visualAidSpec && ex.visualAidSpec.type !== 'nenhum') {
        if (ex.visualAidSpec.imageUrl && ex.visualAidSpec.imageUrl.startsWith('data:image/')) {
          const match = ex.visualAidSpec.imageUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
          if (match) {
            const rawExt = match[1].toLowerCase();
            const imgType = rawExt === 'png' ? 'png' : 'jpg';
            const imgBuf = Buffer.from(match[2], 'base64');
            children.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 80, after: 80 },
                children: [
                  new ImageRun({
                    data: imgBuf,
                    type: imgType,
                    transformation: { width: 420, height: 315 },
                  }),
                ],
              })
            );
          }
        }
        children.push(
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: fmt(`[Recurso visual: ${ex.visualAidSpec.caption}] `), italics: true, size: 20 }),
              new TextRun({
                text: fmt(ex.visualAidSpec.teacherInsertionNote || `Fonte: ${ex.visualAidSpec.sourceCitation}`),
                size: 18,
                color: '475569',
              }),
            ],
          })
        );
      }
      for (const item of ex.items) {
        children.push(
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: fmt(`• ${item}`), size: 22 })],
          })
        );
      }
      for (let l = 0; l < (ex.responseLines || 2); l++) {
        children.push(
          new Paragraph({
            spacing: { before: 120, after: 80 },
            children: [new TextRun({ text: '__________________________________________________________________________', color: '94A3B8' })],
          })
        );
      }
    }
  } else if (c.lessonPlan) {
    const lp = c.lessonPlan;
    const sections: [string, string[]][] = [
      ['Tema e Público-Alvo', [`Tema: ${lp.theme}`, `Público-alvo: ${lp.targetAudience}`, `Duração: ${lp.durationMinutes} minutos`]],
      ['Objetivos e Habilidades', [...lp.objectives, ...lp.skills]],
      ['Recursos', lp.resources],
      ['Desenvolvimento da Aula', lp.developmentSteps],
      ['Estratégias de Acessibilidade e DUA', lp.accessibilityStrategies],
      [
        'Adaptações por Nível de Apoio',
        [
          `Autonomia: ${lp.supportLevelAdaptations.autonomia}`,
          `Apoio pontual: ${lp.supportLevelAdaptations.apoioPontual}`,
          `Apoio frequente: ${lp.supportLevelAdaptations.apoioFrequente}`,
        ],
      ],
      ['Avaliação Formativa e Ajustes para Barreiras', [lp.formativeAssessment, ...lp.barrierAdjustments]],
    ];
    for (const [heading, lines] of sections) {
      children.push(
        new Paragraph({
          spacing: { before: 180, after: 60 },
          children: [new TextRun({ text: heading, bold: true, size: 24, color: '0B1E3B' })],
        })
      );
      for (const line of lines) {
        children.push(
          new Paragraph({
            spacing: { after: 50 },
            children: [new TextRun({ text: `• ${line}`, size: 22 })],
          })
        );
      }
    }
  }

  // Teacher Orientation Page
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(
    new Paragraph({
      spacing: { after: 140 },
      children: [new TextRun({ text: 'ORIENTAÇÕES PARA O(A) PROFESSOR(A)', bold: true, size: 26, color: '0B1E3B' })],
    })
  );
  children.push(new Paragraph({ children: [new TextRun({ text: `Objetivo Adaptado: ${c.adaptedObjective}`, size: 22 })] }));
  children.push(new Paragraph({ children: [new TextRun({ text: `Habilidade / Referência: ${c.curriculumSkill}`, size: 22 })] }));
  children.push(new Paragraph({ spacing: { before: 100 }, children: [new TextRun({ text: `Antes da atividade: ${c.teacherGuidance.before}`, size: 22 })] }));
  children.push(new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: `Durante a atividade: ${c.teacherGuidance.during}`, size: 22 })] }));
  children.push(new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: `Após a atividade: ${c.teacherGuidance.after}`, size: 22 })] }));

  if (includeAnswerKey && c.exercises && c.exercises.length > 0) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(
      new Paragraph({
        spacing: { after: 140 },
        children: [new TextRun({ text: 'GABARITO COMENTADO (PÁGINA SEPARADA)', bold: true, size: 26, color: '0B1E3B' })],
      })
    );
    for (const ex of c.exercises) {
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({ text: `Exercício ${ex.number} (${ex.title}): `, bold: true, size: 22 }),
            new TextRun({ text: ex.answerKey, size: 22 }),
          ],
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4 in twips
            margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
