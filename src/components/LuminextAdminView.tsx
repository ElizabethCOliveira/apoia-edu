import React, { useEffect, useMemo, useState } from 'react';
import {
  Ban,
  CalendarClock,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  Eye,
  KeyRound,
  Lock,
  PauseCircle,
  Search,
  ShieldCheck,
  Unlock,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { apiJson } from '../api';
import type {
  AdminAuditLogRecord,
  LuminextUserRecord,
  UserAccessStatus,
  UserAccountType,
} from '../types';

interface LuminextAdminViewProps {
  currentUserId: string;
}

interface AdminDashboardKpis {
  totalUsers: number;
  schoolManagersCount: number;
  teachersCount: number;
  adminsCount: number;
  activeUsers: number;
  blockedUsers: number;
  suspendedUsers: number;
  pendingUsers: number;
  expiredUsers: number;
  expiringSoonUsers: number;
  newUsersLast30Days: number;
}

type AdminRoleChoice = 'professor' | 'gestor_escolar' | 'outro';

function formatDateTimePtBr(iso?: string | null): string {
  if (!iso) return 'Nunca acessou';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDatePtBr(ymd?: string): string {
  if (!ymd) return '—';
  const parts = ymd.split('-');
  if (parts.length !== 3) return ymd;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export const LuminextAdminView: React.FC<LuminextAdminViewProps> = ({ currentUserId }) => {
  const [users, setUsers] = useState<LuminextUserRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogRecord[]>([]);
  const [kpis, setKpis] = useState<AdminDashboardKpis>({
    totalUsers: 0,
    schoolManagersCount: 0,
    teachersCount: 0,
    adminsCount: 0,
    activeUsers: 0,
    blockedUsers: 0,
    suspendedUsers: 0,
    pendingUsers: 0,
    expiredUsers: 0,
    expiringSoonUsers: 0,
    newUsersLast30Days: 0,
  });

  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Invite / Reset link preview box
  const [invitePreview, setInvitePreview] = useState<{
    title: string;
    email: string;
    token: string;
    link: string;
  } | null>(null);
  const [copiedFlag, setCopiedFlag] = useState(false);

  // "Cadastrar novo usuário" form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formOrg, setFormOrg] = useState('');
  const [formRoleChoice, setFormRoleChoice] = useState<AdminRoleChoice>('professor');
  const [formJobRole, setFormJobRole] = useState('');
  const [formStatus, setFormStatus] = useState<'ativo' | 'bloqueado'>('ativo');
  const [formContractStart, setFormContractStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [formContractEnd, setFormContractEnd] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // View user detail modal (also used for "Consultar último acesso")
  const [viewingUser, setViewingUser] = useState<LuminextUserRecord | null>(null);
  const [viewingLogs, setViewingLogs] = useState<AdminAuditLogRecord[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Edit user modal
  const [editingUser, setEditingUser] = useState<LuminextUserRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editOrg, setEditOrg] = useState('');
  const [editJobRole, setEditJobRole] = useState('');
  const [editAccountType, setEditAccountType] = useState<UserAccountType>('teacher');
  const [editStatus, setEditStatus] = useState<UserAccessStatus>('ativo');
  const [editContractStart, setEditContractStart] = useState('');
  const [editContractEnd, setEditContractEnd] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiJson<{
        kpis: AdminDashboardKpis;
        users: LuminextUserRecord[];
        auditLogs: AdminAuditLogRecord[];
      }>('/api/admin/dashboard');
      setKpis(res.kpis);
      setUsers(res.users);
      setAuditLogs(res.auditLogs);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar dados do painel administrativo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter !== 'all') {
        if (statusFilter === 'ativo') {
          if (u.accessStatus !== 'ativo' && u.accessStatus !== 'liberado') return false;
        } else if (u.accessStatus !== statusFilter) {
          return false;
        }
      }
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.organization.toLowerCase().includes(q) ||
        u.jobRole.toLowerCase().includes(q)
      );
    });
  }, [users, statusFilter, search]);

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFlag(true);
      setTimeout(() => setCopiedFlag(false), 2000);
    } catch {
      // Clipboard may be restricted in iframe
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const res = await apiJson<{
        user: LuminextUserRecord;
        setupToken: string;
        inviteLink: string;
        message: string;
      }>('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          phone: formPhone,
          organization: formOrg,
          roleType: formRoleChoice,
          jobRole: formJobRole,
          status: formStatus,
          contractStartDate: formContractStart,
          contractEndDate: formContractEnd,
          notes: formNotes,
        }),
      });
      setMessage(`Usuário ${res.user.name} cadastrado no banco de dados.`);
      setInvitePreview({
        title: 'Convite seguro para definição de senha inicial',
        email: res.user.email,
        token: res.setupToken,
        link: res.inviteLink,
      });
      setFormName('');
      setFormEmail('');
      setFormPhone('');
      setFormOrg('');
      setFormJobRole('');
      setFormNotes('');
      setShowCreateForm(false);
      await loadDashboard();
    } catch (err: any) {
      setError(err?.message || 'Erro ao cadastrar usuário.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewUser = async (u: LuminextUserRecord) => {
    setViewingUser(u);
    setViewingLogs([]);
    setLoadingDetails(true);
    try {
      const res = await apiJson<{ user: LuminextUserRecord; auditLogs: AdminAuditLogRecord[] }>(
        `/api/admin/users/${u.id}`
      );
      setViewingUser(res.user);
      setViewingLogs(res.auditLogs);
    } catch {
      // keep initial row snapshot
    } finally {
      setLoadingDetails(false);
    }
  };

  const openEditModal = (u: LuminextUserRecord) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditPhone(u.phone);
    setEditOrg(u.organization);
    setEditJobRole(u.jobRole);
    setEditAccountType(u.accountType);
    setEditStatus(u.accessStatus);
    setEditContractStart(u.contractStartDate || '');
    setEditContractEnd(u.contractEndDate || '');
    setEditNotes(u.notes);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setError('');
    setMessage('');
    try {
      await apiJson(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editName,
          phone: editPhone,
          organization: editOrg,
          jobRole: editJobRole,
          accountType: editAccountType,
          status: editStatus,
          contractStartDate: editContractStart,
          contractEndDate: editContractEnd,
          notes: editNotes,
        }),
      });
      setMessage(`Cadastro de ${editName} atualizado com sucesso.`);
      setEditingUser(null);
      await loadDashboard();
    } catch (err: any) {
      setError(err?.message || 'Erro ao atualizar cadastro.');
    }
  };

  const handleActivate = async (u: LuminextUserRecord) => {
    setError('');
    setMessage('');
    try {
      await apiJson(`/api/admin/users/${u.id}/activate`, { method: 'POST' });
      setMessage(`Acesso ativado para ${u.name} (${u.email}).`);
      await loadDashboard();
    } catch (err: any) {
      setError(err?.message || 'Erro ao ativar acesso.');
    }
  };

  const handleBlock = async (u: LuminextUserRecord) => {
    setError('');
    setMessage('');
    try {
      await apiJson(`/api/admin/users/${u.id}/block`, { method: 'POST' });
      setMessage(`Acesso bloqueado para ${u.name}. Sessões ativas foram encerradas imediatamente.`);
      await loadDashboard();
    } catch (err: any) {
      setError(err?.message || 'Erro ao bloquear acesso.');
    }
  };

  const handleSuspend = async (u: LuminextUserRecord) => {
    setError('');
    setMessage('');
    try {
      await apiJson(`/api/admin/users/${u.id}/suspend`, { method: 'POST' });
      setMessage(`Acesso suspenso temporariamente para ${u.name}. Sessões ativas foram encerradas.`);
      await loadDashboard();
    } catch (err: any) {
      setError(err?.message || 'Erro ao suspender acesso.');
    }
  };

  const handleSendReset = async (u: LuminextUserRecord) => {
    setError('');
    setMessage('');
    try {
      const res = await apiJson<{ setupToken: string; resetLink: string; message: string }>(
        `/api/admin/users/${u.id}/send-reset`,
        { method: 'POST' }
      );
      setMessage(`Convite/redefinição de senha gerado para ${u.email}.`);
      setInvitePreview({
        title: `Redefinição de senha segura · ${u.name}`,
        email: u.email,
        token: res.setupToken,
        link: res.resetLink,
      });
      await loadDashboard();
    } catch (err: any) {
      setError(err?.message || 'Erro ao gerar redefinição de senha.');
    }
  };

  const isContractExpired = (end?: string) => {
    if (!end) return false;
    return end < new Date().toISOString().slice(0, 10);
  };

  const statusBadge = (u: LuminextUserRecord) => {
    const expired = isContractExpired(u.contractEndDate);
    if (u.accessStatus === 'bloqueado') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 border border-red-200 text-red-700 font-semibold text-xs">
          <Lock className="w-3 h-3" />
          Bloqueado
        </span>
      );
    }
    if (u.accessStatus === 'suspenso') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FEF3C7] border border-[#F59E0B] text-[#92400E] font-semibold text-xs">
          <PauseCircle className="w-3 h-3" />
          Suspenso
        </span>
      );
    }
    if (u.accessStatus === 'pendente') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-300 text-amber-800 font-semibold text-xs">
          <Clock className="w-3 h-3" />
          Pendente
        </span>
      );
    }
    if (expired) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 border border-red-200 text-red-700 font-semibold text-xs">
          <CalendarClock className="w-3 h-3" />
          Contrato expirado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-xs">
        <CheckCircle2 className="w-3 h-3" />
        Ativo
      </span>
    );
  };

  const accountTypeLabel = (t: UserAccountType) => {
    if (t === 'luminext_admin') return 'Admin LumiNext';
    if (t === 'school_admin') return 'Gestor Escolar';
    return 'Professor(a)';
  };

  return (
    <div className="space-y-6">
      {/* Banner Exclusivo LumiNext Tech */}
      <div className="bg-[#0B1E3B] text-white rounded-xl p-6 flex flex-wrap items-center justify-between gap-4 border border-[#1E3A63]">
        <div>
          <p className="text-xs font-semibold text-[#FACC15] flex items-center gap-1.5 mb-1">
            <ShieldCheck className="w-4 h-4" />
            LumiNext Tech · Painel Administrativo Exclusivo (/admin)
          </p>
          <h1 className="font-display text-2xl font-bold text-white">
            Gerenciamento de Usuários e Contratos ApoIA.Edu
          </h1>
          <p className="text-sm text-slate-200 mt-1 max-w-2xl">
            Gerencie contas autorizadas, vigência contratual, bloqueios imediatos e auditoria LGPD sem expor documentos pedagógicos de estudantes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm((v) => !v)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-[#0B1E3B] text-sm font-bold transition-colors cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          Cadastrar novo usuário
        </button>
      </div>

      {error && (
        <div role="alert" className="p-3.5 rounded-lg border border-red-300 bg-red-50 text-red-900 text-sm">
          {error}
        </div>
      )}
      {message && (
        <div role="status" className="p-3.5 rounded-lg border border-[#2B7DE9] bg-[#E6F0FD] text-[#0B1E3B] text-sm">
          {message}
        </div>
      )}

      {/* Convite / Redefinição gerada */}
      {invitePreview && (
        <div className="bg-[#FEF3C7] border border-[#F59E0B] rounded-xl p-5 space-y-3 text-[#0B1E3B]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-bold flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#B45309]" />
                {invitePreview.title}
              </h2>
              <p className="text-xs text-[#78350F] mt-0.5">
                Nenhuma senha foi armazenada em texto simples. Compartilhe este link seguro com{' '}
                <strong className="font-mono">{invitePreview.email}</strong> para que o usuário defina a própria senha:
              </p>
            </div>
            <button
              type="button"
              onClick={() => setInvitePreview(null)}
              aria-label="Fechar aviso de convite"
              className="text-[#78350F] hover:text-[#0B1E3B] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 bg-white border border-amber-300 rounded-lg p-3">
            <code className="text-xs font-mono flex-1 break-all text-[#0B1E3B]">{invitePreview.link}</code>
            <button
              type="button"
              onClick={() => copyText(invitePreview.link)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0B1E3B] text-white text-xs font-semibold cursor-pointer shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              {copiedFlag ? 'Copiado!' : 'Copiar link'}
            </button>
          </div>
          <p className="text-xs text-[#78350F]">
            Código de convite/redefinição: <strong className="font-mono">{invitePreview.token}</strong>
          </p>
        </div>
      )}

      {/* Dashboard KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-slate-500">Total de usuários cadastrados</p>
          <p className="font-display text-3xl font-bold text-[#0B1E3B] mt-1 tabular-nums">{kpis.totalUsers}</p>
          <p className="text-xs text-slate-600 mt-1.5">
            {kpis.schoolManagersCount} escolas/gestores · {kpis.teachersCount} professores
          </p>
        </div>

        <div className="bg-white border border-[#2B7DE9]/40 rounded-xl p-5">
          <p className="text-xs font-semibold text-[#2B7DE9]">Usuários ativos (vigência válida)</p>
          <p className="font-display text-3xl font-bold text-[#0B1E3B] mt-1 tabular-nums">{kpis.activeUsers}</p>
          <p className="text-xs text-slate-600 mt-1.5">
            {kpis.expiringSoonUsers} com contrato expirando em até 30 dias · {kpis.expiredUsers} expirados
          </p>
        </div>

        <div className="bg-white border border-red-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-red-700">Usuários bloqueados / suspensos</p>
          <p className="font-display text-3xl font-bold text-[#0B1E3B] mt-1 tabular-nums">
            {kpis.blockedUsers + kpis.suspendedUsers}
          </p>
          <p className="text-xs text-slate-600 mt-1.5">
            {kpis.blockedUsers} bloqueados · {kpis.suspendedUsers} suspensos
          </p>
        </div>

        <div className="bg-[#FEF3C7]/60 border border-[#F59E0B] rounded-xl p-5">
          <p className="text-xs font-semibold text-[#92400E]">Novos usuários cadastrados (30d)</p>
          <p className="font-display text-3xl font-bold text-[#0B1E3B] mt-1 tabular-nums">
            {kpis.newUsersLast30Days}
          </p>
          <p className="text-xs text-[#78350F] mt-1.5">{kpis.pendingUsers} aguardando ativação</p>
        </div>
      </div>

      {/* Formulário "Cadastrar novo usuário" */}
      {showCreateForm && (
        <form onSubmit={handleCreateUser} className="bg-white border-2 border-[#2B7DE9] rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="font-display text-lg font-bold text-[#0B1E3B] flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#2B7DE9]" />
                Cadastrar novo usuário
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Cria a conta no sistema de autenticação existente e gera um convite seguro para o usuário definir a própria senha.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              aria-label="Fechar formulário"
              className="text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="adm-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Nome completo *
              </label>
              <input
                id="adm-name"
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex.: Prof.ª Camila Nogueira"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label htmlFor="adm-email" className="block text-xs font-semibold text-slate-700 mb-1">
                E-mail *
              </label>
              <input
                id="adm-email"
                type="email"
                required
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="usuario@escola.edu.br"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label htmlFor="adm-org" className="block text-xs font-semibold text-slate-700 mb-1">
                Escola ou instituição *
              </label>
              <input
                id="adm-org"
                type="text"
                required
                value={formOrg}
                onChange={(e) => setFormOrg(e.target.value)}
                placeholder="Ex.: E.M. Paulo Freire"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label htmlFor="adm-role" className="block text-xs font-semibold text-slate-700 mb-1">
                Função *
              </label>
              <select
                id="adm-role"
                value={formRoleChoice}
                onChange={(e) => setFormRoleChoice(e.target.value as AdminRoleChoice)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                <option value="professor">Professor</option>
                <option value="gestor_escolar">Gestor escolar</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            <div>
              <label htmlFor="adm-status" className="block text-xs font-semibold text-slate-700 mb-1">
                Status inicial *
              </label>
              <select
                id="adm-status"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as 'ativo' | 'bloqueado')}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                <option value="ativo">Ativo</option>
                <option value="bloqueado">Bloqueado</option>
              </select>
            </div>

            <div>
              <label htmlFor="adm-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                Telefone / WhatsApp
              </label>
              <input
                id="adm-phone"
                type="text"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="(11) 99999-0000"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label htmlFor="adm-start" className="block text-xs font-semibold text-slate-700 mb-1">
                Data de contrato
              </label>
              <input
                id="adm-start"
                type="date"
                value={formContractStart}
                onChange={(e) => setFormContractStart(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label htmlFor="adm-end" className="block text-xs font-semibold text-slate-700 mb-1">
                Data de expiração
              </label>
              <input
                id="adm-end"
                type="date"
                value={formContractEnd}
                onChange={(e) => setFormContractEnd(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label htmlFor="adm-job" className="block text-xs font-semibold text-slate-700 mb-1">
                Detalhe da função (opcional)
              </label>
              <input
                id="adm-job"
                type="text"
                value={formJobRole}
                onChange={(e) => setFormJobRole(e.target.value)}
                placeholder="Ex.: Sala de Recursos AEE"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div className="md:col-span-3">
              <label htmlFor="adm-notes" className="block text-xs font-semibold text-slate-700 mb-1">
                Observações contratuais LumiNext (opcional)
              </label>
              <input
                id="adm-notes"
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Ex.: Contrato Secretaria Municipal · Lote 2026"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-sm cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-[#2B7DE9] hover:bg-[#1D6AD4] text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
            >
              {submitting ? 'Cadastrando...' : 'Cadastrar e gerar convite seguro'}
            </button>
          </div>
        </form>
      )}

      {/* Tabela de Gerenciamento de Acessos */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-[#0B1E3B] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#2B7DE9]" />
            Gerenciamento de Acessos ({filteredUsers.length})
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar nome, e-mail ou escola..."
                className="pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filtrar por status"
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm bg-white"
            >
              <option value="all">Todos os status</option>
              <option value="ativo">Ativo</option>
              <option value="pendente">Pendente</option>
              <option value="suspenso">Suspenso</option>
              <option value="bloqueado">Bloqueado</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500 py-8 text-center">Carregando base de usuários...</p>
        ) : filteredUsers.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">Nenhum usuário encontrado para este filtro.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2.5 pr-4 font-semibold">Usuário</th>
                  <th className="py-2.5 pr-4 font-semibold">Escola / Função</th>
                  <th className="py-2.5 pr-4 font-semibold">Contrato / Expiração</th>
                  <th className="py-2.5 pr-4 font-semibold">Status</th>
                  <th className="py-2.5 pr-4 font-semibold">Último acesso</th>
                  <th className="py-2.5 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredUsers.map((u) => {
                  const isSelf = u.id === currentUserId;
                  const isActiveStatus = u.accessStatus === 'ativo' || u.accessStatus === 'liberado';
                  return (
                    <tr key={u.id} className="align-top hover:bg-[#F6F8FB]/70">
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-[#0B1E3B]">{u.name}</p>
                        <p className="text-xs font-mono text-slate-600">{u.email}</p>
                        {u.phone && <p className="text-xs text-slate-500">{u.phone}</p>}
                      </td>
                      <td className="py-3 pr-4 text-xs text-slate-700">
                        <p className="font-semibold text-[#0B1E3B]">
                          {u.organization || u.schoolNames[0] || '—'}
                        </p>
                        <p className="text-slate-600">
                          {accountTypeLabel(u.accountType)}
                          {u.jobRole ? ` · ${u.jobRole}` : ''}
                        </p>
                      </td>
                      <td className="py-3 pr-4 text-xs text-slate-700 tabular-nums">
                        <p>Início: {formatDatePtBr(u.contractStartDate)}</p>
                        <p className={isContractExpired(u.contractEndDate) ? 'text-red-700 font-semibold' : ''}>
                          Expira: {formatDatePtBr(u.contractEndDate)}
                        </p>
                      </td>
                      <td className="py-3 pr-4">{statusBadge(u)}</td>
                      <td className="py-3 pr-4 text-xs text-slate-600 tabular-nums">
                        {formatDateTimePtBr(u.lastLoginAt)}
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex flex-wrap justify-end gap-1.5 text-xs">
                          <button
                            type="button"
                            onClick={() => handleViewUser(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-300 text-[#0B1E3B] hover:border-[#2B7DE9] font-semibold cursor-pointer"
                            title="Visualizar cadastro e consultar último acesso"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Visualizar
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-300 text-[#0B1E3B] hover:border-[#2B7DE9] font-semibold cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Editar
                          </button>
                          {!isActiveStatus && (
                            <button
                              type="button"
                              onClick={() => handleActivate(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              Ativar
                            </button>
                          )}
                          {!isSelf && u.accessStatus !== 'suspenso' && (
                            <button
                              type="button"
                              onClick={() => handleSuspend(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-[#F59E0B] bg-[#FEF3C7] text-[#92400E] hover:bg-[#FDE68A] font-semibold cursor-pointer"
                            >
                              <PauseCircle className="w-3.5 h-3.5" />
                              Suspender
                            </button>
                          )}
                          {!isSelf && u.accessStatus !== 'bloqueado' && (
                            <button
                              type="button"
                              onClick={() => handleBlock(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-red-300 text-red-700 hover:bg-red-50 font-semibold cursor-pointer"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              Bloquear
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleSendReset(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-[#2B7DE9] text-[#2B7DE9] hover:bg-[#E6F0FD] font-semibold cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            Redefinir senha
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Auditoria LumiNext + LGPD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <h2 className="font-display text-base font-bold text-[#0B1E3B]">
            Registro de Auditoria Administrativa (LGPD)
          </h2>
          {auditLogs.length === 0 ? (
            <p className="text-xs text-slate-500">Nenhuma ação administrativa registrada ainda.</p>
          ) : (
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-3 font-semibold">Data/Hora</th>
                    <th className="py-2 pr-3 font-semibold">Admin</th>
                    <th className="py-2 pr-3 font-semibold">Ação</th>
                    <th className="py-2 pr-3 font-semibold">Alvo</th>
                    <th className="py-2 font-semibold">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-2 pr-3 tabular-nums text-slate-500 whitespace-nowrap">
                        {formatDateTimePtBr(log.createdAt)}
                      </td>
                      <td className="py-2 pr-3 font-mono text-slate-700">{log.adminEmail}</td>
                      <td className="py-2 pr-3 font-semibold text-[#0B1E3B]">{log.action}</td>
                      <td className="py-2 pr-3 font-mono text-slate-700">{log.targetEmail || '—'}</td>
                      <td className="py-2 text-slate-600">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <h2 className="font-display text-base font-bold text-[#0B1E3B] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#2B7DE9]" />
            Segurança e Isolamento LGPD
          </h2>
          <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
            <li>• Senhas protegidas com hash criptográfico scrypt + salt aleatório; nunca em texto simples.</li>
            <li>• Bloqueio ou suspensão encerram imediatamente todas as sessões ativas no servidor.</li>
            <li>• Professores e gestores escolares recebem erro 403 se tentarem acessar a rota administrativa.</li>
            <li>• Documentos sensíveis de estudantes (PEI, PAEE, Estudos de Caso e anexos) ficam isolados por escola e não são acessíveis neste painel.</li>
          </ul>
        </div>
      </div>

      {/* Modal: Visualizar cadastro + Último acesso */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 bg-[#071429]/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0B1E3B]">{viewingUser.name}</h2>
                <p className="text-xs font-mono text-slate-500">{viewingUser.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingUser(null)}
                aria-label="Fechar detalhes"
                className="text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#F6F8FB] border border-slate-200 rounded-lg p-4">
              <div>
                <span className="text-slate-500 block">Status atual</span>
                <div className="mt-1">{statusBadge(viewingUser)}</div>
              </div>
              <div>
                <span className="text-slate-500 block">Último acesso registrado</span>
                <p className="font-semibold text-[#0B1E3B] mt-1">{formatDateTimePtBr(viewingUser.lastLoginAt)}</p>
              </div>
              <div>
                <span className="text-slate-500 block">Escola / Instituição</span>
                <p className="font-semibold text-[#0B1E3B] mt-0.5">{viewingUser.organization || '—'}</p>
              </div>
              <div>
                <span className="text-slate-500 block">Função / Perfil</span>
                <p className="font-semibold text-[#0B1E3B] mt-0.5">
                  {accountTypeLabel(viewingUser.accountType)}
                  {viewingUser.jobRole ? ` · ${viewingUser.jobRole}` : ''}
                </p>
              </div>
              <div>
                <span className="text-slate-500 block">Data do contrato</span>
                <p className="font-semibold text-[#0B1E3B] mt-0.5">{formatDatePtBr(viewingUser.contractStartDate)}</p>
              </div>
              <div>
                <span className="text-slate-500 block">Data de expiração</span>
                <p className="font-semibold text-[#0B1E3B] mt-0.5">{formatDatePtBr(viewingUser.contractEndDate)}</p>
              </div>
              <div>
                <span className="text-slate-500 block">Telefone</span>
                <p className="font-semibold text-[#0B1E3B] mt-0.5">{viewingUser.phone || '—'}</p>
              </div>
              <div>
                <span className="text-slate-500 block">Cadastrado em</span>
                <p className="font-semibold text-[#0B1E3B] mt-0.5">{formatDateTimePtBr(viewingUser.createdAt)}</p>
              </div>
              {viewingUser.notes && (
                <div className="sm:col-span-2">
                  <span className="text-slate-500 block">Observações internas</span>
                  <p className="text-slate-700 mt-0.5">{viewingUser.notes}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="font-display text-sm font-bold text-[#0B1E3B]">Histórico recente de ações neste usuário</h3>
              {loadingDetails ? (
                <p className="text-xs text-slate-500">Consultando histórico...</p>
              ) : viewingLogs.length === 0 ? (
                <p className="text-xs text-slate-500">Sem eventos recentes registrados para este usuário.</p>
              ) : (
                <ul className="divide-y divide-slate-200 text-xs max-h-40 overflow-y-auto">
                  {viewingLogs.map((l) => (
                    <li key={l.id} className="py-1.5 flex items-center justify-between gap-2">
                      <span>
                        <strong className="text-[#0B1E3B]">{l.action}</strong> — {l.details}
                      </span>
                      <span className="text-slate-500 tabular-nums shrink-0">{formatDateTimePtBr(l.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const target = viewingUser;
                  setViewingUser(null);
                  openEditModal(target);
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-[#0B1E3B] cursor-pointer"
              >
                Editar cadastro
              </button>
              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="px-4 py-2 rounded-lg bg-[#0B1E3B] text-white text-xs font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar informações do usuário */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-[#071429]/60 flex items-center justify-center p-4">
          <form onSubmit={handleSaveEdit} className="bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0B1E3B]">Editar informações do usuário</h2>
                <p className="text-xs font-mono text-slate-500">{editingUser.email}</p>
              </div>
              <button type="button" onClick={() => setEditingUser(null)} className="text-slate-500 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome completo</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Detalhe da função</label>
                <input
                  type="text"
                  value={editJobRole}
                  onChange={(e) => setEditJobRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Escola / Instituição</label>
                <input
                  type="text"
                  value={editOrg}
                  onChange={(e) => setEditOrg(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Perfil de conta</label>
                <select
                  value={editAccountType}
                  onChange={(e) => setEditAccountType(e.target.value as UserAccountType)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                >
                  <option value="teacher">Professor(a)</option>
                  <option value="school_admin">Gestor Escolar</option>
                  <option value="luminext_admin">Admin LumiNext</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status de acesso</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as UserAccessStatus)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                >
                  <option value="ativo">Ativo</option>
                  <option value="pendente">Pendente</option>
                  <option value="suspenso">Suspenso</option>
                  <option value="bloqueado">Bloqueado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Data de contrato</label>
                <input
                  type="date"
                  value={editContractStart}
                  onChange={(e) => setEditContractStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Data de expiração</label>
                <input
                  type="date"
                  value={editContractEnd}
                  onChange={(e) => setEditContractEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Observações LumiNext</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#2B7DE9] text-white text-sm font-semibold cursor-pointer"
              >
                Salvar alterações
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
