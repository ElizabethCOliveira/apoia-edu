import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import type {
  ApplicationFeedback,
  DemoProfileMode,
  PedagogicalActivity,
  PedagogicalDocument,
  SourceRecord,
  Student,
  StudentTransferRecord,
  UpdateAlert,
  UserSummary,
  WorkspaceRole,
} from '../src/types.ts';

export const DEMO_COOKIE_NAME = 'apoia_demo_session';

export interface DemoMemberRecord {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  status: 'active' | 'revoked';
  created_at: string;
  revoked_at: string | null;
}

export interface DemoInvitationRecord {
  id: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  status: 'pending' | 'accepted' | 'revoked';
  created_at: string;
}

export interface DemoStudentLinkRecord {
  id: string;
  student_id: string;
  user_id: string;
  role_label: string;
  status: 'active' | 'revoked';
  revoked_at: string | null;
}

export interface DemoIncomingStudentBundle {
  transferId: string;
  student: Student;
  documents: PedagogicalDocument[];
  activities: PedagogicalActivity[];
  applications: ApplicationFeedback[];
}

export interface DemoSessionState {
  sessionId: string;
  createdAt: string;
  activeProfile: DemoProfileMode;
  activeTeacherUserId: string;
  aiExternalEnabled: boolean;
  members: DemoMemberRecord[];
  invitations: DemoInvitationRecord[];
  studentLinks: DemoStudentLinkRecord[];
  students: Student[];
  sources: SourceRecord[];
  documents: PedagogicalDocument[];
  activities: PedagogicalActivity[];
  applications: ApplicationFeedback[];
  alerts: UpdateAlert[];
  transfers: StudentTransferRecord[];
  incomingStudents: DemoIncomingStudentBundle[];
}

const demoStore = new Map<string, DemoSessionState>();

function buildInitialDemoState(sessionId: string): DemoSessionState {
  const wsId = 'demo_ws_escola_exemplo';
  const now = new Date().toISOString();
  const schoolName = 'E.M. Horizonte Inclusivo (Exemplo Fictício)';

  // 1. Estudante com Deficiência Intelectual, NÃO alfabetizada
  const sofia: Student = {
    id: 'demo_std_sofia',
    workspaceId: wsId,
    createdByUserId: 'demo_user',
    displayName: 'Sofia R. · DI (Não alfabetizada)',
    codeOrInitials: 'SR-2A',
    schoolName,
    schoolYear: '2026',
    gradeLevel: '2º Ano EF',
    classroom: 'Turma A',
    strengths:
      'Curiosidade sonora e musical, reconhecimento rápido de figuras concretas, boa participação em pareamentos visuais e atividades lúdicas.',
    interests: 'Animais da fauna brasileira, desenhos coloridos e cantigas rítmicas.',
    learningLevel:
      'Deficiência Intelectual — não alfabetizada (alfabetização inicial): reconhece imagens familiares, cores e vogais iniciais com apoio visual em caixa alta.',
    communicationModes: 'Oralidade breve acompanhada de apontamento e cartões visuais/táteis em caixa alta.',
    barriers:
      'Não realiza leitura convencional nem escrita cursiva; fadiga diante de folhas com muitos estímulos simultâneos ou fontes pequenas.',
    workingStrategies:
      'Utilizar textos sempre em CAIXA ALTA (letra bastão), comandos curtos, pareamento, seleção e associação com poucas figuras grandes por folha.',
    accessibilityResources:
      'Letras móveis em caixa alta, cartões ilustrados de alto contraste, pranchas de pareamento e leitura oral mediada.',
    latestPedagogicalEval:
      'Sondagem do 1º bimestre: associa imagens conhecidas à letra inicial em caixa alta com apoio pontual.',
    createdAt: now,
    updatedAt: now,
  };

  // 2. Estudante com Deficiência Intelectual, ALFABETIZADA
  const clara: Student = {
    id: 'demo_std_clara',
    workspaceId: wsId,
    createdByUserId: 'demo_user',
    displayName: 'Clara V. · DI (Alfabetizada)',
    codeOrInitials: 'CV-5B',
    schoolName,
    schoolYear: '2026',
    gradeLevel: '5º Ano EF',
    classroom: 'Turma B',
    strengths:
      'Boa leitura oral de frases e textos curtos, excelente envolvimento em trabalhos em dupla e memória afetiva para histórias ilustradas.',
    interests: 'Cuidados com a natureza, hortas escolares e histórias em quadrinhos.',
    learningLevel:
      'Deficiência Intelectual — alfabetizada: lê e escreve frases simples com autonomia; necessita apoio estruturado para inferências abstratas e problemas de múltiplas etapas.',
    communicationModes: 'Comunicação oral clara e escrita objetiva; compreende melhor com perguntas diretas e exemplos concretos.',
    barriers:
      'Dificuldade com enunciados extensos, linguagem figurada sem explicação prévia e múltiplas instruções agrupadas no mesmo parágrafo.',
    workingStrategies:
      'Fracionar textos e problemas em blocos numerados, destacar palavras-chave em negrito e oferecer organizadores gráficos simples.',
    accessibilityResources:
      'Glossário ilustrado de termos novos, roteiro de etapas na carteira e textos objetivos com espaçamento ampliado.',
    latestPedagogicalEval:
      'Avaliação bimestral: identifica informações explícitas em textos curtos e resolve operações simples com roteiro visual.',
    createdAt: now,
    updatedAt: now,
  };

  // 3. Estudante Paraplégico, ALFABETIZADO
  const lucas: Student = {
    id: 'demo_std_lucas',
    workspaceId: wsId,
    createdByUserId: 'demo_user',
    displayName: 'Lucas M. · Paraplegia (Alfabetizado)',
    codeOrInitials: 'LM-6A',
    schoolName,
    schoolYear: '2026',
    gradeLevel: '6º Ano EF',
    classroom: 'Turma A',
    strengths:
      'Plena autonomia cognitiva, leitura fluente, raciocínio lógico-matemático avançado e liderança positiva em debates e projetos científicos.',
    interests: 'Astronomia, robótica educacional, mapas e esportes adaptados.',
    learningLevel:
      'Paraplegia (deficiência física — usuário de cadeira de rodas) — plenamente alfabetizado; acompanha integralmente o currículo regular do 6º Ano sem redução de complexidade cognitiva.',
    communicationModes: 'Comunicação oral e escrita fluentes; excelente expressão argumentativa.',
    barriers:
      'Barreiras arquitetônicas e ergonômicas: altura inadequada de carteiras/bancadas de laboratório, espaços estreitos de circulação e atividades práticas sem alternativa acessível.',
    workingStrategies:
      'Garantir mesa adaptada com encaixe para cadeira de rodas, organização acessível de materiais sobre a bancada e participação plena em atividades de campo ou laboratório com rotas acessíveis.',
    accessibilityResources:
      'Mesa com altura regulável para cadeira de rodas, prancheta/apoio ergonômico, acesso digital opcional e espaço livre de circulação em sala.',
    latestPedagogicalEval:
      'Avaliação do 1º bimestre: resolve situações-problema e interpreta gráficos científicos com autonomia total quando a acessibilidade física está garantida.',
    createdAt: now,
    updatedAt: now,
  };

  // 4. Estudante com Autismo Grau 3 (TEA Nível 3 de Suporte)
  const miguel: Student = {
    id: 'demo_std_miguel',
    workspaceId: wsId,
    createdByUserId: 'demo_user',
    displayName: 'Miguel T. · Autismo Grau 3',
    codeOrInitials: 'MT-3C',
    schoolName,
    schoolYear: '2026',
    gradeLevel: '3º Ano EF',
    classroom: 'Turma C',
    strengths:
      'Forte percepção de padrões visuais, interesse por encaixes geométricos e boa resposta a rotinas visuais previsíveis e calmas.',
    interests: 'Blocos de encaixe, formas geométricas, cores primárias e texturas táteis.',
    learningLevel:
      'Transtorno do Espectro Autista (TEA) — Grau 3 (nível 3 de suporte), não alfabetizado: realiza reconhecimento funcional de pictogramas, formas e palavras-chave curtas em caixa alta com mediação.',
    communicationModes:
      'Comunicação Alternativa e Aumentativa (CAA): prancha de comunicação com pictogramas/PECS, gestos de apontamento e cartões visuais em CAIXA ALTA.',
    barriers:
      'Hipersensibilidade auditiva, sobrecarga sensorial em ambientes agitados, mudanças inesperadas de rotina e folhas com excesso de texto ou elementos visuais.',
    workingStrategies:
      'Rotina visual estruturada (PRIMEIRO -> DEPOIS -> FIM), texto sempre em CAIXA ALTA, um comando objetivo por vez, tempo respeitado e pausas sensoriais combinadas.',
    accessibilityResources:
      'Prancha CAA/PECS, cartões de rotina visual TEACCH em caixa alta, fone abafador de ruídos e peças geométricas concretas.',
    latestPedagogicalEval:
      'Registro AEE: realiza pareamento de formas e escolhe cartões de comunicação com apoio frequente evoluindo para apoio pontual em ambiente estruturado.',
    createdAt: now,
    updatedAt: now,
  };

  const sources: SourceRecord[] = [
    {
      id: 'demo_src_forms_sofia',
      studentId: sofia.id,
      workspaceId: wsId,
      uploadedByUserId: 'demo_user',
      sourceKind: 'resposta_forms',
      docCategory: 'estudo_de_caso',
      title: 'Forms Institucional — Escuta Família e AEE · Sofia R. (Exemplo)',
      subject: 'Geral',
      schoolYear: '2026',
      bimester: '1º Bimestre',
      authorName: 'Prof.ª Mariana Costa (AEE)',
      informedDate: '2026-02-16',
      versionNumber: 1,
      status: 'ativo',
      supersedesSourceId: null,
      originalFilename: 'Forms_Estudo_Caso_Sofia_Exemplo.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileExt: 'docx',
      extractedText:
        'Relato da família: Sofia reconhece animais em livros ilustrados e gosta de músicas.\nRelato da equipe AEE: Responde muito melhor quando os enunciados e cartões estão em CAIXA ALTA com letras grandes.',
      parsedStructure: null,
      isEditableTemplate: false,
      createdAt: now,
    },
    {
      id: 'demo_src_curriculo_lucas',
      studentId: lucas.id,
      workspaceId: wsId,
      uploadedByUserId: 'demo_user',
      sourceKind: 'fonte_curricular',
      docCategory: 'curriculo',
      title: 'Currículo Paulista — Matemática 6º Ano · 1º Bimestre (Exemplo)',
      subject: 'Matemática',
      schoolYear: '2026',
      bimester: '1º Bimestre',
      authorName: 'Referencial Curricular',
      informedDate: '2026-02-05',
      versionNumber: 1,
      status: 'ativo',
      supersedesSourceId: null,
      originalFilename: 'Curriculo_Paulista_Mat_6Ano_Exemplo.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileExt: 'docx',
      extractedText:
        '(EF06MA03) Resolver e elaborar problemas que envolvam cálculos com números naturais, por meio de estratégias variadas, com compreensão dos processos neles envolvidos.',
      parsedStructure: null,
      isEditableTemplate: false,
      createdAt: now,
    },
  ];

  // ==================== DOCUMENTOS DEMONSTRATIVOS ====================
  const docPaeeSofia: PedagogicalDocument = {
    id: 'demo_doc_paee_sofia',
    studentId: sofia.id,
    workspaceId: wsId,
    docType: 'paee',
    title: 'PAEE 2026 — Sofia R. (DI · Não alfabetizada)',
    subject: 'Atendimento Educacional Especializado',
    gradeLevel: '2º Ano EF',
    schoolYear: '2026',
    bimester: 'Anual (4 bimestres)',
    authorName: 'Prof.ª Mariana Costa (AEE)',
    informedDate: '2026-02-20',
    versionNumber: 1,
    status: 'revisada_pela_equipe',
    sourceIds: ['demo_src_forms_sofia'],
    templateSourceId: null,
    content: {
      generationMode: 'extracao_local',
      templateFormatNote: 'PAEE demonstrativo para estudante com DI em alfabetização inicial.',
      templateEditableUsed: true,
      fields: [],
      paeeSupports: [
        {
          id: 'demo_sup_sofia_1',
          barrierOrNeed: 'Acesso à leitura e identificação inicial de letras e palavras',
          supportType: 'Materiais impressos em CAIXA ALTA ampliada + letras móveis e cartões ilustrados',
          availabilityStatus: 'disponivel',
          responsibilityStatus: 'confirmada',
          responsibleRole: 'Professor(a) regente e AEE',
          outcomeStatus: 'observado',
          outcomeDescription: 'Favorece reconhecimento visual de vogais e letras iniciais sem fadiga.',
          originReference: 'Sondagem AEE 2026',
        },
      ],
      conflicts: [],
      narrativeGaps: [],
      pendingItems: [],
      missingRequestedFiles: [],
      consultedSources: [],
    },
    hasOutputFile: false,
    outputFileExt: 'docx',
    previousVersionId: null,
    reviewedByName: 'Coord.ª Helena Martins',
    reviewedAt: '2026-02-22T10:00:00.000Z',
    createdAt: now,
    updatedAt: now,
  };

  const docPaeeClara: PedagogicalDocument = {
    id: 'demo_doc_paee_clara',
    studentId: clara.id,
    workspaceId: wsId,
    docType: 'paee',
    title: 'PAEE 2026 — Clara V. (DI · Alfabetizada)',
    subject: 'Atendimento Educacional Especializado',
    gradeLevel: '5º Ano EF',
    schoolYear: '2026',
    bimester: 'Anual (4 bimestres)',
    authorName: 'Prof.ª Mariana Costa (AEE)',
    informedDate: '2026-02-21',
    versionNumber: 1,
    status: 'revisada_pela_equipe',
    sourceIds: [],
    templateSourceId: null,
    content: {
      generationMode: 'extracao_local',
      templateFormatNote: 'PAEE demonstrativo para estudante com DI alfabetizada.',
      templateEditableUsed: true,
      fields: [],
      paeeSupports: [
        {
          id: 'demo_sup_clara_1',
          barrierOrNeed: 'Compreensão de textos extensos e inferências abstratas',
          supportType: 'Fracionamento em etapas curtas + destaque de palavras-chave e glossário visual',
          availabilityStatus: 'disponivel',
          responsibilityStatus: 'confirmada',
          responsibleRole: 'Professor(a) regente e AEE',
          outcomeStatus: 'observado',
          outcomeDescription: 'Amplia autonomia na leitura e interpretação de textos informativos.',
          originReference: 'Avaliação pedagógica 2026',
        },
      ],
      conflicts: [],
      narrativeGaps: [],
      pendingItems: [],
      missingRequestedFiles: [],
      consultedSources: [],
    },
    hasOutputFile: false,
    outputFileExt: 'docx',
    previousVersionId: null,
    reviewedByName: 'Coord.ª Helena Martins',
    reviewedAt: '2026-02-23T10:00:00.000Z',
    createdAt: now,
    updatedAt: now,
  };

  const docPaeeLucas: PedagogicalDocument = {
    id: 'demo_doc_paee_lucas',
    studentId: lucas.id,
    workspaceId: wsId,
    docType: 'paee',
    title: 'PAEE 2026 — Lucas M. (Paraplegia · Alfabetizado)',
    subject: 'Atendimento Educacional Especializado',
    gradeLevel: '6º Ano EF',
    schoolYear: '2026',
    bimester: 'Anual (4 bimestres)',
    authorName: 'Prof.ª Mariana Costa (AEE)',
    informedDate: '2026-02-24',
    versionNumber: 1,
    status: 'revisada_pela_equipe',
    sourceIds: ['demo_src_curriculo_lucas'],
    templateSourceId: null,
    content: {
      generationMode: 'extracao_local',
      templateFormatNote: 'PAEE focado em acessibilidade física e mobiliário sem redução cognitiva.',
      templateEditableUsed: true,
      fields: [],
      paeeSupports: [
        {
          id: 'demo_sup_lucas_1',
          barrierOrNeed: 'Posicionamento ergonômico e acesso físico em sala e laboratório',
          supportType: 'Mesa com altura adaptada para cadeira de rodas + rotas livres e suporte digital opcional',
          availabilityStatus: 'disponivel',
          responsibilityStatus: 'confirmada',
          responsibleRole: 'Gestão escolar e equipe docente',
          outcomeStatus: 'observado',
          outcomeDescription: 'Participação plena e autônoma nas atividades curriculares do 6º Ano.',
          originReference: 'Avaliação de acessibilidade 2026',
        },
      ],
      conflicts: [],
      narrativeGaps: [],
      pendingItems: [],
      missingRequestedFiles: [],
      consultedSources: [],
    },
    hasOutputFile: false,
    outputFileExt: 'docx',
    previousVersionId: null,
    reviewedByName: 'Coord.ª Helena Martins',
    reviewedAt: '2026-02-25T10:00:00.000Z',
    createdAt: now,
    updatedAt: now,
  };

  const docPeiLucas: PedagogicalDocument = {
    id: 'demo_doc_pei_lucas',
    studentId: lucas.id,
    workspaceId: wsId,
    docType: 'pei',
    title: 'PEI 1º Bimestre · Matemática — Lucas M.',
    subject: 'Matemática',
    gradeLevel: '6º Ano EF',
    schoolYear: '2026',
    bimester: '1º Bimestre',
    authorName: 'Prof. Carlos Almeida',
    informedDate: '2026-03-02',
    versionNumber: 1,
    status: 'revisada_pela_equipe',
    sourceIds: ['demo_src_curriculo_lucas'],
    templateSourceId: null,
    content: {
      guidanceGreeting: 'Olá professor,',
      generationMode: 'extracao_local',
      templateFormatNote: 'Plano de acessibilidade mantendo integralmente as habilidades do 6º Ano.',
      templateEditableUsed: true,
      fields: [],
      peiObjectives: [
        {
          id: 'demo_pei_lucas_1',
          subject: 'Matemática',
          bimester: '1º Bimestre',
          skillCode: 'EF06MA03',
          skillDescription:
            'Resolver e elaborar problemas que envolvam cálculos com números naturais utilizando estratégias variadas.',
          adaptedObjective:
            'Resolver situações-problema de adição, subtração e escalas com dados astronômicos utilizando mesa adaptada e prancheta ergonômica.',
          strategies: 'Manter nível curricular integral do 6º Ano com mobiliário acessível e opção de registro digital.',
          resources: 'Mesa adaptada para cadeira de rodas, calculadora de conferência e folha A4 bem espaçada.',
          participationModes: 'Registro escrito ou digital e apresentação oral em grupo.',
          monitoringInstruments: 'Registros de aplicação no ApoIA.Edu.',
          successCriteria: 'Resolver com autonomia os problemas propostos pela turma.',
          barrier: 'Mobiliário inadequado em aulas práticas.',
          supportOrStrategy: 'Bancada acessível para cadeira de rodas (PAEE)',
          outcomeType: 'observado',
          outcomeText: 'Autonomia plena nas situações-problema propostas.',
          originKind: 'informacao_documentada',
          originReference: 'PAEE + Currículo Paulista EF06MA03',
        },
      ],
      conflicts: [],
      narrativeGaps: [],
      pendingItems: [],
      missingRequestedFiles: [],
      consultedSources: [],
    },
    hasOutputFile: false,
    outputFileExt: 'xlsx',
    previousVersionId: null,
    reviewedByName: 'Prof. Carlos Almeida',
    reviewedAt: '2026-03-03T09:30:00.000Z',
    createdAt: now,
    updatedAt: now,
  };

  const docPaeeMiguel: PedagogicalDocument = {
    id: 'demo_doc_paee_miguel',
    studentId: miguel.id,
    workspaceId: wsId,
    docType: 'paee',
    title: 'PAEE 2026 — Miguel T. (Autismo Grau 3)',
    subject: 'Atendimento Educacional Especializado',
    gradeLevel: '3º Ano EF',
    schoolYear: '2026',
    bimester: 'Anual (4 bimestres)',
    authorName: 'Prof.ª Mariana Costa (AEE)',
    informedDate: '2026-02-22',
    versionNumber: 1,
    status: 'revisada_pela_equipe',
    sourceIds: [],
    templateSourceId: null,
    content: {
      generationMode: 'extracao_local',
      templateFormatNote: 'PAEE demonstrativo para estudante com TEA Nível 3 de suporte e uso de CAA.',
      templateEditableUsed: true,
      fields: [],
      paeeSupports: [
        {
          id: 'demo_sup_miguel_1',
          barrierOrNeed: 'Comunicação funcional, previsibilidade e hipersensibilidade sensorial',
          supportType: 'Prancha CAA/PECS + rotina visual (PRIMEIRO/DEPOIS/FIM) em CAIXA ALTA + fone abafador',
          availabilityStatus: 'disponivel',
          responsibilityStatus: 'confirmada',
          responsibleRole: 'Professor(a) AEE, profissional de apoio e regente',
          outcomeStatus: 'observado',
          outcomeDescription: 'Reduz desregulação sensorial e favorece respostas por apontamento/cartões.',
          originReference: 'Estudo de Caso e Escuta Familiar 2026',
        },
      ],
      conflicts: [],
      narrativeGaps: [],
      pendingItems: [],
      missingRequestedFiles: [],
      consultedSources: [],
    },
    hasOutputFile: false,
    outputFileExt: 'docx',
    previousVersionId: null,
    reviewedByName: 'Coord.ª Helena Martins',
    reviewedAt: '2026-02-24T11:00:00.000Z',
    createdAt: now,
    updatedAt: now,
  };

  // ==================== ATIVIDADES DEMONSTRATIVAS (1+ POR PERFIL) ====================
  // 1) Sofia R. (DI · Não alfabetizada) -> TODOS OS TEXTOS DA FOLHA EM CAIXA ALTA
  const actSofiaCienciasVertebrados: PedagogicalActivity = {
    id: 'demo_act_sofia_ciencias_vertebrados',
    studentId: sofia.id,
    workspaceId: wsId,
    kind: 'atividade',
    title: 'ANIMAIS VERTEBRADOS E INVERTEBRADOS (CIÊNCIAS · CAIXA ALTA)',
    subject: 'Ciências',
    theme: 'IDENTIFICAÇÃO VISUAL DE ANIMAIS VERTEBRADOS E INVERTEBRADOS EM CAIXA ALTA',
    bimester: '1º Bimestre',
    schoolYear: '2026',
    durationMinutes: 25,
    literacyStage: 'alfabetizacao_inicial',
    accessibilityMode: 'tatil_auditivo',
    peiDocumentId: null,
    peiObjectiveId: null,
    peiObjectiveText:
      'Apontar ou marcar animais vertebrados e invertebrados com apoio de leitura mediada, modelo concreto e texto em CAIXA ALTA.',
    paeeDocumentId: docPaeeSofia.id,
    paeeSupportUsed: 'Materiais impressos em CAIXA ALTA ampliada + imagens fotorrealistas e resposta por apontamento ou CAA',
    versionNumber: 1,
    content: {
      schoolHeader: schoolName.toUpperCase(),
      teacherHeader: 'PROF.ª MARIANA COSTA (AEE)',
      studentHeader: 'SOFIA R.',
      subjectHeader: 'CIÊNCIAS',
      adaptedObjective:
        'Diferenciar visualmente animais vertebrados e invertebrados em 2 questões diretas com resposta por apontamento, marcação ou CAA.',
      curriculumSkill:
        '(EF02CI04 / EF03CI06) Observar características de animais conhecidos e reconhecer a presença ou ausência de coluna vertebral com apoio visual.',
      accessibilityStrategies: [
        'Todos os textos em CAIXA ALTA com fonte limpa, alto contraste e amplo espaço em branco.',
        'Apenas 2 questões curtas por folha ("APONTE O ANIMAL VERTEBRADO" e "APONTE O ANIMAL INVERTEBRADO") com 2 opções por questão.',
        'Aceitação de resposta por apontamento, marcação no quadro ou uso de comunicação alternativa (CAA).',
      ],
      paeeSupportsApplied: ['Materiais impressos em CAIXA ALTA ampliada + letras móveis e cartões ilustrados'],
      usedSources: ['Perfil Pedagógico de Sofia R.', 'PAEE 2026 — Sofia R.'],
      teacherGuidance: {
        before: 'Explorar a coluna vertebral em um modelo tátil ou imagem antes de iniciar a folha.',
        during: 'Ler e mostrar uma questão por vez, aceitando apontar, marcar o quadro ou utilizar comunicação alternativa.',
        after: 'Registrar a resposta e o nível de apoio necessário em "Registrar como foi".',
      },
      brailleOrLibrasNote:
        'TEXTO INTEGRAL EM CAIXA ALTA. APRESENTE UMA QUESTÃO POR VEZ E ACEITE APONTAMENTO, MARCAÇÃO OU CAA.',
      worksheetImageUrl: '/assets/aistudio/di_nao_alfabetizado_ciencias.jpg',
      worksheetImageAlt:
        'ATIVIDADE ADAPTADA DE CIÊNCIAS EM CAIXA ALTA — ANIMAIS VERTEBRADOS E INVERTEBRADOS (CACHORRO, MINHOCA, BORBOLETA E PEIXE)',
      exercises: [
        {
          number: 1,
          title: 'APONTE O ANIMAL VERTEBRADO.',
          instruction: 'OBSERVE AS IMAGENS E APONTE OU MARQUE O ANIMAL QUE TEM COLUNA VERTEBRAL.',
          interactionType: 'selecao',
          items: ['[  ] CACHORRO', '[  ] MINHOCA'],
          visualAidSpec: {
            type: 'cartao_associacao',
            caption: 'IMAGENS DE ALTO CONTRASTE: CACHORRO E MINHOCA',
            sourceCitation: 'ILUSTRAÇÕES FOTORREALISTAS ADAPTADAS APOIA.EDU',
          },
          responseLines: 1,
          answerKey: 'Cachorro (animal vertebrado).',
        },
        {
          number: 2,
          title: 'APONTE O ANIMAL INVERTEBRADO.',
          instruction: 'OBSERVE AS IMAGENS E APONTE OU MARQUE O ANIMAL QUE NÃO TEM COLUNA VERTEBRAL.',
          interactionType: 'selecao',
          items: ['[  ] BORBOLETA', '[  ] PEIXE'],
          visualAidSpec: {
            type: 'cartao_associacao',
            caption: 'IMAGENS DE ALTO CONTRASTE: BORBOLETA E PEIXE',
            sourceCitation: 'ILUSTRAÇÕES FOTORREALISTAS ADAPTADAS APOIA.EDU',
          },
          responseLines: 1,
          answerKey: 'Borboleta (animal invertebrado).',
        },
      ],
    },
    createdByUserId: 'demo_teacher_mariana',
    createdAt: now,
    updatedAt: now,
  };

  const actSofiaCienciasSolar: PedagogicalActivity = {
    id: 'demo_act_sofia_ciencias_solar',
    studentId: sofia.id,
    workspaceId: wsId,
    kind: 'atividade',
    title: 'SISTEMA SOLAR (CIÊNCIAS · CAIXA ALTA)',
    subject: 'Ciências',
    theme: 'RECONHECIMENTO VISUAL DO SOL E PAREAMENTO DE PLANETAS IGUAIS EM CAIXA ALTA',
    bimester: '2º Bimestre',
    schoolYear: '2026',
    durationMinutes: 25,
    literacyStage: 'alfabetizacao_inicial',
    accessibilityMode: 'tatil_auditivo',
    peiDocumentId: null,
    peiObjectiveId: null,
    peiObjectiveText:
      'Reconhecer visualmente o Sol entre astros do Sistema Solar e parear planetas iguais com apoio visual e comandos curtos em CAIXA ALTA.',
    paeeDocumentId: docPaeeSofia.id,
    paeeSupportUsed: 'Materiais impressos em CAIXA ALTA ampliada + imagens sem sobrecarga textual e pareamento direto',
    versionNumber: 1,
    content: {
      schoolHeader: schoolName.toUpperCase(),
      teacherHeader: 'PROF.ª MARIANA COSTA (AEE)',
      studentHeader: 'SOFIA R.',
      subjectHeader: 'CIÊNCIAS',
      adaptedObjective:
        'Identificar a imagem do Sol entre 3 astros e ligar pares de planetas idênticos (Terra e Saturno) sem exigência de leitura autônoma.',
      curriculumSkill:
        '(EF01CI05 / EF02CI07) Identificar astros visíveis e realizar correspondência visual em representações do Sistema Solar.',
      accessibilityStrategies: [
        'Comandos curtíssimos em CAIXA ALTA ("1. MARQUE O SOL." e "2. LIGUE OS PLANETAS IGUAIS.").',
        'Ausência de texto excessivo ao redor das figuras para evitar sobrecarga visual.',
        'Caixas de marcação grandes e círculos de ligação bem espaçados para facilitar o traçado ou apontamento.',
      ],
      paeeSupportsApplied: ['Materiais impressos em CAIXA ALTA ampliada + cartões ilustrados'],
      usedSources: ['Perfil Pedagógico de Sofia R.', 'PAEE 2026 — Sofia R.'],
      teacherGuidance: {
        before: 'Nomear oralmente o Sol, a Terra e Saturno apontando cada imagem grande junto com Sofia.',
        during: 'Na questão 1, solicitar que aponte ou marque o quadro abaixo do Sol; na questão 2, incentivar a ligar ou apontar os planetas iguais.',
        after: 'Validar cada pareamento positivo e registrar em "Registrar como foi" o nível de apoio utilizado.',
      },
      brailleOrLibrasNote:
        'TEXTO INTEGRAL EM CAIXA ALTA. APOIO VISUAL LIMPO COM MARCAÇÃO DIRETA E PAREAMENTO DE IMAGENS.',
      worksheetImageUrl: '/assets/aistudio/di_nao_alfabetizado_solar.jpg',
      worksheetImageAlt:
        'ATIVIDADE ADAPTADA DE CIÊNCIAS EM CAIXA ALTA — SISTEMA SOLAR (MARQUE O SOL E LIGUE OS PLANETAS IGUAIS)',
      exercises: [
        {
          number: 1,
          title: 'MARQUE O SOL.',
          instruction: 'OBSERVE OS TRÊS ASTROS E MARQUE O QUADRO ABAIXO DO SOL.',
          interactionType: 'selecao',
          items: ['[  ] TERRA', '[  ] SOL', '[  ] SATURNO'],
          visualAidSpec: {
            type: 'sistema_solar',
            caption: 'ILUSTRAÇÕES DE TERRA, SOL E SATURNO (IMAGENS FORA DE ESCALA)',
            sourceCitation: 'ILUSTRAÇÕES ORIGINAIS ADAPTADAS APOIA.EDU',
          },
          responseLines: 1,
          answerKey: 'Sol (quadro central).',
        },
        {
          number: 2,
          title: 'LIGUE OS PLANETAS IGUAIS.',
          instruction: 'LIGUE CADA PLANETA DA ESQUERDA AO PLANETA IGUAL NA DIREITA.',
          interactionType: 'pareamento',
          items: ['TERRA  ○   ──────────   ○  SATURNO', 'SATURNO  ○   ──────────   ○  TERRA'],
          visualAidSpec: {
            type: 'sistema_solar',
            caption: 'PAREAMENTO VISUAL DE TERRA E SATURNO (IMAGENS FORA DE ESCALA)',
            sourceCitation: 'ILUSTRAÇÕES ORIGINAIS ADAPTADAS APOIA.EDU',
          },
          responseLines: 1,
          answerKey: 'Ligar Terra (topo esquerdo) à Terra (base direita) e Saturno (base esquerda) a Saturno (topo direito).',
        },
      ],
    },
    createdByUserId: 'demo_teacher_mariana',
    createdAt: now,
    updatedAt: now,
  };

  const actSofiaLP: PedagogicalActivity = {
    id: 'demo_act_sofia_lp',
    studentId: sofia.id,
    workspaceId: wsId,
    kind: 'atividade',
    title: 'ANIMAIS DA FAUNA BRASILEIRA — LETRA INICIAL (CAIXA ALTA)',
    subject: 'Língua Portuguesa',
    theme: 'RECONHECIMENTO DE IMAGENS E LETRA INICIAL EM CAIXA ALTA',
    bimester: '1º Bimestre',
    schoolYear: '2026',
    durationMinutes: 25,
    literacyStage: 'alfabetizacao_inicial',
    accessibilityMode: 'tatil_auditivo',
    peiDocumentId: null,
    peiObjectiveId: null,
    peiObjectiveText: 'Associar imagens concretas à letra inicial em caixa alta com apoio visual.',
    paeeDocumentId: docPaeeSofia.id,
    paeeSupportUsed: 'Materiais impressos em CAIXA ALTA ampliada + letras móveis e cartões ilustrados',
    versionNumber: 1,
    content: {
      schoolHeader: schoolName.toUpperCase(),
      teacherHeader: 'PROF.ª MARIANA COSTA (AEE)',
      studentHeader: 'SOFIA R.',
      subjectHeader: 'LÍNGUA PORTUGUESA',
      adaptedObjective: 'Associar imagens da fauna brasileira à letra inicial em caixa alta com mediação visual.',
      curriculumSkill: '(EF01LP07) Identificar fonemas e sua representação por letras em palavras familiares.',
      accessibilityStrategies: [
        'Todos os textos da folha do estudante em CAIXA ALTA (letra bastão) com fonte ampliada.',
        'Máximo de 2 propostas curtas por folha com foco em pareamento e seleção direta.',
        'Uso de letras móveis táteis para evitar fadiga motora na escrita.',
      ],
      paeeSupportsApplied: ['Materiais impressos em CAIXA ALTA ampliada + letras móveis e cartões ilustrados'],
      usedSources: ['Perfil Pedagógico de Sofia R.', 'PAEE 2026 — Sofia R.'],
      teacherGuidance: {
        before: 'Posicionar as letras móveis A, M e T sobre a mesa junto aos cartões ilustrados dos animais.',
        during: 'Ler cada comando em voz alta pausadamente, apontando as letras em CAIXA ALTA e validando cada pareamento.',
        after: 'Registrar em "Registrar como foi" se o pareamento ocorreu com apoio frequente, pontual ou autonomia.',
      },
      brailleOrLibrasNote:
        'TEXTO EM CAIXA ALTA PARA ESTUDANTE NÃO ALFABETIZADA. UTILIZAR LETRAS MÓVEIS E LEITURA ORAL MEDIADA.',
      exercises: [
        {
          number: 1,
          title: 'LIGUE O ANIMAL À LETRA INICIAL',
          instruction: 'OBSERVE OS CARTÕES E LIGUE CADA ANIMAL À PRIMEIRA LETRA DO NOME.',
          interactionType: 'pareamento',
          items: ['ARARA  ──────────  (  A  )', 'MACACO ──────────  (  M  )', 'TATU   ──────────  (  T  )'],
          visualAidSpec: {
            type: 'cartao_associacao',
            caption: 'CARTÕES AMPLIADOS EM CAIXA ALTA: ARARA (A), MACACO (M), TATU (T)',
            sourceCitation: 'CARTÕES DIDÁTICOS ORIGINAIS APOIA.EDU (LUMINEXT TECH)',
            teacherInsertionNote: 'POSICIONE AS LETRAS MÓVEIS SOBRE OS CARTÕES SE PREFERIR MANIPULAÇÃO CONCRETA.',
          },
          responseLines: 1,
          answerKey: 'ARARA -> A; MACACO -> M; TATU -> T.',
        },
        {
          number: 2,
          title: 'CIRCULE O ANIMAL QUE VOA',
          instruction: 'APONTE OU CIRCULE A PALAVRA E A FIGURA DO ANIMAL QUE VOA.',
          interactionType: 'selecao',
          items: ['(  ) ARARA', '(  ) PEIXE'],
          visualAidSpec: {
            type: 'figura_geometrica',
            caption: 'QUADROS GRANDES DE ALTO CONTRASTE PARA SELEÇÃO DIRETA',
            sourceCitation: 'APOIO VISUAL ORIGINAL APOIA.EDU (LUMINEXT TECH)',
          },
          responseLines: 1,
          answerKey: 'ARARA.',
        },
      ],
    },
    createdByUserId: 'demo_teacher_mariana',
    createdAt: now,
    updatedAt: now,
  };

  const actSofiaMat: PedagogicalActivity = {
    id: 'demo_act_sofia_mat',
    studentId: sofia.id,
    workspaceId: wsId,
    kind: 'atividade',
    title: 'CONTAGEM CONCRETA ATÉ 5 COM CARTÕES (CAIXA ALTA)',
    subject: 'Matemática',
    theme: 'CONTAGEM E CORRESPONDÊNCIA UM A UM ATÉ 5',
    bimester: '2º Bimestre',
    schoolYear: '2026',
    durationMinutes: 25,
    literacyStage: 'alfabetizacao_inicial',
    accessibilityMode: 'tatil_auditivo',
    peiDocumentId: null,
    peiObjectiveId: null,
    peiObjectiveText: 'Relacionar quantidades concretas de 1 a 5 ao numeral correspondente com apoio visual.',
    paeeDocumentId: docPaeeSofia.id,
    paeeSupportUsed: 'Materiais concretos de contagem e números grandes em caixa alta',
    versionNumber: 1,
    content: {
      schoolHeader: schoolName.toUpperCase(),
      teacherHeader: 'PROF.ª MARIANA COSTA (AEE)',
      studentHeader: 'SOFIA R.',
      subjectHeader: 'MATEMÁTICA',
      adaptedObjective: 'Realizar contagem concreta de 1 a 5 associando tampinhas/cartões ao numeral.',
      curriculumSkill: '(EF01MA02) Contar de maneira exata ou aproximada utilizando diferentes estratégias.',
      accessibilityStrategies: ['Texto integral em CAIXA ALTA.', 'Contagem manipulada com tampinhas coloridas.'],
      paeeSupportsApplied: ['Materiais impressos em CAIXA ALTA ampliada + cartões ilustrados'],
      usedSources: ['Perfil Pedagógico de Sofia R.', 'PAEE 2026 — Sofia R.'],
      teacherGuidance: {
        before: 'Separar 5 tampinhas coloridas sobre a mesa.',
        during: 'Contar em voz alta junto com a estudante tocando cada objeto.',
        after: 'Registrar o nível de apoio necessário na contagem.',
      },
      exercises: [
        {
          number: 1,
          title: 'CONTE E CIRCULE O NÚMERO',
          instruction: 'CONTE AS FIGURAS COM O DEDO E CIRCULE O NÚMERO CORRETO.',
          interactionType: 'selecao',
          items: ['3 FORMAS  ────►   ( 2 )   ( 3 )   ( 5 )'],
          visualAidSpec: {
            type: 'figura_geometrica',
            caption: 'CONTE AS 3 FORMAS GRANDES ACIMA',
            sourceCitation: 'DIAGRAMA ORIGINAL APOIA.EDU (LUMINEXT TECH)',
          },
          responseLines: 1,
          answerKey: 'Número 3.',
        },
      ],
    },
    createdByUserId: 'demo_teacher_mariana',
    createdAt: now,
    updatedAt: now,
  };

  // 2) Clara V. (DI · Alfabetizada) -> Exemplos ilustrados de Ciências + Leitura Guiada
  const actClaraCienciasVertebrados: PedagogicalActivity = {
    id: 'demo_act_clara_ciencias_vertebrados',
    studentId: clara.id,
    workspaceId: wsId,
    kind: 'atividade',
    title: 'Animais Vertebrados e Invertebrados (Ciências)',
    subject: 'Ciências',
    theme: 'Classificação de animais vertebrados e invertebrados com apoio visual',
    bimester: '1º Bimestre',
    schoolYear: '2026',
    durationMinutes: 30,
    literacyStage: 'alfabetizado',
    accessibilityMode: 'padrao',
    peiDocumentId: null,
    peiObjectiveId: null,
    peiObjectiveText:
      'Classificar animais em vertebrados e invertebrados com apoio de definição curta e imagens de alto contraste.',
    paeeDocumentId: docPaeeClara.id,
    paeeSupportUsed: 'Fracionamento em etapas curtas + destaque de palavras-chave e apoio visual ilustrado',
    versionNumber: 1,
    content: {
      schoolHeader: schoolName,
      teacherHeader: 'Prof. Carlos Almeida',
      studentHeader: 'Clara V.',
      subjectHeader: 'Ciências',
      adaptedObjective:
        'Identificar animais vertebrados (com coluna vertebral) e invertebrados (sem coluna vertebral) por meio de 3 exercícios visuais diretos.',
      curriculumSkill:
        '(EF03CI06) Comparar alguns animais e organizar grupos com base em características externas comuns e presença de coluna vertebral.',
      accessibilityStrategies: [
        'Quadro conceitual curto no topo diferenciando vertebrados e invertebrados.',
        'Três comandos objetivos com uma única ação por questão (circular, marcar X e escrever V ou I).',
        'Imagens realistas com legendas claras e caixas de marcação amplas.',
      ],
      paeeSupportsApplied: ['Fracionamento em etapas curtas + destaque de palavras-chave e glossário visual'],
      usedSources: ['Perfil Pedagógico de Clara V.', 'PAEE 2026 — Clara V.'],
      teacherGuidance: {
        before: 'Ler em conjunto o quadro conceitual do topo destacando a palavra-chave "COLUNA VERTEBRAL".',
        during: 'Permitir que Clara observe cada imagem com calma e retome o quadro-resumo sempre que precisar conferir V ou I.',
        after: 'Validar cada escolha com a estudante e registrar o nível de autonomia em "Registrar como foi".',
      },
      worksheetImageUrl: '/assets/aistudio/di_alfabetizado_ciencias_47c058c9.png',
      worksheetImageAlt:
        'Atividade adaptada de Ciências — Animais Vertebrados e Invertebrados (Cachorro, Borboleta, Peixe, Minhoca, Sapo e Caracol)',
      exercises: [
        {
          number: 1,
          title: 'CIRCULE O ANIMAL VERTEBRADO.',
          instruction: 'Observe as imagens e circule o animal que possui coluna vertebral.',
          interactionType: 'selecao',
          items: ['CACHORRO', 'BORBOLETA'],
          visualAidSpec: {
            type: 'cartao_associacao',
            caption: 'Imagens de comparação: Cachorro (vertebrado) e Borboleta (invertebrado)',
            sourceCitation: 'Folha ilustrada adaptada ApoIA.Edu — Ciências',
          },
          responseLines: 1,
          answerKey: 'Cachorro (vertebrado).',
        },
        {
          number: 2,
          title: 'MARQUE X NO ANIMAL INVERTEBRADO.',
          instruction: 'Marque com X o quadro correspondente ao animal que não possui coluna vertebral.',
          interactionType: 'selecao',
          items: ['[  ] PEIXE', '[  ] MINHOCA'],
          visualAidSpec: {
            type: 'cartao_associacao',
            caption: 'Imagens de comparação: Peixe (vertebrado) e Minhoca (invertebrado)',
            sourceCitation: 'Folha ilustrada adaptada ApoIA.Edu — Ciências',
          },
          responseLines: 1,
          answerKey: 'Minhoca (invertebrado).',
        },
        {
          number: 3,
          title: 'ESCREVA V OU I NOS QUADROS.',
          instruction: 'Use a legenda V = VERTEBRADO e I = INVERTEBRADO para classificar cada animal.',
          interactionType: 'identificacao',
          items: ['SAPO [  ]', 'CARACOL [  ]'],
          visualAidSpec: {
            type: 'cartao_associacao',
            caption: 'Imagens para classificação: Sapo e Caracol',
            sourceCitation: 'Folha ilustrada adaptada ApoIA.Edu — Ciências',
          },
          responseLines: 1,
          answerKey: 'Sapo = V (Vertebrado); Caracol = I (Invertebrado).',
        },
      ],
    },
    createdByUserId: 'demo_teacher_carlos',
    createdAt: now,
    updatedAt: now,
  };

  const actClaraCienciasSolar: PedagogicalActivity = {
    id: 'demo_act_clara_ciencias_solar',
    studentId: clara.id,
    workspaceId: wsId,
    kind: 'atividade',
    title: 'Sistema Solar (Ciências)',
    subject: 'Ciências',
    theme: 'Identificação do Sol, da Terra e do movimento dos planetas no Sistema Solar',
    bimester: '2º Bimestre',
    schoolYear: '2026',
    durationMinutes: 30,
    literacyStage: 'alfabetizado',
    accessibilityMode: 'padrao',
    peiDocumentId: null,
    peiObjectiveId: null,
    peiObjectiveText:
      'Reconhecer o Sol como estrela central, identificar o planeta Terra e completar frase curta com banco de palavras.',
    paeeDocumentId: docPaeeClara.id,
    paeeSupportUsed: 'Fracionamento em etapas curtas + banco de palavras e imagens de apoio',
    versionNumber: 1,
    content: {
      schoolHeader: schoolName,
      teacherHeader: 'Prof. Carlos Almeida',
      studentHeader: 'Clara V.',
      subjectHeader: 'Ciências',
      adaptedObjective:
        'Reconhecer o Sol, localizar o planeta Terra entre outros astros e completar sentença simples com banco de palavras.',
      curriculumSkill:
        '(EF05CI11) Associar o movimento dos planetas e astros no Sistema Solar a partir de representações visuais.',
      accessibilityStrategies: [
        'Quadro informativo breve no início ("O Sistema Solar tem o Sol e oito planetas. Os planetas giram ao redor do Sol.").',
        'Três questões curtas com opções visuais bem espaçadas e caixas de seleção grandes.',
        'Banco de palavras (SOL | LUA) para apoiar a escrita sem sobrecarga de memória.',
      ],
      paeeSupportsApplied: ['Fracionamento em etapas curtas + destaque de palavras-chave e glossário visual'],
      usedSources: ['Perfil Pedagógico de Clara V.', 'PAEE 2026 — Clara V.'],
      teacherGuidance: {
        before: 'Ler o quadro inicial em voz alta junto com Clara e apontar as imagens do Sol, Terra, Lua, Marte e Saturno.',
        during: 'Na questão 3, orientar Clara a consultar o quadro SOL | LUA antes de completar a frase.',
        after: 'Retomar oralmente o que gira ao redor do Sol e registrar o resultado em "Registrar como foi".',
      },
      worksheetImageUrl: '/assets/aistudio/di_alfabetizado_fd266a7f.png',
      worksheetImageAlt:
        'Atividade adaptada de Ciências — Sistema Solar (Sol, Terra, Lua, Marte, Saturno e complete com palavra do quadro)',
      exercises: [
        {
          number: 1,
          title: 'MARQUE A ESTRELA DO SISTEMA SOLAR.',
          instruction: 'Observe os três astros e marque com X a estrela do Sistema Solar.',
          interactionType: 'selecao',
          items: ['[  ] SOL', '[  ] TERRA', '[  ] LUA'],
          visualAidSpec: {
            type: 'sistema_solar',
            caption: 'Ilustrações de Sol, Terra e Lua (fora de escala)',
            sourceCitation: 'Folha ilustrada adaptada ApoIA.Edu — Ciências',
          },
          responseLines: 1,
          answerKey: 'Sol.',
        },
        {
          number: 2,
          title: 'MARQUE O PLANETA ONDE VIVEMOS.',
          instruction: 'Observe os três planetas e marque com X o planeta onde vivemos.',
          interactionType: 'selecao',
          items: ['[  ] MARTE', '[  ] TERRA', '[  ] SATURNO'],
          visualAidSpec: {
            type: 'sistema_solar',
            caption: 'Ilustrações de Marte, Terra e Saturno (fora de escala)',
            sourceCitation: 'Folha ilustrada adaptada ApoIA.Edu — Ciências',
          },
          responseLines: 1,
          answerKey: 'Terra.',
        },
        {
          number: 3,
          title: 'COMPLETE COM UMA PALAVRA DO QUADRO.',
          instruction: 'Escolha entre SOL e LUA para completar a frase abaixo:',
          interactionType: 'resposta_curta',
          items: ['QUADRO DE PALAVRAS:  SOL  |  LUA', 'OS PLANETAS GIRAM AO REDOR DO ________________________.'],
          visualAidSpec: { type: 'nenhum', caption: '', sourceCitation: '' },
          responseLines: 1,
          answerKey: 'SOL (Os planetas giram ao redor do Sol).',
        },
      ],
    },
    createdByUserId: 'demo_teacher_carlos',
    createdAt: now,
    updatedAt: now,
  };

  const actClaraLP: PedagogicalActivity = {
    id: 'demo_act_clara_lp',
    studentId: clara.id,
    workspaceId: wsId,
    kind: 'atividade',
    title: 'Leitura Guiada em Etapas — A Horta e o Uso da Água (Exemplo)',
    subject: 'Língua Portuguesa',
    theme: 'Compreensão de texto informativo curto com apoio de palavras-chave',
    bimester: '1º Bimestre',
    schoolYear: '2026',
    durationMinutes: 35,
    literacyStage: 'alfabetizado',
    accessibilityMode: 'padrao',
    peiDocumentId: null,
    peiObjectiveId: null,
    peiObjectiveText: 'Ler textos informativos curtos e localizar informações explícitas com apoio de roteiro visual.',
    paeeDocumentId: docPaeeClara.id,
    paeeSupportUsed: 'Fracionamento em etapas curtas + destaque de palavras-chave e glossário visual',
    versionNumber: 1,
    content: {
      schoolHeader: schoolName,
      teacherHeader: 'Prof. Carlos Almeida',
      studentHeader: 'Clara V.',
      subjectHeader: 'Língua Portuguesa',
      adaptedObjective: 'Ler pequeno texto informativo sobre a horta escolar e responder a 3 questões diretas.',
      curriculumSkill: '(EF05LP09) Ler e compreender, com autonomia, textos instrucionais e informativos curtos.',
      accessibilityStrategies: [
        'Texto curto em 3 frases claras com destaque nas palavras-chave.',
        'Perguntas objetivas com uma única ação por enunciado.',
        'Organizador visual de apoio para relacionar ideia e exemplo.',
      ],
      paeeSupportsApplied: ['Fracionamento em etapas curtas + destaque de palavras-chave e glossário visual'],
      usedSources: ['Perfil Pedagógico de Clara V.', 'PAEE 2026 — Clara V.'],
      teacherGuidance: {
        before: 'Ler o glossário com 2 palavras-chave (REGAR e ECONOMIZAR) antes de iniciar a leitura.',
        during: 'Incentivar Clara a ler o texto curto em voz baixa e sublinhar a resposta encontrada no texto.',
        after: 'Registrar em "Registrar como foi" se localizou as informações com apoio pontual ou autonomia.',
      },
      exercises: [
        {
          number: 1,
          title: 'Leitura curta e ideia principal',
          instruction:
            'Leia o texto: "Na horta da escola, os estudantes regam as alfaces bem cedo. Regar pela manhã evita desperdício de água porque o sol ainda está fraco." Marque com X a ideia principal do texto:',
          interactionType: 'selecao',
          items: [
            '(  ) Regar a horta pela manhã ajuda a economizar água.',
            '(  ) As alfaces crescem apenas durante a noite.',
            '(  ) Não é necessário regar as plantas da escola.',
          ],
          visualAidSpec: {
            type: 'cartao_associacao',
            caption: 'Palavras-chave destacadas: Horta · Manhã · Economizar água',
            sourceCitation: 'Cartões didáticos originais ApoIA.Edu (LumiNext Tech)',
          },
          responseLines: 1,
          answerKey: 'Regar a horta pela manhã ajuda a economizar água.',
        },
        {
          number: 2,
          title: 'Organize a sequência de cuidados',
          instruction: 'Numere de 1 a 3 a ordem correta para cuidar da horta sem desperdiçar água:',
          interactionType: 'organizacao',
          items: [
            '(  ) Encher o regador com a medida certa de água.',
            '(  ) Molhar a raiz das plantas no início da manhã.',
            '(  ) Fechar bem a torneira ao terminar.',
          ],
          visualAidSpec: {
            type: 'sequencia_visual',
            caption: 'Sequência em 3 passos: 1. Preparar · 2. Regar · 3. Fechar torneira',
            sourceCitation: 'Diagrama vetorial original ApoIA.Edu (LumiNext Tech)',
          },
          responseLines: 1,
          answerKey: '1 - Encher o regador; 2 - Molhar a raiz; 3 - Fechar a torneira.',
        },
        {
          number: 3,
          title: 'Resposta curta do cotidiano',
          instruction: 'Escreva uma frase curta dizendo como você pode economizar água na escola:',
          interactionType: 'resposta_curta',
          items: ['Dica: comece com "Eu posso economizar água..."'],
          visualAidSpec: { type: 'nenhum', caption: '', sourceCitation: '' },
          responseLines: 2,
          answerKey: 'Resposta pessoal coerente (ex.: fechar a torneira ao ensaboar as mãos).',
        },
      ],
    },
    createdByUserId: 'demo_teacher_carlos',
    createdAt: now,
    updatedAt: now,
  };

  // 3) Lucas M. (Paraplégico · Alfabetizado) -> Nível curricular integral, acessibilidade ergonômica/física
  const actLucasCienciasVertebrados: PedagogicalActivity = {
    id: 'demo_act_lucas_ciencias_vertebrados',
    studentId: lucas.id,
    workspaceId: wsId,
    kind: 'atividade',
    title: 'Vertebrados e Invertebrados — Classificar e Explicar (Ciências)',
    subject: 'Ciências',
    theme: 'Classificação biológica, análise crítica e diferenciação entre coluna vertebral e exoesqueleto',
    bimester: '1º Bimestre',
    schoolYear: '2026',
    durationMinutes: 40,
    literacyStage: 'alfabetizado',
    accessibilityMode: 'padrao',
    peiDocumentId: null,
    peiObjectiveId: null,
    peiObjectiveText:
      'Classificar animais vertebrados e invertebrados, identificar grupos de vertebrados e argumentar cientificamente sem redução cognitiva.',
    paeeDocumentId: docPaeeLucas.id,
    paeeSupportUsed: 'Mesa com altura adaptada para cadeira de rodas + opção de resposta escrita, digitada ou oral',
    versionNumber: 1,
    content: {
      schoolHeader: lucas.schoolName,
      teacherHeader: 'Prof. Carlos Almeida',
      studentHeader: 'Lucas M.',
      subjectHeader: 'Ciências',
      adaptedObjective:
        'Classificar animais (morcego, polvo, tubarão e caranguejo), categorizar vertebrados e elaborar justificativas científicas com pleno desafio cognitivo.',
      curriculumSkill:
        '(EF06CI05 / Revisão Zoologia) Classificar animais em vertebrados e invertebrados analisando características estruturais e argumentação científica.',
      accessibilityStrategies: [
        'Desafio cognitivo integral preservado (classificação, análise crítica de afirmação e explicação sobre exoesqueleto).',
        'Mesa com altura adaptada para cadeira de rodas e materiais ao alcance do estudante.',
        'Flexibilidade de registro: a resposta pode ser escrita na folha A4, digitada ou apresentada oralmente.',
      ],
      paeeSupportsApplied: ['Mesa com altura adaptada para cadeira de rodas + rotas livres e suporte digital opcional'],
      usedSources: ['Perfil Pedagógico de Lucas M.', 'PAEE 2026 — Lucas M.'],
      teacherGuidance: {
        before: 'Garantir mesa com altura adequada à cadeira de rodas e materiais ao alcance das mãos antes do início da aula.',
        during: 'Manter integralmente o desafio cognitivo nas questões 3 e 4, aceitando registro escrito, digitado ou oral.',
        after: 'Socializar as justificativas sobre morcegos e exoesqueleto com a turma e registrar em "Registrar como foi".',
      },
      worksheetImageUrl: '/assets/aistudio/paraplegia_ciencias_animais_2443be35.png',
      worksheetImageAlt:
        'Atividade de Ciências — Vertebrados e Invertebrados: Classificar e Explicar (Morcego, Polvo, Tubarão, Caranguejo, grupos de vertebrados e exoesqueleto)',
      exercises: [
        {
          number: 1,
          title: 'CLASSIFIQUE OS ANIMAIS.',
          instruction: 'Use V para vertebrado e I para invertebrado.',
          interactionType: 'identificacao',
          items: ['MORCEGO (  )', 'POLVO (  )', 'TUBARÃO (  )', 'CARANGUEJO (  )'],
          visualAidSpec: {
            type: 'cartao_associacao',
            caption: 'Ilustrações fotorrealistas: Morcego, Polvo, Tubarão e Caranguejo',
            sourceCitation: 'Folha ilustrada ApoIA.Edu — Ciências',
          },
          responseLines: 1,
          answerKey: 'Morcego = V (mamífero); Polvo = I (molusco); Tubarão = V (peixe); Caranguejo = I (artrópode).',
        },
        {
          number: 2,
          title: 'IDENTIFIQUE O GRUPO DE CADA VERTEBRADO.',
          instruction: 'Escolha no quadro: PEIXES • ANFÍBIOS • RÉPTEIS • AVES • MAMÍFEROS.',
          interactionType: 'associacao',
          items: ['SAPO:', 'BALEIA:', 'JACARÉ:'],
          visualAidSpec: { type: 'nenhum', caption: '', sourceCitation: '' },
          responseLines: 1,
          answerKey: 'Sapo = Anfíbios; Baleia = Mamíferos; Jacaré = Répteis.',
        },
        {
          number: 3,
          title: 'ANALISE A AFIRMAÇÃO.',
          instruction: '"TODO ANIMAL QUE VOA É UMA AVE." Você concorda? [ ] SIM. [ ] NÃO. Justifique com um exemplo.',
          interactionType: 'resposta_curta',
          items: ['[  ] SIM    [  ] NÃO', 'Justifique com um exemplo:'],
          visualAidSpec: { type: 'nenhum', caption: '', sourceCitation: '' },
          responseLines: 2,
          answerKey: 'NÃO. Exemplo: o morcego é um mamífero que voa (ou insetos como borboletas e abelhas, que são invertebrados).',
        },
        {
          number: 4,
          title: 'EXPLIQUE A DIFERENÇA.',
          instruction:
            'O caranguejo tem um exoesqueleto: uma estrutura rígida que reveste seu corpo. Isso faz dele um vertebrado? Explique.',
          interactionType: 'resposta_curta',
          items: ['Resposta (escrita, digitada ou oral):'],
          visualAidSpec: { type: 'nenhum', caption: '', sourceCitation: '' },
          responseLines: 2,
          answerKey:
            'Não. O exoesqueleto é um revestimento externo; para ser vertebrado, o animal precisa possuir coluna vertebral (esqueleto interno).',
        },
      ],
    },
    createdByUserId: 'demo_teacher_carlos',
    createdAt: now,
    updatedAt: now,
  };

  const actLucasEdFisicaJogos: PedagogicalActivity = {
    id: 'demo_act_lucas_edfisica_jogos',
    studentId: lucas.id,
    workspaceId: wsId,
    kind: 'atividade',
    title: 'Jogos Cooperativos — Todos Participam! (Educação Física)',
    subject: 'Educação Física',
    theme: 'Jogos cooperativos inclusivos com segurança, estabilidade da cadeira e percurso acessível',
    bimester: '2º Bimestre',
    schoolYear: '2026',
    durationMinutes: 45,
    literacyStage: 'alfabetizado',
    accessibilityMode: 'padrao',
    peiDocumentId: null,
    peiObjectiveId: null,
    peiObjectiveText:
      'Participar de jogos cooperativos em dupla e grupo, ajudando os colegas e respeitando o ritmo de cada pessoa em ambiente seguro e acessível.',
    paeeDocumentId: docPaeeLucas.id,
    paeeSupportUsed: 'Quadra com piso plano sem obstáculos + bola/balão leve e organização inclusiva de duplas',
    versionNumber: 1,
    content: {
      schoolHeader: lucas.schoolName,
      teacherHeader: 'Prof. Carlos Almeida',
      studentHeader: 'Lucas M.',
      subjectHeader: 'Educação Física',
      adaptedObjective:
        'Vivenciar e avaliar 3 dinâmicas cooperativas (Passe a Bola, Balão Cooperativo e Transporte em Dupla) com protagonismo pleno em cadeira de rodas.',
      curriculumSkill:
        '(EF67EF01 / EF35EF01) Experimentar e fruir jogos cooperativos e brincadeiras, adotando estratégias inclusivas que garantam a participação de todos.',
      accessibilityStrategies: [
        'Adaptação de espaço e materiais (bola leve, balão em altura confortável, percurso amplo, plano e sem obstáculos).',
        'Estabilidade segura da cadeira de rodas com freios travados nas atividades estacionárias e rota livre no deslocamento.',
        'Participação igualitária de toda a turma — colegas sentados ou no mesmo nível de jogo durante as dinâmicas.',
      ],
      paeeSupportsApplied: ['Mesa com altura adaptada para cadeira de rodas + rotas livres e suporte digital opcional'],
      usedSources: ['Perfil Pedagógico de Lucas M.', 'PAEE 2026 — Lucas M.'],
      teacherGuidance: {
        before: 'Verificar piso plano, livre de obstáculos, e disponibilizar bolas leves, balões e tecidos/lençóis para transporte em dupla.',
        during: 'Orientar a turma para respeitar o ritmo de todos, manter a cadeira estável no passe e incentivar a cooperação genuína.',
        after: 'Realizar a autoavaliação guiada da folha (Como foi a cooperação?) e registrar em "Registrar como foi".',
      },
      worksheetImageUrl: '/assets/aistudio/paraplegia_-_educacao_fisica_a1ab75b8.jpeg',
      worksheetImageAlt:
        'Atividade inclusiva de Educação Física — Jogos Cooperativos: Passe a Bola, Balão Cooperativo e Transporte em Dupla',
      exercises: [
        {
          number: 1,
          title: 'PASSE A BOLA',
          instruction:
            'Em dupla, passe a bola com as mãos. Fique sentado(a) e use um espaço seguro. Dica de segurança: use bola leve e mantenha a cadeira estável.',
          interactionType: 'selecao',
          items: ['Como foi a cooperação?', '[  ] AJUDEI    [  ] FUI AJUDADO(A)    [  ] AJUDAMOS JUNTOS'],
          visualAidSpec: { type: 'nenhum', caption: '', sourceCitation: '' },
          responseLines: 1,
          answerKey: 'Autoavaliação reflexiva do estudante sobre sua participação cooperativa na dupla.',
        },
        {
          number: 2,
          title: 'BALÃO COOPERATIVO',
          instruction:
            'Em grupo, mantenham o balão no ar. Toquem devagar e ajudem quem precisar. Dica de segurança: use balão leve e altura confortável.',
          interactionType: 'selecao',
          items: ['O grupo conseguiu participar?', '[  ] SIM    [  ] COM AJUDA    [  ] VAMOS TENTAR DE NOVO'],
          visualAidSpec: { type: 'nenhum', caption: '', sourceCitation: '' },
          responseLines: 1,
          answerKey: 'Avaliação coletiva do grupo quanto à participação inclusiva.',
        },
        {
          number: 3,
          title: 'TRANSPORTE EM DUPLA',
          instruction:
            'Em dupla, levem a bola sobre um tecido. Sigam juntos, sem deixar a bola cair. Dica de segurança: use percurso amplo, plano e sem obstáculos.',
          interactionType: 'selecao',
          items: ['Qual foi o mais importante?', '[  ] IR RÁPIDO    [  ] TRABALHAR JUNTO    [  ] GANHAR'],
          visualAidSpec: { type: 'nenhum', caption: '', sourceCitation: '' },
          responseLines: 1,
          answerKey: 'Valorização esperada: TRABALHAR JUNTO (cooperar é participar, ajudar e respeitar).',
        },
      ],
    },
    createdByUserId: 'demo_teacher_carlos',
    createdAt: now,
    updatedAt: now,
  };

  const actLucasMat: PedagogicalActivity = {
    id: 'demo_act_lucas_mat',
    studentId: lucas.id,
    workspaceId: wsId,
    kind: 'atividade',
    title: 'Missão Sistema Solar — Situações-Problema e Escalas (Exemplo)',
    subject: 'Matemática',
    theme: 'Resolução de problemas com números naturais e análise de dados astronômicos',
    bimester: '1º Bimestre',
    schoolYear: '2026',
    durationMinutes: 45,
    literacyStage: 'alfabetizado',
    accessibilityMode: 'padrao',
    peiDocumentId: docPeiLucas.id,
    peiObjectiveId: 'demo_pei_lucas_1',
    peiObjectiveText: docPeiLucas.content.peiObjectives![0].adaptedObjective,
    paeeDocumentId: docPaeeLucas.id,
    paeeSupportUsed: 'Mesa com altura adaptada para cadeira de rodas + rotas livres e suporte digital opcional',
    versionNumber: 1,
    content: {
      schoolHeader: lucas.schoolName,
      teacherHeader: 'Prof. Carlos Almeida',
      studentHeader: 'Lucas M.',
      subjectHeader: 'Matemática',
      adaptedObjective: docPeiLucas.content.peiObjectives![0].adaptedObjective,
      curriculumSkill: '(EF06MA03) Resolver e elaborar problemas que envolvam cálculos com números naturais.',
      accessibilityStrategies: [
        'Conteúdo curricular integral do 6º Ano preservado sem redução cognitiva.',
        'Garantia de mesa acessível para cadeira de rodas e espaço amplo para apoio de folha A4 ou notebook.',
        'Atividades em dupla organizadas em bancada de fácil acesso.',
      ],
      paeeSupportsApplied: ['Mesa com altura adaptada para cadeira de rodas + rotas livres e suporte digital opcional'],
      usedSources: ['PEI 1º Bimestre · Matemática', 'PAEE 2026 — Lucas M.'],
      teacherGuidance: {
        before: 'Assegurar posicionamento confortável da cadeira de rodas na mesa adaptada com materiais ao alcance das mãos.',
        during: 'Estimular autonomia completa na resolução e na argumentação matemática junto à turma.',
        after: 'Registrar em "Registrar como foi" se o mobiliário e a organização da bancada garantiram participação plena.',
      },
      exercises: [
        {
          number: 1,
          title: 'Análise de satélites naturais',
          instruction:
            'Observe o esquema do Sistema Solar. Marte possui 2 luas conhecidas e Júpiter possui 95 luas catalogadas. Qual a soma e qual a diferença entre o número de luas desses dois planetas?',
          interactionType: 'resposta_curta',
          items: ['a) Total de luas dos dois planetas:', 'b) Diferença entre Júpiter e Marte:'],
          visualAidSpec: {
            type: 'sistema_solar',
            caption: 'Comparativo: Sol · Marte (2 luas) · Júpiter (95 luas)',
            sourceCitation: 'Ilustração didática original ApoIA.Edu (LumiNext Tech)',
          },
          responseLines: 2,
          answerKey: 'a) 97 luas; b) 93 luas.',
        },
        {
          number: 2,
          title: 'Cálculo de trajeto orbital',
          instruction:
            'Uma sonda espacial precisa percorrer 14.500 km até o ponto de coleta. No primeiro dia percorreu 6.850 km. Quantos quilômetros ainda faltam para concluir o trajeto?',
          interactionType: 'resposta_curta',
          items: ['Registre a estratégia de cálculo escolhida (mental, decomposição ou algoritmo):'],
          visualAidSpec: {
            type: 'sequencia_visual',
            caption: 'Etapas: 1. Identificar dados · 2. Definir operação · 3. Conferir resultado',
            sourceCitation: 'Diagrama original ApoIA.Edu (LumiNext Tech)',
          },
          responseLines: 2,
          answerKey: '14.500 - 6.850 = 7.650 km.',
        },
        {
          number: 3,
          title: 'Elaboração de problema',
          instruction:
            'Crie um pequeno problema de Matemática usando a operação 320 + 185 sobre uma expedição científica e apresente a solução:',
          interactionType: 'resposta_curta',
          items: ['Pode ser registrado nesta folha A4 ou digitado no computador acessível.'],
          visualAidSpec: { type: 'nenhum', caption: '', sourceCitation: '' },
          responseLines: 3,
          answerKey: 'Problema coerente com resultado 505.',
        },
      ],
    },
    createdByUserId: 'demo_teacher_carlos',
    createdAt: now,
    updatedAt: now,
  };

  // 4) Miguel T. (Autismo Grau 3 — não alfabetizado + CAA) -> TODOS OS TEXTOS DA FOLHA EM CAIXA ALTA
  const actMiguelMat: PedagogicalActivity = {
    id: 'demo_act_miguel_mat',
    studentId: miguel.id,
    workspaceId: wsId,
    kind: 'atividade',
    title: 'ROTINA VISUAL E PAREAMENTO DE FORMAS (CAIXA ALTA · CAA)',
    subject: 'Matemática',
    theme: 'CLASSIFICAÇÃO E PAREAMENTO DE FORMAS GEOMÉTRICAS COM ROTINA VISUAL',
    bimester: '1º Bimestre',
    schoolYear: '2026',
    durationMinutes: 20,
    literacyStage: 'alfabetizacao_inicial',
    accessibilityMode: 'tatil_auditivo',
    peiDocumentId: null,
    peiObjectiveId: null,
    peiObjectiveText: 'Reconhecer e parear formas geométricas básicas seguindo rotina visual estruturada com CAA.',
    paeeDocumentId: docPaeeMiguel.id,
    paeeSupportUsed: 'Prancha CAA/PECS + rotina visual (PRIMEIRO/DEPOIS/FIM) em CAIXA ALTA + fone abafador',
    versionNumber: 1,
    content: {
      schoolHeader: schoolName.toUpperCase(),
      teacherHeader: 'PROF.ª MARIANA COSTA (AEE)',
      studentHeader: 'MIGUEL T.',
      subjectHeader: 'MATEMÁTICA',
      adaptedObjective: 'Parear formas geométricas concretas (quadrado, círculo e triângulo) usando rotina visual e CAA.',
      curriculumSkill: '(EF02MA15) Reconhecer, comparar e nomear figuras planas por meio de características comuns.',
      accessibilityStrategies: [
        'Textos da folha inteiramente em CAIXA ALTA, fonte limpa e amplo espaço em branco.',
        'Previsibilidade de início, meio e fim (PRIMEIRO -> DEPOIS -> FIM) inspirada no modelo TEACCH.',
        'Resposta aceita por apontamento, entrega de cartão CAA ou encaixe da peça concreta sobre o papel.',
      ],
      paeeSupportsApplied: ['Prancha CAA/PECS + rotina visual (PRIMEIRO/DEPOIS/FIM) em CAIXA ALTA + fone abafador'],
      usedSources: ['Perfil Pedagógico de Miguel T.', 'PAEE 2026 — Miguel T.'],
      teacherGuidance: {
        before: 'Reduzir ruídos, oferecer o fone abafador se desejado e mostrar a tira de rotina (PRIMEIRO -> DEPOIS -> FIM).',
        during: 'Apresentar uma peça geométrica por vez sem pressa; aceitar apontamento ou encaixe direto sobre a folha.',
        after: 'Sinalizar claramente o cartão "FIM", oferecer reforço positivo previsível e registrar em "Registrar como foi".',
      },
      brailleOrLibrasNote:
        'TEA NÍVEL 3 · CAA E CAIXA ALTA: REALIZAR UMA ETAPA POR VEZ, COM PEÇAS CONCRETAS E AMBIENTE SILENCIOSO.',
      exercises: [
        {
          number: 1,
          title: 'ROTINA DA ATIVIDADE',
          instruction: 'APONTE CADA ETAPA DA ROTINA ANTES DE COMEÇAR.',
          interactionType: 'organizacao',
          items: ['1. PRIMEIRO: OLHAR AS FORMAS', '2. DEPOIS: ENCAIXAR IGUAL', '3. FIM: GUARDAR AS PEÇAS'],
          visualAidSpec: {
            type: 'sequencia_visual',
            caption: 'ROTINA VISUAL: 1. PRIMEIRO · 2. DEPOIS · 3. FIM',
            sourceCitation: 'ROTINA VISUAL ORIGINAL APOIA.EDU (LUMINEXT TECH)',
            teacherInsertionNote: 'COBRIR OU MARCAR CADA QUADRO ASSIM QUE A ETAPA FOR CONCLUÍDA.',
          },
          responseLines: 1,
          answerKey: 'Acompanhar visualmente ou apontar cada etapa da sequência.',
        },
        {
          number: 2,
          title: 'COLOQUE A FORMA IGUAL',
          instruction: 'ENCAIXE A PEÇA CONCRETA OU APONTE A FORMA IGUAL AO MODELO.',
          interactionType: 'pareamento',
          items: ['[ QUADRADO ]', '[ CÍRCULO ]', '[ TRIÂNGULO ]'],
          visualAidSpec: {
            type: 'figura_geometrica',
            caption: 'FORMAS GRANDES EM ALTO CONTRASTE: QUADRADO · CÍRCULO · TRIÂNGULO',
            sourceCitation: 'DIAGRAMA ORIGINAL APOIA.EDU (LUMINEXT TECH)',
          },
          responseLines: 1,
          answerKey: 'Pareamento correto das 3 formas geométricas com as peças concretas.',
        },
      ],
    },
    createdByUserId: 'demo_teacher_mariana',
    createdAt: now,
    updatedAt: now,
  };

  // ==================== APLICAÇÕES HISTÓRICAS (2025 & 2026 · MÚLTIPLOS BIMESTRES E COMPONENTES) ====================
  const applications: ApplicationFeedback[] = [
    // --- SOFIA R. (DI · Não alfabetizada) ---
    {
      id: 'demo_app_sofia_1',
      activityId: actSofiaLP.id,
      studentId: sofia.id,
      workspaceId: wsId,
      activityVersion: 1,
      activityTitle: 'Sondagem de Vogais com Cartões (CAIXA ALTA)',
      subject: 'Língua Portuguesa',
      bimester: '4º Bimestre',
      schoolYear: '2025',
      teacherId: 'demo_teacher_mariana',
      teacherName: 'Prof.ª Mariana Costa (AEE)',
      objectiveText: 'Associar imagens concretas à letra inicial em caixa alta com apoio visual.',
      appliedDate: '2025-11-12',
      status: 'aplicada',
      participation: 'participou_em_parte',
      objectiveStatus: 'ainda_nao_alcancado',
      supportLevel: 'apoio_frequente',
      helpfulResource: 'Letras móveis grandes em caixa alta',
      briefObservation: 'Reconheceu figuras de animais com entusiasmo; precisou de mediação constante para isolar a letra inicial.',
      nextStep: 'Reduzir para 2 opções por bloco e reforçar som inicial com cantigas.',
      createdAt: '2025-11-12T14:00:00.000Z',
    },
    {
      id: 'demo_app_sofia_2',
      activityId: actSofiaLP.id,
      studentId: sofia.id,
      workspaceId: wsId,
      activityVersion: 1,
      activityTitle: actSofiaLP.title,
      subject: 'Língua Portuguesa',
      bimester: '1º Bimestre',
      schoolYear: '2026',
      teacherId: 'demo_teacher_mariana',
      teacherName: 'Prof.ª Mariana Costa (AEE)',
      objectiveText: actSofiaLP.peiObjectiveText,
      appliedDate: '2026-03-09',
      status: 'aplicada',
      participation: 'participou',
      objectiveStatus: 'parcialmente_alcancado',
      supportLevel: 'apoio_pontual',
      helpfulResource: 'Cartões em CAIXA ALTA + leitura oral pausada',
      briefObservation: 'Pareou ARARA e MACACO corretamente com dica sonora pontual.',
      nextStep: 'Manter fonte em caixa alta ampliada e introduzir mais 1 letra conhecida.',
      createdAt: '2026-03-09T14:00:00.000Z',
    },
    {
      id: 'demo_app_sofia_3',
      activityId: actSofiaLP.id,
      studentId: sofia.id,
      workspaceId: wsId,
      activityVersion: 1,
      activityTitle: actSofiaLP.title,
      subject: 'Língua Portuguesa',
      bimester: '2º Bimestre',
      schoolYear: '2026',
      teacherId: 'demo_teacher_mariana',
      teacherName: 'Prof.ª Mariana Costa (AEE)',
      objectiveText: actSofiaLP.peiObjectiveText,
      appliedDate: '2026-05-14',
      status: 'aplicada',
      participation: 'participou',
      objectiveStatus: 'alcancado',
      supportLevel: 'apoio_pontual',
      helpfulResource: 'Letras móveis em CAIXA ALTA + pareamento ilustrado',
      briefObservation: 'Completou os 3 pareamentos de animais e selecionou a figura correta com segurança.',
      nextStep: 'Ampliar repertório de sílabas iniciais em caixa alta no 3º bimestre.',
      createdAt: '2026-05-14T14:00:00.000Z',
    },
    {
      id: 'demo_app_sofia_4',
      activityId: actSofiaMat.id,
      studentId: sofia.id,
      workspaceId: wsId,
      activityVersion: 1,
      activityTitle: actSofiaMat.title,
      subject: 'Matemática',
      bimester: '1º Bimestre',
      schoolYear: '2026',
      teacherId: 'demo_teacher_mariana',
      teacherName: 'Prof.ª Mariana Costa (AEE)',
      objectiveText: actSofiaMat.peiObjectiveText,
      appliedDate: '2026-03-20',
      status: 'aplicada',
      participation: 'participou',
      objectiveStatus: 'parcialmente_alcancado',
      supportLevel: 'apoio_frequente',
      helpfulResource: 'Tampinhas coloridas para contagem um a um',
      briefObservation: 'Contou até 3 com precisão manipulando as tampinhas; precisou de apoio nos números 4 e 5.',
      nextStep: 'Repetir correspondência 1 a 5 com objetos concretos grandes.',
      createdAt: '2026-03-20T14:00:00.000Z',
    },
    {
      id: 'demo_app_sofia_5',
      activityId: actSofiaMat.id,
      studentId: sofia.id,
      workspaceId: wsId,
      activityVersion: 1,
      activityTitle: actSofiaMat.title,
      subject: 'Matemática',
      bimester: '2º Bimestre',
      schoolYear: '2026',
      teacherId: 'demo_teacher_mariana',
      teacherName: 'Prof.ª Mariana Costa (AEE)',
      objectiveText: actSofiaMat.peiObjectiveText,
      appliedDate: '2026-06-04',
      status: 'aplicada',
      participation: 'participou',
      objectiveStatus: 'alcancado',
      supportLevel: 'apoio_pontual',
      helpfulResource: 'Cartões numéricos em CAIXA ALTA e tampinhas',
      briefObservation: 'Relacionou quantidades de 1 a 5 ao numeral com apenas 1 lembrete visual.',
      nextStep: 'Iniciar contagem concreta até 8 no 3º bimestre.',
      createdAt: '2026-06-04T14:00:00.000Z',
    },
    {
      id: 'demo_app_sofia_6',
      activityId: actSofiaCienciasVertebrados.id,
      studentId: sofia.id,
      workspaceId: wsId,
      activityVersion: 1,
      activityTitle: actSofiaCienciasVertebrados.title,
      subject: 'Ciências',
      bimester: '1º Bimestre',
      schoolYear: '2026',
      teacherId: 'demo_teacher_mariana',
      teacherName: 'Prof.ª Mariana Costa (AEE)',
      objectiveText: actSofiaCienciasVertebrados.peiObjectiveText,
      appliedDate: '2026-04-06',
      status: 'aplicada',
      participation: 'participou',
      objectiveStatus: 'parcialmente_alcancado',
      supportLevel: 'apoio_pontual',
      helpfulResource: 'Modelo tátil de coluna + folha ilustrada em CAIXA ALTA',
      briefObservation: 'Apontou o cachorro imediatamente; após retomar o modelo da coluna vertebral, marcou corretamente a borboleta.',
      nextStep: 'Manter apresentação de uma questão por vez com figuras fotorrealistas.',
      createdAt: '2026-04-06T14:00:00.000Z',
    },
    {
      id: 'demo_app_sofia_7',
      activityId: actSofiaCienciasSolar.id,
      studentId: sofia.id,
      workspaceId: wsId,
      activityVersion: 1,
      activityTitle: actSofiaCienciasSolar.title,
      subject: 'Ciências',
      bimester: '2º Bimestre',
      schoolYear: '2026',
      teacherId: 'demo_teacher_mariana',
      teacherName: 'Prof.ª Mariana Costa (AEE)',
      objectiveText: actSofiaCienciasSolar.peiObjectiveText,
      appliedDate: '2026-06-18',
      status: 'aplicada',
      participation: 'participou',
      objectiveStatus: 'alcancado',
      supportLevel: 'autonomia',
      helpfulResource: 'Folha ilustrada limpa em CAIXA ALTA (Sistema Solar)',
      briefObservation: 'Marcou o Sol e ligou Terra e Saturno iguais com autonomia e muito engajamento.',
      nextStep: 'Ampliar pareamento visual para outros elementos da natureza no 3º bimestre.',
      createdAt: '2026-06-18T14:00:00.000Z',
    },

    // --- CLARA V. (DI · Alfabetizada) ---
    {
      id: 'demo_app_clara_1',
      activityId: actClaraLP.id,
      studentId: clara.id,
      workspaceId: wsId,
      activityVersion: 1,
      activityTitle: 'Leitura de Tirinha — Ideia Central',
      subject: 'Língua Portuguesa',
      bimester: '4º Bimestre',
      schoolYear: '2025',
      teacherId: 'demo_teacher_carlos',
      teacherName: 'Prof. Carlos Almeida',
      objectiveText: actClaraLP.peiObjectiveText,
      appliedDate: '2025-11-18',
      status: 'aplicada',
      participation: 'participou',
      objectiveStatus: 'parcialmente_alcancado',
      supportLevel: 'apoio_frequente',
      helpfulResource: 'Sublinhado colorido de palavras-chave',
      briefObservation: 'Leu a tirinha com fluência, mas precisou de perguntas guiadas para localizar a ideia principal.',
      nextStep: 'Usar textos informativos de 3 frases com glossário prévio.',
      createdAt: '2025-11-18T15:00:00.000Z',
    },
    {
      id: 'demo_app_clara_2',
      activityId: actClaraLP.id,
      studentId: clara.id,
      workspaceId: wsId,
      activityVersion: 1,
      activityTitle: actClaraLP.title,
      subject: 'Língua Portuguesa',
      bimester: '1º Bimestre',
      schoolYear: '2026',
      teacherId: 'demo_teacher_carlos',
      teacherName: 'Prof. Carlos Almeida',
      objectiveText: actClaraLP.peiObjectiveText,
      appliedDate: '2026-03-12',
      status: 'aplicada',
      participation: 'participou',
      objectiveStatus: 'parcialmente_alcancado',
      supportLevel: 'apoio_pontual',
      helpfulResource: 'Glossário ilustrado + sequência em 3 passos',
      briefObservation: 'Acertou a questão 1 e a sequência 2 sozinha; precisou de dica inicial para redigir a frase da questão 3.',
      nextStep: 'Manter frase-modelo inicial para respostas curtas.',
      createdAt: '2026-03-12T15:00:00.000Z',
    },
    {
      id: 'demo_app_clara_3',
      activityId: actClaraLP.id,
      studentId: clara.id,
      workspaceId: wsId,
      activityVersion: 1,
      activityTitle: actClaraLP.title,
      subject: 'Língua Portuguesa',
      bimester: '2º Bimestre',
      schoolYear: '2026',
      teacherId: 'demo_teacher_carlos',
      teacherName: 'Prof. Carlos Almeida',
      objectiveText: actClaraLP.peiObjectiveText,
      appliedDate: '2026-05-22',
      status: 'aplicada',
      participation: 'participou',
      objectiveStatus: 'alcancado',
      supportLevel: 'autonomia',
      helpfulResource: 'Palavras-chave destacadas no texto curto',
      briefObservation: 'Concluiu toda a folha com autonomia e explicou oralmente a importância de economizar água.',
      nextStep: 'Ampliar texto informativo para 2 parágrafos curtos no 3º bimestre.',
      createdAt: '2026-05-22T15:00:00.000Z',
    },
    {
      id: 'demo_app_clara_4',
      activityId: actClaraLP.id,
      studentId: clara.id,
      workspaceId: wsId,
      activityVersion: 1,
      activityTitle: 'Problemas do Cotidiano — Compras na Feira',
      subject: 'Matemática',
      bimester: '1º Bimestre',
      schoolYear: '2026',
      teacherId: 'demo_teacher_carlos',
      teacherName: 'Prof. Carlos Almeida',
      objectiveText: 'Resolver operações simples de adição e subtração em etapas numeradas.',
      appliedDate: '2026-03-26',
      status: 'aplicada',
      participation: 'participou',
      objectiveStatus: 'parcialmente_alcancado',
      supportLevel: 'apoio_pontual',
      helpfulResource: 'Tabela visual de valores + cédulas pedagógicas',
      briefObservation: 'Resolveu adição sem dificuldade; precisou de conferência na subtração com troco.',
      nextStep: 'Praticar troco simples em dupla colaborativa.',
      createdAt: '2026-03-26T15:00:00.000Z',
    },
    {
      id: 'demo_app_clara_5',
      activityId: actClaraCienciasVertebrados.id,
      studentId: clara.id,
      workspaceId: wsId,
      activityVersion: 1,
      activityTitle: actClaraCienciasVertebrados.title,
      subject: 'Ciências',
      bimester: '1º Bimestre',
      schoolYear: '2026',
      teacherId: 'demo_teacher_carlos',
      teacherName: 'Prof. Carlos Almeida',
      objectiveText: actClaraCienciasVertebrados.peiObjectiveText,
      appliedDate: '2026-04-08',
      status: 'aplicada',
      participation: 'participou',
      objectiveStatus: 'parcialmente_alcancado',
      supportLevel: 'apoio_pontual',
      helpfulResource: 'Quadro conceitual curto + imagens ilustrativas de alto contraste',
      briefObservation: 'Identificou cachorro e minhoca sem dificuldade; consultou o quadro-resumo com dica pontual para classificar sapo e caracol.',
      nextStep: 'Manter quadros-resumo curtos com legenda nas próximas atividades de Ciências.',
      createdAt: '2026-04-08T15:00:00.000Z',
    },
    {
      id: 'demo_app_clara_6',
      activityId: actClaraCienciasSolar.id,
      studentId: clara.id,
      workspaceId: wsId,
      activityVersion: 1,
      activityTitle: actClaraCienciasSolar.title,
      subject: 'Ciências',
      bimester: '2º Bimestre',
      schoolYear: '2026',
      teacherId: 'demo_teacher_mariana',
      teacherName: 'Prof.ª Mariana Costa (AEE)',
      objectiveText: actClaraCienciasSolar.peiObjectiveText,
      appliedDate: '2026-06-10',
      status: 'aplicada',
      participation: 'participou',
      objectiveStatus: 'alcancado',
      supportLevel: 'autonomia',
      helpfulResource: 'Ilustrações dos astros + banco de palavras (SOL | LUA)',
      briefObservation: 'Marcou Sol e Terra corretamente e completou a frase final usando o banco de palavras com total autonomia.',
      nextStep: 'Avançar para sequência dos planetas rochosos e gasosos com apoio visual.',
      createdAt: '2026-06-10T15:00:00.000Z',
    },

    // --- LUCAS M. (Paraplégico · Alfabetizado) ---
    {
      id: 'demo_app_lucas_1',
      activityId: actLucasMat.id,
      studentId: lucas.id,
      workspaceId: wsId,
      activityVersion: 1,
      activityTitle: 'Revisão de Operações e Gráficos (5º Ano)',
      subject: 'Matemática',
      bimester: '4º Bimestre',
      schoolYear: '2025',
      teacherId: 'demo_teacher_carlos',
      teacherName: 'Prof. Carlos Almeida',
      objectiveText: actLucasMat.peiObjectiveText,
      appliedDate: '2025-11-20',
      status: 'aplicada',
      participation: 'participou',
      objectiveStatus: 'alcancado',
      supportLevel: 'autonomia',
      helpfulResource: 'Mesa adaptada com altura para cadeira de rodas',
      briefObservation: 'Desempenho excelente e autônomo na resolução de situações-problema.',
      nextStep: 'Manter nível curricular integral e acessibilidade do mobiliário no 6º Ano.',
      createdAt: '2025-11-20T15:00:00.000Z',
    },
    {
      id: 'demo_app_lucas_2',
      activityId: actLucasMat.id,
      studentId: lucas.id,
      workspaceId: wsId,
      activityVersion: 1,
      activityTitle: actLucasMat.title,
      subject: 'Matemática',
      bimester: '1º Bimestre',
      schoolYear: '2026',
      teacherId: 'demo_teacher_carlos',
      teacherName: 'Prof. Carlos Almeida',
      objectiveText: actLucasMat.peiObjectiveText,
      appliedDate: '2026-03-11',
      status: 'aplicada',
      participation: 'participou',
      objectiveStatus: 'alcancado',
      supportLevel: 'autonomia',
      helpfulResource: 'Mesa acessível e espaço livre para circulação',
      briefObservation: 'Resolveu os 3 exercícios com total autonomia e elaborou problema criativo sobre expedição espacial.',
      nextStep: 'Propor desafios de escalas proporcionais em dupla.',
      createdAt: '2026-03-11T15:00:00.000Z',
    },
    {
      id: 'demo_app_lucas_3',
      activityId: actLucasMat.id,
      studentId: lucas.id,
      workspaceId: wsId,
      activityVersion: 1,
      activityTitle: 'Experimento de Órbita em Bancada Acessível',
      subject: 'Ciências',
      bimester: '1º Bimestre',
      schoolYear: '2026',
      teacherId: 'demo_teacher_carlos',
      teacherName: 'Prof. Carlos Almeida',
      objectiveText: 'Participar de experimentos práticos de Ciências em bancada acessível.',
      appliedDate: '2026-03-27',
      status: 'aplicada',
      participation: 'participou',
      objectiveStatus: 'parcialmente_alcancado',
      supportLevel: 'apoio_pontual',
      helpfulResource: 'Bancada baixa adaptada e apoio para alcance de instrumentos',
      briefObservation: 'Análise científica impecável; precisou de apoio pontual apenas para aproximar equipamentos do fundo da bancada.',
      nextStep: 'Reorganizar bandeja de laboratório na borda frontal acessível.',
      createdAt: '2026-03-27T15:00:00.000Z',
    },
    {
      id: 'demo_app_lucas_4',
      activityId: actLucasMat.id,
      studentId: lucas.id,
      workspaceId: wsId,
      activityVersion: 1,
      activityTitle: 'Leitura de Mapas e Escalas Cartográficas',
      subject: 'Geografia',
      bimester: '2º Bimestre',
      schoolYear: '2026',
      teacherId: 'demo_teacher_carlos',
      teacherName: 'Prof. Carlos Almeida',
      objectiveText: 'Interpretar escalas e legendas em mapas temáticos.',
      appliedDate: '2026-05-19',
      status: 'aplicada',
      participation: 'participou',
      objectiveStatus: 'alcancado',
      supportLevel: 'autonomia',
      helpfulResource: 'Prancheta ergonômica e mapa impresso em A3 sobre mesa adaptada',
      briefObservation: 'Concluiu toda a análise cartográfica com autonomia e auxiliou colegas na leitura da escala.',
      nextStep: 'Avançar para produção de croqui acessível do bairro escolar.',
      createdAt: '2026-05-19T15:00:00.000Z',
    },
    {
      id: 'demo_app_lucas_5',
      activityId: actLucasCienciasVertebrados.id,
      studentId: lucas.id,
      workspaceId: wsId,
      activityVersion: 1,
      activityTitle: actLucasCienciasVertebrados.title,
      subject: 'Ciências',
      bimester: '2º Bimestre',
      schoolYear: '2026',
      teacherId: 'demo_teacher_carlos',
      teacherName: 'Prof. Carlos Almeida',
      objectiveText: actLucasCienciasVertebrados.peiObjectiveText,
      appliedDate: '2026-06-12',
      status: 'aplicada',
      participation: 'participou',
      objectiveStatus: 'alcancado',
      supportLevel: 'autonomia',
      helpfulResource: 'Mesa adaptada na altura da cadeira de rodas + opção de registro escrito/digital',
      briefObservation: 'Classificou corretamente todos os animais e justificou com precisão por que morcegos são mamíferos e caranguejos possuem exoesqueleto.',
      nextStep: 'Manter nível integral de argumentação científica nas próximas unidades de Ciências.',
      createdAt: '2026-06-12T15:00:00.000Z',
    },
    {
      id: 'demo_app_lucas_6',
      activityId: actLucasEdFisicaJogos.id,
      studentId: lucas.id,
      workspaceId: wsId,
      activityVersion: 1,
      activityTitle: actLucasEdFisicaJogos.title,
      subject: 'Educação Física',
      bimester: '2º Bimestre',
      schoolYear: '2026',
      teacherId: 'demo_teacher_carlos',
      teacherName: 'Prof. Carlos Almeida',
      objectiveText: actLucasEdFisicaJogos.peiObjectiveText,
      appliedDate: '2026-06-18',
      status: 'aplicada',
      participation: 'participou',
      objectiveStatus: 'alcancado',
      supportLevel: 'autonomia',
      helpfulResource: 'Quadra plana sem obstáculos, bola leve e dinâmica cooperativa com toda a turma',
      briefObservation: 'Participou com entusiasmo e liderança nas 3 estações cooperativas (Passe a Bola, Balão Cooperativo e Transporte em Dupla).',
      nextStep: 'Expandir repertório para esportes adaptados e jogos cooperativos em circuito.',
      createdAt: '2026-06-18T15:00:00.000Z',
    },

    // --- MIGUEL T. (Autismo Grau 3) ---
    {
      id: 'demo_app_miguel_1',
      activityId: actMiguelMat.id,
      studentId: miguel.id,
      workspaceId: wsId,
      activityVersion: 1,
      activityTitle: 'ADAPTAÇÃO À ROTINA VISUAL (PRIMEIRO / FIM)',
      subject: 'Matemática',
      bimester: '4º Bimestre',
      schoolYear: '2025',
      teacherId: 'demo_teacher_mariana',
      teacherName: 'Prof.ª Mariana Costa (AEE)',
      objectiveText: actMiguelMat.peiObjectiveText,
      appliedDate: '2025-11-14',
      status: 'aplicada',
      participation: 'participou_em_parte',
      objectiveStatus: 'ainda_nao_alcancado',
      supportLevel: 'apoio_frequente',
      helpfulResource: 'Cartões de rotina PRIMEIRO / FIM + ambiente silencioso',
      briefObservation: 'Permaneceu engajado por 6 minutos antes de solicitar pausa sensorial; respondeu bem ao cartão FIM.',
      nextStep: 'Manter sessões curtas em ambiente silencioso com fone abafador disponível.',
      createdAt: '2025-11-14T10:30:00.000Z',
    },
    {
      id: 'demo_app_miguel_2',
      activityId: actMiguelMat.id,
      studentId: miguel.id,
      workspaceId: wsId,
      activityVersion: 1,
      activityTitle: actMiguelMat.title,
      subject: 'Matemática',
      bimester: '1º Bimestre',
      schoolYear: '2026',
      teacherId: 'demo_teacher_mariana',
      teacherName: 'Prof.ª Mariana Costa (AEE)',
      objectiveText: actMiguelMat.peiObjectiveText,
      appliedDate: '2026-03-16',
      status: 'aplicada',
      participation: 'participou',
      objectiveStatus: 'parcialmente_alcancado',
      supportLevel: 'apoio_frequente',
      helpfulResource: 'Peças geométricas concretas + rotina em CAIXA ALTA + fone abafador',
      briefObservation: 'Realizou encaixe do círculo e do quadrado por 12 minutos contínuos sem desregulação.',
      nextStep: 'Consolidar pareamento do triângulo mantendo a mesma tira de rotina.',
      createdAt: '2026-03-16T10:30:00.000Z',
    },
    {
      id: 'demo_app_miguel_3',
      activityId: actMiguelMat.id,
      studentId: miguel.id,
      workspaceId: wsId,
      activityVersion: 1,
      activityTitle: actMiguelMat.title,
      subject: 'Matemática',
      bimester: '2º Bimestre',
      schoolYear: '2026',
      teacherId: 'demo_teacher_mariana',
      teacherName: 'Prof.ª Mariana Costa (AEE)',
      objectiveText: actMiguelMat.peiObjectiveText,
      appliedDate: '2026-05-25',
      status: 'aplicada',
      participation: 'participou',
      objectiveStatus: 'alcancado',
      supportLevel: 'apoio_pontual',
      helpfulResource: 'Rotina visual TEACCH (PRIMEIRO/DEPOIS/FIM) + peças concretas',
      briefObservation: 'Pareou as 3 formas corretamente apontando a etapa concluída na tira visual.',
      nextStep: 'Introduzir pareamento por cor + forma em ambiente estruturado.',
      createdAt: '2026-05-25T10:30:00.000Z',
    },
    {
      id: 'demo_app_miguel_4',
      activityId: actMiguelMat.id,
      studentId: miguel.id,
      workspaceId: wsId,
      activityVersion: 1,
      activityTitle: 'ESCOLHA DE CARTÕES CAA — ROTINA DA ESCOLA (CAIXA ALTA)',
      subject: 'Língua Portuguesa',
      bimester: '1º Bimestre',
      schoolYear: '2026',
      teacherId: 'demo_teacher_mariana',
      teacherName: 'Prof.ª Mariana Costa (AEE)',
      objectiveText: 'Utilizar cartões CAA em caixa alta para indicar necessidades e escolhas.',
      appliedDate: '2026-03-28',
      status: 'aplicada',
      participation: 'participou',
      objectiveStatus: 'parcialmente_alcancado',
      supportLevel: 'apoio_frequente',
      helpfulResource: 'Prancha CAA/PECS com pictogramas e palavras em CAIXA ALTA',
      briefObservation: 'Entregou o cartão ÁGUA e o cartão PAUSA com mediação gestual da equipe.',
      nextStep: 'Manter a prancha sempre acessível na mesa e nos deslocamentos.',
      createdAt: '2026-03-28T10:30:00.000Z',
    },
    {
      id: 'demo_app_miguel_5',
      activityId: actMiguelMat.id,
      studentId: miguel.id,
      workspaceId: wsId,
      activityVersion: 1,
      activityTitle: 'EXPLORAÇÃO SENSORIAL — TEXTURAS NATURAIS (CAIXA ALTA)',
      subject: 'Ciências',
      bimester: '2º Bimestre',
      schoolYear: '2026',
      teacherId: 'demo_teacher_mariana',
      teacherName: 'Prof.ª Mariana Costa (AEE)',
      objectiveText: 'Explorar e parear texturas concretas (liso/áspero) respeitando limites sensoriais.',
      appliedDate: '2026-06-08',
      status: 'aplicada',
      participation: 'participou',
      objectiveStatus: 'alcancado',
      supportLevel: 'apoio_pontual',
      helpfulResource: 'Cartões táteis em CAIXA ALTA (LISO / ÁSPERO) + fone abafador',
      briefObservation: 'Separou corretamente 4 cartões táteis com boa autorregulação.',
      nextStep: 'Ampliar para classificação de elementos naturais da escola no 3º bimestre.',
      createdAt: '2026-06-08T10:30:00.000Z',
    },
  ];

  const members: DemoMemberRecord[] = [
    {
      id: 'demo_wm_coord',
      user_id: 'demo_admin_coord',
      name: 'Coord.ª Helena Martins (Escola)',
      email: 'coordenacao@horizonteinclusivo.edu.br',
      role: 'admin',
      status: 'active',
      created_at: now,
      revoked_at: null,
    },
    {
      id: 'demo_wm_carlos',
      user_id: 'demo_teacher_carlos',
      name: 'Prof. Carlos Almeida',
      email: 'carlos.almeida@horizonteinclusivo.edu.br',
      role: 'teacher',
      status: 'active',
      created_at: now,
      revoked_at: null,
    },
    {
      id: 'demo_wm_mariana',
      user_id: 'demo_teacher_mariana',
      name: 'Prof.ª Mariana Costa (AEE)',
      email: 'mariana.aee@horizonteinclusivo.edu.br',
      role: 'teacher',
      status: 'active',
      created_at: now,
      revoked_at: null,
    },
  ];

  const invitations: DemoInvitationRecord[] = [
    {
      id: 'demo_inv_1',
      email: 'carlos.almeida@horizonteinclusivo.edu.br',
      role: 'teacher',
      token: 'CONV-DEMO01',
      status: 'accepted',
      created_at: now,
    },
    {
      id: 'demo_inv_2',
      email: 'mariana.aee@horizonteinclusivo.edu.br',
      role: 'teacher',
      token: 'CONV-DEMO02',
      status: 'accepted',
      created_at: now,
    },
  ];

  const studentLinks: DemoStudentLinkRecord[] = [
    // Prof. Carlos acompanha Clara (DI alfabetizada) e Lucas (Paraplégico alfabetizado)
    {
      id: 'demo_stlink_1',
      student_id: lucas.id,
      user_id: 'demo_teacher_carlos',
      role_label: 'Professor(a) de Matemática',
      status: 'active',
      revoked_at: null,
    },
    {
      id: 'demo_stlink_2',
      student_id: clara.id,
      user_id: 'demo_teacher_carlos',
      role_label: 'Professor(a) Regente',
      status: 'active',
      revoked_at: null,
    },
    // Prof.ª Mariana (AEE) acompanha os 4 perfis
    {
      id: 'demo_stlink_3',
      student_id: sofia.id,
      user_id: 'demo_teacher_mariana',
      role_label: 'Professor(a) de AEE',
      status: 'active',
      revoked_at: null,
    },
    {
      id: 'demo_stlink_4',
      student_id: clara.id,
      user_id: 'demo_teacher_mariana',
      role_label: 'Professor(a) de AEE',
      status: 'active',
      revoked_at: null,
    },
    {
      id: 'demo_stlink_5',
      student_id: lucas.id,
      user_id: 'demo_teacher_mariana',
      role_label: 'Professor(a) de AEE',
      status: 'active',
      revoked_at: null,
    },
    {
      id: 'demo_stlink_6',
      student_id: miguel.id,
      user_id: 'demo_teacher_mariana',
      role_label: 'Professor(a) de AEE',
      status: 'active',
      revoked_at: null,
    },
  ];

  // ==================== TRANSFERÊNCIA RECEBIDA (AGUARDANDO APROVAÇÃO DA ESCOLA) ====================
  const incomingBeatriz: Student = {
    id: 'demo_std_beatriz_transfer',
    workspaceId: wsId,
    createdByUserId: 'demo_origin_coord',
    displayName: 'Beatriz S. · TEA Nível 1 (Transferência recebida)',
    codeOrInitials: 'BS-4B',
    schoolName,
    schoolYear: '2026',
    gradeLevel: '4º Ano EF',
    classroom: 'Turma B',
    strengths:
      'Leitura fluente, excelente memória visual para mapas e ciências, interesse por organização de coleções e jogos de lógica.',
    interests: 'Botânica, mapas ilustrados e jogos de estratégia.',
    learningLevel:
      'TEA Nível 1 — alfabetizada: compreende textos diretos e se beneficia de avisos prévios antes de mudanças de rotina.',
    communicationModes: 'Comunicação verbal clara; prefere combinados escritos curtos para transições de atividade.',
    barriers: 'Mudanças bruscas de rotina sem aviso prévio e ambientes muito ruidosos durante avaliações.',
    workingStrategies: 'Agenda visual do dia na carteira, instruções objetivas e pausa breve quando necessário.',
    accessibilityResources: 'Cartão de combinados da aula e espaço silencioso para leitura.',
    latestPedagogicalEval: 'Prontuário encaminhado pela E.M.E.F. Paulo Freire com PAEE atualizado para continuidade em 2026.',
    createdAt: now,
    updatedAt: now,
  };

  const docPaeeBeatriz: PedagogicalDocument = {
    id: 'demo_doc_paee_beatriz',
    studentId: incomingBeatriz.id,
    workspaceId: wsId,
    docType: 'paee',
    title: 'PAEE 2026 — Beatriz S. (Transferência E.M.E.F. Paulo Freire)',
    subject: 'Atendimento Educacional Especializado',
    gradeLevel: '4º Ano EF',
    schoolYear: '2026',
    bimester: 'Anual (4 bimestres)',
    authorName: 'Coord. Roberto Dias (Escola de Origem)',
    informedDate: '2026-05-10',
    versionNumber: 1,
    status: 'revisada_pela_equipe',
    sourceIds: [],
    templateSourceId: null,
    content: {
      generationMode: 'extracao_local',
      templateFormatNote: 'PAEE transferido da escola anterior para continuidade pedagógica.',
      templateEditableUsed: true,
      fields: [],
      paeeSupports: [
        {
          id: 'demo_sup_beatriz_1',
          barrierOrNeed: 'Previsibilidade em mudanças de rotina escolar',
          supportType: 'Agenda visual do dia + aviso prévio de 5 minutos antes das transições',
          availabilityStatus: 'disponivel',
          responsibilityStatus: 'confirmada',
          responsibleRole: 'Professor(a) regente e AEE',
          outcomeStatus: 'observado',
          outcomeDescription: 'Favorece transição tranquila e participação autônoma nas propostas em grupo.',
          originReference: 'Transferência escolar 2026',
        },
      ],
      conflicts: [],
      narrativeGaps: [],
      pendingItems: [],
      missingRequestedFiles: [],
      consultedSources: [],
    },
    hasOutputFile: false,
    outputFileExt: 'docx',
    previousVersionId: null,
    reviewedByName: 'Coord. Roberto Dias',
    reviewedAt: '2026-05-11T10:00:00.000Z',
    createdAt: now,
    updatedAt: now,
  };

  const actBeatrizCiencias: PedagogicalActivity = {
    id: 'demo_act_beatriz_ciencias',
    studentId: incomingBeatriz.id,
    workspaceId: wsId,
    kind: 'atividade',
    title: 'Partes das Plantas e Funções — Roteiro Visual (Ciências)',
    subject: 'Ciências',
    theme: 'Identificação das partes das plantas com roteiro claro e previsível',
    bimester: '2º Bimestre',
    schoolYear: '2026',
    durationMinutes: 35,
    literacyStage: 'alfabetizado',
    accessibilityMode: 'padrao',
    peiDocumentId: null,
    peiObjectiveId: null,
    peiObjectiveText: 'Relacionar raiz, caule, folha e flor às suas funções utilizando roteiro estruturado.',
    paeeDocumentId: docPaeeBeatriz.id,
    paeeSupportUsed: 'Agenda visual do dia + instruções diretas sem ambiguidade',
    versionNumber: 1,
    content: {
      schoolHeader: schoolName,
      teacherHeader: 'Prof.ª Mariana Costa (AEE)',
      studentHeader: 'Beatriz S.',
      subjectHeader: 'Ciências',
      adaptedObjective: 'Identificar e explicar a função de cada parte da planta em 2 etapas objetivas.',
      curriculumSkill: '(EF04CI04) Analisar características e funções básicas das plantas.',
      accessibilityStrategies: ['Enunciados literais e objetivos.', 'Sequência clara de etapas.'],
      paeeSupportsApplied: ['Agenda visual do dia + aviso prévio antes das transições'],
      usedSources: ['PAEE 2026 — Beatriz S. (Transferência)'],
      teacherGuidance: {
        before: 'Apresentar a sequência da atividade na carteira antes do início.',
        during: 'Incentivar a autonomia e validar dúvidas de vocabulário de forma literal.',
        after: 'Registrar a adaptação à nova escola em "Registrar como foi".',
      },
      exercises: [
        {
          number: 1,
          title: 'Relacione a parte da planta à sua função',
          instruction: 'Escreva o número correspondente: (1) Raiz  (2) Caule  (3) Folha.',
          interactionType: 'associacao',
          items: [
            '(  ) Absorve água e nutrientes do solo.',
            '(  ) Sustenta a planta e transporta água.',
            '(  ) Produz o alimento da planta com a luz solar.',
          ],
          visualAidSpec: { type: 'nenhum', caption: '', sourceCitation: '' },
          responseLines: 1,
          answerKey: '1 - Raiz; 2 - Caule; 3 - Folha.',
        },
      ],
    },
    createdByUserId: 'demo_origin_coord',
    createdAt: now,
    updatedAt: now,
  };

  const incomingTransferBeatriz: StudentTransferRecord = {
    id: 'demo_trf_beatriz_in',
    studentId: incomingBeatriz.id,
    studentDisplayName: 'Beatriz S. · TEA Nível 1 (4º Ano EF)',
    studentGradeLevel: '4º Ano EF',
    studentClassroom: 'Turma B',
    fromWorkspaceId: 'demo_ws_origem_paulo_freire',
    fromSchoolName: 'E.M.E.F. Paulo Freire (Escola de Origem)',
    targetWorkspaceId: wsId,
    targetSchoolName: schoolName,
    targetSchoolEmail: 'coordenacao@horizonte.edu.br',
    transferCode: 'TRF-DEMO2026',
    status: 'pendente',
    transferNote:
      'Transferência de matrícula confirmada pela família. Encaminhamos o prontuário inclusivo (PAEE + atividade adaptada) para aprovação e continuidade na nova escola.',
    initiatedByName: 'Coord. Roberto Dias',
    reviewedByName: '',
    reviewNote: '',
    reviewedAt: null,
    createdAt: now,
    documentsCount: 1,
    activitiesCount: 1,
    direction: 'recebida',
  };

  return {
    sessionId,
    createdAt: now,
    activeProfile: 'school_admin',
    activeTeacherUserId: 'demo_teacher_mariana',
    aiExternalEnabled: true,
    members,
    invitations,
    studentLinks,
    students: [sofia, clara, lucas, miguel],
    sources,
    documents: [docPaeeSofia, docPaeeClara, docPaeeLucas, docPeiLucas, docPaeeMiguel],
    activities: [
      actSofiaCienciasVertebrados,
      actSofiaCienciasSolar,
      actSofiaLP,
      actSofiaMat,
      actClaraCienciasVertebrados,
      actClaraCienciasSolar,
      actClaraLP,
      actLucasCienciasVertebrados,
      actLucasEdFisicaJogos,
      actLucasMat,
      actMiguelMat,
    ],
    applications,
    alerts: [],
    transfers: [incomingTransferBeatriz],
    incomingStudents: [
      {
        transferId: incomingTransferBeatriz.id,
        student: incomingBeatriz,
        documents: [docPaeeBeatriz],
        activities: [actBeatrizCiencias],
        applications: [],
      },
    ],
  };
}

export function getActiveDemoUser(state: DemoSessionState): {
  user: UserSummary;
  accessRevoked: boolean;
} {
  if (state.activeProfile === 'school_admin') {
    const admin = state.members.find((m) => m.role === 'admin' && m.status === 'active') || state.members[0];
    return {
      user: {
        id: admin.user_id,
        name: admin.name,
        email: admin.email,
      },
      accessRevoked: false,
    };
  }
  const teacher =
    state.members.find((m) => m.user_id === state.activeTeacherUserId) ||
    state.members.find((m) => m.role === 'teacher') ||
    state.members[0];
  return {
    user: {
      id: teacher.user_id,
      name: teacher.name,
      email: teacher.email,
    },
    accessRevoked: teacher.status !== 'active',
  };
}

export function getVisibleDemoStudents(state: DemoSessionState): Student[] {
  if (state.activeProfile === 'school_admin') {
    return state.students;
  }
  const { user, accessRevoked } = getActiveDemoUser(state);
  if (accessRevoked) {
    return [];
  }
  const linkedStudentIds = new Set(
    state.studentLinks
      .filter((lk) => lk.user_id === user.id && lk.status === 'active')
      .map((lk) => lk.student_id)
  );
  return state.students.filter((s) => linkedStudentIds.has(s.id));
}

export function canDemoAccessStudent(state: DemoSessionState, studentId: string): boolean {
  return getVisibleDemoStudents(state).some((s) => s.id === studentId);
}

function isHttpsDemoRequest(req: Request): boolean {
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  return Boolean(req.secure || proto === 'https');
}

export function getOrCreateDemoSession(req: Request, res: Response): DemoSessionState {
  const headerSid = typeof req.headers['x-demo-session'] === 'string' ? req.headers['x-demo-session'].trim() : '';
  const cookieSid = typeof req.cookies?.[DEMO_COOKIE_NAME] === 'string' ? req.cookies[DEMO_COOKIE_NAME] : '';
  let sid = (headerSid && demoStore.has(headerSid) ? headerSid : '') || (cookieSid && demoStore.has(cookieSid) ? cookieSid : '');

  // Bound memory use in the temporary public demo; old sessions may restart.
  for (const [key, state] of demoStore) {
    if (Date.now() - Date.parse(state.createdAt) > 6 * 60 * 60 * 1000) demoStore.delete(key);
  }
  if (sid && !demoStore.has(sid)) sid = '';
  if (!sid && demoStore.size >= 100) demoStore.delete(demoStore.keys().next().value!);
  const secure = isHttpsDemoRequest(req);
  if (!sid) {
    sid = `demo_${crypto.randomBytes(12).toString('hex')}`;
    const state = buildInitialDemoState(sid);
    demoStore.set(sid, state);
    res.cookie(DEMO_COOKIE_NAME, sid, {
      httpOnly: true,
      sameSite: secure ? 'none' : 'lax',
      secure,
      path: '/',
      maxAge: 6 * 60 * 60 * 1000,
    });
    res.setHeader('X-Demo-Session', sid);
    return state;
  }
  res.setHeader('X-Demo-Session', sid);
  return demoStore.get(sid)!;
}

export function endDemoSession(req: Request, res: Response): void {
  const headerSid = typeof req.headers['x-demo-session'] === 'string' ? req.headers['x-demo-session'].trim() : '';
  const cookieSid = typeof req.cookies?.[DEMO_COOKIE_NAME] === 'string' ? req.cookies[DEMO_COOKIE_NAME] : '';
  const sid = headerSid || cookieSid;
  if (sid) {
    demoStore.delete(sid);
  }
  const secure = isHttpsDemoRequest(req);
  res.clearCookie(DEMO_COOKIE_NAME, {
    path: '/',
    sameSite: secure ? 'none' : 'lax',
    secure,
  });
}
