import 'dotenv/config';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { pathToFileURL } from 'node:url';
import { createIndividualWorkspaceForUser, hashPassword, recordAdminAudit } from './auth.ts';
import { db, newId } from './db.ts';

interface EnsureAdminOptions {
  email: string;
  password: string;
  name?: string;
  source?: string;
}

export function ensureFirstLuminextAdmin(opts: EnsureAdminOptions): {
  created: boolean;
  promoted: boolean;
  email: string;
} {
  const normEmail = opts.email.trim().toLowerCase();
  if (!normEmail || !normEmail.includes('@')) {
    throw new Error('E-mail inválido para conta administradora LumiNext.');
  }
  if (!opts.password || opts.password.length < 8) {
    throw new Error('A senha da conta administradora LumiNext deve ter ao menos 8 caracteres.');
  }

  const existingAdminCount = db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM users WHERE account_type = 'luminext_admin' AND access_status IN ('ativo', 'liberado')`
    )
    .get() as { cnt: number };

  if (existingAdminCount.cnt > 0) {
    return { created: false, promoted: false, email: normEmail };
  }

  const now = new Date().toISOString();
  const displayName = (opts.name || 'Administrador(a) LumiNext Tech').trim();
  const { hash, salt } = hashPassword(opts.password);
  const existingUser = db.prepare(`SELECT id FROM users WHERE LOWER(email) = ?`).get(normEmail) as
    | { id: string }
    | undefined;

  if (existingUser) {
    db.prepare(
      `UPDATE users
       SET name = ?, password_hash = ?, salt = ?, organization = 'LumiNext Tech',
           job_role = 'Administrador(a) LumiNext Tech', account_type = 'luminext_admin',
           access_status = 'ativo', approved_by = ?, approved_at = ?, updated_at = ?
       WHERE id = ?`
    ).run(displayName, hash, salt, opts.source || 'Bootstrap Servidor', now, now, existingUser.id);

    recordAdminAudit(
      existingUser.id,
      normEmail,
      'ADMIN_BOOTSTRAP',
      existingUser.id,
      normEmail,
      `Conta promovida a administradora LumiNext via ${opts.source || 'servidor'}.`
    );
    return { created: false, promoted: true, email: normEmail };
  }

  const userId = newId('usr');
  db.prepare(
    `INSERT INTO users (
       id, name, email, password_hash, salt, phone, organization, job_role,
       account_type, access_status, approved_by, approved_at, notes,
       contract_start_date, contract_end_date, updated_at, created_at
     ) VALUES (?, ?, ?, ?, ?, '', 'LumiNext Tech', 'Administrador(a) LumiNext Tech',
       'luminext_admin', 'ativo', ?, ?, 'Administrador inicial configurado no servidor.', '', '', ?, ?)`
  ).run(userId, displayName, normEmail, hash, salt, opts.source || 'Bootstrap Servidor', now, now, now);

  createIndividualWorkspaceForUser(userId, displayName);
  recordAdminAudit(
    userId,
    normEmail,
    'ADMIN_BOOTSTRAP',
    userId,
    normEmail,
    `Primeira conta administradora LumiNext configurada via ${opts.source || 'servidor'}.`
  );

  return { created: true, promoted: false, email: normEmail };
}

export function bootstrapFirstLuminextAdminFromEnv(): void {
  const email = (process.env.LUMINEXT_ADMIN_EMAIL || '').trim();
  const password = process.env.LUMINEXT_ADMIN_PASSWORD || '';
  const name = (process.env.LUMINEXT_ADMIN_NAME || '').trim();

  if (!email || !password) {
    return;
  }

  try {
    const result = ensureFirstLuminextAdmin({
      email,
      password,
      name: name || undefined,
      source: 'Variáveis de Ambiente do Servidor',
    });
    if (result.created || result.promoted) {
      console.log(`[LumiNext Admin] Primeira conta administradora configurada para ${result.email}.`);
    }
  } catch (err: any) {
    console.error(`[LumiNext Admin] Falha ao configurar administrador via ambiente: ${err?.message || err}`);
  }
}

async function runCli() {
  const existingAdminCount = db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM users WHERE account_type = 'luminext_admin' AND access_status IN ('ativo', 'liberado')`
    )
    .get() as { cnt: number };

  if (existingAdminCount.cnt > 0) {
    console.log('Já existe ao menos uma conta administradora LumiNext ativa no banco de dados.');
    process.exit(0);
  }

  let email = (process.env.LUMINEXT_ADMIN_EMAIL || '').trim();
  let password = process.env.LUMINEXT_ADMIN_PASSWORD || '';
  let name = (process.env.LUMINEXT_ADMIN_NAME || '').trim();

  if (!email || !password) {
    const rl = readline.createInterface({ input, output });
    try {
      if (!name) {
        name = (await rl.question('Nome completo do(a) administrador(a) LumiNext: ')).trim();
      }
      if (!email) {
        email = (await rl.question('E-mail corporativo LumiNext: ')).trim();
      }
      if (!password) {
        password = await rl.question('Senha administrativa (mínimo 8 caracteres): ');
      }
    } finally {
      rl.close();
    }
  }

  const res = ensureFirstLuminextAdmin({
    email,
    password,
    name: name || undefined,
    source: 'CLI Servidor (npm run admin:init)',
  });
  console.log(
    res.created
      ? `Administrador(a) LumiNext criado(a) com sucesso: ${res.email}`
      : `Usuário ${res.email} configurado como Administrador(a) LumiNext.`
  );
}

const isEntrypoint = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntrypoint) {
  runCli().catch((err) => {
    console.error('Erro ao inicializar administrador LumiNext:', err?.message || err);
    process.exit(1);
  });
}
