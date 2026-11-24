import 'dotenv/config';
import cookieParser from 'cookie-parser';
import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { bootstrapFirstLuminextAdminFromEnv } from './server/createAdmin.ts';
import { registerApiRoutes } from './server/routes.ts';

if (process.argv.includes('--production')) process.env.NODE_ENV = 'production';

async function startServer() {
  bootstrapFirstLuminextAdminFromEnv();

  const app = express();
  app.set('trust proxy', 1);
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json({ limit: '5mb' }));
  app.use(cookieParser());

  // Never serve ./storage publicly! All files go through authorized /api/* routes.
  registerApiRoutes(app);

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ApoIA.Edu server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start ApoIA.Edu server:', err);
  process.exit(1);
});
