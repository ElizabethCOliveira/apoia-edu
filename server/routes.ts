import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Express, Request, Response } from 'express';
import multer from 'multer';
import {
  type AuthedRequest,
  checkStudentPermission,
  clearSessionCookie,
  createIndividualWorkspaceForUser,
  createSchoolWorkspaceForUser,
  createSession,
  getUserWorkspaces,
  getWorkspaceMembership,
  hashPassword,
  isUserAccessActive,
  loadOptionalUser,
  recordAdminAudit,
  requireLuminextAdmin,
  requireUser,
  setSessionCookie,
  verifyPassword,
} from './auth.ts';
import { generateAdaptedActivityOrPlan, generateDocumentDraft } from './aiEngine.ts';
import { db, GENERATED_DIR, newId, safeResolveStoragePath, UPLOADS_DIR } from './db.ts';
import {
  canDemoAccessStudent,
  endDemoSession,
  getActiveDemoUser,
  getOrCreateDemoSession,
  getVisibleDemoStudents,
} from './demo.ts';
import { buildActivityDocx, extractSourceContent, fillDocxTemplate, fillXlsxTemplate } from './docEngine.ts';
import {
  buildSampleCurriculumDocx,
  buildSampleEstudoDeCasoTemplateDocx,
  buildSampleFormsResponseDocx,
  buildSamplePaeeTemplateDocx,
  buildSamplePeiTemplateXlsx,
} from './sampleTemplates.ts';
import type {
  AdminAuditLogRecord,
  ApplicationFeedback,
  DocType,
  DocumentContentPayload,
  LuminextUserRecord,
  PedagogicalActivity,
  PedagogicalDocument,
  SourceRecord,
  Student,
  StudentTransferRecord,
  UpdateAlert,
  UserAccessStatus,
  UserAccountType,
} from '../src/types.ts';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

function rowToStudent(r: any): Student {
  return {
    id: r.id,
    workspaceId: r.workspace_id,
    createdByUserId: r.created_by_user_id,
    displayName: r.display_name,
    codeOrInitials: r.code_or_initials,
    schoolName: r.school_name,
    schoolYear: r.school_year,
    gradeLevel: r.grade_level,
    classroom: r.classroom,
    strengths: r.strengths,
    interests: r.interests,
    learningLevel: r.learning_level,
    communicationModes: r.communication_modes,
    barriers: r.barriers,
    workingStrategies: r.working_strategies,
    accessibilityResources: r.accessibility_resources,
    latestPedagogicalEval: r.latest_pedagogical_eval,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToSource(r: any): SourceRecord {
  let parsedStructure = null;
  try {
    parsedStructure = r.parsed_structure_json ? JSON.parse(r.parsed_structure_json) : null;
  } catch {
    parsedStructure = null;
  }
  return {
    id: r.id,
    studentId: r.student_id,
    workspaceId: r.workspace_id,
    uploadedByUserId: r.uploaded_by_user_id,
    sourceKind: r.source_kind,
    docCategory: r.doc_category,
    title: r.title,
    subject: r.subject,
    schoolYear: r.school_year,
    bimester: r.bimester,
    authorName: r.author_name,
    informedDate: r.informed_date,
    versionNumber: r.version_number,
    status: r.status,
    supersedesSourceId: r.supersedes_source_id,
    originalFilename: r.original_filename,
    mimeType: r.mime_type,
    fileExt: r.file_ext,
    extractedText: r.extracted_text,
    parsedStructure,
    isEditableTemplate: r.is_editable_template === 1,
    createdAt: r.created_at,
  };
}

function rowToDocument(r: any): PedagogicalDocument {
  return {
    id: r.id,
    studentId: r.student_id,
    workspaceId: r.workspace_id,
    docType: r.doc_type,
    title: r.title,
    subject: r.subject,
    gradeLevel: r.grade_level,
    schoolYear: r.school_year,
    bimester: r.bimester,
    authorName: r.author_name,
    informedDate: r.informed_date,
    versionNumber: r.version_number,
    status: r.status,
    sourceIds: JSON.parse(r.source_ids_json || '[]'),
    templateSourceId: r.template_source_id,
    content: JSON.parse(r.content_json || '{}'),
    hasOutputFile: Boolean(r.output_file_path),
    outputFileExt: r.output_file_ext,
    previousVersionId: r.previous_version_id,
    reviewedByName: r.reviewed_by_name,
    reviewedAt: r.reviewed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToActivity(r: any): PedagogicalActivity {
  return {
    id: r.id,
    studentId: r.student_id,
    workspaceId: r.workspace_id,
    kind: r.kind,
    title: r.title,
    subject: r.subject,
    theme: r.theme,
    bimester: r.bimester,
    schoolYear: r.school_year,
    durationMinutes: r.duration_minutes,
    literacyStage: r.literacy_stage,
    accessibilityMode: r.accessibility_mode,
    peiDocumentId: r.pei_document_id,
    peiObjectiveId: r.pei_objective_id,
    peiObjectiveText: r.pei_objective_text,
    paeeDocumentId: r.paee_document_id,
    paeeSupportUsed: r.paee_support_used,
    versionNumber: r.version_number,
    content: JSON.parse(r.content_json || '{}'),
    createdByUserId: r.created_by_user_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToApplication(r: any): ApplicationFeedback {
  return {
    id: r.id,
    activityId: r.activity_id,
    studentId: r.student_id,
    workspaceId: r.workspace_id,
    activityVersion: r.activity_version,
    activityTitle: r.activity_title,
    subject: r.subject,
    bimester: r.bimester,
    schoolYear: r.school_year,
    teacherId: r.teacher_id,
    teacherName: r.teacher_name,
    objectiveText: r.objective_text,
    appliedDate: r.applied_date,
    status: r.status,
    participation: r.participation,
    objectiveStatus: r.objective_status,
    supportLevel: r.support_level,
    helpfulResource: r.helpful_resource,
    briefObservation: r.brief_observation,
    nextStep: r.next_step,
    createdAt: r.created_at,
  };
}

export function registerApiRoutes(app: Express): void {
  app.use(loadOptionalUser);

  // ==================== AUTHENTICATION ====================
  app.post('/api/auth/register', (req: Request, res: Response) => {
    try {
      const {
        name,
        email,
        password,
        phone,
        organization,
        jobRole,
        accountMode,
        schoolName,
        city,
        state,
        invitationToken,
      } = req.body || {};
      if (!name || !email || !password || String(password).length < 6) {
        res.status(400).json({ error: 'Informe nome completo, e-mail válido e senha com ao menos 6 caracteres.' });
        return;
      }
      const normEmail = String(email).trim().toLowerCase();
      const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(normEmail);
      if (existing) {
        res.status(409).json({ error: 'Já existe uma conta cadastrada com este e-mail.' });
        return;
      }

      const preAuth = db
        .prepare(`SELECT * FROM luminext_pre_authorizations WHERE LOWER(email) = ?`)
        .get(normEmail) as any;

      const userId = newId('usr');
      const { hash, salt } = hashPassword(String(password));
      const now = new Date().toISOString();
      const accountType: UserAccountType =
        preAuth?.account_type === 'school_admin' || accountMode === 'school_admin'
          ? 'school_admin'
          : 'teacher';
      const accessStatus: UserAccessStatus = preAuth ? 'liberado' : 'pendente';
      const orgValue = String(organization || schoolName || preAuth?.organization || '').trim();
      const roleValue = String(jobRole || preAuth?.job_role || '').trim();
      const phoneValue = String(phone || '').trim();

      db.prepare(
        `INSERT INTO users (
           id, name, email, password_hash, salt, phone, organization, job_role,
           account_type, access_status, approved_by, approved_at, notes, updated_at, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        userId,
        String(name).trim(),
        normEmail,
        hash,
        salt,
        phoneValue,
        orgValue,
        roleValue,
        accountType,
        accessStatus,
        preAuth ? preAuth.authorized_by || 'LumiNext Tech' : '',
        preAuth ? now : null,
        preAuth?.notes || '',
        now,
        now
      );

      if (preAuth) {
        db.prepare(`DELETE FROM luminext_pre_authorizations WHERE id = ?`).run(preAuth.id);
      }

      // Every teacher gets a private individual workspace by default
      const individualWsId = createIndividualWorkspaceForUser(userId, String(name).trim());
      let activeWorkspaceId = individualWsId;

      if (accountMode === 'school_admin' && schoolName && String(schoolName).trim()) {
        activeWorkspaceId = createSchoolWorkspaceForUser(
          userId,
          String(schoolName).trim(),
          String(city || ''),
          String(state || '')
        );
      }

      // Accept explicit invitation by token or by pre-authorized exact teacher email (never by domain or school name!)
      if (invitationToken && String(invitationToken).trim()) {
        const inv = db
          .prepare(
            `SELECT * FROM workspace_invitations WHERE token = ? AND LOWER(email) = ? AND status = 'pending'`
          )
          .get(String(invitationToken).trim(), normEmail) as any;
        if (inv) {
          db.prepare(
            `INSERT INTO workspace_members (id, workspace_id, user_id, role, status, invited_by, created_at)
             VALUES (?, ?, ?, ?, 'active', ?, ?)
             ON CONFLICT(workspace_id, user_id) DO UPDATE SET status='active', role=excluded.role, revoked_at=NULL`
          ).run(newId('wm'), inv.workspace_id, userId, inv.role, inv.invited_by, now);
          db.prepare(`UPDATE workspace_invitations SET status = 'accepted' WHERE id = ?`).run(inv.id);
          activeWorkspaceId = inv.workspace_id;
        }
      } else {
        const pendingByEmail = db
          .prepare(`SELECT * FROM workspace_invitations WHERE LOWER(email) = ? AND status = 'pending'`)
          .all(normEmail) as any[];
        for (const inv of pendingByEmail) {
          db.prepare(
            `INSERT INTO workspace_members (id, workspace_id, user_id, role, status, invited_by, created_at)
             VALUES (?, ?, ?, ?, 'active', ?, ?)
             ON CONFLICT(workspace_id, user_id) DO UPDATE SET status='active', role=excluded.role, revoked_at=NULL`
          ).run(newId('wm'), inv.workspace_id, userId, inv.role, inv.invited_by, now);
          db.prepare(`UPDATE workspace_invitations SET status = 'accepted' WHERE id = ?`).run(inv.id);
          if (activeWorkspaceId === individualWsId) {
            activeWorkspaceId = inv.workspace_id;
          }
        }
      }

      const userPayload = {
        id: userId,
        name: String(name).trim(),
        email: normEmail,
        phone: phoneValue,
        organization: orgValue,
        jobRole: roleValue,
        accountType,
        accessStatus,
        contractStartDate: '',
        contractEndDate: '',
        lastLoginAt: accessStatus === 'liberado' ? now : null,
      };

      if (accessStatus !== 'liberado') {
        res.status(201).json({
          pendingApproval: true,
          accessStatus,
          user: userPayload,
          workspaces: [],
          activeWorkspaceId: '',
          message:
            'Seus dados foram salvos com sucesso. Conforme a regra da plataforma, seu acesso aguarda liberação pela equipe da LumiNext Tech.',
        });
        return;
      }

      db.prepare(`UPDATE users SET last_login_at = ? WHERE id = ?`).run(now, userId);
      const { token } = createSession(userId);
      setSessionCookie(res, token);

      res.status(201).json({
        pendingApproval: false,
        accessStatus,
        user: userPayload,
        workspaces: getUserWorkspaces(userId),
        activeWorkspaceId,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erro ao cadastrar conta.' });
    }
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ error: 'Informe e-mail e senha.' });
      return;
    }
    const normEmail = String(email).trim().toLowerCase();
    const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(normEmail) as any;
    if (!user || !verifyPassword(String(password), user.password_hash, user.salt)) {
      res.status(401).json({ error: 'E-mail ou senha inválidos.' });
      return;
    }
    if (user.access_status === 'pendente') {
      res.status(403).json({
        error: 'Seu cadastro está salvo, mas o acesso ainda aguarda liberação pela LumiNext Tech.',
        accessStatus: 'pendente',
      });
      return;
    }
    if (user.access_status === 'suspenso') {
      res.status(403).json({
        error: 'Acesso temporariamente suspenso pela LumiNext Tech.',
        accessStatus: 'suspenso',
      });
      return;
    }
    if (user.access_status === 'bloqueado') {
      res.status(403).json({
        error: 'Acesso bloqueado pela LumiNext Tech.',
        accessStatus: 'bloqueado',
      });
      return;
    }
    if (!isUserAccessActive(user.access_status, user.contract_end_date)) {
      res.status(403).json({
        error: 'O período de vigência contratual desta conta expirou. Contate a equipe da LumiNext Tech.',
        accessStatus: user.access_status,
      });
      return;
    }

    const now = new Date().toISOString();
    db.prepare(`UPDATE users SET last_login_at = ? WHERE id = ?`).run(now, user.id);

    const { token } = createSession(user.id);
    setSessionCookie(res, token);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        organization: user.organization,
        jobRole: user.job_role,
        accountType: user.account_type,
        accessStatus: user.access_status,
        contractStartDate: user.contract_start_date || '',
        contractEndDate: user.contract_end_date || '',
        lastLoginAt: now,
      },
      workspaces: getUserWorkspaces(user.id),
    });
  });

  app.post('/api/auth/logout', (req: AuthedRequest, res: Response) => {
    if (req.sessionToken) {
      db.prepare(`DELETE FROM sessions WHERE id = ?`).run(req.sessionToken);
    }
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
      res.status(503).json({ error: 'Recuperação por e-mail ainda não configurada. Contate a administração.' });
      return;
    }
    const { email } = req.body || {};
    if (!email) {
      res.status(400).json({ error: 'Informe o e-mail cadastrado.' });
      return;
    }
    const normEmail = String(email).trim().toLowerCase();
    const user = db.prepare(`SELECT id FROM users WHERE email = ?`).get(normEmail) as { id: string } | undefined;
    if (!user) {
      // Do not leak user existence silently, but allow clean message
      res.json({
        ok: true,
        deliveryMode: 'smtp_unconfigured',
        message: 'Se o e-mail existir, um código de recuperação foi gerado.',
      });
      return;
    }

    const token = crypto.randomBytes(4).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    db.prepare(
      `INSERT INTO password_resets (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)`
    ).run(newId('rst'), user.id, token, expiresAt, new Date().toISOString());

    res.json({
      ok: true,
      deliveryMode: 'local_preview',
      resetToken: token,
      message:
        'Código de recuperação gerado. Observação: o envio automático por e-mail depende de servidor SMTP externo; utilize o código exibido nesta sessão para concluir a redefinição.',
    });
  });

  app.post('/api/auth/reset-password', (req: Request, res: Response) => {
    const { email, token, newPassword } = req.body || {};
    if (!email || !token || !newPassword || String(newPassword).length < 6) {
      res.status(400).json({ error: 'Informe e-mail, código de convite/recuperação e nova senha (mínimo 6 caracteres).' });
      return;
    }
    const normEmail = String(email).trim().toLowerCase();
    const user = db.prepare(`SELECT id FROM users WHERE email = ?`).get(normEmail) as { id: string } | undefined;
    if (!user) {
      res.status(400).json({ error: 'Código inválido ou expirado.' });
      return;
    }
    const row = db
      .prepare(`SELECT * FROM password_resets WHERE user_id = ? AND UPPER(token) = ? AND used_at IS NULL`)
      .get(user.id, String(token).trim().toUpperCase()) as any;
    if (!row || new Date(row.expires_at).getTime() < Date.now()) {
      res.status(400).json({ error: 'Código inválido ou expirado.' });
      return;
    }
    const now = new Date().toISOString();
    const { hash, salt } = hashPassword(String(newPassword));
    db.prepare(`UPDATE users SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?`).run(hash, salt, now, user.id);
    db.prepare(`UPDATE password_resets SET used_at = ? WHERE id = ?`).run(now, row.id);
    db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(user.id);
    res.json({ ok: true, message: 'Senha definida com sucesso. Faça login com seu e-mail e nova senha.' });
  });

  app.get('/api/auth/me', (req: AuthedRequest, res: Response) => {
    if (!req.user) {
      res.json({ authenticated: false, user: null, workspaces: [], pendingInvitations: [] });
      return;
    }
    const pendingInvitations = db
      .prepare(
        `SELECT i.id, i.workspace_id, w.name AS workspace_name, i.email, i.role, i.token, i.status, i.created_at
         FROM workspace_invitations i
         JOIN workspaces w ON w.id = i.workspace_id
         WHERE LOWER(i.email) = ? AND i.status = 'pending'`
      )
      .all(req.user.email.toLowerCase())
      .map((r: any) => ({
        id: r.id,
        workspaceId: r.workspace_id,
        workspaceName: r.workspace_name,
        email: r.email,
        role: r.role,
        token: r.token,
        status: r.status,
        createdAt: r.created_at,
      }));

    res.json({
      authenticated: true,
      user: req.user,
      workspaces: getUserWorkspaces(req.user.id),
      pendingInvitations,
    });
  });

  // ==================== USER PROFILE & LUMINEXT ADMIN API (/api/admin/*) ====================
  // LGPD: Administrative routes operate exclusively on users, workspaces metadata, password_resets and admin_audit_logs.
  // They NEVER query or expose student records, documents, sources or pedagogical activities.
  const mapLuminextUser = (r: any): LuminextUserRecord => {
    const wsRows = db
      .prepare(
        `SELECT w.name, w.type
         FROM workspace_members wm
         JOIN workspaces w ON w.id = wm.workspace_id
         WHERE wm.user_id = ? AND wm.status = 'active'`
      )
      .all(r.id) as { name: string; type: string }[];
    return {
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone || '',
      organization: r.organization || '',
      jobRole: r.job_role || '',
      accountType: (r.account_type || 'teacher') as UserAccountType,
      accessStatus: (r.access_status || 'pendente') as UserAccessStatus,
      contractStartDate: r.contract_start_date || '',
      contractEndDate: r.contract_end_date || '',
      lastLoginAt: r.last_login_at || null,
      approvedBy: r.approved_by || '',
      approvedAt: r.approved_at || null,
      notes: r.notes || '',
      createdAt: r.created_at,
      updatedAt: r.updated_at || r.created_at,
      workspacesCount: wsRows.length,
      schoolNames: wsRows.filter((w) => w.type === 'school').map((w) => w.name),
    };
  };

  const mapAuditLog = (r: any): AdminAuditLogRecord => ({
    id: r.id,
    adminUserId: r.admin_user_id,
    adminEmail: r.admin_email,
    action: r.action,
    targetUserId: r.target_user_id,
    targetEmail: r.target_email,
    details: r.details,
    createdAt: r.created_at,
  });

  const buildBaseAppUrl = (req: Request): string => {
    const envUrl = (process.env.APP_URL || '').trim().replace(/\/+$/, '');
    if (envUrl && envUrl !== 'MY_APP_URL') return envUrl;
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
    const host = req.get('host') || 'localhost:3000';
    return `${proto}://${host}`;
  };

  const normalizeAdminInputStatus = (raw?: string): UserAccessStatus => {
    if (raw === 'bloqueado') return 'bloqueado';
    if (raw === 'suspenso') return 'suspenso';
    if (raw === 'pendente') return 'pendente';
    if (raw === 'liberado') return 'liberado';
    return 'ativo';
  };

  const normalizeAdminInputRole = (
    roleType?: string,
    accountType?: string,
    jobRole?: string
  ): { accountType: UserAccountType; resolvedJobRole: string } => {
    const cleanJob = String(jobRole || '').trim();
    if (accountType === 'luminext_admin') {
      return { accountType: 'luminext_admin', resolvedJobRole: cleanJob || 'Administrador(a) LumiNext Tech' };
    }
    if (roleType === 'gestor_escolar' || accountType === 'school_admin') {
      return { accountType: 'school_admin', resolvedJobRole: cleanJob || 'Gestor(a) Escolar' };
    }
    if (roleType === 'outro') {
      return { accountType: 'teacher', resolvedJobRole: cleanJob || 'Outro perfil escolar' };
    }
    return { accountType: 'teacher', resolvedJobRole: cleanJob || 'Professor(a)' };
  };

  app.get('/api/users/me', requireUser, (req: AuthedRequest, res: Response) => {
    const row = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user!.id);
    if (!row) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    res.json({ user: mapLuminextUser(row) });
  });

  app.patch('/api/users/me', requireUser, (req: AuthedRequest, res: Response) => {
    const { name, phone, organization, jobRole } = req.body || {};
    const existing = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user!.id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE users
       SET name = ?, phone = ?, organization = ?, job_role = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      name !== undefined && String(name).trim() ? String(name).trim() : existing.name,
      phone !== undefined ? String(phone).trim() : existing.phone,
      organization !== undefined ? String(organization).trim() : existing.organization,
      jobRole !== undefined ? String(jobRole).trim() : existing.job_role,
      now,
      req.user!.id
    );
    const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user!.id);
    res.json({ user: mapLuminextUser(updated) });
  });

  // Public check only reveals whether an initial admin exists (no credentials or public setup allowed!)
  app.get('/api/luminext/status', (_req: Request, res: Response) => {
    const row = db
      .prepare(
        `SELECT COUNT(*) AS cnt FROM users WHERE account_type = 'luminext_admin' AND access_status IN ('ativo', 'liberado')`
      )
      .get() as { cnt: number };
    res.json({
      hasMasterAdmin: row.cnt > 0,
      luminextApprovalRequired: true,
    });
  });

  // Exclusive /api/admin/* endpoints protected strictly by requireLuminextAdmin
  app.get('/api/admin/dashboard', requireLuminextAdmin, (req: AuthedRequest, res: Response) => {
    const statusFilter = typeof req.query.status === 'string' ? req.query.status : '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const allRows = db.prepare(`SELECT * FROM users ORDER BY created_at DESC`).all() as any[];

    const today = new Date().toISOString().slice(0, 10);
    const soonDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const thirtyDaysAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const kpis = {
      totalUsers: allRows.length,
      schoolManagersCount: allRows.filter((r) => r.account_type === 'school_admin').length,
      teachersCount: allRows.filter((r) => r.account_type === 'teacher').length,
      adminsCount: allRows.filter((r) => r.account_type === 'luminext_admin').length,
      activeUsers: allRows.filter((r) => isUserAccessActive(r.access_status, r.contract_end_date)).length,
      blockedUsers: allRows.filter((r) => r.access_status === 'bloqueado').length,
      suspendedUsers: allRows.filter((r) => r.access_status === 'suspenso').length,
      pendingUsers: allRows.filter((r) => r.access_status === 'pendente').length,
      expiredUsers: allRows.filter(
        (r) => Boolean(r.contract_end_date) && String(r.contract_end_date) < today
      ).length,
      expiringSoonUsers: allRows.filter(
        (r) =>
          Boolean(r.contract_end_date) &&
          String(r.contract_end_date) >= today &&
          String(r.contract_end_date) <= soonDate
      ).length,
      newUsersLast30Days: allRows.filter((r) => new Date(r.created_at).getTime() >= thirtyDaysAgoMs).length,
    };

    let filtered = allRows;
    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'ativo') {
        filtered = filtered.filter((r) => r.access_status === 'ativo' || r.access_status === 'liberado');
      } else {
        filtered = filtered.filter((r) => r.access_status === statusFilter);
      }
    }
    if (q) {
      filtered = filtered.filter(
        (r) =>
          String(r.name).toLowerCase().includes(q) ||
          String(r.email).toLowerCase().includes(q) ||
          String(r.organization || '').toLowerCase().includes(q) ||
          String(r.job_role || '').toLowerCase().includes(q)
      );
    }

    const auditLogs = db
      .prepare(`SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT 80`)
      .all()
      .map(mapAuditLog);

    res.json({
      kpis,
      users: filtered.map(mapLuminextUser),
      auditLogs,
    });
  });

  app.get('/api/admin/users/:userId', requireLuminextAdmin, (req: AuthedRequest, res: Response) => {
    const row = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.params.userId);
    if (!row) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    const auditLogs = db
      .prepare(`SELECT * FROM admin_audit_logs WHERE target_user_id = ? ORDER BY created_at DESC LIMIT 30`)
      .all(req.params.userId)
      .map(mapAuditLog);
    res.json({ user: mapLuminextUser(row), auditLogs });
  });

  app.post('/api/admin/users', requireLuminextAdmin, (req: AuthedRequest, res: Response) => {
    const {
      name,
      email,
      phone,
      organization,
      roleType,
      jobRole,
      accountType,
      status,
      accessStatus,
      contractStartDate,
      contractEndDate,
      notes,
    } = req.body || {};

    if (!name || !String(name).trim() || !email || !String(email).trim()) {
      res.status(400).json({ error: 'Informe nome completo e e-mail válido para cadastrar o usuário.' });
      return;
    }

    const normEmail = String(email).trim().toLowerCase();
    const existing = db.prepare(`SELECT id FROM users WHERE LOWER(email) = ?`).get(normEmail);
    if (existing) {
      res.status(409).json({ error: 'Já existe um usuário cadastrado com este e-mail.' });
      return;
    }

    const cleanStart = String(contractStartDate || '').trim();
    const cleanEnd = String(contractEndDate || '').trim();
    if (cleanStart && cleanEnd && cleanEnd < cleanStart) {
      res.status(400).json({ error: 'A data de expiração não pode ser anterior à data de contrato.' });
      return;
    }

    const { accountType: validType, resolvedJobRole } = normalizeAdminInputRole(roleType, accountType, jobRole);
    const validStatus = normalizeAdminInputStatus(status || accessStatus);

    // Never store plaintext or default passwords: generate high-entropy placeholder hash + one-time secure invite token
    const unguessableSecret = crypto.randomBytes(32).toString('hex');
    const { hash, salt } = hashPassword(unguessableSecret);
    const userId = newId('usr');
    const now = new Date().toISOString();
    const actor = req.user!.email;

    db.prepare(
      `INSERT INTO users (
         id, name, email, password_hash, salt, phone, organization, job_role,
         account_type, access_status, approved_by, approved_at, notes,
         contract_start_date, contract_end_date, updated_at, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      userId,
      String(name).trim(),
      normEmail,
      hash,
      salt,
      String(phone || '').trim(),
      String(organization || '').trim(),
      resolvedJobRole,
      validType,
      validStatus,
      isUserAccessActive(validStatus, cleanEnd) ? actor : '',
      isUserAccessActive(validStatus, cleanEnd) ? now : null,
      String(notes || '').trim(),
      cleanStart,
      cleanEnd,
      now,
      now
    );

    createIndividualWorkspaceForUser(userId, String(name).trim());
    if (validType === 'school_admin' && organization && String(organization).trim()) {
      createSchoolWorkspaceForUser(userId, String(organization).trim());
    }
    db.prepare(`DELETE FROM luminext_pre_authorizations WHERE LOWER(email) = ?`).run(normEmail);

    // Create 72h one-time password setup invite token
    const setupToken = crypto.randomBytes(12).toString('hex').toUpperCase();
    const tokenExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    db.prepare(
      `INSERT INTO password_resets (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)`
    ).run(newId('rst'), userId, setupToken, tokenExpiresAt, now);

    const inviteLink = `${buildBaseAppUrl(req)}/definir-senha?email=${encodeURIComponent(normEmail)}&token=${setupToken}`;

    recordAdminAudit(
      req.user!.id,
      actor,
      'CREATE_USER',
      userId,
      normEmail,
      `Perfil=${validType}, Função=${resolvedJobRole}, Status=${validStatus}, Contrato=${cleanStart || '-'}..${cleanEnd || '-'}`
    );

    const row = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
    res.status(201).json({
      user: mapLuminextUser(row),
      setupToken,
      inviteLink,
      deliveryMode: 'invite_link_preview',
      message: 'Usuário criado no banco de dados e convite seguro gerado para definição da senha pessoal.',
    });
  });

  app.patch('/api/admin/users/:userId', requireLuminextAdmin, (req: AuthedRequest, res: Response) => {
    const existing = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.params.userId) as any;
    if (!existing) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const {
      name,
      phone,
      organization,
      roleType,
      jobRole,
      accountType,
      status,
      accessStatus,
      contractStartDate,
      contractEndDate,
      notes,
    } = req.body || {};

    const nextStart =
      contractStartDate !== undefined ? String(contractStartDate).trim() : existing.contract_start_date || '';
    const nextEnd =
      contractEndDate !== undefined ? String(contractEndDate).trim() : existing.contract_end_date || '';
    if (nextStart && nextEnd && nextEnd < nextStart) {
      res.status(400).json({ error: 'A data de expiração não pode ser anterior à data de contrato.' });
      return;
    }

    const nextType: UserAccountType =
      accountType === 'teacher' || accountType === 'school_admin' || accountType === 'luminext_admin'
        ? accountType
        : roleType === 'gestor_escolar'
        ? 'school_admin'
        : roleType === 'professor' || roleType === 'outro'
        ? 'teacher'
        : existing.account_type;

    const requestedStatus = status || accessStatus;
    const nextStatus: UserAccessStatus = requestedStatus
      ? normalizeAdminInputStatus(requestedStatus)
      : existing.access_status;

    if (req.user!.id === existing.id && (!isUserAccessActive(nextStatus, nextEnd) || nextType !== 'luminext_admin')) {
      res.status(400).json({
        error: 'Não é possível bloquear, suspender ou remover a permissão administrativa do próprio usuário conectado.',
      });
      return;
    }

    const now = new Date().toISOString();
    const actor = req.user!.email;
    const approvedBy =
      nextStatus === 'ativo' || nextStatus === 'liberado' ? existing.approved_by || actor : existing.approved_by;
    const approvedAt =
      nextStatus === 'ativo' || nextStatus === 'liberado' ? existing.approved_at || now : existing.approved_at;

    db.prepare(
      `UPDATE users
       SET name = ?, phone = ?, organization = ?, job_role = ?, account_type = ?,
           access_status = ?, approved_by = ?, approved_at = ?, notes = ?,
           contract_start_date = ?, contract_end_date = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      name !== undefined && String(name).trim() ? String(name).trim() : existing.name,
      phone !== undefined ? String(phone).trim() : existing.phone,
      organization !== undefined ? String(organization).trim() : existing.organization,
      jobRole !== undefined ? String(jobRole).trim() : existing.job_role,
      nextType,
      nextStatus,
      approvedBy,
      approvedAt,
      notes !== undefined ? String(notes).trim() : existing.notes,
      nextStart,
      nextEnd,
      now,
      existing.id
    );

    if (!isUserAccessActive(nextStatus, nextEnd)) {
      db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(existing.id);
    }

    recordAdminAudit(
      req.user!.id,
      actor,
      'UPDATE_USER',
      existing.id,
      existing.email,
      `Status=${nextStatus}, Perfil=${nextType}, Contrato=${nextStart || '-'}..${nextEnd || '-'}`
    );

    const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(existing.id);
    res.json({ user: mapLuminextUser(updated) });
  });

  app.post('/api/admin/users/:userId/activate', requireLuminextAdmin, (req: AuthedRequest, res: Response) => {
    const existing = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.params.userId) as any;
    if (!existing) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    const now = new Date().toISOString();
    const actor = req.user!.email;
    db.prepare(
      `UPDATE users SET access_status = 'ativo', approved_by = ?, approved_at = ?, updated_at = ? WHERE id = ?`
    ).run(actor, existing.approved_at || now, now, existing.id);

    recordAdminAudit(req.user!.id, actor, 'ACTIVATE_USER', existing.id, existing.email, 'Acesso ativado.');
    const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(existing.id);
    res.json({ user: mapLuminextUser(updated) });
  });

  app.post('/api/admin/users/:userId/block', requireLuminextAdmin, (req: AuthedRequest, res: Response) => {
    const existing = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.params.userId) as any;
    if (!existing) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    if (req.user!.id === existing.id) {
      res.status(400).json({ error: 'Não é possível bloquear o próprio administrador conectado.' });
      return;
    }
    const now = new Date().toISOString();
    db.prepare(`UPDATE users SET access_status = 'bloqueado', updated_at = ? WHERE id = ?`).run(now, existing.id);
    db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(existing.id);

    recordAdminAudit(
      req.user!.id,
      req.user!.email,
      'BLOCK_USER',
      existing.id,
      existing.email,
      'Acesso bloqueado e sessões ativas invalidadas.'
    );
    const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(existing.id);
    res.json({ user: mapLuminextUser(updated) });
  });

  app.post('/api/admin/users/:userId/suspend', requireLuminextAdmin, (req: AuthedRequest, res: Response) => {
    const existing = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.params.userId) as any;
    if (!existing) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    if (req.user!.id === existing.id) {
      res.status(400).json({ error: 'Não é possível suspender o próprio administrador conectado.' });
      return;
    }
    const now = new Date().toISOString();
    db.prepare(`UPDATE users SET access_status = 'suspenso', updated_at = ? WHERE id = ?`).run(now, existing.id);
    db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(existing.id);

    recordAdminAudit(
      req.user!.id,
      req.user!.email,
      'SUSPEND_USER',
      existing.id,
      existing.email,
      'Acesso suspenso temporariamente e sessões ativas invalidadas.'
    );
    const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(existing.id);
    res.json({ user: mapLuminextUser(updated) });
  });

  app.post('/api/admin/users/:userId/send-reset', requireLuminextAdmin, (req: AuthedRequest, res: Response) => {
    const existing = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.params.userId) as any;
    if (!existing) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    const now = new Date().toISOString();
    db.prepare(`UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL`).run(now, existing.id);

    const setupToken = crypto.randomBytes(12).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    db.prepare(
      `INSERT INTO password_resets (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)`
    ).run(newId('rst'), existing.id, setupToken, expiresAt, now);

    const resetLink = `${buildBaseAppUrl(req)}/definir-senha?email=${encodeURIComponent(existing.email)}&token=${setupToken}`;
    recordAdminAudit(
      req.user!.id,
      req.user!.email,
      'SEND_PASSWORD_RESET',
      existing.id,
      existing.email,
      'Link/código seguro de redefinição de senha gerado.'
    );

    res.json({
      ok: true,
      setupToken,
      resetLink,
      deliveryMode: 'invite_link_preview',
      message:
        'Link e código de redefinição gerados com validade de 24h. Envie este link seguro ao usuário (sem SMTP configurado no servidor).',
    });
  });

  // Backwards-compatible aliases protected strictly by requireLuminextAdmin (never API key!)
  app.get('/api/luminext/users', requireLuminextAdmin, (req: AuthedRequest, res: Response) => {
    const statusFilter = typeof req.query.status === 'string' ? req.query.status : '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    let rows = db.prepare(`SELECT * FROM users ORDER BY created_at DESC`).all() as any[];
    if (statusFilter && statusFilter !== 'all') {
      rows = rows.filter((r) => r.access_status === statusFilter);
    }
    if (q) {
      rows = rows.filter(
        (r) =>
          String(r.name).toLowerCase().includes(q) ||
          String(r.email).toLowerCase().includes(q) ||
          String(r.organization || '').toLowerCase().includes(q) ||
          String(r.job_role || '').toLowerCase().includes(q)
      );
    }
    const preAuthorizations = db
      .prepare(`SELECT * FROM luminext_pre_authorizations ORDER BY created_at DESC`)
      .all()
      .map((p: any) => ({
        id: p.id,
        email: p.email,
        name: p.name,
        organization: p.organization,
        jobRole: p.job_role,
        accountType: p.account_type,
        notes: p.notes,
        authorizedBy: p.authorized_by,
        createdAt: p.created_at,
      }));
    res.json({
      users: rows.map(mapLuminextUser),
      preAuthorizations,
    });
  });

  app.get('/api/luminext/users/:userId', requireLuminextAdmin, (req: AuthedRequest, res: Response) => {
    const row = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.params.userId);
    if (!row) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    res.json({ user: mapLuminextUser(row) });
  });

  app.post('/api/luminext/users/:userId/release', requireLuminextAdmin, (req: AuthedRequest, res: Response) => {
    const existing = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.params.userId) as any;
    if (!existing) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    const now = new Date().toISOString();
    const actor = req.user!.email;
    db.prepare(
      `UPDATE users SET access_status = 'ativo', approved_by = ?, approved_at = ?, updated_at = ? WHERE id = ?`
    ).run(actor, existing.approved_at || now, now, existing.id);
    recordAdminAudit(req.user!.id, actor, 'ACTIVATE_USER', existing.id, existing.email, 'Acesso liberado/ativado.');
    const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(existing.id);
    res.json({ user: mapLuminextUser(updated) });
  });

  app.post('/api/luminext/users/:userId/block', requireLuminextAdmin, (req: AuthedRequest, res: Response) => {
    const existing = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.params.userId) as any;
    if (!existing) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    if (req.user!.id === existing.id) {
      res.status(400).json({ error: 'Não é possível bloquear o próprio administrador conectado.' });
      return;
    }
    const now = new Date().toISOString();
    db.prepare(`UPDATE users SET access_status = 'bloqueado', updated_at = ? WHERE id = ?`).run(now, existing.id);
    db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(existing.id);
    recordAdminAudit(req.user!.id, req.user!.email, 'BLOCK_USER', existing.id, existing.email, 'Acesso bloqueado.');
    const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(existing.id);
    res.json({ user: mapLuminextUser(updated) });
  });

  app.post('/api/luminext/pre-authorizations', requireLuminextAdmin, (req: AuthedRequest, res: Response) => {
    const { email, name, organization, jobRole, accountType, notes } = req.body || {};
    if (!email || !String(email).trim()) {
      res.status(400).json({ error: 'Informe o e-mail para pré-autorizar pela LumiNext.' });
      return;
    }
    const normEmail = String(email).trim().toLowerCase();
    const now = new Date().toISOString();
    const actor = req.user!.email;
    const validType: UserAccountType =
      accountType === 'school_admin' || accountType === 'luminext_admin' ? accountType : 'teacher';

    const existingUser = db.prepare(`SELECT * FROM users WHERE LOWER(email) = ?`).get(normEmail) as any;
    if (existingUser) {
      db.prepare(
        `UPDATE users
         SET access_status = 'ativo', approved_by = ?, approved_at = ?, updated_at = ?
         WHERE id = ?`
      ).run(actor, existingUser.approved_at || now, now, existingUser.id);
      recordAdminAudit(
        req.user!.id,
        actor,
        'ACTIVATE_USER',
        existingUser.id,
        normEmail,
        'Acesso ativado via pré-autorização.'
      );
      const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(existingUser.id);
      res.status(200).json({
        releasedExistingUser: true,
        user: mapLuminextUser(updated),
      });
      return;
    }

    const id = newId('lpre');
    db.prepare(
      `INSERT INTO luminext_pre_authorizations (
         id, email, name, organization, job_role, account_type, notes, authorized_by, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET
         name = excluded.name,
         organization = excluded.organization,
         job_role = excluded.job_role,
         account_type = excluded.account_type,
         notes = excluded.notes,
         authorized_by = excluded.authorized_by`
    ).run(
      id,
      normEmail,
      String(name || '').trim(),
      String(organization || '').trim(),
      String(jobRole || '').trim(),
      validType,
      String(notes || '').trim(),
      actor,
      now
    );
    recordAdminAudit(req.user!.id, actor, 'PRE_AUTHORIZE_EMAIL', '', normEmail, `Perfil=${validType}`);

    const row = db
      .prepare(`SELECT * FROM luminext_pre_authorizations WHERE email = ?`)
      .get(normEmail) as any;
    res.status(201).json({
      releasedExistingUser: false,
      preAuthorization: {
        id: row.id,
        email: row.email,
        name: row.name,
        organization: row.organization,
        jobRole: row.job_role,
        accountType: row.account_type,
        notes: row.notes,
        authorizedBy: row.authorized_by,
        createdAt: row.created_at,
      },
    });
  });

  app.delete('/api/luminext/pre-authorizations/:id', requireLuminextAdmin, (req: AuthedRequest, res: Response) => {
    db.prepare(`DELETE FROM luminext_pre_authorizations WHERE id = ?`).run(req.params.id);
    res.json({ ok: true });
  });

  // ==================== WORKSPACES & SCHOOL MANAGEMENT ====================
  app.post('/api/workspaces/school', requireUser, (req: AuthedRequest, res: Response) => {
    const { name, city, state } = req.body || {};
    if (!name || !String(name).trim()) {
      res.status(400).json({ error: 'Informe o nome da escola.' });
      return;
    }
    const wsId = createSchoolWorkspaceForUser(req.user!.id, String(name), String(city || ''), String(state || ''));
    res.status(201).json({ workspaceId: wsId, workspaces: getUserWorkspaces(req.user!.id) });
  });

  app.post('/api/workspaces/accept-invite', requireUser, (req: AuthedRequest, res: Response) => {
    const { token } = req.body || {};
    if (!token) {
      res.status(400).json({ error: 'Informe o código do convite institucional.' });
      return;
    }
    const inv = db
      .prepare(`SELECT * FROM workspace_invitations WHERE token = ? AND status = 'pending'`)
      .get(String(token).trim()) as any;
    if (!inv || inv.email.toLowerCase() !== req.user!.email.toLowerCase()) {
      res.status(403).json({ error: 'Convite inválido ou não direcionado ao seu e-mail cadastrado.' });
      return;
    }
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO workspace_members (id, workspace_id, user_id, role, status, invited_by, created_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?)
       ON CONFLICT(workspace_id, user_id) DO UPDATE SET status='active', role=excluded.role, revoked_at=NULL`
    ).run(newId('wm'), inv.workspace_id, req.user!.id, inv.role, inv.invited_by, now);
    db.prepare(`UPDATE workspace_invitations SET status = 'accepted' WHERE id = ?`).run(inv.id);
    res.json({ workspaceId: inv.workspace_id, workspaces: getUserWorkspaces(req.user!.id) });
  });

  app.patch('/api/workspaces/:workspaceId/settings', requireUser, (req: AuthedRequest, res: Response) => {
    const membership = getWorkspaceMembership(req.params.workspaceId, req.user!.id);
    if (!membership || membership.role !== 'admin') {
      res.status(403).json({ error: 'Somente a coordenação/administração autorizada pode alterar configurações deste espaço.' });
      return;
    }
    const { aiExternalEnabled } = req.body || {};
    if (typeof aiExternalEnabled === 'boolean') {
      db.prepare(`UPDATE workspaces SET ai_external_enabled = ? WHERE id = ?`).run(
        aiExternalEnabled ? 1 : 0,
        req.params.workspaceId
      );
    }
    res.json({ ok: true, workspaces: getUserWorkspaces(req.user!.id) });
  });

  app.get('/api/workspaces/:workspaceId/members', requireUser, (req: AuthedRequest, res: Response) => {
    const membership = getWorkspaceMembership(req.params.workspaceId, req.user!.id);
    if (!membership || membership.role !== 'admin') {
      res.status(403).json({ error: 'Acesso restrito à administração do espaço escolar.' });
      return;
    }
    const members = db
      .prepare(
        `SELECT wm.id, wm.user_id, wm.role, wm.status, wm.created_at, wm.revoked_at, u.name, u.email
         FROM workspace_members wm
         JOIN users u ON u.id = wm.user_id
         WHERE wm.workspace_id = ?
         ORDER BY wm.status ASC, u.name ASC`
      )
      .all(req.params.workspaceId);

    const invitations = db
      .prepare(`SELECT * FROM workspace_invitations WHERE workspace_id = ? ORDER BY created_at DESC`)
      .all(req.params.workspaceId);

    const links = db
      .prepare(
        `SELECT st.id, st.student_id, st.user_id, st.role_label, st.status, st.revoked_at, u.name AS teacher_name, u.email AS teacher_email, s.display_name AS student_name
         FROM student_teachers st
         JOIN users u ON u.id = st.user_id
         JOIN students s ON s.id = st.student_id
         WHERE st.workspace_id = ?
         ORDER BY st.status ASC, s.display_name ASC`
      )
      .all(req.params.workspaceId);

    res.json({ members, invitations, links });
  });

  app.post('/api/workspaces/:workspaceId/invite', requireUser, (req: AuthedRequest, res: Response) => {
    const membership = getWorkspaceMembership(req.params.workspaceId, req.user!.id);
    if (!membership || membership.workspaceType !== 'school' || membership.role !== 'admin') {
      res.status(403).json({ error: 'Somente a pessoa autorizada da escola pode convidar professores.' });
      return;
    }
    const { email, role } = req.body || {};
    if (!email) {
      res.status(400).json({ error: 'Informe o e-mail do profissional.' });
      return;
    }
    const normEmail = String(email).trim().toLowerCase();
    const targetRole = role === 'admin' ? 'admin' : 'teacher';
    const token = `CONV-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const now = new Date().toISOString();

    const existingUser = db
      .prepare(`SELECT id, name, email FROM users WHERE LOWER(email) = ?`)
      .get(normEmail) as { id: string; name: string; email: string } | undefined;

    const id = newId('inv');
    if (existingUser) {
      db.prepare(
        `INSERT INTO workspace_members (id, workspace_id, user_id, role, status, invited_by, created_at)
         VALUES (?, ?, ?, ?, 'active', ?, ?)
         ON CONFLICT(workspace_id, user_id) DO UPDATE SET status='active', role=excluded.role, revoked_at=NULL`
      ).run(newId('wm'), req.params.workspaceId, existingUser.id, targetRole, req.user!.id, now);
      db.prepare(
        `INSERT INTO workspace_invitations (id, workspace_id, email, role, token, status, invited_by, created_at)
         VALUES (?, ?, ?, ?, ?, 'accepted', ?, ?)`
      ).run(id, req.params.workspaceId, normEmail, targetRole, token, req.user!.id, now);
      res.status(201).json({
        id,
        email: normEmail,
        role: targetRole,
        token,
        status: 'accepted',
        directActivated: true,
        teacherName: existingUser.name,
      });
      return;
    }

    db.prepare(
      `INSERT INTO workspace_invitations (id, workspace_id, email, role, token, status, invited_by, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`
    ).run(id, req.params.workspaceId, normEmail, targetRole, token, req.user!.id, now);

    res.status(201).json({
      id,
      email: normEmail,
      role: targetRole,
      token,
      status: 'pending',
      directActivated: false,
    });
  });

  app.post('/api/workspaces/:workspaceId/members/:userId/revoke', requireUser, (req: AuthedRequest, res: Response) => {
    const membership = getWorkspaceMembership(req.params.workspaceId, req.user!.id);
    if (!membership || membership.workspaceType !== 'school' || membership.role !== 'admin') {
      res.status(403).json({ error: 'Permissão negada para encerrar vínculos.' });
      return;
    }
    if (req.params.userId === req.user!.id) {
      res.status(400).json({ error: 'Você não pode encerrar o próprio vínculo de administração.' });
      return;
    }
    const now = new Date().toISOString();
    const targetUser = db.prepare(`SELECT email FROM users WHERE id = ?`).get(req.params.userId) as
      | { email: string }
      | undefined;
    db.prepare(
      `UPDATE workspace_members SET status = 'revoked', revoked_at = ? WHERE workspace_id = ? AND user_id = ?`
    ).run(now, req.params.workspaceId, req.params.userId);
    db.prepare(
      `UPDATE student_teachers SET status = 'revoked', revoked_at = ? WHERE workspace_id = ? AND user_id = ?`
    ).run(now, req.params.workspaceId, req.params.userId);
    if (targetUser) {
      db.prepare(
        `UPDATE workspace_invitations SET status = 'revoked' WHERE workspace_id = ? AND LOWER(email) = ? AND status = 'pending'`
      ).run(req.params.workspaceId, targetUser.email.toLowerCase());
    }

    res.json({ ok: true });
  });

  app.post('/api/workspaces/:workspaceId/student-links', requireUser, (req: AuthedRequest, res: Response) => {
    const membership = getWorkspaceMembership(req.params.workspaceId, req.user!.id);
    if (!membership || membership.workspaceType !== 'school' || membership.role !== 'admin') {
      res.status(403).json({ error: 'Somente a administração da escola pode vincular professores a estudantes.' });
      return;
    }
    const { studentId, teacherUserId, roleLabel } = req.body || {};
    const student = db
      .prepare(`SELECT id FROM students WHERE id = ? AND workspace_id = ?`)
      .get(studentId, req.params.workspaceId);
    const member = db
      .prepare(`SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ? AND status = 'active'`)
      .get(req.params.workspaceId, teacherUserId);
    if (!student || !member) {
      res.status(400).json({ error: 'Estudante ou profissional ativo não encontrado nesta escola.' });
      return;
    }
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO student_teachers (id, student_id, workspace_id, user_id, role_label, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?)
       ON CONFLICT(student_id, user_id) DO UPDATE SET status='active', role_label=excluded.role_label, revoked_at=NULL`
    ).run(newId('stlink'), studentId, req.params.workspaceId, teacherUserId, String(roleLabel || 'Professor(a)'), now);
    res.json({ ok: true });
  });

  app.post('/api/workspaces/:workspaceId/student-links/:linkId/revoke', requireUser, (req: AuthedRequest, res: Response) => {
    const membership = getWorkspaceMembership(req.params.workspaceId, req.user!.id);
    if (!membership || membership.workspaceType !== 'school' || membership.role !== 'admin') {
      res.status(403).json({ error: 'Somente a administração da escola pode encerrar vínculos.' });
      return;
    }
    db.prepare(
      `UPDATE student_teachers SET status = 'revoked', revoked_at = ? WHERE id = ? AND workspace_id = ?`
    ).run(new Date().toISOString(), req.params.linkId, req.params.workspaceId);
    res.json({ ok: true });
  });

  // ==================== INTER-SCHOOL STUDENT TRANSFERS & APPROVALS ====================
  const safeCodeEquals = (a: string, b: string): boolean => {
    const bufA = Buffer.from(a.trim().toUpperCase(), 'utf8');
    const bufB = Buffer.from(b.trim().toUpperCase(), 'utf8');
    if (bufA.length !== bufB.length || bufA.length === 0) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  };

  const getSchoolAdminEmails = (workspaceId: string): string[] => {
    const rows = db
      .prepare(
        `SELECT LOWER(u.email) AS email
         FROM workspace_members wm
         JOIN users u ON u.id = wm.user_id
         WHERE wm.workspace_id = ? AND wm.role = 'admin' AND wm.status = 'active'`
      )
      .all(workspaceId) as { email: string }[];
    return rows.map((r) => r.email);
  };

  const mapTransferRow = (r: any, direction?: 'enviada' | 'recebida'): StudentTransferRecord => {
    const docRow = db
      .prepare(`SELECT COUNT(*) AS cnt FROM documents WHERE student_id = ?`)
      .get(r.student_id) as { cnt: number } | undefined;
    const actRow = db
      .prepare(`SELECT COUNT(*) AS cnt FROM activities WHERE student_id = ?`)
      .get(r.student_id) as { cnt: number } | undefined;
    return {
      id: r.id,
      studentId: r.student_id,
      studentDisplayName: r.student_display_name,
      studentGradeLevel: r.student_grade_level || '',
      studentClassroom: r.student_classroom || '',
      fromWorkspaceId: r.from_workspace_id,
      fromSchoolName: r.from_school_name,
      targetWorkspaceId: r.target_workspace_id || null,
      targetSchoolName: r.target_school_name,
      targetSchoolEmail: r.target_school_email,
      transferCode: r.transfer_code,
      status: r.status,
      transferNote: r.transfer_note || '',
      initiatedByName: r.initiated_by_name,
      reviewedByName: r.reviewed_by_name || '',
      reviewNote: r.review_note || '',
      reviewedAt: r.reviewed_at || null,
      createdAt: r.created_at,
      documentsCount: docRow?.cnt || 0,
      activitiesCount: actRow?.cnt || 0,
      direction,
    };
  };

  const canSchoolReviewTransfer = (
    transfer: any,
    workspaceId: string,
    providedCode?: string
  ): boolean => {
    if (transfer.from_workspace_id === workspaceId) return false;
    if (transfer.target_workspace_id && transfer.target_workspace_id === workspaceId) return true;
    const adminEmails = getSchoolAdminEmails(workspaceId);
    if (adminEmails.includes(String(transfer.target_school_email || '').toLowerCase())) return true;
    if (providedCode && safeCodeEquals(String(providedCode), String(transfer.transfer_code || ''))) return true;
    return false;
  };

  app.get('/api/workspaces/:workspaceId/student-transfers', requireUser, (req: AuthedRequest, res: Response) => {
    const membership = getWorkspaceMembership(req.params.workspaceId, req.user!.id);
    if (!membership || membership.workspaceType !== 'school' || membership.role !== 'admin') {
      res.status(403).json({ error: 'Somente a gestão da escola pode gerenciar transferências de estudantes.' });
      return;
    }
    const outgoingRows = db
      .prepare(`SELECT * FROM student_transfers WHERE from_workspace_id = ? ORDER BY created_at DESC`)
      .all(req.params.workspaceId) as any[];

    const adminEmails = getSchoolAdminEmails(req.params.workspaceId);
    let incomingRows: any[] = [];
    if (adminEmails.length > 0) {
      const placeholders = adminEmails.map(() => '?').join(', ');
      incomingRows = db
        .prepare(
          `SELECT * FROM student_transfers
           WHERE from_workspace_id != ?
             AND (target_workspace_id = ? OR LOWER(target_school_email) IN (${placeholders}))
           ORDER BY created_at DESC`
        )
        .all(req.params.workspaceId, req.params.workspaceId, ...adminEmails) as any[];
    } else {
      incomingRows = db
        .prepare(
          `SELECT * FROM student_transfers
           WHERE from_workspace_id != ? AND target_workspace_id = ?
           ORDER BY created_at DESC`
        )
        .all(req.params.workspaceId, req.params.workspaceId) as any[];
    }

    res.json({
      outgoing: outgoingRows.map((r) => mapTransferRow(r, 'enviada')),
      incoming: incomingRows.map((r) => mapTransferRow(r, 'recebida')),
    });
  });

  app.post('/api/workspaces/:workspaceId/student-transfers', requireUser, (req: AuthedRequest, res: Response) => {
    const membership = getWorkspaceMembership(req.params.workspaceId, req.user!.id);
    if (!membership || membership.workspaceType !== 'school' || membership.role !== 'admin') {
      res.status(403).json({ error: 'Somente a administração da escola pode repassar acesso de estudantes.' });
      return;
    }
    const { studentId, targetSchoolName, targetSchoolEmail, transferNote } = req.body || {};
    const cleanSchoolName = String(targetSchoolName || '').trim().slice(0, 160);
    const cleanEmail = String(targetSchoolEmail || '').trim().toLowerCase();
    const cleanNote = String(transferNote || '').trim().slice(0, 800);

    if (!studentId || !cleanSchoolName || !cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      res.status(400).json({ error: 'Selecione o estudante e informe o nome e um e-mail institucional válido da nova escola.' });
      return;
    }

    const student = db
      .prepare(`SELECT * FROM students WHERE id = ? AND workspace_id = ?`)
      .get(studentId, req.params.workspaceId) as any;
    if (!student) {
      res.status(404).json({ error: 'Estudante não encontrado nesta escola.' });
      return;
    }

    const existingPending = db
      .prepare(`SELECT id FROM student_transfers WHERE student_id = ? AND status = 'pendente'`)
      .get(studentId);
    if (existingPending) {
      res.status(409).json({ error: 'Já existe um repasse pendente para este estudante. Cancele o anterior antes de enviar um novo.' });
      return;
    }

    const originWs = db
      .prepare(`SELECT id, name FROM workspaces WHERE id = ?`)
      .get(req.params.workspaceId) as { id: string; name: string } | undefined;

    // Resolve destination school workspace if an active school admin matches targetSchoolEmail
    const targetAdminWs = db
      .prepare(
        `SELECT w.id, w.name
         FROM users u
         JOIN workspace_members wm ON wm.user_id = u.id AND wm.role = 'admin' AND wm.status = 'active'
         JOIN workspaces w ON w.id = wm.workspace_id AND w.type = 'school'
         WHERE LOWER(u.email) = ?
         LIMIT 1`
      )
      .get(cleanEmail) as { id: string; name: string } | undefined;

    if (targetAdminWs && targetAdminWs.id === req.params.workspaceId) {
      res.status(400).json({ error: 'O e-mail informado pertence à própria escola de origem. Informe o e-mail da nova escola.' });
      return;
    }

    const id = newId('trf');
    const transferCode = `TRF-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO student_transfers (
        id, student_id, student_display_name, student_grade_level, student_classroom,
        from_workspace_id, from_school_name, target_workspace_id, target_school_name,
        target_school_email, transfer_code, status, transfer_note,
        initiated_by_user_id, initiated_by_name, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', ?, ?, ?, ?)`
    ).run(
      id,
      student.id,
      student.display_name,
      student.grade_level || '',
      student.classroom || '',
      req.params.workspaceId,
      originWs?.name || student.school_name || 'Escola de origem',
      targetAdminWs?.id || null,
      cleanSchoolName,
      cleanEmail,
      transferCode,
      cleanNote,
      req.user!.id,
      req.user!.name,
      now
    );

    const created = db.prepare(`SELECT * FROM student_transfers WHERE id = ?`).get(id);
    res.status(201).json({ transfer: mapTransferRow(created, 'enviada') });
  });

  app.post('/api/workspaces/:workspaceId/student-transfers/lookup', requireUser, (req: AuthedRequest, res: Response) => {
    const membership = getWorkspaceMembership(req.params.workspaceId, req.user!.id);
    if (!membership || membership.workspaceType !== 'school' || membership.role !== 'admin') {
      res.status(403).json({ error: 'Somente a gestão da escola pode localizar transferências.' });
      return;
    }
    const cleanCode = String(req.body?.transferCode || '').trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 6) {
      res.status(400).json({ error: 'Informe um código de transferência válido (ex.: TRF-...).' });
      return;
    }
    const row = db
      .prepare(`SELECT * FROM student_transfers WHERE UPPER(transfer_code) = ? AND status = 'pendente'`)
      .get(cleanCode) as any;
    if (!row) {
      res.status(404).json({ error: 'Nenhuma transferência pendente encontrada com este código.' });
      return;
    }
    if (row.from_workspace_id === req.params.workspaceId) {
      res.status(400).json({ error: 'Este código pertence a uma transferência enviada pela sua própria escola.' });
      return;
    }
    res.json({ transfer: mapTransferRow(row, 'recebida') });
  });

  app.post('/api/workspaces/:workspaceId/student-transfers/:transferId/approve', requireUser, (req: AuthedRequest, res: Response) => {
    const membership = getWorkspaceMembership(req.params.workspaceId, req.user!.id);
    if (!membership || membership.workspaceType !== 'school' || membership.role !== 'admin') {
      res.status(403).json({ error: 'Somente a administração da nova escola pode aprovar a inclusão do estudante.' });
      return;
    }
    const { approvedConfirmation, reviewNote, transferCode } = req.body || {};
    if (approvedConfirmation !== true) {
      res.status(400).json({ error: 'Marque a confirmação institucional de aprovação da inclusão antes de concluir.' });
      return;
    }
    const cleanReviewNote = String(reviewNote || '').trim().slice(0, 800);
    const transfer = db
      .prepare(`SELECT * FROM student_transfers WHERE id = ?`)
      .get(req.params.transferId) as any;
    if (!transfer) {
      res.status(404).json({ error: 'Solicitação de transferência não encontrada.' });
      return;
    }
    if (transfer.status !== 'pendente') {
      res.status(409).json({ error: `Esta transferência já foi finalizada (${transfer.status}).` });
      return;
    }
    if (!canSchoolReviewTransfer(transfer, req.params.workspaceId, transferCode)) {
      res.status(403).json({ error: 'Esta transferência não está direcionada a esta escola. Utilize o código seguro fornecido pela escola de origem.' });
      return;
    }

    const targetWs = db
      .prepare(`SELECT id, name FROM workspaces WHERE id = ?`)
      .get(req.params.workspaceId) as { id: string; name: string } | undefined;
    const now = new Date().toISOString();

    const executeTransfer = db.transaction(() => {
      db.prepare(
        `UPDATE student_teachers SET status = 'revoked', revoked_at = ?
         WHERE student_id = ? AND workspace_id = ? AND status = 'active'`
      ).run(now, transfer.student_id, transfer.from_workspace_id);

      db.prepare(
        `UPDATE students SET workspace_id = ?, school_name = ?, updated_at = ?
         WHERE id = ? AND workspace_id = ?`
      ).run(req.params.workspaceId, targetWs?.name || transfer.target_school_name, now, transfer.student_id, transfer.from_workspace_id);

      db.prepare(`UPDATE sources SET workspace_id = ? WHERE student_id = ?`).run(req.params.workspaceId, transfer.student_id);
      db.prepare(`UPDATE documents SET workspace_id = ? WHERE student_id = ?`).run(req.params.workspaceId, transfer.student_id);
      db.prepare(`UPDATE activities SET workspace_id = ? WHERE student_id = ?`).run(req.params.workspaceId, transfer.student_id);
      db.prepare(`UPDATE applications SET workspace_id = ? WHERE student_id = ?`).run(req.params.workspaceId, transfer.student_id);
      db.prepare(`UPDATE update_alerts SET workspace_id = ? WHERE student_id = ?`).run(req.params.workspaceId, transfer.student_id);

      db.prepare(
        `UPDATE student_transfers
         SET status = 'aprovada', target_workspace_id = ?, target_school_name = ?,
             reviewed_by_user_id = ?, reviewed_by_name = ?, review_note = ?, reviewed_at = ?
         WHERE id = ?`
      ).run(
        req.params.workspaceId,
        targetWs?.name || transfer.target_school_name,
        req.user!.id,
        req.user!.name,
        cleanReviewNote,
        now,
        transfer.id
      );
    });

    executeTransfer();
    const updated = db.prepare(`SELECT * FROM student_transfers WHERE id = ?`).get(transfer.id);
    res.json({ ok: true, transfer: mapTransferRow(updated, 'recebida') });
  });

  app.post('/api/workspaces/:workspaceId/student-transfers/:transferId/reject', requireUser, (req: AuthedRequest, res: Response) => {
    const membership = getWorkspaceMembership(req.params.workspaceId, req.user!.id);
    if (!membership || membership.workspaceType !== 'school' || membership.role !== 'admin') {
      res.status(403).json({ error: 'Somente a administração da escola pode recusar solicitações de inclusão.' });
      return;
    }
    const { reviewNote, transferCode } = req.body || {};
    const cleanReviewNote = String(reviewNote || '').trim().slice(0, 800);
    const transfer = db
      .prepare(`SELECT * FROM student_transfers WHERE id = ?`)
      .get(req.params.transferId) as any;
    if (!transfer) {
      res.status(404).json({ error: 'Solicitação de transferência não encontrada.' });
      return;
    }
    if (transfer.status !== 'pendente') {
      res.status(409).json({ error: `Esta transferência já foi finalizada (${transfer.status}).` });
      return;
    }
    if (!canSchoolReviewTransfer(transfer, req.params.workspaceId, transferCode)) {
      res.status(403).json({ error: 'Sem permissão para recusar esta transferência.' });
      return;
    }
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE student_transfers
       SET status = 'recusada', reviewed_by_user_id = ?, reviewed_by_name = ?, review_note = ?, reviewed_at = ?
       WHERE id = ?`
    ).run(req.user!.id, req.user!.name, cleanReviewNote, now, transfer.id);
    const updated = db.prepare(`SELECT * FROM student_transfers WHERE id = ?`).get(transfer.id);
    res.json({ ok: true, transfer: mapTransferRow(updated, 'recebida') });
  });

  app.post('/api/workspaces/:workspaceId/student-transfers/:transferId/cancel', requireUser, (req: AuthedRequest, res: Response) => {
    const membership = getWorkspaceMembership(req.params.workspaceId, req.user!.id);
    if (!membership || membership.workspaceType !== 'school' || membership.role !== 'admin') {
      res.status(403).json({ error: 'Somente a administração da escola de origem pode cancelar um repasse.' });
      return;
    }
    const transfer = db
      .prepare(`SELECT * FROM student_transfers WHERE id = ? AND from_workspace_id = ?`)
      .get(req.params.transferId, req.params.workspaceId) as any;
    if (!transfer) {
      res.status(404).json({ error: 'Transferência não encontrada nesta escola.' });
      return;
    }
    if (transfer.status !== 'pendente') {
      res.status(409).json({ error: 'Somente transferências pendentes podem ser canceladas.' });
      return;
    }
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE student_transfers
       SET status = 'cancelada', reviewed_by_user_id = ?, reviewed_by_name = ?, reviewed_at = ?
       WHERE id = ?`
    ).run(req.user!.id, req.user!.name, now, transfer.id);
    const updated = db.prepare(`SELECT * FROM student_transfers WHERE id = ?`).get(transfer.id);
    res.json({ ok: true, transfer: mapTransferRow(updated, 'enviada') });
  });

  // ==================== STUDENTS ====================
  app.get('/api/workspaces/:workspaceId/students', requireUser, (req: AuthedRequest, res: Response) => {
    const membership = getWorkspaceMembership(req.params.workspaceId, req.user!.id);
    if (!membership) {
      res.status(403).json({ error: 'Sem acesso a este espaço.' });
      return;
    }
    let rows: any[];
    if (membership.workspaceType === 'individual' || membership.role === 'admin') {
      rows = db
        .prepare(`SELECT * FROM students WHERE workspace_id = ? ORDER BY display_name ASC`)
        .all(req.params.workspaceId);
    } else {
      rows = db
        .prepare(
          `SELECT s.* FROM students s
           JOIN student_teachers st ON st.student_id = s.id
           WHERE s.workspace_id = ? AND st.user_id = ? AND st.status = 'active'
           ORDER BY s.display_name ASC`
        )
        .all(req.params.workspaceId, req.user!.id);
    }
    res.json({ students: rows.map(rowToStudent) });
  });

  app.post('/api/workspaces/:workspaceId/students', requireUser, (req: AuthedRequest, res: Response) => {
    const membership = getWorkspaceMembership(req.params.workspaceId, req.user!.id);
    if (!membership) {
      res.status(403).json({ error: 'Sem permissão neste espaço.' });
      return;
    }
    if (membership.workspaceType === 'school' && membership.role !== 'admin') {
      res.status(403).json({ error: 'Na escola, apenas a pessoa autorizada pode cadastrar estudantes.' });
      return;
    }
    const b = req.body || {};
    const displayName = String(b.displayName || '').trim();
    const codeOrInitials = String(b.codeOrInitials || '').trim();
    if (!displayName && !codeOrInitials) {
      res.status(400).json({ error: 'Informe pelo menos um nome de uso, iniciais ou código do estudante.' });
      return;
    }
    const id = newId('std');
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO students (
        id, workspace_id, created_by_user_id, display_name, code_or_initials,
        school_name, school_year, grade_level, classroom, strengths, interests,
        learning_level, communication_modes, barriers, working_strategies,
        accessibility_resources, latest_pedagogical_eval, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      req.params.workspaceId,
      req.user!.id,
      displayName || codeOrInitials,
      codeOrInitials,
      String(b.schoolName || ''),
      String(b.schoolYear || '2026'),
      String(b.gradeLevel || ''),
      String(b.classroom || ''),
      String(b.strengths || ''),
      String(b.interests || ''),
      String(b.learningLevel || ''),
      String(b.communicationModes || ''),
      String(b.barriers || ''),
      String(b.workingStrategies || ''),
      String(b.accessibilityResources || ''),
      String(b.latestPedagogicalEval || ''),
      now,
      now
    );

    const row = db.prepare(`SELECT * FROM students WHERE id = ?`).get(id);
    res.status(201).json({ student: rowToStudent(row) });
  });

  app.get('/api/students/:studentId/overview', requireUser, (req: AuthedRequest, res: Response) => {
    const perm = checkStudentPermission(req.params.studentId, req.user!.id);
    if (!perm.allowed || !perm.student) {
      res.status(403).json({ error: perm.reason || 'Acesso negado.' });
      return;
    }
    const sid = req.params.studentId;
    const sources = db.prepare(`SELECT * FROM sources WHERE student_id = ? ORDER BY created_at DESC`).all(sid).map(rowToSource);
    const documents = db
      .prepare(`SELECT * FROM documents WHERE student_id = ? ORDER BY updated_at DESC`)
      .all(sid)
      .map(rowToDocument);
    const activities = db
      .prepare(`SELECT * FROM activities WHERE student_id = ? ORDER BY updated_at DESC`)
      .all(sid)
      .map(rowToActivity);
    const applications = db
      .prepare(
        `SELECT ap.*, ac.title AS activity_title, ac.subject, ac.bimester, ac.school_year
         FROM applications ap
         JOIN activities ac ON ac.id = ap.activity_id
         WHERE ap.student_id = ?
         ORDER BY ap.applied_date DESC, ap.created_at DESC`
      )
      .all(sid)
      .map(rowToApplication);

    const alertsRaw = db
      .prepare(
        `SELECT ua.*, s.title AS source_title, d.title AS document_title
         FROM update_alerts ua
         JOIN sources s ON s.id = ua.source_id
         JOIN documents d ON d.id = ua.document_id
         WHERE ua.student_id = ? AND ua.status = 'pendente'
         ORDER BY ua.created_at DESC`
      )
      .all(sid);

    const alerts: UpdateAlert[] = alertsRaw.map((a: any) => ({
      id: a.id,
      studentId: a.student_id,
      workspaceId: a.workspace_id,
      sourceId: a.source_id,
      documentId: a.document_id,
      sourceTitle: a.source_title,
      documentTitle: a.document_title,
      summary: a.summary,
      proposedChanges: JSON.parse(a.proposed_diff_json || '[]'),
      status: a.status,
      createdAt: a.created_at,
    }));

    res.json({
      student: rowToStudent(perm.student),
      sources,
      documents,
      activities,
      applications,
      alerts,
    });
  });

  app.put('/api/students/:studentId', requireUser, (req: AuthedRequest, res: Response) => {
    const perm = checkStudentPermission(req.params.studentId, req.user!.id);
    if (!perm.allowed || !perm.student) {
      res.status(403).json({ error: perm.reason || 'Acesso negado.' });
      return;
    }
    const b = req.body || {};
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE students SET
        display_name = ?, code_or_initials = ?, school_name = ?, school_year = ?,
        grade_level = ?, classroom = ?, strengths = ?, interests = ?,
        learning_level = ?, communication_modes = ?, barriers = ?,
        working_strategies = ?, accessibility_resources = ?, latest_pedagogical_eval = ?,
        updated_at = ?
       WHERE id = ?`
    ).run(
      String(b.displayName ?? perm.student.display_name),
      String(b.codeOrInitials ?? perm.student.code_or_initials),
      String(b.schoolName ?? perm.student.school_name),
      String(b.schoolYear ?? perm.student.school_year),
      String(b.gradeLevel ?? perm.student.grade_level),
      String(b.classroom ?? perm.student.classroom),
      String(b.strengths ?? perm.student.strengths),
      String(b.interests ?? perm.student.interests),
      String(b.learningLevel ?? perm.student.learning_level),
      String(b.communicationModes ?? perm.student.communication_modes),
      String(b.barriers ?? perm.student.barriers),
      String(b.workingStrategies ?? perm.student.working_strategies),
      String(b.accessibilityResources ?? perm.student.accessibility_resources),
      String(b.latestPedagogicalEval ?? perm.student.latest_pedagogical_eval),
      now,
      req.params.studentId
    );
    const row = db.prepare(`SELECT * FROM students WHERE id = ?`).get(req.params.studentId);
    res.json({ student: rowToStudent(row) });
  });

  // ==================== SOURCES & PRIVATE FILE DOWNLOAD ====================
  app.post('/api/students/:studentId/sources', requireUser, upload.single('file'), async (req: AuthedRequest, res: Response) => {
    try {
      const perm = checkStudentPermission(req.params.studentId, req.user!.id);
      if (!perm.allowed || !perm.student) {
        res.status(403).json({ error: perm.reason || 'Acesso negado.' });
        return;
      }

      const b = req.body || {};
      const sourceKind = String(b.sourceKind || 'relatorio');
      const docCategory = String(b.docCategory || 'geral');
      const title = String(b.title || req.file?.originalname || 'Fonte documental').trim();
      const subject = String(b.subject || '');
      const schoolYear = String(b.schoolYear || perm.student.school_year || '2026');
      const bimester = String(b.bimester || '');
      const authorName = String(b.authorName || req.user!.name);
      const informedDate = String(b.informedDate || '');
      const supersedesSourceId = b.supersedesSourceId ? String(b.supersedesSourceId) : null;
      const manualText = String(b.manualText || '');

      let versionNumber = 1;
      if (supersedesSourceId) {
        const oldSrc = db
          .prepare(`SELECT * FROM sources WHERE id = ? AND student_id = ?`)
          .get(supersedesSourceId, req.params.studentId) as any;
        if (oldSrc) {
          versionNumber = (oldSrc.version_number || 1) + 1;
          db.prepare(`UPDATE sources SET status = 'substituido' WHERE id = ?`).run(oldSrc.id);
        }
      }

      let storedFilename = '';
      let originalFilename = '';
      let mimeType = '';
      let fileExt = 'txt';
      let extractedText = manualText;
      let parsedStructure: any = null;
      let isEditableTemplate = false;

      if (req.file) {
        originalFilename = req.file.originalname;
        mimeType = req.file.mimetype;
        fileExt = path.extname(originalFilename).replace(/^\./, '').toLowerCase() || 'bin';
        storedFilename = `${newId('file')}.${fileExt}`;
        const destPath = safeResolveStoragePath(UPLOADS_DIR, storedFilename);
        fs.writeFileSync(destPath, req.file.buffer);

        const extracted = await extractSourceContent(req.file.buffer, fileExt, mimeType);
        extractedText = manualText ? `${manualText}\n\n${extracted.extractedText}` : extracted.extractedText;
        parsedStructure = extracted.parsedStructure;
        isEditableTemplate = extracted.isEditableTemplate;
      }

      const sourceId = newId('src');
      const now = new Date().toISOString();
      db.prepare(
        `INSERT INTO sources (
          id, student_id, workspace_id, uploaded_by_user_id, source_kind, doc_category,
          title, subject, school_year, bimester, author_name, informed_date,
          version_number, status, supersedes_source_id, file_path, original_filename,
          mime_type, file_ext, extracted_text, parsed_structure_json, is_editable_template, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativo', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        sourceId,
        req.params.studentId,
        perm.student.workspace_id,
        req.user!.id,
        sourceKind,
        docCategory,
        title,
        subject,
        schoolYear,
        bimester,
        authorName,
        informedDate,
        versionNumber,
        supersedesSourceId,
        storedFilename,
        originalFilename,
        mimeType,
        fileExt,
        extractedText,
        JSON.stringify(parsedStructure),
        isEditableTemplate ? 1 : 0,
        now
      );

      // If this source supersedes an older one, detect impacted documents and create review alerts (never overwriting!)
      const createdAlerts: any[] = [];
      if (supersedesSourceId) {
        const docs = db
          .prepare(`SELECT * FROM documents WHERE student_id = ?`)
          .all(req.params.studentId) as any[];
        for (const doc of docs) {
          const usedIds: string[] = JSON.parse(doc.source_ids_json || '[]');
          if (usedIds.includes(supersedesSourceId) || doc.template_source_id === supersedesSourceId) {
            const alertId = newId('alt');
            const proposedDiff = [
              {
                fieldKey: 'fonte_atualizada',
                label: `Nova versão da fonte "${title}" (v${versionNumber})`,
                currentValue: `Documento elaborado com versão anterior (v${versionNumber - 1}).`,
                proposedValue: extractedText.slice(0, 300) || 'Arquivo atualizado disponível para revisão.',
                originReference: `${title} (v${versionNumber})`,
              },
            ];
            db.prepare(
              `INSERT INTO update_alerts (id, student_id, workspace_id, source_id, document_id, summary, proposed_diff_json, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, 'pendente', ?)`
            ).run(
              alertId,
              req.params.studentId,
              perm.student.workspace_id,
              sourceId,
              doc.id,
              `A fonte "${title}" foi atualizada para v${versionNumber}. Revise as informações relacionadas em "${doc.title}".`,
              JSON.stringify(proposedDiff),
              now
            );
            createdAlerts.push({ id: alertId, documentId: doc.id });
          }
        }
      }

      const row = db.prepare(`SELECT * FROM sources WHERE id = ?`).get(sourceId);
      res.status(201).json({ source: rowToSource(row), createdAlerts });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erro ao cadastrar fonte.' });
    }
  });

  app.get('/api/files/:sourceId/download', requireUser, (req: AuthedRequest, res: Response) => {
    const src = db.prepare(`SELECT * FROM sources WHERE id = ?`).get(req.params.sourceId) as any;
    if (!src) {
      res.status(404).json({ error: 'Arquivo não encontrado.' });
      return;
    }
    const perm = checkStudentPermission(src.student_id, req.user!.id);
    if (!perm.allowed) {
      res.status(403).json({ error: perm.reason || 'Acesso negado ao arquivo privado.' });
      return;
    }
    if (!src.file_path) {
      res.status(404).json({ error: 'Esta fonte não possui arquivo binário anexado.' });
      return;
    }
    const fullPath = safeResolveStoragePath(UPLOADS_DIR, src.file_path);
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ error: 'Arquivo ausente no armazenamento privado.' });
      return;
    }
    res.download(fullPath, src.original_filename || `${src.title}.${src.file_ext}`);
  });

  // ==================== DOCUMENTS (EXISTING, ELABORATE, REVISE, REVIEW, DOWNLOAD) ====================
  // 1. Register an already-existing school document (does NOT force creating others first!)
  app.post('/api/students/:studentId/documents/existing', requireUser, upload.single('file'), async (req: AuthedRequest, res: Response) => {
    try {
      const perm = checkStudentPermission(req.params.studentId, req.user!.id);
      if (!perm.allowed || !perm.student) {
        res.status(403).json({ error: perm.reason || 'Acesso negado.' });
        return;
      }
      const b = req.body || {};
      const docType = String(b.docType || 'paee') as DocType;
      const title = String(b.title || `${docType.toUpperCase()} existente`).trim();
      const subject = String(b.subject || '');
      const schoolYear = String(b.schoolYear || perm.student.school_year || '2026');
      const bimester = String(b.bimester || '');
      const authorName = String(b.authorName || req.user!.name);
      const informedDate = String(b.informedDate || '');
      const summaryText = String(b.summaryText || '');
      const supportsRaw = String(b.supportsText || '');

      let extractedText = summaryText;
      let storedFilename = '';
      let originalFilename = '';
      let fileExt = 'txt';
      let createdSourceId: string | null = null;
      const now = new Date().toISOString();

      if (req.file) {
        originalFilename = req.file.originalname;
        fileExt = path.extname(originalFilename).replace(/^\./, '').toLowerCase() || 'bin';
        storedFilename = `${newId('file')}.${fileExt}`;
        const dest = safeResolveStoragePath(UPLOADS_DIR, storedFilename);
        fs.writeFileSync(dest, req.file.buffer);
        const extracted = await extractSourceContent(req.file.buffer, fileExt, req.file.mimetype);
        extractedText = [summaryText, extracted.extractedText].filter(Boolean).join('\n\n');

        createdSourceId = newId('src');
        db.prepare(
          `INSERT INTO sources (
            id, student_id, workspace_id, uploaded_by_user_id, source_kind, doc_category,
            title, subject, school_year, bimester, author_name, informed_date,
            version_number, status, file_path, original_filename, mime_type, file_ext,
            extracted_text, parsed_structure_json, is_editable_template, created_at
          ) VALUES (?, ?, ?, ?, 'documento_preenchido', ?, ?, ?, ?, ?, ?, ?, 1, 'ativo', ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          createdSourceId,
          req.params.studentId,
          perm.student.workspace_id,
          req.user!.id,
          docType,
          title,
          subject,
          schoolYear,
          bimester,
          authorName,
          informedDate,
          storedFilename,
          originalFilename,
          req.file.mimetype,
          fileExt,
          extractedText,
          JSON.stringify(extracted.parsedStructure),
          extracted.isEditableTemplate ? 1 : 0,
          now
        );
      }

      const supportsLines = supportsRaw
        .split(/\n|;/)
        .map((s) => s.trim())
        .filter(Boolean);

      const contentPayload: DocumentContentPayload = {
        generationMode: 'cadastro_manual',
        templateFormatNote: originalFilename
          ? `Documento existente cadastrado a partir de "${originalFilename}".`
          : 'Documento existente cadastrado com registro textual.',
        templateEditableUsed: false,
        fields: [
          {
            fieldKey: 'doc_existente_resumo',
            label: 'Síntese / Conteúdo cadastrado pela escola',
            location: 'Registro institucional existente',
            value: extractedText || 'Documento anexado ao prontuário escolar.',
            originKind: 'informacao_documentada',
            originReference: originalFilename || title,
            status: 'preservado',
            statusReason: 'Documento institucional pré-existente preservado integralmente.',
          },
        ],
        paeeSupports:
          docType === 'paee'
            ? (supportsLines.length > 0 ? supportsLines : [extractedText || 'Apoio registrado no PAEE existente']).map(
                (sup, idx) => ({
                  id: `paee_ex_${idx + 1}`,
                  barrierOrNeed: 'Necessidade documentada no PAEE existente',
                  supportType: sup,
                  availabilityStatus: 'disponivel' as const,
                  responsibilityStatus: 'confirmada' as const,
                  responsibleRole: authorName,
                  outcomeStatus: 'esperado' as const,
                  outcomeDescription: 'Conforme documento institucional cadastrado.',
                  originReference: `${title} (existente)`,
                })
              )
            : undefined,
        conflicts: [],
        narrativeGaps: [],
        pendingItems: [],
        missingRequestedFiles: [],
        consultedSources: createdSourceId
          ? [{ sourceId: createdSourceId, title, kind: 'documento_preenchido', versionNumber: 1, originNote: originalFilename }]
          : [],
      };

      const docId = newId('doc');
      db.prepare(
        `INSERT INTO documents (
          id, student_id, workspace_id, doc_type, title, subject, grade_level,
          school_year, bimester, author_name, informed_date, version_number, status,
          source_ids_json, template_source_id, content_json, output_file_path, output_file_ext,
          created_by_user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'existente', ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        docId,
        req.params.studentId,
        perm.student.workspace_id,
        docType,
        title,
        subject,
        perm.student.grade_level,
        schoolYear,
        bimester,
        authorName,
        informedDate,
        JSON.stringify(createdSourceId ? [createdSourceId] : []),
        createdSourceId,
        JSON.stringify(contentPayload),
        storedFilename ? `upload:${storedFilename}` : '',
        fileExt,
        req.user!.id,
        now,
        now
      );

      const row = db.prepare(`SELECT * FROM documents WHERE id = ?`).get(docId);
      res.status(201).json({ document: rowToDocument(row) });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erro ao cadastrar documento existente.' });
    }
  });

  // 2. Elaborate or Revise Estudo de Caso, PAEE, or PEI
  app.post('/api/students/:studentId/documents/generate', requireUser, async (req: AuthedRequest, res: Response) => {
    try {
      const perm = checkStudentPermission(req.params.studentId, req.user!.id);
      if (!perm.allowed || !perm.student || !perm.membership) {
        res.status(403).json({ error: perm.reason || 'Acesso negado.' });
        return;
      }

      const b = req.body || {};
      const docType = String(b.docType || 'estudo_de_caso') as DocType;
      const templateSourceId = b.templateSourceId ? String(b.templateSourceId) : null;
      const selectedSourceIds: string[] = Array.isArray(b.sourceIds) ? b.sourceIds : [];
      const subject = String(b.subject || '');
      const bimester = String(b.bimester || '');
      const schoolYear = String(b.schoolYear || perm.student.school_year || '2026');
      const revisionInstruction = b.revisionInstruction ? String(b.revisionInstruction) : undefined;
      const previousVersionId = b.previousVersionId ? String(b.previousVersionId) : null;
      const selectedApplicationIds: string[] = Array.isArray(b.applicationIds) ? b.applicationIds : [];
      const confirmIntegral = Boolean(b.confirmIntegral);
      const confirmedDate = b.confirmedDate ? String(b.confirmedDate) : '';
      const confirmedCurriculum = b.confirmedCurriculum ? String(b.confirmedCurriculum) : '';
      const requestAi = b.useAi !== false;

      // Enforce institutional AI privacy gate: external AI is disabled by default until enabled by workspace!
      const useAi = Boolean(requestAi && perm.membership.aiExternalEnabled);

      const sourcesRows =
        selectedSourceIds.length > 0
          ? (db
              .prepare(
                `SELECT * FROM sources WHERE student_id = ? AND id IN (${selectedSourceIds.map(() => '?').join(',')})`
              )
              .all(req.params.studentId, ...selectedSourceIds) as any[])
          : (db.prepare(`SELECT * FROM sources WHERE student_id = ? AND status = 'ativo'`).all(req.params.studentId) as any[]);

      const sources = sourcesRows.map(rowToSource);
      const templateSource = templateSourceId
        ? sources.find((s) => s.id === templateSourceId) ||
          (() => {
            const tr = db.prepare(`SELECT * FROM sources WHERE id = ? AND student_id = ?`).get(templateSourceId, req.params.studentId);
            return tr ? rowToSource(tr) : null;
          })()
        : null;

      let periodApplications: ApplicationFeedback[] = [];
      if (selectedApplicationIds.length > 0) {
        const apRows = db
          .prepare(
            `SELECT ap.*, ac.title AS activity_title, ac.subject, ac.bimester, ac.school_year
             FROM applications ap
             JOIN activities ac ON ac.id = ap.activity_id
             WHERE ap.student_id = ? AND ap.id IN (${selectedApplicationIds.map(() => '?').join(',')})`
          )
          .all(req.params.studentId, ...selectedApplicationIds);
        periodApplications = apRows.map(rowToApplication);
      }

      const studentObj = rowToStudent(perm.student);
      const payload = await generateDocumentDraft({
        docType,
        student: studentObj,
        sources,
        templateSource,
        subject,
        bimester,
        schoolYear,
        revisionInstruction,
        periodApplications,
        useAi,
        isDemo: false,
        confirmedCurriculum,
      });

      let versionNumber = 1;
      if (previousVersionId) {
        const prev = db.prepare(`SELECT version_number FROM documents WHERE id = ?`).get(previousVersionId) as any;
        if (prev) versionNumber = (prev.version_number || 1) + 1;
      } else {
        const maxRow = db
          .prepare(`SELECT MAX(version_number) AS max_v FROM documents WHERE student_id = ? AND doc_type = ?`)
          .get(req.params.studentId, docType) as any;
        versionNumber = (maxRow?.max_v || 0) + 1;
      }

      // If editable template DOCX or XLSX was supplied, create a faithful copy and populate ONLY authorized targets!
      let outputFileName = '';
      let outputFileExt = '';
      if (templateSource && templateSource.isEditableTemplate) {
        const origRow = db.prepare(`SELECT file_path FROM sources WHERE id = ?`).get(templateSource.id) as any;
        if (origRow?.file_path) {
          const tplPath = safeResolveStoragePath(UPLOADS_DIR, origRow.file_path);
          if (fs.existsSync(tplPath)) {
            const tplBuf = fs.readFileSync(tplPath);
            if (templateSource.fileExt === 'docx') {
              const filled = await fillDocxTemplate({
                templateBuffer: tplBuf,
                docType,
                payload,
                student: studentObj,
                confirmIntegral,
                confirmedDate,
              });
              outputFileExt = 'docx';
              outputFileName = `${newId('out')}.docx`;
              fs.writeFileSync(safeResolveStoragePath(GENERATED_DIR, outputFileName), filled.outputBuffer);
              payload.comparisonReport = filled.comparisonReport;
            } else if (templateSource.fileExt === 'xlsx' && docType === 'pei') {
              const filled = await fillXlsxTemplate({
                templateBuffer: tplBuf,
                payload,
                student: studentObj,
                bimester,
                subject,
                schoolYear,
              });
              outputFileExt = 'xlsx';
              outputFileName = `${newId('out')}.xlsx`;
              fs.writeFileSync(safeResolveStoragePath(GENERATED_DIR, outputFileName), filled.outputBuffer);
              payload.comparisonReport = filled.comparisonReport;
            }
          }
        }
      }

      const typeLabel =
        docType === 'estudo_de_caso' ? 'Estudo de Caso' : docType === 'paee' ? 'PAEE' : 'PEI';
      const title =
        String(b.title || '').trim() ||
        `${typeLabel}${subject ? ` · ${subject}` : ''}${bimester ? ` (${bimester})` : ''} — ${studentObj.displayName}`;

      const docId = newId('doc');
      const now = new Date().toISOString();
      db.prepare(
        `INSERT INTO documents (
          id, student_id, workspace_id, doc_type, title, subject, grade_level,
          school_year, bimester, author_name, informed_date, version_number, status,
          source_ids_json, template_source_id, content_json, output_file_path, output_file_ext,
          previous_version_id, created_by_user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'minuta', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        docId,
        req.params.studentId,
        perm.student.workspace_id,
        docType,
        title,
        subject,
        studentObj.gradeLevel,
        schoolYear,
        bimester,
        req.user!.name,
        confirmedDate,
        versionNumber,
        JSON.stringify(sources.map((s) => s.id)),
        templateSource?.id || null,
        JSON.stringify(payload),
        outputFileName,
        outputFileExt,
        previousVersionId,
        req.user!.id,
        now,
        now
      );

      const row = db.prepare(`SELECT * FROM documents WHERE id = ?`).get(docId);
      res.status(201).json({
        document: rowToDocument(row),
        aiUsed: useAi,
        aiGateNotice:
          !perm.membership.aiExternalEnabled && requestAi
            ? 'Envio de dados escolares reais à IA externa está desabilitado por padrão neste espaço. Foi gerada minuta estruturada localmente a partir das fontes selecionadas.'
            : null,
      });
    } catch (err: any) {
      const status = Number(err?.statusCode || 500);
      res.status(status >= 400 && status < 600 ? status : 500).json({ error: err?.message || 'Erro ao elaborar documento.' });
    }
  });

  // Update draft content or mark as team-reviewed ("revisada_pela_equipe")
  app.put('/api/documents/:docId', requireUser, async (req: AuthedRequest, res: Response) => {
    try {
      const doc = db.prepare(`SELECT * FROM documents WHERE id = ?`).get(req.params.docId) as any;
      if (!doc) {
        res.status(404).json({ error: 'Documento não encontrado.' });
        return;
      }
      const perm = checkStudentPermission(doc.student_id, req.user!.id);
      if (!perm.allowed || !perm.student) {
        res.status(403).json({ error: perm.reason || 'Acesso negado.' });
        return;
      }

      const b = req.body || {};
      const newContent: DocumentContentPayload = b.content || JSON.parse(doc.content_json || '{}');
      const newStatus = b.status === 'revisada_pela_equipe' ? 'revisada_pela_equipe' : doc.status === 'existente' ? 'existente' : 'minuta';
      const now = new Date().toISOString();

      // Regenerate output file from template if template exists & content changed
      let outputFilePath = doc.output_file_path;
      let outputFileExt = doc.output_file_ext;
      if (doc.template_source_id && !String(outputFilePath).startsWith('upload:')) {
        const tplRow = db.prepare(`SELECT * FROM sources WHERE id = ?`).get(doc.template_source_id) as any;
        if (tplRow?.file_path && tplRow.is_editable_template === 1) {
          const tplFull = safeResolveStoragePath(UPLOADS_DIR, tplRow.file_path);
          if (fs.existsSync(tplFull)) {
            const tplBuf = fs.readFileSync(tplFull);
            const studentObj = rowToStudent(perm.student);
            if (tplRow.file_ext === 'docx') {
              const filled = await fillDocxTemplate({
                templateBuffer: tplBuf,
                docType: doc.doc_type,
                payload: newContent,
                student: studentObj,
                confirmIntegral: Boolean(b.confirmIntegral),
                confirmedDate: String(b.confirmedDate || doc.informed_date || ''),
              });
              outputFileExt = 'docx';
              outputFilePath = outputFilePath || `${newId('out')}.docx`;
              fs.writeFileSync(safeResolveStoragePath(GENERATED_DIR, outputFilePath), filled.outputBuffer);
              newContent.comparisonReport = filled.comparisonReport;
            } else if (tplRow.file_ext === 'xlsx' && doc.doc_type === 'pei') {
              const filled = await fillXlsxTemplate({
                templateBuffer: tplBuf,
                payload: newContent,
                student: studentObj,
                bimester: doc.bimester,
                subject: doc.subject,
                schoolYear: doc.school_year,
              });
              outputFileExt = 'xlsx';
              outputFilePath = outputFilePath || `${newId('out')}.xlsx`;
              fs.writeFileSync(safeResolveStoragePath(GENERATED_DIR, outputFilePath), filled.outputBuffer);
              newContent.comparisonReport = filled.comparisonReport;
            }
          }
        }
      }

      db.prepare(
        `UPDATE documents SET
          title = ?, status = ?, content_json = ?, output_file_path = ?, output_file_ext = ?,
          reviewed_by_name = ?, reviewed_at = ?, updated_at = ?
         WHERE id = ?`
      ).run(
        String(b.title || doc.title),
        newStatus,
        JSON.stringify(newContent),
        outputFilePath,
        outputFileExt,
        newStatus === 'revisada_pela_equipe' ? req.user!.name : doc.reviewed_by_name,
        newStatus === 'revisada_pela_equipe' ? now : doc.reviewed_at,
        now,
        doc.id
      );

      const updated = db.prepare(`SELECT * FROM documents WHERE id = ?`).get(doc.id);
      res.json({ document: rowToDocument(updated) });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erro ao atualizar documento.' });
    }
  });

  app.get('/api/documents/:docId/download', requireUser, (req: AuthedRequest, res: Response) => {
    const doc = db.prepare(`SELECT * FROM documents WHERE id = ?`).get(req.params.docId) as any;
    if (!doc) {
      res.status(404).json({ error: 'Documento não encontrado.' });
      return;
    }
    const perm = checkStudentPermission(doc.student_id, req.user!.id);
    if (!perm.allowed) {
      res.status(403).json({ error: perm.reason || 'Acesso negado ao documento.' });
      return;
    }
    if (!doc.output_file_path) {
      res.status(400).json({
        error:
          'Este documento não possui arquivo editável preenchido (modelo ausente ou enviado apenas como PDF/imagem de referência). Anexe a versão editável em DOCX ou XLSX.',
      });
      return;
    }
    const isUpload = String(doc.output_file_path).startsWith('upload:');
    const baseDir = isUpload ? UPLOADS_DIR : GENERATED_DIR;
    const filenameOnly = isUpload ? String(doc.output_file_path).slice('upload:'.length) : doc.output_file_path;
    const fullPath = safeResolveStoragePath(baseDir, filenameOnly);
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ error: 'Arquivo não encontrado no armazenamento privado.' });
      return;
    }
    const safeDownloadName = `${doc.title.replace(/[^a-zA-Z0-9À-ÿ _-]/g, '')}_v${doc.version_number}.${doc.output_file_ext || 'docx'}`;
    res.download(fullPath, safeDownloadName);
  });

  app.post('/api/alerts/:alertId/resolve', requireUser, (req: AuthedRequest, res: Response) => {
    const alert = db.prepare(`SELECT * FROM update_alerts WHERE id = ?`).get(req.params.alertId) as any;
    if (!alert) {
      res.status(404).json({ error: 'Alerta não encontrado.' });
      return;
    }
    const perm = checkStudentPermission(alert.student_id, req.user!.id);
    if (!perm.allowed) {
      res.status(403).json({ error: perm.reason || 'Acesso negado.' });
      return;
    }
    const action = req.body?.action === 'aceitar' ? 'aceito' : 'descartado';
    db.prepare(`UPDATE update_alerts SET status = ? WHERE id = ?`).run(action, alert.id);
    res.json({ ok: true, status: action });
  });

  // ==================== ACTIVITIES & LESSON PLANS ====================
  app.post('/api/students/:studentId/activities/generate', requireUser, async (req: AuthedRequest, res: Response) => {
    try {
      const perm = checkStudentPermission(req.params.studentId, req.user!.id);
      if (!perm.allowed || !perm.student || !perm.membership) {
        res.status(403).json({ error: perm.reason || 'Acesso negado.' });
        return;
      }

      const b = req.body || {};
      const studentObj = rowToStudent(perm.student);
      const kind = (b.kind === 'plano_de_aula' ? 'plano_de_aula' : 'atividade') as 'atividade' | 'plano_de_aula';
      const subject = String(b.subject || 'Geral');
      const theme = String(b.theme || '').trim();
      if (!theme) {
        res.status(400).json({ error: 'Informe o tema ou conteúdo atual da turma.' });
        return;
      }

      const peiDocumentId = b.peiDocumentId ? String(b.peiDocumentId) : null;
      const peiObjectiveId = b.peiObjectiveId ? String(b.peiObjectiveId) : null;
      let peiObjectiveText = String(b.peiObjectiveText || '');
      let paeeDocumentId = b.paeeDocumentId ? String(b.paeeDocumentId) : null;
      let paeeSupportUsed = String(b.paeeSupportUsed || '');

      if (peiDocumentId && !peiObjectiveText) {
        const peiDoc = db.prepare(`SELECT * FROM documents WHERE id = ? AND student_id = ?`).get(peiDocumentId, studentObj.id) as any;
        if (peiDoc) {
          const c: DocumentContentPayload = JSON.parse(peiDoc.content_json || '{}');
          const foundObj = c.peiObjectives?.find((o) => o.id === peiObjectiveId) || c.peiObjectives?.[0];
          if (foundObj) peiObjectiveText = foundObj.adaptedObjective;
        }
      }

      if (!paeeSupportUsed) {
        const paeeRow = db
          .prepare(`SELECT * FROM documents WHERE student_id = ? AND doc_type = 'paee' ORDER BY updated_at DESC LIMIT 1`)
          .get(studentObj.id) as any;
        if (paeeRow) {
          paeeDocumentId = paeeRow.id;
          const pc: DocumentContentPayload = JSON.parse(paeeRow.content_json || '{}');
          if (pc.paeeSupports && pc.paeeSupports.length > 0) {
            paeeSupportUsed = pc.paeeSupports[0].supportType;
          }
        }
      }

      const requestedAi = b.useAi === true;
      if (requestedAi && !perm.membership.aiExternalEnabled) {
        res.status(403).json({
          error:
            'A geração com IA ainda não foi autorizada neste espaço. Ative a autorização institucional de IA para gerar atividades com a API Gemini.',
        });
        return;
      }
      const useAi = Boolean(b.useAi !== false && perm.membership.aiExternalEnabled);
      const result = await generateAdaptedActivityOrPlan({
        kind,
        student: studentObj,
        teacherName: req.user!.name,
        subject,
        theme,
        bimester: String(b.bimester || '1º Bimestre'),
        schoolYear: String(b.schoolYear || studentObj.schoolYear || '2026'),
        durationMinutes: Number(b.durationMinutes || 50),
        literacyStage: b.literacyStage === 'alfabetizacao_inicial' ? 'alfabetizacao_inicial' : 'alfabetizado',
        accessibilityMode: b.accessibilityMode || 'padrao',
        includeAnswerKey: Boolean(b.includeAnswerKey),
        classMaterialText: String(b.classMaterialText || ''),
        peiObjectiveText,
        paeeSupportUsed,
        useAi,
        generateImages: b.generateImages !== false,
        isDemo: false,
      });

      if (result.scopeRedirect) {
        res.status(422).json({ scopeRedirect: result.scopeRedirect });
        return;
      }

      const actId = newId('act');
      const now = new Date().toISOString();
      db.prepare(
        `INSERT INTO activities (
          id, student_id, workspace_id, kind, title, subject, theme, bimester, school_year,
          duration_minutes, literacy_stage, accessibility_mode, pei_document_id, pei_objective_id,
          pei_objective_text, paee_document_id, paee_support_used, version_number, content_json,
          created_by_user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`
      ).run(
        actId,
        studentObj.id,
        studentObj.workspaceId,
        kind,
        result.title,
        subject,
        theme,
        String(b.bimester || '1º Bimestre'),
        String(b.schoolYear || studentObj.schoolYear || '2026'),
        Math.min(Number(b.durationMinutes || 50), 50),
        b.literacyStage === 'alfabetizacao_inicial' ? 'alfabetizacao_inicial' : 'alfabetizado',
        b.accessibilityMode || 'padrao',
        peiDocumentId,
        peiObjectiveId,
        peiObjectiveText,
        paeeDocumentId,
        paeeSupportUsed,
        JSON.stringify(result.content),
        req.user!.id,
        now,
        now
      );

      const row = db.prepare(`SELECT * FROM activities WHERE id = ?`).get(actId);
      res.status(201).json({ activity: rowToActivity(row), aiUsed: result.aiUsed, imagesGenerated: result.imagesGenerated });
    } catch (err: any) {
      const status = Number(err?.statusCode || 500);
      res.status(status >= 400 && status < 600 ? status : 500).json({ error: err?.message || 'Erro ao gerar atividade.' });
    }
  });

  app.put('/api/activities/:activityId', requireUser, (req: AuthedRequest, res: Response) => {
    const act = db.prepare(`SELECT * FROM activities WHERE id = ?`).get(req.params.activityId) as any;
    if (!act) {
      res.status(404).json({ error: 'Atividade não encontrada.' });
      return;
    }
    const perm = checkStudentPermission(act.student_id, req.user!.id);
    if (!perm.allowed) {
      res.status(403).json({ error: perm.reason || 'Acesso negado.' });
      return;
    }
    const b = req.body || {};
    const nextVersion = (act.version_number || 1) + 1;
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE activities SET title = ?, content_json = ?, version_number = ?, updated_at = ? WHERE id = ?`
    ).run(
      String(b.title || act.title),
      JSON.stringify(b.content || JSON.parse(act.content_json || '{}')),
      nextVersion,
      now,
      act.id
    );
    const updated = db.prepare(`SELECT * FROM activities WHERE id = ?`).get(act.id);
    res.json({ activity: rowToActivity(updated) });
  });

  app.get('/api/activities/:activityId/docx', requireUser, async (req: AuthedRequest, res: Response) => {
    try {
      const act = db.prepare(`SELECT * FROM activities WHERE id = ?`).get(req.params.activityId) as any;
      if (!act) {
        res.status(404).json({ error: 'Atividade não encontrada.' });
        return;
      }
      const perm = checkStudentPermission(act.student_id, req.user!.id);
      if (!perm.allowed) {
        res.status(403).json({ error: perm.reason || 'Acesso negado.' });
        return;
      }
      const includeAnswerKey = req.query.gabarito === '1';
      const actObj = rowToActivity(act);
      const buf = await buildActivityDocx(actObj, includeAnswerKey);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="ApoIA.Edu_${actObj.kind}_v${actObj.versionNumber}.docx"`
      );
      res.send(buf);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erro ao exportar DOCX.' });
    }
  });

  // ==================== FEEDBACK & DEVELOPMENT ====================
  app.post('/api/activities/:activityId/applications', requireUser, (req: AuthedRequest, res: Response) => {
    const act = db.prepare(`SELECT * FROM activities WHERE id = ?`).get(req.params.activityId) as any;
    if (!act) {
      res.status(404).json({ error: 'Atividade não encontrada.' });
      return;
    }
    const perm = checkStudentPermission(act.student_id, req.user!.id);
    if (!perm.allowed) {
      res.status(403).json({ error: perm.reason || 'Acesso negado.' });
      return;
    }
    const b = req.body || {};
    const status = b.status === 'nao_aplicada' ? 'nao_aplicada' : 'aplicada';
    const id = newId('app');
    const now = new Date().toISOString();
    const appliedDate = String(b.appliedDate || now.slice(0, 10));

    db.prepare(
      `INSERT INTO applications (
        id, activity_id, student_id, workspace_id, activity_version, teacher_id, teacher_name,
        objective_text, applied_date, status, participation, objective_status, support_level,
        helpful_resource, brief_observation, next_step, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      act.id,
      act.student_id,
      act.workspace_id,
      act.version_number,
      req.user!.id,
      req.user!.name,
      String(b.objectiveText || act.pei_objective_text || act.title),
      appliedDate,
      status,
      status === 'nao_aplicada' ? '' : String(b.participation || 'participou'),
      status === 'nao_aplicada' ? '' : String(b.objectiveStatus || 'parcialmente_alcancado'),
      status === 'nao_aplicada' ? '' : String(b.supportLevel || 'apoio_pontual'),
      status === 'nao_aplicada' ? '' : String(b.helpfulResource || ''),
      String(b.briefObservation || ''),
      String(b.nextStep || ''),
      now
    );

    const row = db
      .prepare(
        `SELECT ap.*, ac.title AS activity_title, ac.subject, ac.bimester, ac.school_year
         FROM applications ap JOIN activities ac ON ac.id = ap.activity_id
         WHERE ap.id = ?`
      )
      .get(id);
    res.status(201).json({ application: rowToApplication(row) });
  });

  // ==================== ISOLATED SESSION DEMO ====================
  const buildDemoStateResponse = (state: ReturnType<typeof getOrCreateDemoSession>) => {
    const { user: activeUser, accessRevoked } = getActiveDemoUser(state);
    const visibleStudents = getVisibleDemoStudents(state);
    const visibleIds = new Set(visibleStudents.map((s) => s.id));
    const teachers = state.members
      .filter((m) => m.role === 'teacher')
      .map((m) => ({
        userId: m.user_id,
        name: m.name,
        email: m.email,
        role: m.role,
        status: m.status,
      }));
    return {
      isDemo: true,
      user: activeUser,
      demoProfile: {
        mode: state.activeProfile,
        activeTeacherUserId: state.activeTeacherUserId,
        accessRevoked,
        teachers,
      },
      workspace: {
        id: 'demo_ws_escola_exemplo',
        type: 'school',
        name: 'E.M. Horizonte Inclusivo (Demonstração Fictícia)',
        city: 'São Paulo',
        state: 'SP',
        role: state.activeProfile === 'school_admin' ? 'admin' : 'teacher',
        aiExternalEnabled: state.aiExternalEnabled,
        ownerUserId: 'demo_admin_coord',
      },
      students: visibleStudents,
      sources: state.sources.filter((s) => visibleIds.has(s.studentId)),
      documents: state.documents.filter((d) => visibleIds.has(d.studentId)),
      activities: state.activities.filter((a) => visibleIds.has(a.studentId)),
      applications: state.applications.filter((ap) => visibleIds.has(ap.studentId)),
      alerts: state.alerts,
    };
  };

  app.get('/api/demo/state', (req: Request, res: Response) => {
    const state = getOrCreateDemoSession(req, res);
    const reqProfile = req.query.profile;
    if (reqProfile === 'school_admin' || reqProfile === 'teacher') {
      state.activeProfile = reqProfile;
    }
    const reqTeacher = req.query.teacherUserId;
    if (typeof reqTeacher === 'string' && state.members.some((m) => m.user_id === reqTeacher)) {
      state.activeTeacherUserId = reqTeacher;
    }
    res.json(buildDemoStateResponse(state));
  });

  app.post('/api/demo/profile', (req: Request, res: Response) => {
    const state = getOrCreateDemoSession(req, res);
    const { mode, teacherUserId } = req.body || {};
    if (mode === 'school_admin' || mode === 'teacher') {
      state.activeProfile = mode;
    }
    if (typeof teacherUserId === 'string' && state.members.some((m) => m.user_id === teacherUserId)) {
      state.activeTeacherUserId = teacherUserId;
    }
    res.json(buildDemoStateResponse(state));
  });

  app.post('/api/demo/students', (req: Request, res: Response) => {
    const state = getOrCreateDemoSession(req, res);
    if (state.activeProfile !== 'school_admin') {
      res.status(403).json({ error: 'Na demonstração, apenas o Perfil Escola pode cadastrar novos estudantes.' });
      return;
    }
    const b = req.body || {};
    if (!b.displayName || !String(b.displayName).trim()) {
      res.status(400).json({ error: 'Informe o nome de uso ou iniciais do estudante.' });
      return;
    }
    const now = new Date().toISOString();
    const newStudent: Student = {
      id: newId('demo_std'),
      workspaceId: 'demo_ws_escola_exemplo',
      createdByUserId: 'demo_admin_coord',
      displayName: String(b.displayName).trim(),
      codeOrInitials: String(b.codeOrInitials || ''),
      schoolName: 'E.M. Horizonte Inclusivo (Exemplo Fictício)',
      schoolYear: String(b.schoolYear || '2026'),
      gradeLevel: String(b.gradeLevel || ''),
      classroom: String(b.classroom || ''),
      strengths: String(b.strengths || ''),
      interests: String(b.interests || ''),
      learningLevel: String(b.learningLevel || ''),
      communicationModes: String(b.communicationModes || ''),
      barriers: String(b.barriers || ''),
      workingStrategies: String(b.workingStrategies || ''),
      accessibilityResources: String(b.accessibilityResources || ''),
      latestPedagogicalEval: String(b.latestPedagogicalEval || ''),
      createdAt: now,
      updatedAt: now,
    };
    state.students.push(newStudent);
    res.status(201).json({ student: newStudent });
  });

  app.get('/api/demo/workspace/members', (req: Request, res: Response) => {
    const state = getOrCreateDemoSession(req, res);
    if (state.activeProfile !== 'school_admin') {
      res.status(403).json({ error: 'Acesso restrito ao Perfil Escola na demonstração.' });
      return;
    }
    const links = state.studentLinks.map((lk) => {
      const student = state.students.find((s) => s.id === lk.student_id);
      const teacher = state.members.find((m) => m.user_id === lk.user_id);
      return {
        ...lk,
        student_name: student?.displayName || 'Estudante',
        teacher_name: teacher?.name || 'Professor(a)',
        teacher_email: teacher?.email || '',
      };
    });
    res.json({
      members: state.members,
      invitations: state.invitations,
      links,
    });
  });

  app.post('/api/demo/workspace/invite', (req: Request, res: Response) => {
    const state = getOrCreateDemoSession(req, res);
    if (state.activeProfile !== 'school_admin') {
      res.status(403).json({ error: 'Somente o Perfil Escola pode adicionar professores na demonstração.' });
      return;
    }
    const { email, name, role } = req.body || {};
    if (!email || !String(email).trim()) {
      res.status(400).json({ error: 'Informe o e-mail do(a) professor(a).' });
      return;
    }
    const normEmail = String(email).trim().toLowerCase();
    const targetRole = role === 'admin' ? 'admin' : 'teacher';
    const now = new Date().toISOString();
    const token = `CONV-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const displayName =
      name && String(name).trim()
        ? String(name).trim()
        : `Prof. ${normEmail.split('@')[0].replace(/[._-]+/g, ' ')}`;

    let existingMember = state.members.find((m) => m.email.toLowerCase() === normEmail);
    if (existingMember) {
      existingMember.status = 'active';
      existingMember.role = targetRole;
      existingMember.revoked_at = null;
      if (name && String(name).trim()) {
        existingMember.name = String(name).trim();
      }
    } else {
      existingMember = {
        id: newId('demo_wm'),
        user_id: newId('demo_teacher'),
        name: displayName,
        email: normEmail,
        role: targetRole,
        status: 'active',
        created_at: now,
        revoked_at: null,
      };
      state.members.push(existingMember);
    }

    const invId = newId('demo_inv');
    state.invitations.unshift({
      id: invId,
      email: normEmail,
      role: targetRole,
      token,
      status: 'accepted',
      created_at: now,
    });
    if (targetRole === 'teacher') {
      state.activeTeacherUserId = existingMember.user_id;
    }

    res.status(201).json({
      id: invId,
      email: normEmail,
      role: targetRole,
      token,
      status: 'accepted',
      directActivated: true,
      teacherName: existingMember.name,
      userId: existingMember.user_id,
    });
  });

  app.post('/api/demo/workspace/student-links', (req: Request, res: Response) => {
    const state = getOrCreateDemoSession(req, res);
    if (state.activeProfile !== 'school_admin') {
      res.status(403).json({ error: 'Somente o Perfil Escola pode vincular professores a estudantes.' });
      return;
    }
    const { studentId, teacherUserId, roleLabel } = req.body || {};
    const student = state.students.find((s) => s.id === studentId);
    const member = state.members.find((m) => m.user_id === teacherUserId && m.status === 'active');
    if (!student || !member) {
      res.status(400).json({ error: 'Estudante ou profissional ativo não encontrado na demonstração.' });
      return;
    }
    const existing = state.studentLinks.find(
      (lk) => lk.student_id === studentId && lk.user_id === teacherUserId
    );
    if (existing) {
      existing.status = 'active';
      existing.role_label = String(roleLabel || 'Professor(a)');
      existing.revoked_at = null;
    } else {
      state.studentLinks.push({
        id: newId('demo_stlink'),
        student_id: studentId,
        user_id: teacherUserId,
        role_label: String(roleLabel || 'Professor(a)'),
        status: 'active',
        revoked_at: null,
      });
    }
    res.json({ ok: true });
  });

  app.post('/api/demo/workspace/student-links/:linkId/revoke', (req: Request, res: Response) => {
    const state = getOrCreateDemoSession(req, res);
    if (state.activeProfile !== 'school_admin') {
      res.status(403).json({ error: 'Somente o Perfil Escola pode desvincular.' });
      return;
    }
    const lk = state.studentLinks.find((l) => l.id === req.params.linkId);
    if (lk) {
      lk.status = 'revoked';
      lk.revoked_at = new Date().toISOString();
    }
    res.json({ ok: true });
  });

  app.post('/api/demo/workspace/members/:userId/revoke', (req: Request, res: Response) => {
    const state = getOrCreateDemoSession(req, res);
    if (state.activeProfile !== 'school_admin') {
      res.status(403).json({ error: 'Somente o Perfil Escola pode encerrar acessos.' });
      return;
    }
    if (req.params.userId === 'demo_admin_coord') {
      res.status(400).json({ error: 'Não é possível encerrar a coordenação principal da demonstração.' });
      return;
    }
    const now = new Date().toISOString();
    const member = state.members.find((m) => m.user_id === req.params.userId);
    if (member) {
      member.status = 'revoked';
      member.revoked_at = now;
    }
    for (const lk of state.studentLinks) {
      if (lk.user_id === req.params.userId) {
        lk.status = 'revoked';
        lk.revoked_at = now;
      }
    }
    res.json({ ok: true });
  });

  app.patch('/api/demo/workspace/settings', (req: Request, res: Response) => {
    const state = getOrCreateDemoSession(req, res);
    if (state.activeProfile !== 'school_admin') {
      res.status(403).json({ error: 'Somente o Perfil Escola pode alterar configurações.' });
      return;
    }
    const { aiExternalEnabled } = req.body || {};
    if (typeof aiExternalEnabled === 'boolean') {
      state.aiExternalEnabled = aiExternalEnabled;
    }
    res.json(buildDemoStateResponse(state));
  });

  // ==================== DEMO INTER-SCHOOL STUDENT TRANSFERS & APPROVALS ====================
  app.get('/api/demo/workspace/student-transfers', (req: Request, res: Response) => {
    const state = getOrCreateDemoSession(req, res);
    if (state.activeProfile !== 'school_admin') {
      res.status(403).json({ error: 'Somente o Perfil Escola pode gerenciar transferências na demonstração.' });
      return;
    }
    const outgoing = state.transfers.filter((t) => t.direction === 'enviada');
    const incoming = state.transfers.filter((t) => t.direction === 'recebida');
    res.json({ outgoing, incoming });
  });

  app.post('/api/demo/workspace/student-transfers', (req: Request, res: Response) => {
    const state = getOrCreateDemoSession(req, res);
    if (state.activeProfile !== 'school_admin') {
      res.status(403).json({ error: 'Somente o Perfil Escola pode repassar acesso de estudantes.' });
      return;
    }
    const { studentId, targetSchoolName, targetSchoolEmail, transferNote } = req.body || {};
    const cleanSchoolName = String(targetSchoolName || '').trim().slice(0, 160);
    const cleanEmail = String(targetSchoolEmail || '').trim().toLowerCase();
    const cleanNote = String(transferNote || '').trim().slice(0, 800);
    if (!studentId || !cleanSchoolName || !cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      res.status(400).json({ error: 'Selecione o estudante e informe o nome e um e-mail institucional válido da nova escola.' });
      return;
    }
    const student = state.students.find((s) => s.id === studentId);
    if (!student) {
      res.status(404).json({ error: 'Estudante não encontrado na escola de demonstração.' });
      return;
    }
    if (state.transfers.some((t) => t.studentId === studentId && t.status === 'pendente')) {
      res.status(409).json({ error: 'Já existe uma transferência pendente para este estudante.' });
      return;
    }
    const now = new Date().toISOString();
    const transfer: StudentTransferRecord = {
      id: newId('demo_trf'),
      studentId: student.id,
      studentDisplayName: student.displayName,
      studentGradeLevel: student.gradeLevel,
      studentClassroom: student.classroom,
      fromWorkspaceId: 'demo_ws_escola_exemplo',
      fromSchoolName: 'E.M. Horizonte Inclusivo (Exemplo Fictício)',
      targetWorkspaceId: null,
      targetSchoolName: cleanSchoolName,
      targetSchoolEmail: cleanEmail,
      transferCode: `TRF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      status: 'pendente',
      transferNote: cleanNote,
      initiatedByName: 'Coord.ª Helena Martins (Escola)',
      reviewedByName: '',
      reviewNote: '',
      reviewedAt: null,
      createdAt: now,
      documentsCount: state.documents.filter((d) => d.studentId === student.id).length,
      activitiesCount: state.activities.filter((a) => a.studentId === student.id).length,
      direction: 'enviada',
    };
    state.transfers.unshift(transfer);
    res.status(201).json({ transfer });
  });

  app.post('/api/demo/workspace/student-transfers/lookup', (req: Request, res: Response) => {
    const state = getOrCreateDemoSession(req, res);
    if (state.activeProfile !== 'school_admin') {
      res.status(403).json({ error: 'Somente o Perfil Escola pode consultar códigos de transferência.' });
      return;
    }
    const cleanCode = String(req.body?.transferCode || '').trim().toUpperCase();
    const found = state.transfers.find(
      (t) => t.transferCode.toUpperCase() === cleanCode && t.status === 'pendente' && t.direction === 'recebida'
    );
    if (!found) {
      res.status(404).json({ error: 'Nenhuma transferência pendente para aprovação encontrada com este código (dica demo: TRF-DEMO2026).' });
      return;
    }
    res.json({ transfer: found });
  });

  app.post('/api/demo/workspace/student-transfers/:transferId/approve', (req: Request, res: Response) => {
    const state = getOrCreateDemoSession(req, res);
    if (state.activeProfile !== 'school_admin') {
      res.status(403).json({ error: 'Somente o Perfil Escola pode aprovar a inclusão de estudantes.' });
      return;
    }
    const { approvedConfirmation, reviewNote } = req.body || {};
    if (approvedConfirmation !== true) {
      res.status(400).json({ error: 'Marque a confirmação institucional de aprovação da inclusão antes de concluir.' });
      return;
    }
    const transfer = state.transfers.find((t) => t.id === req.params.transferId && t.direction === 'recebida');
    if (!transfer) {
      res.status(404).json({ error: 'Solicitação de inclusão não encontrada.' });
      return;
    }
    if (transfer.status !== 'pendente') {
      res.status(409).json({ error: `Esta solicitação já foi finalizada (${transfer.status}).` });
      return;
    }
    const now = new Date().toISOString();
    transfer.status = 'aprovada';
    transfer.reviewedByName = 'Coord.ª Helena Martins (Escola)';
    transfer.reviewNote = String(reviewNote || '').trim().slice(0, 800);
    transfer.reviewedAt = now;

    // Include incoming student bundle into the demo school's active students!
    const bundle = state.incomingStudents.find((b) => b.transferId === transfer.id);
    if (bundle && !state.students.some((s) => s.id === bundle.student.id)) {
      state.students.push(bundle.student);
      state.documents.push(...bundle.documents);
      state.activities.push(...bundle.activities);
      state.applications.push(...bundle.applications);
      state.studentLinks.push({
        id: newId('demo_stlink'),
        student_id: bundle.student.id,
        user_id: 'demo_teacher_mariana',
        role_label: 'Professor(a) de AEE',
        status: 'active',
        revoked_at: null,
      });
    }
    res.json({ ok: true, transfer });
  });

  app.post('/api/demo/workspace/student-transfers/:transferId/reject', (req: Request, res: Response) => {
    const state = getOrCreateDemoSession(req, res);
    if (state.activeProfile !== 'school_admin') {
      res.status(403).json({ error: 'Somente o Perfil Escola pode recusar solicitações de inclusão.' });
      return;
    }
    const transfer = state.transfers.find((t) => t.id === req.params.transferId && t.direction === 'recebida');
    if (!transfer) {
      res.status(404).json({ error: 'Solicitação de inclusão não encontrada.' });
      return;
    }
    if (transfer.status !== 'pendente') {
      res.status(409).json({ error: `Esta solicitação já foi finalizada (${transfer.status}).` });
      return;
    }
    transfer.status = 'recusada';
    transfer.reviewedByName = 'Coord.ª Helena Martins (Escola)';
    transfer.reviewNote = String(req.body?.reviewNote || '').trim().slice(0, 800);
    transfer.reviewedAt = new Date().toISOString();
    res.json({ ok: true, transfer });
  });

  app.post('/api/demo/workspace/student-transfers/:transferId/cancel', (req: Request, res: Response) => {
    const state = getOrCreateDemoSession(req, res);
    if (state.activeProfile !== 'school_admin') {
      res.status(403).json({ error: 'Somente o Perfil Escola pode cancelar repasses.' });
      return;
    }
    const transfer = state.transfers.find((t) => t.id === req.params.transferId && t.direction === 'enviada');
    if (!transfer) {
      res.status(404).json({ error: 'Transferência enviada não encontrada.' });
      return;
    }
    if (transfer.status !== 'pendente') {
      res.status(409).json({ error: 'Somente transferências pendentes podem ser canceladas.' });
      return;
    }
    transfer.status = 'cancelada';
    transfer.reviewedByName = 'Coord.ª Helena Martins (Escola)';
    transfer.reviewedAt = new Date().toISOString();
    res.json({ ok: true, transfer });
  });

  app.post('/api/demo/activities/generate', async (req: Request, res: Response) => {
    try {
      const state = getOrCreateDemoSession(req, res);
      const b = req.body || {};
      const visible = getVisibleDemoStudents(state);
      const student = visible.find((s) => s.id === b.studentId) || visible[0];
      if (!student) {
        res.status(403).json({ error: 'Sem estudante vinculado ou acesso encerrado nesta sessão.' });
        return;
      }
      const activeUser = getActiveDemoUser(state).user;
      const inferredLiteracy: 'alfabetizado' | 'alfabetizacao_inicial' =
        b.literacyStage === 'alfabetizacao_inicial' || b.literacyStage === 'alfabetizado'
          ? b.literacyStage
          : /inicial|não alfabetiz|nao alfabetiz/i.test(student.learningLevel)
          ? 'alfabetizacao_inicial'
          : 'alfabetizado';
      const useAi = Boolean(b.useAi === true && state.aiExternalEnabled);
      const result = await generateAdaptedActivityOrPlan({
        kind: b.kind === 'plano_de_aula' ? 'plano_de_aula' : 'atividade',
        student,
        teacherName: activeUser.name,
        subject: String(b.subject || 'Matemática'),
        theme: String(b.theme || 'Situações-problema em etapas curtas'),
        bimester: String(b.bimester || '1º Bimestre'),
        schoolYear: '2026',
        durationMinutes: Number(b.durationMinutes || 40),
        literacyStage: inferredLiteracy,
        accessibilityMode: b.accessibilityMode || 'padrao',
        includeAnswerKey: Boolean(b.includeAnswerKey),
        classMaterialText: String(b.classMaterialText || ''),
        peiObjectiveText: String(b.peiObjectiveText || ''),
        paeeSupportUsed: String(b.paeeSupportUsed || 'Roteiro visual em etapas curtas'),
        useAi,
        generateImages: b.generateImages !== false,
        isDemo: true,
      });

      if (result.scopeRedirect) {
        res.status(422).json({ scopeRedirect: result.scopeRedirect });
        return;
      }

      const now = new Date().toISOString();
      const newAct: PedagogicalActivity = {
        id: newId('demo_act'),
        studentId: student.id,
        workspaceId: student.workspaceId,
        kind: b.kind === 'plano_de_aula' ? 'plano_de_aula' : 'atividade',
        title: result.aiUsed
          ? result.title
          : inferredLiteracy === 'alfabetizacao_inicial'
          ? `${result.title} (EXEMPLO)`.toUpperCase()
          : `${result.title} (Exemplo Sessão)`,
        subject: String(b.subject || 'Matemática'),
        theme: String(b.theme || 'Situações-problema em etapas curtas'),
        bimester: String(b.bimester || '1º Bimestre'),
        schoolYear: '2026',
        durationMinutes: Math.min(Number(b.durationMinutes || 40), 50),
        literacyStage: inferredLiteracy,
        accessibilityMode: b.accessibilityMode || 'padrao',
        peiDocumentId: b.peiDocumentId || null,
        peiObjectiveId: b.peiObjectiveId || null,
        peiObjectiveText: String(b.peiObjectiveText || ''),
        paeeDocumentId: null,
        paeeSupportUsed: String(b.paeeSupportUsed || ''),
        versionNumber: 1,
        content: result.content,
        createdByUserId: activeUser.id,
        createdAt: now,
        updatedAt: now,
      };
      state.activities.unshift(newAct);
      res.status(201).json({ activity: newAct, aiUsed: result.aiUsed, imagesGenerated: result.imagesGenerated });
    } catch (err: any) {
      const status = Number(err?.statusCode || 500);
      res.status(status >= 400 && status < 600 ? status : 500).json({ error: err?.message || 'Erro na atividade de demonstração.' });
    }
  });

  app.post('/api/demo/activities/:activityId/applications', (req: Request, res: Response) => {
    const state = getOrCreateDemoSession(req, res);
    const act = state.activities.find((a) => a.id === req.params.activityId);
    if (!act || !canDemoAccessStudent(state, act.studentId)) {
      res.status(404).json({ error: 'Atividade de demonstração não encontrada ou sem vínculo ativo.' });
      return;
    }
    const activeUser = getActiveDemoUser(state).user;
    const b = req.body || {};
    const status = b.status === 'nao_aplicada' ? 'nao_aplicada' : 'aplicada';
    const now = new Date().toISOString();
    const newApp: ApplicationFeedback = {
      id: newId('demo_app'),
      activityId: act.id,
      studentId: act.studentId,
      workspaceId: act.workspaceId,
      activityVersion: act.versionNumber,
      activityTitle: act.title,
      subject: act.subject,
      bimester: act.bimester,
      schoolYear: act.schoolYear,
      teacherId: activeUser.id,
      teacherName: activeUser.name,
      objectiveText: String(b.objectiveText || act.peiObjectiveText || act.title),
      appliedDate: String(b.appliedDate || now.slice(0, 10)),
      status,
      participation: status === 'nao_aplicada' ? '' : String(b.participation || 'participou') as any,
      objectiveStatus: status === 'nao_aplicada' ? '' : String(b.objectiveStatus || 'alcancado') as any,
      supportLevel: status === 'nao_aplicada' ? '' : String(b.supportLevel || 'apoio_pontual') as any,
      helpfulResource: status === 'nao_aplicada' ? '' : String(b.helpfulResource || ''),
      briefObservation: String(b.briefObservation || ''),
      nextStep: String(b.nextStep || ''),
      createdAt: now,
    };
    state.applications.unshift(newApp);
    res.status(201).json({ application: newApp });
  });

  app.get('/api/demo/activities/:activityId/docx', async (req: Request, res: Response) => {
    const state = getOrCreateDemoSession(req, res);
    const act = state.activities.find((a) => a.id === req.params.activityId);
    if (!act || !canDemoAccessStudent(state, act.studentId)) {
      res.status(404).json({ error: 'Atividade não encontrada.' });
      return;
    }
    const buf = await buildActivityDocx(act, req.query.gabarito === '1');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="ApoIA.Edu_Demo_${act.id}.docx"`);
    res.send(buf);
  });

  app.post('/api/demo/documents/existing', upload.single('file'), async (req: Request, res: Response) => {
    try {
      const state = getOrCreateDemoSession(req, res);
      const b = req.body || {};
      const visible = getVisibleDemoStudents(state);
      const student = visible.find((s) => s.id === b.studentId) || visible[0];
      if (!student) {
        res.status(403).json({ error: 'Sem estudante vinculado ou acesso encerrado nesta sessão.' });
        return;
      }
      const activeUser = getActiveDemoUser(state).user;
      const docType = String(b.docType || 'paee') as DocType;
      const title = String(b.title || `${docType.toUpperCase()} existente (Exemplo)`).trim();
      const summaryText = String(b.summaryText || '');
      const supportsRaw = String(b.supportsText || '');
      const authorName = String(b.authorName || activeUser.name);
      const now = new Date().toISOString();

      let extractedText = summaryText;
      let originalFilename = '';
      let fileExt = 'txt';
      let createdSourceId: string | null = null;

      if (req.file) {
        originalFilename = req.file.originalname;
        fileExt = path.extname(originalFilename).replace(/^\./, '').toLowerCase() || 'bin';
        const extracted = await extractSourceContent(req.file.buffer, fileExt, req.file.mimetype);
        extractedText = [summaryText, extracted.extractedText].filter(Boolean).join('\n\n');
        createdSourceId = newId('demo_src');
        state.sources.unshift({
          id: createdSourceId,
          studentId: student.id,
          workspaceId: student.workspaceId,
          uploadedByUserId: 'demo_user',
          sourceKind: 'documento_preenchido',
          docCategory: docType,
          title,
          subject: String(b.subject || ''),
          schoolYear: String(b.schoolYear || '2026'),
          bimester: String(b.bimester || ''),
          authorName,
          informedDate: String(b.informedDate || ''),
          versionNumber: 1,
          status: 'ativo',
          supersedesSourceId: null,
          originalFilename,
          mimeType: req.file.mimetype,
          fileExt,
          extractedText,
          parsedStructure: extracted.parsedStructure,
          isEditableTemplate: extracted.isEditableTemplate,
          createdAt: now,
        });
      }

      const supportsLines = supportsRaw.split(/\n|;/).map((s) => s.trim()).filter(Boolean);
      const newDoc: PedagogicalDocument = {
        id: newId('demo_doc'),
        studentId: student.id,
        workspaceId: student.workspaceId,
        docType,
        title,
        subject: String(b.subject || ''),
        gradeLevel: student.gradeLevel,
        schoolYear: String(b.schoolYear || '2026'),
        bimester: String(b.bimester || ''),
        authorName,
        informedDate: String(b.informedDate || ''),
        versionNumber: 1,
        status: 'existente',
        sourceIds: createdSourceId ? [createdSourceId] : [],
        templateSourceId: createdSourceId,
        content: {
          generationMode: 'cadastro_manual',
          templateFormatNote: originalFilename
            ? `Documento anexado na sessão de demonstração a partir de "${originalFilename}".`
            : 'Documento existente cadastrado na sessão de demonstração.',
          templateEditableUsed: false,
          fields: [
            {
              fieldKey: 'doc_existente_resumo',
              label: 'Síntese / Conteúdo anexado',
              location: 'Sessão de demonstração',
              value: extractedText || 'Documento anexado ao prontuário de demonstração.',
              originKind: 'informacao_documentada',
              originReference: originalFilename || title,
              status: 'preservado',
              statusReason: 'Documento existente preservado na sessão de demonstração.',
            },
          ],
          paeeSupports:
            docType === 'paee'
              ? (supportsLines.length > 0 ? supportsLines : [extractedText || 'Apoio do PAEE anexado']).map((sup, i) => ({
                  id: `demo_paee_sup_${i + 1}`,
                  barrierOrNeed: 'Necessidade registrada no PAEE anexado',
                  supportType: sup,
                  availabilityStatus: 'disponivel',
                  responsibilityStatus: 'confirmada',
                  responsibleRole: authorName,
                  outcomeStatus: 'esperado',
                  outcomeDescription: 'Conforme documento anexado na demonstração.',
                  originReference: `${title} (sessão demo)`,
                }))
              : undefined,
          conflicts: [],
          narrativeGaps: [],
          pendingItems: [],
          missingRequestedFiles: [],
          consultedSources: createdSourceId
            ? [{ sourceId: createdSourceId, title, kind: 'documento_preenchido', versionNumber: 1, originNote: originalFilename }]
            : [],
        },
        hasOutputFile: false,
        outputFileExt: fileExt,
        previousVersionId: null,
        reviewedByName: '',
        reviewedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      state.documents.unshift(newDoc);
      res.status(201).json({ document: newDoc });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erro ao anexar documento na demonstração.' });
    }
  });

  app.post('/api/demo/sources', upload.single('file'), async (req: Request, res: Response) => {
    try {
      const state = getOrCreateDemoSession(req, res);
      const b = req.body || {};
      const visible = getVisibleDemoStudents(state);
      const student = visible.find((s) => s.id === b.studentId) || visible[0];
      if (!student) {
        res.status(403).json({ error: 'Sem estudante vinculado ou acesso encerrado nesta sessão.' });
        return;
      }
      const activeUser = getActiveDemoUser(state).user;
      const manualText = String(b.manualText || '');
      let extractedText = manualText;
      let originalFilename = '';
      let mimeType = '';
      let fileExt = 'txt';
      let parsedStructure: any = null;
      let isEditableTemplate = false;

      if (req.file) {
        originalFilename = req.file.originalname;
        mimeType = req.file.mimetype;
        fileExt = path.extname(originalFilename).replace(/^\./, '').toLowerCase() || 'bin';
        const extracted = await extractSourceContent(req.file.buffer, fileExt, mimeType);
        extractedText = manualText ? `${manualText}\n\n${extracted.extractedText}` : extracted.extractedText;
        parsedStructure = extracted.parsedStructure;
        isEditableTemplate = extracted.isEditableTemplate;
      }

      const newSrc: SourceRecord = {
        id: newId('demo_src'),
        studentId: student.id,
        workspaceId: student.workspaceId,
        uploadedByUserId: activeUser.id,
        sourceKind: (b.sourceKind || 'relatorio') as any,
        docCategory: (b.docCategory || 'geral') as any,
        title: String(b.title || originalFilename || 'Fonte de demonstração'),
        subject: String(b.subject || ''),
        schoolYear: String(b.schoolYear || '2026'),
        bimester: String(b.bimester || ''),
        authorName: String(b.authorName || activeUser.name),
        informedDate: String(b.informedDate || ''),
        versionNumber: 1,
        status: 'ativo',
        supersedesSourceId: null,
        originalFilename,
        mimeType,
        fileExt,
        extractedText,
        parsedStructure,
        isEditableTemplate,
        createdAt: new Date().toISOString(),
      };
      state.sources.unshift(newSrc);
      res.status(201).json({ source: newSrc, createdAlerts: [] });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erro ao adicionar fonte na demonstração.' });
    }
  });

  app.post('/api/demo/documents/generate', async (req: Request, res: Response) => {
    try {
      const state = getOrCreateDemoSession(req, res);
      const b = req.body || {};
      const visible = getVisibleDemoStudents(state);
      const student = visible.find((s) => s.id === b.studentId) || visible[0];
      if (!student) {
        res.status(403).json({ error: 'Sem estudante vinculado ou acesso encerrado nesta sessão.' });
        return;
      }
      const activeUser = getActiveDemoUser(state).user;
      const docType = String(b.docType || 'estudo_de_caso') as DocType;
      const selectedSourceIds: string[] = Array.isArray(b.sourceIds) ? b.sourceIds : [];
      const sources =
        selectedSourceIds.length > 0
          ? state.sources.filter((s) => s.studentId === student.id && selectedSourceIds.includes(s.id))
          : state.sources.filter((s) => s.studentId === student.id);
      const templateSource = b.templateSourceId
        ? state.sources.find((s) => s.id === b.templateSourceId) || null
        : null;

      const payload = await generateDocumentDraft({
        docType,
        student,
        sources,
        templateSource,
        subject: String(b.subject || ''),
        bimester: String(b.bimester || ''),
        schoolYear: String(b.schoolYear || '2026'),
        revisionInstruction: b.revisionInstruction ? String(b.revisionInstruction) : undefined,
        periodApplications: state.applications.filter((a) => a.studentId === student.id),
        useAi: false,
        isDemo: true,
        confirmedCurriculum: String(b.confirmedCurriculum || ''),
      });

      const now = new Date().toISOString();
      const newDoc: PedagogicalDocument = {
        id: newId('demo_doc'),
        studentId: student.id,
        workspaceId: student.workspaceId,
        docType,
        title: `${docType === 'estudo_de_caso' ? 'Estudo de Caso' : docType === 'paee' ? 'PAEE' : 'PEI'} (Minuta Exemplo)`,
        subject: String(b.subject || ''),
        gradeLevel: student.gradeLevel,
        schoolYear: String(b.schoolYear || '2026'),
        bimester: String(b.bimester || ''),
        authorName: activeUser.name,
        informedDate: '',
        versionNumber: state.documents.filter((d) => d.studentId === student.id && d.docType === docType).length + 1,
        status: 'minuta',
        sourceIds: sources.map((s) => s.id),
        templateSourceId: templateSource?.id || null,
        content: payload,
        hasOutputFile: false,
        outputFileExt: 'docx',
        previousVersionId: b.previousVersionId || null,
        reviewedByName: '',
        reviewedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      state.documents.unshift(newDoc);
      res.status(201).json({ document: newDoc, aiUsed: false, aiGateNotice: null });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erro ao gerar minuta na demonstração.' });
    }
  });

  app.post('/api/demo/end', (req: Request, res: Response) => {
    endDemoSession(req, res);
    res.json({ ok: true, message: 'Sessão de demonstração encerrada e alterações descartadas.' });
  });

  // ==================== SAMPLE INSTITUTIONAL TEMPLATES ====================
  app.get('/api/templates/sample/:name', async (req: Request, res: Response) => {
    try {
      const name = req.params.name;
      if (name === 'estudo_de_caso.docx') {
        const buf = await buildSampleEstudoDeCasoTemplateDocx();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename="ANEXO_II_ESTUDO_DE_CASO_MODELO.docx"');
        res.send(buf);
        return;
      }
      if (name === 'forms_exemplo.docx') {
        const buf = await buildSampleFormsResponseDocx();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename="Forms_Estudo_Caso_Exemplo.docx"');
        res.send(buf);
        return;
      }
      if (name === 'paee.docx') {
        const buf = await buildSamplePaeeTemplateDocx();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename="PAEE_Modelo_Institucional.docx"');
        res.send(buf);
        return;
      }
      if (name === 'pei.xlsx') {
        const buf = await buildSamplePeiTemplateXlsx();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="PEI_Planilha_Modelo.xlsx"');
        res.send(buf);
        return;
      }
      if (name === 'curriculo_paulista.docx') {
        const buf = await buildSampleCurriculumDocx();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename="Curriculo_Paulista_Matematica_4Ano_1Bim.docx"');
        res.send(buf);
        return;
      }
      res.status(404).json({ error: 'Modelo de exemplo não encontrado.' });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Erro ao gerar modelo de exemplo.' });
    }
  });
}
