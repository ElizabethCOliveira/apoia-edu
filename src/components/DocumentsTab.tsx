import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  FileCheck2,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  FolderPlus,
  RefreshCw,
  Save,
  Upload,
} from 'lucide-react';
import { apiJson } from '../api';
import type {
  ApplicationFeedback,
  DocCategory,
  DocType,
  DocumentContentPayload,
  InfoOriginKind,
  PedagogicalDocument,
  SourceKind,
  SourceRecord,
  Student,
} from '../types';

interface DocumentsTabProps {
  student: Student;
  sources: SourceRecord[];
  documents: PedagogicalDocument[];
  applications: ApplicationFeedback[];
  isDemo: boolean;
  aiExternalEnabled: boolean;
  initialSubAction?: 'none' | 'add_existing' | 'elaborate_paee' | 'elaborate_pei';
  onRefreshStudent: () => void;
  onUsePeiObjectiveInActivity: (doc: PedagogicalDocument, objectiveId: string, objectiveText: string) => void;
}

const ORIGIN_META: Record<InfoOriginKind, { label: string; border: string; text: string }> = {
  informacao_documentada: {
    label: 'Informação documentada',
    border: 'border-slate-300 bg-slate-50',
    text: 'text-[#0B1E3B]',
  },
  relato_identificado: {
    label: 'Relato identificado',
    border: 'border-[#2B7DE9] bg-[#F2F7FF]',
    text: 'text-[#0B1E3B]',
  },
  observacao_professor: {
    label: 'Observação do professor',
    border: 'border-emerald-300 bg-emerald-50',
    text: 'text-emerald-950',
  },
  sugestao_pedagogica: {
    label: 'Sugestão pedagógica',
    border: 'border-[#F59E0B] bg-[#FEF3C7]',
    text: 'text-[#78350F]',
  },
};

const SOURCE_KIND_LABELS: Record<SourceKind, string> = {
  modelo_em_branco: 'Modelo em branco',
  resposta_forms: 'Resposta do Forms',
  documento_preenchido: 'Documento preenchido',
  fonte_curricular: 'Fonte curricular',
  orientacao_tecnica: 'Orientação técnica',
  registro_observacao: 'Registro de observação',
  avaliacao: 'Avaliação',
  relatorio: 'Relatório',
};

export const DocumentsTab: React.FC<DocumentsTabProps> = ({
  student,
  sources,
  documents,
  applications,
  isDemo,
  aiExternalEnabled,
  initialSubAction = 'none',
  onRefreshStudent,
  onUsePeiObjectiveInActivity,
}) => {
  const [panelMode, setPanelMode] = useState<'list' | 'add_existing' | 'elaborate' | 'revise' | 'add_source'>('list');
  const [selectedDoc, setSelectedDoc] = useState<PedagogicalDocument | null>(documents[0] || null);
  const [editingPayload, setEditingPayload] = useState<DocumentContentPayload | null>(null);
  const [showOriginDetails, setShowOriginDetails] = useState(true);
  const [showPeriodObsPicker, setShowPeriodObsPicker] = useState(false);

  // Add Existing Document Form
  const [exType, setExType] = useState<DocType>('paee');
  const [exTitle, setExTitle] = useState('');
  const [exSubject, setExSubject] = useState('');
  const [exBimester, setExBimester] = useState('');
  const [exAuthor, setExAuthor] = useState('');
  const [exDate, setExDate] = useState('');
  const [exSummary, setExSummary] = useState('');
  const [exSupports, setExSupports] = useState('');
  const [exFile, setExFile] = useState<File | null>(null);

  // Add Source Form
  const [srcKind, setSrcKind] = useState<SourceKind>('resposta_forms');
  const [srcCategory, setSrcCategory] = useState<DocCategory>('estudo_de_caso');
  const [srcTitle, setSrcTitle] = useState('');
  const [srcSubject, setSrcSubject] = useState('');
  const [srcBimester, setSrcBimester] = useState('');
  const [srcAuthor, setSrcAuthor] = useState('');
  const [srcDate, setSrcDate] = useState('');
  const [srcSupersedes, setSrcSupersedes] = useState('');
  const [srcManualText, setSrcManualText] = useState('');
  const [srcFile, setSrcFile] = useState<File | null>(null);

  // Elaborate / Revise Form
  const [genType, setGenType] = useState<DocType>('estudo_de_caso');
  const [genSubject, setGenSubject] = useState('Matemática');
  const [genBimester, setGenBimester] = useState('1º Bimestre');
  const [genSchoolYear, setGenSchoolYear] = useState(student.schoolYear || '2026');
  const [genTemplateId, setGenTemplateId] = useState('');
  const [genSourceIds, setGenSourceIds] = useState<string[]>([]);
  const [genAppIds, setGenAppIds] = useState<string[]>([]);
  const [genRevisionNote, setGenRevisionNote] = useState('');
  const [genPrevDocId, setGenPrevDocId] = useState<string | null>(null);
  const [genConfirmIntegral, setGenConfirmIntegral] = useState(false);
  const [genConfirmedDate, setGenConfirmedDate] = useState('');
  const [genCurriculum, setGenCurriculum] = useState('Currículo Paulista');
  const [genUseAi, setGenUseAi] = useState(aiExternalEnabled);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (initialSubAction === 'add_existing') {
      setPanelMode('add_existing');
    } else if (initialSubAction === 'elaborate_paee') {
      setGenType('paee');
      setPanelMode('elaborate');
    } else if (initialSubAction === 'elaborate_pei') {
      setGenType('pei');
      setPanelMode('elaborate');
    }
  }, [initialSubAction]);

  // Auto-select relevant active sources when student or doc type changes
  useEffect(() => {
    const activeSources = sources.filter((s) => s.status === 'ativo');
    const matchingTemplates = activeSources.filter(
      (s) => s.sourceKind === 'modelo_em_branco' && (s.docCategory === genType || s.docCategory === 'geral')
    );
    if (matchingTemplates[0]) {
      setGenTemplateId(matchingTemplates[0].id);
    } else {
      setGenTemplateId('');
    }
    const relevantIds = activeSources
      .filter((s) => s.sourceKind !== 'modelo_em_branco')
      .map((s) => s.id);
    setGenSourceIds(relevantIds);
  }, [sources, genType]);

  useEffect(() => {
    if (selectedDoc) {
      const updated = documents.find((d) => d.id === selectedDoc.id) || documents[0] || null;
      setSelectedDoc(updated);
      setEditingPayload(updated ? JSON.parse(JSON.stringify(updated.content)) : null);
    } else if (documents.length > 0) {
      setSelectedDoc(documents[0]);
      setEditingPayload(JSON.parse(JSON.stringify(documents[0].content)));
    } else {
      setSelectedDoc(null);
      setEditingPayload(null);
    }
  }, [documents]);

  const handleAddExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const fd = new FormData();
      fd.append('docType', exType);
      fd.append('title', exTitle || `${exType.toUpperCase()} existente — ${student.displayName}`);
      fd.append('subject', exSubject);
      fd.append('bimester', exBimester);
      fd.append('schoolYear', student.schoolYear || '2026');
      fd.append('authorName', exAuthor);
      fd.append('informedDate', exDate);
      fd.append('summaryText', exSummary);
      fd.append('supportsText', exSupports);
      if (isDemo) fd.append('studentId', student.id);

      const endpoint = isDemo ? '/api/demo/documents/existing' : `/api/students/${student.id}/documents/existing`;
      const res = await apiJson<{ document: PedagogicalDocument }>(endpoint, {
        method: 'POST',
        body: fd,
      });
      setSelectedDoc(res.document);
      setPanelMode('list');
      setExTitle('');
      setExSummary('');
      setExSupports('');
      setExFile(null);
      setNotice('Documento existente cadastrado com sucesso. Já pode ser utilizado em atividades e revisões.');
      onRefreshStudent();
    } catch (err: any) {
      setError(err?.message || 'Erro ao cadastrar documento existente.');
    } finally {
      setBusy(false);
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const fd = new FormData();
      fd.append('sourceKind', srcKind);
      fd.append('docCategory', srcCategory);
      fd.append('title', srcTitle || srcFile?.name || 'Fonte pedagógica');
      fd.append('subject', srcSubject);
      fd.append('bimester', srcBimester);
      fd.append('schoolYear', student.schoolYear || '2026');
      fd.append('authorName', srcAuthor);
      fd.append('informedDate', srcDate);
      if (srcSupersedes) fd.append('supersedesSourceId', srcSupersedes);
      fd.append('manualText', srcManualText);
      if (srcFile) fd.append('file', srcFile);
      if (isDemo) fd.append('studentId', student.id);

      const endpoint = isDemo ? '/api/demo/sources' : `/api/students/${student.id}/sources`;
      const res = await apiJson<{ source: SourceRecord; createdAlerts: any[] }>(endpoint, {
        method: 'POST',
        body: fd,
      });
      setPanelMode('list');
      setSrcTitle('');
      setSrcManualText('');
      setSrcFile(null);
      setSrcSupersedes('');
      setNotice(
        res.createdAlerts?.length
          ? `Fonte v${res.source.versionNumber} adicionada. ${res.createdAlerts.length} documento(s) relacionado(s) receberam aviso de revisão.`
          : `Fonte "${res.source.title}" adicionada ao prontuário.`
      );
      onRefreshStudent();
    } catch (err: any) {
      setError(err?.message || 'Erro ao adicionar fonte.');
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const endpoint = isDemo ? '/api/demo/documents/generate' : `/api/students/${student.id}/documents/generate`;
      const res = await apiJson<{ document: PedagogicalDocument; aiUsed: boolean; aiGateNotice: string | null }>(
        endpoint,
        {
          method: 'POST',
          body: JSON.stringify({
            studentId: student.id,
            docType: genType,
            templateSourceId: genTemplateId || null,
            sourceIds: genSourceIds,
            subject: genType === 'pei' ? genSubject : '',
            bimester: genType === 'pei' ? genBimester : '',
            schoolYear: genSchoolYear,
            revisionInstruction: panelMode === 'revise' ? genRevisionNote : undefined,
            previousVersionId: panelMode === 'revise' ? genPrevDocId : null,
            applicationIds: genAppIds,
            confirmIntegral: genConfirmIntegral,
            confirmedDate: genConfirmedDate,
            confirmedCurriculum: genCurriculum,
            useAi: genUseAi,
          }),
        }
      );
      setSelectedDoc(res.document);
      setEditingPayload(JSON.parse(JSON.stringify(res.document.content)));
      setPanelMode('list');
      setNotice(
        res.aiGateNotice ||
          `Minuta para revisão da equipe escolar gerada (${res.document.title} · v${res.document.versionNumber}).`
      );
      onRefreshStudent();
    } catch (err: any) {
      setError(err?.message || 'Erro ao gerar minuta do documento.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveReview = async (markAsReviewed: boolean) => {
    if (!selectedDoc || !editingPayload || isDemo) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await apiJson<{ document: PedagogicalDocument }>(`/api/documents/${selectedDoc.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: selectedDoc.title,
          status: markAsReviewed ? 'revisada_pela_equipe' : 'minuta',
          content: editingPayload,
        }),
      });
      setSelectedDoc(res.document);
      setEditingPayload(JSON.parse(JSON.stringify(res.document.content)));
      setNotice(
        markAsReviewed
          ? 'Versão registrada como revisada pela equipe escolar.'
          : 'Minuta salva para continuidade da revisão.'
      );
      onRefreshStudent();
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar revisão.');
    } finally {
      setBusy(false);
    }
  };

  const toggleSourceSelection = (id: string) => {
    setGenSourceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleAppSelection = (id: string) => {
    setGenAppIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div className="space-y-6">
      {/* Top 4 Document Actions */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-[#0B1E3B]">Documentos e Fontes do Estudante</h2>
          <p className="text-sm text-slate-600">
            Diferencia modelos em branco, respostas do Forms, documentos preenchidos e fontes curriculares.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => {
              setPanelMode('add_existing');
              setError('');
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-[#0B1E3B] hover:border-[#2B7DE9] cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-[#2B7DE9]" />
            Cadastrar documento existente
          </button>
          <button
            type="button"
            onClick={() => {
              setPanelMode('elaborate');
              setGenPrevDocId(null);
              setError('');
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#2B7DE9] text-white text-sm font-semibold hover:bg-[#1D6AD4] cursor-pointer"
          >
            <FilePlus2 className="w-4 h-4" />
            Elaborar documento
          </button>
          <button
            type="button"
            disabled={!selectedDoc}
            onClick={() => {
              if (!selectedDoc) return;
              setGenType(selectedDoc.docType);
              setGenSubject(selectedDoc.subject || 'Matemática');
              setGenBimester(selectedDoc.bimester || '1º Bimestre');
              setGenPrevDocId(selectedDoc.id);
              setPanelMode('revise');
              setError('');
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-[#0B1E3B] hover:border-[#2B7DE9] disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-[#2B7DE9]" />
            Revisar documento
          </button>
          <button
            type="button"
            onClick={() => {
              setPanelMode('add_source');
              setError('');
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0B1E3B] text-white text-sm font-semibold hover:bg-[#132D54] cursor-pointer"
          >
            <Upload className="w-4 h-4 text-[#FACC15]" />
            Adicionar fonte
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3.5 rounded-lg border border-red-300 bg-red-50 text-red-900 text-sm">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="p-3.5 rounded-lg border border-[#2B7DE9] bg-[#E6F0FD] text-[#0B1E3B] text-sm">
          {notice}
        </div>
      )}

      {/* SUBPANEL: Add Existing Document */}
      {panelMode === 'add_existing' && (
        <form onSubmit={handleAddExisting} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="font-display text-base font-bold text-[#0B1E3B]">
              Cadastrar ou anexar documento já elaborado pela escola (Estudo de Caso, PAEE ou PEI)
            </h3>
            <button type="button" onClick={() => setPanelMode('list')} className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer">
              Cancelar
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de documento</label>
              <select value={exType} onChange={(e) => setExType(e.target.value as DocType)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
                <option value="estudo_de_caso">Estudo de Caso</option>
                <option value="paee">PAEE</option>
                <option value="pei">PEI</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Título identificador</label>
              <input type="text" value={exTitle} onChange={(e) => setExTitle(e.target.value)} placeholder="Ex.: PAEE 2026 já elaborado pela escola" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Data informada</label>
              <input type="date" value={exDate} onChange={(e) => setExDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Componente (quando aplicável)</label>
              <input type="text" value={exSubject} onChange={(e) => setExSubject(e.target.value)} placeholder="Ex.: Matemática" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Bimestre (quando aplicável)</label>
              <input type="text" value={exBimester} onChange={(e) => setExBimester(e.target.value)} placeholder="Ex.: 1º Bimestre" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Autoria</label>
              <input type="text" value={exAuthor} onChange={(e) => setExAuthor(e.target.value)} placeholder="Equipe AEE / Professor(a)" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
            </div>
          </div>
          <div className="p-4 rounded-lg border-2 border-dashed border-[#2B7DE9]/60 bg-[#F2F7FF]">
            <label htmlFor="ex-file-upload" className="block text-xs font-bold text-[#0B1E3B] mb-1.5">
              Anexar arquivo do PAEE, Estudo de Caso ou PEI (DOCX, XLSX, PDF ou Imagem)
            </label>
            <input
              id="ex-file-upload"
              type="file"
              accept=".docx,.xlsx,.pdf,.png,.jpg,.jpeg"
              onChange={(e) => setExFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#0B1E3B] file:text-white hover:file:bg-[#132D54] cursor-pointer"
            />
            {exFile && (
              <p className="text-xs text-[#2B7DE9] font-semibold mt-1.5">Arquivo selecionado: {exFile.name}</p>
            )}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Síntese ou conteúdo principal</label>
              <textarea rows={3} value={exSummary} onChange={(e) => setExSummary(e.target.value)} placeholder="Resumo ou observações do documento existente..." className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Apoios / estratégias já definidas (uma por linha)</label>
              <textarea rows={3} value={exSupports} onChange={(e) => setExSupports(e.target.value)} placeholder="Ex.: Roteiro visual em 3 passos&#10;Enunciados curtos sem excesso de estímulos" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
            </div>
          </div>
          <button type="submit" disabled={busy} className="px-5 py-2.5 rounded-lg bg-[#2B7DE9] text-white text-sm font-semibold hover:bg-[#1D6AD4] cursor-pointer">
            {busy ? 'Salvando...' : 'Guardar documento existente'}
          </button>
        </form>
      )}

      {/* SUBPANEL: Add Source */}
      {panelMode === 'add_source' && (
        <form onSubmit={handleAddSource} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="font-display text-base font-bold text-[#0B1E3B]">
              Adicionar fonte (Modelo em branco, Forms, Currículo, Orientação ou Registro)
            </h3>
            <button type="button" onClick={() => setPanelMode('list')} className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer">
              Cancelar
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Classificação da fonte</label>
              <select value={srcKind} onChange={(e) => setSrcKind(e.target.value as SourceKind)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
                {Object.entries(SOURCE_KIND_LABELS).map(([k, lbl]) => (
                  <option key={k} value={k}>
                    {lbl}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Aplicável a</label>
              <select value={srcCategory} onChange={(e) => setSrcCategory(e.target.value as DocCategory)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
                <option value="estudo_de_caso">Estudo de Caso</option>
                <option value="paee">PAEE</option>
                <option value="pei">PEI</option>
                <option value="curriculo">Currículo / Escopo-Sequência</option>
                <option value="geral">Geral</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Título da fonte</label>
              <input type="text" value={srcTitle} onChange={(e) => setSrcTitle(e.target.value)} placeholder="Ex.: ANEXO II – Estudo de Caso (modelo em branco)" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Atualiza versão anterior?</label>
              <select value={srcSupersedes} onChange={(e) => setSrcSupersedes(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
                <option value="">Nova fonte independente</option>
                {sources
                  .filter((s) => s.status === 'ativo')
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      Atualiza: {s.title} (v{s.versionNumber})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Componente / Bimestre</label>
              <input type="text" value={srcSubject} onChange={(e) => setSrcSubject(e.target.value)} placeholder="Ex.: Matemática · 1º Bim" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Autoria / Data informada</label>
              <input type="text" value={srcAuthor} onChange={(e) => setSrcAuthor(e.target.value)} placeholder="Nome do autor" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
            </div>
            <div className="sm:col-span-2 lg:col-span-4 p-4 rounded-lg border-2 border-dashed border-[#2B7DE9]/60 bg-[#F2F7FF]">
              <label htmlFor="src-file-upload" className="block text-xs font-bold text-[#0B1E3B] mb-1.5">
                Anexar arquivo (Modelo em branco, Forms, Estudo de Caso, PAEE, PEI ou Fonte curricular — DOCX, XLSX, PDF, Imagem)
              </label>
              <input
                id="src-file-upload"
                type="file"
                accept=".docx,.xlsx,.pdf,.png,.jpg,.jpeg,.txt"
                onChange={(e) => setSrcFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#0B1E3B] file:text-white hover:file:bg-[#132D54] cursor-pointer"
              />
              {srcFile && (
                <p className="text-xs text-[#2B7DE9] font-semibold mt-1.5">Arquivo selecionado: {srcFile.name}</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Texto ou relato complementar (opcional)</label>
            <textarea rows={3} value={srcManualText} onChange={(e) => setSrcManualText(e.target.value)} placeholder="Cole aqui registros de observação, respostas de Forms ou trechos curriculares..." className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
          </div>
          <button type="submit" disabled={busy} className="px-5 py-2.5 rounded-lg bg-[#0B1E3B] text-white text-sm font-semibold hover:bg-[#132D54] cursor-pointer">
            {busy ? 'Processando arquivo...' : 'Anexar fonte ao estudante'}
          </button>
        </form>
      )}

      {/* SUBPANEL: Elaborate or Revise Document (Pre-generation Confirmation Screen) */}
      {(panelMode === 'elaborate' || panelMode === 'revise') && (
        <form onSubmit={handleGenerateDoc} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="font-display text-base font-bold text-[#0B1E3B]">
                {panelMode === 'revise' ? 'Revisar documento e gerar nova minuta' : 'Confirmar solicitação antes de elaborar'}
              </h3>
              {genType === 'pei' && (
                <p className="text-sm font-medium text-[#2B7DE9] mt-1">
                  Olá professor, selecione o componente, o bimestre, o modelo editável e as fontes aplicáveis.
                </p>
              )}
            </div>
            <button type="button" onClick={() => setPanelMode('list')} className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer">
              Cancelar
            </button>
          </div>

          <div className="p-3.5 rounded-lg bg-[#F6F8FB] border border-slate-200 text-sm flex flex-wrap gap-x-6 gap-y-1">
            <span>
              <strong>Estudante:</strong> {student.displayName} {student.codeOrInitials ? `(${student.codeOrInitials})` : ''}
            </span>
            <span>
              <strong>Documento solicitado:</strong>{' '}
              {genType === 'estudo_de_caso' ? 'Estudo de Caso' : genType === 'paee' ? 'PAEE' : 'PEI'}
            </span>
            <span>
              <strong>Período:</strong> {genSchoolYear} {genType === 'pei' ? `· ${genBimester}` : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de documento</label>
              <select
                value={genType}
                disabled={panelMode === 'revise'}
                onChange={(e) => setGenType(e.target.value as DocType)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                <option value="estudo_de_caso">Estudo de Caso</option>
                <option value="paee">PAEE</option>
                <option value="pei">PEI</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Modelo original (em branco / referência)</label>
              <select value={genTemplateId} onChange={(e) => setGenTemplateId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
                <option value="">Sem modelo anexado (estruturar na tela)</option>
                {sources
                  .filter((s) => s.status === 'ativo')
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.fileExt.toUpperCase()} {s.isEditableTemplate ? '· Editável' : '· Referência'})
                    </option>
                  ))}
              </select>
            </div>
            {genType === 'pei' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Componente curricular</label>
                  <input type="text" value={genSubject} onChange={(e) => setGenSubject(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bimestre</label>
                  <select value={genBimester} onChange={(e) => setGenBimester(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
                    <option>1º Bimestre</option>
                    <option>2º Bimestre</option>
                    <option>3º Bimestre</option>
                    <option>4º Bimestre</option>
                  </select>
                </div>
              </>
            )}
            {genType === 'estudo_de_caso' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Município e data confirmados (opcional)</label>
                  <input
                    type="text"
                    value={genConfirmedDate}
                    onChange={(e) => setGenConfirmedDate(e.target.value)}
                    placeholder="Deixe vazio se não confirmado"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={genConfirmIntegral}
                      onChange={(e) => setGenConfirmIntegral(e.target.checked)}
                    />
                    Confirmar turno “Integral” (se aplicável)
                  </label>
                </div>
              </>
            )}
          </div>

          {genType === 'pei' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Currículo selecionado</label>
                <input type="text" value={genCurriculum} onChange={(e) => setGenCurriculum(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ano letivo</label>
                <input type="text" value={genSchoolYear} onChange={(e) => setGenSchoolYear(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm tabular-nums" />
              </div>
            </div>
          )}

          {/* Sources Include/Exclude */}
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-2">
              Fontes carregadas para este estudante (marque ou desmarque antes de gerar):
            </p>
            {sources.length === 0 ? (
              <p className="text-xs text-slate-500">Nenhuma fonte anexada ainda. Será utilizado o perfil pedagógico cadastrado.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {sources
                  .filter((s) => s.status === 'ativo')
                  .map((s) => (
                    <label key={s.id} className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 text-xs cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={genSourceIds.includes(s.id)}
                        onChange={() => toggleSourceSelection(s.id)}
                        className="mt-0.5"
                      />
                      <span>
                        <strong className="text-[#0B1E3B]">{s.title}</strong>
                        <span className="block text-slate-500">
                          {SOURCE_KIND_LABELS[s.sourceKind]} · v{s.versionNumber} · {s.fileExt.toUpperCase()}
                        </span>
                      </span>
                    </label>
                  ))}
              </div>
            )}
          </div>

          {/* Consult Period Observations (for Revision or PEI/PAEE) */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <button
                type="button"
                onClick={() => setShowPeriodObsPicker((v) => !v)}
                className="text-xs font-semibold text-[#2B7DE9] hover:underline cursor-pointer"
              >
                {showPeriodObsPicker
                  ? 'Ocultar observações deste período'
                  : `Consultar observações deste período (${applications.length} registro(s) disponível(is))`}
              </button>
            </div>
            {showPeriodObsPicker && (
              <div className="space-y-2 mb-3">
                {applications.length === 0 ? (
                  <p className="text-xs text-slate-500">Nenhuma aplicação com feedback registrada neste período.</p>
                ) : (
                  applications.map((ap) => (
                    <label key={ap.id} className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={genAppIds.includes(ap.id)}
                        onChange={() => toggleAppSelection(ap.id)}
                        className="mt-0.5"
                      />
                      <span>
                        <strong>{ap.appliedDate}</strong> · {ap.activityTitle} · {ap.teacherName} —{' '}
                        {ap.status === 'aplicada'
                          ? `${ap.objectiveStatus.replace(/_/g, ' ')} (${ap.supportLevel.replace(/_/g, ' ')})`
                          : 'Não aplicada'}
                        {ap.briefObservation && <span className="block text-slate-600 mt-0.5">{ap.briefObservation}</span>}
                      </span>
                    </label>
                  ))
                )}
              </div>
            )}
            {panelMode === 'revise' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">O que precisa mudar nesta revisão?</label>
                <textarea
                  rows={2}
                  value={genRevisionNote}
                  onChange={(e) => setGenRevisionNote(e.target.value)}
                  placeholder="Ex.: Incorporar ajustes observados nas aplicações do bimestre mantendo campos já validados..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-200">
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={genUseAi}
                disabled={!aiExternalEnabled}
                onChange={(e) => setGenUseAi(e.target.checked)}
              />
              {aiExternalEnabled
                ? 'Usar geração assistida por IA institucional (envio apenas de trechos anônimos necessários)'
                : 'IA externa desabilitada por padrão neste espaço (usará extração estruturada local segura)'}
            </label>
            <button type="submit" disabled={busy} className="px-5 py-2.5 rounded-lg bg-[#2B7DE9] text-white text-sm font-semibold hover:bg-[#1D6AD4] cursor-pointer">
              {busy ? 'Elaborando minuta...' : 'Gerar minuta para revisão'}
            </button>
          </div>
        </form>
      )}

      {/* Main Split: List of Documents & Sources + Human Review Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Documents and Sources */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="font-display text-sm font-bold text-[#0B1E3B] mb-3">Documentos do estudante</h3>
            {documents.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                Nenhum documento ainda. Use “Cadastrar documento existente” ou “Elaborar documento”.
              </p>
            ) : (
              <ul className="space-y-2">
                {documents.map((doc) => {
                  const active = selectedDoc?.id === doc.id;
                  return (
                    <li key={doc.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDoc(doc);
                          setEditingPayload(JSON.parse(JSON.stringify(doc.content)));
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                          active ? 'border-[#2B7DE9] bg-[#F2F7FF]' : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span className="font-semibold text-[#0B1E3B]">
                            {doc.docType === 'estudo_de_caso' ? 'Estudo de Caso' : doc.docType === 'paee' ? 'PAEE' : 'PEI'}
                          </span>
                          <span className="font-mono tabular-nums">v{doc.versionNumber}</span>
                        </div>
                        <p className="text-sm font-semibold text-[#0B1E3B] leading-snug">{doc.title}</p>
                        <p className="text-xs text-slate-600 mt-1">
                          {doc.status === 'minuta'
                            ? 'Minuta para revisão'
                            : doc.status === 'revisada_pela_equipe'
                            ? 'Revisada pela equipe'
                            : 'Existente'}
                          {doc.bimester ? ` · ${doc.bimester}` : ''} · {doc.authorName || 'Equipe'}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="font-display text-sm font-bold text-[#0B1E3B] mb-3">Fontes e modelos anexados</h3>
            {sources.length === 0 ? (
              <p className="text-xs text-slate-500 py-3">Nenhuma fonte anexada ainda.</p>
            ) : (
              <ul className="divide-y divide-slate-200">
                {sources.map((src) => (
                  <li key={src.id} className="py-2.5 first:pt-0 last:pb-0 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[#0B1E3B]">{src.title}</p>
                        <p className="text-slate-500 mt-0.5">
                          {SOURCE_KIND_LABELS[src.sourceKind]} · v{src.versionNumber} · {src.status === 'substituido' ? 'Versão anterior' : 'Ativo'}
                        </p>
                      </div>
                      {!isDemo && src.originalFilename && (
                        <a
                          href={`/api/files/${src.id}/download`}
                          className="text-[#2B7DE9] hover:underline font-medium shrink-0"
                        >
                          Baixar
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right column: Human Review & Delivery Workspace */}
        <div className="lg:col-span-8">
          {!selectedDoc || !editingPayload ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-[#0B1E3B]">Selecione um documento para revisar</p>
              <p className="text-xs mt-1">Aqui você confere origem, pendências, conflitos e baixa o arquivo editável.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
              {/* Review Header */}
              <div className="border-b border-slate-200 pb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-[#2B7DE9] mb-1">
                    {selectedDoc.status === 'minuta'
                      ? 'Minuta para revisão da equipe escolar'
                      : selectedDoc.status === 'revisada_pela_equipe'
                      ? 'Versão revisada pela equipe escolar'
                      : 'Documento institucional existente'}
                    {' · '}
                    Versão {selectedDoc.versionNumber}
                  </p>
                  <h3 className="font-display text-xl font-bold text-[#0B1E3B]">{selectedDoc.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Autoria: {selectedDoc.authorName}
                    {selectedDoc.informedDate ? ` · Data: ${selectedDoc.informedDate}` : ''}
                    {selectedDoc.reviewedByName ? ` · Revisado por: ${selectedDoc.reviewedByName}` : ''}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowOriginDetails((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {showOriginDetails ? 'Ocultar origens' : 'Consultar origens'}
                  </button>
                  {!isDemo && selectedDoc.hasOutputFile && (
                    <a
                      href={`/api/documents/${selectedDoc.id}/download`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0B1E3B] text-white text-xs font-semibold hover:bg-[#132D54]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Baixar {selectedDoc.outputFileExt.toUpperCase()} editável
                    </a>
                  )}
                </div>
              </div>

              {/* PEI Greeting */}
              {editingPayload.guidanceGreeting && (
                <div className="p-3.5 rounded-lg border border-[#2B7DE9]/30 bg-[#F2F7FF] text-sm text-[#0B1E3B]">
                  <strong>{editingPayload.guidanceGreeting}</strong> confira abaixo o mapeamento por fonte, as prioridades e os campos pendentes antes de registrar a revisão da equipe.
                </div>
              )}

              {/* Non-editable PDF / Missing Template Notice (Criterion F) */}
              {!editingPayload.templateEditableUsed && (
                <div className="p-4 rounded-lg border border-[#F59E0B] bg-[#FEF3C7] text-sm text-[#78350F] flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-[#0B1E3B]">Arquivo original não preenchido automaticamente</p>
                    <p className="mt-1">{editingPayload.templateFormatNote}</p>
                    <p className="mt-1 text-xs font-medium">
                      O conteúdo estruturado por campo/eixo permanece disponível abaixo para cópia ou revisão; anexe o modelo editável em DOCX (ou XLSX para PEI) para gerar o arquivo fiel.
                    </p>
                  </div>
                </div>
              )}

              {/* Missing Requested Files (e.g. estudo-de-caso-educacao-inclusiva) */}
              {editingPayload.missingRequestedFiles?.length > 0 && (
                <div className="p-3.5 rounded-lg border border-amber-300 bg-amber-50 text-xs text-amber-950 space-y-1">
                  <p className="font-bold">Arquivos de orientação solicitados:</p>
                  {editingPayload.missingRequestedFiles.map((m, i) => (
                    <p key={i}>• {m}</p>
                  ))}
                </div>
              )}

              {/* Source Priority Conflicts */}
              {editingPayload.conflicts?.length > 0 && (
                <div className="p-4 rounded-lg border border-red-200 bg-red-50 space-y-2">
                  <p className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    Divergência entre fontes detectada (prioridade aplicada: PAEE &gt; Estudo de Caso &gt; Escopo-Sequência &gt; Guia)
                  </p>
                  {editingPayload.conflicts.map((cf, i) => (
                    <div key={i} className="bg-white border border-red-200 rounded p-3 text-xs text-slate-800 space-y-1">
                      <p className="font-bold">{cf.topic}</p>
                      <p>
                        <strong>Prioridade aplicada ({cf.higherPrioritySource}):</strong> {cf.higherPriorityValue}
                      </p>
                      <p className="text-slate-600">
                        <strong>Fonte preterida ({cf.lowerPrioritySource}):</strong> {cf.lowerPriorityValue}
                      </p>
                      <p className="text-[#0B1E3B]">{cf.resolutionNote}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Estudo de Caso Axes */}
              {editingPayload.axes && editingPayload.axes.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-display text-sm font-bold text-[#0B1E3B]">Relatório pedagógico por eixo</h4>
                  {editingPayload.axes.map((ax, idx) => {
                    const meta = ORIGIN_META[ax.originKind] || ORIGIN_META.relato_identificado;
                    return (
                      <div key={ax.axisNumber} className={`p-4 rounded-lg border ${meta.border} space-y-2.5`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h5 className="font-display text-sm font-bold text-[#0B1E3B]">{ax.title}</h5>
                          <span className={`text-xs font-semibold ${meta.text}`}>{meta.label}</span>
                        </div>
                        <textarea
                          rows={4}
                          disabled={isDemo}
                          value={ax.narrativeParagraphs.join('\n\n')}
                          onChange={(e) => {
                            const updatedAxes = [...(editingPayload.axes || [])];
                            updatedAxes[idx] = {
                              ...ax,
                              narrativeParagraphs: e.target.value.split(/\n{2,}/).filter(Boolean),
                            };
                            setEditingPayload({ ...editingPayload, axes: updatedAxes });
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm leading-relaxed"
                        />
                        {showOriginDetails && (
                          <div className="text-xs text-slate-600 space-y-1">
                            <p>
                              <strong>Origem:</strong> {ax.originReference}
                            </p>
                            {ax.reportedByBreakdown.estudante && (
                              <p>
                                <strong>Relato do estudante:</strong> {ax.reportedByBreakdown.estudante}
                              </p>
                            )}
                            {ax.reportedByBreakdown.familia && (
                              <p>
                                <strong>Relato da família:</strong> {ax.reportedByBreakdown.familia}
                              </p>
                            )}
                            {ax.reportedByBreakdown.equipe && (
                              <p>
                                <strong>Relato da equipe:</strong> {ax.reportedByBreakdown.equipe}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* PAEE Supports */}
              {editingPayload.paeeSupports && editingPayload.paeeSupports.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-display text-sm font-bold text-[#0B1E3B]">Apoios, responsabilidades e resultados (PAEE)</h4>
                  {editingPayload.paeeSupports.map((sup) => (
                    <div key={sup.id} className="p-4 rounded-lg border border-slate-200 bg-[#F6F8FB] space-y-1.5 text-sm">
                      <div className="flex flex-wrap justify-between gap-2 text-xs font-semibold text-[#0B1E3B]">
                        <span>Barreira / necessidade: {sup.barrierOrNeed}</span>
                        <span>
                          Apoio {sup.availabilityStatus} · Responsabilidade {sup.responsibilityStatus} ({sup.responsibleRole})
                        </span>
                      </div>
                      <p className="font-medium text-slate-900">{sup.supportType}</p>
                      <p className="text-xs text-slate-600">
                        Resultado {sup.outcomeStatus}: {sup.outcomeDescription}
                        {showOriginDetails ? ` · Origem: ${sup.originReference}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* PEI Objectives */}
              {editingPayload.peiObjectives && editingPayload.peiObjectives.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-display text-sm font-bold text-[#0B1E3B]">Objetivos individualizados do PEI</h4>
                  {editingPayload.peiObjectives.map((obj, idx) => {
                    const meta = ORIGIN_META[obj.originKind] || ORIGIN_META.sugestao_pedagogica;
                    return (
                      <div key={obj.id} className={`p-4 rounded-lg border ${meta.border} space-y-3`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#0B1E3B]">
                            {obj.subject} · {obj.bimester} ·{' '}
                            <span className={meta.text}>{meta.label}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => onUsePeiObjectiveInActivity(selectedDoc, obj.id, obj.adaptedObjective)}
                            className="px-3 py-1 rounded-lg bg-[#2B7DE9] text-white text-xs font-semibold hover:bg-[#1D6AD4] cursor-pointer"
                          >
                            Gerar atividade a partir deste objetivo
                          </button>
                        </div>

                        <div className="text-xs bg-white border border-slate-200 rounded p-3 space-y-1">
                          <p>
                            <strong>Habilidade (fonte):</strong>{' '}
                            {obj.skillCode ? (
                              <span className="font-mono">({obj.skillCode})</span>
                            ) : (
                              <span className="text-amber-800 font-semibold">Pendente — sem fonte curricular com código</span>
                            )}{' '}
                            {obj.skillDescription}
                          </p>
                          {obj.aesCode && (
                            <p>
                              <strong>AES:</strong> <span className="font-mono">{obj.aesCode}</span> — {obj.aesDescription}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Objetivo individualizado (editável na revisão)</label>
                          <textarea
                            rows={2}
                            disabled={isDemo}
                            value={obj.adaptedObjective}
                            onChange={(e) => {
                              const arr = [...(editingPayload.peiObjectives || [])];
                              arr[idx] = { ...obj, adaptedObjective: e.target.value };
                              setEditingPayload({ ...editingPayload, peiObjectives: arr });
                            }}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-700">
                          <p>
                            <strong>Estratégias:</strong> {obj.strategies}
                          </p>
                          <p>
                            <strong>Recursos e participação:</strong> {obj.resources} · {obj.participationModes}
                          </p>
                          <p>
                            <strong>Acompanhamento e critérios:</strong> {obj.monitoringInstruments} · {obj.successCriteria}
                          </p>
                          <p>
                            <strong>Relação Barreira → Apoio → Resultado ({obj.outcomeType}):</strong> {obj.barrier} →{' '}
                            {obj.supportOrStrategy} → {obj.outcomeText}
                          </p>
                        </div>
                        {showOriginDetails && (
                          <p className="text-xs text-slate-500">Origem: {obj.originReference}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Field-by-Field Review Table */}
              {editingPayload.fields?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-display text-sm font-bold text-[#0B1E3B]">Conferência por campo / célula</h4>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F6F8FB] text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold">Campo / Local</th>
                          <th className="py-2.5 px-3 font-semibold">Situação</th>
                          <th className="py-2.5 px-3 font-semibold">Conteúdo</th>
                          <th className="py-2.5 px-3 font-semibold">Origem / Motivo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {editingPayload.fields.map((f) => (
                          <tr key={f.fieldKey} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-medium text-[#0B1E3B]">
                              {f.label}
                              <span className="block text-slate-500 font-normal">{f.location}</span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap font-semibold">
                              {f.status === 'preservado' && <span className="text-[#0B1E3B]">Preservado</span>}
                              {f.status === 'preenchido' && <span className="text-emerald-700">Preenchido</span>}
                              {f.status === 'pendente' && <span className="text-amber-700">Pendente</span>}
                            </td>
                            <td className="py-2.5 px-3 text-slate-800">{f.value || '— (em branco)'}</td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {f.originReference} · {f.statusReason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Narrative Gaps & Pending Items */}
              {(editingPayload.narrativeGaps?.length > 0 || editingPayload.pendingItems?.length > 0) && (
                <div className="p-4 rounded-lg border border-amber-300 bg-amber-50 text-xs text-amber-950 space-y-1.5">
                  <p className="font-bold">Pendências e lacunas identificadas para decisão da equipe:</p>
                  {editingPayload.narrativeGaps.map((g, i) => (
                    <p key={`g_${i}`}>• Lacuna narrativa: {g}</p>
                  ))}
                  {editingPayload.pendingItems.map((p, i) => (
                    <p key={`p_${i}`}>• Pendência: {p}</p>
                  ))}
                </div>
              )}

              {/* Original vs Generated File Comparison Report */}
              {editingPayload.comparisonReport && (
                <div className="p-4 rounded-lg border border-slate-200 bg-[#F6F8FB] text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-[#0B1E3B] flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-[#2B7DE9]" />
                      Comparação automática: Modelo original × Arquivo gerado ({editingPayload.comparisonReport.originalFormat})
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 tabular-nums">
                    <div>
                      <span className="text-slate-500 block">Pré-preenchidos preservados</span>
                      <strong className="text-sm text-[#0B1E3B]">{editingPayload.comparisonReport.preservedPrefilledCount}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Fórmulas preservadas</span>
                      <strong className="text-sm text-[#0B1E3B]">{editingPayload.comparisonReport.preservedFormulasCount}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Mesclagens preservadas</span>
                      <strong className="text-sm text-[#0B1E3B]">{editingPayload.comparisonReport.preservedMergesCount}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Campos preenchidos</span>
                      <strong className="text-sm text-[#0B1E3B]">{editingPayload.comparisonReport.filledFieldsCount}</strong>
                    </div>
                  </div>
                  <p className="text-slate-600">{editingPayload.comparisonReport.visualInspectionNote}</p>
                </div>
              )}

              {/* Action Footer: Save Minuta vs Register Team Review */}
              {!isDemo && selectedDoc.status !== 'existente' && (
                <div className="border-t border-slate-200 pt-4 flex flex-wrap items-center justify-end gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleSaveReview(false)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-[#0B1E3B] hover:border-[#2B7DE9] cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    Salvar minuta
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleSaveReview(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2B7DE9] text-white text-sm font-semibold hover:bg-[#1D6AD4] cursor-pointer"
                  >
                    <FileCheck2 className="w-4 h-4" />
                    Registrar como revisada pela equipe
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
