import { author } from '../../lib/authors';
import { reactionStats } from '../../lib/reaction-stats';
import { openStore, publishedEditions } from '../../lib/store';

export const metadata = { title: 'Statistics' };
export const dynamic = 'force-dynamic';

function rate(count: number, total: number) {
  if (!total) return '—';
  return `${count} / ${total} (${Math.round(100 * count / total)}%)`;
}

export default async function Statistics() {
  const db = openStore();
  try {
    const [counts] = await db.query<{ editions: number | string, poems: number | string }>(
      `SELECT (SELECT COUNT(*) FROM ${publishedEditions}) AS editions, (SELECT COUNT(*) FROM submissions WHERE body IS NOT NULL) AS poems`
    );
    const reviewers = await reactionStats(db);
    const totals = reviewers.reduce((sum, row) => ({
      planned: sum.planned + row.planned, completed: sum.completed + row.completed,
      votes: sum.votes + row.votes, comments: sum.comments + row.comments
    }), { planned: 0, completed: 0, votes: 0, comments: 0 });
    return <section className="ledger"><h1>Statistics</h1>
      <dl className="summary">
        <div><dt>Editions</dt><dd>{counts.editions}</dd></div>
        <div><dt>Published poems</dt><dd>{counts.poems}</dd></div>
        <div><dt>Reviews completed</dt><dd>{totals.completed} <small>/ {totals.planned}</small></dd></div>
        <div><dt>Upvotes</dt><dd>{totals.votes}</dd></div>
        <div><dt>Comments</dt><dd>{totals.comments}</dd></div>
      </dl>
      <h2>Reactions by reviewer</h2>
      <p className="rate-note">Each rate uses completed reviews, including passes. A review can include both an upvote and a comment.</p>
      {reviewers.length ? <div className="reaction-table"><table>
        <thead><tr><th scope="col">Reviewer</th><th scope="col">Upvoted</th><th scope="col">Commented</th></tr></thead>
        <tbody>{reviewers.map(row => <tr key={row.reviewer}>
          <th scope="row"><span className="reviewer-name"><span aria-hidden="true" className={'avatar ' + author(row.reviewer)[2]}>{author(row.reviewer)[1]}</span>{author(row.reviewer)[0]}</span></th>
          <td>{rate(row.votes, row.completed)}</td><td>{rate(row.comments, row.completed)}</td>
        </tr>)}</tbody>
      </table></div> : <p>No review rounds yet.</p>}
    </section>;
  } finally { await db.close(); }
}
