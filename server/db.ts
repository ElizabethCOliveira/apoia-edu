import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const STORAGE_ROOT = path.resolve(process.env.STORAGE_ROOT || (process.env.VERCEL ? '/tmp/apoia-demo' : 'storage'));
export const UPLOADS_DIR = path.join(STORAGE_ROOT, 'uploads');
export const GENERATED_DIR = path.join(STORAGE_ROOT, 'generated');
export const DB_PATH = path.join(STORAGE_ROOT, 'apoia.db');

fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(GENERATED_DIR, { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  organization TEXT NOT NULL DEFAULT '',
  job_role TEXT NOT NULL DEFAULT '',
  account_type TEXT NOT NULL DEFAULT 'teacher',
  access_status TEXT NOT NULL DEFAULT 'pendente',
  approved_by TEXT NOT NULL DEFAULT '',
  approved_at TEXT,
  notes TEXT NOT NULL DEFAULT '',
  contract_start_date TEXT NOT NULL DEFAULT '',
  contract_end_date TEXT NOT NULL DEFAULT '',
  last_login_at TEXT,
  updated_at TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_user_id TEXT NOT NULL DEFAULT '',
  target_email TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS luminext_pre_authorizations (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  organization TEXT NOT NULL DEFAULT '',
  job_role TEXT NOT NULL DEFAULT '',
  account_type TEXT NOT NULL DEFAULT 'teacher',
  notes TEXT NOT NULL DEFAULT '',
  authorized_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('individual', 'school')),
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  owner_user_id TEXT NOT NULL,
  ai_external_enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS workspace_members (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher')),
  status TEXT NOT NULL CHECK (status IN ('active', 'revoked')),
  invited_by TEXT,
  created_at TEXT NOT NULL,
  revoked_at TEXT,
  UNIQUE(workspace_id, user_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workspace_invitations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher')),
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'revoked')),
  invited_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  code_or_initials TEXT NOT NULL DEFAULT '',
  school_name TEXT NOT NULL DEFAULT '',
  school_year TEXT NOT NULL DEFAULT '',
  grade_level TEXT NOT NULL DEFAULT '',
  classroom TEXT NOT NULL DEFAULT '',
  strengths TEXT NOT NULL DEFAULT '',
  interests TEXT NOT NULL DEFAULT '',
  learning_level TEXT NOT NULL DEFAULT '',
  communication_modes TEXT NOT NULL DEFAULT '',
  barriers TEXT NOT NULL DEFAULT '',
  working_strategies TEXT NOT NULL DEFAULT '',
  accessibility_resources TEXT NOT NULL DEFAULT '',
  latest_pedagogical_eval TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_teachers (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role_label TEXT NOT NULL DEFAULT 'Professor(a)',
  status TEXT NOT NULL CHECK (status IN ('active', 'revoked')),
  created_at TEXT NOT NULL,
  revoked_at TEXT,
  UNIQUE(student_id, user_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  uploaded_by_user_id TEXT NOT NULL,
  source_kind TEXT NOT NULL,
  doc_category TEXT NOT NULL,
  title TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  school_year TEXT NOT NULL DEFAULT '',
  bimester TEXT NOT NULL DEFAULT '',
  author_name TEXT NOT NULL DEFAULT '',
  informed_date TEXT NOT NULL DEFAULT '',
  version_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'ativo',
  supersedes_source_id TEXT,
  file_path TEXT NOT NULL DEFAULT '',
  original_filename TEXT NOT NULL DEFAULT '',
  mime_type TEXT NOT NULL DEFAULT '',
  file_ext TEXT NOT NULL DEFAULT '',
  extracted_text TEXT NOT NULL DEFAULT '',
  parsed_structure_json TEXT NOT NULL DEFAULT 'null',
  is_editable_template INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('estudo_de_caso', 'paee', 'pei')),
  title TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  grade_level TEXT NOT NULL DEFAULT '',
  school_year TEXT NOT NULL DEFAULT '',
  bimester TEXT NOT NULL DEFAULT '',
  author_name TEXT NOT NULL DEFAULT '',
  informed_date TEXT NOT NULL DEFAULT '',
  version_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL CHECK (status IN ('existente', 'minuta', 'revisada_pela_equipe')),
  source_ids_json TEXT NOT NULL DEFAULT '[]',
  template_source_id TEXT,
  content_json TEXT NOT NULL DEFAULT '{}',
  output_file_path TEXT NOT NULL DEFAULT '',
  output_file_ext TEXT NOT NULL DEFAULT '',
  previous_version_id TEXT,
  created_by_user_id TEXT NOT NULL,
  reviewed_by_name TEXT NOT NULL DEFAULT '',
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('atividade', 'plano_de_aula')),
  title TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  theme TEXT NOT NULL DEFAULT '',
  bimester TEXT NOT NULL DEFAULT '',
  school_year TEXT NOT NULL DEFAULT '',
  duration_minutes INTEGER NOT NULL DEFAULT 50,
  literacy_stage TEXT NOT NULL DEFAULT 'alfabetizado',
  accessibility_mode TEXT NOT NULL DEFAULT 'padrao',
  pei_document_id TEXT,
  pei_objective_id TEXT,
  pei_objective_text TEXT NOT NULL DEFAULT '',
  paee_document_id TEXT,
  paee_support_used TEXT NOT NULL DEFAULT '',
  version_number INTEGER NOT NULL DEFAULT 1,
  content_json TEXT NOT NULL DEFAULT '{}',
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  activity_version INTEGER NOT NULL DEFAULT 1,
  teacher_id TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  objective_text TEXT NOT NULL DEFAULT '',
  applied_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('aplicada', 'nao_aplicada')),
  participation TEXT NOT NULL DEFAULT '',
  objective_status TEXT NOT NULL DEFAULT '',
  support_level TEXT NOT NULL DEFAULT '',
  helpful_resource TEXT NOT NULL DEFAULT '',
  brief_observation TEXT NOT NULL DEFAULT '',
  next_step TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS update_alerts (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  proposed_diff_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL CHECK (status IN ('pendente', 'aceito', 'descartado')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_transfers (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  student_display_name TEXT NOT NULL,
  student_grade_level TEXT NOT NULL DEFAULT '',
  student_classroom TEXT NOT NULL DEFAULT '',
  from_workspace_id TEXT NOT NULL,
  from_school_name TEXT NOT NULL,
  target_workspace_id TEXT,
  target_school_name TEXT NOT NULL,
  target_school_email TEXT NOT NULL,
  transfer_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pendente', 'aprovada', 'recusada', 'cancelada')),
  transfer_note TEXT NOT NULL DEFAULT '',
  initiated_by_user_id TEXT NOT NULL,
  initiated_by_name TEXT NOT NULL,
  reviewed_by_user_id TEXT,
  reviewed_by_name TEXT NOT NULL DEFAULT '',
  review_note TEXT NOT NULL DEFAULT '',
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (from_workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);
`);

// Safe migrations for existing SQLite databases created before LumiNext user governance columns
const existingUserCols = new Set(
  (db.prepare(`PRAGMA table_info(users)`).all() as { name: string }[]).map((c) => c.name)
);
const userMigrations: [string, string][] = [
  ['phone', `ALTER TABLE users ADD COLUMN phone TEXT NOT NULL DEFAULT ''`],
  ['organization', `ALTER TABLE users ADD COLUMN organization TEXT NOT NULL DEFAULT ''`],
  ['job_role', `ALTER TABLE users ADD COLUMN job_role TEXT NOT NULL DEFAULT ''`],
  ['account_type', `ALTER TABLE users ADD COLUMN account_type TEXT NOT NULL DEFAULT 'teacher'`],
  ['access_status', `ALTER TABLE users ADD COLUMN access_status TEXT NOT NULL DEFAULT 'liberado'`],
  ['approved_by', `ALTER TABLE users ADD COLUMN approved_by TEXT NOT NULL DEFAULT ''`],
  ['approved_at', `ALTER TABLE users ADD COLUMN approved_at TEXT`],
  ['notes', `ALTER TABLE users ADD COLUMN notes TEXT NOT NULL DEFAULT ''`],
  ['contract_start_date', `ALTER TABLE users ADD COLUMN contract_start_date TEXT NOT NULL DEFAULT ''`],
  ['contract_end_date', `ALTER TABLE users ADD COLUMN contract_end_date TEXT NOT NULL DEFAULT ''`],
  ['last_login_at', `ALTER TABLE users ADD COLUMN last_login_at TEXT`],
  ['updated_at', `ALTER TABLE users ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''`],
];
for (const [col, sql] of userMigrations) {
  if (!existingUserCols.has(col)) {
    db.exec(sql);
  }
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

export function safeResolveStoragePath(baseDir: string, relativeOrFile: string): string {
  const cleaned = path.basename(relativeOrFile);
  const full = path.resolve(baseDir, cleaned);
  if (!full.startsWith(path.resolve(baseDir) + path.sep) && full !== path.resolve(baseDir)) {
    throw new Error('Acesso de caminho de arquivo inválido');
  }
  return full;
}
