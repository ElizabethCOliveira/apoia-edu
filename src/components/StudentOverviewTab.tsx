import React from 'react';
import {
  AlertTriangle,
  ClipboardCheck,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  FolderPlus,
  Sparkles,
} from 'lucide-react';
import type {
  ApplicationFeedback,
  PedagogicalActivity,
  PedagogicalDocument,
  SourceRecord,
  Student,
  UpdateAlert,
} from '../types';

interface StudentOverviewTabProps {
  student: Student;
  sources: SourceRecord[];
  documents: PedagogicalDocument[];
  activities: PedagogicalActivity[];
  applications: ApplicationFeedback[];
  alerts: UpdateAlert[];
  isDemo: boolean;
  onNavigateTab: (tab: 'perfil' | 'documentos' | 'atividades' | 'desenvolvimento') => void;
  onQuickAction: (action: 'add_existing' | 'elaborar_paee' | 'elaborar_pei' | 'gerar_atividade_pei' | 'registrar_feedback') => void;
  onResolveAlert: (alertId: string, action: 'aceitar' | 'descartar') => void;
}

export const StudentOverviewTab: React.FC<StudentOverviewTabProps> = ({
  student,
  sources,
  documents,
  activities,
  applications,
  alerts,
  isDemo,
  onNavigateTab,
  onQuickAction,
  onResolveAlert,
}) => {
  const estudoDeCaso = documents.find((d) => d.docType === 'estudo_de_caso');
  const paee = documents.find((d) => d.docType === 'paee');
  const peis = documents.filter((d) => d.docType === 'pei');

  return (
    <div className="space-y-6">
      {/* Pending Source Update Alerts */}
      {alerts.length > 0 && (
        <div className="bg-[#FEF3C7] border border-[#F59E0B] rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#92400E] shrink-0 mt-0.5" />
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-display font-bold text-[#0B1E3B] text-base">
                  Fontes atualizadas detectadas — revisão recomendada
                </h3>
                <p className="text-sm text-[#78350F]">
                  Os documentos existentes não foram sobrescritos. Revise as alterações propostas antes de incorporar:
                </p>
              </div>
              {alerts.map((al) => (
                <div key={al.id} className="bg-white border border-amber-300 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-semibold text-[#0B1E3B]">{al.summary}</p>
                  {al.proposedChanges.map((ch, idx) => (
                    <div key={idx} className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200">
                      <p className="font-semibold">{ch.label}</p>
                      <p className="mt-1 text-slate-600">Trecho atualizado: {ch.proposedValue}</p>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onNavigateTab('documentos')}
                      className="px-3 py-1.5 rounded-lg bg-[#0B1E3B] text-white text-xs font-semibold hover:bg-[#132D54] cursor-pointer"
                    >
                      Revisar informações relacionadas
                    </button>
                    <button
                      type="button"
                      onClick={() => onResolveAlert(al.id, 'aceitar')}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                    >
                      Marcar como revisado
                    </button>
                    <button
                      type="button"
                      onClick={() => onResolveAlert(al.id, 'descartar')}
                      className="px-3 py-1.5 rounded-lg text-slate-600 text-xs font-medium hover:text-slate-900 cursor-pointer"
                    >
                      Descartar aviso
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Direct Actions Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0B1E3B]">Ações diretas para {student.displayName}</h2>
            <p className="text-sm text-slate-600">
              Inicie pelo documento ou atividade que a escola precisa hoje — sem etapas obrigatórias bloqueantes.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onQuickAction('add_existing')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-[#0B1E3B] text-sm font-semibold hover:border-[#2B7DE9] cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-[#2B7DE9]" />
            Adicionar documento existente
          </button>
          <button
            type="button"
            onClick={() => onQuickAction('elaborar_paee')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-[#0B1E3B] text-sm font-semibold hover:border-[#2B7DE9] cursor-pointer"
          >
            <FileText className="w-4 h-4 text-[#2B7DE9]" />
            Elaborar PAEE
          </button>
          <button
            type="button"
            onClick={() => onQuickAction('elaborar_pei')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-[#0B1E3B] text-sm font-semibold hover:border-[#2B7DE9] cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#2B7DE9]" />
            Criar PEI deste bimestre
          </button>
          <button
            type="button"
            onClick={() => onQuickAction('gerar_atividade_pei')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2B7DE9] text-white text-sm font-semibold hover:bg-[#1D6AD4] cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Gerar atividade a partir deste objetivo
          </button>
          <button
            type="button"
            onClick={() => onQuickAction('registrar_feedback')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0B1E3B] text-white text-sm font-semibold hover:bg-[#132D54] cursor-pointer"
          >
            <ClipboardCheck className="w-4 h-4 text-[#FACC15]" />
            Registrar como foi
          </button>
        </div>
      </div>

      {/* What is already available */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Estudo de Caso</p>
          <p className="font-display text-base font-bold text-[#0B1E3B] mt-1">
            {estudoDeCaso ? `Disponível (v${estudoDeCaso.versionNumber})` : 'Ainda não cadastrado'}
          </p>
          <p className="text-xs text-slate-600 mt-1">
            {estudoDeCaso ? `${estudoDeCaso.status.replace(/_/g, ' ')} · ${estudoDeCaso.authorName}` : 'Opcional para começar'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">PAEE</p>
          <p className="font-display text-base font-bold text-[#0B1E3B] mt-1">
            {paee ? `Disponível (v${paee.versionNumber})` : 'Ainda não cadastrado'}
          </p>
          <p className="text-xs text-slate-600 mt-1">
            {paee?.content.paeeSupports?.length
              ? `${paee.content.paeeSupports.length} apoio(s) registrado(s)`
              : paee
              ? paee.title
              : 'Você pode anexar um existente ou elaborar'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">PEI Bimestral</p>
          <p className="font-display text-base font-bold text-[#0B1E3B] mt-1 tabular-nums">
            {peis.length > 0 ? `${peis.length} documento(s)` : 'Nenhum PEI ainda'}
          </p>
          <p className="text-xs text-slate-600 mt-1">
            {peis[0] ? `${peis[0].subject || 'Geral'} · ${peis[0].bimester || 'Bimestre'}` : 'Atividades também funcionam sem PEI'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Atividades e Aplicações</p>
          <p className="font-display text-base font-bold text-[#0B1E3B] mt-1 tabular-nums">
            {activities.length} proposta(s) · {applications.length} registro(s)
          </p>
          <p className="text-xs text-slate-600 mt-1">
            {sources.length} fonte(s) anexada(s) ao prontuário
          </p>
        </div>
      </div>

      {/* Pedagogical Snapshot & Recent Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-[#0B1E3B]">Síntese do perfil pedagógico</h3>
            <button
              type="button"
              onClick={() => onNavigateTab('perfil')}
              className="text-xs font-semibold text-[#2B7DE9] hover:underline cursor-pointer"
            >
              Editar perfil
            </button>
          </div>
          <dl className="space-y-2.5 text-sm">
            <div>
              <dt className="text-xs font-semibold text-slate-500">Potencialidades e interesses</dt>
              <dd className="text-slate-800 mt-0.5">
                {[student.strengths, student.interests].filter(Boolean).join(' · ') || 'Ainda não registrado (cadastro parcial aceito).'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500">Comunicação e resposta</dt>
              <dd className="text-slate-800 mt-0.5">{student.communicationModes || 'Ainda não registrado.'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500">Barreiras e estratégias que funcionam</dt>
              <dd className="text-slate-800 mt-0.5">
                {[student.barriers, student.workingStrategies].filter(Boolean).join(' · ') || 'Ainda não registrado.'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-[#0B1E3B]">Últimos registros de aplicação</h3>
            <button
              type="button"
              onClick={() => onNavigateTab('desenvolvimento')}
              className="text-xs font-semibold text-[#2B7DE9] hover:underline cursor-pointer"
            >
              Ver linha do tempo
            </button>
          </div>
          {applications.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">
              <FilePlus2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p>Nenhuma aplicação registrada ainda.</p>
              <p className="text-xs mt-1">Aplique uma atividade ou plano e clique em “Registrar como foi”.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {applications.slice(0, 3).map((ap) => (
                <li key={ap.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span className="font-mono tabular-nums">{ap.appliedDate}</span>
                    <span>
                      {ap.status === 'aplicada' ? ap.supportLevel.replace(/_/g, ' ') : 'Não aplicada'} · {ap.teacherName}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-[#0B1E3B]">{ap.activityTitle || ap.objectiveText}</p>
                  {ap.briefObservation && <p className="text-xs text-slate-600 mt-1">{ap.briefObservation}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
