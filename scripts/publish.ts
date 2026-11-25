import { openStore, mode } from '../lib/store.ts';
import { pacificDay, publish } from '../lib/edition.ts';
import { demo, live } from '../lib/generate.ts';
const online = mode() === 'live';
if (online && !process.env.OPENROUTER_API_KEY) throw new Error('Set OPENROUTER_API_KEY for live publication');
const db = openStore();
try {
  const results = await publish(db, process.argv[2] ?? pacificDay(), online ? live : demo);
  console.table(results);
  if (results.some(row => !row.published)) process.exitCode = 1;
} finally { await db.close(); }
