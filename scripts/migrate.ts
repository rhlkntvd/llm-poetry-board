import { openStore, schema } from '../lib/store.ts';
const db = openStore();
try {
  for (const statement of schema().split(';').filter(s => s.trim())) await db.query(statement);
} finally { await db.close(); }
