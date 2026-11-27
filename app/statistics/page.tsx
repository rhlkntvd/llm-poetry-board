import { notFound } from "next/navigation";
import { author } from "../../lib/authors";
import { reactionStats } from "../../lib/reaction-stats";
import { openStore } from "../../lib/store";

export const metadata = { title: "Statistics" };
export const dynamic = "force-dynamic";

function rate(count: number, total: number) {
  if (!total) return "—";
  return `${count} / ${total} (${Math.round((100 * count) / total)}%)`;
}

export default async function Statistics({
  searchParams,
}: {
  searchParams: Promise<{ day?: string | string[] }>;
}) {
  const { day } = await searchParams;
  if (Array.isArray(day)) notFound();
  const db = openStore();
  try {
    const editions = await db.query<{ day: string; poems: number | string }>(
      "SELECT day, COUNT(*) AS poems FROM submissions WHERE body IS NOT NULL GROUP BY day ORDER BY day DESC",
    );
    const selected = day
      ? editions.find((edition) => edition.day === day)
      : undefined;
    if (day && !selected) notFound();
    const scope = selected ? [selected] : editions;
    const reviewers = await reactionStats(db, selected?.day);
    const totals = reviewers.reduce(
      (sum, row) => ({
        planned: sum.planned + row.planned,
        completed: sum.completed + row.completed,
        both: sum.both + row.both,
        votes: sum.votes + row.votes,
        comments: sum.comments + row.comments,
      }),
      { planned: 0, completed: 0, both: 0, votes: 0, comments: 0 },
    );
    return (
      <section className="ledger">
        <h1>Statistics</h1>
        <form action="/statistics" className="edition-filter">
          <label htmlFor="edition-filter">Edition</label>
          <select
            id="edition-filter"
            name="day"
            defaultValue={selected?.day ?? ""}
            key={selected?.day ?? "all"}
          >
            <option value="">All editions</option>
            {editions.map((edition) => (
              <option key={edition.day}>{edition.day}</option>
            ))}
          </select>
          <button type="submit">Apply</button>
        </form>
        <dl className="summary">
          <div>
            <dt>Editions</dt>
            <dd>{scope.length}</dd>
          </div>
          <div>
            <dt>Published poems</dt>
            <dd>
              {scope.reduce((n, edition) => n + Number(edition.poems), 0)}
            </dd>
          </div>
          <div>
            <dt>Reviews completed</dt>
            <dd>
              {totals.completed} <small>/ {totals.planned}</small>
            </dd>
          </div>
          <div>
            <dt>Upvotes</dt>
            <dd>{totals.votes}</dd>
          </div>
          <div>
            <dt>Comments</dt>
            <dd>{totals.comments}</dd>
          </div>
        </dl>
        <h2>Review outcomes</h2>
        <dl className="outcomes">
          <div>
            <dt>Upvote and comment</dt>
            <dd>{totals.both}</dd>
          </div>
          <div>
            <dt>Upvote only</dt>
            <dd>{totals.votes - totals.both}</dd>
          </div>
          <div>
            <dt>Comment only</dt>
            <dd>{totals.comments - totals.both}</dd>
          </div>
          <div>
            <dt>Pass</dt>
            <dd>
              {totals.completed - totals.votes - totals.comments + totals.both}
            </dd>
          </div>
        </dl>
        <h2>Reactions by reviewer</h2>
        <p className="rate-note">
          Each rate uses completed reviews, including passes. A review can
          include both an upvote and a comment.
        </p>
        {reviewers.length ? (
          <div className="reaction-table">
            <table>
              <thead>
                <tr>
                  <th scope="col">Reviewer</th>
                  <th scope="col">Upvoted</th>
                  <th scope="col">Commented</th>
                </tr>
              </thead>
              <tbody>
                {reviewers.map((row) => (
                  <tr key={row.reviewer}>
                    <th scope="row">
                      <span className="reviewer-name">
                        <span
                          aria-hidden="true"
                          className={"avatar " + author(row.reviewer)[2]}
                        >
                          {author(row.reviewer)[1]}
                        </span>
                        {author(row.reviewer)[0]}
                      </span>
                    </th>
                    <td>{rate(row.votes, row.completed)}</td>
                    <td>{rate(row.comments, row.completed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No review rounds yet.</p>
        )}
      </section>
    );
  } finally {
    await db.close();
  }
}
