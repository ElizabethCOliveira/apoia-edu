import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  AccessibilityMode,
  ActivityContent,
  ActivityKind,
  ApplicationFeedback,
  DocType,
  DocumentContentPayload,
  DocumentFieldEntry,
  LiteracyStage,
  PeIObjectiveItem,
  SourceConflict,
  SourceRecord,
  Student,
} from '../src/types.ts';

export class GeminiServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = 'GeminiServiceError';
    this.statusCode = statusCode;
  }
}

export function isGeminiApiConfigured(): boolean {
  const key = (process.env.GEMINI_API_KEY || process.env.gemini);
  return Boolean(key && key !== 'MY_GEMINI_API_KEY' && key.trim().length >= 10);
}

function getGeminiClient(): GoogleGenAI | null {
  if (!isGeminiApiConfigured()) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: (process.env.GEMINI_API_KEY || process.env.gemini),
    httpOptions: {
      timeout: 60000,
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function mapGeminiError(err: any): GeminiServiceError {
  const status = Number(err?.status || err?.statusCode || 0);
  const rawMessage = String(err?.message || '');
  if (status === 400 && /API_KEY_INVALID|API key not valid/i.test(rawMessage)) {
    return new GeminiServiceError(
      'A chave GEMINI_API_KEY configurada não foi aceita pela API Gemini. Verifique ou selecione uma chave válida em Settings > Secrets.',
      400
    );
  }
  if (status === 403 || /PERMISSION_DENIED/i.test(rawMessage)) {
    return new GeminiServiceError(
      'Permissão negada pela API Gemini (403). Verifique a chave GEMINI_API_KEY em Settings > Secrets.',
      403
    );
  }
  if (status === 429 || /RESOURCE_EXHAUSTED/i.test(rawMessage)) {
    return new GeminiServiceError(
      'Limite de cota da API Gemini atingido no momento (429). Aguarde alguns instantes ou verifique o plano da sua chave em Settings > Secrets.',
      429
    );
  }
  if (status === 404 || /NOT_FOUND/i.test(rawMessage)) {
    return new GeminiServiceError(
      'O modelo de IA solicitado não foi encontrado para esta chave da API Gemini (404). Verifique a configuração da chave em Settings > Secrets.',
      404
    );
  }
  if (status === 503 || /UNAVAILABLE|high demand/i.test(rawMessage)) {
    return new GeminiServiceError(
      'O serviço da API Gemini está com alta demanda temporária (503). Aguarde alguns segundos e clique novamente para gerar.',
      503
    );
  }
  return new GeminiServiceError(
    'Não foi possível concluir a geração com a API Gemini no momento. Tente novamente em instantes.',
    status >= 400 && status < 600 ? status : 502
  );
}

async function callGeminiWithRetry<T>(
  operation: (model: string) => Promise<T>,
  primaryModel = process.env.GEMINI_MODEL || 'gemini-4-hydrogen',
  fallbackModel = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.1-flash-lite'
): Promise<T> {
  const modelsToTry = fallbackModel && fallbackModel !== primaryModel ? [primaryModel, fallbackModel] : [primaryModel];
  let lastError: any;

  for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
    const model = modelsToTry[mIdx];
    const maxAttemptsForModel = mIdx === 0 && modelsToTry.length > 1 ? 1 : 2;
    for (let attempt = 1; attempt <= maxAttemptsForModel; attempt++) {
      try {
        return await operation(model);
      } catch (err: any) {
        lastError = err;
        const status = Number(err?.status || err?.statusCode || 0);
        const msg = String(err?.message || '');
        const isHighDemandOrServer =
          status === 503 || status === 500 || status === 504 || status === 0 || /UNAVAILABLE|timeout|aborted|JSON|Unterminated/i.test(msg);
        const isRateLimit = status === 429;
        if (!isHighDemandOrServer && !isRateLimit) {
          throw mapGeminiError(err);
        }
        if (attempt < maxAttemptsForModel) {
          await new Promise((resolve) => setTimeout(resolve, 450 * attempt));
        }
      }
    }
  }
  throw mapGeminiError(lastError);
}

async function generateEducationalIllustration(
  ai: GoogleGenAI,
  sceneDescription: string,
  subject: string,
  literacyStage: LiteracyStage
): Promise<string> {
  const audienceStyle =
    literacyStage === 'alfabetizacao_inicial'
      ? 'very simple, bold, clear, concrete educational picture-card illustration with only 1 to 3 large well-separated objects for early literacy and intellectual disability accessibility'
      : 'clean, crisp, high-contrast Brazilian school textbook educational illustration, dignified and age-appropriate';

  const fullPrompt = [
    `Create a ${audienceStyle} for a ${subject} A4 printable school worksheet.`,
    `Subject of the illustration: ${sceneDescription}.`,
    'Composition: pure solid white background (#FFFFFF), clean crisp outlines, balanced harmonious colors, generous white space, easy to print in color or black-and-white.',
    'STRICT RULE: DO NOT include ANY text, letters, words, labels, numbers, watermarks, or captions inside the image.',
  ].join(' ');

  const modelsToTry: Array<{ model: string; withSize: boolean }> = [
    { model: 'gemini-nano-banana-2.1', withSize: true },
    { model: 'gemini-3.1-flash-lite-image', withSize: false },
  ];

  let lastError: any;
  for (const candidate of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: candidate.model,
        contents: {
          parts: [{ text: fullPrompt }],
        },
        config: {
          imageConfig: candidate.withSize
            ? { aspectRatio: '4:3', imageSize: '1K' }
            : { aspectRatio: '4:3' },
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/png';
          return `data:${mime};base64,${part.inlineData.data}`;
        }
      }
      lastError = new Error('Nenhuma imagem retornada pelo modelo.');
    } catch (err: any) {
      lastError = err;
      const status = Number(err?.status || err?.statusCode || 0);
      const msg = String(err?.message || '');
      const isTransient = status === 503 || status === 500 || status === 504 || /UNAVAILABLE|high demand|timeout/i.test(msg);
      if (!isTransient) {
        throw mapGeminiError(err);
      }
    }
  }
  throw mapGeminiError(lastError);
}

function buildAnonymizedStudentBrief(student: Student): string {
  const code = student.codeOrInitials || 'ESTUDANTE-COD';
  return [
    `Código do estudante (uso anônimo): ${code}`,
    `Ano/Série: ${student.gradeLevel || 'Não informado'}`,
    `Potencialidades registradas: ${student.strengths || 'Não informado'}`,
    `Interesses registrados: ${student.interests || 'Não informado'}`,
    `Nível atual de aprendizagem: ${student.learningLevel || 'Não informado'}`,
    `Formas de comunicação e resposta: ${student.communicationModes || 'Não informado'}`,
    `Barreiras identificadas: ${student.barriers || 'Não informado'}`,
    `Estratégias que funcionam: ${student.workingStrategies || 'Não informado'}`,
    `Recursos de acessibilidade: ${student.accessibilityResources || 'Não informado'}`,
    `Avaliação pedagógica mais recente: ${student.latestPedagogicalEval || 'Não informado'}`,
  ].join('\n');
}

function extractCurriculumCodesFromSources(sources: SourceRecord[]): {
  skillCode: string;
  skillDescription: string;
  aesCode: string;
  aesDescription: string;
  sourceTitle: string;
}[] {
  const found: {
    skillCode: string;
    skillDescription: string;
    aesCode: string;
    aesDescription: string;
    sourceTitle: string;
  }[] = [];

  for (const src of sources) {
    const text = src.extractedText || '';
    const skillRegex = /\(([A-Z]{2}\d{2}[A-Z]{2}\d{2})\)\s*([^\n]+)/g;
    let m: RegExpExecArray | null;
    while ((m = skillRegex.exec(text)) !== null) {
      const aesMatch = text.match(/(AES-[A-Z0-9-]+)\s*[—–-]\s*([^\n]+)/);
      found.push({
        skillCode: m[1],
        skillDescription: m[2].trim(),
        aesCode: aesMatch ? aesMatch[1] : '',
        aesDescription: aesMatch ? aesMatch[2].trim() : '',
        sourceTitle: `${src.title} (v${src.versionNumber})`,
      });
    }
  }
  return found;
}

export async function generateDocumentDraft(params: {
  docType: DocType;
  student: Student;
  sources: SourceRecord[];
  templateSource: SourceRecord | null;
  subject: string;
  bimester: string;
  schoolYear: string;
  revisionInstruction?: string;
  periodApplications?: ApplicationFeedback[];
  useAi: boolean;
  isDemo: boolean;
  confirmedCurriculum?: string;
}): Promise<DocumentContentPayload> {
  const {
    docType,
    student,
    sources,
    templateSource,
    subject,
    bimester,
    schoolYear,
    revisionInstruction,
    periodApplications = [],
    useAi,
    isDemo,
    confirmedCurriculum,
  } = params;

  const missingRequestedFiles: string[] = [];
  const hasEstudoOrientacao = sources.some(
    (s) =>
      /estudo-de-caso-educacao-inclusiva/i.test(s.title) ||
      /estudo-de-caso-educacao-inclusiva/i.test(s.originalFilename)
  );
  if (docType === 'estudo_de_caso' && !hasEstudoOrientacao) {
    missingRequestedFiles.push(
      'Arquivo de orientação "estudo-de-caso-educacao-inclusiva" não localizado nas fontes. Anexe-o para aplicar suas diretrizes específicas.'
    );
  }

  const templateEditableUsed = Boolean(templateSource && templateSource.isEditableTemplate);
  const templateFormatNote = !templateSource
    ? 'Nenhum modelo editável foi selecionado; conteúdo estruturado por campo/eixo na tela de revisão.'
    : templateSource.isEditableTemplate
    ? `Modelo editável preservado (${templateSource.fileExt.toUpperCase()}): "${templateSource.title}".`
    : templateSource.parsedStructure?.nonEditableReason ||
      'O modelo selecionado está em formato não editável (PDF/Imagem). O conteúdo foi estruturado por campo para revisão; solicite a versão editável em DOCX ou XLSX para preenchimento fiel no arquivo oficial.';

  const consultedSources = sources.map((s) => ({
    sourceId: s.id,
    title: s.title,
    kind: s.sourceKind,
    versionNumber: s.versionNumber,
    originNote: `${s.originalFilename || s.title} (v${s.versionNumber})`,
  }));

  const ai = useAi && (isDemo || true) ? getGeminiClient() : null;

  // Deterministic local structured draft (always works cleanly and acts as baseline or local mode)
  const localDraft = buildLocalDocumentDraft({
    docType,
    student,
    sources,
    templateSource,
    subject,
    bimester,
    schoolYear,
    revisionInstruction,
    periodApplications,
    missingRequestedFiles,
    templateEditableUsed,
    templateFormatNote,
    consultedSources,
  });

  if (!useAi) {
    return localDraft;
  }

  if (!ai) {
    throw new GeminiServiceError(
      'A variável GEMINI_API_KEY ainda não está configurada no servidor. Configure a chave no painel Settings > Secrets do Google AI Studio ou desmarque a geração com IA para usar a extração local.',
      503
    );
  }

  // Call Gemini 4 Hydrogen with anonymized minimal excerpts & strict pedagogical rules
  const anonymizedBrief = buildAnonymizedStudentBrief(student);
  const sourceExcerpts = sources
    .map((s) => {
      const cleanExcerpt = (s.extractedText || '').slice(0, 2200);
      return `[FONTE id=${s.id} | tipo=${s.sourceKind} | cat=${s.docCategory} | título="${s.title}" | v${s.versionNumber}]\n${cleanExcerpt}`;
    })
    .join('\n\n');

  const feedbackExcerpts =
    periodApplications.length > 0
      ? periodApplications
          .map(
            (a) =>
              `[REGISTRO ${a.appliedDate} | prof=${a.teacherName} | status=${a.status} | objetivo=${a.objectiveStatus} | apoio=${a.supportLevel}] ${a.briefObservation} (Próx: ${a.nextStep})`
          )
          .join('\n')
      : 'Nenhum registro de aplicação selecionado para o período.';

  const systemInstruction = `Você é um especialista pedagógico brasileiro da plataforma ApoIA.Edu (LumiNext Tech).
Regras inegociáveis:
1. Linguagem profissional, acolhedora e não capacitista em português do Brasil.
2. NUNCA invente dados pessoais, diagnósticos, laudos, datas, assinaturas, autorizações, códigos de habilidades ou avanços sem fonte.
3. Diferencie sempre: "informacao_documentada", "relato_identificado", "observacao_professor" e "sugestao_pedagogica".
4. Um resultado esperado no PAEE nunca pode aparecer como avanço observado.
5. Ausência de informação não significa ausência de habilidade ou necessidade.
6. Para Estudo de Caso: produza parágrafos narrativos conectados por eixo substituindo perguntas orientadoras; separe o que foi relatado pelo estudante, pela família e pela equipe; não repita "Não informado" nos parágrafos e liste lacunas em narrativeGaps. Não deduza relação causal entre estratégia e resultado apenas por seleção múltipla no Forms.
7. Para PAEE: relacione propostas a potencialidades/necessidades/barreiras; diferencie apoio recomendado vs disponível, responsabilidade proposta vs confirmada, resultado esperado vs observado; não deduza nível de apoio pedagógico a partir de nível clínico de suporte do TEA.
8. Para PEI: priorize 1. PAEE, 2. Estudo de Caso, 3. Escopo-Sequência e Guia Priorizado, 4. Guia de Aprendizagem. Copie códigos e descrições de Habilidades e AES exatamente das fontes; se ausente na fonte, marque como pendente e não invente código.
${revisionInstruction ? `Solicitação de revisão humana: ${revisionInstruction}` : ''}`;

  const prompt = `Tarefa: Elaborar minuta de ${docType.toUpperCase()} (${subject || 'Geral'}, ${bimester || 'Período geral'}, Ano letivo ${schoolYear || '2026'}).
Currículo selecionado: ${confirmedCurriculum || 'Não especificado'}.

Perfil anônimo do estudante:
${anonymizedBrief}

Fontes documentais disponíveis (ordenar e citar exatamente a origem):
${sourceExcerpts || 'Sem fontes anexadas além do perfil pedagógico.'}

Registros de aplicação do período:
${feedbackExcerpts}

Retorne apenas JSON válido seguindo o esquema.`;

  const parsed = await callGeminiWithRetry(async (model) => {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            axes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  axisNumber: { type: Type.STRING },
                  title: { type: Type.STRING },
                  narrativeParagraphs: { type: Type.ARRAY, items: { type: Type.STRING } },
                  originReference: { type: Type.STRING },
                  estudanteRelato: { type: Type.STRING },
                  familiaRelato: { type: Type.STRING },
                  equipeRelato: { type: Type.STRING },
                },
              },
            },
            peiObjectives: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  adaptedObjective: { type: Type.STRING },
                  strategies: { type: Type.STRING },
                  resources: { type: Type.STRING },
                  participationModes: { type: Type.STRING },
                  monitoringInstruments: { type: Type.STRING },
                  successCriteria: { type: Type.STRING },
                  barrier: { type: Type.STRING },
                  supportOrStrategy: { type: Type.STRING },
                  outcomeText: { type: Type.STRING },
                  originReference: { type: Type.STRING },
                },
              },
            },
            narrativeGaps: { type: Type.ARRAY, items: { type: Type.STRING } },
            pendingItems: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
      },
    });
    return JSON.parse((response.text || '{}').trim());
  });

  // Merge AI proposals strictly into local verified structure (preserving template fields, formulas, exact curriculum codes, and origin tags)
  if (docType === 'estudo_de_caso' && Array.isArray(parsed.axes) && parsed.axes.length > 0) {
    localDraft.axes = parsed.axes.map((ax: any, idx: number) => ({
      axisNumber: ax.axisNumber || `Eixo ${idx + 1}`,
      title: templateSource?.parsedStructure?.axes?.[idx]?.title || ax.title || `Eixo ${idx + 1}`,
      narrativeParagraphs: Array.isArray(ax.narrativeParagraphs) ? ax.narrativeParagraphs : [],
      originKind: 'relato_identificado',
      originReference: ax.originReference || 'Síntese das fontes do estudante',
      reportedByBreakdown: {
        estudante: ax.estudanteRelato || undefined,
        familia: ax.familiaRelato || undefined,
        equipe: ax.equipeRelato || undefined,
      },
    }));
  }

  if (docType === 'pei' && Array.isArray(parsed.peiObjectives) && parsed.peiObjectives.length > 0) {
    const extractedSkills = extractCurriculumCodesFromSources(sources);
    localDraft.peiObjectives = parsed.peiObjectives.map((obj: any, idx: number) => {
      const matchedSkill = extractedSkills[idx] || extractedSkills[0];
      return {
        id: `pei_obj_${idx + 1}`,
        subject: subject || 'Componente curricular',
        bimester: bimester || '1º Bimestre',
        skillCode: matchedSkill ? matchedSkill.skillCode : '',
        skillDescription: matchedSkill
          ? matchedSkill.skillDescription
          : 'Pendente: nenhuma habilidade curricular com código foi encontrada nas fontes fornecidas.',
        aesCode: matchedSkill?.aesCode || undefined,
        aesDescription: matchedSkill?.aesDescription || undefined,
        adaptedObjective: obj.adaptedObjective || '',
        strategies: obj.strategies || student.workingStrategies || '',
        resources: obj.resources || student.accessibilityResources || '',
        participationModes: obj.participationModes || student.communicationModes || '',
        monitoringInstruments: obj.monitoringInstruments || 'Registro de observação pedagógica por aplicação',
        successCriteria: obj.successCriteria || 'Participação ativa com o nível de apoio planejado',
        barrier: obj.barrier || student.barriers || 'Barreira pedagógica documentada',
        supportOrStrategy: obj.supportOrStrategy || student.workingStrategies || 'Apoio estruturado',
        outcomeType: periodApplications.length > 0 ? 'observado' : 'esperado',
        outcomeText: obj.outcomeText || 'Resultado esperado para revisão da equipe.',
        originKind: 'sugestao_pedagogica',
        originReference: obj.originReference || 'Sugestão pedagógica gerada para revisão docente',
      };
    });
  }

  if (Array.isArray(parsed.narrativeGaps) && parsed.narrativeGaps.length > 0) {
    localDraft.narrativeGaps = Array.from(new Set([...localDraft.narrativeGaps, ...parsed.narrativeGaps]));
  }
  if (Array.isArray(parsed.pendingItems) && parsed.pendingItems.length > 0) {
    localDraft.pendingItems = Array.from(new Set([...localDraft.pendingItems, ...parsed.pendingItems]));
  }
  localDraft.generationMode = 'ia_institucional';

  return localDraft;
}

function buildLocalDocumentDraft(params: {
  docType: DocType;
  student: Student;
  sources: SourceRecord[];
  templateSource: SourceRecord | null;
  subject: string;
  bimester: string;
  schoolYear: string;
  revisionInstruction?: string;
  periodApplications: ApplicationFeedback[];
  missingRequestedFiles: string[];
  templateEditableUsed: boolean;
  templateFormatNote: string;
  consultedSources: DocumentContentPayload['consultedSources'];
}): DocumentContentPayload {
  const {
    docType,
    student,
    sources,
    templateSource,
    subject,
    bimester,
    schoolYear,
    revisionInstruction,
    periodApplications,
    missingRequestedFiles,
    templateEditableUsed,
    templateFormatNote,
    consultedSources,
  } = params;

  const fields: DocumentFieldEntry[] = [];
  const conflicts: SourceConflict[] = [];
  const narrativeGaps: string[] = [];
  const pendingItems: string[] = [];

  // Detect template markers (Integral, XX de fevereiro, TIMBRE)
  const markers = templateSource?.parsedStructure?.markersDetected;
  if (markers?.hasIntegralCheckbox) {
    pendingItems.push('Turno "Integral" constava marcado como exemplo no modelo e foi desmarcado aguardando confirmação da equipe.');
  }
  if (markers?.hasSampleDateXX) {
    pendingItems.push('Data de exemplo "XX de fevereiro de 2026" mantida sem preenchimento até confirmação oficial da data e do município.');
  }
  if (markers?.hasTimbrePlaceholder) {
    pendingItems.push('Marcador "TIMBRE DA UNIDADE ESCOLAR" preservado até envio e autorização do timbre oficial.');
  }

  // Inspect existing fields from template
  if (templateSource?.parsedStructure?.fields) {
    for (const tf of templateSource.parsedStructure.fields) {
      if (tf.kind === 'axis_narrative') continue;
      if (tf.hasFormula) {
        fields.push({
          fieldKey: tf.key,
          label: tf.label,
          location: tf.location,
          value: tf.currentValue,
          originKind: 'informacao_documentada',
          originReference: `${templateSource.title} (${tf.location})`,
          status: 'preservado',
          statusReason: 'Fórmula da planilha preservada integralmente.',
        });
        continue;
      }
      if (tf.isPrefilled && !/XX de fevereiro|\(X\) Integral/i.test(tf.currentValue)) {
        fields.push({
          fieldKey: tf.key,
          label: tf.label,
          location: tf.location,
          value: tf.currentValue,
          originKind: 'informacao_documentada',
          originReference: `${templateSource.title} (${tf.location})`,
          status: 'preservado',
          statusReason: 'Campo já preenchido no modelo original foi preservado conforme regra institucional.',
        });
        continue;
      }

      const lowerLabel = tf.label.toLowerCase();
      let mappedVal = '';
      let originRef = 'Cadastro do estudante';
      if (lowerLabel.includes('estudante')) {
        mappedVal = student.codeOrInitials ? `${student.displayName} (${student.codeOrInitials})` : student.displayName;
      } else if (lowerLabel.includes('ano/turma') || lowerLabel.includes('turma')) {
        mappedVal = [student.gradeLevel, student.classroom].filter(Boolean).join(' · ');
      } else if (lowerLabel.includes('bimestre')) {
        mappedVal = bimester;
      } else if (lowerLabel.includes('componente')) {
        mappedVal = subject;
      } else if (lowerLabel.includes('ano letivo')) {
        mappedVal = schoolYear;
      } else if (lowerLabel.includes('perfil funcional')) {
        const docParts = [
          student.communicationModes && `Comunicação: ${student.communicationModes}`,
          student.strengths && `Potencialidades: ${student.strengths}`,
          student.barriers && `Barreiras: ${student.barriers}`,
        ].filter(Boolean);
        mappedVal = docParts.join(' | ');
        originRef = 'Fontes documentadas e perfil pedagógico';
      }

      if (mappedVal) {
        fields.push({
          fieldKey: tf.key,
          label: tf.label,
          location: tf.location,
          value: mappedVal,
          originKind: 'informacao_documentada',
          originReference: originRef,
          status: 'preenchido',
          statusReason: 'Preenchido automaticamente com dados identificados do estudante/solicitação.',
        });
      } else if (!/observa|assinatura|ciência/i.test(lowerLabel)) {
        fields.push({
          fieldKey: tf.key,
          label: tf.label,
          location: tf.location,
          value: '',
          originKind: 'informacao_documentada',
          originReference: 'Sem fonte suficiente',
          status: 'pendente',
          statusReason:
            docType === 'pei'
              ? 'Campo factual mantido em branco por ausência de fonte documental confirmada.'
              : 'Pendente de confirmação ou preenchimento da equipe escolar.',
        });
      }
    }
  }

  const allSourceTexts = sources.map((s) => `${s.title} (v${s.versionNumber}): ${s.extractedText}`).join('\n');
  const formsSources = sources.filter((s) => s.sourceKind === 'resposta_forms');
  const paeeSources = sources.filter((s) => s.docCategory === 'paee');
  const ecSources = sources.filter((s) => s.docCategory === 'estudo_de_caso');

  if (docType === 'estudo_de_caso') {
    const familyMatch = allSourceTexts.match(/Relato da família:\s*([^\n]+)/i);
    const teamMatch = allSourceTexts.match(/Relato da equipe[^:]*:\s*([^\n]+)/i);
    const studentMatch = allSourceTexts.match(/Relato do estudante:\s*([^\n]+)/i);
    const barriersMatch = allSourceTexts.match(/Barreiras selecionadas[^:]*:\s*([^\n]+)/i);
    const strategiesMatch = allSourceTexts.match(/Estratégias observadas[^:]*:\s*([^\n]+)/i);

    const templateAxes = templateSource?.parsedStructure?.axes || [
      { axisNumber: 'Eixo 1', title: 'Eixo 1 – Contexto Escolar, Comunicação e Interação', guidingQuestions: [], hasAFamiliaFragment: true },
      { axisNumber: 'Eixo 2', title: 'Eixo 2 – Potencialidades, Interesses e Aprendizagem', guidingQuestions: [], hasAFamiliaFragment: false },
    ];

    const axes = templateAxes.map((ax, idx) => {
      if (idx === 0) {
        const p1 = [
          teamMatch
            ? `Segundo relato da equipe docente (${formsSources[0]?.title || 'Forms institucional'}), ${teamMatch[1].trim()}`
            : student.communicationModes
            ? `Conforme registro pedagógico, a comunicação e resposta do estudante ocorre por: ${student.communicationModes}.`
            : '',
          barriersMatch
            ? `No levantamento de barreiras identificadas (${formsSources[0]?.title || 'Forms'}), destacam-se as seleções assinaladas sem inferência causal automática: ${barriersMatch[1].trim()}`
            : student.barriers
            ? `Entre as barreiras documentadas no contexto escolar, registram-se: ${student.barriers}.`
            : '',
        ].filter(Boolean);
        if (p1.length === 0) {
          narrativeGaps.push(`${ax.title}: faltam registros detalhados sobre comunicação e barreiras observadas pela família e equipe.`);
        }
        return {
          axisNumber: ax.axisNumber,
          title: ax.title,
          narrativeParagraphs:
            p1.length > 0
              ? p1
              : ['A equipe escolar registrou este eixo para complementação após escuta da família e observação sistemática em sala.'],
          originKind: 'relato_identificado' as const,
          originReference: formsSources[0] ? `${formsSources[0].title} (v${formsSources[0].versionNumber})` : 'Perfil pedagógico cadastrado',
          reportedByBreakdown: {
            estudante: studentMatch?.[1]?.trim(),
            familia: familyMatch?.[1]?.trim(),
            equipe: teamMatch?.[1]?.trim(),
          },
        };
      } else {
        const p2 = [
          familyMatch
            ? `A família relatou que ${familyMatch[1].trim()}`
            : student.interests
            ? `Os interesses documentados incluem: ${student.interests}.`
            : '',
          strategiesMatch || student.workingStrategies
            ? `Como estratégias favoráveis à participação já observadas pela equipe, constam: ${
                strategiesMatch?.[1]?.trim() || student.workingStrategies
              }.`
            : '',
          studentMatch ? `O próprio estudante manifestou que ${studentMatch[1].trim()}` : '',
        ].filter(Boolean);
        if (!familyMatch) {
          narrativeGaps.push(`${ax.title}: confirmar relato direto da família sobre rotina de estudos.`);
        }
        return {
          axisNumber: ax.axisNumber,
          title: ax.title,
          narrativeParagraphs:
            p2.length > 0
              ? p2
              : ['Eixo reservado para registro das potencialidades e estratégias observadas no cotidiano escolar.'],
          originKind: 'relato_identificado' as const,
          originReference: formsSources[0] ? `${formsSources[0].title} (v${formsSources[0].versionNumber})` : 'Registros escolares disponíveis',
          reportedByBreakdown: {
            estudante: studentMatch?.[1]?.trim(),
            familia: familyMatch?.[1]?.trim(),
            equipe: strategiesMatch?.[1]?.trim(),
          },
        };
      }
    });

    return {
      generationMode: 'extracao_local',
      templateFormatNote,
      templateEditableUsed,
      axes,
      fields,
      conflicts,
      narrativeGaps,
      pendingItems,
      missingRequestedFiles,
      consultedSources,
    };
  }

  if (docType === 'paee') {
    const supports = [
      {
        id: 'paee_sup_1',
        barrierOrNeed: student.barriers || 'Enunciados extensos ou estímulos simultâneos em sala',
        supportType: student.accessibilityResources || 'Roteiro visual passo a passo e apoio de mediação estruturada',
        availabilityStatus: 'recomendado' as const,
        responsibilityStatus: 'proposta' as const,
        responsibleRole: 'Professor(a) regente em articulação com docente do AEE',
        outcomeStatus: periodApplications.length > 0 ? ('observado' as const) : ('esperado' as const),
        outcomeDescription:
          periodApplications.length > 0
            ? `Observado em ${periodApplications.length} aplicação(ões) do período.`
            : 'Resultado esperado: ampliar autonomia na compreensão dos enunciados.',
        originReference: ecSources[0]
          ? `${ecSources[0].title} (v${ecSources[0].versionNumber})`
          : 'Perfil pedagógico do estudante',
      },
    ];

    if (fields.length === 0) {
      fields.push(
        {
          fieldKey: 'paee_sintese',
          label: 'Síntese das potencialidades e barreiras',
          location: 'Bloco 1 · Síntese',
          value: [student.strengths && `Potencialidades: ${student.strengths}`, student.barriers && `Barreiras: ${student.barriers}`]
            .filter(Boolean)
            .join(' | '),
          originKind: 'informacao_documentada',
          originReference: ecSources[0]?.title || 'Perfil pedagógico',
          status: student.strengths || student.barriers ? 'preenchido' : 'pendente',
          statusReason: 'Baseado nos registros do Estudo de Caso e perfil.',
        },
        {
          fieldKey: 'paee_apoios',
          label: 'Apoios recomendados x disponíveis e justificativas',
          location: 'Bloco 2 · Apoios',
          value: `Apoio recomendado: ${supports[0].supportType} (Responsabilidade proposta: ${supports[0].responsibleRole}).`,
          originKind: 'sugestao_pedagogica',
          originReference: 'Proposta para validação da equipe',
          status: 'preenchido',
          statusReason: 'Diferencia apoio recomendado de apoio disponível.',
        }
      );
    }

    return {
      generationMode: 'extracao_local',
      templateFormatNote,
      templateEditableUsed,
      fields,
      paeeSupports: supports,
      conflicts,
      narrativeGaps,
      pendingItems,
      missingRequestedFiles,
      consultedSources,
    };
  }

  // PEI Module
  const extractedSkills = extractCurriculumCodesFromSources(sources);
  const prioritySource = paeeSources[0]?.title || ecSources[0]?.title || 'Perfil pedagógico cadastrado';

  if (extractedSkills.length === 0) {
    pendingItems.push(
      'Habilidade curricular ausente nas fontes fornecidas: campo de habilidade mantido pendente sem inventar código ou resumo.'
    );
    fields.push({
      fieldKey: 'pei_habilidade_pendente',
      label: 'Habilidade Curricular (Código e Descrição)',
      location: 'Tabela de Objetivos · Colunas A-B',
      value: '',
      originKind: 'informacao_documentada',
      originReference: 'Nenhuma fonte curricular (Escopo-Sequência / Guia) anexada para este componente/bimestre',
      status: 'pendente',
      statusReason: 'Campo factual sem fonte documental permanece em branco.',
    });
  }

  // Check potential conflict between PAEE and Curriculum/Guide
  if (paeeSources.length > 0 && sources.some((s) => s.sourceKind === 'fonte_curricular')) {
    const hasSupportNote = /roteiro visual|etapas curtas/i.test(paeeSources[0].extractedText + ' ' + student.workingStrategies);
    if (hasSupportNote) {
      conflicts.push({
        topic: 'Ritmo e formato de registro das atividades',
        higherPrioritySource: `1º Prioridade — PAEE (${paeeSources[0].title})`,
        higherPriorityValue: 'Priorizar enunciados curtos, fragmentação em etapas e apoio visual.',
        lowerPrioritySource: '3º Prioridade — Escopo-Sequência / Currículo',
        lowerPriorityValue: 'Sequência padrão de resolução extensa sem fragmentação explícita.',
        resolutionNote: 'Aplicada a prioridade do PAEE sobre a forma de acesso, preservando a habilidade curricular oficial.',
      });
    }
  }

  const baseSkill = extractedSkills[0];
  const obsSummary =
    periodApplications.length > 0
      ? `Com base em ${periodApplications.length} aplicação(ões) registradas (${periodApplications
          .map((p) => `${p.appliedDate}: ${p.objectiveStatus || p.status}`)
          .join('; ')}), sugere-se ajustar a mediação para ${periodApplications[periodApplications.length - 1]?.nextStep || 'manter apoio estruturado'}.`
      : '';

  const peiObjectives: PeIObjectiveItem[] = [
    {
      id: 'pei_obj_1',
      subject: subject || 'Componente curricular',
      bimester: bimester || '1º Bimestre',
      skillCode: baseSkill ? baseSkill.skillCode : '',
      skillDescription: baseSkill ? baseSkill.skillDescription : '',
      aesCode: baseSkill?.aesCode || undefined,
      aesDescription: baseSkill?.aesDescription || undefined,
      adaptedObjective: baseSkill
        ? `Resolver situações do componente ${subject || ''} (${baseSkill.skillCode}) utilizando apoio visual estruturado e etapas curtas.`
        : `Consolidar objetivo funcional em ${subject || 'componente'} considerando as potencialidades e barreiras documentadas${
            revisionInstruction ? ` (${revisionInstruction})` : ''
          }.`,
      strategies:
        student.workingStrategies ||
        'Fragmentação de enunciados, modelagem inicial guiada e verificação de compreensão passo a passo.',
      resources: student.accessibilityResources || 'Cartões visuais e material manipulável concreto.',
      participationModes: student.communicationModes || 'Oralidade breve, seleção ou apontamento.',
      monitoringInstruments: 'Registro de aplicação no ApoIA.Edu (participação, alcance do objetivo e nível de apoio).',
      successCriteria: 'Realizar a tarefa proposta com o recurso de acessibilidade planejado.',
      barrier: student.barriers || 'Sobrecarga em enunciados extensos sem apoio visual.',
      supportOrStrategy: student.workingStrategies || 'Roteiro visual e mediação em etapas.',
      outcomeType: periodApplications.length > 0 ? 'observado' : 'esperado',
      outcomeText:
        obsSummary || 'Resultado esperado: participação ativa nas propostas do bimestre com mediação planejada.',
      originKind: 'sugestao_pedagogica',
      originReference: `Sugestão para revisão · Prioridade: ${prioritySource}${baseSkill ? ` + ${baseSkill.sourceTitle}` : ''}`,
    },
  ];

  return {
    guidanceGreeting: 'Olá professor,',
    generationMode: 'extracao_local',
    templateFormatNote,
    templateEditableUsed,
    fields,
    peiObjectives,
    conflicts,
    narrativeGaps,
    pendingItems,
    missingRequestedFiles,
    consultedSources,
  };
}

export async function generateAdaptedActivityOrPlan(params: {
  kind: ActivityKind;
  student: Student;
  teacherName: string;
  subject: string;
  theme: string;
  bimester: string;
  schoolYear: string;
  durationMinutes: number;
  literacyStage: LiteracyStage;
  accessibilityMode: AccessibilityMode;
  includeAnswerKey: boolean;
  classMaterialText: string;
  peiObjectiveText: string;
  paeeSupportUsed: string;
  useAi: boolean;
  generateImages?: boolean;
  isDemo: boolean;
}): Promise<{
  scopeRedirect?: { targetModule: string; message: string };
  title: string;
  content: ActivityContent;
  aiUsed: boolean;
  imagesGenerated: number;
}> {
  const {
    kind,
    student,
    teacherName,
    subject,
    theme,
    durationMinutes,
    literacyStage,
    accessibilityMode,
    classMaterialText,
    peiObjectiveText,
    paeeSupportUsed,
    useAi,
    generateImages = true,
  } = params;

  // Scope check: redirect Estudo de Caso / PAEE / PEI requests inside Activity generator
  const lowerTheme = `${theme} ${classMaterialText}`.toLowerCase();
  if (/\b(elaborar|gerar|criar)\s+(estudo de caso|paee|pei)\b/i.test(lowerTheme)) {
    const target = lowerTheme.includes('paee')
      ? 'PAEE (aba Documentos)'
      : lowerTheme.includes('pei')
      ? 'PEI (aba Documentos)'
      : 'Estudo de Caso (aba Documentos)';
    return {
      scopeRedirect: {
        targetModule: target,
        message: `Este módulo é exclusivo para atividades adaptadas e planos de aula. Para elaborar ou revisar o documento institucional solicitado, utilize o módulo ${target}.`,
      },
      title: '',
      content: {} as ActivityContent,
      aiUsed: false,
      imagesGenerated: 0,
    };
  }

  const maxExercises = literacyStage === 'alfabetizado' ? 4 : 2;
  const effectiveDuration = Math.min(durationMinutes || 50, 50);

  let brailleOrLibrasNote: string | undefined;
  if (accessibilityMode === 'braille') {
    brailleOrLibrasNote =
      'Braille (Grafia Brasileira): texto-base estruturado sem substituição improvisada por caracteres Unicode; elementos visuais convertidos em descrições táteis. Requer validação e transcrição por profissional especializado em Braille conforme faixa etária.';
  } else if (accessibilityMode === 'libras') {
    brailleOrLibrasNote =
      'Libras: respeitar a estrutura linguística da Língua Brasileira de Sinais (L1 visual-espacial). Não inventar sinais; utilizar datilologia apenas para termos específicos sem sinal consolidado e validar sinalização contextual com intérprete/profissional de Libras.';
  } else if (accessibilityMode === 'tatil_auditivo') {
    brailleOrLibrasNote =
      'Acesso tátil e auditivo: utilizar objetos concretos de alto contraste e leitura mediada em etapas curtas.';
  }

  const interestContext = student.interests
    ? `Tema contextualizado com interesse registrado do estudante (${student.interests}), preservando o conteúdo da turma.`
    : 'Exemplos neutros do cotidiano escolar, preservando integralmente o conteúdo da turma.';

  const usedSourcesList = [
    `Perfil pedagógico de ${student.displayName}`,
    paeeSupportUsed ? `Apoio do PAEE: ${paeeSupportUsed}` : null,
    peiObjectiveText ? `Objetivo do PEI: ${peiObjectiveText}` : null,
    classMaterialText ? 'Material da turma informado pelo professor' : null,
  ].filter(Boolean) as string[];

  const ai = useAi ? getGeminiClient() : null;
  if (useAi && !ai) {
    throw new GeminiServiceError(
      'A variável GEMINI_API_KEY ainda não está configurada no servidor. Adicione a chave no painel Settings > Secrets do Google AI Studio (ou desmarque a opção de IA para gerar no modo estruturado local).',
      503
    );
  }

  if (useAi && ai) {
    const systemInstruction = `Você é um(a) especialista pedagógico(a) brasileiro(a) em Educação Inclusiva, AEE e Desenho Universal para a Aprendizagem (DUA) da plataforma ApoIA.Edu (LumiNext Tech).
Regras pedagógicas inegociáveis:
1. Escreva em português do Brasil claro, acolhedor, objetivo e não capacitista.
2. Nunca invente diagnósticos, dados clínicos ou informações pessoais do estudante; baseie-se estritamente no perfil anônimo e nas fontes fornecidas.
3. Preserve o conteúdo curricular da turma com as adequações de acesso, mediação e complexidade compatíveis com o perfil do estudante (sem infantilizar nem reduzir indevidamente quando o estudante tiver pleno potencial cognitivo, como em paraplegia/deficiência física sem DI).
4. Se literacyStage for "alfabetizacao_inicial" (estudante não alfabetizado): escreva TODOS os textos voltados à folha do estudante (title, título dos exercícios, instruction, items e legendas visuais) integralmente em CAIXA ALTA (LETRAS MAIÚSCULAS), com até 2 exercícios curtos de pareamento, seleção, identificação ou associação.
5. Se literacyStage for "alfabetizado": elabore de 2 a 4 exercícios concretos, completos e prontos para impressão em A4 (sem respostas genéricas ou placeholders vazios).
6. Para cada exercício, gere um apoio visual rico e específico do tema! Escolha visualAidType entre: "cartao_associacao", "sequencia_visual", "ciclo_natureza", "tabela_classificacao", "linha_numerica", "mapa_conceitual", "figura_geometrica", "sistema_solar" ou "nenhum" (inclua apoio visual real em pelo menos 2 exercícios!).
7. Sempre que visualAidType for diferente de "nenhum", preencha visualAidCards com 2 a 4 cartões concretos do tema contendo { label, sublabel, icon }, escolhendo icon entre: "sol", "chuva", "agua", "planta", "arvore", "escola", "casa", "cidade", "saude", "terra", "saturno", "peixe", "borboleta", "passaro", "animal", "livro", "lapis", "relogio", "coracao", "musica", "bola", "fruta", "numeros", "formas", "mapa", "lupa", "mao", "estrela", E preencha visualAidImagePrompt em inglês descrevendo uma cena escolar limpa e concreta de alto contraste em fundo branco puro (sem texto dentro da imagem) para gerar a ilustração em alta qualidade.
8. Seja objetivo e conciso: cada enunciado deve ter de 1 a 2 frases curtas; cada item de lista deve ter no máximo 140 caracteres; nunca repita frases ou palavras.`;

    const prompt = `Crie ${kind === 'atividade' ? 'uma atividade adaptada pronta para impressão A4 com apoios visuais ilustrados específicos do tema' : 'um plano de aula inclusivo estruturado em DUA'} em português do Brasil.
Estudante (perfil anônimo):
${buildAnonymizedStudentBrief(student)}

Componente curricular: ${subject}
Tema/Conteúdo atual da turma: ${theme}
Duração: ${effectiveDuration} minutos (até 50 min)
Etapa de alfabetização: ${literacyStage} (se alfabetizado: até 4 exercícios curtos e objetivos; se alfabetizacao_inicial: até 2 atividades concretas de associação, pareamento, identificação, seleção ou organização, tudo em CAIXA ALTA).
Modo de acessibilidade: ${accessibilityMode}.
Objetivo do PEI selecionado: ${peiObjectiveText || 'Não vinculado (gerar diretamente pelo perfil pedagógico e tema da turma)'}
Apoio do PAEE: ${paeeSupportUsed || 'Não vinculado'}
Material da turma enviado: ${classMaterialText || 'Não informado'}

Regras adicionais:
- ${interestContext}
- Se modo Braille: forneça texto-base limpo e indique validação especializada; nunca use caracteres Unicode Braille aleatórios.
- Se modo Libras: respeite estrutura linguística da Libras, sem inventar sinais.
- Retorne apenas JSON válido, curto e bem estruturado seguindo rigorosamente o esquema.`;

    const parsed = await callGeminiWithRetry(async (model) => {
      const res = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          maxOutputTokens: 3500,
          responseMimeType: 'application/json',
          responseSchema:
            kind === 'atividade'
              ? {
                  type: Type.OBJECT,
                  required: ['title', 'adaptedObjective', 'exercises'],
                  properties: {
                    title: { type: Type.STRING },
                    adaptedObjective: { type: Type.STRING },
                    curriculumSkill: { type: Type.STRING },
                    accessibilityStrategies: { type: Type.ARRAY, items: { type: Type.STRING } },
                    beforeGuidance: { type: Type.STRING },
                    duringGuidance: { type: Type.STRING },
                    afterGuidance: { type: Type.STRING },
                    exercises: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        required: ['number', 'title', 'instruction', 'items', 'answerKey', 'visualAidType'],
                        properties: {
                          number: { type: Type.INTEGER },
                          title: { type: Type.STRING },
                          instruction: { type: Type.STRING },
                          interactionType: { type: Type.STRING },
                          items: { type: Type.ARRAY, items: { type: Type.STRING } },
                          visualAidType: { type: Type.STRING },
                          visualAidCaption: { type: Type.STRING },
                          visualAidImagePrompt: { type: Type.STRING },
                          visualAidCards: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              required: ['label'],
                              properties: {
                                label: { type: Type.STRING },
                                sublabel: { type: Type.STRING },
                                icon: { type: Type.STRING },
                              },
                            },
                          },
                          responseLines: { type: Type.INTEGER },
                          answerKey: { type: Type.STRING },
                        },
                      },
                    },
                  },
                }
              : {
                  type: Type.OBJECT,
                  required: ['title', 'adaptedObjective', 'developmentSteps'],
                  properties: {
                    title: { type: Type.STRING },
                    adaptedObjective: { type: Type.STRING },
                    curriculumSkill: { type: Type.STRING },
                    accessibilityStrategies: { type: Type.ARRAY, items: { type: Type.STRING } },
                    beforeGuidance: { type: Type.STRING },
                    duringGuidance: { type: Type.STRING },
                    afterGuidance: { type: Type.STRING },
                    targetAudience: { type: Type.STRING },
                    objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
                    skills: { type: Type.ARRAY, items: { type: Type.STRING } },
                    resources: { type: Type.ARRAY, items: { type: Type.STRING } },
                    developmentSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
                    supportAutonomia: { type: Type.STRING },
                    supportApoioPontual: { type: Type.STRING },
                    supportApoioFrequente: { type: Type.STRING },
                    formativeAssessment: { type: Type.STRING },
                    barrierAdjustments: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                },
        },
      });
      const raw = (res.text || '').trim();
      const obj = JSON.parse(raw || '{}');
      if (kind === 'atividade' && (!Array.isArray(obj.exercises) || obj.exercises.length === 0)) {
        throw new Error('JSON incompleto: exercises ausente');
      }
      if (kind === 'plano_de_aula' && (!Array.isArray(obj.developmentSteps) || obj.developmentSteps.length === 0)) {
        throw new Error('JSON incompleto: developmentSteps ausente');
      }
      return obj;
    });
    const upperIfInitial = (txt: string) => (literacyStage === 'alfabetizacao_inicial' ? txt.toUpperCase() : txt);
    const validVisualTypes = new Set([
      'nenhum',
      'cartao_associacao',
      'sequencia_visual',
      'ciclo_natureza',
      'tabela_classificacao',
      'linha_numerica',
      'mapa_conceitual',
      'figura_geometrica',
      'sistema_solar',
    ]);

    if (kind === 'atividade' && Array.isArray(parsed.exercises) && parsed.exercises.length > 0) {
      const sliced = parsed.exercises.slice(0, maxExercises).map((ex: any, i: number) => {
        const chosenVisual = validVisualTypes.has(String(ex.visualAidType || ''))
          ? (String(ex.visualAidType) as any)
          : i <= 1
          ? ('cartao_associacao' as const)
          : ('nenhum' as const);
        const cards = Array.isArray(ex.visualAidCards)
          ? ex.visualAidCards
              .filter((c: any) => c && c.label)
              .slice(0, 4)
              .map((c: any) => ({
                label: upperIfInitial(String(c.label)),
                sublabel: c.sublabel ? upperIfInitial(String(c.sublabel)) : undefined,
                icon: c.icon ? String(c.icon) : undefined,
              }))
          : undefined;
        return {
          number: i + 1,
          title: upperIfInitial(ex.title || `Atividade ${i + 1}`),
          instruction: upperIfInitial(ex.instruction || ''),
          interactionType: (ex.interactionType as any) || (literacyStage === 'alfabetizado' ? 'resposta_curta' : 'pareamento'),
          items: Array.isArray(ex.items) ? ex.items.map((it: any) => upperIfInitial(String(it))) : [],
          visualAidSpec: {
            type: chosenVisual,
            caption: chosenVisual === 'nenhum' ? '' : upperIfInitial(String(ex.visualAidCaption || `Apoio visual ilustrado: ${theme}`)),
            sourceCitation: chosenVisual === 'nenhum' ? '' : upperIfInitial('Apoio visual vetorial ApoIA.Edu (LumiNext Tech)'),
            cards,
            imagePrompt:
              chosenVisual === 'nenhum'
                ? undefined
                : String(
                    ex.visualAidImagePrompt ||
                      `Educational illustration for ${subject} about ${theme}: ${ex.title || ''}${
                        cards && cards.length > 0 ? ` showing ${cards.map((c: any) => c.label).join(', ')}` : ''
                      }`
                  ),
          },
          responseLines: Math.min(Math.max(Number(ex.responseLines || (literacyStage === 'alfabetizado' ? 2 : 1)), 1), 4),
          answerKey: ex.answerKey || 'Validar conforme resposta esperada em sala.',
        };
      });

      let imagesGenerated = 0;
      if (generateImages) {
        const targets = sliced
          .filter((ex: any) => ex.visualAidSpec && ex.visualAidSpec.type !== 'nenhum' && ex.visualAidSpec.imagePrompt)
          .slice(0, 2);

        if (targets.length > 0) {
          const results = await Promise.allSettled(
            targets.map(async (ex: any) => {
              const imgUrl = await generateEducationalIllustration(
                ai,
                ex.visualAidSpec.imagePrompt,
                subject,
                literacyStage
              );
              ex.visualAidSpec.imageUrl = imgUrl;
              ex.visualAidSpec.sourceCitation = upperIfInitial('Ilustração didática em alta qualidade · ApoIA.Edu (IA)');
              return true;
            })
          );

          const rejectedFatal = results.find(
            (r): r is PromiseRejectedResult =>
              r.status === 'rejected' &&
              r.reason instanceof GeminiServiceError &&
              [400, 403, 429].includes(r.reason.statusCode)
          );
          imagesGenerated = results.filter((r) => r.status === 'fulfilled').length;
          if (imagesGenerated === 0 && rejectedFatal) {
            throw rejectedFatal.reason;
          }
        }
      }

      return {
        title: upperIfInitial(parsed.title || `${subject} — ${theme}`),
        aiUsed: true,
        imagesGenerated,
        content: {
          schoolHeader: upperIfInitial(student.schoolName || 'Unidade Escolar'),
          teacherHeader: upperIfInitial(teacherName),
          studentHeader: upperIfInitial(student.displayName),
          subjectHeader: upperIfInitial(subject),
          adaptedObjective: parsed.adaptedObjective || peiObjectiveText || `Compreender os conceitos centrais de ${theme}.`,
          curriculumSkill: parsed.curriculumSkill || 'Alinhada ao conteúdo atual da turma',
          accessibilityStrategies:
            Array.isArray(parsed.accessibilityStrategies) && parsed.accessibilityStrategies.length > 0
              ? parsed.accessibilityStrategies.map(String)
              : [student.workingStrategies || 'Enunciados diretos e apoio visual'],
          paeeSupportsApplied: paeeSupportUsed ? [paeeSupportUsed] : [],
          usedSources: usedSourcesList,
          teacherGuidance: {
            before: parsed.beforeGuidance || 'Apresentar o roteiro visual e combinar o tempo de 1 tarefa por vez.',
            during: parsed.duringGuidance || 'Oferecer mediação pontual na leitura do comando e validar cada etapa.',
            after: parsed.afterGuidance || 'Registrar como foi a participação e o nível de apoio necessário.',
          },
          brailleOrLibrasNote,
          exercises: sliced,
        },
      };
    }

    if (kind === 'plano_de_aula' && Array.isArray(parsed.developmentSteps) && parsed.developmentSteps.length > 0) {
      return {
        title: parsed.title || `Plano de Aula Inclusivo · ${subject}: ${theme}`,
        aiUsed: true,
        imagesGenerated: 0,
        content: {
          schoolHeader: student.schoolName || 'Unidade Escolar',
          teacherHeader: teacherName,
          studentHeader: student.displayName,
          subjectHeader: subject,
          adaptedObjective:
            parsed.adaptedObjective || peiObjectiveText || `Garantir participação e compreensão dos conceitos essenciais de ${theme}.`,
          curriculumSkill: parsed.curriculumSkill || `${subject} · ${theme}`,
          accessibilityStrategies:
            Array.isArray(parsed.accessibilityStrategies) && parsed.accessibilityStrategies.length > 0
              ? parsed.accessibilityStrategies.map(String)
              : [student.workingStrategies || 'Instruções claras e recursos DUA'],
          paeeSupportsApplied: paeeSupportUsed ? [paeeSupportUsed] : [],
          usedSources: usedSourcesList,
          teacherGuidance: {
            before: parsed.beforeGuidance || 'Organizar os recursos de acessibilidade e antecipar a rotina da aula.',
            during: parsed.duringGuidance || 'Acompanhar o ritmo do estudante oferecendo o nível de mediação adequado.',
            after: parsed.afterGuidance || 'Registrar a participação e os ajustes úteis em "Registrar como foi".',
          },
          brailleOrLibrasNote,
          lessonPlan: {
            theme,
            targetAudience:
              parsed.targetAudience || `${student.gradeLevel || 'Turma regular'} · Planejamento DUA inclusivo`,
            durationMinutes: effectiveDuration,
            objectives:
              Array.isArray(parsed.objectives) && parsed.objectives.length > 0
                ? parsed.objectives.map(String)
                : [parsed.adaptedObjective || peiObjectiveText || `Compreender os conceitos centrais de ${theme}.`],
            skills:
              Array.isArray(parsed.skills) && parsed.skills.length > 0
                ? parsed.skills.map(String)
                : [parsed.curriculumSkill || `${subject} — ${theme}`],
            resources:
              Array.isArray(parsed.resources) && parsed.resources.length > 0
                ? parsed.resources.map(String)
                : [student.accessibilityResources || 'Apoio visual e material estruturado'],
            developmentSteps: parsed.developmentSteps.map(String),
            accessibilityStrategies:
              Array.isArray(parsed.accessibilityStrategies) && parsed.accessibilityStrategies.length > 0
                ? parsed.accessibilityStrategies.map(String)
                : [student.workingStrategies || 'Comandos objetivos em etapas'],
            supportLevelAdaptations: {
              autonomia:
                parsed.supportAutonomia ||
                'Executa a proposta de forma independente com apoio do roteiro visual.',
              apoioPontual:
                parsed.supportApoioPontual ||
                'Recebe modelagem inicial e retomada pontual de comandos quando necessário.',
              apoioFrequente:
                parsed.supportApoioFrequente ||
                'Mediação passo a passo com exemplos concretos e resposta multimodal.',
            },
            formativeAssessment:
              parsed.formativeAssessment ||
              'Observação contínua da participação, da acessibilidade utilizada e do alcance do objetivo.',
            barrierAdjustments:
              Array.isArray(parsed.barrierAdjustments) && parsed.barrierAdjustments.length > 0
                ? parsed.barrierAdjustments.map(String)
                : [student.barriers || 'Redução de barreiras de leitura, organização ou mobiliário conforme perfil'],
          },
        },
      };
    }

    throw new GeminiServiceError(
      'A API Gemini retornou uma resposta incompleta para esta proposta. Tente gerar novamente.',
      502
    );
  }

  // Local structured pedagogical builder (respects every DUA / A4 / exercise-count constraint)
  const isNonLiterate = literacyStage === 'alfabetizacao_inicial';
  const fmtStudent = (txt: string) => (isNonLiterate ? txt.toUpperCase() : txt);
  const title =
    kind === 'atividade'
      ? fmtStudent(`Atividade Adaptada · ${subject}: ${theme}`)
      : `Plano de Aula Inclusivo · ${subject}: ${theme}`;

  const exercises =
    kind === 'atividade'
      ? literacyStage === 'alfabetizado'
        ? [
            {
              number: 1,
              title: 'Compreensão inicial em etapas',
              instruction: `Observe o esquema sobre "${theme}" e marque a opção correta.`,
              interactionType: 'selecao' as const,
              items: [
                `(  ) Opção A — Conceito central de ${theme} com apoio visual`,
                `(  ) Opção B — Elemento complementar`,
                `(  ) Opção C — Não corresponde ao tema`,
              ],
              visualAidSpec: {
                type: /astro|planeta|solar/i.test(`${theme} ${student.interests}`)
                  ? ('sistema_solar' as const)
                  : /forma|geomet|fraç|área/i.test(theme)
                  ? ('figura_geometrica' as const)
                  : ('cartao_associacao' as const),
                caption: `Esquema visual estruturado: ${theme}`,
                sourceCitation: 'Diagrama vetorial original ApoIA.Edu (LumiNext Tech) para impressão A4',
              },
              responseLines: 1,
              answerKey: 'Opção A corresponde ao conceito trabalhado com a turma.',
            },
            {
              number: 2,
              title: 'Relação e resposta curta',
              instruction: `Complete em poucas palavras como "${theme}" aparece no exemplo trabalhado pela turma.`,
              interactionType: 'resposta_curta' as const,
              items: [`Exemplo da turma: ${classMaterialText ? classMaterialText.slice(0, 120) : theme}`],
              visualAidSpec: {
                type: 'nenhum' as const,
                caption: '',
                sourceCitation: '',
              },
              responseLines: 3,
              answerKey: 'Resposta curta coerente com o conceito central apresentado em aula.',
            },
            {
              number: 3,
              title: 'Organização de passos',
              instruction: 'Numere de 1 a 3 a sequência correta para resolver o desafio proposto.',
              interactionType: 'organizacao' as const,
              items: [
                '(   ) Identificar as informações principais do problema',
                '(   ) Aplicar a estratégia combinada em sala',
                '(   ) Conferir o resultado final',
              ],
              visualAidSpec: {
                type: 'sequencia_visual' as const,
                caption: 'Roteiro visual de 3 etapas',
                sourceCitation: 'Diagrama vetorial original ApoIA.Edu (LumiNext Tech)',
              },
              responseLines: 1,
              answerKey: 'Sequência: 1 - Identificar, 2 - Aplicar, 3 - Conferir.',
            },
          ]
        : [
            {
              number: 1,
              title: 'PAREAMENTO E IDENTIFICAÇÃO VISUAL',
              instruction: `LIGUE CADA IMAGEM OU CARTÃO AO GRUPO CORRESPONDENTE EM "${theme.toUpperCase()}".`,
              interactionType: 'pareamento' as const,
              items: [
                `CARTÃO 1: ELEMENTO PRINCIPAL DE ${theme.toUpperCase()}`,
                'CARTÃO 2: EXEMPLO CONCRETO DO COTIDIANO',
              ],
              visualAidSpec: {
                type: 'cartao_associacao' as const,
                caption: `CARTÕES GRANDES DE ASSOCIAÇÃO PARA ${theme.toUpperCase()}`,
                sourceCitation: 'CARTÕES VISUAIS ORIGINAIS APOIA.EDU — ALTA LEGIBILIDADE EM A4',
                teacherInsertionNote:
                  'CASO UTILIZE OBJETOS CONCRETOS OU FICHAS TÁTEIS EM SALA, POSICIONE-OS SOBRE OS QUADROS EM TAMANHO AMPLIADO.',
              },
              responseLines: 1,
              answerKey: 'Pareamento direto entre o cartão ilustrado e o grupo correspondente.',
            },
            {
              number: 2,
              title: 'SELEÇÃO GUIADA',
              instruction: 'CIRCULE OU APONTE A IMAGEM QUE REPRESENTA O QUE TRABALHAMOS HOJE.',
              interactionType: 'selecao' as const,
              items: ['[ QUADRO A — REPRESENTAÇÃO PRINCIPAL ]', '[ QUADRO B — OUTRA OPÇÃO ]'],
              visualAidSpec: {
                type: 'figura_geometrica' as const,
                caption: 'QUADROS AMPLIADOS PARA SELEÇÃO DIRETA',
                sourceCitation: 'DIAGRAMA ORIGINAL APOIA.EDU (LUMINEXT TECH)',
              },
              responseLines: 1,
              answerKey: 'Quadro A.',
            },
          ]
      : undefined;

  const lessonPlan =
    kind === 'plano_de_aula'
      ? {
          theme,
          targetAudience: `${student.gradeLevel || 'Turma regular'} · Planejamento DUA (individual ou dupla colaborativa)`,
          durationMinutes: effectiveDuration,
          objectives: [
            peiObjectiveText || `Garantir participação e compreensão dos conceitos essenciais de ${theme}.`,
          ],
          skills: [
            classMaterialText ? `Conteúdo da turma: ${classMaterialText.slice(0, 140)}` : `Conteúdo curricular: ${subject} — ${theme}`,
          ],
          resources: [
            student.accessibilityResources || 'Cartões visuais ampliados e material manipulável',
            paeeSupportUsed || 'Roteiro estruturado em etapas',
          ],
          developmentSteps: [
            `Abertura (10 min): Apresentação visual do tema "${theme}" conectando ao repertório da turma. ${interestContext}`,
            `Desenvolvimento (25 min): Atividade em dupla colaborativa ou individual com comandos curtos e apoio de ${
              paeeSupportUsed || 'mediação estruturada'
            }.`,
            'Fechamento (15 min): Socialização multimodal (oral, visual ou por apontamento) respeitando formas de comunicação.',
          ],
          accessibilityStrategies: [
            student.workingStrategies || 'Instruções curtas uma por vez, contraste visual e previsibilidade de etapas.',
            ...(brailleOrLibrasNote ? [brailleOrLibrasNote] : []),
          ],
          supportLevelAdaptations: {
            autonomia: 'Realiza os comandos curtos de forma independente usando o roteiro visual de conferência.',
            apoioPontual: 'Recebe modelagem inicial no item 1 e sinalização visual da etapa seguinte.',
            apoioFrequente: 'Mediação passo a passo com pareamento concreto e resposta por seleção ou apontamento.',
          },
          formativeAssessment:
            'Observação contínua da participação, do recurso que favoreceu o acesso e do alcance do objetivo durante a aula.',
          barrierAdjustments: [
            student.barriers
              ? `Para a barreira "${student.barriers}": reduzir poluição visual na folha A4 e oferecer tempo organizado por etapas.`
              : 'Para barreiras atencionais ou de leitura: fracionar enunciados e manter apenas 1 comando por bloco.',
          ],
        }
      : undefined;

  return {
    title,
    aiUsed: false,
    imagesGenerated: 0,
    content: {
      schoolHeader: student.schoolName || 'Unidade Escolar',
      teacherHeader: teacherName,
      studentHeader: student.displayName,
      subjectHeader: subject,
      adaptedObjective:
        peiObjectiveText || `Participar e compreender os elementos centrais de ${theme} com acessibilidade DUA.`,
      curriculumSkill: classMaterialText
        ? `Referência da turma: ${classMaterialText.slice(0, 140)}`
        : `${subject} · ${theme}`,
      accessibilityStrategies: [
        student.workingStrategies || 'Comandos diretos, apoio visual em A4 e ritmo organizado por etapas',
        ...(student.accessibilityResources ? [`Recurso: ${student.accessibilityResources}`] : []),
      ],
      paeeSupportsApplied: paeeSupportUsed ? [paeeSupportUsed] : [],
      usedSources: usedSourcesList,
      teacherGuidance: {
        before: `Organize o ambiente considerando as barreiras (${student.barriers || 'sem barreira específica registrada'}) e apresente a folha A4 com calma.`,
        during: `Respeite a forma de comunicação (${student.communicationModes || 'oral/visual'}) e realize até ${effectiveDuration} min sem pressa.`,
        after: 'Utilize o botão "Registrar como foi" para documentar participação, objetivo alcançado e nível de apoio.',
      },
      brailleOrLibrasNote,
      exercises,
      lessonPlan,
    },
  };
}
