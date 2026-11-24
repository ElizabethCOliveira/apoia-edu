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
// No external AI calls or API keys in the public demo.
app.use((req, _res, next) => {
  if (req.body && typeof req.body === 'object') { req.body.useAi = false; req.body.aiExternalEnabled = false; }
  next();
});
registerApiRoutes(app);
export default app;
