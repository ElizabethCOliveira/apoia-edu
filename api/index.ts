import express from 'express';
import cookieParser from 'cookie-parser';
import { registerApiRoutes } from '../server/routes.ts';

// Public judging environment: real accounts and records are intentionally unavailable.
const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '3mb' }));
app.use(cookieParser());
app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
app.get('/api/auth/me', (_req, res) => res.json({ user: null, workspaces: [] }));
app.get('/api/luminext/status', (_req, res) => res.json({ hasMasterAdmin: false }));
app.use((req, res, next) => {
  if (req.path.startsWith('/api/demo/') || req.path.startsWith('/api/templates/sample/')) return next();
  res.status(403).json({ error: 'Esta publicação é uma demonstração com dados fictícios. Use Experimentar demonstração; contas reais estão desativadas.' });
});
// Public demo: keys remain server-side; real account routes stay blocked above.
// Best-effort per-instance limits, not a provider-wide spending cap.
let windowStart = Date.now();
let calls = 0;
let inFlight = 0;
const visitors = new Map<string, number>();
app.use((req, res, next) => {
  const generation = req.method === 'POST' &&
    ['/api/demo/activities/generate', '/api/demo/documents/generate'].includes(req.path);
  if (!generation || req.body?.useAi !== true) return next();
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
    res.status(503).json({ error: 'A chave Gemini ainda não foi configurada na Vercel. Você pode desmarcar a opção de IA para explorar os exemplos.' });
    return;
  }
  if (JSON.stringify(req.body).length > 16000) {
    res.status(413).json({ error: 'Para a demonstração, reduza o material informado para até 16 mil caracteres.' });
    return;
  }
  const now = Date.now();
  if (now - windowStart >= 3600000) {
    windowStart = now; calls = 0; visitors.clear();
  }
  const visitor = req.ip || 'unknown';
  if (calls >= 30 || (visitors.get(visitor) || 0) >= 6 || inFlight >= 2) {
    res.setHeader('Retry-After', inFlight >= 2 ? '30' : String(Math.ceil((windowStart + 3600000 - now) / 1000)));
    res.status(429).json({ error: 'Limite temporário da demonstração atingido. Aguarde para gerar novamente ou explore as atividades prontas.' });
    return;
  }
  calls++; visitors.set(visitor, (visitors.get(visitor) || 0) + 1); inFlight++;
  let released = false;
  const release = () => { if (!released) { released = true; inFlight--; } };
  res.once('finish', release); res.once('close', release);
  next();
});
registerApiRoutes(app);
export default app;
