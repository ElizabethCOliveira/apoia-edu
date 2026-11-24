import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Building2, CheckCircle2, KeyRound, ShieldCheck, UserCheck, X } from 'lucide-react';
import { apiJson } from '../api';
import type { DemoProfileMode, UserSummary, WorkspaceSummary } from '../types';

interface EntranceViewProps {
  onAuthenticated: (user: UserSummary, workspaces: WorkspaceSummary[], activeWorkspaceId?: string) => void;
  onStartDemo: (profile: DemoProfileMode) => void;
  initialResetEmail?: string;
  initialResetToken?: string;
  onClearResetRoute?: () => void;
}

type AccessMode = 'teacher' | 'school';
type AuthAction = 'login' | 'register' | 'forgot';

export const EntranceView: React.FC<EntranceViewProps> = ({
  onAuthenticated,
  onStartDemo,
  initialResetEmail = '',
  initialResetToken = '',
  onClearResetRoute,
}) => {
  const [accessMode, setAccessMode] = useState<AccessMode>('teacher');
  const [authAction, setAuthAction] = useState<AuthAction>(initialResetToken ? 'forgot' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialResetEmail);
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [organization, setOrganization] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [schoolMode, setSchoolMode] = useState<'join_invite' | 'create_school'>('join_invite');
  const [schoolName, setSchoolName] = useState('');
  const [city, setCity] = useState('');
  const [stateUf, setStateUf] = useState('SP');
  const [invitationToken, setInvitationToken] = useState('');
  const [resetToken, setResetToken] = useState(initialResetToken);
  const [newPassword, setNewPassword] = useState('');
  const [generatedResetToken, setGeneratedResetToken] = useState(initialResetToken);
  const [statusMessage, setStatusMessage] = useState(
    initialResetToken
      ? 'Convite seguro detectado. Defina abaixo sua senha pessoal de acesso ao ApoIA.Edu.'
      : ''
  );
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDemoChooser, setShowDemoChooser] = useState(false);

  useEffect(() => {
    if (initialResetToken) {
      setAuthAction('forgot');
      if (initialResetEmail) setEmail(initialResetEmail);
      setResetToken(initialResetToken);
      setGeneratedResetToken(initialResetToken);
      setStatusMessage('Convite seguro detectado. Defina abaixo sua senha pessoal de acesso ao ApoIA.Edu.');
    }
  }, [initialResetEmail, initialResetToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setStatusMessage('');
    setLoading(true);
    try {
      if (authAction === 'login') {
        const res = await apiJson<{ user: UserSummary; workspaces: WorkspaceSummary[] }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        const preferred =
          accessMode === 'school'
            ? res.workspaces.find((w) => w.type === 'school')?.id || res.workspaces[0]?.id
            : res.workspaces.find((w) => w.type === 'individual')?.id || res.workspaces[0]?.id;
        onAuthenticated(res.user, res.workspaces, preferred);
      } else if (authAction === 'register') {
        const res = await apiJson<{
          pendingApproval?: boolean;
          message?: string;
          user: UserSummary;
          workspaces: WorkspaceSummary[];
          activeWorkspaceId: string;
        }>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name,
            email,
            password,
            phone,
            organization: accessMode === 'school' && schoolMode === 'create_school' ? schoolName : organization,
            jobRole,
            accountMode: accessMode === 'school' && schoolMode === 'create_school' ? 'school_admin' : 'teacher',
            schoolName: accessMode === 'school' && schoolMode === 'create_school' ? schoolName : '',
            city,
            state: stateUf,
            invitationToken: accessMode === 'school' && schoolMode === 'join_invite' ? invitationToken : '',
          }),
        });
        if (res.pendingApproval) {
          setStatusMessage(
            res.message ||
              'Cadastro salvo na base de usuários! Conforme a regra da plataforma, seu acesso aguarda liberação pela LumiNext Tech.'
          );
          setAuthAction('login');
          setPassword('');
          return;
        }
        onAuthenticated(res.user, res.workspaces, res.activeWorkspaceId);
      } else if (authAction === 'forgot') {
        if (!generatedResetToken) {
          const res = await apiJson<{ resetToken?: string; message: string }>('/api/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email }),
          });
          setStatusMessage(res.message);
          if (res.resetToken) {
            setGeneratedResetToken(res.resetToken);
            setResetToken(res.resetToken);
          }
        } else {
          const res = await apiJson<{ message: string }>('/api/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ email, token: resetToken, newPassword }),
          });
          setStatusMessage(res.message);
          setGeneratedResetToken('');
          setResetToken('');
          setNewPassword('');
          setAuthAction('login');
          setPassword('');
          onClearResetRoute?.();
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Não foi possível concluir a solicitação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FB] text-slate-900 flex flex-col">
      {/* 3-Zone Top Bar Contract */}
      <header className="bg-white border-b border-slate-200 px-6 lg:px-10 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
          <a
            href="#topo"
            className="font-display text-lg font-bold tracking-tight text-[#0B1E3B] whitespace-nowrap shrink-0"
          >
            ApoIA.Edu · LumiNext Tech
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#fluxo" className="hover:text-[#0B1E3B] transition-colors whitespace-nowrap shrink-0">
              Fluxo pedagógico
            </a>
            <a href="#modulos" className="hover:text-[#0B1E3B] transition-colors whitespace-nowrap shrink-0">
              Módulos
            </a>
            <a href="#seguranca" className="hover:text-[#0B1E3B] transition-colors whitespace-nowrap shrink-0">
              Proteção de dados
            </a>
            <a href="#acesso" className="hover:text-[#0B1E3B] transition-colors whitespace-nowrap shrink-0">
              Acesso
            </a>
          </nav>
          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDemoChooser(true)}
              className="px-4 py-2 text-sm font-semibold text-[#0B1E3B] bg-[#FEF3C7] border border-[#F59E0B] rounded-lg hover:bg-[#FDE68A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Experimentar demonstração
            </button>
          </div>
        </div>
      </header>

      <main id="topo" className="flex-1">
        {import.meta.env.VITE_PUBLIC_DEMO === 'true' && <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 text-center text-sm text-amber-950">
          <strong>Demonstração para avaliação — somente dados fictícios.</strong> Use “Experimentar demonstração”. Alterações são temporárias e podem ser reiniciadas. Contas reais e IA externa estão desativadas.
        </div>}
        {/* Hero Split */}
        <section id="acesso" className="max-w-7xl mx-auto px-6 lg:px-10 py-10 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Access Card */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 lg:p-8 flex flex-col justify-between">
              <div>
                <p className="text-xs font-medium text-[#2B7DE9] mb-2">
                  Educação Inclusiva · AEE, PEI, PAEE e Atividades Adaptadas
                </p>
                <h1 className="font-display text-3xl lg:text-4xl font-bold text-[#0B1E3B] leading-tight text-wrap-balance mb-3">
                  Cadastre o estudante uma vez e acompanhe todo o ano letivo.
                </h1>
                <p className="text-slate-600 text-base leading-relaxed max-w-2xl mb-6">
                  Elabore e revise Estudo de Caso, PAEE e PEI preservando os modelos originais da escola, gere
                  atividades acessíveis em A4 e registre evidências reais de aplicação.
                </p>

                {/* 3 Required Entry Options */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      setAccessMode('teacher');
                      setAuthAction('login');
                      setErrorMessage('');
                    }}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      accessMode === 'teacher'
                        ? 'bg-[#0B1E3B] text-white border-[#0B1E3B]'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-[#2B7DE9]'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 shrink-0" />
                    <span className="truncate">Entrar como professor(a)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAccessMode('school');
                      setAuthAction('login');
                      setErrorMessage('');
                    }}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      accessMode === 'school'
                        ? 'bg-[#0B1E3B] text-white border-[#0B1E3B]'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-[#2B7DE9]'
                    }`}
                  >
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span className="truncate">Acessar minha escola</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDemoChooser(true)}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-[#2B7DE9] bg-[#E6F0FD] text-[#0B1E3B] text-sm font-semibold hover:bg-[#D5E6FC] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <BookOpen className="w-4 h-4 shrink-0 text-[#2B7DE9]" />
                    <span className="truncate">Experimentar demonstração</span>
                  </button>
                </div>

                {/* Auth Action Switcher */}
                <div className="flex items-center gap-4 border-b border-slate-200 pb-3 mb-5 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthAction('login');
                      setErrorMessage('');
                      setStatusMessage('');
                    }}
                    className={`font-semibold pb-1 cursor-pointer ${
                      authAction === 'login' ? 'text-[#2B7DE9] border-b-2 border-[#2B7DE9]' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Entrar com e-mail e senha
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthAction('register');
                      setErrorMessage('');
                      setStatusMessage('');
                    }}
                    className={`font-semibold pb-1 cursor-pointer ${
                      authAction === 'register' ? 'text-[#2B7DE9] border-b-2 border-[#2B7DE9]' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Criar conta
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthAction('forgot');
                      setErrorMessage('');
                      setStatusMessage('');
                    }}
                    className={`font-semibold pb-1 cursor-pointer ${
                      authAction === 'forgot' ? 'text-[#2B7DE9] border-b-2 border-[#2B7DE9]' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Recuperar senha
                  </button>
                </div>

                {errorMessage && (
                  <div role="alert" className="mb-4 p-3 rounded-lg border border-red-300 bg-red-50 text-red-900 text-sm">
                    {errorMessage}
                  </div>
                )}
                {statusMessage && (
                  <div role="status" className="mb-4 p-3 rounded-lg border border-[#2B7DE9] bg-[#E6F0FD] text-[#0B1E3B] text-sm">
                    <p>{statusMessage}</p>
                    {generatedResetToken && (
                      <p className="mt-1 font-mono text-xs font-semibold">
                        Código de recuperação desta sessão: {generatedResetToken}
                      </p>
                    )}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {authAction === 'register' && (
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="auth-name" className="block text-sm font-medium text-slate-700 mb-1">
                          Nome completo do(a) profissional
                        </label>
                        <input
                          id="auth-name"
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Ex.: Prof.ª Ana Beatriz Silva"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:border-[#2B7DE9]"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label htmlFor="auth-phone" className="block text-xs font-medium text-slate-700 mb-1">
                            Telefone / WhatsApp
                          </label>
                          <input
                            id="auth-phone"
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="(11) 99999-0000"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:border-[#2B7DE9]"
                          />
                        </div>
                        <div>
                          <label htmlFor="auth-org" className="block text-xs font-medium text-slate-700 mb-1">
                            Escola / Instituição
                          </label>
                          <input
                            id="auth-org"
                            type="text"
                            value={organization}
                            onChange={(e) => setOrganization(e.target.value)}
                            placeholder="Ex.: E.M. Horizonte"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:border-[#2B7DE9]"
                          />
                        </div>
                        <div>
                          <label htmlFor="auth-job" className="block text-xs font-medium text-slate-700 mb-1">
                            Cargo / Função
                          </label>
                          <input
                            id="auth-job"
                            type="text"
                            value={jobRole}
                            onChange={(e) => setJobRole(e.target.value)}
                            placeholder="Ex.: Docente / AEE"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:border-[#2B7DE9]"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="auth-email" className="block text-sm font-medium text-slate-700 mb-1">
                        E-mail institucional ou pessoal
                      </label>
                      <input
                        id="auth-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nome@escola.edu.br"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:border-[#2B7DE9]"
                      />
                    </div>

                    {authAction !== 'forgot' && (
                      <div>
                        <label htmlFor="auth-pass" className="block text-sm font-medium text-slate-700 mb-1">
                          Senha (mínimo 6 caracteres)
                        </label>
                        <input
                          id="auth-pass"
                          type="password"
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:border-[#2B7DE9]"
                        />
                      </div>
                    )}
                  </div>

                  {authAction === 'register' && accessMode === 'school' && (
                    <div className="p-4 rounded-lg border border-slate-200 bg-[#F6F8FB] space-y-3">
                      <div className="flex flex-wrap gap-3 text-sm">
                        <label className="flex items-center gap-2 cursor-pointer font-medium">
                          <input
                            type="radio"
                            name="schoolMode"
                            checked={schoolMode === 'join_invite'}
                            onChange={() => setSchoolMode('join_invite')}
                          />
                          Tenho convite da minha escola
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer font-medium">
                          <input
                            type="radio"
                            name="schoolMode"
                            checked={schoolMode === 'create_school'}
                            onChange={() => setSchoolMode('create_school')}
                          />
                          Sou pessoa autorizada (criar espaço da escola)
                        </label>
                      </div>

                      {schoolMode === 'join_invite' ? (
                        <div className="space-y-1.5">
                          <label htmlFor="invite-token" className="block text-xs font-medium text-slate-700">
                            Código de convite institucional (opcional se a escola já liberou seu e-mail acima)
                          </label>
                          <input
                            id="invite-token"
                            type="text"
                            value={invitationToken}
                            onChange={(e) => setInvitationToken(e.target.value)}
                            placeholder="Ex.: CONV-A1B2C3D4 (ou deixe vazio se seu e-mail já foi liberado)"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white font-mono"
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <label htmlFor="school-name" className="block text-xs font-medium text-slate-700 mb-1">
                              Nome da escola
                            </label>
                            <input
                              id="school-name"
                              type="text"
                              required
                              value={schoolName}
                              onChange={(e) => setSchoolName(e.target.value)}
                              placeholder="Ex.: E.E. Paulo Freire"
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                            />
                          </div>
                          <div>
                            <label htmlFor="school-city" className="block text-xs font-medium text-slate-700 mb-1">
                              Município / UF
                            </label>
                            <input
                              id="school-city"
                              type="text"
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              placeholder="Campinas / SP"
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {authAction === 'forgot' && generatedResetToken && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="reset-code" className="block text-sm font-medium text-slate-700 mb-1">
                          Código de recuperação
                        </label>
                        <input
                          id="reset-code"
                          type="text"
                          required
                          value={resetToken}
                          onChange={(e) => setResetToken(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-mono bg-white"
                        />
                      </div>
                      <div>
                        <label htmlFor="new-pass" className="block text-sm font-medium text-slate-700 mb-1">
                          Nova senha
                        </label>
                        <input
                          id="new-pass"
                          type="password"
                          required
                          minLength={6}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    <button
                      type="submit"
                      disabled={loading || import.meta.env.VITE_PUBLIC_DEMO === 'true'}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#2B7DE9] hover:bg-[#1D6AD4] text-white font-semibold text-sm transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {authAction === 'login' && (accessMode === 'school' ? 'Acessar minha escola' : 'Entrar como professor(a)')}
                      {authAction === 'register' && 'Salvar cadastro e solicitar acesso'}
                      {authAction === 'forgot' && (generatedResetToken ? 'Redefinir senha' : 'Gerar código de recuperação')}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-slate-500 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-[#0B1E3B]" />
                      Acesso liberado mediante autorização da LumiNext Tech
                    </span>
                  </div>
                </form>
              </div>
            </div>

            {/* Right Editorial Classroom Image */}
            <div className="lg:col-span-5 relative rounded-xl overflow-hidden border border-slate-200 bg-[#0B1E3B] min-h-[340px]">
              <img
                src="/src/assets/images/apoia_entrance_hero_1794920560578.jpg"
                alt="Sala de recursos multifuncionais em escola brasileira com materiais táteis e acompanhamento docente"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071429]/90 via-[#071429]/30 to-transparent flex flex-col justify-end p-6 text-white">
                <p className="text-xs font-medium text-[#FACC15] mb-1">LumiNext Tech · Educação Inclusiva</p>
                <p className="font-display text-lg font-semibold leading-snug">
                  Preservação fiel de DOCX e XLSX institucionais com revisão humana obrigatória.
                </p>
                <p className="text-xs text-slate-200 mt-2">
                  Teste imediatamente na demonstração isolada por sessão sem necessidade de cadastro prévio.
                </p>
              </div>
            </div>
          </div>

          {/* 4-column workflow strip below hero */}
          <div id="fluxo" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {[
              {
                step: '01. Cadastrar',
                title: 'Perfil pedagógico único',
                desc: 'Aceita cadastro parcial sem exigir diagnóstico ou laudo médico.',
              },
              {
                step: '02. Elaborar e revisar',
                title: 'Estudo de Caso, PAEE e PEI',
                desc: 'Diferencia informação documentada, relato, observação e sugestão pedagógica.',
              },
              {
                step: '03. Aplicar em sala',
                title: 'Atividades A4 e Planos DUA',
                desc: 'Exportação editável em DOCX e páginas legíveis em JPEG com apoio do PAEE e PEI.',
              },
              {
                step: '04. Acompanhar',
                title: 'Linha do tempo por objetivo',
                desc: 'Registre aplicações reais para embasar revisões bimestrais sem inferências.',
              },
            ].map((item) => (
              <div key={item.step} className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-xs font-mono font-semibold text-[#2B7DE9] mb-1">{item.step}</p>
                <h2 className="font-display text-base font-bold text-[#0B1E3B] mb-1.5">{item.title}</h2>
                <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Modules & Security summary */}
          <div id="modulos" className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="font-display text-lg font-bold text-[#0B1E3B] mb-3">Módulos integrados com autonomia</h2>
              <ul className="space-y-2.5 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2B7DE9] shrink-0 mt-0.5" />
                  <span>Anexe um PAEE, Estudo de Caso ou PEI já existente sem precisar refazer documentos.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2B7DE9] shrink-0 mt-0.5" />
                  <span>Preencha cópias fiéis de DOCX e XLSX preservando fórmulas, mesclagens, tabelas e assinaturas.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2B7DE9] shrink-0 mt-0.5" />
                  <span>Gere atividades com ou sem PEI prévio, respeitando Braille, Libras e etapas de alfabetização.</span>
                </li>
              </ul>
            </div>

            <div id="seguranca" className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="font-display text-lg font-bold text-[#0B1E3B] mb-3 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#2B7DE9]" />
                Proteção de dados escolares e governança
              </h2>
              <ul className="space-y-2.5 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0B1E3B] shrink-0 mt-0.5" />
                  <span>Permissões verificadas no servidor, no banco de dados e no download privado de anexos.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0B1E3B] shrink-0 mt-0.5" />
                  <span>Ao encerrar um vínculo escolar, o acesso a estudantes e arquivos antigos é bloqueado imediatamente.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0B1E3B] shrink-0 mt-0.5" />
                  <span>Envio de dados reais à IA externa desabilitado por padrão até autorização institucional.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-slate-200 px-6 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <span>ApoIA.Edu — Ferramentas de Inteligência Artificial para a Educação Inclusiva · LumiNext Tech</span>
          <span>Português do Brasil · Revisão humana institucional</span>
        </div>
      </footer>

      {showDemoChooser && (
        <div className="fixed inset-0 z-50 bg-[#071429]/65 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl p-6 space-y-5 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0B1E3B]">
                  Experimentar demonstração · Escolha o perfil de acesso
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Dados inteiramente fictícios e isolados nesta sessão. Você poderá alternar entre os dois perfis a qualquer momento dentro da demonstração.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDemoChooser(false)}
                aria-label="Fechar"
                className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-xl p-5 bg-[#F6F8FB] flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[#0B1E3B]">
                    <Building2 className="w-5 h-5 text-[#2B7DE9]" />
                    <h3 className="font-display text-base font-bold">Perfil Escola (Coordenação)</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Visualize todos os estudantes da escola, <strong>adicione professores liberando acesso pelo e-mail</strong>, vincule docentes aos estudantes, encerre acessos e gerencie modelos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowDemoChooser(false);
                    onStartDemo('school_admin');
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0B1E3B] hover:bg-[#132D54] text-white text-sm font-semibold cursor-pointer"
                >
                  Entrar como Perfil Escola
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="border border-[#2B7DE9]/40 rounded-xl p-5 bg-[#E6F0FD]/50 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[#0B1E3B]">
                    <UserCheck className="w-5 h-5 text-[#2B7DE9]" />
                    <h3 className="font-display text-base font-bold">Perfil Professor(a)</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Simule o acesso de um docente liberado pela escola: veja apenas os estudantes vinculados ao seu e-mail, anexe PAEE/Estudo de Caso, gere atividades e registre feedbacks.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowDemoChooser(false);
                    onStartDemo('teacher');
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#2B7DE9] hover:bg-[#1D6AD4] text-white text-sm font-semibold cursor-pointer"
                >
                  Entrar como Perfil Professor(a)
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
