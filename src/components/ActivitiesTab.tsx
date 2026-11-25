import React, { useEffect, useRef, useState } from 'react';
import {
  ClipboardCheck,
  Download,
  ImageDown,
  Printer,
  Save,
  Sparkles,
} from 'lucide-react';
import { apiJson } from '../api';
import type {
  AccessibilityMode,
  ActivityKind,
  LiteracyStage,
  PedagogicalActivity,
  PedagogicalDocument,
  Student,
} from '../types';
import { exportActivityToA4Jpegs } from '../utils/a4CanvasExport';
import { ActivityVisualAid } from './ActivityVisualAid';
import { GenerationProgress } from './GenerationProgress';

interface ActivitiesTabProps {
  student: Student;
  documents: PedagogicalDocument[];
  activities: PedagogicalActivity[];
  isDemo: boolean;
  aiExternalEnabled: boolean;
  canToggleWorkspaceAi?: boolean;
  onEnableWorkspaceAi?: () => Promise<void> | void;
  preselectedPeiObjective?: {
    docId: string;
    objectiveId: string;
    objectiveText: string;
    subject: string;
    bimester: string;
  } | null;
  onActivityCreated?: (activity: PedagogicalActivity) => void;
  onRefreshStudent: () => void;
  onOpenFeedbackModal: (activity: PedagogicalActivity) => void;
}

function toStudentCase(text: string, uppercase: boolean): string {
  return uppercase ? text.toUpperCase() : text;
}

export const ActivitiesTab: React.FC<ActivitiesTabProps> = ({
  student,
  documents,
  activities,
  isDemo,
  aiExternalEnabled,
  canToggleWorkspaceAi = false,
  onEnableWorkspaceAi,
  preselectedPeiObjective,
  onActivityCreated,
  onRefreshStudent,
  onOpenFeedbackModal,
}) => {
  const peiDocs = documents.filter((d) => d.docType === 'pei');
  const paeeDocs = documents.filter((d) => d.docType === 'paee');
  const previewRef = useRef<HTMLDivElement | null>(null);

  const [selectedActivity, setSelectedActivity] = useState<PedagogicalActivity | null>(activities[0] || null);
  const [viewTab, setViewTab] = useState<'folha_a4' | 'visao_professor'>('folha_a4');
  const [includeAnswerKey, setIncludeAnswerKey] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');

  // Generator Form
  const [kind, setKind] = useState<ActivityKind>('atividade');
  const [subject, setSubject] = useState(preselectedPeiObjective?.subject || 'Matemática');
  const [theme, setTheme] = useState('');
  const [bimester, setBimester] = useState(preselectedPeiObjective?.bimester || '1º Bimestre');
  const [durationMinutes, setDurationMinutes] = useState(40);
  const [literacyStage, setLiteracyStage] = useState<LiteracyStage>(
    /inicial|não alfabetiz|nao alfabetiz/i.test(student.learningLevel) ? 'alfabetizacao_inicial' : 'alfabetizado'
  );
  const [accessibilityMode, setAccessibilityMode] = useState<AccessibilityMode>('padrao');
  const [classMaterialText, setClassMaterialText] = useState('');
  const [peiDocId, setPeiDocId] = useState(preselectedPeiObjective?.docId || '');
  const [peiObjId, setPeiObjId] = useState(preselectedPeiObjective?.objectiveId || '');
  const [peiObjText, setPeiObjText] = useState(preselectedPeiObjective?.objectiveText || '');
  const [paeeSupportUsed, setPaeeSupportUsed] = useState('');

  const [useAi, setUseAi] = useState(aiExternalEnabled);
  const [generateImages, setGenerateImages] = useState(true);
  const [enablingAi, setEnablingAi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [scopeRedirectMsg, setScopeRedirectMsg] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setUseAi(aiExternalEnabled);
  }, [aiExternalEnabled]);

  useEffect(() => {
    setLiteracyStage(
      /inicial|não alfabetiz|nao alfabetiz/i.test(student.learningLevel) ? 'alfabetizacao_inicial' : 'alfabetizado'
    );
  }, [student.id, student.learningLevel]);

  useEffect(() => {
    if (preselectedPeiObjective) {
      setPeiDocId(preselectedPeiObjective.docId);
      setPeiObjId(preselectedPeiObjective.objectiveId);
      setPeiObjText(preselectedPeiObjective.objectiveText);
      if (preselectedPeiObjective.subject) setSubject(preselectedPeiObjective.subject);
      if (preselectedPeiObjective.bimester) setBimester(preselectedPeiObjective.bimester);
    }
  }, [preselectedPeiObjective]);

  useEffect(() => {
    const firstPaeeSupport = paeeDocs[0]?.content.paeeSupports?.[0]?.supportType || '';
    setPaeeSupportUsed(firstPaeeSupport);
  }, [documents]);

  useEffect(() => {
    if (activities.length > 0 && (!selectedActivity || !activities.some((a) => a.id === selectedActivity.id))) {
      setSelectedActivity(activities[0]);
      setDraftTitle(activities[0].title);
    } else if (activities.length === 0) {
      setSelectedActivity(null);
    }
  }, [activities]);

  const handlePickPeiObjective = () => {
    const doc = peiDocs.find((d) => d.id === peiDocId) || peiDocs[0];
    if (!doc || !doc.content.peiObjectives?.length) {
      setNotice('Este estudante ainda não possui objetivo no PEI; você pode gerar a atividade diretamente pelo perfil e tema.');
      return;
    }
    const obj = doc.content.peiObjectives.find((o) => o.id === peiObjId) || doc.content.peiObjectives[0];
    setPeiDocId(doc.id);
    setPeiObjId(obj.id);
    setPeiObjText(obj.adaptedObjective);
    if (obj.subject) setSubject(obj.subject);
    if (obj.bimester) setBimester(obj.bimester);
    setNotice('Objetivo do PEI carregado na solicitação.');
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    setScopeRedirectMsg('');
    try {
      const endpoint = isDemo ? '/api/demo/activities/generate' : `/api/students/${student.id}/activities/generate`;
      const res = await apiJson<{ activity: PedagogicalActivity; aiUsed?: boolean; imagesGenerated?: number }>(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          studentId: student.id,
          kind,
          subject,
          theme: theme || 'Conteúdo atual da turma em etapas visuais',
          bimester,
          schoolYear: student.schoolYear || '2026',
          durationMinutes,
          literacyStage,
          accessibilityMode,
          includeAnswerKey,
          classMaterialText,
          peiDocumentId: peiDocId || null,
          peiObjectiveId: peiObjId || null,
          peiObjectiveText: peiObjText,
          paeeSupportUsed,
          useAi,
          generateImages: useAi && kind === 'atividade' && generateImages,
        }),
      });
      setSelectedActivity(res.activity);
      setDraftTitle(res.activity.title);
      setViewTab('folha_a4');
      setEditingTitle(false);
      onActivityCreated?.(res.activity);
      setNotice(
        res.aiUsed
          ? res.imagesGenerated && res.imagesGenerated > 0
            ? `Proposta "${res.activity.title}" gerada com IA e ${res.imagesGenerated} ${
                res.imagesGenerated === 1 ? 'ilustração em alta qualidade' : 'ilustrações em alta qualidade'
              }! Confira abaixo a Folha do Estudante (A4).`
            : `Proposta "${res.activity.title}" gerada com IA! Confira abaixo a Folha do Estudante (A4) e a Visão do Professor.`
          : `Proposta "${res.activity.title}" gerada em modo estruturado local! Confira abaixo a Folha do Estudante (A4) e a Visão do Professor.`
      );
      setTimeout(() => {
        previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
      onRefreshStudent();
    } catch (err: any) {
      if (err?.data?.scopeRedirect) {
        setScopeRedirectMsg(err.data.scopeRedirect.message);
      } else {
        setError(err?.message || 'Erro ao gerar proposta.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedActivity || isDemo) return;
    setBusy(true);
    try {
      const res = await apiJson<{ activity: PedagogicalActivity }>(`/api/activities/${selectedActivity.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: draftTitle,
          content: selectedActivity.content,
        }),
      });
      setSelectedActivity(res.activity);
      setEditingTitle(false);
      setNotice(`Atividade salva (nova versão v${res.activity.versionNumber}).`);
      onRefreshStudent();
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar alterações.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Generator Card */}
      <form onSubmit={handleGenerate} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 no-print">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0B1E3B]">
              Módulo ApoIA.Edu · Atividades adaptadas e planos de aula
            </h2>
            <p className="text-sm text-slate-600">
              Funciona com PEI/PAEE vinculado ou diretamente a partir do perfil e do conteúdo da turma.
            </p>
          </div>
          <button
            type="button"
            onClick={handlePickPeiObjective}
            className="px-3.5 py-2 rounded-lg border border-[#2B7DE9] bg-[#E6F0FD] text-[#0B1E3B] text-xs font-semibold hover:bg-[#D5E6FC] cursor-pointer"
          >
            Usar objetivo do PEI
          </button>
        </div>

        {scopeRedirectMsg && (
          <div className="p-3.5 rounded-lg border border-[#F59E0B] bg-[#FEF3C7] text-sm text-[#78350F]">
            {scopeRedirectMsg}
          </div>
        )}
        {error && (
          <div className="p-3.5 rounded-lg border border-red-300 bg-red-50 text-sm text-red-900">{error}</div>
        )}
        {notice && (
          <div className="p-3.5 rounded-lg border border-[#2B7DE9] bg-[#E6F0FD] text-sm text-[#0B1E3B]">{notice}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de proposta</label>
            <select value={kind} onChange={(e) => setKind(e.target.value as ActivityKind)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
              <option value="atividade">Atividade adaptada (A4)</option>
              <option value="plano_de_aula">Plano de aula inclusivo (DUA)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Componente curricular</label>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tema / conteúdo atual da turma</label>
            <input
              type="text"
              required
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Ex.: Problemas de adição e subtração / Leitura de sílabas iniciais"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Perfil de leitura / escrita</label>
            <select value={literacyStage} onChange={(e) => setLiteracyStage(e.target.value as LiteracyStage)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
              <option value="alfabetizado">Alfabetizado (até 4 exercícios curtos)</option>
              <option value="alfabetizacao_inicial">Alfabetização inicial / não alfabetizado (CAIXA ALTA · até 2)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Modo de acessibilidade</label>
            <select value={accessibilityMode} onChange={(e) => setAccessibilityMode(e.target.value as AccessibilityMode)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
              <option value="padrao">Padrão (A4 estruturado DUA)</option>
              <option value="tatil_auditivo">Acesso tátil / auditivo</option>
              <option value="braille">Braille (texto-base grafia brasileira)</option>
              <option value="libras">Libras (estrutura linguística)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Duração (até 50 min)</label>
            <input
              type="number"
              min={10}
              max={50}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm tabular-nums"
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeAnswerKey}
                onChange={(e) => setIncludeAnswerKey(e.target.checked)}
              />
              Entregar gabarito separado
            </label>
          </div>
        </div>

        {(peiObjText || paeeSupportUsed) && (
          <div className="p-3 rounded-lg bg-[#F6F8FB] border border-slate-200 text-xs text-slate-700 space-y-1">
            {peiObjText && (
              <p>
                <strong>Objetivo do PEI utilizado:</strong> {peiObjText}
              </p>
            )}
            {paeeSupportUsed && (
              <p>
                <strong>Apoio do PAEE carregado:</strong> {paeeSupportUsed}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Objetivo do PEI (editável ou opcional)</label>
            <input
              type="text"
              value={peiObjText}
              onChange={(e) => setPeiObjText(e.target.value)}
              placeholder="Selecione via “Usar objetivo do PEI” ou deixe vazio se não houver PEI"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Material da turma (opcional)</label>
            <input
              type="text"
              value={classMaterialText}
              onChange={(e) => setClassMaterialText(e.target.value)}
              placeholder="Cole trecho do livro, enunciado ou atividade da turma para adaptar"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-200">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAi}
                  disabled={!aiExternalEnabled}
                  onChange={(e) => setUseAi(e.target.checked)}
                />
                {aiExternalEnabled
                  ? 'Gerar atividade personalizada com IA (envio apenas do perfil pedagógico anônimo)'
                  : 'Geração com IA desativada neste espaço (usará modelo estruturado local)'}
              </label>
              {!aiExternalEnabled && canToggleWorkspaceAi && onEnableWorkspaceAi && (
                <button
                  type="button"
                  disabled={enablingAi}
                  onClick={async () => {
                    setEnablingAi(true);
                    setError('');
                    try {
                      await onEnableWorkspaceAi();
                      setUseAi(true);
                      setNotice('Geração com IA autorizada para este espaço.');
                    } catch (err: any) {
                      setError(err?.message || 'Não foi possível autorizar a geração com IA.');
                    } finally {
                      setEnablingAi(false);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[#2B7DE9] bg-[#E6F0FD] text-[#0B1E3B] text-xs font-semibold hover:bg-[#D5E6FC] cursor-pointer disabled:opacity-60"
                >
                  {enablingAi ? 'Autorizando...' : 'Autorizar geração com IA neste espaço'}
                </button>
              )}
            </div>
            {aiExternalEnabled && useAi && kind === 'atividade' && (
              <label className="flex items-center gap-2 text-xs font-medium text-[#0B1E3B] cursor-pointer">
                <input
                  type="checkbox"
                  checked={generateImages}
                  onChange={(e) => setGenerateImages(e.target.checked)}
                />
                Gerar ilustrações didáticas em alta qualidade por IA (prontas para impressão A4, JPEG e DOCX)
              </label>
            )}
          </div>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#2B7DE9] text-white text-sm font-semibold hover:bg-[#1D6AD4] cursor-pointer disabled:opacity-60"
          >
            <Sparkles className="w-4 h-4" />
            {busy
              ? useAi && kind === 'atividade' && generateImages
                ? 'Gerando atividade e ilustrações...'
                : useAi
                ? 'Gerando com IA...'
                : 'Gerando proposta...'
              : 'Gerar atividade / plano de aula'}
          </button>
        </div>
        {busy && useAi && <GenerationProgress withImages={kind === 'atividade' && generateImages} />}
      </form>

      {/* Activity List + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 no-print">
          <h3 className="font-display text-sm font-bold text-[#0B1E3B] mb-3">Propostas geradas</h3>
          {activities.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">Nenhuma atividade ou plano gerado ainda.</p>
          ) : (
            <ul className="space-y-2">
              {activities.map((act) => (
                <li key={act.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedActivity(act);
                      setDraftTitle(act.title);
                      setEditingTitle(false);
                    }}
                    className={`w-full text-left p-3 rounded-lg border cursor-pointer ${
                      selectedActivity?.id === act.id
                        ? 'border-[#2B7DE9] bg-[#F2F7FF]'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span className="font-semibold text-[#0B1E3B]">
                        {act.kind === 'atividade' ? 'Atividade A4' : 'Plano de Aula'}
                      </span>
                      <span className="font-mono tabular-nums">v{act.versionNumber}</span>
                    </div>
                    <p className="text-sm font-semibold text-[#0B1E3B]">{act.title}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {act.subject} · {act.durationMinutes} min · {act.accessibilityMode}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div ref={previewRef} className="lg:col-span-8 scroll-mt-6">
          {!selectedActivity ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500 text-sm">
              Gere ou selecione uma atividade para visualizar a Folha do Estudante (A4) e a Visão do Professor.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Action Toolbar */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 no-print">
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setViewTab('folha_a4')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                      viewTab === 'folha_a4' ? 'bg-white text-[#0B1E3B] shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Folha do estudante (A4)
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewTab('visao_professor')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                      viewTab === 'visao_professor' ? 'bg-white text-[#0B1E3B] shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Visão do professor
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {!isDemo && (
                    <button
                      type="button"
                      onClick={() => (editingTitle ? handleSaveEdit() : setEditingTitle(true))}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-[#0B1E3B] cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {editingTitle ? 'Salvar edição' : 'Editar'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-[#0B1E3B] cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Imprimir
                  </button>
                  <a
                    href={
                      isDemo
                        ? `/api/demo/activities/${selectedActivity.id}/docx?gabarito=${includeAnswerKey ? '1' : '0'}`
                        : `/api/activities/${selectedActivity.id}/docx?gabarito=${includeAnswerKey ? '1' : '0'}`
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-[#0B1E3B]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Baixar DOCX
                  </a>
                  {selectedActivity.kind === 'atividade' && (
                    <button
                      type="button"
                      onClick={() => exportActivityToA4Jpegs(selectedActivity, includeAnswerKey)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-[#0B1E3B] cursor-pointer"
                    >
                      <ImageDown className="w-3.5 h-3.5" />
                      Exportar JPEG (A4)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenFeedbackModal(selectedActivity)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0B1E3B] text-white text-xs font-semibold hover:bg-[#132D54] cursor-pointer"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5 text-[#FACC15]" />
                    Registrar como foi
                  </button>
                </div>
              </div>

              {/* A4 Student Sheet OR Teacher View */}
              {viewTab === 'folha_a4' ? (
                (() => {
                  const isNonLiterate = selectedActivity.literacyStage === 'alfabetizacao_inicial';
                  const fmt = (txt: string) => toStudentCase(txt, isNonLiterate);
                  const worksheetImageUrl = selectedActivity.content.worksheetImageUrl;

                  if (worksheetImageUrl) {
                    return (
                      <div className="bg-white border border-slate-300 rounded-xl p-4 sm:p-6 print-a4-sheet space-y-5">
                        {editingTitle && (
                          <input
                            type="text"
                            value={draftTitle}
                            onChange={(e) => setDraftTitle(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-[#2B7DE9] font-display text-lg font-bold text-[#0B1E3B] no-print"
                          />
                        )}
                        <div className="flex justify-center">
                          <img
                            src={worksheetImageUrl}
                            alt={selectedActivity.content.worksheetImageAlt || selectedActivity.title}
                            className="w-full max-w-[790px] h-auto rounded-lg border border-slate-200 bg-white block"
                          />
                        </div>

                        {includeAnswerKey && selectedActivity.content.exercises && selectedActivity.content.exercises.length > 0 && (
                          <div className="pt-6 border-t-2 border-dashed border-slate-300 print-page-break space-y-2">
                            <h4 className="font-display text-base font-bold text-[#0B1E3B]">
                              Gabarito separado (uso exclusivo docente)
                            </h4>
                            {selectedActivity.content.exercises.map((ex) => (
                              <p key={ex.number} className="text-sm text-slate-800">
                                <strong>Exercício {ex.number}:</strong> {ex.answerKey}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className="bg-white border border-slate-300 rounded-xl p-8 lg:p-10 print-a4-sheet space-y-6">
                      {isNonLiterate && (
                        <div className="p-3 rounded-lg border border-[#2B7DE9]/40 bg-[#F2F7FF] text-xs text-[#0B1E3B] no-print">
                          <strong>Modo CAIXA ALTA ativo:</strong> textos da folha do estudante formatados em letras maiúsculas para apoiar estudante não alfabetizado(a) / em alfabetização inicial.
                        </div>
                      )}
                      {editingTitle ? (
                        <input
                          type="text"
                          value={draftTitle}
                          onChange={(e) => setDraftTitle(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-[#2B7DE9] font-display text-lg font-bold text-[#0B1E3B]"
                        />
                      ) : (
                        <h3 className="font-display text-xl font-bold text-center text-[#0B1E3B]">
                          {fmt(selectedActivity.title)}
                        </h3>
                      )}

                      {/* Official A4 Header Box */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 border border-[#0B1E3B] text-sm">
                        <div className="p-3 border-b sm:border-r border-[#0B1E3B]">
                          <strong>{fmt('Escola:')}</strong> {fmt(selectedActivity.content.schoolHeader || '______________________')}
                        </div>
                        <div className="p-3 border-b border-[#0B1E3B]">
                          <strong>{fmt('Componente Curricular:')}</strong> {fmt(selectedActivity.content.subjectHeader)}
                        </div>
                        <div className="p-3 sm:border-r border-[#0B1E3B]">
                          <strong>{fmt('Professor(a):')}</strong> {fmt(selectedActivity.content.teacherHeader || '______________________')}
                        </div>
                        <div className="p-3">
                          <strong>{fmt('Aluno(a):')}</strong> {fmt(selectedActivity.content.studentHeader)}
                        </div>
                      </div>

                      {selectedActivity.content.brailleOrLibrasNote && (
                        <div className="p-3.5 rounded-lg border border-[#2B7DE9] bg-[#F2F7FF] text-xs text-[#0B1E3B]">
                          <strong>{fmt('Nota de Acessibilidade:')}</strong> {fmt(selectedActivity.content.brailleOrLibrasNote)}
                        </div>
                      )}

                      {selectedActivity.kind === 'atividade' && selectedActivity.content.exercises ? (
                        <div className="space-y-6">
                          {selectedActivity.content.exercises.map((ex) => (
                            <div key={ex.number} className="space-y-2 pb-4 border-b border-slate-200 last:border-b-0">
                              <h4 className="font-display text-base font-bold text-[#0B1E3B]">
                                {ex.number}. {fmt(ex.title)}
                              </h4>
                              <p className="text-base text-slate-900 leading-relaxed">{fmt(ex.instruction)}</p>
                              {ex.visualAidSpec && (
                                <ActivityVisualAid
                                  spec={ex.visualAidSpec}
                                  exerciseItems={ex.items}
                                  isNonLiterate={isNonLiterate}
                                />
                              )}
                              <ul className="space-y-1.5 text-sm text-slate-800 pl-2">
                                {ex.items.map((it, idx) => (
                                  <li key={idx}>• {fmt(it)}</li>
                                ))}
                              </ul>
                              {Array.from({ length: ex.responseLines || 2 }).map((_, lIdx) => (
                                <div key={lIdx} className="h-8 border-b border-slate-400" />
                              ))}
                            </div>
                          ))}

                          {includeAnswerKey && (
                            <div className="pt-6 border-t-2 border-dashed border-slate-300 print-page-break space-y-2">
                              <h4 className="font-display text-base font-bold text-[#0B1E3B]">
                                Gabarito separado (uso exclusivo docente)
                              </h4>
                              {selectedActivity.content.exercises.map((ex) => (
                                <p key={ex.number} className="text-sm text-slate-800">
                                  <strong>Exercício {ex.number}:</strong> {ex.answerKey}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : selectedActivity.content.lessonPlan ? (
                    <div className="space-y-4 text-sm text-slate-800">
                      <p>
                        <strong>Tema:</strong> {selectedActivity.content.lessonPlan.theme} ·{' '}
                        <strong>Público-alvo:</strong> {selectedActivity.content.lessonPlan.targetAudience} ·{' '}
                        <strong>Duração:</strong> {selectedActivity.content.lessonPlan.durationMinutes} min
                      </p>
                      <div>
                        <h4 className="font-bold text-[#0B1E3B] mb-1">Objetivos e Habilidades</h4>
                        <ul className="list-disc pl-5 space-y-1">
                          {[...selectedActivity.content.lessonPlan.objectives, ...selectedActivity.content.lessonPlan.skills].map(
                            (l, i) => (
                              <li key={i}>{l}</li>
                            )
                          )}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-bold text-[#0B1E3B] mb-1">Desenvolvimento e Acessibilidade DUA</h4>
                        <ul className="list-disc pl-5 space-y-1">
                          {selectedActivity.content.lessonPlan.developmentSteps.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 rounded border border-slate-200 bg-[#F6F8FB]">
                          <strong className="block text-xs text-[#0B1E3B]">Autonomia</strong>
                          <span className="text-xs">{selectedActivity.content.lessonPlan.supportLevelAdaptations.autonomia}</span>
                        </div>
                        <div className="p-3 rounded border border-slate-200 bg-[#F6F8FB]">
                          <strong className="block text-xs text-[#0B1E3B]">Apoio pontual</strong>
                          <span className="text-xs">{selectedActivity.content.lessonPlan.supportLevelAdaptations.apoioPontual}</span>
                        </div>
                        <div className="p-3 rounded border border-slate-200 bg-[#F6F8FB]">
                          <strong className="block text-xs text-[#0B1E3B]">Apoio frequente</strong>
                          <span className="text-xs">{selectedActivity.content.lessonPlan.supportLevelAdaptations.apoioFrequente}</span>
                        </div>
                      </div>
                      <p>
                        <strong>Avaliação formativa:</strong> {selectedActivity.content.lessonPlan.formativeAssessment}
                      </p>
                    </div>
                  ) : null}
                    </div>
                  );
                })()
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 text-sm">
                  <h3 className="font-display text-lg font-bold text-[#0B1E3B]">Visão própria do(a) professor(a)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-lg bg-[#F6F8FB] border border-slate-200">
                      <p className="text-xs font-semibold text-slate-500">Objetivo adaptado</p>
                      <p className="text-slate-900 mt-1">{selectedActivity.content.adaptedObjective}</p>
                    </div>
                    <div className="p-3.5 rounded-lg bg-[#F6F8FB] border border-slate-200">
                      <p className="text-xs font-semibold text-slate-500">Habilidade / Conteúdo da turma</p>
                      <p className="text-slate-900 mt-1">{selectedActivity.content.curriculumSkill}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0B1E3B] mb-1">Estratégias de acessibilidade e apoios aplicados</h4>
                    <ul className="list-disc pl-5 space-y-1 text-slate-700">
                      {selectedActivity.content.accessibilityStrategies.map((st, i) => (
                        <li key={i}>{st}</li>
                      ))}
                      {selectedActivity.content.paeeSupportsApplied.map((sp, i) => (
                        <li key={`p_${i}`}>Apoio PAEE: {sp}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3.5 rounded-lg border border-slate-200">
                      <strong className="text-xs text-[#2B7DE9] block mb-1">Antes da atividade</strong>
                      <p className="text-xs text-slate-700">{selectedActivity.content.teacherGuidance.before}</p>
                    </div>
                    <div className="p-3.5 rounded-lg border border-slate-200">
                      <strong className="text-xs text-[#2B7DE9] block mb-1">Durante a atividade</strong>
                      <p className="text-xs text-slate-700">{selectedActivity.content.teacherGuidance.during}</p>
                    </div>
                    <div className="p-3.5 rounded-lg border border-slate-200">
                      <strong className="text-xs text-[#2B7DE9] block mb-1">Após a atividade</strong>
                      <p className="text-xs text-slate-700">{selectedActivity.content.teacherGuidance.after}</p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 border-t border-slate-200 pt-3">
                    <strong>Referências utilizadas:</strong> {selectedActivity.content.usedSources.join(' · ')}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
