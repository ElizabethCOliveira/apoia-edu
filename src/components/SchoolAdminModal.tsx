import React, { useEffect, useState } from 'react';
import {
  ArrowRightLeft,
  CheckCircle2,
  Copy,
  Download,
  Link2,
  Search,
  Send,
  ShieldAlert,
  UserPlus,
  UserX,
  X,
  XCircle,
} from 'lucide-react';
import { apiJson } from '../api';
import type { Student, StudentTransferRecord, WorkspaceSummary } from '../types';

interface SchoolAdminModalProps {
  workspace: WorkspaceSummary;
  students: Student[];
  isDemo?: boolean;
  initialTab?: 'equipe' | 'transferencias';
  onClose: () => void;
  onUpdatedWorkspace: (workspaces: WorkspaceSummary[]) => void;
  onChanged?: () => void;
}

const TRANSFER_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pendente: { label: 'Aguardando aprovação da nova escola', color: 'text-amber-700' },
  aprovada: { label: 'Inclusão aprovada', color: 'text-emerald-700' },
  recusada: { label: 'Inclusão recusada', color: 'text-red-700' },
  cancelada: { label: 'Repasse cancelado', color: 'text-slate-500' },
};

function formatDatePtBr(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR');
}

export const SchoolAdminModal: React.FC<SchoolAdminModalProps> = ({
  workspace,
  students,
  isDemo = false,
  initialTab = 'equipe',
  onClose,
  onUpdatedWorkspace,
  onChanged,
}) => {
  const isSchoolAdmin = workspace.type === 'school' && workspace.role === 'admin';
  const [modalTab, setModalTab] = useState<'equipe' | 'transferencias'>(
    isSchoolAdmin ? initialTab : 'equipe'
  );

  // Team & links state
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'teacher' | 'admin'>('teacher');
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [roleLabel, setRoleLabel] = useState('Professor(a) regente');
  const [lastToken, setLastToken] = useState('');
  const [lastStatusNote, setLastStatusNote] = useState('');

  // Inter-school student transfers & approval state
  const [outgoingTransfers, setOutgoingTransfers] = useState<StudentTransferRecord[]>([]);
  const [incomingTransfers, setIncomingTransfers] = useState<StudentTransferRecord[]>([]);
  const [transferStudentId, setTransferStudentId] = useState(students[0]?.id || '');
  const [targetSchoolName, setTargetSchoolName] = useState('');
  const [targetSchoolEmail, setTargetSchoolEmail] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [lastCreatedTransfer, setLastCreatedTransfer] = useState<StudentTransferRecord | null>(null);
  const [copiedCode, setCopiedCode] = useState('');

  // Lookup & Approval fields per incoming transfer
  const [lookupCode, setLookupCode] = useState('');
  const [claimedByCodeMap, setClaimedByCodeMap] = useState<Record<string, string>>({});
  const [approvalChecked, setApprovalChecked] = useState<Record<string, boolean>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [transferNotice, setTransferNotice] = useState('');
  const [transferBusy, setTransferBusy] = useState(false);

  const [error, setError] = useState('');

  const apiBase = isDemo ? '/api/demo/workspace' : `/api/workspaces/${workspace.id}`;

  useEffect(() => {
    if (students.length > 0) {
      if (!selectedStudentId || !students.some((s) => s.id === selectedStudentId)) {
        setSelectedStudentId(students[0].id);
      }
      if (!transferStudentId || !students.some((s) => s.id === transferStudentId)) {
        setTransferStudentId(students[0].id);
      }
    }
  }, [students]);

  const loadData = async () => {
    try {
      const res = await apiJson<{ members: any[]; invitations: any[]; links: any[] }>(`${apiBase}/members`);
      setMembers(res.members);
      setInvitations(res.invitations);
      setLinks(res.links);
      const activeTeachers = res.members.filter((m) => m.status === 'active');
      if (activeTeachers.length > 0 && !activeTeachers.some((m) => m.user_id === selectedTeacherId)) {
        const preferred = activeTeachers.find((m) => m.role === 'teacher') || activeTeachers[0];
        setSelectedTeacherId(preferred.user_id);
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar equipe escolar.');
    }
  };

  const loadTransfers = async () => {
    if (!isSchoolAdmin) return;
    try {
      const res = await apiJson<{
        outgoing: StudentTransferRecord[];
        incoming: StudentTransferRecord[];
      }>(`${apiBase}/student-transfers`);
      setOutgoingTransfers(res.outgoing || []);
      setIncomingTransfers((prev) => {
        const fromServer = res.incoming || [];
        const serverIds = new Set(fromServer.map((t) => t.id));
        const extraLookedUp = prev.filter((t) => !serverIds.has(t.id) && t.status === 'pendente' && claimedByCodeMap[t.id]);
        return [...extraLookedUp, ...fromServer];
      });
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar transferências entre escolas.');
    }
  };

  useEffect(() => {
    if (workspace.role === 'admin') {
      loadData();
      if (workspace.type === 'school') {
        loadTransfers();
      }
    }
  }, [workspace.id, isDemo]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLastStatusNote('');
    try {
      const res = await apiJson<{
        token: string;
        email: string;
        directActivated?: boolean;
        teacherName?: string;
        userId?: string;
      }>(`${apiBase}/invite`, {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail, name: inviteName, role: inviteRole }),
      });
      setLastToken(res.token);
      setLastStatusNote(
        res.directActivated
          ? `Acesso liberado imediatamente para ${res.teacherName || res.email} (${res.email}).${
              isDemo ? ' Você já pode vinculá-lo(a) a um estudante ao lado e testar no Perfil Professor.' : ''
            }`
          : `E-mail ${res.email} autorizado. Assim que o(a) profissional criar conta ou entrar com este e-mail (ou usar o código ${res.token}), o acesso à escola será liberado.`
      );
      if (res.userId) {
        setSelectedTeacherId(res.userId);
      }
      setInviteName('');
      setInviteEmail('');
      await loadData();
      onChanged?.();
    } catch (err: any) {
      setError(err?.message || 'Erro ao liberar acesso por e-mail.');
    }
  };

  const handleLinkStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await apiJson(`${apiBase}/student-links`, {
        method: 'POST',
        body: JSON.stringify({
          studentId: selectedStudentId,
          teacherUserId: selectedTeacherId,
          roleLabel,
        }),
      });
      await loadData();
      onChanged?.();
    } catch (err: any) {
      setError(err?.message || 'Erro ao vincular professor ao estudante.');
    }
  };

  const handleRevokeLink = async (linkId: string) => {
    await apiJson(`${apiBase}/student-links/${linkId}/revoke`, { method: 'POST' });
    await loadData();
    onChanged?.();
  };

  const handleRevokeMember = async (userId: string) => {
    await apiJson(`${apiBase}/members/${userId}/revoke`, { method: 'POST' });
    await loadData();
    onChanged?.();
  };

  const handleToggleAi = async () => {
    if (isDemo) {
      const res = await apiJson<{ workspace: WorkspaceSummary }>(`${apiBase}/settings`, {
        method: 'PATCH',
        body: JSON.stringify({ aiExternalEnabled: !workspace.aiExternalEnabled }),
      });
      onUpdatedWorkspace([res.workspace]);
      onChanged?.();
      return;
    }
    const res = await apiJson<{ workspaces: WorkspaceSummary[] }>(`${apiBase}/settings`, {
      method: 'PATCH',
      body: JSON.stringify({ aiExternalEnabled: !workspace.aiExternalEnabled }),
    });
    onUpdatedWorkspace(res.workspaces);
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setTransferNotice('');
    setTransferBusy(true);
    try {
      const res = await apiJson<{ transfer: StudentTransferRecord }>(`${apiBase}/student-transfers`, {
        method: 'POST',
        body: JSON.stringify({
          studentId: transferStudentId,
          targetSchoolName,
          targetSchoolEmail,
          transferNote,
        }),
      });
      setLastCreatedTransfer(res.transfer);
      setTargetSchoolName('');
      setTargetSchoolEmail('');
      setTransferNote('');
      setTransferNotice(
        `Repasse criado para ${res.transfer.targetSchoolName}. O acesso ao prontuário de ${res.transfer.studentDisplayName} será liberado assim que a nova escola aprovar a inclusão.`
      );
      await loadTransfers();
      onChanged?.();
    } catch (err: any) {
      setError(err?.message || 'Erro ao enviar repasse do estudante para a nova escola.');
    } finally {
      setTransferBusy(false);
    }
  };

  const handleLookupCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setTransferNotice('');
    if (!lookupCode.trim()) return;
    setTransferBusy(true);
    try {
      const res = await apiJson<{ transfer: StudentTransferRecord }>(`${apiBase}/student-transfers/lookup`, {
        method: 'POST',
        body: JSON.stringify({ transferCode: lookupCode.trim() }),
      });
      setClaimedByCodeMap((prev) => ({ ...prev, [res.transfer.id]: lookupCode.trim().toUpperCase() }));
      setIncomingTransfers((prev) =>
        prev.some((t) => t.id === res.transfer.id) ? prev : [res.transfer, ...prev]
      );
      setLookupCode('');
      setTransferNotice(
        `Repasse localizado: ${res.transfer.studentDisplayName} (enviado por ${res.transfer.fromSchoolName}). Revise os dados abaixo e aprove ou recuse a inclusão.`
      );
    } catch (err: any) {
      setError(err?.message || 'Código de transferência não encontrado.');
    } finally {
      setTransferBusy(false);
    }
  };

  const handleApproveTransfer = async (transfer: StudentTransferRecord) => {
    setError('');
    setTransferNotice('');
    if (!approvalChecked[transfer.id]) {
      setError('Marque a caixa de confirmação institucional da escola para aprovar a inclusão do(a) estudante.');
      return;
    }
    setTransferBusy(true);
    try {
      await apiJson(`${apiBase}/student-transfers/${transfer.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({
          approvedConfirmation: true,
          reviewNote: reviewNotes[transfer.id] || '',
          transferCode: claimedByCodeMap[transfer.id] || transfer.transferCode,
        }),
      });
      setTransferNotice(
        `Inclusão aprovada! ${transfer.studentDisplayName} agora faz parte da lista de estudantes de ${workspace.name} com seu prontuário pedagógico preservado.`
      );
      await loadTransfers();
      onChanged?.();
    } catch (err: any) {
      setError(err?.message || 'Erro ao aprovar inclusão do estudante.');
    } finally {
      setTransferBusy(false);
    }
  };

  const handleRejectTransfer = async (transfer: StudentTransferRecord) => {
    setError('');
    setTransferNotice('');
    setTransferBusy(true);
    try {
      await apiJson(`${apiBase}/student-transfers/${transfer.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({
          reviewNote: reviewNotes[transfer.id] || '',
          transferCode: claimedByCodeMap[transfer.id] || transfer.transferCode,
        }),
      });
      setTransferNotice(`Solicitação de inclusão de ${transfer.studentDisplayName} recusada pela escola.`);
      await loadTransfers();
      onChanged?.();
    } catch (err: any) {
      setError(err?.message || 'Erro ao recusar inclusão.');
    } finally {
      setTransferBusy(false);
    }
  };

  const handleCancelTransfer = async (transferId: string) => {
    setError('');
    setTransferNotice('');
    setTransferBusy(true);
    try {
      await apiJson(`${apiBase}/student-transfers/${transferId}/cancel`, { method: 'POST' });
      setTransferNotice('Repasse pendente cancelado pela escola de origem.');
      await loadTransfers();
      onChanged?.();
    } catch (err: any) {
      setError(err?.message || 'Erro ao cancelar repasse.');
    } finally {
      setTransferBusy(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(''), 2000);
    } catch {
      setCopiedCode('');
    }
  };

  const pendingIncoming = incomingTransfers.filter((t) => t.status === 'pendente');
  const historyTransfers = [
    ...outgoingTransfers.map((t) => ({ ...t, direction: 'enviada' as const })),
    ...incomingTransfers.filter((t) => t.status !== 'pendente').map((t) => ({ ...t, direction: 'recebida' as const })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="fixed inset-0 z-50 bg-[#071429]/60 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0B1E3B]">
              Gestão institucional · {workspace.name}
            </h2>
            <p className="text-xs text-slate-600">
              Gerencie equipe escolar, vínculos com estudantes, transferência para novas escolas e aprovação de inclusão de alunos.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clean Section Switcher for School Admins */}
        {isSchoolAdmin && (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
            <button
              type="button"
              onClick={() => {
                setModalTab('equipe');
                setError('');
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                modalTab === 'equipe'
                  ? 'bg-[#0B1E3B] text-white'
                  : 'bg-[#F6F8FB] text-slate-700 border border-slate-200 hover:border-[#2B7DE9]'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Equipe, professores e modelos
            </button>
            <button
              type="button"
              onClick={() => {
                setModalTab('transferencias');
                setError('');
                loadTransfers();
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                modalTab === 'transferencias'
                  ? 'bg-[#0B1E3B] text-white'
                  : 'bg-[#F6F8FB] text-slate-700 border border-slate-200 hover:border-[#2B7DE9]'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-[#FACC15]" />
              Transferência e aprovação de alunos
              {pendingIncoming.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded bg-[#FACC15] text-[#0B1E3B] text-[11px] font-bold tabular-nums">
                  {pendingIncoming.length}
                </span>
              )}
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg border border-red-300 bg-red-50 text-sm text-red-900">{error}</div>
        )}
        {transferNotice && modalTab === 'transferencias' && (
          <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50 text-sm text-emerald-950">
            {transferNotice}
          </div>
        )}

        {modalTab === 'transferencias' && isSchoolAdmin ? (
          <div className="space-y-6">
            {/* 1. Aprovação de inclusão de alunos recebidos pela escola */}
            <section className="border border-[#2B7DE9]/40 bg-[#F6F8FB] rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-sm font-bold text-[#0B1E3B] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Aprovação de inclusão de alunos recebidos
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Quando outra escola repassa um estudante, o prontuário só entra nesta escola após a confirmação e aprovação institucional abaixo.
                  </p>
                </div>
                <form onSubmit={handleLookupCode} className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={lookupCode}
                      onChange={(e) => setLookupCode(e.target.value)}
                      placeholder={isDemo ? 'Código (ex.: TRF-DEMO2026)' : 'Código TRF-...'}
                      className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono uppercase w-48"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={transferBusy || !lookupCode.trim()}
                    className="px-3 py-1.5 rounded-lg bg-[#0B1E3B] text-white text-xs font-semibold hover:bg-[#132D54] cursor-pointer disabled:opacity-50"
                  >
                    Buscar código
                  </button>
                </form>
              </div>

              {pendingIncoming.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-lg p-4 text-xs text-slate-600">
                  Nenhuma solicitação pendente aguardando aprovação desta escola no momento. Se recebeu um código de transferência de outra escola, informe-o no campo acima para localizar e aprovar a inclusão.
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingIncoming.map((trf) => {
                    const isChecked = !!approvalChecked[trf.id];
                    return (
                      <div key={trf.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 pb-3">
                          <div>
                            <p className="font-display text-sm font-bold text-[#0B1E3B]">
                              {trf.studentDisplayName}
                            </p>
                            <p className="text-xs text-slate-600 mt-0.5">
                              Escola de origem: <strong>{trf.fromSchoolName}</strong> · Enviado por {trf.initiatedByName} em{' '}
                              <span className="tabular-nums">{formatDatePtBr(trf.createdAt)}</span>
                            </p>
                          </div>
                          <div className="text-right text-xs">
                            <span className="font-mono font-semibold text-[#0B1E3B] bg-[#F6F8FB] border border-slate-200 px-2 py-1 rounded">
                              {trf.transferCode}
                            </span>
                            <p className="text-slate-500 mt-1 tabular-nums">
                              {trf.documentsCount} doc(s) · {trf.activitiesCount} atividade(s)
                            </p>
                          </div>
                        </div>

                        {trf.transferNote && (
                          <p className="text-xs text-slate-700 bg-[#F6F8FB] border border-slate-200 rounded-lg p-3">
                            <strong>Observação da escola de origem:</strong> {trf.transferNote}
                          </p>
                        )}

                        {/* Campo da escola para aprovar a inclusão do aluno */}
                        <div className="space-y-2.5 pt-1">
                          <div>
                            <label
                              htmlFor={`review-note-${trf.id}`}
                              className="block text-xs font-semibold text-[#0B1E3B] mb-1"
                            >
                              Parecer / observação da escola para aprovação da inclusão
                            </label>
                            <input
                              id={`review-note-${trf.id}`}
                              type="text"
                              value={reviewNotes[trf.id] || ''}
                              onChange={(e) =>
                                setReviewNotes((prev) => ({ ...prev, [trf.id]: e.target.value }))
                              }
                              placeholder="Ex.: Matrícula confirmada na turma 4º Ano B; encaminhado à equipe do AEE"
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                            />
                          </div>

                          <label className="flex items-start gap-2.5 p-3 rounded-lg border border-emerald-200 bg-emerald-50/70 cursor-pointer text-xs text-[#0B1E3B]">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) =>
                                setApprovalChecked((prev) => ({ ...prev, [trf.id]: e.target.checked }))
                              }
                              className="mt-0.5"
                            />
                            <span>
                              <strong>Aprovação institucional da escola:</strong> confirmo que o(a) estudante está
                              matriculado(a) em <strong>{workspace.name}</strong> e aprovo a inclusão do acesso ao seu
                              prontuário inclusivo conforme a LGPD.
                            </span>
                          </label>

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                              type="button"
                              disabled={transferBusy || !isChecked}
                              onClick={() => handleApproveTransfer(trf)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 cursor-pointer disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Aprovar inclusão do aluno
                            </button>
                            <button
                              type="button"
                              disabled={transferBusy}
                              onClick={() => handleRejectTransfer(trf)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-red-300 text-red-700 text-xs font-semibold hover:bg-red-50 cursor-pointer disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Recusar inclusão
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 2. Passar acesso de estudante para uma nova escola */}
            <form onSubmit={handleCreateTransfer} className="border border-slate-200 rounded-xl p-5 space-y-4">
              <div>
                <h3 className="font-display text-sm font-bold text-[#0B1E3B] flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#2B7DE9]" />
                  Passar acesso de estudante para uma nova escola
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Transfira o acesso ao perfil, PAEE, PEI, atividades e histórico de desenvolvimento quando o(a) estudante mudar de escola. O repasse só é efetivado após a aprovação da nova escola.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label htmlFor="trf-student" className="block text-xs font-semibold text-slate-700 mb-1">
                    Estudante a transferir
                  </label>
                  <select
                    id="trf-student"
                    required
                    value={transferStudentId}
                    onChange={(e) => setTransferStudentId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                  >
                    <option value="">Selecione um estudante...</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.displayName} {s.gradeLevel ? `· ${s.gradeLevel}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="trf-school-name" className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome da nova escola
                  </label>
                  <input
                    id="trf-school-name"
                    type="text"
                    required
                    value={targetSchoolName}
                    onChange={(e) => setTargetSchoolName(e.target.value)}
                    placeholder="Ex.: E.M.E.F. Monteiro Lobato"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="trf-school-email" className="block text-xs font-semibold text-slate-700 mb-1">
                    E-mail institucional da nova escola
                  </label>
                  <input
                    id="trf-school-email"
                    type="email"
                    required
                    value={targetSchoolEmail}
                    onChange={(e) => setTargetSchoolEmail(e.target.value)}
                    placeholder="coordenacao@novaescola.edu.br"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="trf-note" className="block text-xs font-semibold text-slate-700 mb-1">
                    Observação / justificativa pedagógica (opcional)
                  </label>
                  <textarea
                    id="trf-note"
                    rows={2}
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    placeholder="Ex.: Transferência de matrícula no 2º semestre; encaminhamos PAEE, PEI e atividades adaptadas para continuidade."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  Ao aprovar, vínculos com professores da escola anterior são encerrados automaticamente (LGPD).
                </p>
                <button
                  type="submit"
                  disabled={transferBusy || !transferStudentId}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2B7DE9] text-white text-xs font-semibold hover:bg-[#1D6AD4] cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  Enviar repasse para nova escola
                </button>
              </div>

              {lastCreatedTransfer && (
                <div className="p-3.5 rounded-lg bg-[#E6F0FD] border border-[#2B7DE9] text-xs text-[#0B1E3B] flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="font-semibold">
                      Repasse enviado para {lastCreatedTransfer.targetSchoolName} ({lastCreatedTransfer.targetSchoolEmail})
                    </p>
                    <p>
                      Compartilhe o código seguro com a gestão da nova escola caso ela queira localizar e aprovar diretamente:{' '}
                      <strong className="font-mono">{lastCreatedTransfer.transferCode}</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(lastCreatedTransfer.transferCode)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-[#2B7DE9] text-[#0B1E3B] font-semibold cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedCode === lastCreatedTransfer.transferCode ? 'Copiado!' : 'Copiar código'}
                  </button>
                </div>
              )}
            </form>

            {/* 3. Histórico de transferências enviadas e recebidas */}
            <section className="border border-slate-200 rounded-xl p-5 space-y-3">
              <h3 className="font-display text-sm font-bold text-[#0B1E3B]">
                Histórico de transferências entre escolas
              </h3>
              {historyTransfers.length === 0 ? (
                <p className="text-xs text-slate-500">Nenhuma transferência registrada ainda.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F6F8FB] border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="py-2 px-3 font-semibold">Estudante</th>
                        <th className="py-2 px-3 font-semibold">Direção / Escola</th>
                        <th className="py-2 px-3 font-semibold">Código</th>
                        <th className="py-2 px-3 font-semibold">Situação</th>
                        <th className="py-2 px-3 font-semibold text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {historyTransfers.map((trf) => {
                        const st = TRANSFER_STATUS_LABELS[trf.status] || {
                          label: trf.status,
                          color: 'text-slate-700',
                        };
                        return (
                          <tr key={trf.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-semibold text-[#0B1E3B]">
                              {trf.studentDisplayName}
                              <span className="block text-slate-500 font-normal tabular-nums">
                                {formatDatePtBr(trf.createdAt)}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">
                              <span className="font-semibold">
                                {trf.direction === 'enviada' ? 'Enviada para:' : 'Recebida de:'}
                              </span>{' '}
                              {trf.direction === 'enviada' ? trf.targetSchoolName : trf.fromSchoolName}
                              {trf.reviewNote && (
                                <span className="block text-slate-500 mt-0.5">Parecer: {trf.reviewNote}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-700">{trf.transferCode}</td>
                            <td className={`py-2.5 px-3 font-semibold ${st.color}`}>{st.label}</td>
                            <td className="py-2.5 px-3 text-right">
                              {trf.direction === 'enviada' && trf.status === 'pendente' ? (
                                <button
                                  type="button"
                                  disabled={transferBusy}
                                  onClick={() => handleCancelTransfer(trf.id)}
                                  className="text-red-700 font-semibold hover:underline cursor-pointer"
                                >
                                  Cancelar repasse
                                </button>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        ) : (
          <>
            {/* Governance Setting */}
            {workspace.role === 'admin' && (
              <div className="p-4 rounded-lg border border-slate-200 bg-[#F6F8FB] flex flex-wrap items-center justify-between gap-4">
                <div className="max-w-xl">
                  <p className="text-sm font-bold text-[#0B1E3B] flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-[#2B7DE9]" />
                    Envio de trechos escolares anônimos à IA externa
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    Desabilitado por padrão. Ao habilitar, apenas os trechos pedagógicos necessários (sem nome completo quando evitável) são enviados ao modelo no servidor.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleAi}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                    workspace.aiExternalEnabled ? 'bg-emerald-700 text-white' : 'bg-[#0B1E3B] text-white'
                  }`}
                >
                  {workspace.aiExternalEnabled
                    ? 'IA institucional habilitada (clique para desabilitar)'
                    : 'Habilitar envio à IA institucional'}
                </button>
              </div>
            )}

            {/* Invite & Link Teachers */}
            {isSchoolAdmin && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form onSubmit={handleInvite} className="border border-slate-200 rounded-lg p-4 space-y-3">
                  <h3 className="font-display text-sm font-bold text-[#0B1E3B] flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-[#2B7DE9]" />
                    Adicionar professor(a) e liberar acesso por e-mail
                  </h3>
                  <p className="text-xs text-slate-600">
                    Informe o e-mail do(a) professor(a) para liberar o acesso à plataforma pela escola.
                  </p>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Nome do(a) professor(a) (opcional)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="professor@escola.edu.br"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                  <div className="flex gap-2">
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as any)}
                      className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                    >
                      <option value="teacher">Professor(a)</option>
                      <option value="admin">Coordenação / Admin</option>
                    </select>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-[#2B7DE9] text-white text-sm font-semibold cursor-pointer"
                    >
                      Liberar acesso por e-mail
                    </button>
                  </div>
                  {lastStatusNote && (
                    <div className="p-2.5 rounded bg-[#E6F0FD] border border-[#2B7DE9] text-xs text-[#0B1E3B] space-y-1">
                      <p>{lastStatusNote}</p>
                      {lastToken && (
                        <p>
                          Código de referência: <strong className="font-mono">{lastToken}</strong>
                        </p>
                      )}
                    </div>
                  )}
                  {invitations.length > 0 && (
                    <ul className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-200">
                      {invitations.slice(0, 5).map((inv) => (
                        <li key={inv.id}>
                          {inv.email} · <span className="font-mono">{inv.token}</span> ·{' '}
                          {inv.status === 'accepted'
                            ? 'Liberado'
                            : inv.status === 'revoked'
                            ? 'Revogado'
                            : 'Aguardando cadastro'}
                        </li>
                      ))}
                    </ul>
                  )}
                </form>

                <form onSubmit={handleLinkStudent} className="border border-slate-200 rounded-lg p-4 space-y-3">
                  <h3 className="font-display text-sm font-bold text-[#0B1E3B] flex items-center gap-1.5">
                    <Link2 className="w-4 h-4 text-[#2B7DE9]" />
                    Vincular professor(a) a um estudante
                  </h3>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                  >
                    <option value="">Selecione um estudante...</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.displayName}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                  >
                    <option value="">Selecione um profissional ativo...</option>
                    {members
                      .filter((m) => m.status === 'active')
                      .map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.name} ({m.email})
                        </option>
                      ))}
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={roleLabel}
                      onChange={(e) => setRoleLabel(e.target.value)}
                      placeholder="Ex.: Professor(a) de Matemática"
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={!selectedStudentId || !selectedTeacherId}
                      className="px-4 py-2 rounded-lg bg-[#0B1E3B] text-white text-sm font-semibold cursor-pointer disabled:opacity-50"
                    >
                      Vincular
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Active Links & Members */}
            {isSchoolAdmin && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
                <div className="border border-slate-200 rounded-lg p-4">
                  <h4 className="font-bold text-[#0B1E3B] mb-2">Equipe da escola</h4>
                  <ul className="divide-y divide-slate-200">
                    {members.map((m) => (
                      <li key={m.id} className="py-2 flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-[#0B1E3B]">{m.name}</p>
                          <p className="text-slate-500">
                            {m.email} · {m.role} · {m.status === 'active' ? 'Ativo' : 'Vínculo encerrado'}
                          </p>
                        </div>
                        {m.status === 'active' && m.user_id !== workspace.ownerUserId && (
                          <button
                            type="button"
                            onClick={() => handleRevokeMember(m.user_id)}
                            className="inline-flex items-center gap-1 text-red-700 font-semibold hover:underline cursor-pointer"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            Encerrar acesso
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border border-slate-200 rounded-lg p-4">
                  <h4 className="font-bold text-[#0B1E3B] mb-2">Vínculos estudante × professor</h4>
                  {links.length === 0 ? (
                    <p className="text-slate-500">Nenhum vínculo específico cadastrado.</p>
                  ) : (
                    <ul className="divide-y divide-slate-200">
                      {links.map((lk) => (
                        <li key={lk.id} className="py-2 flex items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-[#0B1E3B]">
                              {lk.student_name} ↔ {lk.teacher_name}
                            </p>
                            <p className="text-slate-500">
                              {lk.role_label} · {lk.status === 'active' ? 'Ativo' : 'Encerrado'}
                            </p>
                          </div>
                          {lk.status === 'active' && (
                            <button
                              type="button"
                              onClick={() => handleRevokeLink(lk.id)}
                              className="text-red-700 font-semibold hover:underline cursor-pointer"
                            >
                              Desvincular
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* Downloadable Reference Blank Templates */}
            <div className="border-t border-slate-200 pt-4">
              <h4 className="font-display text-sm font-bold text-[#0B1E3B] mb-2">
                Modelos institucionais de referência (para testes e conferência de preservação)
              </h4>
              <div className="flex flex-wrap gap-2.5 text-xs">
                {[
                  ['estudo_de_caso.docx', 'ANEXO II – Estudo de Caso (.docx)'],
                  ['forms_exemplo.docx', 'Resposta Forms exemplo (.docx)'],
                  ['paee.docx', 'PAEE modelo em branco (.docx)'],
                  ['pei.xlsx', 'PEI planilha com fórmula e mesclagem (.xlsx)'],
                  ['curriculo_paulista.docx', 'Currículo Paulista Matemática 4º Ano (.docx)'],
                ].map(([file, label]) => (
                  <a
                    key={file}
                    href={`/api/templates/sample/${file}`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-[#0B1E3B] font-semibold hover:border-[#2B7DE9]"
                  >
                    <Download className="w-3.5 h-3.5 text-[#2B7DE9]" />
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
