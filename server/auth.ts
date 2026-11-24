import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { UserSummary, WorkspaceRole, WorkspaceSummary } from '../src/types.ts';
import { db, newId } from './db.ts';

export const SESSION_COOKIE_NAME = 'apoia_session';
const SESSION_TTL_DAYS = 14;

export function hashPassword(password: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash: derived, salt };
}

export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(storedHash, 'hex');
  if (derived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derived, storedBuf);
}

export function createSession(userId: string): { token: string; expiresAt: string } {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    `INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`
  ).run(token, userId, expiresAt, new Date().toISOString());
  return { token, expiresAt };
}

function isHttpsRequest(res: Response): boolean {
  const req = res.req;
  if (!req) return false;
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  return Boolean(req.secure || proto === 'https');
}

export function setSessionCookie(res: Response, token: string): void {
  const secure = isHttpsRequest(res);
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: secure ? 'none' : 'lax',
    secure,
    path: '/',
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response): void {
  const secure = isHttpsRequest(res);
  res.clearCookie(SESSION_COOKIE_NAME, {
    path: '/',
    sameSite: secure ? 'none' : 'lax',
    secure,
  });
}

export interface AuthedRequest extends Request {
  user?: UserSummary;
  sessionToken?: string;
}

export function isUserAccessActive(accessStatus?: string | null, contractEndDate?: string | null): boolean {
  if (accessStatus !== 'ativo' && accessStatus !== 'liberado') {
    return false;
  }
  if (contractEndDate && contractEndDate.trim()) {
    const today = new Date().toISOString().slice(0, 10);
    if (contractEndDate.trim() < today) {
      return false;
    }
  }
  return true;
}

export function recordAdminAudit(
  adminUserId: string,
  adminEmail: string,
  action: string,
  targetUserId = '',
  targetEmail = '',
  details = ''
): void {
  try {
    db.prepare(
      `INSERT INTO admin_audit_logs (
         id, admin_user_id, admin_email, action, target_user_id, target_email, details, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      newId('audit'),
      adminUserId,
      adminEmail,
      action,
      targetUserId,
      targetEmail,
      details,
      new Date().toISOString()
    );
  } catch (err) {
    console.error('Failed to record admin audit log:', err);
  }
}

export function loadOptionalUser(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (!token || typeof token !== 'string') {
    next();
    return;
  }
  const row = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.phone, u.organization, u.job_role, u.account_type, u.access_status,
              u.contract_start_date, u.contract_end_date, u.last_login_at, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`
    )
    .get(token) as
    | {
        id: string;
        name: string;
        email: string;
        phone: string;
        organization: string;
        job_role: string;
        account_type: 'teacher' | 'school_admin' | 'luminext_admin';
        access_status: 'ativo' | 'liberado' | 'pendente' | 'suspenso' | 'bloqueado';
        contract_start_date: string;
        contract_end_date: string;
        last_login_at: string | null;
        expires_at: string;
      }
    | undefined;

  if (!row) {
    next();
    return;
  }
  if (
    new Date(row.expires_at).getTime() < Date.now() ||
    !isUserAccessActive(row.access_status, row.contract_end_date)
  ) {
    db.prepare(`DELETE FROM sessions WHERE id = ?`).run(token);
    next();
    return;
  }
  req.user = {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    organization: row.organization,
    jobRole: row.job_role,
    accountType: row.account_type,
    accessStatus: row.access_status,
    contractStartDate: row.contract_start_date || '',
    contractEndDate: row.contract_end_date || '',
    lastLoginAt: row.last_login_at || null,
  };
  req.sessionToken = token;
  next();
}

export function requireUser(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.user || !isUserAccessActive(req.user.accessStatus, req.user.contractEndDate)) {
    res.status(401).json({ error: 'Sessão não autenticada, expirada ou acesso bloqueado pela LumiNext Tech.' });
    return;
  }
  next();
}

export function requireLuminextAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Autenticação administrativa necessária para acessar o painel da LumiNext Tech.',
    });
    return;
  }
  if (
    req.user.accountType !== 'luminext_admin' ||
    !isUserAccessActive(req.user.accessStatus, req.user.contractEndDate)
  ) {
    res.status(403).json({
      error: 'Acesso negado: esta área é exclusiva para contas administradoras ativas da LumiNext Tech.',
    });
    return;
  }
  next();
}

export function getUserWorkspaces(userId: string): WorkspaceSummary[] {
  const rows = db
    .prepare(
      `SELECT w.id, w.type, w.name, w.city, w.state, w.owner_user_id, w.ai_external_enabled, wm.role
       FROM workspace_members wm
       JOIN workspaces w ON w.id = wm.workspace_id
       WHERE wm.user_id = ? AND wm.status = 'active'
       ORDER BY w.type DESC, w.created_at ASC`
    )
    .all(userId) as {
    id: string;
    type: 'individual' | 'school';
    name: string;
    city: string;
    state: string;
    owner_user_id: string;
    ai_external_enabled: number;
    role: WorkspaceRole;
  }[];

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    name: r.name,
    city: r.city,
    state: r.state,
    role: r.role,
    aiExternalEnabled: r.ai_external_enabled === 1,
    ownerUserId: r.owner_user_id,
  }));
}

export function getWorkspaceMembership(
  workspaceId: string,
  userId: string
): { workspaceType: 'individual' | 'school'; role: WorkspaceRole; ownerUserId: string; aiExternalEnabled: boolean } | null {
  const row = db
    .prepare(
      `SELECT w.type, w.owner_user_id, w.ai_external_enabled, wm.role
       FROM workspace_members wm
       JOIN workspaces w ON w.id = wm.workspace_id
       WHERE wm.workspace_id = ? AND wm.user_id = ? AND wm.status = 'active'`
    )
    .get(workspaceId, userId) as
    | { type: 'individual' | 'school'; owner_user_id: string; ai_external_enabled: number; role: WorkspaceRole }
    | undefined;

  if (!row) return null;
  if (row.type === 'individual' && row.owner_user_id !== userId) {
    return null;
  }
  return {
    workspaceType: row.type,
    role: row.role,
    ownerUserId: row.owner_user_id,
    aiExternalEnabled: row.ai_external_enabled === 1,
  };
}

export function checkStudentPermission(
  studentId: string,
  userId: string
): {
  allowed: boolean;
  reason?: string;
  student?: Record<string, any>;
  membership?: { workspaceType: 'individual' | 'school'; role: WorkspaceRole; ownerUserId: string; aiExternalEnabled: boolean };
} {
  const student = db.prepare(`SELECT * FROM students WHERE id = ?`).get(studentId) as Record<string, any> | undefined;
  if (!student) {
    return { allowed: false, reason: 'Estudante não encontrado.' };
  }

  const membership = getWorkspaceMembership(student.workspace_id, userId);
  if (!membership) {
    return { allowed: false, reason: 'Sem vínculo ativo com este espaço institucional ou individual.' };
  }

  if (membership.workspaceType === 'individual') {
    if (membership.ownerUserId !== userId) {
      return { allowed: false, reason: 'Área individual privada pertence a outro docente.' };
    }
    return { allowed: true, student, membership };
  }

  // Espaço escolar: admin autorizado acessa todos os estudantes da sua escola;
  // professor acessa somente estudantes aos quais possui vínculo ativo explícito.
  if (membership.role === 'admin') {
    return { allowed: true, student, membership };
  }

  const link = db
    .prepare(
      `SELECT id FROM student_teachers
       WHERE student_id = ? AND workspace_id = ? AND user_id = ? AND status = 'active'`
    )
    .get(studentId, student.workspace_id, userId) as { id: string } | undefined;

  if (!link) {
    return {
      allowed: false,
      reason: 'Acesso negado: você não possui vínculo ativo com este estudante nesta escola.',
    };
  }

  return { allowed: true, student, membership };
}

export function createIndividualWorkspaceForUser(userId: string, userName: string): string {
  const wsId = newId('ws');
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO workspaces (id, type, name, city, state, owner_user_id, ai_external_enabled, created_at)
     VALUES (?, 'individual', ?, '', '', ?, 0, ?)`
  ).run(wsId, `Espaço Individual · ${userName}`, userId, now);

  db.prepare(
    `INSERT INTO workspace_members (id, workspace_id, user_id, role, status, invited_by, created_at)
     VALUES (?, ?, ?, 'admin', 'active', ?, ?)`
  ).run(newId('wm'), wsId, userId, userId, now);

  return wsId;
}

export function createSchoolWorkspaceForUser(
  userId: string,
  schoolName: string,
  city = '',
  state = ''
): string {
  const wsId = newId('ws');
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO workspaces (id, type, name, city, state, owner_user_id, ai_external_enabled, created_at)
     VALUES (?, 'school', ?, ?, ?, ?, 0, ?)`
  ).run(wsId, schoolName.trim(), city.trim(), state.trim(), userId, now);

  db.prepare(
    `INSERT INTO workspace_members (id, workspace_id, user_id, role, status, invited_by, created_at)
     VALUES (?, ?, ?, 'admin', 'active', ?, ?)`
  ).run(newId('wm'), wsId, userId, userId, now);

  return wsId;
}
