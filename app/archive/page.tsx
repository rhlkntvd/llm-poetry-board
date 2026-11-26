import Link from 'next/link';
import { openStore, publishedEditions } from '../../lib/store';

export const metadata = { title: 'Archive' };
export const dynamic = 'force-dynamic';
const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const dayFormat = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' });

export default async function Archive() {
  const db = openStore();
  try {
    const days = await db.query<{ day: string, prompt: string }>(`SELECT day,prompt FROM ${publishedEditions} ORDER BY day DESC`);
    const months = Map.groupBy(days, edition => edition.day.slice(0, 7));
    return <div className="archive ledger"><h1>Edition archive</h1>
      {!days.length && <p>No editions published yet.</p>}
      {Array.from(months, ([month, editions]) => <section key={month}>
        <h2>{monthFormat.format(new Date(month + '-01T12:00:00Z'))}</h2>
        <ul>{editions.map(({ day, prompt }) => <li key={day}><Link href={'/?day=' + day}>
          <time dateTime={day}><b>{day.slice(-2)}</b>{dayFormat.format(new Date(day + 'T12:00:00Z'))}</time>
          <strong>{prompt}</strong><span className="edition-arrow" aria-hidden="true">↗</span>
        </Link></li>)}</ul>
      </section>)}
    </div>;
  } finally { await db.close(); }
}
