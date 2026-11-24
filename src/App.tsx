import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRightLeft,
  Building2,
  KeyRound,
  Lock,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  User,
  Users,
  X,
} from 'lucide-react';
import { apiJson } from './api';
import { ActivitiesTab } from './components/ActivitiesTab';
import { DevelopmentTab } from './components/DevelopmentTab';
import { DocumentsTab } from './components/DocumentsTab';
import { EntranceView } from './components/EntranceView';
import { FeedbackModal } from './components/FeedbackModal';
import { LuminextAdminView } from './components/LuminextAdminView';
import { PedagogicalProfileTab } from './components/PedagogicalProfileTab';
import { SchoolAdminModal } from './components/SchoolAdminModal';
import { StudentOverviewTab } from './components/StudentOverviewTab';
import type {
  ApplicationFeedback,
  DemoProfileInfo,
  DemoProfileMode,
  PedagogicalActivity,
  PedagogicalDocument,
  SourceRecord,
  Student,
  UpdateAlert,
  UserSummary,
  WorkspaceInvitation,
  WorkspaceSummary,
} from './types';

type ProfileTab = 'visao_geral' | 'perfil' | 'documentos' | 'atividades' | 'desenvolvimento';

export default function App() {
  const [booting, setBooting] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [demoProfile, setDemoProfile] = useState<DemoProfileInfo | null>(null);
  const [user, setUser] = useState<UserSummary | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [pendingInvites, setPendingInvites] = useState<WorkspaceInvitation[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('');

  const [students, setStudents] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ProfileTab>('visao_geral');
  const [docSubAction, setDocSubAction] = useState<'none' | 'add_existing' | 'elaborate_paee' | 'elaborate_pei'>('none');

  // Student Overview Data
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [documents, setDocuments] = useState<PedagogicalDocument[]>([]);
  const [activities, setActivities] = useState<PedagogicalActivity[]>([]);
  const [applications, setApplications] = useState<ApplicationFeedback[]>([]);
  const [alerts, setAlerts] = useState<UpdateAlert[]>([]);

  // Route & Admin Login State (/admin & /definir-senha)
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');
  const [adminLoginEmail, setAdminLoginEmail] = useState('');
  const [adminLoginPassword, setAdminLoginPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);
  const [hasMasterAdmin, setHasMasterAdmin] = useState(true);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCreateStudent, setShowCreateStudent] = useState(false);
  const [newStdName, setNewStdName] = useState('');
  const [newStdCode, setNewStdCode] = useState('');
  const [newStdGrade, setNewStdGrade] = useState('');
  const [newStdClass, setNewStdClass] = useState('');
  const [showSchoolAdmin, setShowSchoolAdmin] = useState(false);
  const [schoolAdminInitialTab, setSchoolAdminInitialTab] = useState<'equipe' | 'transferencias'>('equipe');
  const [feedbackActivity, setFeedbackActivity] = useState<PedagogicalActivity | null>(null);
  const [preselectedPeiObjective, setPreselectedPeiObjective] = useState<{
    docId: string;
    objectiveId: string;
    objectiveText: string;
    subject: string;
    bimester: string;
  } | null>(null);

  // Create School / Accept Invite inline form
  const [showJoinOrCreateSchool, setShowJoinOrCreateSchool] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');

  const isAdminRoute = currentPath === '/admin' || currentPath.startsWith('/admin/');
  const isDefinePasswordRoute = currentPath === '/definir-senha';

  const navigateTo = (targetPath: string) => {
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    setCurrentPath(targetPath.split('?')[0] || '/');
  };

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (isAdminRoute) {
      apiJson<{ hasMasterAdmin: boolean }>('/api/luminext/status')
        .then((res) => setHasMasterAdmin(res.hasMasterAdmin))
        .catch(() => {});
    }
  }, [isAdminRoute]);

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0] || null,
    [workspaces, activeWorkspaceId]
  );

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) || null,
    [students, selectedStudentId]
  );

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.displayName.toLowerCase().includes(q) ||
        s.codeOrInitials.toLowerCase().includes(q) ||
        s.gradeLevel.toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  const loadSession = async () => {
    setBooting(true);
    try {
      const me = await apiJson<{
        authenticated: boolean;
        user: UserSummary | null;
        workspaces: WorkspaceSummary[];
        pendingInvitations: WorkspaceInvitation[];
      }>('/api/auth/me');
      if (me.authenticated && me.user) {
        setUser(me.user);
        setWorkspaces(me.workspaces);
        setPendingInvites(me.pendingInvitations || []);
        setActiveWorkspaceId((prev) =>
          prev && me.workspaces.some((w) => w.id === prev) ? prev : me.workspaces[0]?.id || ''
        );
      } else {
        setUser(null);
      }
    } finally {
      setBooting(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  const loadWorkspaceStudents = async (wsId: string) => {
    if (!wsId || isDemo) return;
    try {
      const res = await apiJson<{ students: Student[] }>(`/api/workspaces/${wsId}/students`);
      setStudents(res.students);
      setSelectedStudentId((prev) =>
        prev && res.students.some((s) => s.id === prev) ? prev : res.students[0]?.id || ''
      );
    } catch {
      setStudents([]);
      setSelectedStudentId('');
    }
  };

  useEffect(() => {
    if (user && activeWorkspaceId && !isDemo) {
      loadWorkspaceStudents(activeWorkspaceId);
    }
  }, [user, activeWorkspaceId, isDemo]);

  const loadStudentOverview = async (studentId: string) => {
    if (!studentId || isDemo) return;
    try {
      const res = await apiJson<{
        student: Student;
        sources: SourceRecord[];
        documents: PedagogicalDocument[];
        activities: PedagogicalActivity[];
        applications: ApplicationFeedback[];
        alerts: UpdateAlert[];
      }>(`/api/students/${studentId}/overview`);
      setSources(res.sources);
      setDocuments(res.documents);
      setActivities(res.activities);
      setApplications(res.applications);
      setAlerts(res.alerts);
    } catch {
      setSources([]);
      setDocuments([]);
      setActivities([]);
      setApplications([]);
      setAlerts([]);
    }
  };

  useEffect(() => {
    if (selectedStudentId && !isDemo) {
      loadStudentOverview(selectedStudentId);
    }
  }, [selectedStudentId, isDemo]);

  const applyDemoPayload = (
    res: {
      user: UserSummary;
      demoProfile: DemoProfileInfo;
      workspace: WorkspaceSummary;
      students: Student[];
      sources: SourceRecord[];
      documents: PedagogicalDocument[];
      activities: PedagogicalActivity[];
      applications: ApplicationFeedback[];
      alerts: UpdateAlert[];
    },
    preferredStudentId?: string
  ) => {
    setIsDemo(true);
    setDemoProfile(res.demoProfile);
    setUser(res.user);
    setWorkspaces([res.workspace]);
    setActiveWorkspaceId(res.workspace.id);
    setStudents(res.students);
    const chosenId =
      preferredStudentId && res.students.some((s) => s.id === preferredStudentId)
        ? preferredStudentId
        : res.students[0]?.id || '';
    setSelectedStudentId(chosenId);
    setSources(res.sources.filter((s) => s.studentId === chosenId));
    setDocuments(res.documents.filter((d) => d.studentId === chosenId));
    setActivities(res.activities.filter((a) => a.studentId === chosenId));
    setApplications(res.applications.filter((ap) => ap.studentId === chosenId));
    setAlerts([]);
  };

  const loadDemoState = async (
    preferredStudentId?: string,
    profileMode?: DemoProfileMode,
    teacherUserId?: string
  ) => {
    const params = new URLSearchParams();
    if (profileMode) params.set('profile', profileMode);
    if (teacherUserId) params.set('teacherUserId', teacherUserId);
    const qs = params.toString();
    const res = await apiJson<any>(`/api/demo/state${qs ? `?${qs}` : ''}`);
    applyDemoPayload(res, preferredStudentId);
  };

  const handleSwitchDemoProfile = async (mode: DemoProfileMode, teacherUserId?: string) => {
    const res = await apiJson<any>('/api/demo/profile', {
      method: 'POST',
      body: JSON.stringify({ mode, teacherUserId }),
    });
    setShowSchoolAdmin(false);
    applyDemoPayload(res, selectedStudentId);
  };

  const handleSelectStudentInWorkspace = async (sid: string) => {
    setSelectedStudentId(sid);
    setActiveTab('visao_geral');
    setDocSubAction('none');
    setMobileMenuOpen(false);
    if (isDemo) {
      await loadDemoState(sid);
    }
  };

  const handleLogoutOrEndDemo = async () => {
    if (isDemo) {
      await apiJson('/api/demo/end', { method: 'POST' });
      setIsDemo(false);
      setDemoProfile(null);
      setUser(null);
      setWorkspaces([]);
      setStudents([]);
      setSelectedStudentId('');
      return;
    }
    await apiJson('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setWorkspaces([]);
    setStudents([]);
    setSelectedStudentId('');
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) return;
    if (isDemo) {
      const res = await apiJson<{ student: Student }>('/api/demo/students', {
        method: 'POST',
        body: JSON.stringify({
          displayName: newStdName,
          codeOrInitials: newStdCode,
          gradeLevel: newStdGrade,
          classroom: newStdClass,
        }),
      });
      setShowCreateStudent(false);
      setNewStdName('');
      setNewStdCode('');
      setNewStdGrade('');
      setNewStdClass('');
      await loadDemoState(res.student.id);
      setActiveTab('perfil');
      return;
    }
    const res = await apiJson<{ student: Student }>(`/api/workspaces/${activeWorkspace.id}/students`, {
      method: 'POST',
      body: JSON.stringify({
        displayName: newStdName,
        codeOrInitials: newStdCode,
        schoolName: activeWorkspace.type === 'school' ? activeWorkspace.name : '',
        gradeLevel: newStdGrade,
        classroom: newStdClass,
      }),
    });
    setShowCreateStudent(false);
    setNewStdName('');
    setNewStdCode('');
    setNewStdGrade('');
    setNewStdClass('');
    await loadWorkspaceStudents(activeWorkspace.id);
    setSelectedStudentId(res.student.id);
    setActiveTab('perfil');
  };

  const handleCreateSchoolWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName.trim()) return;
    const res = await apiJson<{ workspaceId: string; workspaces: WorkspaceSummary[] }>('/api/workspaces/school', {
      method: 'POST',
      body: JSON.stringify({ name: newSchoolName }),
    });
    setWorkspaces(res.workspaces);
    setActiveWorkspaceId(res.workspaceId);
    setNewSchoolName('');
    setShowJoinOrCreateSchool(false);
  };

  const handleAcceptInvite = async (tokenToUse: string) => {
    const res = await apiJson<{ workspaceId: string; workspaces: WorkspaceSummary[] }>('/api/workspaces/accept-invite', {
      method: 'POST',
      body: JSON.stringify({ token: tokenToUse }),
    });
    setWorkspaces(res.workspaces);
    setActiveWorkspaceId(res.workspaceId);
    setInviteCodeInput('');
    setShowJoinOrCreateSchool(false);
    await loadSession();
  };

  const handleAdminRouteLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginError('');
    setAdminLoginLoading(true);
    try {
      const res = await apiJson<{ user: UserSummary; workspaces: WorkspaceSummary[] }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: adminLoginEmail, password: adminLoginPassword }),
      });
      setIsDemo(false);
      setDemoProfile(null);
      setUser(res.user);
      setWorkspaces(res.workspaces);
      setActiveWorkspaceId(res.workspaces[0]?.id || '');
      setAdminLoginPassword('');
    } catch (err: any) {
      setAdminLoginError(err?.message || 'Não foi possível autenticar.');
    } finally {
      setAdminLoginLoading(false);
    }
  };

  if (booting) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] flex items-center justify-center text-sm text-slate-600">
        Carregando ApoIA.Edu...
      </div>
    );
  }

  // Exclusive /admin route (accessible only to authenticated LumiNext Tech admins)
  if (isAdminRoute) {
    if (!user || isDemo) {
      return (
        <div className="min-h-screen bg-[#0B1E3B] text-white flex flex-col justify-between p-6">
          <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
            <span className="font-display text-lg font-bold tracking-tight">
              ApoIA.Edu · LumiNext Tech Admin
            </span>
            <button
              type="button"
              onClick={() => navigateTo('/')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar para o ApoIA.Edu
            </button>
          </div>

          <div className="max-w-md w-full mx-auto bg-white text-slate-900 rounded-xl border border-slate-200 p-7 shadow-xl space-y-5 my-10">
            <div>
              <p className="text-xs font-semibold text-[#2B7DE9] flex items-center gap-1.5 mb-1">
                <ShieldCheck className="w-4 h-4" />
                Área Administrativa Exclusiva (/admin)
              </p>
              <h1 className="font-display text-2xl font-bold text-[#0B1E3B]">
                Acesso LumiNext Tech
              </h1>
              <p className="text-xs text-slate-600 mt-1">
                Entre com uma conta administradora autorizada da LumiNext Tech. Não há cadastro público de administradores.
              </p>
            </div>

            {!hasMasterAdmin && (
              <div className="p-3.5 rounded-lg bg-[#FEF3C7] border border-[#F59E0B] text-[#78350F] text-xs space-y-1">
                <p className="font-bold">Primeira conta administradora ainda não configurada</p>
                <p>
                  Configure no servidor usando as variáveis{' '}
                  <code className="font-mono">LUMINEXT_ADMIN_EMAIL</code> e{' '}
                  <code className="font-mono">LUMINEXT_ADMIN_PASSWORD</code> ou execute{' '}
                  <code className="font-mono">npm run admin:init</code>.
                </p>
              </div>
            )}

            {adminLoginError && (
              <div role="alert" className="p-3 rounded-lg border border-red-300 bg-red-50 text-red-900 text-xs">
                {adminLoginError}
              </div>
            )}

            <form onSubmit={handleAdminRouteLogin} className="space-y-4">
              <div>
                <label htmlFor="admin-email" className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail administrativo LumiNext
                </label>
                <input
                  id="admin-email"
                  type="email"
                  required
                  value={adminLoginEmail}
                  onChange={(e) => setAdminLoginEmail(e.target.value)}
                  placeholder="admin@luminext.tech"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label htmlFor="admin-pass" className="block text-xs font-semibold text-slate-700 mb-1">
                  Senha administrativa
                </label>
                <input
                  id="admin-pass"
                  type="password"
                  required
                  value={adminLoginPassword}
                  onChange={(e) => setAdminLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={adminLoginLoading}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#2B7DE9] hover:bg-[#1D6AD4] text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
              >
                <KeyRound className="w-4 h-4" />
                {adminLoginLoading ? 'Autenticando...' : 'Entrar no Painel LumiNext'}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-400">
            LumiNext Tech · ApoIA.Edu Educação Inclusiva · Segurança e LGPD
          </p>
        </div>
      );
    }

    if (user.accountType !== 'luminext_admin') {
      return (
        <div className="min-h-screen bg-[#F6F8FB] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-red-200 rounded-xl p-8 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-700 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="font-display text-xl font-bold text-[#0B1E3B]">
              403 · Acesso Restrito à LumiNext Tech
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Sua conta (<strong className="font-mono">{user.email}</strong>) não possui permissão de administradora da LumiNext Tech. Professores e gestores escolares não têm acesso à rota <code className="font-mono">/admin</code>.
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => navigateTo('/')}
                className="px-4 py-2 rounded-lg bg-[#0B1E3B] text-white text-sm font-semibold cursor-pointer"
              >
                Voltar ao espaço pedagógico
              </button>
              <button
                type="button"
                onClick={handleLogoutOrEndDemo}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold cursor-pointer"
              >
                Sair da conta
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#F6F8FB] text-slate-900 flex flex-col">
        <header className="bg-[#0B1E3B] text-white border-b border-[#1E3A63] px-6 py-4">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-[#FACC15]" />
              <div>
                <p className="font-display text-base font-bold leading-tight">
                  ApoIA.Edu · Administração LumiNext Tech
                </p>
                <p className="text-xs text-slate-300">{user.name} ({user.email})</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigateTo('/')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Ir para Espaço Pedagógico
              </button>
              <button
                type="button"
                onClick={handleLogoutOrEndDemo}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-[#0B1E3B] text-xs font-bold cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Encerrar sessão
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <LuminextAdminView currentUserId={user.id} />
        </main>
      </div>
    );
  }

  if (!user) {
    const searchParams = isDefinePasswordRoute ? new URLSearchParams(window.location.search) : null;
    const inviteEmail = searchParams?.get('email') || '';
    const inviteToken = searchParams?.get('token') || '';
    return (
      <EntranceView
        initialResetEmail={inviteEmail}
        initialResetToken={inviteToken}
        onClearResetRoute={() => {
          if (isDefinePasswordRoute) navigateTo('/');
        }}
        onAuthenticated={(u, ws, prefId) => {
          setIsDemo(false);
          setDemoProfile(null);
          setUser(u);
          setWorkspaces(ws);
          setActiveWorkspaceId(prefId || ws[0]?.id || '');
          if (u.accountType === 'luminext_admin') {
            navigateTo('/admin');
          }
        }}
        onStartDemo={(profile) => loadDemoState(undefined, profile)}
      />
    );
  }

  const canRegisterStudent =
    Boolean(activeWorkspace) &&
    (activeWorkspace!.type === 'individual' || activeWorkspace!.role === 'admin') &&
    (!isDemo || demoProfile?.mode === 'school_admin');

  return (
    <div className="min-h-screen bg-[#F6F8FB] text-slate-900 flex flex-col lg:flex-row">
      {/* Left Sidebar */}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-40 w-[272px] bg-[#0B1E3B] text-white flex flex-col transition-transform lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <p className="font-display text-lg font-bold tracking-tight">ApoIA.Edu</p>
            <p className="text-xs text-slate-300">LumiNext Tech · Educação Inclusiva</p>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Fechar menu"
            className="lg:hidden p-1 text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace Switcher */}
        <div className="p-4 border-b border-white/10 space-y-2">
          <label htmlFor="ws-select" className="block text-xs font-medium text-slate-300">
            Espaço de trabalho ativo
          </label>
          <select
            id="ws-select"
            value={activeWorkspace?.id || ''}
            disabled={isDemo}
            onChange={(e) => setActiveWorkspaceId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#132D54] border border-white/15 text-sm text-white"
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.type === 'individual' ? 'Individual: ' : 'Escola: '}
                {w.name}
              </option>
            ))}
          </select>

          {!isDemo ? (
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setShowJoinOrCreateSchool((v) => !v)}
                className="text-[#93C5FD] hover:text-white underline cursor-pointer"
              >
                + Nova escola ou convite
              </button>
              {activeWorkspace && (
                <button
                  type="button"
                  onClick={() => setShowSchoolAdmin(true)}
                  className="inline-flex items-center gap-1 text-[#FACC15] hover:underline cursor-pointer"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  Equipe e modelos
                </button>
              )}
            </div>
          ) : (
            demoProfile?.mode === 'school_admin' && (
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-300">Perfil Escola ativo</span>
                <button
                  type="button"
                  onClick={() => setShowSchoolAdmin(true)}
                  className="inline-flex items-center gap-1 text-[#FACC15] hover:underline cursor-pointer font-semibold"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  Equipe e professores
                </button>
              </div>
            )
          )}

          {showJoinOrCreateSchool && !isDemo && (
            <div className="p-3 rounded-lg bg-[#071429] border border-white/15 space-y-3 text-xs mt-2">
              <form onSubmit={handleCreateSchoolWorkspace} className="space-y-1.5">
                <label className="block text-slate-300">Criar espaço de escola</label>
                <input
                  type="text"
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  placeholder="Nome da escola"
                  className="w-full px-2.5 py-1.5 rounded bg-[#132D54] border border-white/20 text-white"
                />
                <button type="submit" className="w-full py-1.5 rounded bg-[#2B7DE9] font-semibold cursor-pointer">
                  Criar escola
                </button>
              </form>
              <div className="border-t border-white/10 pt-2 space-y-1.5">
                <label className="block text-slate-300">Entrar por código de convite</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={inviteCodeInput}
                    onChange={(e) => setInviteCodeInput(e.target.value)}
                    placeholder="CONV-..."
                    className="flex-1 px-2 py-1.5 rounded bg-[#132D54] border border-white/20 text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleAcceptInvite(inviteCodeInput)}
                    className="px-2.5 py-1.5 rounded bg-[#F59E0B] text-[#0B1E3B] font-bold cursor-pointer"
                  >
                    Entrar
                  </button>
                </div>
              </div>
            </div>
          )}

          {pendingInvites.length > 0 && !isDemo && (
            <div className="p-2.5 rounded-lg bg-[#FEF3C7] text-[#0B1E3B] text-xs space-y-1">
              <p className="font-bold">Convite pendente:</p>
              {pendingInvites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{inv.workspaceName}</span>
                  <button
                    type="button"
                    onClick={() => handleAcceptInvite(inv.token)}
                    className="px-2 py-0.5 rounded bg-[#0B1E3B] text-white font-semibold cursor-pointer"
                  >
                    Aceitar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Students List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Estudantes ({students.length})
            </span>
            {canRegisterStudent && (
              <button
                type="button"
                onClick={() => setShowCreateStudent(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#2B7DE9] text-white text-xs font-semibold hover:bg-[#1D6AD4] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Cadastrar
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="search"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Buscar estudante..."
              aria-label="Buscar estudante"
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#132D54] border border-white/15 text-xs text-white placeholder:text-slate-400"
            />
          </div>

          {filteredStudents.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              {students.length === 0
                ? canRegisterStudent
                  ? 'Nenhum estudante cadastrado neste espaço.'
                  : 'Nenhum estudante vinculado ao seu perfil nesta escola.'
                : 'Nenhum resultado na busca.'}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {filteredStudents.map((st) => {
                const active = st.id === selectedStudentId;
                return (
                  <li key={st.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectStudentInWorkspace(st.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                        active ? 'bg-[#2B7DE9] text-white font-semibold' : 'text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      <span className="block truncate">{st.displayName}</span>
                      <span className="block text-xs opacity-80 truncate">
                        {[st.gradeLevel, st.classroom].filter(Boolean).join(' · ') || st.codeOrInitials || 'Perfil parcial'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-white/10 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-slate-200">
            <User className="w-4 h-4 shrink-0 text-[#93C5FD]" />
            <div className="min-w-0">
              <p className="font-semibold truncate">{user.name}</p>
              <p className="text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogoutOrEndDemo}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white font-semibold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            {isDemo ? 'Encerrar demonstração' : 'Encerrar sessão'}
          </button>
        </div>
      </aside>

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Demo Warning Banner + Profile Switcher */}
        {isDemo && (
          <div className="no-print bg-[#FEF3C7] border-b border-[#F59E0B] px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-[#78350F]">
            <div className="space-y-1">
              <p>
                <strong>Modo Demonstração (somente dados fictícios; alterações temporárias, sujeitas a reinício):</strong> alterne entre o <strong>Perfil Escola</strong> (para liberar acesso a professores por e-mail e vincular estudantes) e o <strong>Perfil Professor(a)</strong>.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-[#0B1E3B]">Visualizar demonstração como:</span>
                <button
                  type="button"
                  onClick={() => handleSwitchDemoProfile('school_admin')}
                  className={`px-2.5 py-1 rounded font-semibold cursor-pointer border ${
                    demoProfile?.mode === 'school_admin'
                      ? 'bg-[#0B1E3B] text-white border-[#0B1E3B]'
                      : 'bg-white text-[#0B1E3B] border-amber-400 hover:bg-amber-50'
                  }`}
                >
                  Perfil Escola (Coordenação)
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchDemoProfile('teacher', demoProfile?.activeTeacherUserId)}
                  className={`px-2.5 py-1 rounded font-semibold cursor-pointer border ${
                    demoProfile?.mode === 'teacher'
                      ? 'bg-[#2B7DE9] text-white border-[#2B7DE9]'
                      : 'bg-white text-[#0B1E3B] border-amber-400 hover:bg-amber-50'
                  }`}
                >
                  Perfil Professor(a)
                </button>
                {demoProfile?.mode === 'teacher' && demoProfile.teachers.length > 0 && (
                  <select
                    aria-label="Selecionar professor na demonstração"
                    value={demoProfile.activeTeacherUserId}
                    onChange={(e) => handleSwitchDemoProfile('teacher', e.target.value)}
                    className="px-2.5 py-1 rounded border border-amber-400 bg-white text-[#0B1E3B] font-medium"
                  >
                    {demoProfile.teachers.map((t) => (
                      <option key={t.userId} value={t.userId}>
                        {t.name} ({t.email}){t.status === 'revoked' ? ' — Acesso encerrado' : ''}
                      </option>
                    ))}
                  </select>
                )}
                {demoProfile?.mode === 'school_admin' && (
                  <button
                    type="button"
                    onClick={() => setShowSchoolAdmin(true)}
                    className="px-2.5 py-1 rounded bg-white border border-[#0B1E3B] text-[#0B1E3B] font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    + Adicionar professor por e-mail / Vincular estudante
                  </button>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogoutOrEndDemo}
              className="px-3 py-1.5 rounded bg-[#0B1E3B] text-white font-semibold cursor-pointer shrink-0"
            >
              Encerrar e descartar alterações
            </button>
          </div>
        )}

        {/* Top Contextual Header */}
        <header className="no-print bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menu lateral"
              className="lg:hidden p-2 rounded-lg border border-slate-300 text-slate-700"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 truncate flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#2B7DE9] shrink-0" />
                <span>{activeWorkspace?.name}</span>
                {selectedStudent && (
                  <>
                    <span aria-hidden="true">/</span>
                    <span className="font-semibold text-[#0B1E3B]">{selectedStudent.displayName}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isDemo && user.accountType === 'luminext_admin' && (
              <button
                type="button"
                onClick={() => navigateTo('/admin')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer bg-[#0B1E3B] text-white hover:bg-[#132D54]"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#FACC15]" />
                Painel Admin (/admin)
              </button>
            )}
            {activeWorkspace &&
              activeWorkspace.type === 'school' &&
              activeWorkspace.role === 'admin' &&
              (!isDemo || demoProfile?.mode === 'school_admin') && (
                <button
                  type="button"
                  onClick={() => {
                    setSchoolAdminInitialTab('transferencias');
                    setShowSchoolAdmin(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#2B7DE9] bg-[#F2F7FF] text-xs font-semibold text-[#0B1E3B] hover:bg-[#E6F0FD] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-[#2B7DE9]" />
                  Transferir / Aprovar aluno
                </button>
              )}
            {activeWorkspace && (!isDemo || demoProfile?.mode === 'school_admin') && (
              <button
                type="button"
                onClick={() => {
                  setSchoolAdminInitialTab('equipe');
                  setShowSchoolAdmin(true);
                }}
                className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-[#0B1E3B] hover:border-[#2B7DE9] whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isDemo ? 'Equipe, professores por e-mail e modelos' : 'Modelos e governança'}
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 max-w-6xl w-full mx-auto">
          {!selectedStudent ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-4">
              <h1 className="font-display text-xl font-bold text-[#0B1E3B]">
                {isDemo && demoProfile?.accessRevoked
                  ? 'Acesso encerrado pela escola nesta demonstração'
                  : activeWorkspace?.type === 'school' && activeWorkspace.role === 'teacher'
                  ? 'Aguardando vínculo com estudantes desta escola'
                  : 'Comece cadastrando o primeiro estudante'}
              </h1>
              <p className="text-sm text-slate-600 max-w-lg mx-auto">
                {isDemo && demoProfile?.accessRevoked
                  ? 'O vínculo deste(a) professor(a) foi encerrado no Perfil Escola, bloqueando imediatamente estudantes, documentos e arquivos.'
                  : activeWorkspace?.type === 'school' && activeWorkspace.role === 'teacher'
                  ? 'Na escola, a coordenação autorizada libera o acesso pelo e-mail do(a) professor(a) e vincula os estudantes que ele(a) acompanha.'
                  : 'Cadastre o estudante uma única vez (aceita cadastro parcial, sem laudo) e acesse documentos, atividades e acompanhamento.'}
              </p>
              {isDemo && demoProfile?.mode === 'teacher' && (
                <button
                  type="button"
                  onClick={() => handleSwitchDemoProfile('school_admin')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0B1E3B] text-white text-sm font-semibold hover:bg-[#132D54] cursor-pointer"
                >
                  Alternar para Perfil Escola {demoProfile.accessRevoked ? '(Gerenciar acessos)' : 'e vincular estudante'}
                </button>
              )}
              {canRegisterStudent && (
                <button
                  type="button"
                  onClick={() => setShowCreateStudent(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#2B7DE9] text-white text-sm font-semibold hover:bg-[#1D6AD4] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Cadastrar estudante
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Student Profile Header + 5 Required Tabs */}
              <div className="no-print bg-white border border-slate-200 rounded-xl px-6 pt-5 pb-0">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
                  <div>
                    <h1 className="font-display text-2xl font-bold text-[#0B1E3B]">{selectedStudent.displayName}</h1>
                    <p className="text-xs text-slate-600 mt-1">
                      {[
                        selectedStudent.codeOrInitials,
                        selectedStudent.schoolName,
                        selectedStudent.gradeLevel,
                        selectedStudent.classroom,
                        selectedStudent.schoolYear ? `Ano letivo ${selectedStudent.schoolYear}` : '',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                </div>

                <nav aria-label="Abas do perfil do estudante" className="flex flex-wrap gap-1 border-t border-slate-200 pt-2">
                  {(
                    [
                      ['visao_geral', 'Visão geral'],
                      ['perfil', 'Perfil pedagógico'],
                      ['documentos', 'Documentos'],
                      ['atividades', 'Atividades e planos de aula'],
                      ['desenvolvimento', 'Desenvolvimento'],
                    ] as [ProfileTab, string][]
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setActiveTab(key);
                        setDocSubAction('none');
                      }}
                      className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                        activeTab === key
                          ? 'border-[#2B7DE9] text-[#0B1E3B]'
                          : 'border-transparent text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </nav>
              </div>

              {activeTab === 'visao_geral' && (
                <StudentOverviewTab
                  student={selectedStudent}
                  sources={sources}
                  documents={documents}
                  activities={activities}
                  applications={applications}
                  alerts={alerts}
                  isDemo={isDemo}
                  onNavigateTab={(t) => setActiveTab(t)}
                  onQuickAction={(action) => {
                    if (action === 'add_existing') {
                      setDocSubAction('add_existing');
                      setActiveTab('documentos');
                    } else if (action === 'elaborar_paee') {
                      setDocSubAction('elaborate_paee');
                      setActiveTab('documentos');
                    } else if (action === 'elaborar_pei') {
                      setDocSubAction('elaborate_pei');
                      setActiveTab('documentos');
                    } else if (action === 'gerar_atividade_pei') {
                      const pei = documents.find((d) => d.docType === 'pei');
                      const firstObj = pei?.content.peiObjectives?.[0];
                      if (pei && firstObj) {
                        setPreselectedPeiObjective({
                          docId: pei.id,
                          objectiveId: firstObj.id,
                          objectiveText: firstObj.adaptedObjective,
                          subject: firstObj.subject,
                          bimester: firstObj.bimester,
                        });
                      }
                      setActiveTab('atividades');
                    } else if (action === 'registrar_feedback') {
                      if (activities[0]) {
                        setFeedbackActivity(activities[0]);
                      } else {
                        setActiveTab('atividades');
                      }
                    }
                  }}
                  onResolveAlert={async (alertId, action) => {
                    await apiJson(`/api/alerts/${alertId}/resolve`, {
                      method: 'POST',
                      body: JSON.stringify({ action }),
                    });
                    loadStudentOverview(selectedStudent.id);
                  }}
                />
              )}

              {activeTab === 'perfil' && (
                <PedagogicalProfileTab
                  student={selectedStudent}
                  isDemo={isDemo}
                  onUpdated={(updated) => {
                    setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
                  }}
                />
              )}

              {activeTab === 'documentos' && (
                <DocumentsTab
                  student={selectedStudent}
                  sources={sources}
                  documents={documents}
                  applications={applications}
                  isDemo={isDemo}
                  aiExternalEnabled={Boolean(activeWorkspace?.aiExternalEnabled)}
                  initialSubAction={docSubAction}
                  onRefreshStudent={() =>
                    isDemo ? loadDemoState(selectedStudent.id) : loadStudentOverview(selectedStudent.id)
                  }
                  onUsePeiObjectiveInActivity={(doc, objId, objText) => {
                    setPreselectedPeiObjective({
                      docId: doc.id,
                      objectiveId: objId,
                      objectiveText: objText,
                      subject: doc.subject,
                      bimester: doc.bimester,
                    });
                    setActiveTab('atividades');
                  }}
                />
              )}

              {activeTab === 'atividades' && (
                <ActivitiesTab
                  student={selectedStudent}
                  documents={documents}
                  activities={activities}
                  isDemo={isDemo}
                  aiExternalEnabled={Boolean(activeWorkspace?.aiExternalEnabled)}
                  canToggleWorkspaceAi={Boolean(
                    activeWorkspace && (activeWorkspace.type === 'individual' || activeWorkspace.role === 'admin')
                  )}
                  onEnableWorkspaceAi={async () => {
                    if (!activeWorkspace) return;
                    if (isDemo) {
                      await apiJson('/api/demo/workspace/settings', {
                        method: 'PATCH',
                        body: JSON.stringify({ aiExternalEnabled: true }),
                      });
                      await loadDemoState(selectedStudent.id);
                    } else {
                      const res = await apiJson<{ workspaces: WorkspaceSummary[] }>(
                        `/api/workspaces/${activeWorkspace.id}/settings`,
                        {
                          method: 'PATCH',
                          body: JSON.stringify({ aiExternalEnabled: true }),
                        }
                      );
                      setWorkspaces(res.workspaces);
                    }
                  }}
                  preselectedPeiObjective={preselectedPeiObjective}
                  onActivityCreated={(created) => {
                    setActivities((prev) => [created, ...prev.filter((a) => a.id !== created.id)]);
                  }}
                  onRefreshStudent={() =>
                    isDemo ? loadDemoState(selectedStudent.id) : loadStudentOverview(selectedStudent.id)
                  }
                  onOpenFeedbackModal={(act) => setFeedbackActivity(act)}
                />
              )}

              {activeTab === 'desenvolvimento' && (
                <DevelopmentTab
                  student={selectedStudent}
                  activities={activities}
                  applications={applications}
                  onOpenFeedbackModal={(act) => setFeedbackActivity(act)}
                />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Create Student Modal */}
      {showCreateStudent && (
        <div className="fixed inset-0 z-50 bg-[#071429]/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateStudent}
            className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="font-display text-lg font-bold text-[#0B1E3B]">Cadastrar estudante</h2>
              <button type="button" onClick={() => setShowCreateStudent(false)} className="text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600">Cadastro parcial aceito. Não exige diagnóstico ou laudo.</p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nome de uso ou iniciais</label>
              <input
                type="text"
                required
                value={newStdName}
                onChange={(e) => setNewStdName(e.target.value)}
                placeholder="Ex.: Pedro H."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Código (opcional)</label>
                <input
                  type="text"
                  value={newStdCode}
                  onChange={(e) => setNewStdCode(e.target.value)}
                  placeholder="Ex.: PH-5A"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ano / Série</label>
                <input
                  type="text"
                  value={newStdGrade}
                  onChange={(e) => setNewStdGrade(e.target.value)}
                  placeholder="Ex.: 5º Ano EF"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Turma</label>
              <input
                type="text"
                value={newStdClass}
                onChange={(e) => setNewStdClass(e.target.value)}
                placeholder="Ex.: Turma A"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowCreateStudent(false)} className="px-4 py-2 rounded-lg border border-slate-300 text-sm cursor-pointer">
                Cancelar
              </button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-[#2B7DE9] text-white text-sm font-semibold cursor-pointer">
                Cadastrar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* School Admin & Templates Modal */}
      {showSchoolAdmin && activeWorkspace && (
        <SchoolAdminModal
          workspace={activeWorkspace}
          students={students}
          isDemo={isDemo}
          initialTab={schoolAdminInitialTab}
          onClose={() => setShowSchoolAdmin(false)}
          onUpdatedWorkspace={(ws) => setWorkspaces(ws)}
          onChanged={() => {
            if (isDemo) {
              loadDemoState(selectedStudentId);
            } else if (activeWorkspaceId) {
              loadWorkspaceStudents(activeWorkspaceId);
            }
          }}
        />
      )}

      {/* Feedback Modal */}
      {feedbackActivity && selectedStudent && (
        <FeedbackModal
          student={selectedStudent}
          activity={feedbackActivity}
          teacherName={user.name}
          isDemo={isDemo}
          onClose={() => setFeedbackActivity(null)}
          onSaved={() => {
            if (isDemo) {
              loadDemoState(selectedStudent.id);
            } else {
              loadStudentOverview(selectedStudent.id);
            }
          }}
        />
      )}
    </div>
  );
}
