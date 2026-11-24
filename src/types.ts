export type WorkspaceType = 'individual' | 'school';
export type WorkspaceRole = 'admin' | 'teacher';

export type UserAccountType = 'teacher' | 'school_admin' | 'luminext_admin';
export type UserAccessStatus = 'ativo' | 'liberado' | 'pendente' | 'suspenso' | 'bloqueado';

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  jobRole?: string;
  accountType?: UserAccountType;
  accessStatus?: UserAccessStatus;
  contractStartDate?: string;
  contractEndDate?: string;
  lastLoginAt?: string | null;
}

export interface LuminextUserRecord extends UserSummary {
  phone: string;
  organization: string;
  jobRole: string;
  accountType: UserAccountType;
  accessStatus: UserAccessStatus;
  contractStartDate: string;
  contractEndDate: string;
  lastLoginAt: string | null;
  approvedBy: string;
  approvedAt: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
  workspacesCount: number;
  schoolNames: string[];
}

export interface AdminAuditLogRecord {
  id: string;
  adminUserId: string;
  adminEmail: string;
  action: string;
  targetUserId: string;
  targetEmail: string;
  details: string;
  createdAt: string;
}

export interface LuminextPreAuthRecord {
  id: string;
  email: string;
  name: string;
  organization: string;
  jobRole: string;
  accountType: UserAccountType;
  notes: string;
  authorizedBy: string;
  createdAt: string;
}

export interface WorkspaceSummary {
  id: string;
  type: WorkspaceType;
  name: string;
  city: string;
  state: string;
  role: WorkspaceRole;
  aiExternalEnabled: boolean;
  ownerUserId: string;
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  workspaceName: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  status: 'pending' | 'accepted' | 'revoked';
  createdAt: string;
}

export interface Student {
  id: string;
  workspaceId: string;
  createdByUserId: string;
  displayName: string;
  codeOrInitials: string;
  schoolName: string;
  schoolYear: string;
  gradeLevel: string;
  classroom: string;
  strengths: string;
  interests: string;
  learningLevel: string;
  communicationModes: string;
  barriers: string;
  workingStrategies: string;
  accessibilityResources: string;
  latestPedagogicalEval: string;
  createdAt: string;
  updatedAt: string;
}

export type SourceKind =
  | 'modelo_em_branco'
  | 'resposta_forms'
  | 'documento_preenchido'
  | 'fonte_curricular'
  | 'orientacao_tecnica'
  | 'registro_observacao'
  | 'avaliacao'
  | 'relatorio';

export type DocCategory = 'estudo_de_caso' | 'paee' | 'pei' | 'curriculo' | 'geral';

export interface SourceRecord {
  id: string;
  studentId: string;
  workspaceId: string;
  uploadedByUserId: string;
  sourceKind: SourceKind;
  docCategory: DocCategory;
  title: string;
  subject: string;
  schoolYear: string;
  bimester: string;
  authorName: string;
  informedDate: string;
  versionNumber: number;
  status: 'ativo' | 'substituido';
  supersedesSourceId: string | null;
  originalFilename: string;
  mimeType: string;
  fileExt: string;
  extractedText: string;
  parsedStructure: ParsedTemplateStructure | null;
  isEditableTemplate: boolean;
  createdAt: string;
}

export interface ParsedTemplateField {
  key: string;
  label: string;
  location: string;
  currentValue: string;
  isPrefilled: boolean;
  hasFormula?: boolean;
  formulaText?: string;
  isMerged?: boolean;
  mergeRange?: string;
  kind: 'paragraph' | 'table_cell' | 'xlsx_cell' | 'axis_narrative' | 'checkbox';
}

export interface ParsedTemplateStructure {
  format: 'docx' | 'xlsx' | 'pdf' | 'image' | 'text';
  editable: boolean;
  nonEditableReason?: string;
  sheets?: {
    name: string;
    merges: string[];
    formulaCells: { address: string; formula: string }[];
    prefilledCells: { address: string; value: string }[];
    validations: { address: string; rule: string }[];
  }[];
  axes?: {
    axisNumber: string;
    title: string;
    guidingQuestions: string[];
    hasAFamiliaFragment: boolean;
  }[];
  markersDetected: {
    hasAnexoIIEstudoDeCaso: boolean;
    hasTimbrePlaceholder: boolean;
    hasSampleDateXX: boolean;
    hasIntegralCheckbox: boolean;
    hasSignatureBlocks: boolean;
    hasFourBimesters: boolean;
  };
  fields: ParsedTemplateField[];
}

export type InfoOriginKind =
  | 'informacao_documentada'
  | 'relato_identificado'
  | 'observacao_professor'
  | 'sugestao_pedagogica';

export type FieldReviewStatus = 'preenchido' | 'preservado' | 'pendente';

export interface DocumentFieldEntry {
  fieldKey: string;
  label: string;
  location: string;
  value: string;
  originKind: InfoOriginKind;
  originReference: string;
  status: FieldReviewStatus;
  statusReason: string;
  reportedBy?: 'estudante' | 'familia' | 'equipe' | 'documento' | 'ia_revisao';
  confirmedByTeam?: boolean;
}

export interface SourceConflict {
  topic: string;
  higherPrioritySource: string;
  higherPriorityValue: string;
  lowerPrioritySource: string;
  lowerPriorityValue: string;
  resolutionNote: string;
}

export interface PeIObjectiveItem {
  id: string;
  subject: string;
  bimester: string;
  skillCode: string;
  skillDescription: string;
  aesCode?: string;
  aesDescription?: string;
  adaptedObjective: string;
  strategies: string;
  resources: string;
  participationModes: string;
  monitoringInstruments: string;
  successCriteria: string;
  barrier: string;
  supportOrStrategy: string;
  outcomeType: 'esperado' | 'observado';
  outcomeText: string;
  originKind: InfoOriginKind;
  originReference: string;
}

export interface DocumentContentPayload {
  guidanceGreeting?: string;
  generationMode: 'ia_institucional' | 'extracao_local' | 'cadastro_manual';
  templateFormatNote: string;
  templateEditableUsed: boolean;
  axes?: {
    axisNumber: string;
    title: string;
    narrativeParagraphs: string[];
    originKind: InfoOriginKind;
    originReference: string;
    reportedByBreakdown: {
      estudante?: string;
      familia?: string;
      equipe?: string;
    };
  }[];
  fields: DocumentFieldEntry[];
  peiObjectives?: PeIObjectiveItem[];
  paeeSupports?: {
    id: string;
    barrierOrNeed: string;
    supportType: string;
    availabilityStatus: 'recomendado' | 'disponivel';
    responsibilityStatus: 'proposta' | 'confirmada';
    responsibleRole: string;
    outcomeStatus: 'esperado' | 'observado';
    outcomeDescription: string;
    originReference: string;
  }[];
  conflicts: SourceConflict[];
  narrativeGaps: string[];
  pendingItems: string[];
  missingRequestedFiles: string[];
  consultedSources: {
    sourceId: string;
    title: string;
    kind: SourceKind;
    versionNumber: number;
    originNote: string;
  }[];
  comparisonReport?: {
    originalFormat: string;
    outputGenerated: boolean;
    preservedPrefilledCount: number;
    preservedFormulasCount: number;
    preservedMergesCount: number;
    preservedTablesOrSheetsCount: number;
    filledFieldsCount: number;
    pendingFieldsCount: number;
    visualInspectionNote: string;
    details: string[];
  };
}

export type DocType = 'estudo_de_caso' | 'paee' | 'pei';
export type DocStatus = 'existente' | 'minuta' | 'revisada_pela_equipe';

export interface PedagogicalDocument {
  id: string;
  studentId: string;
  workspaceId: string;
  docType: DocType;
  title: string;
  subject: string;
  gradeLevel: string;
  schoolYear: string;
  bimester: string;
  authorName: string;
  informedDate: string;
  versionNumber: number;
  status: DocStatus;
  sourceIds: string[];
  templateSourceId: string | null;
  content: DocumentContentPayload;
  hasOutputFile: boolean;
  outputFileExt: string;
  previousVersionId: string | null;
  reviewedByName: string;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ActivityKind = 'atividade' | 'plano_de_aula';
export type LiteracyStage = 'alfabetizado' | 'alfabetizacao_inicial';
export type AccessibilityMode = 'padrao' | 'braille' | 'libras' | 'tatil_auditivo';

export type VisualAidType =
  | 'figura_geometrica'
  | 'sistema_solar'
  | 'cartao_associacao'
  | 'sequencia_visual'
  | 'ciclo_natureza'
  | 'tabela_classificacao'
  | 'linha_numerica'
  | 'mapa_conceitual'
  | 'nenhum';

export interface VisualAidCard {
  label: string;
  sublabel?: string;
  icon?: string;
}

export interface ActivityExercise {
  number: number;
  title: string;
  instruction: string;
  interactionType: 'resposta_curta' | 'associacao' | 'pareamento' | 'identificacao' | 'selecao' | 'organizacao';
  items: string[];
  visualAidSpec?: {
    type: VisualAidType;
    caption: string;
    sourceCitation: string;
    teacherInsertionNote?: string;
    cards?: VisualAidCard[];
    imageUrl?: string;
    imagePrompt?: string;
  };
  responseLines: number;
  answerKey: string;
}

export interface ActivityContent {
  schoolHeader: string;
  teacherHeader: string;
  studentHeader: string;
  subjectHeader: string;
  adaptedObjective: string;
  curriculumSkill: string;
  accessibilityStrategies: string[];
  paeeSupportsApplied: string[];
  usedSources: string[];
  teacherGuidance: {
    before: string;
    during: string;
    after: string;
  };
  brailleOrLibrasNote?: string;
  worksheetImageUrl?: string;
  worksheetImageAlt?: string;
  exercises?: ActivityExercise[];
  lessonPlan?: {
    theme: string;
    targetAudience: string;
    durationMinutes: number;
    objectives: string[];
    skills: string[];
    resources: string[];
    developmentSteps: string[];
    accessibilityStrategies: string[];
    supportLevelAdaptations: {
      autonomia: string;
      apoioPontual: string;
      apoioFrequente: string;
    };
    formativeAssessment: string;
    barrierAdjustments: string[];
  };
}

export interface PedagogicalActivity {
  id: string;
  studentId: string;
  workspaceId: string;
  kind: ActivityKind;
  title: string;
  subject: string;
  theme: string;
  bimester: string;
  schoolYear: string;
  durationMinutes: number;
  literacyStage: LiteracyStage;
  accessibilityMode: AccessibilityMode;
  peiDocumentId: string | null;
  peiObjectiveId: string | null;
  peiObjectiveText: string;
  paeeDocumentId: string | null;
  paeeSupportUsed: string;
  versionNumber: number;
  content: ActivityContent;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationFeedback {
  id: string;
  activityId: string;
  studentId: string;
  workspaceId: string;
  activityVersion: number;
  activityTitle?: string;
  subject?: string;
  bimester?: string;
  schoolYear?: string;
  teacherId: string;
  teacherName: string;
  objectiveText: string;
  appliedDate: string;
  status: 'aplicada' | 'nao_aplicada';
  participation: 'participou' | 'participou_em_parte' | 'nao_foi_possivel_observar' | '';
  objectiveStatus: 'alcancado' | 'parcialmente_alcancado' | 'ainda_nao_alcancado' | 'nao_foi_possivel_observar' | '';
  supportLevel: 'autonomia' | 'apoio_pontual' | 'apoio_frequente' | '';
  helpfulResource: string;
  briefObservation: string;
  nextStep: string;
  createdAt: string;
}

export interface UpdateAlert {
  id: string;
  studentId: string;
  workspaceId: string;
  sourceId: string;
  documentId: string;
  sourceTitle: string;
  documentTitle: string;
  summary: string;
  proposedChanges: {
    fieldKey: string;
    label: string;
    currentValue: string;
    proposedValue: string;
    originReference: string;
  }[];
  status: 'pendente' | 'aceito' | 'descartado';
  createdAt: string;
}

export type DemoProfileMode = 'school_admin' | 'teacher';

export interface DemoTeacherSummary {
  userId: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  status: 'active' | 'revoked';
}

export interface DemoProfileInfo {
  mode: DemoProfileMode;
  activeTeacherUserId: string;
  accessRevoked: boolean;
  teachers: DemoTeacherSummary[];
}

export type StudentTransferStatus = 'pendente' | 'aprovada' | 'recusada' | 'cancelada';

export interface StudentTransferRecord {
  id: string;
  studentId: string;
  studentDisplayName: string;
  studentGradeLevel: string;
  studentClassroom: string;
  fromWorkspaceId: string;
  fromSchoolName: string;
  targetWorkspaceId: string | null;
  targetSchoolName: string;
  targetSchoolEmail: string;
  transferCode: string;
  status: StudentTransferStatus;
  transferNote: string;
  initiatedByName: string;
  reviewedByName: string;
  reviewNote: string;
  reviewedAt: string | null;
  createdAt: string;
  documentsCount: number;
  activitiesCount: number;
  direction?: 'enviada' | 'recebida';
}

