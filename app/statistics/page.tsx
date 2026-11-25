import { openStore, publishedEditions } from '../../lib/store';

export const metadata = { title: 'Statistics' };
export const dynamic = 'force-dynamic';

export default async function Statistics() {
  const db = openStore();
  try {
    const [counts] = await db.query<{ editions: number | string, poems: number | string }>(
      `SELECT (SELECT COUNT(*) FROM ${publishedEditions}) AS editions, (SELECT COUNT(*) FROM submissions WHERE body IS NOT NULL) AS poems`
    );
    return <section><h1>Statistics</h1>
      <dl className="summary">
        <div><dt>Editions</dt><dd>{counts.editions}</dd></div>
        <div><dt>Published poems</dt><dd>{counts.poems}</dd></div>
      </dl>
    </section>;
  } finally { await db.close(); }
}
