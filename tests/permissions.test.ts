import { beforeAll, describe, expect, it } from 'vitest';
import { checkStudentPermission, createIndividualWorkspaceForUser, getWorkspaceMembership } from '../server/auth.ts';
import { db } from '../server/db.ts';

// Cenário fictício: uma escola com coordenação (admin), duas professoras e dois estudantes.
const now = new Date().toISOString();

function addUser(id: string, name: string) {
  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, salt, access_status, created_at)
     VALUES (?, ?, ?, 'x', 'x', 'ativo', ?)`
  ).run(id, name, `${id}@exemplo.test`, now);
}

function addMember(wsId: string, userId: string, role: 'admin' | 'teacher', status: 'active' | 'revoked' = 'active') {
  db.prepare(
    `INSERT INTO workspace_members (id, workspace_id, user_id, role, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(`wm_${wsId}_${userId}`, wsId, userId, role, status, now);
}

function addStudent(id: string, wsId: string) {
  db.prepare(
    `INSERT INTO students (id, workspace_id, created_by_user_id, display_name, created_at, updated_at)
     VALUES (?, ?, 'coord', ?, ?, ?)`
  ).run(id, wsId, id.toUpperCase(), now, now);
}

function linkTeacher(studentId: string, wsId: string, userId: string, status: 'active' | 'revoked' = 'active') {
  db.prepare(
    `INSERT INTO student_teachers (id, student_id, workspace_id, user_id, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(`st_${studentId}_${userId}`, studentId, wsId, userId, status, now);
}

beforeAll(() => {
  for (const [id, name] of [
    ['coord', 'Coordenação'],
    ['prof_ana', 'Prof.ª Ana'],
    ['prof_bia', 'Prof.ª Bia'],
    ['prof_ex', 'Prof.ª Ex-vínculo'],
    ['prof_ext', 'Prof.ª de outra escola'],
  ]) addUser(id, name);

  db.prepare(
    `INSERT INTO workspaces (id, type, name, owner_user_id, created_at) VALUES ('escola', 'school', 'Escola Teste', 'coord', ?)`
  ).run(now);
  addMember('escola', 'coord', 'admin');
  addMember('escola', 'prof_ana', 'teacher');
  addMember('escola', 'prof_bia', 'teacher');
  addMember('escola', 'prof_ex', 'teacher', 'revoked');

  addStudent('est_1', 'escola');
  addStudent('est_2', 'escola');
  linkTeacher('est_1', 'escola', 'prof_ana');
  linkTeacher('est_2', 'escola', 'prof_bia', 'revoked');
  linkTeacher('est_1', 'escola', 'prof_ex');
});

describe('acesso de professores aos estudantes de uma escola', () => {
  it('professora com vínculo ativo acessa o estudante', () => {
    expect(checkStudentPermission('est_1', 'prof_ana').allowed).toBe(true);
  });

  it('professora da mesma escola sem vínculo com o estudante é bloqueada', () => {
    const r = checkStudentPermission('est_1', 'prof_bia');
    expect(r.allowed).toBe(false);
    expect(r.student).toBeUndefined();
  });

  it('vínculo revogado com o estudante bloqueia o acesso', () => {
    expect(checkStudentPermission('est_2', 'prof_bia').allowed).toBe(false);
  });

  it('professora desligada da escola perde o acesso mesmo com vínculo antigo', () => {
    expect(checkStudentPermission('est_1', 'prof_ex').allowed).toBe(false);
  });

  it('pessoa de fora da escola nunca acessa', () => {
    expect(checkStudentPermission('est_1', 'prof_ext').allowed).toBe(false);
  });

  it('coordenação (admin) acessa todos os estudantes da escola', () => {
    expect(checkStudentPermission('est_1', 'coord').allowed).toBe(true);
    expect(checkStudentPermission('est_2', 'coord').allowed).toBe(true);
  });

  it('estudante inexistente retorna negado, sem erro', () => {
    expect(checkStudentPermission('nao_existe', 'coord')).toMatchObject({ allowed: false });
  });
});

describe('área individual da professora', () => {
  it('só a dona da área individual acessa os estudantes dela', () => {
    const wsId = createIndividualWorkspaceForUser('prof_ana', 'Prof.ª Ana');
    addStudent('est_privado', wsId);
    expect(checkStudentPermission('est_privado', 'prof_ana').allowed).toBe(true);
    expect(checkStudentPermission('est_privado', 'coord').allowed).toBe(false);
    expect(checkStudentPermission('est_privado', 'prof_bia').allowed).toBe(false);
  });
});

describe('IA externa com dados reais', () => {
  it('vem desligada por padrão em toda escola nova', () => {
    expect(getWorkspaceMembership('escola', 'coord')?.aiExternalEnabled).toBe(false);
    expect(checkStudentPermission('est_1', 'prof_ana').membership?.aiExternalEnabled).toBe(false);
  });

  it('só fica ligada depois que a escola autoriza', () => {
    db.prepare(`UPDATE workspaces SET ai_external_enabled = 1 WHERE id = 'escola'`).run();
    expect(getWorkspaceMembership('escola', 'coord')?.aiExternalEnabled).toBe(true);
    db.prepare(`UPDATE workspaces SET ai_external_enabled = 0 WHERE id = 'escola'`).run();
  });
});
