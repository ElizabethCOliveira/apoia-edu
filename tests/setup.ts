import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// server/db.ts abre o banco no momento do import, a partir de STORAGE_ROOT.
// Apontamos para uma pasta temporária para nunca tocar em ./storage.
process.env.STORAGE_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'apoia-test-'));
delete process.env.VERCEL;
delete process.env.GEMINI_API_KEY;
delete process.env.gemini; // nome alternativo aceito na Vercel
