import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import app from '../api/index.ts';

// api/index.ts é a entrada publicada na Vercel para a banca:
// só as rotas de demonstração podem responder; contas e dados reais ficam bloqueados.

afterEach(() => {
  delete process.env.GEMINI_API_KEY;
  delete process.env.gemini;
});

describe('demo pública na Vercel', () => {
  it.each([
    ['get', '/api/students'],
    ['get', '/api/workspaces'],
    ['post', '/api/auth/login'],
    ['post', '/api/auth/register'],
    ['get', '/api/admin/users'],
  ] as const)('bloqueia a rota real %s %s com 403', async (method, url) => {
    const res = await request(app)[method](url).send({ email: 'a@b.c', password: '123456' });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/demonstração/i);
  });

  it('nunca devolve um usuário logado', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
  });

  it('não deixa o navegador guardar respostas em cache', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('sessões de demonstração', () => {
  it('perfil Professor(a) vê só os estudantes vinculados; perfil Escola vê todos', async () => {
    const agent = request.agent(app);
    const escola = await agent.get('/api/demo/state?profile=school_admin');
    const professor = await agent.get('/api/demo/state?profile=teacher');
    expect(escola.status).toBe(200);
    expect(escola.body.isDemo).toBe(true);
    expect(professor.body.students.length).toBeGreaterThan(0);
    expect(professor.body.students.length).toBeLessThanOrEqual(escola.body.students.length);
    const idsEscola = new Set(escola.body.students.map((s: { id: string }) => s.id));
    for (const s of professor.body.students) expect(idsEscola.has(s.id)).toBe(true);
  });

  it('cada visitante tem uma sessão isolada: o que um cria, o outro não vê', async () => {
    const visitanteA = request.agent(app);
    const visitanteB = request.agent(app);
    await visitanteA.get('/api/demo/state?profile=school_admin');
    await visitanteB.get('/api/demo/state?profile=school_admin');

    const criado = await visitanteA.post('/api/demo/students').send({ displayName: 'Estudante Teste Isolamento' });
    expect(criado.status).toBe(201);

    const estadoB = await visitanteB.get('/api/demo/state?profile=school_admin');
    const nomesB = estadoB.body.students.map((s: { displayName: string }) => s.displayName);
    expect(nomesB).not.toContain('Estudante Teste Isolamento');
  });

  it('perfil Professor(a) não pode cadastrar estudantes', async () => {
    const agent = request.agent(app);
    await agent.get('/api/demo/state?profile=teacher');
    const res = await agent.post('/api/demo/students').send({ displayName: 'Não deveria entrar' });
    expect(res.status).toBe(403);
  });
});

describe('proteções da geração com IA na demo', () => {
  it('sem chave configurada, responde 503 com mensagem clara em vez de quebrar', async () => {
    const res = await request(app).post('/api/demo/activities/generate').send({ useAi: true });
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/chave Gemini/i);
  });

  it('recusa material grande demais antes de chamar a IA (413)', async () => {
    process.env.GEMINI_API_KEY = 'chave-de-teste-nao-real-123456';
    const res = await request(app)
      .post('/api/demo/activities/generate')
      .send({ useAi: true, classMaterial: 'x'.repeat(17000) });
    expect(res.status).toBe(413);
  });
});
